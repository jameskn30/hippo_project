# Workflow Engine

**Status:** Planned; this folder contains documentation only.

Load and execute human-editable workflow definitions from the repository's root `workflows/` directory. Record execution history and results through shared core storage operations as those operations are implemented.

Keep workflow execution behavior here; definitions and portable agent instructions remain in `workflows/` and `skills/`. Coordinate with evaluation and Skill Dreamer through explicit component interfaces.

No workflow runner, execution-history schema, or CLI commands are implemented yet.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
