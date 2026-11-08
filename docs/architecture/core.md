# Core infrastructure and commands

**Status:** Python package, vault CLI interface, registration repository, and initial SQL migration implemented; CLI storage wiring and engine runtime planned.

**Updated:** 2026-10-17

## Current infrastructure

Hippo core is one local Python project under `core/`, with one importable package under `core/src/hippo/`. This keeps dependencies and installation together while leaving room for component boundaries. Separate folders do not imply separate services, databases, or Python projects.

| Tool or configuration | Current role |
| --- | --- |
| Python 3.13 | Development runtime, selected by `core/.python-version` |
| `uv` | Environment management, dependency resolution, installation, and builds |
| Typer | CLI definitions, argument handling, help, version, and completion options; version 0.27.3 is currently locked |
| `uv_build` | Builds the source archive and wheel; configured range is `>=0.8.19,<0.9` |
| dbmate | SQL migration tool, independent of Python; pinned npm package prepared by `node database/scripts/migrate.mjs install` |
| Root `Justfile` | Convenient setup, help, build, and migration commands |

The project metadata allows Python 3.13 and newer; the foundation has been verified locally on Python 3.13. Native executable bundling and other runtime environments remain future work.

## Source layout

This tree shows current files. The `hippo.vault` package owns its commands in `vault/vault_app.py`, and the root CLI imports and registers `vault_app`. See [component structure](component-structure.md) for the shared convention and future component rules.

Component packages contain Python code and developer documentation. The development Markdown vault is `/Volumes/SSD/projects/hippo/data`, inside the checkout but separate from `core/src/`; other roots may be selected elsewhere. The registry will store vault paths when implemented; the engine database belongs in local application data. No user notes are stored in `src/hippo/vault/`.

```text
core/
├── README.md
├── .python-version
├── pyproject.toml
├── uv.lock
└── src/hippo/
    ├── __init__.py
    ├── __main__.py
    ├── cli.py
    ├── vault/
    │   ├── __init__.py
    │   ├── README.md
    │   ├── vault_app.py
    │   ├── models.py
    │   └── repository.py
    ├── mcp_server/README.md
    ├── skill_dreamer/README.md
    ├── evaluation/README.md
    ├── graph/README.md
    ├── memory/README.md
    └── workflow_engine/README.md
```

Database tooling lives separately in [database/](../../database/README.md): `migrations/` contains versioned SQL, `queries/` contains read-only SQL, and `scripts/` contains the migration runner and future executable database utilities. These repository assets are not included in the Python wheel.

`pyproject.toml` defines the distribution name `hippo-core`, version, dependencies, build backend, and installed command. The import name is `hippo`. `uv.lock` records resolved dependencies and belongs in version control; `.python-version` selects the development interpreter.

Both invocation paths use `hippo.cli.main`:

```text
hippo                 → installed command → hippo.cli.main → Typer
python -m hippo       → hippo.__main__      → hippo.cli.main → Typer
```

The version option reads installed package metadata, keeping `pyproject.toml` as the version source. The CLI provides help, version output, Typer's completion options, and `vault add`/`vault list` entry points defined in `hippo.vault.vault_app`. The vault commands currently report that storage is not implemented; `vault add` validates an existing readable directory first. The CLI does not start an engine, attach vaults, process notes, or connect to the desktop.

## Commands available now

Run these from the repository root:

| Command | Behavior |
| --- | --- |
| `just core-setup` | Runs `uv sync` in `core/`; updates the lockfile if required and installs the project and dependencies into `core/.venv/` |
| `just core-help` | Runs `uv run hippo --help` in `core/` |
| `just core-build` | Runs `uv build` in `core/`; creates a source archive and wheel under `core/dist/` |
| `just data-migrate install` | Prepares the pinned dbmate npm package through `database/scripts/migrate.mjs` |
| `just data-migrate run` | Applies pending SQL migrations using `.env.migrations`; accepts `--env-file PATH` |
| `just data-migrate report` | Reports applied/pending migration files and totals using the same configuration |
| `node database/scripts/migrate.mjs check` | Validates the configured database URL and `MIGRATION_SRC_PATH` without opening SQLite; requires Node.js 20.12+ |
| `just` | Lists available repository commands |
| `just doctor` | Reports whether the development tools are available |
| `just setup` | Checks tools and prints dependency installation commands |
| `just check` | Checks shell syntax and plugin manifest JSON; does not run application tests |

Run direct CLI commands from `core/`:

```sh
uv run hippo --help
uv run hippo --version
uv run python -m hippo --help
uv run python -m hippo --version
```

Local development uses uv's default automatic locking and environment synchronization. These commands update `uv.lock` when project metadata requires a new resolution. They retain compatible locked versions rather than upgrading packages simply because a new release exists. See [uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/).

Explicit help and version requests exit with status 0. The current version output is `Hippo core 0.1.0`. Running without arguments shows help and exits with status 2; invalid options or commands report an error and exit with status 2.

Typer exposes `--show-completion` and `--install-completion`. Completion installation changes the user's shell setup and remains an optional user action. Use `uv run` for normal development so the command uses the project environment.

## Local and generated files

| Path | Purpose |
| --- | --- |
| `core/.venv/` | Local Python environment; kept for development and ignored by Git |
| `core/dist/` | Generated build artifacts; recreated by `just core-build` and ignored by Git |
| `__pycache__/` | Python bytecode caches; generated during imports and ignored by Git |
| `.env.migrations` | Local destination database URL and SQL source directory; Git-ignored, with a tracked `.env.migrations.example` template |

The cleanup removes existing build artifacts and source bytecode caches. Running or building again can recreate them. A wheel is an installable Python package; standalone macOS bundling is not implemented.

## Planned components

Each component folder contains a README describing its role. The vault package has a Typer interface and a registration repository; its registry rules and ingestion, plus the other README-only components, remain planned.

| Component | Proposed responsibility |
| --- | --- |
| [Vault](../../core/src/hippo/vault/README.md), package `hippo.vault` | CLI interface, Vault record, and SQLite registration repository implemented; registry rules, CLI storage wiring, change capture, ingestion, notes and indexes planned |
| [MCP server](../../core/src/hippo/mcp_server/README.md) | Protocol adapter over core operations; lifecycle managed by the engine |
| [Skill Dreamer](../../core/src/hippo/skill_dreamer/README.md) | Propose skill improvements and coordinate evaluation |
| [Evaluation](../../core/src/hippo/evaluation/README.md) | Scenarios, scoring, run results, and reports |
| [Knowledge graph](../../core/src/hippo/graph/README.md) | Shared graph operations and queries |
| [Agent memory](../../core/src/hippo/memory/README.md) | Memory organization, retrieval, and lifecycle |
| [Workflow engine](../../core/src/hippo/workflow_engine/README.md) | Execute definitions from the root `workflows/` directory |

The proposed runtime will coordinate these capabilities. Runtime code and engine-managed child processes will be added when their behavior is approved. The SQLite vault repository and [dbmate migration assets](../../database/migrations/README.md) exist, but are not connected to the CLI. There is currently no watcher, engine API, background daemon, Docker configuration, or MCP server in the core implementation.

The desktop remains in `app/`. Shared behavior belongs in `hippo`, with desktop and MCP clients calling the same operations. See [spec 02](../specs/02-core-application-structure.md) for the implemented scope; broader future design remains in the Obsidian project notes.
