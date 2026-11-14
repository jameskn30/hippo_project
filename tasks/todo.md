# Knowledge graph checklist

Status: proposed; no implementation approved or started.
Architecture and decisions: [plan.md](plan.md).
No automated tests/evaluations without explicit authorization.

## Approval gate

- [ ] Agree SQLite is canonical for curated graph records, Markdown for notes.
- [ ] Agree entities/facts/evidence are scoped to a vault initially.
- [ ] Agree on immutable evidence quotes rather than full note-revision history.
- [ ] Review the proposed minimum records, confidence placement, and identity rules.
- [ ] Approve step 1 only; pause after every implementation step.

## 1. Shared SQLite lifecycle

Dependencies: approval gate.
Files: `core/src/hippo/database.py`, `core/src/hippo/vault/repository.py`.

- [ ] Reuse existing open/close-on-failure, schema-check, foreign-key, and
      transaction/savepoint behavior through small helpers.
- [ ] Preserve existing repository constructor and transaction interfaces.
- [ ] Verify with lint/types and a disposable manual walkthrough: opening,
      unsupported schema, foreign keys, nested rollback, writer lock, and CLI
      read/refresh/search. No graph schema or sandbox migration yet.
- [ ] Explain the change and obtain approval for step 2.

## 2. Entity persistence

Dependencies: 1 and reviewed entity fields/constraints.
Files: new `database/migrations/*_create_graph_entity.sql`, `hippo/schema.py`,
`hippo/graph/__init__.py`, `hippo/graph/models.py`, `hippo/graph/repository.py`.
Python paths are relative to `core/src/`.

- [ ] Add vault-scoped entity identity, labels/types, UTC timestamps and indexes;
      update supported migration IDs without rewriting earlier migrations.
- [ ] Create/get/list entities using shared connection rules and bounded pages;
      same names remain distinct identities.
- [ ] Verify fresh/upgraded disposable databases, persistence on reopen, missing
      vaults, homonyms, constraints, rollback, and unchanged vault operations.
- [ ] Review before exposing entity commands.

## 3. Entity operations and CLI

Dependencies: 2.
Files: `hippo/graph/service.py`, `hippo/graph/graph_app.py`, `hippo/cli.py`.

- [ ] Validate entity input through shared operations usable by later consumers.
- [ ] Expose a small create/get/list command surface with table output, bounded
      paging, database override, readable failures, and live help examples.
- [ ] Verify both CLI entry points, restart persistence, invalid IDs/text,
      empty results, missing DB/config, and help without DB access.
- [ ] Review proposed fact/evidence fields and operation contracts next.

## 4. Fact and evidence persistence

Dependencies: 2; reviewed fact/evidence identity and snapshot contracts.
Files: new `database/migrations/*_create_graph_fact.sql`, `hippo/schema.py`,
`hippo/graph/models.py`, `hippo/graph/repository.py`.

- [ ] Represent entity-object or text-literal facts with exactly one object;
      enforce reference scope and exact-fact/evidence uniqueness.
- [ ] Store fact plus evidence atomically; duplicate evidence is a no-op and
      distinct evidence accumulates without replacing prior provenance.
- [ ] Verify constraints, FK restrictions, rollback after evidence failure,
      duplicate submissions, and competing-writer behavior manually.
- [ ] Review before adding the input/CLI flow.

## 5. Record and inspect supported facts

Dependencies: 3 and 4.
Files: `hippo/graph/service.py`, `hippo/graph/repository.py`,
`hippo/graph/graph_app.py`; models only if result types require changes.

- [ ] Validate source quote, expected note revision, active source, same-vault
      references, object kind, finite confidence, and bounded input.
- [ ] Validate and publish on one transaction/connection; reject outdated work
      without partial facts or evidence.
- [ ] Add commands to record entity/literal facts and inspect complete evidence.
      Verify the Hippo/SQLite example, Unicode/quoted input, invalid confidence,
      missing/deleted sources, cross-vault IDs, and repeated submissions.
- [ ] Review queries and freshness before the next step.

## 6. Query relationships and source freshness

Dependencies: 5.
Files: graph models/repository/service/CLI.

- [ ] Query bounded facts by entity, predicate, and source; provide one-hop
      incoming/outgoing relationships with deterministic pagination.
- [ ] Show saved evidence and current/changed/deleted source status against the
      captured database state without rebinding identities or dropping history.
- [ ] Verify source edits, soft deletion, recovery under a new ID, multiple
      evidence sources, empty results, and page boundaries manually.
- [ ] Review contradiction scope before implementation.

## 7A. Contradiction records

Dependencies: 6; reviewed record/resolution semantics.
Files: new contradiction migration, `hippo/schema.py`, graph models/repository.

- [ ] Record an explicit pair of distinct facts with scope/reference constraints.
- [ ] Preserve both assertions and their evidence; do not infer conflict merely
      from different object values or destroy graph history.
- [ ] Verify pair identity, repeated recording, missing/cross-vault references,
      and rollback on a disposable database.
- [ ] Review resolution command behavior next.

## 7B. Manual contradiction review

Dependencies: 7A.
Files: graph service/repository/CLI; models if needed.

- [ ] Allow explicit inspection and resolution with rationale/time while
      retaining original conflicting facts, evidence, and review history.
- [ ] Define repeat/concurrent resolution behavior before adding mutations.
- [ ] Verify unresolved/resolved visibility, invalid pairs, rejected resolution
      attempts, persistence, and history preservation manually.
- [ ] Review export contract next.

## 8A. Export graph records

Dependencies: 6 and 7B; reviewed bounded/streaming export contract.
Files: graph repository/service/CLI, with a dedicated export module only if needed.

- [ ] Export one vault's entities, facts, evidence, and contradiction records as
      inspectable JSON using the standard library, without truncating to one page.
- [ ] Keep export scope consistent and preserve stable IDs, object types,
      confidence, source snapshots, and resolution history.
- [ ] Verify Unicode, empty exports, multiple pages, coherent concurrent reads,
      output failure handling, and that source/database state is unchanged.

## 8B. Documentation and acceptance checkpoint

Dependencies: implemented slices above; user requests documentation batch.
Files: graph README, relevant core/architecture/spec docs, requested Obsidian
roadmap/checklists; review exact documentation scope before writing.

- [ ] Reconcile current behavior, limits, live examples, migration instructions,
      source-of-truth/backup requirements, and deferred features.
- [ ] Run relevant non-test lint/type/package checks; report Pylance separately
      if unavailable. Verify the CLI create-fact-query-export path manually.
- [ ] Record edge cases, remaining limitations, and verification evidence.
- [ ] Leave working changes for user review/commit/push.

## Deferred backlog (separate approval)

- [ ] Automatic extraction, session ingestion, and entity resolution.
- [ ] Semantic retrieval, embeddings, recency/decay ranking, multihop traversal.
- [ ] MCP/Dreamer integration, permissions, worker lifecycle, Docker sidecar.
- [ ] Fact correction/retraction flows beyond explicit contradiction resolution.
- [ ] Full source history, cross-vault relationships, graph UI, sync.
- [ ] Evaluation suite and automated tests, only when requested.
