# Portable agent skills

Store reusable agent instructions here as one directory per skill, with a `SKILL.md` as its entry point. Host-specific plugin packaging belongs in `plugins/`.

## Project skills

| Skill | Purpose |
| --- | --- |
| [hippo-database](hippo-database/SKILL.md) | Connect to local SQLite, inspect schema and records, run query files, and handle requested migrations or data changes |

The canonical source is `skills/hippo-database/`. Project discovery links point to that directory:

```text
.agents/skills/hippo-database -> ../../skills/hippo-database
.claude/skills/hippo-database -> ../../skills/hippo-database
```

Invoke it as `$hippo-database` in Codex or `/hippo-database` in Claude Code. It can also be selected automatically for relevant database tasks. Start a new session if the skill does not appear. Edit the canonical source so both hosts receive the same instructions; plugin packaging remains separate.

The shared `SKILL.md` uses standard `name` and `description` metadata. Both hosts support linked skill folders: see [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills) and [Claude Code skill locations](https://code.claude.com/docs/en/skills#choose-where-skills-load).
