"""Migration-history compatibility for this version of the core package."""

import sqlite3

# Keep this list aligned with supported database/migrations/*.sql releases.
# SQL files are repository assets and are not available in the installed wheel.
EXPECTED_MIGRATIONS = frozenset(
    {
        "20261017000100",
        "20261114000100",
        "20261114000200",
        "20261114000300",
        "20261114000400",
        "20261114000500",
        "20261114000600",
        "20261114000700",
    }
)


def validate_schema(connection: sqlite3.Connection) -> None:
    """Require the supported migration IDs, without auditing tables or changing data."""
    try:
        applied = {
            str(row[0]) for row in connection.execute("SELECT version FROM schema_migrations")
        }
    except sqlite3.OperationalError as error:
        if str(error) in {"no such table: schema_migrations", "no such column: version"}:
            raise ValueError(
                "Database migration history is missing or invalid. "
                "Initialize or migrate the selected database with dbmate before use."
            ) from error
        raise
    unsupported = applied - EXPECTED_MIGRATIONS
    if unsupported:
        raise ValueError(
            f"Unsupported database migrations: {', '.join(sorted(unsupported))}. "
            "Use a Hippo version compatible with this database."
        )
    missing = EXPECTED_MIGRATIONS - applied
    if missing:
        raise ValueError(
            f"Database is missing migrations: {', '.join(sorted(missing))}. "
            "Apply Hippo migrations to the selected database before use."
        )
