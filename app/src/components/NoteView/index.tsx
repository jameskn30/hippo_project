import type { AtomicCodeMirrorEditorHandle } from "@atomic-editor/editor";
import { AtomicCodeMirrorEditor } from "@atomic-editor/editor";
import { BookOpen, FileText, Pencil, Trash2 } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/IconButton";
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
}: NoteViewProps) {
  const editorHandleRef = useRef<AtomicCodeMirrorEditorHandle | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [title, setTitle] = useState(() => displayName(note.path));
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
            <AtomicCodeMirrorEditor
              documentId={note.path}
              markdownSource={note.content}
              readOnly={reading}
              editorHandleRef={editorHandleRef}
              onMarkdownChange={onContentChange}
            />
          </div>
        </article>
      </section>
      <footer className="statusbar">
        <span>{reading ? "Reading view" : "Markdown"}</span>
        <span>{note.content.split("\n").length} lines</span>
        <span>Text {fontSize}px</span>
        <span className="status-spacer" />
        <span>{saveStatus}</span>
        <span className="shortcut-hint">⌘ + / ⌘ − text size</span>
      </footer>
    </>
  );
}
