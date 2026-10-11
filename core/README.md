# Hippo core

`core/` is one Python project containing the `hippo` package under `src/`. Python 3.13 is the development version, `uv` manages dependencies, and Typer defines the command-line interface.

The current implementation provides CLI help and version output. Future components have documentation placeholders; the engine runtime and component behavior will be added in separately reviewed steps. See [core infrastructure and commands](../docs/architecture/core.md) and [spec 02](../docs/specs/02-core-application-structure.md).

## Structure

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
    ├── notes/README.md
    ├── mcp_server/README.md
    ├── skill_dreamer/README.md
    ├── evaluation/README.md
    ├── graph/README.md
    ├── memory/README.md
    └── workflow_engine/README.md
```

The installable distribution is named `hippo-core`; Python imports use `hippo`, and the installed shell command is `hippo`. These names refer to the same project. The version lives in `pyproject.toml` and is read from installed package metadata.

The component folders contain planning READMEs only. Add Python implementations as functionality is approved. Each component shares the same project configuration and dependency lockfile.

## Development

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run from the repository root:

```sh
just core-setup
just core-help
just core-build
```

Equivalent commands, run from `core/`:

```sh
uv sync --locked
uv run --locked hippo --help
uv run --locked hippo --version
uv run --locked python -m hippo --help
uv run --locked python -m hippo --version
uv build
```

`uv` creates `core/.venv/` and installs the project editably, so source changes are available on the next invocation. Use `uv run` to select that environment rather than the macOS system Python. Keep `uv.lock` in version control; the environment and build output are ignored.

Running `hippo` without arguments shows help and exits with status 2, Typer's missing-command behavior. Explicit `--help` and `--version` exit with status 0. Unknown options or commands produce an error and status 2. Typer also exposes completion options; installing completion is an optional user action.

`uv build` produces a source archive and wheel under `core/dist/`. A wheel is an installable Python package, not a standalone macOS executable. Native bundling comes later.

## Component boundaries

The desktop app and future MCP adapter should call the same core operations. Keep shared application rules in `hippo`, rather than duplicating them in UI or host-specific plugins. Component responsibilities are described in their READMEs and in the [infrastructure guide](../docs/architecture/core.md#planned-components). One package can later provide multiple process entry points without requiring a separate Python project for each component.

The CLI uses [Typer callbacks](https://typer.tiangolo.com/tutorial/commands/callback/) and its [version option pattern](https://typer.tiangolo.com/tutorial/options/version/). Packaging uses the [uv build backend](https://docs.astral.sh/uv/concepts/build-backend/) with the module name explicitly set to `hippo`.
