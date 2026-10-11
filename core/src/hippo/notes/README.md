# User Notes Storage

**Status:** Planned; this folder contains documentation only.

Locate and register local Markdown vaults, capture note changes, and process them into SQLite note records and derived indexes. Markdown files remain the canonical source; the processed data must be rebuildable.

Support manual reconciliation first, then directory watching and app-triggered updates. Run ingestion and processing under the core engine's lifecycle, and expose shared operations to the desktop and MCP adapter.

Start with vault, note, and index records. Add identities or persistent job records only when a concrete requirement needs them. No storage, watcher, or ingestion commands are implemented yet.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
