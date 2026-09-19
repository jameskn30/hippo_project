import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Menu,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";

type VaultEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

type NoteContent = {
  path: string;
  content: string;
};

type NoteState = NoteContent & { savedContent: string };

type TreeNode = VaultEntry & { children: TreeNode[] };

function buildTree(entries: VaultEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const byPath = new Map<string, TreeNode>();
  const ordered = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of ordered) {
    const node: TreeNode = { ...entry, children: [] };
    byPath.set(entry.path, node);
    const parentPath = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : "";
    const parent = byPath.get(parentPath);
    if (parent) parent.children.push(node);
    else root.push(node);
  }

  return root;
}

function displayName(path: string) {
  return path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
}

function formatVaultPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onOpen: (entry: VaultEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const selected = node.path === selectedPath;

  return (
    <div>
      <button
        className={`tree-row ${selected ? "tree-row-selected" : ""}`}
        style={{ paddingLeft: `${12 + depth * 15}px` }}
        onClick={() => (node.isDirectory ? setExpanded((value) => !value) : onOpen(node))}
        aria-expanded={node.isDirectory ? expanded : undefined}
      >
        <span className="tree-caret">
          {node.isDirectory ? (
            expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : null}
        </span>
        {node.isDirectory ? (
          expanded ? <FolderOpen size={15} /> : <Folder size={15} />
        ) : (
          <FileText size={15} />
        )}
        <span className="tree-label">{displayName(node.name)}</span>
      </button>
      {node.isDirectory && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [note, setNote] = useState<NoteState | null>(null);
  const [reading, setReading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VaultEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  const refreshEntries = useCallback(async () => {
    const result = await invoke<VaultEntry[]>("list_vault");
    setEntries(result);
  }, []);

  const showError = useCallback((error: unknown) => {
    setMessage(error instanceof Error ? error.message : String(error));
    window.setTimeout(() => setMessage(null), 4500);
  }, []);

  const loadNote = useCallback(async (path: string) => {
    const result = await invoke<NoteContent>("read_note", { path });
    setNote({ ...result, savedContent: result.content });
    setReading(false);
    setSaveState("saved");
  }, []);

  const persistNote = useCallback(async (current: NoteState) => {
    if (current.content === current.savedContent) return;
    setSaveState("saving");
    await invoke("save_note", {
      path: current.path,
      content: current.content,
      expectedContent: current.savedContent,
    });
    setNote((latest) =>
      latest?.path === current.path
        ? { ...latest, savedContent: current.content }
        : latest,
    );
    setSaveState("saved");
  }, []);

  useEffect(() => {
    invoke<string | null>("get_vault")
      .then(async (path) => {
        if (!path) return;
        setVaultPath(path);
        await refreshEntries();
      })
      .catch(showError);
  }, [refreshEntries, showError]);

  useEffect(() => {
    if (!note || note.content === note.savedContent) return;
    const snapshot = note;
    const timer = window.setTimeout(() => {
      persistNote(snapshot).catch((error) => {
        setSaveState("error");
        showError(
          String(error).includes("NOTE_CHANGED_EXTERNALLY")
            ? "This note changed outside Hippo. Copy your edits before reloading it."
            : error,
        );
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [note, persistNote, showError]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      invoke<VaultEntry[]>("search_notes", { query: search })
        .then(setSearchResults)
        .catch(showError)
        .finally(() => setIsSearching(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search, showError]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (note) {
          persistNote(note).catch((error) => {
            setSaveState("error");
            showError(error);
          });
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createNote();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [note, persistNote, showError]);

  const tree = useMemo(() => buildTree(entries), [entries]);

  async function chooseVault() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") return;
      if (note && note.content !== note.savedContent) await persistNote(note);
      const canonical = await invoke<string>("open_vault", { path: selected });
      setVaultPath(canonical);
      setNote(null);
      setSearch("");
      await refreshEntries();
    } catch (error) {
      showError(error);
    }
  }

  async function openNote(entry: VaultEntry) {
    try {
      if (note && note.path !== entry.path && note.content !== note.savedContent) {
        await persistNote(note);
      }
      await loadNote(entry.path);
    } catch (error) {
      if (String(error).includes("NOTE_CHANGED_EXTERNALLY")) {
        showError("This note changed outside Hippo. Your edits were kept in the editor.");
      } else {
        showError(error);
      }
    }
  }

  async function createNote() {
    if (!vaultPath) return void chooseVault();
    const title = window.prompt("Name your note");
    if (!title?.trim()) return;
    try {
      const path = await invoke<string>("create_note", { title: title.trim() });
      await refreshEntries();
      await loadNote(path);
    } catch (error) {
      showError(error);
    }
  }

  async function createFolder() {
    const name = window.prompt("Name your folder");
    if (!name?.trim()) return;
    try {
      await invoke("create_folder", { name: name.trim() });
      await refreshEntries();
    } catch (error) {
      showError(error);
    }
  }

  async function renameCurrentNote() {
    if (!note) return;
    const title = window.prompt("Rename note", displayName(note.path));
    if (!title?.trim() || title.trim() === displayName(note.path)) return;
    try {
      if (note.content !== note.savedContent) await persistNote(note);
      const path = await invoke<string>("rename_note", {
        path: note.path,
        newTitle: title.trim(),
      });
      await refreshEntries();
      await loadNote(path);
    } catch (error) {
      showError(error);
    }
  }

  async function deleteCurrentNote() {
    if (!note || !window.confirm(`Permanently delete “${displayName(note.path)}” from this vault?`)) return;
    try {
      await invoke("delete_note", { path: note.path });
      setNote(null);
      await refreshEntries();
    } catch (error) {
      showError(error);
    }
  }

  const selectedEntry = (entry: VaultEntry) => {
    if (entry.isDirectory) return;
    void openNote(entry);
  };

  return (
    <div className="app-frame">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="brand-row">
            <div className="brand-mark"><span>h</span></div>
            <span className="brand-name">hippo</span>
            <button className="icon-button sidebar-collapse" onClick={() => setSidebarOpen(false)} aria-label="Hide sidebar">
              <Menu size={16} />
            </button>
          </div>

          <button className="vault-switcher" onClick={chooseVault}>
            <div className="vault-avatar">{vaultPath ? displayName(vaultPath).slice(0, 1).toUpperCase() : "H"}</div>
            <div className="vault-copy">
              <span className="vault-overline">CURRENT VAULT</span>
              <strong>{vaultPath ? displayName(vaultPath) : "Choose a vault"}</strong>
            </div>
            <ChevronDown size={15} className="text-subtle" />
          </button>

          <div className="sidebar-section-heading">
            <span>YOUR NOTES</span>
            <div className="sidebar-actions">
              <button className="tiny-icon-button" onClick={createFolder} disabled={!vaultPath} title="New folder" aria-label="New folder"><FolderPlus size={15} /></button>
              <button className="tiny-icon-button" onClick={createNote} disabled={!vaultPath} title="New note" aria-label="New note"><FilePlus2 size={15} /></button>
            </div>
          </div>

          <label className="search-box">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={13} /></button>}
          </label>

          <div className="file-tree" aria-label="Vault notes">
            {!vaultPath ? (
              <div className="tree-empty">Open a folder to see your notes.</div>
            ) : search ? (
              <>
                <div className="tree-group-label">SEARCH RESULTS</div>
                {isSearching ? <div className="tree-empty">Searching…</div> : searchResults.length ? searchResults.map((entry) => (
                  <button key={entry.path} className={`tree-row ${note?.path === entry.path ? "tree-row-selected" : ""}`} onClick={() => selectedEntry(entry)}>
                    <span className="tree-caret" /><FileText size={15} /><span className="tree-label">{displayName(entry.path)}</span>
                  </button>
                )) : <div className="tree-empty">No matching notes.</div>}
              </>
            ) : tree.length ? tree.map((node) => (
              <TreeItem key={node.path} node={node} depth={0} selectedPath={note?.path ?? null} onOpen={selectedEntry} />
            )) : <div className="tree-empty">No notes yet. Create one to get started.</div>}
          </div>

          <div className="sidebar-footer">
            <div className="vault-location"><span className="status-dot" /> <span>{vaultPath ? formatVaultPath(vaultPath) : "Local notes stay on this device"}</span></div>
            <button className="icon-button" onClick={chooseVault} title="Open another vault" aria-label="Open another vault"><MoreHorizontal size={17} /></button>
          </div>
        </aside>
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            {!sidebarOpen && <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Show sidebar"><Menu size={17} /></button>}
            <span className="crumb-muted">{vaultPath ? displayName(vaultPath) : "Hippo"}</span>
            {note && <><span className="crumb-divider">/</span><span className="crumb-current">{displayName(note.path)}</span></>}
          </div>
          <div className="topbar-actions">
            {note && <span className={`save-indicator ${saveState === "error" ? "save-error" : ""}`}>
              {saveState === "saved" ? <><Check size={13} /> Saved</> : saveState === "saving" ? "Saving…" : "Save issue"}
            </span>}
            <button className="button-secondary" onClick={chooseVault}><FolderOpen size={15} /> Open vault</button>
            <button className="button-primary" onClick={createNote} disabled={!vaultPath}><FilePlus2 size={15} /> New note</button>
          </div>
        </header>

        {note ? (
          <>
            <div className="note-toolbar">
              <div className="note-path"><span className="path-label">{note.path}</span></div>
              <div className="note-actions">
                <div className="view-switch" role="tablist" aria-label="Note view">
                  <button className={!reading ? "active" : ""} onClick={() => setReading(false)} role="tab" aria-selected={!reading}><Pencil size={14} /> Edit</button>
                  <button className={reading ? "active" : ""} onClick={() => setReading(true)} role="tab" aria-selected={reading}><BookOpen size={14} /> Read</button>
                </div>
                <button className="icon-button" onClick={renameCurrentNote} title="Rename note" aria-label="Rename note"><Pencil size={15} /></button>
                <button className="icon-button danger-hover" onClick={deleteCurrentNote} title="Delete note" aria-label="Delete note"><Trash2 size={15} /></button>
              </div>
            </div>
            <section className="note-scroll-area">
              <article className={`note-document ${reading ? "note-reading" : "note-editing"}`}>
                <div className="note-heading-row">
                  <FileText className="note-heading-icon" size={18} />
                  <div>
                    <div className="note-kicker">MARKDOWN NOTE</div>
                    <h1>{displayName(note.path)}</h1>
                  </div>
                </div>
                {reading ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content || "_This note is empty. Switch to Edit to start writing._"}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="editor-surface">
                    <CodeMirror
                      value={note.content}
                      height="100%"
                      extensions={[markdown()]}
                      onChange={(value) => setNote((current) => current ? { ...current, content: value } : current)}
                      basicSetup={{ lineNumbers: false, foldGutter: true, highlightActiveLine: false, highlightActiveLineGutter: false }}
                      aria-label={`Edit ${displayName(note.path)} as Markdown`}
                    />
                  </div>
                )}
              </article>
            </section>
            <footer className="statusbar">
              <span>{reading ? "Reading view" : "Markdown"}</span>
              <span>{note.content.split("\n").length} lines</span>
              <span className="status-spacer" />
              <span>{saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving changes" : "Check save status"}</span>
              <span className="shortcut-hint">⌘ S to save</span>
            </footer>
          </>
        ) : (
          <section className="welcome-state">
            <div className="welcome-emblem"><BookOpen size={27} strokeWidth={1.6} /></div>
            <div className="welcome-eyebrow">A QUIETER PLACE TO THINK</div>
            <h1>{vaultPath ? "Your notes, in one place." : "Make room for your ideas."}</h1>
            <p>{vaultPath ? "Choose a note from the sidebar, or start a new one." : "Open a local folder as your vault. Your Markdown stays on your device."}</p>
            <div className="welcome-buttons">
              {vaultPath ? <button className="button-primary" onClick={createNote}><FilePlus2 size={15} /> Create a note</button> : <button className="button-primary" onClick={chooseVault}><FolderOpen size={15} /> Open a vault</button>}
              {vaultPath && <button className="button-secondary" onClick={createFolder}><FolderPlus size={15} /> New folder</button>}
            </div>
            <div className="welcome-footnote">Local-first by design <span>·</span> Plain Markdown files</div>
          </section>
        )}
      </main>
      {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={15} /></button></div>}
    </div>
  );
}

export default App;
