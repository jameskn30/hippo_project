# Vault

**Status:** CLI registration/listing, shared register/list logic, Vault dataclass, repository, and initial migration implemented. Ingestion and remaining registry capabilities are planned.

`hippo.vault` contains application code, with its Typer command group in `vault/vault_app.py`. The root CLI imports and registers `vault_app` from `hippo.vault.vault_app`. The command handlers call the shared registry through a command-owned repository, closing the connection on success or failure. See the [component structure convention](../../../../docs/architecture/component-structure.md).

The development Markdown vault data remains at `/Volumes/SSD/projects/hippo/data`, outside `core/src/hippo/`. Runtime/user vault roots will be selected separately. This package contains code that manages those directories, not their Markdown files.

`models.py` defines the typed `Vault` dataclass. `repository.py` creates and lists registrations in an existing SQLite database. Configure `HIPPO_MIGRATION_DATABASE_URL` in the root `.env.migrations`, prepare dbmate with `node database/scripts/migrate.mjs install`, and initialize storage with `just data-migrate run`. Database schema changes belong to [dbmate SQL migrations](../../../../database/migrations/README.md), rather than repository constructors. The repository does not invoke dbmate, validate migration compatibility, or choose the database location. Use its connection on the thread that created it and close it explicitly or through its context manager.

## CLI

From `core/`, after migrating the selected database:

```sh
uv run --locked hippo vault --database /absolute/path/hippo.sqlite3 add /absolute/path/notes
uv run --locked hippo vault --database /absolute/path/hippo.sqlite3 list
```

`python -m hippo` accepts the same arguments. Place `--database PATH` before the
subcommand. It is required for execution; group and subcommand help work without
it. There is no runtime database default, environment-variable fallback, or
automatic migration. Importing the module and requesting help do not open storage.

`add` returns the new or existing registration. `list` prints registrations in ID
order, including unavailable directories. Both display each registration as:

```text
Vault 1: notes
  /absolute/path/notes
```

An empty database prints `No vaults registered.` and succeeds. Successful commands
exit with status 0. Missing options and invalid paths produce Typer usage errors
and status 2. Registry, filesystem, and SQLite failures print `Error: ...` to
standard error and exit with status 1, without a traceback. A missing `vault`
table includes a reminder to apply migrations to the selected database. The
CLI never creates a missing database or scans Markdown files.

## Shared registry

`registry.py` defines `VaultRegistry(repository)`. The caller supplies and closes the repository; the registry does not choose a database path.

| Operation | Input | Result |
| --- | --- | --- |
| `register` | `path: Path`, optional `display_name: str` | Existing or newly saved `Vault` |
| `list_vaults` | None | `list[Vault]` ordered by ID, including unavailable roots |

Registration rules:

- Resolve relative paths, `~`, and symlinks to an absolute root.
- Require an existing directory with read/search access at registration time.
- Reuse the existing ID and name for the same directory, even if another name is supplied.
- Reject nested roots in either direction.
- Compare filesystem identities for accessible roots and ancestors, respecting filesystem case rules. Missing paths use saved path relationships; other access errors stop registration.
- Default names to the resolved folder name, or the root path for filesystem roots. Trim explicit names and reject blanks.

`ValueError` reports blank names and overlaps. Filesystem and SQLite exceptions propagate for callers to handle. Directory access can change after registration; later scans must handle that separately. Registration does not scan files or verify that a directory contains Markdown.

The repository enables and verifies foreign keys before opening transactions. `transaction()` reserves SQLite's writer with `BEGIN IMMEDIATE`, then commits all operations together or rolls back on failure. Registry conflict checks and insertion share this transaction. Competing writers wait up to the default five-second timeout before a SQLite error; nested transactions are unsupported. Standalone repository operations commit individually. See [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and [Python transaction control](https://docs.python.org/3.13/library/sqlite3.html#transaction-control).

## Manual verification

Use a disposable database. From the repository root:

```sh
export HIPPO_REGISTRY_REVIEW_DIR="$(mktemp -d /tmp/hippo-registry.XXXXXX)"
HIPPO_MIGRATION_DATABASE_URL="sqlite:$HIPPO_REGISTRY_REVIEW_DIR/hippo.sqlite3" just data-migrate run
cd core
uv run python
```

In the Python prompt:

```python
from os import environ
from pathlib import Path
from hippo.vault.registry import VaultRegistry
from hippo.vault.repository import VaultRepository

review = Path(environ["HIPPO_REGISTRY_REVIEW_DIR"])
notes = review / "notes"
notes.mkdir()
repository = VaultRepository(review / "hippo.sqlite3")
registry = VaultRegistry(repository)
vault = registry.register(notes)
registry.register(notes, "Another name")
registry.list_vaults()
```

- [x] Confirm repeated registration returns the same ID and original name.
- [x] Register relative and symlink aliases; verify case aliases on the target filesystem.
- [x] Reject an existing child of `notes` and its parent `review`.
- [x] Reject a missing root, a regular file, an unreadable directory, and a blank explicit name.
- [x] Verify omitted names, trimmed custom names, and filesystem-root naming on separate disposable databases.
- [x] Rename or disconnect a registered directory; confirm it remains listed. Restore it before further registration checks.
- [x] Close the repository, reopen it, and confirm IDs and names persist.
- [x] Use separate connections in two terminals to check duplicate/overlap serialization and the lock timeout.
- [x] Raise an exception inside `with repository.transaction():` after a direct insert; confirm the insert rolls back.

Close with `repository.close()` before leaving the prompt. The registry does not close the caller's connection. The checks above passed during interactive manual review on 2026-11-11 using disposable databases and the local macOS filesystem. This does not establish behavior on other filesystems. No automated tests were added or run.

### CLI walkthrough

To exercise the command handlers separately, run from the repository root:

```sh
hippo_cli_review_dir="$(mktemp -d /tmp/hippo-cli.XXXXXX)"
mkdir "$hippo_cli_review_dir/notes" "$hippo_cli_review_dir/notes/child"
HIPPO_MIGRATION_DATABASE_URL="sqlite:$hippo_cli_review_dir/hippo.sqlite3" \
  MIGRATION_SRC_PATH="database/migrations" \
  just data-migrate run --env-file .env.migrations.example
cd core
uv run --locked hippo vault --database "$hippo_cli_review_dir/hippo.sqlite3" list
uv run --locked hippo vault --database "$hippo_cli_review_dir/hippo.sqlite3" add "$hippo_cli_review_dir/notes"
uv run --locked hippo vault --database "$hippo_cli_review_dir/hippo.sqlite3" add "$hippo_cli_review_dir/notes"
uv run --locked python -m hippo vault --database "$hippo_cli_review_dir/hippo.sqlite3" list
```

Expect an empty list initially, then the same ID on both adds and one registration
in the final list. Try adding `notes/child` or the review directory itself; both
must fail with status 1. Omit `--database`, select a missing database, or pass a
file instead of a vault directory; expect status 2 and no created database.
Also exercise a symlink alias, unavailable root, unmigrated database, malformed
database, and a competing writer holding a transaction for over five seconds.

The CLI walkthrough and error cases passed during manual review on 2026-11-11:
empty lists, repeated and symlink registration, persistence across command
processes, paths containing spaces, unavailable roots, parent/child overlaps,
missing options, incorrect option placement, invalid paths, unwritable database
permissions, missing schema, malformed SQLite files, and writer lock timeout.
Both `hippo` and `python -m hippo` worked, and group/subcommand help required no
database. A timed-out add succeeded after the competing writer released its lock.

## Later work

Locate and register local Markdown vaults, capture note changes, and process them into SQLite note records and derived indexes. Markdown files remain the canonical source; the processed data must be rebuildable.

Support manual reconciliation first, then directory watching and app-triggered updates. Run ingestion and processing under the core engine's lifecycle, and expose shared operations to the desktop and MCP adapter.

Start with vault, note, and index records. Add identities or persistent job records only when a concrete requirement needs them. Lookup/update, root relocation, monitoring/scan metadata, watching, and ingestion remain future steps.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
