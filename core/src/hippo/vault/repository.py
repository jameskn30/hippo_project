"""SQLite persistence for vault registrations and captured notes."""

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from types import TracebackType
from typing import Literal, Self

from hippo.vault.models import Note, NoteCatalogEntry, Vault

_VAULT_COLUMNS = ", ".join(Vault.column_names())
_NOTE_COLUMNS = ", ".join(Note.column_names())
_CATALOG_COLUMNS = ", ".join(NoteCatalogEntry.column_names())


def _utc_timestamp() -> str:
    """Return the current UTC time in the stored millisecond timestamp format."""
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


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

    def get_vault(self, vault_id: int) -> Vault | None:
        """Return a registration by ID without checking root availability."""
        row = self._connection.execute(
            f"SELECT {_VAULT_COLUMNS} FROM vault WHERE vault_id = ?", (vault_id,)
        ).fetchone()
        return Vault(row[0], Path(row[1]), *row[2:]) if row is not None else None

    def list_note_catalog(self, vault_id: int) -> list[NoteCatalogEntry]:
        """Return active note metadata for one vault, without captured bodies.

        Ordered by ID. The scanner holds its writer transaction while obtaining
        and reconciling this snapshot. Memory is proportional to catalog size.
        """
        rows = self._connection.execute(
            f"""SELECT {_CATALOG_COLUMNS} FROM note
                WHERE vault_id = ? AND deleted_at IS NULL ORDER BY note_id""",
            (vault_id,),
        ).fetchall()
        return [NoteCatalogEntry(*row) for row in rows]

    def record_scan_result(
        self,
        vault_id: int,
        *,
        availability: Literal["ok", "not_ok"],
        scan_status: Literal["ok", "not_ok"],
        error: str | None = None,
    ) -> Vault:
        """Record a completed scan's outcome and return the updated vault.

        Success requires an available root and no error; it records the current
        UTC time and clears the previous error. Failure requires a nonblank
        error and preserves the last successful timestamp. The caller determines
        coverage and coordinates scans before recording an outcome. Invalid
        combinations or an unknown vault raise ValueError. Commit immediately
        unless transaction() owns the operation.
        """
        if scan_status == "ok":
            if availability != "ok" or error is not None:
                raise ValueError("A successful scan requires availability ok and no error")
            successful_at = _utc_timestamp()
        else:
            if error is None or not error.strip():
                raise ValueError("An unsuccessful scan requires a nonblank error")
            error = error.strip()
            successful_at = None

        row = self._connection.execute(
            f"""UPDATE vault
                SET availability = ?, scan_status = ?,
                    last_successful_scan_at = COALESCE(?, last_successful_scan_at),
                    last_scan_error = ?
                WHERE vault_id = ?
                RETURNING {_VAULT_COLUMNS}""",
            (availability, scan_status, successful_at, error, vault_id),
        ).fetchone()
        if row is None:
            raise ValueError(f"Vault {vault_id} is not registered")
        return Vault(row[0], Path(row[1]), *row[2:])

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

    def mark_note_deleted(self, note_id: int, *, expected_revision: int) -> Note:
        """Mark a confirmed removal while the active note has the expected revision.

        The caller must confirm absence during a complete scan or an explicit
        removal. Set deleted_at and advance revision together, retaining captured
        content, hash, and processing state. Active lookups exclude the result;
        stale content updates cannot reactivate it. Missing, already deleted, or
        superseded notes raise ValueError without changing stored data. Commit
        immediately unless transaction() owns the operation.
        """
        if expected_revision < 1:
            raise ValueError("expected_revision must be positive")
        row = self._connection.execute(
            f"""UPDATE note
                SET deleted_at = ?, revision = revision + 1
                WHERE note_id = ? AND revision = ? AND deleted_at IS NULL
                RETURNING {_NOTE_COLUMNS}""",
            (_utc_timestamp(), note_id, expected_revision),
        ).fetchone()
        if row is None:
            raise ValueError(
                f"Note {note_id} is missing, deleted, or no longer at revision "
                f"{expected_revision}; reload before marking it deleted"
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
