"""Shared application rules for registering Markdown vault directories."""

import os
from pathlib import Path

from hippo.vault.models import Vault
from hippo.vault.repository import VaultRepository


class VaultRegistry:
    """Register and list vaults through a caller-owned repository."""

    def __init__(self, repository: VaultRepository) -> None:
        """Keep the supplied repository; its caller owns connection cleanup."""
        self._repository = repository

    def add_vault(self, path: Path, display_name: str | None = None) -> Vault:
        """Return an existing vault or persist an accessible, non-overlapping root.

        Resolve path aliases and preserve an existing vault's ID and name.
        Omitted names use the folder name, or the root path for filesystem roots.
        Explicit names are trimmed. Blank names and overlaps raise ValueError;
        filesystem and SQLite errors propagate without changing registrations.
        """
        root = path.expanduser().resolve(strict=True)
        if not root.is_dir():
            raise NotADirectoryError(f"Vault root is not a directory: {root}")
        if not os.access(root, os.R_OK | os.X_OK):
            raise PermissionError(f"Vault root is not readable/searchable: {root}")

        name = (root.name or str(root)) if display_name is None else display_name.strip()
        if not name:
            raise ValueError("Vault display name must not be blank")

        with self._repository.transaction():
            for vault in self._repository.list_vaults():
                existing = vault.root_path
                if self._same_directory(root, existing):
                    return vault
                if (
                    root.is_relative_to(existing)
                    or existing.is_relative_to(root)
                    or any(self._same_directory(existing, parent) for parent in root.parents)
                    or any(self._same_directory(root, parent) for parent in existing.parents)
                ):
                    raise ValueError(f"Vault root overlaps registered vault: {existing}")
            return self._repository.create_vault(root, name)

    def list_vaults(self) -> list[Vault]:
        """Return registrations in ID order without checking directory availability."""
        return self._repository.list_vaults()

    @staticmethod
    def _same_directory(first: Path, second: Path) -> bool:
        """Compare paths and filesystem identities, respecting filesystem case rules.

        Missing paths cannot establish an alias. Other filesystem errors
        propagate so registration does not ignore an uncertain conflict.
        """
        if first == second:
            return True
        try:
            return first.samefile(second)
        except (FileNotFoundError, NotADirectoryError):
            return False
