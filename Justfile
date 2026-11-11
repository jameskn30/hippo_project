set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Check which tools are available for local development.
doctor:
    ./scripts/doctor.sh

# Check shell scripts and plugin manifests without running application tests.
check:
    ./scripts/check-scaffold.sh

# Check Python core lint, formatting, and types without editing source files.
lint:
    cd core && uv run --locked ruff check src
    cd core && uv run --locked ruff format --check src
    cd core && uv run --locked pyright --project ../pyrightconfig.json --warnings

# Format Python core source files.
format:
    cd core && uv run --locked ruff format src

# Report the development tools needed for the current scaffold.
setup:
    ./scripts/setup.sh

# Install the desktop app dependencies.
app-setup:
    cd app && bun install --frozen-lockfile

# Run the Tauri desktop app in development mode.
app-dev:
    cd app && bun run tauri dev

# Show the debug app while its development server is already running.
app-show:
    open app/src-tauri/target/debug/hippo-app

# Format the desktop client source.
app-format:
    cd app && bun run format

# Run the desktop client linter.
app-lint:
    cd app && bun run lint

# Check formatting, imports, and lint rules for the desktop client.
app-check:
    cd app && bun run check

# Apply safe formatting, import organization, and lint fixes to the desktop client.
app-fix:
    cd app && bun run fix

# Build a distributable desktop app for this platform.
app-build:
    cd app && bun run tauri build

# Install the Python core and synchronize its dependencies.
core-setup:
    cd core && uv sync

# Show the Hippo core command-line help.
core-help:
    cd core && uv run hippo --help

# Build the Python core source archive and wheel into core/dist/.
core-build:
    cd core && uv build

# Install, check, run, or report SQL migrations using the standalone Node script.
[positional-arguments]
data-migrate action *args:
    node database/scripts/migrate.mjs "$@"
