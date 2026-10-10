# Hippo desktop app

The desktop client is built with Tauri 2, React, TypeScript, Tailwind CSS, and CodeMirror 6. It edits Markdown files directly in a local vault; the Markdown files remain the source of truth.

From the repository root, use `just app-setup` to install dependencies, `just app-dev` to run the desktop app, and `just app-build` to create a platform bundle. See the root [README](../README.md) for prerequisites.

Use the **Vim on/off** button beside Edit/Read to enable Vim keybindings. The preference is remembered locally and starts off for new installations. Vim starts in Normal mode: use `h/j/k/l` to move, `i` to enter Insert mode, `Esc` to return to Normal, `v` for Visual selection, and `u` to undo. `/` searches within the note; `:w` or `Cmd/Ctrl+S` saves through Hippo's existing save flow. The Vim panel shows the active mode and command input. Reading mode suspends Vim bindings; returning to Edit resumes them in Normal mode. Toggling Vim preserves the editor's text and undo history.
