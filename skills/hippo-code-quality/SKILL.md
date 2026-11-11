---
name: hippo-code-quality
description: Review and verify Hippo code changes using Pylance diagnostics, existing syntax/lint/build tools, and focused code review. Use after implementing a change or when asked to check code quality.
---

# Hippo code quality

Read the repository's `AGENTS.md`, relevant specification, and changed files. Review the working diff, including new files, without overwriting unrelated work. Follow existing approvals; this skill does not authorize additional implementation.

## Pylance and Python typing

- For Python changes, check Pylance errors, warnings, and deprecations through an available editor diagnostic tool. Confirm the workspace interpreter matches the core environment and Python version in `core/pyproject.toml` and `core/.python-version`.
- Cover changed files and affected callers. Record diagnostic scope; checking only open files does not establish that the whole package is clean.
- If live diagnostics are unavailable, report **Pylance: unverified**. Reading extension files or running a Python import is not a Pylance check.
- An already available Pyright checker can provide a separate type-check result. Use the project configuration and interpreter; do not label Pyright output as a Pylance result or assume their stubs and settings match.
- Investigate deprecation warnings against the installed extension's typing stubs and supported Python version. A warning on a decorator may concern one overload or annotation rather than the decorator itself.
- Do not silence diagnostics with ignores, casts, weaker checking modes, or exclusions merely to pass.

## Existing checks

Inspect `Justfile`, package scripts, and tool configuration before running commands. Select checks for the changed component; do not run every build for every change. Commands below run from the repository root unless stated otherwise.

| Area | Check |
| --- | --- |
| Python lint, formatting, and types | `just lint` (Ruff lint, Ruff formatting check, and Pyright; stops at the first failure) |
| Python | Compile changed files and inspect necessary imports using the core interpreter. Avoid starting services or opening databases during import checks. |
| Core packaging | `just core-build` |
| Frontend formatting, imports, and lint | `just app-check` |
| Frontend types and production build | `cd app && bun run build` |
| Native desktop packaging, when relevant | `just app-build` |
| Shell scripts and plugin manifests | `just check` |
| Diff whitespace | `git diff --check`; inspect new files separately |

`just lint` checks `core/src/` using locked development dependencies. Pyright warnings fail the command. Run a later check separately when an earlier failure prevents it from running, and report each result. `just format` applies Ruff formatting and should only run when formatting changes are authorized. Check current configuration rather than inventing additional commands. Report missing tools as unavailable; do not install dependencies or change configuration without approval. Prefer read-only check commands over format/fix commands. A package build does not prove type correctness or runtime behavior.

Do not add, modify, or run automated tests unless explicitly requested. Identify meaningful manual checks and edge cases instead. Reuse successful check results while their inputs remain unchanged.

## Focused review

- **Correctness:** Match requirements; inspect error paths, boundary values, races, transaction boundaries, and resource cleanup.
- **Readability:** Prefer clear names, short functions, and direct control flow. Flag unnecessary abstractions and duplicated logic.
- **Structure:** Keep desktop behavior in `app/`, shared operations in `core/`, and SQL behind repositories. Follow the component convention.
- **Security:** Check input validation, parameterized SQL, path scope, and accidental exposure of secrets or note content.
- **Resources:** Look for unbounded queues, retries, reads, and results; respect thread and connection ownership.

Check findings against actual callers and guards. Separate existing issues from regressions; do not invent findings or fix unrelated code. Use authorized fixes only. Leave commits and pushes to the user.

## Report

Lead with confirmed findings, ordered by severity. Include the affected `file:line`, impact, and a specific fix. Separate defects from optional suggestions; zero findings is valid.

Report each applicable check as **passed**, **failed**, **unverified**, or **not applicable**, with the command/tool, scope, and reason. Keep Pylance and fallback type-check results separate. List pending manual verification and material limits. Never report a clean check that was not run.
