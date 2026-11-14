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
