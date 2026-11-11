# Vault

**Status:** Shared register/list logic, Vault dataclass, repository, and initial migration implemented. CLI storage wiring and ingestion remain planned; runtime verification is pending.

`hippo.vault` contains application code, with its Typer command group in `vault/vault_app.py`. The root CLI imports and registers `vault_app` from `hippo.vault.vault_app`. `vault add` validates an existing readable directory; both `add` and `list` currently report that storage is not implemented and exit with status 1. See the [component structure convention](../../../../docs/architecture/component-structure.md).

The development Markdown vault data remains at `/Volumes/SSD/projects/hippo/data`, outside `core/src/hippo/`. Runtime/user vault roots will be selected separately. This package contains code that manages those directories, not their Markdown files.

`models.py` defines the typed `Vault` dataclass. `repository.py` creates and lists registrations in an existing SQLite database. Configure `HIPPO_MIGRATION_DATABASE_URL` in the root `.env.migrations`, prepare dbmate with `node database/scripts/migrate.mjs install`, and initialize storage with `just data-migrate run`. Database schema changes belong to [dbmate SQL migrations](../../../../database/migrations/README.md), rather than repository constructors. The repository does not invoke dbmate, validate migration compatibility, or choose the database location. Use its connection on the thread that created it and close it explicitly or through its context manager.

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

- [ ] Confirm repeated registration returns the same ID and original name.
- [ ] Register relative and symlink aliases; verify case aliases on the target filesystem.
- [ ] Reject an existing child of `notes` and its parent `review`.
- [ ] Reject a missing root, a regular file, an unreadable directory, and a blank explicit name.
- [ ] Verify omitted names, trimmed custom names, and filesystem-root naming on separate disposable databases.
- [ ] Rename or disconnect a registered directory; confirm it remains listed. Restore it before further registration checks.
- [ ] Close the repository, reopen it, and confirm IDs and names persist.
- [ ] Use separate connections in two terminals to check duplicate/overlap serialization and the lock timeout.
- [ ] Raise an exception inside `with repository.transaction():` after a direct insert; confirm the insert rolls back.

Close with `repository.close()` before leaving the prompt. The registry does not close the caller's connection. These runtime checks are pending; no automated tests are included in this increment.

## Later work

Locate and register local Markdown vaults, capture note changes, and process them into SQLite note records and derived indexes. Markdown files remain the canonical source; the processed data must be rebuildable.

Support manual reconciliation first, then directory watching and app-triggered updates. Run ingestion and processing under the core engine's lifecycle, and expose shared operations to the desktop and MCP adapter.

Start with vault, note, and index records. Add identities or persistent job records only when a concrete requirement needs them. CLI storage wiring, lookup/update, root relocation, monitoring/scan metadata, watching, and ingestion remain future steps.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
