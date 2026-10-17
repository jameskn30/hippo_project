# Hippo

Hippo is a local-first Markdown notes app that will grow into a knowledge store and graph for AI agents. Different agent hosts will connect through MCP. The human workflow visualizer is planned for after the MVP.

The current implementation includes a Tauri desktop app for opening and editing a local Markdown vault ([spec 01](docs/specs/01-tauri-markdown-notes.md)) and the Python core package and CLI foundation ([spec 02](docs/specs/02-core-application-structure.md)). The Obsidian project vault is the planning source for later specs.

## Project layout

- `app/` — Tauri 2 desktop client (React, TypeScript, Tailwind CSS, CodeMirror 6).
- `core/` — Python package and CLI foundation for the local engine and shared knowledge behavior.
- `data/` — development Markdown vault data at `/Volumes/SSD/projects/hippo/data`, outside `core/src/hippo/`; runtime vault roots are selected separately.
- `workflows/` — human-editable Hippo workflow definitions.
- `skills/` — portable agent instructions.
- `plugins/claude-code/` and `plugins/codex/` — host-specific metadata and packaging.
- `scripts/` — reusable local setup and utility commands.
- `docs/specs/` — active implementation specs; future planning specs are in Obsidian.
- `.github/workflows/` — GitHub repository automation.
- `Justfile` — local command interface.

## macOS prerequisites

Install Git, Homebrew, `just`, Bun, Rust, and Xcode Command Line Tools. Hippo's desktop shell uses Tauri; its macOS setup needs the Apple build tools and Rust toolchain.

```sh
xcode-select --install
brew install just oven-sh/bun/bun
```

Install Rust with [rustup](https://www.rust-lang.org/tools/install), then clone the repository:

```sh
git clone git@github.com:jameskn30/hippo_project.git
cd hippo_project
```

## Setup, run, and build

```sh
just app-setup  # Install frontend dependencies
just app-dev    # Run the Tauri desktop app
just app-format # Format desktop client code
just app-lint   # Report desktop client lint issues
just app-check  # Check formatting, imports, and lint rules
just app-fix    # Apply safe code fixes
just app-build  # Build a desktop bundle for this platform
```

The app opens a folder as a vault, lists Markdown notes and folders, creates and renames notes, searches titles and contents, and edits notes with autosave and a reading preview. Markdown files remain the source of truth on disk. The active vault is remembered locally.

Other repository commands:

```sh
just         # List commands
just doctor  # Check development tools
just check   # Validate shell scripts and plugin manifests
```

The Python core now has a Typer CLI foundation. Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run:

```sh
just core-setup # Install the core package and locked dependencies
just core-help  # Show CLI help
just core-build # Build the Python package
```

See the [core README](core/README.md) and [spec 02](docs/specs/02-core-application-structure.md). The engine runtime, knowledge store, and MCP features are later increments.

The [core infrastructure guide](docs/architecture/core.md) covers the current files, commands, local environment, build output, and planned component folders.

## Development conventions

- Keep desktop UI and shell code in `app/`; shared knowledge behavior belongs in `core/`.
- Follow the [core component structure convention](docs/architecture/component-structure.md): each component owns its package and Typer app module; the root CLI registers command groups. Vault commands live in `hippo.vault.vault_app`.
- Keep portable skill sources in `skills/` and host-specific packaging in `plugins/`.
- Keep local command recipes in `Justfile` and reusable command implementations in `scripts/`.
- Read the relevant numbered specification before changing project behavior.
