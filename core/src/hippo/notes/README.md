# User Notes Storage

**Status:** Planned; this folder contains documentation only.

This is an application-code placeholder, not a directory for user-authored Markdown. The agreed target package is `hippo.vault`, with component commands in `vault/cli.py`; the code rename and command extraction have not happened yet. The development Markdown vault is `/Volumes/SSD/projects/hippo/data`, separate from `core/src/` but inside the application checkout. Other registered vaults may live elsewhere. See the [component structure convention](../../../../docs/architecture/component-structure.md).

Locate and register local Markdown vaults, capture note changes, and process them into SQLite note records and derived indexes. Markdown files remain the canonical source; the processed data must be rebuildable.

Support manual reconciliation first, then directory watching and app-triggered updates. Run ingestion and processing under the core engine's lifecycle, and expose shared operations to the desktop and MCP adapter.

Start with vault, note, and index records. Add identities or persistent job records only when a concrete requirement needs them. No storage, watcher, or ingestion commands are implemented yet.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
