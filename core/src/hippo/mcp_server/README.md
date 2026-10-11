# MCP Server

**Status:** Planned; this folder contains documentation only.

Expose shared core operations to compatible agent hosts through MCP. Keep protocol handling here and application rules in the components that own them.

The proposed engine runtime launches and supervises a local Streamable HTTP server in a child process. This adapter calls engine operations rather than owning another ingestion pipeline or independently writing the knowledge database. Lifecycle commands and the client-to-engine transport still need implementation.

The name `hippo.mcp_server` leaves the SDK's top-level `mcp` import available. No MCP SDK dependency or server is installed as part of this placeholder.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
