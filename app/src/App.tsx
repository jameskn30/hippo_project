import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { NoteView } from "@/components/NoteView";
import { displayName } from "@/components/shared/note-utils";
import type { NoteState, SaveState, VaultEntry } from "@/components/shared/types";
import {
  createFolder as createFilesystemFolder,
  createNoteFile,
  deleteNote,
  getVault,
  listVault,
  openVault,
  readNote,
  renameFolder,
  renameNote,
  saveNote,
} from "@/lib/filesystem";
import { Toast } from "@/components/Toast";
import { Topbar } from "@/components/Topbar";
import { WelcomeState } from "@/components/WelcomeState";
import "@/styles/global/index.css";

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [note, setNote] = useState<NoteState | null>(null);
  const [reading, setReading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fontSize, setFontSize] = useState(17);

  const showError = useCallback((error: unknown) => {
    setMessage(error instanceof Error ? error.message : String(error));
    window.setTimeout(() => setMessage(null), 4500);
  }, []);

  const refreshVault = useCallback(async () => {
    setVaultEntries(await listVault());
  }, []);

  const loadNote = useCallback(async (path: string) => {
    const result = await readNote(path);
    setNote({ ...result, savedContent: result.content });
    setReading(false);
    setSaveState("saved");
  }, []);

  const persistNote = useCallback(async (current: NoteState) => {
    if (current.content === current.savedContent) return;
    setSaveState("saving");
    await saveNote(current);
    setNote((latest) =>
      latest?.path === current.path ? { ...latest, savedContent: current.content } : latest,
    );
    setSaveState("saved");
  }, []);

  const chooseVault = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") return;
      if (note && note.content !== note.savedContent) await persistNote(note);
      setVaultPath(await openVault(selected));
      setNote(null);
      await refreshVault();
    } catch (error) {
      showError(error);
    }
  }, [note, persistNote, refreshVault, showError]);

  const createNote = useCallback(async () => {
    if (!vaultPath) return chooseVault();
    try {
      for (let index = 1; index <= 100; index += 1) {
        const title = index === 1 ? "Untitled" : `Untitled ${index}`;
        try {
          const path = await createNoteFile(title);
          await refreshVault();
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
  }, [chooseVault, loadNote, refreshVault, showError, vaultPath]);

  useEffect(() => {
    getVault()
      .then(async (path) => {
        if (path) {
          setVaultPath(path);
          await refreshVault();
        }
      })
      .catch(showError);
  }, [refreshVault, showError]);

  useEffect(() => {
    if (!note || note.content === note.savedContent) return;
    const timer = window.setTimeout(() => {
      persistNote(note).catch((error) => {
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
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s" && note) {
        event.preventDefault();
        persistNote(note).catch((error) => {
          setSaveState("error");
          showError(error);
        });
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

  const openNote = useCallback(
    async (path: string) => {
      try {
        if (note && note.path !== path && note.content !== note.savedContent)
          await persistNote(note);
        await loadNote(path);
      } catch (error) {
        showError(
          String(error).includes("NOTE_CHANGED_EXTERNALLY")
            ? "This note changed outside Hippo. Your edits were kept in the editor."
            : error,
        );
      }
    },
    [loadNote, note, persistNote, showError],
  );

  const createFolder = useCallback(async () => {
    try {
      for (let index = 1; index <= 100; index += 1) {
        const name = index === 1 ? "New folder" : `New folder ${index}`;
        try {
          await createFilesystemFolder(name);
          await refreshVault();
          return;
        } catch (error) {
          if (!String(error).includes("File exists")) throw error;
        }
      }
      throw new Error("Could not find an available name for the new folder");
    } catch (error) {
      showError(error);
    }
  }, [refreshVault, showError]);

  const renameTreeEntry = useCallback(
    async (entry: VaultEntry, newTitle: string) => {
      try {
        const activeNoteIsRenamed =
          note &&
          (entry.isDirectory ? note.path.startsWith(`${entry.path}/`) : note.path === entry.path);
        if (activeNoteIsRenamed && note.content !== note.savedContent) await persistNote(note);
        const path = await (entry.isDirectory ? renameFolder : renameNote)(entry.path, newTitle);
        await refreshVault();
        if (note?.path === entry.path) await loadNote(path);
        if (entry.isDirectory && note?.path.startsWith(`${entry.path}/`)) {
          setNote((current) =>
            current?.path.startsWith(`${entry.path}/`)
              ? { ...current, path: `${path}${current.path.slice(entry.path.length)}` }
              : current,
          );
        }
      } catch (error) {
        showError(error);
      }
    },
    [loadNote, note, persistNote, refreshVault, showError],
  );

  const deleteCurrentNote = useCallback(async () => {
    if (!note || !window.confirm(`Permanently delete “${displayName(note.path)}” from this vault?`))
      return;
    try {
      await deleteNote(note.path);
      setNote(null);
      await refreshVault();
    } catch (error) {
      showError(error);
    }
  }, [note, refreshVault, showError]);

  return (
    <>
      <Dashboard
        sidebarOpen={sidebarOpen}
        vaultPath={vaultPath}
        vaultEntries={vaultEntries}
        selectedPath={note?.path ?? null}
        onOpenNote={(path) => void openNote(path)}
        onRenameEntry={(path, isDirectory, title) =>
          renameTreeEntry({ name: path, path, isDirectory }, title)
        }
        onCreateNote={() => void createNote()}
        onCreateFolder={() => void createFolder()}
        onError={showError}
      >
        <Topbar
          vaultPath={vaultPath}
          note={note}
          saveState={saveState}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen((open) => !open)}
        />
        {note ? (
          <NoteView
            note={note}
            reading={reading}
            fontSize={fontSize}
            saveState={saveState}
            onReadingChange={setReading}
            onContentChange={(content) =>
              setNote((current) => (current ? { ...current, content } : current))
            }
            onRename={(newTitle) =>
              note
                ? renameTreeEntry(
                    { name: note.path, path: note.path, isDirectory: false },
                    newTitle,
                  )
                : Promise.resolve()
            }
            onDelete={() => void deleteCurrentNote()}
            onSave={() => {
              persistNote(note).catch((error) => {
                setSaveState("error");
                showError(error);
              });
            }}
          />
        ) : (
          <WelcomeState
            vaultPath={vaultPath}
            onChooseVault={() => void chooseVault()}
            onCreateNote={() => void createNote()}
            onCreateFolder={() => void createFolder()}
          />
        )}
      </Dashboard>
      {message && <Toast message={message} onDismiss={() => setMessage(null)} />}
    </>
  );
}

export default App;
