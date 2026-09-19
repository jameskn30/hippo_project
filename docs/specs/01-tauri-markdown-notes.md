# 01 - Tauri Markdown Notes App

**Priority:** 01 - Current MVP focus  
**Status:** In Progress  
**Dependencies:** None

## Objective

Build a usable, cross-platform desktop note-taking app with an Obsidian-like local Markdown workflow. A person can open a folder as a vault, create and organize notes, edit Markdown, and read a rendered preview. Notes remain ordinary files that the user can inspect and edit outside Hippo.

## Problem

Hippo needs a useful human-facing app before its knowledge graph and agent features can be used comfortably. The app should provide a durable place to write and organize Markdown notes without requiring an account, hosted service, or proprietary note format.

## Scope and Requirements

- Build the desktop client with Tauri, React, TypeScript, Tailwind CSS, and CodeMirror 6.
- Let the user create a vault or open an existing local folder as a vault.
- Display Markdown notes and folders in a navigable file tree.
- Create, open, edit, rename, and delete Markdown notes. Confirm before deleting a note.
- Save edits automatically and provide a visible saved/unsaved state and a save shortcut.
- Provide editing and rendered reading/preview modes for common Markdown syntax.
- Find notes by title and content within the active vault.
- Reopen the most recently used vault when the app starts, with an option to choose another.
- Keep the app useful offline; do not require an account or hosted service.
- Show clear feedback for file access errors and unsaved changes.

## Data and File Behavior

- Markdown files in the selected vault are the canonical source for note content.
- Store notes as ordinary `.md` files in the user's chosen directory; do not require a Hippo-only file format.
- Preserve Markdown source when switching between edit and reading modes.
- Limit file operations to the active vault. Never silently overwrite externally changed content while the current note has unsaved edits.
- Hippo may add a local search index later, but it must be rebuildable from the Markdown files and must not become the sole copy of note content.

## User Stories

- [ ] As a user, I can open an existing folder as a vault and see its Markdown notes.
- [ ] As a user, I can create, rename, and delete notes and folders in my vault.
- [ ] As a user, I can edit a note in Markdown and see when changes have been saved.
- [ ] As a user, I can switch to a rendered reading view without changing the Markdown source.
- [ ] As a user, I can search the active vault by note title or text.
- [ ] As a user, I can close and reopen Hippo without losing saved notes or edits.
- [ ] As a user, I am warned before a delete or a save that could overwrite changes made outside Hippo.

## Acceptance Criteria

- The desktop app launches and lets a user choose a local vault folder.
- Existing `.md` files can be opened, edited, saved, and reopened with their content intact.
- New notes are written as Markdown files inside the active vault.
- Rename and delete operations are reflected in the file tree and on disk; deletion requires confirmation.
- The rendered view displays common Markdown formatting while the edit view preserves the source text.
- Basic title and body search returns matching notes from the active vault.
- Core note-taking functions work offline and do not send note content to a hosted service.

## Boundaries

- Always: keep note content portable as Markdown; scope filesystem access to the chosen vault; preserve user-authored content.
- Ask first: changing the canonical format for notes or adding a hosted dependency.
- Never: silently discard unsaved edits or silently overwrite an externally changed note.

## Out of Scope

- Knowledge graph extraction, entity resolution, and fact consolidation (spec 02).
- Agent access through MCP, portable skills, and harness plugins.
- Cross-device synchronization.
- The post-MVP human-agent software design visualizer.

## Open Questions

- Should the MVP support Obsidian-style `[[wikilinks]]` and backlinks, or begin with standard Markdown links?
- Which Markdown extensions and attachment workflows are required for the first usable release?
- Should deletion move files to the operating system trash or permanently delete after confirmation?
