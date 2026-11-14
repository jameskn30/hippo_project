"""SQLite persistence for vault registrations and captured notes."""

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from hashlib import sha256
from pathlib import Path
from types import TracebackType
from typing import Self

from hippo.vault.models import Note, Vault

_VAULT_COLUMNS = ", ".join(Vault.column_names())
_NOTE_COLUMNS = ", ".join(Note.column_names())


class VaultRepository:
    """Own one SQLite connection for vault registrations and captured notes.

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

        Accepts no arguments and yields no value. Nested scopes use savepoints;
        only the outermost scope commits. A competing writer waits up to SQLite's
        default five seconds before sqlite3.OperationalError is raised.
        """
        if self._connection.in_transaction:
            self._connection.execute("SAVEPOINT hippo_transaction")
            try:
                yield
            except BaseException:
                self._connection.execute("ROLLBACK TO hippo_transaction")
                raise
            finally:
                self._connection.execute("RELEASE hippo_transaction")
            return

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
        row = self._connection.execute(
            f"""INSERT INTO vault (root_path, display_name) VALUES (?, ?)
                RETURNING {_VAULT_COLUMNS}""",
            (str(root_path), display_name),
        ).fetchone()
        if row is None:
            raise RuntimeError("SQLite did not return the created vault")
        return Vault(row[0], Path(row[1]), *row[2:])

    def list_vaults(self) -> list[Vault]:
        """Return registrations in ID order, including this transaction's writes."""
        rows = self._connection.execute(
            f"SELECT {_VAULT_COLUMNS} FROM vault ORDER BY vault_id"
        ).fetchall()
        return [Vault(row[0], Path(row[1]), *row[2:]) for row in rows]

    def create_note(self, vault_id: int, relative_path: str, content: str) -> Note:
        """Insert captured UTF-8 text at revision 1 with pending processing state.

        Hash the exact text without newline normalization. The caller supplies
        an existing vault ID and a normalized vault-relative path. Invalid paths,
        missing vaults, and duplicate active paths raise sqlite3.IntegrityError.
        Commit immediately unless transaction() owns the operation.
        """
        content_hash = sha256(content.encode("utf-8")).hexdigest()
        row = self._connection.execute(
            f"""INSERT INTO note (vault_id, relative_path, content, content_hash)
                VALUES (?, ?, ?, ?)
                RETURNING {_NOTE_COLUMNS}""",
            (vault_id, relative_path, content, content_hash),
        ).fetchone()
        if row is None:
            raise RuntimeError("SQLite did not return the created note")
        return Note(*row)

    def get_note(self, note_id: int) -> Note | None:
        """Return an active note by ID, or None for a missing or deleted note."""
        row = self._connection.execute(
            f"SELECT {_NOTE_COLUMNS} FROM note WHERE note_id = ? AND deleted_at IS NULL",
            (note_id,),
        ).fetchone()
        return Note(*row) if row is not None else None

    def get_note_by_path(self, vault_id: int, relative_path: str) -> Note | None:
        """Return the active note at a vault-relative path, or None if absent."""
        row = self._connection.execute(
            f"""SELECT {_NOTE_COLUMNS} FROM note
                WHERE vault_id = ? AND relative_path = ? AND deleted_at IS NULL""",
            (vault_id, relative_path),
        ).fetchone()
        return Note(*row) if row is not None else None

    def list_notes(self, vault_id: int, *, after_note_id: int = 0, limit: int = 100) -> list[Note]:
        """Return a page of active notes for one vault in ascending ID order.

        Continue with after_note_id set to the last returned ID. Reject negative
        cursors and page sizes outside 1..1000 with ValueError. An unknown vault
        or exhausted page returns an empty list.
        """
        if after_note_id < 0:
            raise ValueError("after_note_id must not be negative")
        if not 1 <= limit <= 1000:
            raise ValueError("limit must be between 1 and 1000")
        rows = self._connection.execute(
            f"""SELECT {_NOTE_COLUMNS} FROM note
                WHERE vault_id = ? AND note_id > ? AND deleted_at IS NULL
                ORDER BY note_id LIMIT ?""",
            (vault_id, after_note_id, limit),
        ).fetchall()
        return [Note(*row) for row in rows]

    def update_note_content(self, note_id: int, content: str, *, expected_revision: int) -> Note:
        """Accept source only while an active note still has the expected revision.

        Changed text, its SHA-256 hash, an incremented revision, and pending
        processing state are written in one statement. Identical text preserves
        the revision and processing state. Missing, deleted, or superseded notes
        raise ValueError without changing stored data. Commit immediately unless
        transaction() owns the operation; no Markdown files are read or written.
        """
        if expected_revision < 1:
            raise ValueError("expected_revision must be positive")
        content_hash = sha256(content.encode("utf-8")).hexdigest()
        row = self._connection.execute(
            f"""UPDATE note
                SET content = ?, content_hash = ?,
                    revision = revision + CASE WHEN content = ? THEN 0 ELSE 1 END,
                    processing_status = CASE
                        WHEN content = ? THEN processing_status ELSE 'pending' END
                WHERE note_id = ? AND revision = ? AND deleted_at IS NULL
                RETURNING {_NOTE_COLUMNS}""",
            (content, content_hash, content, content, note_id, expected_revision),
        ).fetchone()
        if row is None:
            raise ValueError(
                f"Note {note_id} is missing, deleted, or no longer at revision "
                f"{expected_revision}; reload before updating"
            )
        return Note(*row)

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
