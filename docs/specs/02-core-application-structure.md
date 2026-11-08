# 02 - Core Application Structure

**Status:** CLI foundation, vault storage foundation, and dbmate SQL migration implemented; CLI storage wiring and engine runtime planned

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

## Implemented component convention

Follow [the core component structure convention](../architecture/component-structure.md) for future components. Each implemented capability is a package under `hippo/` and owns a `<component>_app.py` module when it exposes Typer commands. The root `hippo/cli.py` owns global options and explicitly registers component groups; it remains the installed entry point.

The agreed vault layout is:

```text
core/src/hippo/
├── cli.py
└── vault/
    ├── __init__.py
    ├── README.md
    └── vault_app.py
```

The `notes/` placeholder was renamed to `vault/`, and the vault group and handlers now live in `hippo.vault.vault_app`. The root CLI imports and registers the group. Current command behavior is preserved until storage implementation is approved.

Vault and note remain distinct records: a vault identifies a registered directory, and a note identifies a Markdown document within it. Both can belong to the `hippo.vault` package. Add `service.py`, `models.py`, `repository.py`, and behavior-specific modules as functionality arrives, rather than creating empty implementations. Future unit tests mirror the package under `core/tests/vault/`.

The package holds engine code, not user Markdown. The development vault root is `/Volumes/SSD/projects/hippo/data`, inside the application checkout but outside `core/src/`. Additional vaults can be registered elsewhere once registration is implemented. No development data moved during the package refactor. SQLite will live in local application data outside both source and Markdown vaults, with its exact default path chosen during storage implementation.

## Acceptance criteria

- `just core-setup` installs the package and dependencies, updating the lockfile automatically when project metadata requires it. Compatible locked versions remain preferred.
- `just core-help` displays CLI help and exits successfully.
- From `core/`, both `uv run hippo --version` and `uv run python -m hippo --version` print the version declared in project metadata and exit successfully.
- Both entry points display equivalent help.
- Invoking the CLI without arguments displays help and exits with status 2. Invalid options and commands display an error and exit with status 2.
- `just core-build` creates a source distribution and wheel containing the `hippo` package and installed command declaration.

## Implemented database migration foundation

- Keep repository-level database assets under `database/`: versioned SQL in `migrations/`, reusable read-only SQL in `queries/`, and executable utilities in `scripts/`. These assets are outside the Python package and are not bundled into its wheel. See [database tools](../../database/README.md).
- Keep SQL migration files in `database/migrations/`, separate from Python execution code. Use standalone dbmate as the runner; no `runner.py` or migration framework dependency is added to the Python project.
- Use `node database/scripts/migrate.mjs install|check|run|report`, or `just data-migrate install|check|run|report`. The single ES module owns arguments, preflight, and npm subprocess execution, with documented function inputs and outputs. Node.js and npm prepare/run pinned `dbmate@2.36.0`; `check` only uses built-in Node modules.
- Configure the target URL as `HIPPO_MIGRATION_DATABASE_URL` and the SQL source directory as `MIGRATION_SRC_PATH` in the local, Git-ignored `.env.migrations`, using `.env.migrations.example` as a template. `--env-file PATH` selects another file; exported settings override the file. Preflight validates literal single-line dotenv configuration and filesystem access without opening SQLite, then supplies the checked values to dbmate. Node.js 20.12+ is required. The local database target is `/Users/nguyen/Library/Application Support/Hippo/hippo.sqlite3`, with its parent created; this does not establish an engine runtime default. Dbmate creates missing databases and applies migrations transactionally, tracking versions in `schema_migrations` rather than `PRAGMA user_version`.
- The initial migration establishes the existing vault registration schema. `VaultRepository` opens an existing database without creating tables; the caller must run migrations first.
- This is a developer workflow for fresh databases. Automatic backups, unversioned-schema adoption, runtime compatibility checks, and engine-managed startup remain later work. See [migration instructions](../../database/migrations/README.md).

## Later increments

Add working components as their requirements are approved, rather than empty implementations for every planned capability. The proposed sequence is vault registration and SQLite storage, manual ingestion, processing and directory watching, engine lifecycle and client integration, then managed MCP and optional workers.

The README-only folders reserve the agreed component locations; they do not implement this sequence.

Markdown remains the canonical note format. Derived storage must be rebuildable. Hippo remains a desktop application with a shared local engine; external Markdown editors may also edit its attached vaults.

Runtime transport, background startup, Docker configuration, native executable packaging, MCP lifecycle commands, and desktop integration are outside this first step. The fuller architecture remains in the Obsidian project note **Core application structure**.

## Manual verification

Run the setup, help, version, and build commands in [the core README](../../core/README.md). Check both command and module invocation. Also try an unknown option and an unknown command, and confirm that each reports an error instead of a Python traceback. Shell-completion installation is optional and should be performed explicitly by the user.
