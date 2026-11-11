# Agent guidance

## Discuss and get approval before implementation

- Before implementing any change, discuss the current behavior, the requested outcome, the proposed approach, and the files involved with the user.
- Refine the proposal with the user's feedback. Obtain explicit approval for the final agreed version of the plan before changing code. Silence is not approval.
- Break implementation into small, understandable steps. Implement only the approved step; do not complete an entire multi-step change in one go.
- After each step, explain what changed and pause for the user's approval before starting the next implementation step.

## Explain the implementation step by step

- Use plain language to explain what each step does, why it is needed, and how it changes the application's behavior.
- Identify the relevant files and code paths, and describe how they work together. Define unfamiliar technical terms briefly.
- After each step, report the changes, the verification performed, and anything that remains unverified. Provide clear manual verification steps.

## Batch documentation updates

- Do not update documentation after every implementation step. Batch documentation updates together when the user requests them.

## Leave commits and pushes to the user

- Do not create Git commits or push branches, tags, or changes to GitHub or any other remote. The user handles all commits and pushes.
- Leave approved changes in the working tree for the user to review and commit. Do not treat a coding request or a skill's workflow as authorization to commit or push.

## Project structure

- Read `README.md` and the relevant numbered specification in `docs/specs/` before changing project behavior.
- Keep the desktop client in `app/` and shared knowledge behavior in `core/`.
- Keep human-editable Hippo workflow definitions in `workflows/`; keep portable agent instructions in `skills/`.
- Put host-specific plugin metadata and packaging in `plugins/claude-code/` or `plugins/codex/`.
- Use the root `Justfile` for local commands and `scripts/` for reusable command implementations.
- Do not commit credentials, local settings, generated bundles, or user data.
