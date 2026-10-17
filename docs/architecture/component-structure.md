# Core component structure convention

**Status:** Agreed convention; vault package rename and CLI extraction are not implemented yet.  
**Updated:** 2026-10-17

## One project, components inside hippo

Keep one Python project under `core/`, one `pyproject.toml`, one `uv.lock`, and the application package under `core/src/hippo/`. Each capability lives in a component package inside `hippo`.

A Python module is a `.py` file. A regular package is an importable folder containing `__init__.py`. For Hippo, a component such as `hippo.vault` is a package containing the modules needed for that capability.

The agreed name for vault registration and note ingestion is **`hippo.vault`**. It replaces the earlier `hippo.notes` package name. Vault, note, and index remain records within this component; naming the package `vault` does not change their identities or storage rules.

A vault is a registered directory containing notes; a note is an individual Markdown document in that vault. They are different concepts, even when their behavior shares a component package. A `Vault` has a `vault_id` and root directory. A `Note` has a `note_id`, owning `vault_id`, relative path, and captured content. Its derived index uses the note's identity. Package organization does not merge these records or require a separate component for each record type.

## Source code and user data are different directories

`core/src/hippo/vault/` is the proposed location for Python code that manages vaults and their notes. It is not a vault directory containing user-authored Markdown. The current `core/src/hippo/notes/` folder contains a developer README only; there are no user notes in it to relocate.

| Contents | Location | Purpose |
| --- | --- | --- |
| Component source code | `core/src/hippo/vault/` inside the application repository, after the pending refactor | CLI handlers, registry, scanner, loader, repository, and processing behavior |
| Development Markdown vault data | `/Volumes/SSD/projects/hippo/data`, outside `core/src/hippo/` | Sample Markdown used during local development |
| Runtime/user Markdown vaults | Directories selected by the user and registered by path | Actual user notes; the development `data/` path is not a fixed runtime default |
| Engine database | Local application-data directory, outside source and the Markdown vaults; exact default remains to be chosen | Captured source, vault/note records, processing state, and derived indexes |

The development Markdown vault data is in [the repository's `data/` directory](../../data/). It is outside `core/src/hippo/` and separate from Python code. Runtime/user vaults are selected separately. The code-package portion below is the agreed target and is still pending implementation:

```text
hippo/
├── data/                            # Development Markdown vault data
│   └── *.md
└── core/src/hippo/
    └── vault/                       # Planned Python component package
        ├── cli.py
        ├── scanner.py               # Later implementation
        └── repository.py            # Later implementation
```

During development, `/Volumes/SSD/projects/hippo/data` can be registered explicitly once registration is implemented. It is not automatically registered or hardcoded as a runtime/user vault default. The scanner reads registered directories; it does not treat the Python package as a Markdown vault. Other vaults can live elsewhere, including outside the checkout. This documentation step does not register, move, or modify vault files.

## Agreed vault layout

```text
core/
├── pyproject.toml
├── uv.lock
├── src/hippo/
│   ├── __init__.py
│   ├── __main__.py          # Delegates python -m hippo to the root CLI
│   ├── cli.py               # Main Typer app, global options, group registration
│   └── vault/               # Python component code, not user Markdown
│       ├── __init__.py      # Defines the component package
│       ├── README.md        # Purpose, current status, and component boundaries
│       └── cli.py           # vault_app, add_vault, list_vaults
└── tests/
    ├── README.md
    └── vault/               # Future unit tests matching the component package
```

This is the target layout. Currently, `core/src/hippo/notes/README.md` is the storage placeholder and the vault Typer group and handlers are defined in `hippo/cli.py`. The `tests/vault/` folder and vault backend do not exist yet. This documentation change does not move code or create tests.

## CLI ownership and registration

Each component owns its Typer command group in `<component>/cli.py`. Export a clearly named object such as `vault_app` or `memory_app`. The root `hippo/cli.py` explicitly imports and registers each implemented group.

After the vault refactor, root registration will be:

```python
from hippo.vault.cli import vault_app

app.add_typer(vault_app, name="vault")
```

The existing application entry point remains `hippo.cli:main`, and `hippo/__main__.py` continues to delegate to it. Both `hippo` and `python -m hippo` use the same command tree. This refactor preserves the current `vault add` and `vault list` behavior, including their explicit storage-not-implemented error until backend functionality is added.

Component CLI modules define arguments, render output, and translate application errors into useful command failures. Application operations belong in the component's service layer. Importing a CLI module must not open databases, scan vaults, or start background work; construct resources when a command or the engine runtime needs them.

## Add implementation modules as behavior arrives

Use the following names where the responsibility is needed. A component does not need every file in this table.

| File | Responsibility |
| --- | --- |
| `__init__.py` | Package marker and deliberate public exports; keep imports free of startup side effects |
| `README.md` | Component purpose, implemented versus planned behavior, and interfaces |
| `cli.py` | Component-owned Typer group and command handlers |
| `service.py` | Shared application operations used by CLI, desktop integration, MCP, or other components |
| `models.py` | Typed records and operation inputs/results; introduce identities only when needed |
| `repository.py` | Persistence operations and transaction rules for records the component owns |
| Other modules | Behavior-specific responsibilities, added when implemented |

For vault storage, later behavior-specific modules can include `registry.py`, `scanner.py`, `watcher.py`, `loader.py`, `worker.py`, and `events.py`. The scanner owns path validation, duplicate-signal handling, and inspection scope. `worker.py` can initially combine pending-work coordination and transformation functions.

The engine runtime will construct components and own shared execution resources. SQLite access follows the engine's database ownership and concurrency rules; a component folder does not automatically get its own database, thread pool, subprocess, or independently deployed service.

Keep direct persistence operations in repositories. Services coordinate component behavior. CLI, desktop, and MCP adapters use shared operations so application rules are implemented once. Begin with ordinary Python functions or classes; add interface abstractions only when a concrete requirement needs them.

## Apply the same convention to future components

Use short descriptive `snake_case` package names under `hippo`, such as `vault`, `mcp_server`, `skill_dreamer`, `evaluation`, `graph`, `memory`, and `workflow_engine`. Add `__init__.py` when a README placeholder becomes a regular Python package.

When a future component exposes CLI commands, put its group in that component's `cli.py` and register it explicitly in the root CLI. For example, a future `hippo.memory.cli.memory_app` can be registered with the user-facing command name `memory`. Internal package names and command names can differ deliberately: `mcp_server` can expose an `mcp` group when implemented.

Keep the existing README-only placeholders until their behavior is approved. Create implementation files as functionality arrives. Split a module or introduce another package only when its size, reuse, or distribution requirements justify it.

## Test locations

Keep unit tests outside `src/`, under `core/tests/`, with folders mirroring component packages. For the vault component, future examples are `core/tests/vault/test_cli.py`, `test_registry.py`, and `test_repository.py`.

Use `test_*.py` module names. With Python 3.13's built-in `unittest` discovery, add `__init__.py` to nested test directories when they are created. Test implementation and execution remain subject to the user's explicit authorization; documenting this layout does not add test cases or infrastructure.

See [core infrastructure and commands](core.md) for the current implementation and [spec 02](../specs/02-core-application-structure.md) for implementation scope.
