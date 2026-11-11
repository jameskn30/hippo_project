# Hippo core

`core/` is one Python project containing the `hippo` package under `src/`. Python 3.13 is the development version, `uv` manages dependencies, and Typer defines the command-line interface.

The current implementation provides CLI help and version output, plus `vault add` and `vault list` entry points that explicitly report storage is not implemented. A typed Vault record, shared register/list logic, SQLite repository, and initial dbmate SQL migration provide the storage foundation; the CLI is not connected to it yet. Future components have documentation placeholders; the engine runtime and component behavior will be added in separately reviewed steps. See [core infrastructure and commands](../docs/architecture/core.md) and [spec 02](../docs/specs/02-core-application-structure.md).

## Structure

The tree below shows the current files. Vault commands live in `vault/vault_app.py` and are registered by the root CLI; see the [component structure convention](../docs/architecture/component-structure.md).

These are application source directories. The development Markdown vault is `/Volumes/SSD/projects/hippo/data`, inside the checkout but outside `core/src/`. Other vault roots may live elsewhere. The `vault/` package contains code and developer documentation, not user notes.

```text
core/
├── README.md            # Core overview and development instructions
├── pyproject.toml       # Project metadata, dependencies, build, CLI entry point
├── uv.lock              # Resolved dependency versions
├── .python-version      # Development Python version
└── src/hippo/
    ├── __init__.py      # Defines the importable hippo package
    ├── __main__.py      # Delegates python -m hippo to the CLI
    ├── cli.py           # Typer application and shared main() entry point
    ├── vault/
    │   ├── __init__.py
    │   ├── README.md
    │   ├── vault_app.py  # Component-owned Typer group and command handlers
    │   ├── models.py     # Typed dataclass records
    │   ├── registry.py   # Shared registration rules
    │   └── repository.py # SQLite registration operations
    ├── mcp_server/README.md
    ├── skill_dreamer/README.md
    ├── evaluation/README.md
    ├── graph/README.md
    ├── memory/README.md
    └── workflow_engine/README.md
```

The installable distribution is named `hippo-core`; Python imports use `hippo`, and the installed shell command is `hippo`. These names refer to the same project. The version lives in `pyproject.toml` and is read from installed package metadata.

The vault package implements its CLI interface, shared registration rules, and storage foundation. CLI storage wiring, ingestion, and the remaining registry capabilities are planned. See the [vault guide](src/hippo/vault/README.md) for interfaces and pending manual checks. Other component folders contain planning READMEs only. Add Python implementations as functionality is approved. Each component shares the same project configuration and dependency lockfile.

## Development

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run from the repository root:

```sh
just core-setup
just core-help
just core-build
```

Equivalent commands, run from `core/`:

```sh
uv sync
uv run hippo --help
uv run hippo --version
uv run python -m hippo --help
uv run python -m hippo --version
uv build
```

`uv` creates `core/.venv/` and installs the project editably, so source changes are available on the next invocation. Use `uv run` to select that environment rather than the macOS system Python. Keep `uv.lock` in version control; the environment and build output are ignored.

Development commands use uv's automatic locking and synchronization. `uv sync` and `uv run` update `uv.lock` when project dependency changes require it, then prepare the environment. Existing locked versions remain preferred; new package releases alone do not trigger upgrades. See [uv locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/).

Running `hippo` without arguments shows help and exits with status 2, Typer's missing-command behavior. Explicit `--help` and `--version` exit with status 0. Unknown options or commands produce an error and status 2. Typer also exposes completion options; installing completion is an optional user action.

`uv build` produces a source archive and wheel under `core/dist/`. A wheel is an installable Python package, not a standalone macOS executable. Native bundling comes later.

## Code quality

From the repository root:

```sh
just lint    # Check Python core lint, formatting, and types without editing source files
just format  # Apply Python core formatting
```

Both commands cover `core/src/` and use development tools from `core/uv.lock`.
`just lint` runs Ruff linting, Ruff's formatting check, and Pyright in order,
stopping at the first failure. Pyright warnings also fail the command.
`just format` applies Ruff formatting; it does not fix lint or type errors.
The commands require uv; Pyright also requires Node.js. Neither command runs tests.

Ruff checks undefined names, unused imports, import ordering, common bug patterns,
and Python modernization rules, with Python 3.13 as the target and a formatting
line width of 100. Pyright uses `../pyrightconfig.json`, standard type checking,
and deprecation warnings. Fix findings rather than adding suppressions or
weakening the configuration to make a check pass.

Pylance remains a separate editor check. In VS Code, select `core/.venv/bin/python`
as the interpreter. The root `pyrightconfig.json` shares supported analysis settings
with Pylance, but editor and command-line diagnostics may differ. A passing
`just lint` does not establish that live Pylance diagnostics or runtime behavior
have been verified.

## Database migrations

SQL migrations, reusable queries, and database utilities live in the repository's [database/ directory](../database/README.md), outside the Python package. These assets are not bundled into the core wheel.

Use the standalone JavaScript migration script with Node.js and npm installed:

```sh
node database/scripts/migrate.mjs install
# Set HIPPO_MIGRATION_DATABASE_URL in the root .env.migrations first.
node database/scripts/migrate.mjs check
node database/scripts/migrate.mjs report
node database/scripts/migrate.mjs run
# Equivalent wrapper:
just data-migrate check
just data-migrate report
just data-migrate run
```

The scripts under `database/scripts/` require Node.js 20.12+ and use pinned `dbmate@2.36.0` through npm. `.env.migrations` is local and Git-ignored; `.env.migrations.example` is the tracked template. Set the destination `HIPPO_MIGRATION_DATABASE_URL` and SQL source `MIGRATION_SRC_PATH`; exported values override the file, and `--env-file PATH` selects another file. Preflight checks configuration and filesystem access before dbmate starts. The local database target is `/Users/nguyen/Library/Application Support/Hippo/hippo.sqlite3`. SQL files live under `database/migrations/` at the repository root; dbmate runs independently of Python and records versions in `schema_migrations`. `VaultRepository` opens an existing database without creating or upgrading tables. See [migration instructions and manual verification](../database/migrations/README.md) for preflight-only checks and current limits, including backups and adoption of older unversioned databases.

## Component boundaries

Each component owns its package under `hippo` and a `<component>_app.py` module when it exposes Typer commands, such as `vault/vault_app.py`. The root `hippo/cli.py` owns global options and registers implemented component groups. Follow the [shared convention](../docs/architecture/component-structure.md) for future components, implementation module names, and matching test locations.

The desktop app and future MCP adapter should call the same core operations. Keep shared application rules in `hippo`, rather than duplicating them in UI or host-specific plugins. Component responsibilities are described in their READMEs and in the [infrastructure guide](../docs/architecture/core.md#planned-components). One package can later provide multiple process entry points without requiring a separate Python project for each component.

The CLI uses [Typer callbacks](https://typer.tiangolo.com/tutorial/commands/callback/) and its [version option pattern](https://typer.tiangolo.com/tutorial/options/version/). Packaging uses the [uv build backend](https://docs.astral.sh/uv/concepts/build-backend/) with the module name explicitly set to `hippo`.
