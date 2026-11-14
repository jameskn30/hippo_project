"""Records used by the vault component."""

from dataclasses import dataclass, fields
from pathlib import Path
from typing import Literal


@dataclass(frozen=True, slots=True)
class Vault:
    """A persisted vault registration, separate from its Markdown files."""

    vault_id: int
    root_path: Path
    display_name: str
    availability: Literal["ok", "not_ok"]
    scan_status: Literal["ok", "not_ok"]
    last_successful_scan_at: str | None
    last_scan_error: str | None

    @classmethod
    def column_names(cls) -> tuple[str, ...]:
        """Return stored field names in the record's constructor order."""
        return tuple(field.name for field in fields(cls))


@dataclass(frozen=True, slots=True)
class Note:
    """Latest captured Markdown and persisted state for one note."""

    note_id: int
    vault_id: int
    relative_path: str
    content: str
    content_hash: str
    revision: int
    deleted_at: str | None
    processing_status: Literal["pending", "processing", "ready", "failed"]

    @classmethod
    def column_names(cls) -> tuple[str, ...]:
        """Return stored field names in the record's constructor order."""
        return tuple(field.name for field in fields(cls))


@dataclass(frozen=True, slots=True)
class NoteCatalogEntry:
    """Active note metadata used for reconciliation without loading its body."""

    note_id: int
    relative_path: str
    content_hash: str
    revision: int

    @classmethod
    def column_names(cls) -> tuple[str, ...]:
        """Return projected column names in the record's constructor order."""
        return tuple(field.name for field in fields(cls))


@dataclass(frozen=True, slots=True)
class ScanResult:
    """Reconciliation outcome; failure rolls back all note changes."""

    vault: Vault
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    deleted: int = 0
    failed: int = 0
