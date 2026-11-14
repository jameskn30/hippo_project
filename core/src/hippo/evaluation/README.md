# Evaluation

**Status:** Search evaluation design drafted; datasets and executable evaluation behavior are not implemented.

Own evaluation scenarios, datasets, scoring, and reports for Hippo workflows and proposed skill improvements. Keep generated reports separate from source code unless they are intentional project artifacts.

## Component ownership

Each component owns its evaluation design, fixtures, relevance labels, scenarios,
and eventual runner in its own folder under this package. For example, search
evaluations belong in `evaluation/search_engine/`; future Dreamer evaluations
belong in `evaluation/dreamer/`. Create those folders as their evaluation work
arrives, rather than adding empty placeholders.

| Component | Purpose | Status |
| --- | --- | --- |
| [Search engine](search_engine/README.md) | Search correctness, retrieval quality, synchronization, and performance | Draft design; dataset and runner not implemented |

```text
core/src/hippo/evaluation/
  README.md
  search_engine/
    README.md
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
