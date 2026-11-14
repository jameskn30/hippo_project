set shell := ["bash", "-euo", "pipefail", "-c"]

# Run these examples from the repository root:
# cd /Volumes/SSD/projects/hippo

# Example: just
# List available commands.
default:
    @just --list

# Example: just doctor
# Check which tools are available for local development.
doctor:
    ./scripts/doctor.sh

# Example: just check
# Check shell scripts and plugin manifests without running application tests.
check:
    ./scripts/check-scaffold.sh

# Example: just lint
# Check Python core lint, formatting, and types without editing source files.
lint:
    cd core && uv run --locked ruff check src
    cd core && uv run --locked ruff format --check src
    cd core && uv run --locked pyright --project ../pyrightconfig.json --warnings

# Example: just format
# Format Python core source files.
format:
    cd core && uv run --locked ruff format src

# Example: just setup
# Report the development tools needed for the current scaffold.
setup:
    ./scripts/setup.sh

# Example: just sandbox-init
# Initialize the sandbox database and copy missing seed Markdown into its vault.
sandbox-init:
    ./scripts/sandbox-init.sh

# Example: just app-setup
# Install the desktop app dependencies.
app-setup:
    cd app && bun install --frozen-lockfile

# Example: just app-dev
# Run the Tauri desktop app in development mode.
app-dev:
    cd app && bun run tauri dev

# Example: just app-show
# Show the debug app while its development server is already running.
app-show:
    open app/src-tauri/target/debug/hippo-app

# Example: just app-format
# Format the desktop client source.
app-format:
    cd app && bun run format

# Example: just app-lint
# Run the desktop client linter.
app-lint:
    cd app && bun run lint

# Example: just app-check
# Check formatting, imports, and lint rules for the desktop client.
app-check:
    cd app && bun run check

# Example: just app-fix
# Apply safe formatting, import organization, and lint fixes to the desktop client.
app-fix:
    cd app && bun run fix

# Example: just app-build
# Build a distributable desktop app for this platform.
app-build:
    cd app && bun run tauri build

# Example: just core-setup
# Install the Python core and synchronize its dependencies.
core-setup:
    cd core && uv sync

# Example: just core-help
# Show the Hippo core command-line help.
core-help:
    cd core && uv run hippo --help

# Example: just core-build
# Build the Python core source archive and wheel into core/dist/.
core-build:
    cd core && uv build

# Examples:
#   just data-migrate install
#   just data-migrate check --env-file .env.migrations
#   just data-migrate run --env-file .env.migrations
#   just data-migrate report --env-file .env.migrations
# Install, check, run, or report SQL migrations using the standalone Node script.
[positional-arguments]
data-migrate action *args:
    node database/scripts/migrate.mjs "$@"
