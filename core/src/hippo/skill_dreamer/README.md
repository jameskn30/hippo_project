# Skill Dreamer

**Status:** Planned; this folder contains documentation only.

Explore and propose skill improvements using available memory, workflow outcomes, and evaluation results. Record enough context for proposed changes to be reviewed and evaluated.

Substantial work may run in an engine-managed worker process when isolation or CPU requirements justify it. A separate persistent service is not required simply because this component has its own folder.

Portable skill definitions belong in the repository's root `skills/` directory. This component will own evolution behavior; its interfaces and review flow remain to be designed.

See [core infrastructure](../../../../docs/architecture/core.md) for the current package and CLI.
