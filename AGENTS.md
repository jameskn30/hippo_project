# Agent guidance

- Read `README.md` and the relevant numbered specification in `docs/specs/` before changing project behavior.
- Keep the desktop client in `app/` and shared knowledge behavior in `core/`.
- Keep human-editable Hippo workflow definitions in `workflows/`; keep portable agent instructions in `skills/`.
- Put host-specific plugin metadata and packaging in `plugins/claude-code/` or `plugins/codex/`.
- Use the root `Justfile` for local commands and `scripts/` for reusable command implementations.
- Do not commit credentials, local settings, generated bundles, or user data.
