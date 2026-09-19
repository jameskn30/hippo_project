import { Check, FilePlus2, FolderOpen, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/IconButton";
import "./styles.css";
import { displayName } from "../shared/note-utils";
import type { NoteState, SaveState } from "../shared/types";

type TopbarProps = {
  vaultPath: string | null;
  note: NoteState | null;
  saveState: SaveState;
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  onChooseVault: () => void;
  onCreateNote: () => void;
};

export function Topbar({
  vaultPath,
  note,
  saveState,
  sidebarOpen,
  onShowSidebar,
  onChooseVault,
  onCreateNote,
}: TopbarProps) {
  const saveLabel = saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save issue";

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        {!sidebarOpen && <IconButton label="Show sidebar" onClick={onShowSidebar}><Menu size={17} /></IconButton>}
        <span className="crumb-muted">{vaultPath ? displayName(vaultPath) : "Hippo"}</span>
        {note && <><span className="crumb-divider">/</span><span className="crumb-current">{displayName(note.path)}</span></>}
      </div>
      <div className="topbar-actions">
        {note && <span className={`save-indicator ${saveState === "error" ? "save-error" : ""}`}>
          {saveState === "saved" && <Check size={13} />} {saveLabel}
        </span>}
        <Button className="button-secondary" variant="outline" size="sm" onClick={onChooseVault}><FolderOpen size={15} /> Open vault</Button>
        <Button className="button-primary" size="sm" onClick={onCreateNote} disabled={!vaultPath}><FilePlus2 size={15} /> New document</Button>
      </div>
    </header>
  );
}
