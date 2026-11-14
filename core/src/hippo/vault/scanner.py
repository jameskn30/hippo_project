"""Manual reconciliation of one registered Markdown vault."""

import os
import stat
import time
from collections.abc import Generator
from contextlib import closing
from hashlib import sha256
from pathlib import Path, PurePosixPath

from hippo.vault.models import ScanResult, Vault
from hippo.vault.repository import VaultRepository
from hippo.vault.source import SourceChangedError, read_source

MAX_ENTRIES = 10_000
READ_ATTEMPTS = 3
SETTLE_SECONDS = 0.05


def _directory_state(root: Path, directory: Path) -> tuple[int, int, int, int]:
    """Check a directory's scope, access, identity, and inventory timestamps."""
    if not directory.is_relative_to(root) or directory.resolve(strict=True) != directory:
        raise ValueError(f"Scan directory changed or escapes the vault: {directory}")
    info = directory.lstat()
    if not stat.S_ISDIR(info.st_mode):
        raise ValueError(f"Scan path must be a directory: {directory}")
    if not os.access(directory, os.R_OK | os.X_OK):
        raise PermissionError(f"Scan directory is not readable/searchable: {directory}")
    return (info.st_dev, info.st_ino, info.st_mtime_ns, info.st_ctime_ns)


def _walk_files(root: Path, inventory: dict[Path, tuple[int, int, int, int]]) -> Generator[Path]:
    """Include hidden paths; require every file leaf to be regular Markdown."""
    directories = [root]
    entry_count = 0
    while directories:
        directory = directories.pop()
        inventory[directory] = _directory_state(root, directory)
        with os.scandir(directory) as entries:
            for entry in entries:
                path = Path(entry.path)
                entry_count += 1
                if entry_count > MAX_ENTRIES:
                    raise ValueError(f"Scan exceeds {MAX_ENTRIES} files/folders")
                if entry.is_symlink():
                    raise ValueError(f"Scan tree must not contain symbolic links: {path}")
                if entry.is_dir(follow_symlinks=False):
                    directories.append(path)
                elif entry.is_file(follow_symlinks=False) and path.suffix.lower() == ".md":
                    yield path
                else:
                    raise ValueError(f"Scan file leaves must be regular .md files: {path}")


def _verify_inventory(root: Path, inventory: dict[Path, tuple[int, int, int, int]]) -> None:
    """Abort reconciliation when a directory changed or became unavailable."""
    for directory, previous in inventory.items():
        if _directory_state(root, directory) != previous:
            raise ValueError(f"Directory changed during scan; retry: {directory}")


def _read_source(root: Path, path: Path) -> str:
    """Retry transient filesystem failures and unstable reads up to three times."""
    for _ in range(READ_ATTEMPTS - 1):
        try:
            return read_source(root, path)
        except (OSError, SourceChangedError):
            time.sleep(SETTLE_SECONDS)
    return read_source(root, path)


def _is_absent(root: Path, relative_path: str) -> bool:
    """Confirm a former note is absent without following symlink ancestors."""
    relative = PurePosixPath(relative_path)
    if (
        not relative.parts
        or relative.is_absolute()
        or ".." in relative.parts
        or "\\" in relative_path
    ):
        raise ValueError(f"Invalid stored note path: {relative_path}")
    info = root.lstat()
    if not stat.S_ISDIR(info.st_mode):
        raise ValueError(f"Vault root changed during absence check: {root}")
    current = root
    for index, part in enumerate(relative.parts):
        current /= part
        if not current.is_relative_to(root):
            raise ValueError(f"Stored note path escapes the vault: {relative_path}")
        try:
            info = current.lstat()
        except FileNotFoundError:
            return True
        if stat.S_ISLNK(info.st_mode):
            raise ValueError(f"Cannot confirm absence through a symbolic link: {current}")
        if index < len(relative.parts) - 1 and not stat.S_ISDIR(info.st_mode):
            return True
    return not stat.S_ISREG(info.st_mode)


def _root_available(root: Path) -> bool:
    """Observe root access after a failed scan, independently of subtree errors."""
    try:
        _directory_state(root, root)
        with os.scandir(root):
            return True
    except (OSError, ValueError):
        return False


class VaultScanner:
    """Scan through caller-owned storage on its creating thread.

    The outer writer transaction serializes scans and other database writers.
    A nested savepoint rolls back note changes on any coverage/read failure;
    failure status is then recorded before releasing the outer writer lock.
    This baseline holds the lock during file reads. It stops at the first error,
    returning failed=1 and zero note counts; storage failures propagate. No
    files are written. Existing notes survive an unavailable or incomplete scan.
    """

    def __init__(self, repository: VaultRepository) -> None:
        self._repository = repository

    def scan(self, vault_id: int) -> ScanResult:
        """Reconcile an existing vault; unknown IDs raise ValueError.

        Empty trees are valid. Include hidden Markdown and ordinary subfolders;
        non-Markdown leaves, symlinks, unreadable paths, and changing inventory
        make the scan incomplete. Source reads use the shared 10 MiB/UTF-8 rules.
        Confirm missing paths twice, 50 ms apart, before recording deletion.
        """
        with self._repository.transaction():
            vault = self._repository.get_vault(vault_id)
            if vault is None:
                raise ValueError(f"Vault {vault_id} is not registered")
            try:
                with self._repository.transaction():
                    created, updated, unchanged, deleted = self._reconcile(vault)
            except (OSError, ValueError) as error:
                recorded = self._repository.record_scan_result(
                    vault_id,
                    availability="ok" if _root_available(vault.root_path) else "not_ok",
                    scan_status="not_ok",
                    error=str(error) or type(error).__name__,
                )
                result = ScanResult(recorded, failed=1)
            else:
                recorded = self._repository.record_scan_result(
                    vault_id, availability="ok", scan_status="ok"
                )
                result = ScanResult(recorded, created, updated, unchanged, deleted)
        return result

    def _reconcile(self, vault: Vault) -> tuple[int, int, int, int]:
        """Return created/updated/unchanged/deleted counts within the savepoint."""
        root = vault.root_path
        _directory_state(root, root)
        remaining = {
            entry.relative_path: entry
            for entry in self._repository.list_note_catalog(vault.vault_id)
        }
        inventory: dict[Path, tuple[int, int, int, int]] = {}
        created = updated = unchanged = 0
        with closing(_walk_files(root, inventory)) as paths:
            for path in paths:
                content = _read_source(root, path)
                relative_path = path.relative_to(root).as_posix()
                previous = remaining.pop(relative_path, None)
                if previous is None:
                    self._repository.create_note(vault.vault_id, relative_path, content)
                    created += 1
                elif sha256(content.encode("utf-8")).hexdigest() == previous.content_hash:
                    unchanged += 1
                else:
                    self._repository.update_note_content(
                        previous.note_id, content, expected_revision=previous.revision
                    )
                    updated += 1

        _verify_inventory(root, inventory)
        if remaining:
            for attempt in range(2):
                for relative_path in remaining:
                    if not _is_absent(root, relative_path):
                        raise ValueError(f"Note exists outside scanned inventory: {relative_path}")
                if attempt == 0:
                    time.sleep(SETTLE_SECONDS)
            _verify_inventory(root, inventory)
        for previous in remaining.values():
            self._repository.mark_note_deleted(
                previous.note_id, expected_revision=previous.revision
            )
        return created, updated, unchanged, len(remaining)
