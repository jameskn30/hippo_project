set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Check which tools are available for local development.
doctor:
    ./scripts/doctor.sh

# Check shell scripts and plugin manifests without running application tests.
check:
    ./scripts/check-scaffold.sh

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

# Build a distributable desktop app for this platform.
app-build:
    cd app && bun run tauri build
