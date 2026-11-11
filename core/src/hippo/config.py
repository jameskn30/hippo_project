"""Typed application configuration loaded from dotenv and the environment."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Self
from urllib.parse import unquote, urlsplit

from dotenv import dotenv_values, find_dotenv


@dataclass(frozen=True, slots=True)
class Config:
    """Resolved paths shared by application operations."""

    database_path: Path
    migration_source_path: Path

    @classmethod
    def from_env(cls) -> Self:
        """Load the nearest .env.migrations, preferring exported variables.

        Values are literal: dotenv interpolation is disabled and the file is
        never executed. Relative paths use the env file's directory, or the
        current directory when configuration comes entirely from the environment.
        Loading configuration does not open databases or create files.
        """
        values, base = _load_environment()
        database_url = _required_setting(values, "HIPPO_MIGRATION_DATABASE_URL")
        database_path = _parse_database_url(database_url)
        source = _required_setting(values, "MIGRATION_SRC_PATH")
        if source.startswith("~"):
            raise ValueError("MIGRATION_SRC_PATH must use a literal path without ~.")
        return cls(
            database_path=(base / database_path).resolve(),
            migration_source_path=(base / source).resolve(),
        )


def _load_environment() -> tuple[dict[str, str | None], Path]:
    """Read the nearest dotenv file and overlay exported environment values."""
    filename = find_dotenv(".env.migrations", usecwd=True)
    base = Path(filename).parent if filename else Path.cwd()
    values: dict[str, str | None] = {}
    if filename:
        with Path(filename).open(encoding="utf-8-sig") as stream:
            values.update(dotenv_values(stream=stream, interpolate=False))
    values.update(os.environ)
    return values, base


def _required_setting(values: dict[str, str | None], name: str) -> str:
    """Require a nonempty, literal, single-line setting."""
    value = values.get(name)
    if value is None or not value.strip():
        raise ValueError(f"Set {name} in .env.migrations or the environment.")
    if value != value.strip() or any(
        ord(character) < 32 or ord(character) == 127 or character == "$" for character in value
    ):
        raise ValueError(f"{name} must be a literal, single-line value.")
    return value


def _parse_database_url(database_url: str) -> Path:
    """Validate a local SQLite file URL and return its decoded path."""
    url = urlsplit(database_url)
    path = unquote(url.path, errors="strict")
    if (
        url.scheme not in {"sqlite", "sqlite3"}
        or url.netloc
        or any(character in database_url for character in "?#")
        or not path
        or path.endswith("/")
        or path == ":memory:"
        or path.startswith(("file:", "~"))
        or any(ord(character) < 32 or ord(character) == 127 for character in path)
        or any(character in path for character in "%?#")
    ):
        raise ValueError(
            "HIPPO_MIGRATION_DATABASE_URL must be a local SQLite file URL, "
            "such as sqlite:/absolute/path/hippo.sqlite3, "
            "without a host, query, fragment, or memory target."
        )
    return Path(path)
