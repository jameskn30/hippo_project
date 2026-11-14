# Evaluation

**Status:** Component folders scaffolded; search evaluation design drafted. Datasets and executable evaluation behavior are not implemented.

Own evaluation scenarios, datasets, scoring, and reports for Hippo workflows and proposed skill improvements. Keep generated reports separate from source code unless they are intentional project artifacts.

## Component ownership

Each component owns its evaluation design, fixtures, relevance labels, scenarios,
and eventual runner in its own folder under this package. The folders below are
README-only scaffolds, except for the existing search design. Evaluation
implementation is deferred.

| Component | Purpose | Status |
| --- | --- | --- |
| [Vault](vault/README.md) | Registration, scanning, parsing, and indexing | Scaffold only |
| [Search engine](search_engine/README.md) | Search correctness, retrieval quality, synchronization, and performance | Draft design; dataset and runner not implemented |
| [Graph](graph/README.md) | Relationships and source references | Scaffold only |
| [Memory](memory/README.md) | Memory retrieval and lifecycle | Scaffold only |
| [Dreamer](dreamer/README.md) | Proposed skill improvements | Scaffold only |
| [Workflow engine](workflow_engine/README.md) | Workflow execution and failure behavior | Scaffold only |
| [MCP server](mcp_server/README.md) | Tool responses and validation | Scaffold only |

```text
core/src/hippo/evaluation/
  README.md
  vault/README.md
  search_engine/README.md
  graph/README.md
  memory/README.md
  dreamer/README.md
  workflow_engine/README.md
  mcp_server/README.md
```

Keep component-specific loading and scoring with that component. Introduce shared
evaluation helpers only when multiple implemented components need the same
behavior. Generated local results can go under
`sandbox/evaluation-results/<component>/`, which is already ignored by Git.

Review each design before implementing its dataset or runner. A design document
is not evidence that an evaluation ran or passed.

## Runtime

The engine may launch substantial evaluation runs as on-demand worker processes. Define result contracts and persistence alongside the first implemented evaluation flow; this design does not establish a separate service or database.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
