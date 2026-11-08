"""SQLite persistence for vault registrations."""

import sqlite3
from pathlib import Path
from types import TracebackType
from typing import Self

from hippo.vault.models import Vault


class VaultRepository:
    """Own one SQLite connection and its vault table.

    The caller supplies an existing database initialized by dbmate migrations.
    Create, use, and close this repository on the same thread. Each database
    operation owns its transaction; the repository context manager owns only
    connection lifetime. Root validation and canonicalization belong to the
    registry layer, rather than this persistence layer.
    """

    def __init__(self, database_path: Path) -> None:
        database_uri = f"{database_path.resolve().as_uri()}?mode=rw"
        self._connection = sqlite3.connect(database_uri, uri=True, autocommit=False)

    def create_vault(self, root_path: Path, display_name: str) -> Vault:
        """Commit a registration; duplicate roots raise sqlite3.IntegrityError.

        The caller is responsible for supplying a canonical root path.
        """
        with self._connection:
            cursor = self._connection.execute(
                "INSERT INTO vault (root_path, display_name) VALUES (?, ?)",
                (str(root_path), display_name),
            )
            vault_id = cursor.lastrowid
            if vault_id is None:
                raise RuntimeError("SQLite did not return a vault ID")
        return Vault(vault_id, root_path, display_name)

    def list_vaults(self) -> list[Vault]:
        """Return committed registrations in vault-ID order."""
        with self._connection:
            rows = self._connection.execute(
                "SELECT vault_id, root_path, display_name FROM vault ORDER BY vault_id"
            ).fetchall()
        return [
            Vault(vault_id, Path(root_path), display_name)
            for vault_id, root_path, display_name in rows
        ]

    def close(self) -> None:
        """Close the connection; later operations on this instance will fail."""
        self._connection.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()
