"""SQLite persistence for vault registrations."""

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from types import TracebackType
from typing import Self

from hippo.vault.models import Vault


class VaultRepository:
    """Own one SQLite connection and its vault table.

    The caller supplies an existing database initialized by dbmate migrations.
    Create, use, and close this repository on the same thread. Operations commit
    individually unless grouped with transaction(). The repository context
    manager owns only connection lifetime. Root validation and canonicalization
    belong to the registry layer, rather than this persistence layer.
    """

    def __init__(self, database_path: Path) -> None:
        database_uri = f"{database_path.resolve().as_uri()}?mode=rw"
        self._connection = sqlite3.connect(database_uri, uri=True, autocommit=True)
        self._connection.execute("PRAGMA foreign_keys = ON")
        if self._connection.execute("PRAGMA foreign_keys").fetchone() != (1,):
            self._connection.close()
            raise RuntimeError("SQLite foreign-key enforcement is unavailable")

    @contextmanager
    def transaction(self) -> Generator[None]:
        """Group operations under one writer lock; commit or roll back together.

        Accepts no arguments and yields no value. Nested transactions are not
        supported. A competing writer waits up to SQLite's default five seconds
        before sqlite3.OperationalError is raised.
        """
        self._connection.execute("BEGIN IMMEDIATE")
        try:
            yield
            self._connection.execute("COMMIT")
        finally:
            if self._connection.in_transaction:
                self._connection.execute("ROLLBACK")

    def create_vault(self, root_path: Path, display_name: str) -> Vault:
        """Insert a registration and return its generated Vault record.

        The caller supplies a canonical root and display name. Duplicate roots
        raise sqlite3.IntegrityError. Commit immediately unless transaction()
        owns the operation; application callers should use VaultRegistry.
        """
        cursor = self._connection.execute(
            "INSERT INTO vault (root_path, display_name) VALUES (?, ?)",
            (str(root_path), display_name),
        )
        vault_id = cursor.lastrowid
        if vault_id is None:
            raise RuntimeError("SQLite did not return a vault ID")
        return Vault(vault_id, root_path, display_name)

    def list_vaults(self) -> list[Vault]:
        """Return registrations in ID order, including this transaction's writes."""
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
