"""Shared reading rules for captured Markdown source."""

import os
import stat
from pathlib import Path

MAX_NOTE_BYTES = 10 * 1024 * 1024


class SourceChangedError(ValueError):
    """A source changed during its read and may be retried."""


def _file_signature(info: os.stat_result) -> tuple[int, int, int, int, int]:
    """Identify a file and detect changes during its read."""
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def read_source(vault_root: Path, note_path: Path) -> str:
    """Read stable UTF-8 Markdown without changing line endings or removing a BOM.

    Accept a vault-relative path or an absolute path under the resolved root.
    Require a regular .md file, case-insensitively, at most 10 MiB. Reject parent
    traversal, unsupported stored paths, and symlinks below the canonical root.
    Validation failures raise ValueError; filesystem failures propagate as
    OSError. An unstable read fails so the caller can decide whether to retry.
    No files or database records are written.
    """
    root = vault_root.expanduser().resolve(strict=True)
    if not root.is_dir():
        raise ValueError(f"Vault root must be a directory: {root}")
    path = note_path if note_path.is_absolute() else root / note_path
    try:
        relative_path = path.relative_to(root)
    except ValueError as error:
        raise ValueError(f"Source path is outside the vault: {path}") from error
    if ".." in relative_path.parts or "\\" in relative_path.as_posix():
        raise ValueError(f"Unsupported vault-relative path: {path}")
    if path.suffix.lower() != ".md":
        raise ValueError(f"Source must be a .md file: {path}")

    current = root
    for part in relative_path.parts:
        current /= part
        if current.is_symlink():
            raise ValueError(f"Source path must not contain symbolic links: {current}")
    if not path.resolve(strict=True).is_relative_to(root):
        raise ValueError(f"Source path escapes the vault: {path}")
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError(f"Source must be a regular .md file: {path}")

    with path.open("rb") as source:
        before = _file_signature(os.fstat(source.fileno()))
        raw = source.read(MAX_NOTE_BYTES + 1)
        after = _file_signature(os.fstat(source.fileno()))
    if len(raw) > MAX_NOTE_BYTES:
        raise ValueError(f"Source note exceeds 10 MiB: {path}")
    if before != after or after != _file_signature(path.lstat()):
        raise SourceChangedError(f"Source note changed while being read: {path}")
    if not path.resolve(strict=True).is_relative_to(root):
        raise ValueError(f"Source path escapes the vault: {path}")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError(f"Source note must contain valid UTF-8: {path}") from error
