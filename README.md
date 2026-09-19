# Hippo

Hippo is a local-first knowledge store and knowledge graph that agents can use through MCP. The desktop app and agent integrations share the same local core.

## Repository layout

- `app/` — cross-platform Tauri desktop client.
- `core/` — local sidecar and its knowledge, workflow, evaluation, and MCP projects.
- `workflows/` — reusable workflow definitions for Hippo to execute.
- `skills/` — portable agent instructions.
- `plugins/` — host-specific packages, currently Claude Code and Codex.
- `scripts/` — setup and utility scripts.
- `docs/` — specifications and architecture notes.
- `.github/workflows/` — repository CI/CD workflows.
- `Justfile` — local developer command interface.

## Current status

This repository is scaffolded for development. The app and core implementations are not in place yet. See `docs/specs/` for the planned feature specifications.

Run `just` to list available local commands.
