# Hippo

Hippo is a local-first Markdown notes app that will grow into a knowledge store and graph for AI agents. Different agent hosts will connect through MCP. The human workflow visualizer is planned for after the MVP.

The current implementation is the first numbered feature: a Tauri desktop app for opening and editing a local Markdown vault. See [spec 01](docs/specs/01-tauri-markdown-notes.md). The Obsidian project vault is the planning source for later specs.

## Project layout

- `app/` — Tauri 2 desktop client (React, TypeScript, Tailwind CSS, CodeMirror 6).
- `core/` — planned local sidecar services and shared knowledge behavior.
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
just app-build  # Build a desktop bundle for this platform
```

The app opens a folder as a vault, lists Markdown notes and folders, creates and renames notes, searches titles and contents, and edits notes with autosave and a reading preview. Markdown files remain the source of truth on disk. The active vault is remembered locally.

Other repository commands:

```sh
just         # List commands
just doctor  # Check development tools
just check   # Validate shell scripts and plugin manifests
```

`core/` does not have a runnable service yet. Its knowledge store and MCP features follow the desktop notes MVP.

## Development conventions

- Keep desktop UI and shell code in `app/`; shared knowledge behavior belongs in `core/`.
- Keep portable skill sources in `skills/` and host-specific packaging in `plugins/`.
- Keep local command recipes in `Justfile` and reusable command implementations in `scripts/`.
- Read the relevant numbered specification before changing project behavior.
