# 02 - Core Application Structure

**Status:** CLI foundation and component documentation placeholders implemented; engine capabilities planned  
**Dependencies:** None for the CLI foundation

## Objective

Establish one installable Python project for Hippo's local core engine. Keep the structure simple while allowing note storage, MCP, and later agent-memory components to share application operations.

## Approved first step

- Keep one `core/pyproject.toml`, one `core/uv.lock`, and one package under `core/src/hippo/`.
- Use Python 3.13 for development and `uv` for environment and dependency management.
- Define the CLI with Typer; expose `hippo` through `hippo.cli:main`.
- Delegate `python -m hippo` to the same entry point.
- Provide help and installed-package version output without starting a service or accessing notes.
- Provide root `Justfile` commands for setup, CLI help, and Python package builds.
- Organize future component documentation under `core/src/hippo/`, using a README in each placeholder folder. The cleanup replaces the earlier planning-folder layout.

## Approved cleanup and component placeholders

- Remove the obsolete planning folders and generated build and source-cache files; keep the local development environment.
- Add README-only placeholders for `notes`, `mcp_server`, `skill_dreamer`, `evaluation`, `graph`, `memory`, and `workflow_engine` under `core/src/hippo/`.
- Mark each component as planned and describe its responsibilities without adding implementations or dependencies.
- Document the current infrastructure and available commands in [the core infrastructure guide](../architecture/core.md), and update repository documentation links and setup instructions.

## Agreed component convention: implementation pending

Follow [the core component structure convention](../architecture/component-structure.md) for future components. Each implemented capability is a package under `hippo/` and owns a `cli.py` when it exposes commands. The root `hippo/cli.py` owns global options and explicitly registers component groups; it remains the installed entry point.

The agreed vault layout is:

```text
core/src/hippo/
├── cli.py
└── vault/
    ├── __init__.py
    ├── README.md
    └── cli.py
```

The code refactor will rename the current `notes/` placeholder to `vault/` and move the vault group and handlers from the root CLI into `hippo.vault.cli`. Current command behavior is preserved until storage implementation is approved. This convention is recorded in documentation only; the code move has not been implemented yet.

Vault and note remain distinct records: a vault identifies a registered directory, and a note identifies a Markdown document within it. Both can belong to the `hippo.vault` package. Add `service.py`, `models.py`, `repository.py`, and behavior-specific modules as functionality arrives, rather than creating empty implementations. Future unit tests mirror the package under `core/tests/vault/`.

The package holds engine code, not user Markdown. The development vault root is `/Volumes/SSD/projects/hippo/data`, inside the application checkout but outside `core/src/`. Additional vaults can be registered elsewhere once registration is implemented. The current `notes/` placeholder contains only developer documentation; there are no user notes there to move. SQLite will live in local application data outside both source and Markdown vaults, with its exact default path chosen during storage implementation.

## Acceptance criteria

- `just core-setup` installs the package and dependencies, updating the lockfile automatically when project metadata requires it. Compatible locked versions remain preferred.
- `just core-help` displays CLI help and exits successfully.
- From `core/`, both `uv run hippo --version` and `uv run python -m hippo --version` print the version declared in project metadata and exit successfully.
- Both entry points display equivalent help.
- Invoking the CLI without arguments displays help and exits with status 2. Invalid options and commands display an error and exit with status 2.
- `just core-build` creates a source distribution and wheel containing the `hippo` package and installed command declaration.

## Later increments

Add working components as their requirements are approved, rather than empty implementations for every planned capability. The proposed sequence is vault registration and SQLite storage, manual ingestion, processing and directory watching, engine lifecycle and client integration, then managed MCP and optional workers.

The README-only folders reserve the agreed component locations; they do not implement this sequence.

Markdown remains the canonical note format. Derived storage must be rebuildable. Hippo remains a desktop application with a shared local engine; external Markdown editors may also edit its attached vaults.

Runtime transport, background startup, Docker configuration, native executable packaging, MCP lifecycle commands, and desktop integration are outside this first step. The fuller architecture remains in the Obsidian project note **Core application structure**.

## Manual verification

Run the setup, help, version, and build commands in [the core README](../../core/README.md). Check both command and module invocation. Also try an unknown option and an unknown command, and confirm that each reports an error instead of a Python traceback. Shell-completion installation is optional and should be performed explicitly by the user.
