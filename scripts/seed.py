"""Validate one Markdown vault tree, then seed it through the core repository."""

import argparse
import os
import sqlite3
import sys
from pathlib import Path

from hippo.config import Config
from hippo.vault.registry import VaultRegistry
from hippo.vault.repository import VaultRepository
from hippo.vault.source import read_source

MAX_TOTAL_BYTES = 100 * 1024 * 1024
MAX_ENTRIES = 10_000


def validate_seed(seed_path: Path) -> tuple[Path, list[tuple[str, str]]]:
    """Read the entire tree before database access; return root and captured text.

    The root is one vault. Descendant directories are ordinary folders and file
    leaves must be regular .md files, case-insensitively. Reject symlinks, paths
    incompatible with stored relative paths, unstable reads, and invalid UTF-8.
    Empty Markdown files are valid; a tree without Markdown files is not.
    """
    root = seed_path.expanduser().resolve(strict=True)
    if not root.is_dir():
        raise ValueError(f"Seed path must be a directory: {root}")

    captures: list[tuple[str, str]] = []
    directories = [root]
    total_bytes = 0
    entry_count = 0
    while directories:
        directory = directories.pop()
        if directory.is_symlink() or not directory.resolve(strict=True).is_relative_to(root):
            raise ValueError(f"Seed directory changed or escapes the vault: {directory}")
        with os.scandir(directory) as entries:
            for entry in entries:
                path = Path(entry.path)
                entry_count += 1
                if entry_count > MAX_ENTRIES:
                    raise ValueError(f"Seed tree exceeds {MAX_ENTRIES} files/folders")
                if entry.is_symlink():
                    raise ValueError(f"Seed tree must not contain symbolic links: {path}")
                if entry.is_dir(follow_symlinks=False):
                    directories.append(path)
                    continue
                relative_path = path.relative_to(root).as_posix()
                content = read_source(root, path)
                total_bytes += len(content.encode("utf-8"))
                if total_bytes > MAX_TOTAL_BYTES:
                    raise ValueError("Seed Markdown exceeds 100 MiB in total")
                captures.append((relative_path, content))

    if not captures:
        raise ValueError(f"Seed tree must contain at least one .md file: {root}")
    captures.sort(key=lambda capture: capture[0])
    return root, captures


def main() -> int:
    """Validate first, then register the root and insert missing active notes."""
    parser = argparse.ArgumentParser(
        description=(
            "Seed one registered vault from a recursively validated Markdown folder. "
            "Uses the configured existing database; preserves existing active notes."
        ),
        epilog=(
            "Example: just seed sandbox/vault. Limits: 10 MiB per note, "
            "100 MiB total Markdown, 10,000 files/folders."
        ),
    )
    parser.add_argument("seed_path", type=Path, help="Directory to register as one vault")
    args = parser.parse_args()

    try:
        root, captures = validate_seed(args.seed_path)
        database = Config.from_env().database_path
        if database.is_relative_to(root):
            raise ValueError("The database must be outside the seed vault")
        with VaultRepository(database) as repository, repository.transaction():
            vault = VaultRegistry(repository).add_vault(root)
            inserted = 0
            skipped = 0
            for relative_path, content in captures:
                if repository.get_note_by_path(vault.vault_id, relative_path) is not None:
                    skipped += 1
                else:
                    repository.create_note(vault.vault_id, relative_path, content)
                    inserted += 1
    except (OSError, ValueError, sqlite3.Error, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Vault {vault.vault_id}: {vault.display_name}\n  {vault.root_path}")
    print(f"Notes inserted: {inserted}; existing active notes skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
