# Core workspace

`core/` contains the local projects that implement Hippo's knowledge and agent capabilities. They are developed as separate packages where useful and shipped together as a sidecar service running on the user's machine.

The desktop app and MCP interface must use the same application operations and local knowledge store. Keep shared business rules in the core packages, not in the UI or host-specific plugins.

## Projects

- `projects/knowledge-store/` — SQLite-backed knowledge store, graph, ingestion, and retrieval.
- `projects/workflow-engine/` — execute workflow definitions from the root `workflows/` directory.
- `projects/evaluation/` — evaluation scenarios, datasets, scoring, and generated reports.
- `projects/mcp-server/` — expose core operations to compatible agent hosts through MCP.
- `services/sidecar/` — local service used by the desktop app.

Implementation and packaging will be added incrementally. Python is the planned language for the core services; `uv` will manage Python dependencies.
