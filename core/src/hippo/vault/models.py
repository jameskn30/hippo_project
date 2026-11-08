"""Records used by the vault component."""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Vault:
    """A persisted vault registration, separate from its Markdown files."""

    vault_id: int
    root_path: Path
    display_name: str
