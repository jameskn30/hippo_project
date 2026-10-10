import type { AtomicCodeMirrorEditorHandle } from "@atomic-editor/editor";
import { BookOpen, FileText, Pencil, Trash2 } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/IconButton";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayName } from "../shared/note-utils";
import type { NoteState, SaveState } from "../shared/types";
import "./styles.css";

type NoteViewProps = {
  note: NoteState;
  reading: boolean;
  fontSize: number;
  saveState: SaveState;
  onReadingChange: (reading: boolean) => void;
  onContentChange: (content: string) => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => void;
  onSave: () => void;
};

export function NoteView({
  note,
  reading,
  fontSize,
  saveState,
  onReadingChange,
  onContentChange,
  onRename,
  onDelete,
  onSave,
}: NoteViewProps) {
  const editorHandleRef = useRef<AtomicCodeMirrorEditorHandle | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [title, setTitle] = useState(() => displayName(note.path));
  const [vimEnabled, setVimEnabled] = useState(() => {
    try {
      return localStorage.getItem("hippo.editor.vim") === "true";
    } catch {
      return false;
    }
  });

  const toggleVim = () => {
    const enabled = !vimEnabled;
    setVimEnabled(enabled);
    try {
      localStorage.setItem("hippo.editor.vim", String(enabled));
    } catch {
      // Vim still works for this session when preference storage is unavailable.
    }
    window.requestAnimationFrame(() => editorHandleRef.current?.focus());
  };
  const saveStatus =
    saveState === "saved"
      ? "All changes saved"
      : saveState === "saving"
        ? "Saving changes"
        : "Check save status";

  useEffect(() => {
    if (reading) return;
    const frame = window.requestAnimationFrame(() => editorHandleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [note.path, reading]);

  useEffect(() => {
    setTitle(displayName(note.path));
    setIsRenamingTitle(false);
  }, [note.path]);

  const startRenamingTitle = () => {
    setTitle(displayName(note.path));
    setIsRenamingTitle(true);
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  };

  const saveTitle = async () => {
    const nextTitle = title.trim();
    setIsRenamingTitle(false);
    if (!nextTitle || nextTitle === displayName(note.path)) {
      setTitle(displayName(note.path));
      return;
    }
    await onRename(nextTitle);
  };

  return (
    <>
      <div className="note-toolbar">
        <div className="note-path">
          <span className="path-label">{note.path}</span>
        </div>
        <div className="note-actions">
          <Button
            size="sm"
            variant={vimEnabled ? "secondary" : "ghost"}
            aria-label="Vim keybindings"
            aria-pressed={vimEnabled}
            disabled={reading}
            title={reading ? "Vim keybindings resume in Edit mode" : "Toggle Vim keybindings"}
            onClick={toggleVim}
          >
            Vim {vimEnabled ? "on" : "off"}
          </Button>
          <Tabs
            value={reading ? "read" : "edit"}
            onValueChange={(value) => onReadingChange(value === "read")}
          >
            <TabsList className="view-switch" aria-label="Note view">
              <TabsTrigger value="edit">
                <Pencil size={14} /> Edit
              </TabsTrigger>
              <TabsTrigger value="read">
                <BookOpen size={14} /> Read
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <IconButton label="Rename note" onClick={startRenamingTitle}>
            <Pencil size={15} />
          </IconButton>
          <IconButton className="danger-hover" label="Delete note" onClick={onDelete}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
      <section className="note-scroll-area">
        <article
          className={`note-document ${reading ? "note-reading" : "note-editing"}`}
          style={{ "--note-font-size": `${fontSize}px` } as CSSProperties}
        >
          <div className="note-heading-row">
            <FileText className="note-heading-icon" size={18} />
            <div className="note-title-container">
              <div className="note-kicker">MARKDOWN NOTE</div>
              {isRenamingTitle ? (
                <Input
                  ref={titleInputRef}
                  className="note-title-input"
                  aria-label="Note title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => void saveTitle()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      setTitle(displayName(note.path));
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <div className="note-title-row">
                  <h1>
                    <button
                      className="note-title-button"
                      type="button"
                      onClick={startRenamingTitle}
                    >
                      {displayName(note.path)}
                    </button>
                  </h1>
                  <IconButton
                    className="note-title-edit"
                    label="Rename note"
                    onClick={startRenamingTitle}
                  >
                    <Pencil size={13} />
                  </IconButton>
                </div>
              )}
            </div>
          </div>
          <div
            className="editor-surface"
            aria-label={`Edit ${displayName(note.path)} as Markdown`}
            onClick={() => !reading && editorHandleRef.current?.focus()}
          >
            <MarkdownEditor
              key={note.path}
              documentId={note.path}
              markdownSource={note.content}
              readOnly={reading}
              editorHandleRef={editorHandleRef}
              onMarkdownChange={onContentChange}
              vimEnabled={vimEnabled}
              onSave={onSave}
            />
          </div>
        </article>
      </section>
      <footer className="statusbar">
        <span>{reading ? "Reading view" : "Markdown"}</span>
        {vimEnabled && !reading && <span>Vim: i to type · Esc for commands</span>}
        <span>{note.content.split("\n").length} lines</span>
        <span>Text {fontSize}px</span>
        <span className="status-spacer" />
        <span>{saveStatus}</span>
        <span className="shortcut-hint">⌘ + / ⌘ − text size</span>
      </footer>
    </>
  );
}
