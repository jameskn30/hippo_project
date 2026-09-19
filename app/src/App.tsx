import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { NoteView } from "@/components/NoteView";
import { Sidebar } from "@/components/Sidebar";
import { buildTree, displayName } from "@/components/shared/note-utils";
import type { NoteContent, NoteState, SaveState, VaultEntry } from "@/components/shared/types";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { WelcomeState } from "@/components/WelcomeState";
import "@/styles/global/index.css";

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [note, setNote] = useState<NoteState | null>(null);
  const [reading, setReading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VaultEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(276);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fontSize, setFontSize] = useState(17);

  const refreshEntries = useCallback(async () => setEntries(await invoke<VaultEntry[]>("list_vault")), []);

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
    await invoke("save_note", { path: current.path, content: current.content, expectedContent: current.savedContent });
    setNote((latest) => latest?.path === current.path ? { ...latest, savedContent: current.content } : latest);
    setSaveState("saved");
  }, []);

  const chooseVault = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") return;
      if (note && note.content !== note.savedContent) await persistNote(note);
      setVaultPath(await invoke<string>("open_vault", { path: selected }));
      setNote(null);
      setSearch("");
      await refreshEntries();
    } catch (error) {
      showError(error);
    }
  }, [note, persistNote, refreshEntries, showError]);

  const createNote = useCallback(async () => {
    if (!vaultPath) return chooseVault();
    try {
      for (let index = 1; index <= 100; index += 1) {
        const title = index === 1 ? "Untitled" : `Untitled ${index}`;
        try {
          const path = await invoke<string>("create_note", { title });
          await refreshEntries();
          await loadNote(path);
          return;
        } catch (error) {
          if (!String(error).includes("already exists")) throw error;
        }
      }
      throw new Error("Could not find an available name for the new note");
    } catch (error) {
      showError(error);
    }
  }, [chooseVault, loadNote, refreshEntries, showError, vaultPath]);

  useEffect(() => {
    invoke<string | null>("get_vault")
      .then(async (path) => { if (path) { setVaultPath(path); await refreshEntries(); } })
      .catch(showError);
  }, [refreshEntries, showError]);

  useEffect(() => {
    if (!note || note.content === note.savedContent) return;
    const timer = window.setTimeout(() => {
      persistNote(note).catch((error) => {
        setSaveState("error");
        showError(String(error).includes("NOTE_CHANGED_EXTERNALLY")
          ? "This note changed outside Hippo. Copy your edits before reloading it."
          : error);
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [note, persistNote, showError]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
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
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s" && note) {
        event.preventDefault();
        persistNote(note).catch((error) => { setSaveState("error"); showError(error); });
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createNote();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setFontSize((current) => Math.min(current + 1, 24));
      } else if (event.key === "-") {
        event.preventDefault();
        setFontSize((current) => Math.max(current - 1, 14));
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [createNote, note, persistNote, showError]);

  const openNote = useCallback(async (entry: VaultEntry) => {
    try {
      if (note && note.path !== entry.path && note.content !== note.savedContent) await persistNote(note);
      await loadNote(entry.path);
    } catch (error) {
      showError(String(error).includes("NOTE_CHANGED_EXTERNALLY")
        ? "This note changed outside Hippo. Your edits were kept in the editor."
        : error);
    }
  }, [loadNote, note, persistNote, showError]);

  const createFolder = useCallback(async () => {
    try {
      for (let index = 1; index <= 100; index += 1) {
        const name = index === 1 ? "New folder" : `New folder ${index}`;
        try {
          await invoke("create_folder", { name });
          await refreshEntries();
          return;
        } catch (error) {
          if (!String(error).includes("File exists")) throw error;
        }
      }
      throw new Error("Could not find an available name for the new folder");
    } catch (error) {
      showError(error);
    }
  }, [refreshEntries, showError]);

  const renameTreeEntry = useCallback(async (entry: VaultEntry, newTitle: string) => {
    try {
      const activeNoteIsRenamed = note && (entry.isDirectory
        ? note.path.startsWith(`${entry.path}/`)
        : note.path === entry.path);
      if (activeNoteIsRenamed && note.content !== note.savedContent) await persistNote(note);
      const path = await invoke<string>(entry.isDirectory ? "rename_folder" : "rename_note", { path: entry.path, newTitle });
      await refreshEntries();
      if (note?.path === entry.path) await loadNote(path);
      if (entry.isDirectory && note?.path.startsWith(`${entry.path}/`)) {
        setNote((current) => current?.path.startsWith(`${entry.path}/`)
          ? { ...current, path: `${path}${current.path.slice(entry.path.length)}` }
          : current);
      }
    } catch (error) {
      showError(error);
    }
  }, [loadNote, note, persistNote, refreshEntries, showError]);

  const moveTreeEntry = useCallback(async (entry: VaultEntry, targetFolder: VaultEntry | null) => {
    if (!targetFolder && !entry.path.includes("/")) return;
    try {
      const activeNoteIsMoved = note && (entry.isDirectory
        ? note.path.startsWith(`${entry.path}/`)
        : note.path === entry.path);
      if (activeNoteIsMoved && note.content !== note.savedContent) await persistNote(note);
      const path = await invoke<string>("move_entry", { path: entry.path, targetFolder: targetFolder?.path ?? null });
      await refreshEntries();
      if (note?.path === entry.path) await loadNote(path);
      if (entry.isDirectory && note?.path.startsWith(`${entry.path}/`)) {
        setNote((current) => current?.path.startsWith(`${entry.path}/`)
          ? { ...current, path: `${path}${current.path.slice(entry.path.length)}` }
          : current);
      }
    } catch (error) {
      showError(error);
    }
  }, [loadNote, note, persistNote, refreshEntries, showError]);

  const deleteCurrentNote = useCallback(async () => {
    if (!note || !window.confirm(`Permanently delete “${displayName(note.path)}” from this vault?`)) return;
    try {
      await invoke("delete_note", { path: note.path });
      setNote(null);
      await refreshEntries();
    } catch (error) {
      showError(error);
    }
  }, [note, refreshEntries, showError]);

  const tree = useMemo(() => buildTree(entries), [entries]);

  return (
    <div className="app-frame">
      {sidebarOpen && <Sidebar
        vaultPath={vaultPath} search={search} searchResults={searchResults} isSearching={isSearching}
        tree={tree} selectedPath={note?.path ?? null} width={sidebarWidth} onResize={setSidebarWidth} onChooseVault={() => void chooseVault()}
        onCreateNote={() => void createNote()} onCreateFolder={() => void createFolder()}
        onSearchChange={setSearch} onOpenNote={(entry) => void openNote(entry)} onRenameEntry={renameTreeEntry} onMoveEntry={moveTreeEntry} onCollapse={() => setSidebarOpen(false)}
      />}
      <main className="main-panel">
        <Topbar vaultPath={vaultPath} note={note} saveState={saveState} sidebarOpen={sidebarOpen}
          onShowSidebar={() => setSidebarOpen(true)} onChooseVault={() => void chooseVault()} onCreateNote={() => void createNote()} />
        {note ? <NoteView note={note} reading={reading} fontSize={fontSize} saveState={saveState}
          onReadingChange={setReading} onContentChange={(content) => setNote((current) => current ? { ...current, content } : current)}
          onRename={(newTitle) => note ? renameTreeEntry({ name: note.path, path: note.path, isDirectory: false }, newTitle) : Promise.resolve()} onDelete={() => void deleteCurrentNote()} />
          : <WelcomeState vaultPath={vaultPath} onChooseVault={() => void chooseVault()} onCreateNote={() => void createNote()} onCreateFolder={() => void createFolder()} />}
      </main>
      {message && <Toast message={message} onDismiss={() => setMessage(null)} />}
    </div>
  );
}

export default App;
