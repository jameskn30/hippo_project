# Vault

**Status:** Package, CLI interface, Vault dataclass, SQLite repository, and initial SQL migration implemented; registry and ingestion planned.

`hippo.vault` contains application code, with its Typer command group in `vault/vault_app.py`. The root CLI imports and registers `vault_app` from `hippo.vault.vault_app`. `vault add` validates an existing readable directory; both `add` and `list` currently report that storage is not implemented and exit with status 1. See the [component structure convention](../../../../docs/architecture/component-structure.md).

The development Markdown vault data remains at `/Volumes/SSD/projects/hippo/data`, outside `core/src/hippo/`. Runtime/user vault roots will be selected separately. This package contains code that manages those directories, not their Markdown files.

`models.py` defines the typed `Vault` dataclass. `repository.py` creates and lists registrations in an existing SQLite database. Configure `HIPPO_MIGRATION_DATABASE_URL` in the root `.env.migrations`, prepare dbmate with `node scripts/migrations/migrate.mjs install`, and initialize storage with `just data-migrate run`. Database schema changes belong to [dbmate SQL migrations](../migrations/README.md), rather than repository constructors. The repository does not invoke dbmate, validate migration compatibility, or choose the database location. Use its connection on the thread that created it and close it explicitly or through its context manager.

Locate and register local Markdown vaults, capture note changes, and process them into SQLite note records and derived indexes. Markdown files remain the canonical source; the processed data must be rebuildable.

Support manual reconciliation first, then directory watching and app-triggered updates. Run ingestion and processing under the core engine's lifecycle, and expose shared operations to the desktop and MCP adapter.

Start with vault, note, and index records. Add identities or persistent job records only when a concrete requirement needs them. No storage, watcher, or ingestion commands are implemented yet.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
