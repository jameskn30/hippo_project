"""Records used by the vault component."""

from dataclasses import dataclass
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
