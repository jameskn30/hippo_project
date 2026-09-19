import type { CSSProperties } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, FileText, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconButton } from "@/components/IconButton";
import { displayName } from "../shared/note-utils";
import type { NoteState, SaveState } from "../shared/types";

type NoteViewProps = {
  note: NoteState;
  reading: boolean;
  fontSize: number;
  saveState: SaveState;
  onReadingChange: (reading: boolean) => void;
  onContentChange: (content: string) => void;
  onRename: () => void;
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
  const saveStatus = saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving changes" : "Check save status";

  return (
    <>
      <div className="note-toolbar">
        <div className="note-path"><span className="path-label">{note.path}</span></div>
        <div className="note-actions">
          <Tabs value={reading ? "read" : "edit"} onValueChange={(value) => onReadingChange(value === "read")}>
            <TabsList className="view-switch" aria-label="Note view">
              <TabsTrigger value="edit"><Pencil size={14} /> Edit</TabsTrigger>
              <TabsTrigger value="read"><BookOpen size={14} /> Read</TabsTrigger>
            </TabsList>
          </Tabs>
          <IconButton label="Rename note" onClick={onRename}><Pencil size={15} /></IconButton>
          <IconButton className="danger-hover" label="Delete note" onClick={onDelete}><Trash2 size={15} /></IconButton>
        </div>
      </div>
      <section className="note-scroll-area">
        <article className={`note-document ${reading ? "note-reading" : "note-editing"}`} style={{ "--note-font-size": `${fontSize}px` } as CSSProperties}>
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
                onChange={onContentChange}
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
        <span>Text {fontSize}px</span>
        <span className="status-spacer" />
        <span>{saveStatus}</span>
        <span className="shortcut-hint">⌘ + / ⌘ − text size</span>
      </footer>
    </>
  );
}
