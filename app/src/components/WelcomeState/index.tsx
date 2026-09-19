import { BookOpen, FilePlus2, FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type WelcomeStateProps = {
  vaultPath: string | null;
  onChooseVault: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
};

export function WelcomeState({ vaultPath, onChooseVault, onCreateNote, onCreateFolder }: WelcomeStateProps) {
  return (
    <section className="welcome-state">
      <div className="welcome-emblem"><BookOpen size={27} strokeWidth={1.6} /></div>
      <div className="welcome-eyebrow">A QUIETER PLACE TO THINK</div>
      <h1>{vaultPath ? "Your notes, in one place." : "Make room for your ideas."}</h1>
      <p>{vaultPath ? "Choose a note from the sidebar, or start a new one." : "Open a local folder as your vault. Your Markdown stays on your device."}</p>
      <div className="welcome-buttons">
        {vaultPath ? <Button className="button-primary" onClick={onCreateNote}><FilePlus2 size={15} /> Create a note</Button> : <Button className="button-primary" onClick={onChooseVault}><FolderOpen size={15} /> Open a vault</Button>}
        {vaultPath && <Button className="button-secondary" variant="outline" onClick={onCreateFolder}><FolderPlus size={15} /> New folder</Button>}
      </div>
      <div className="welcome-footnote">Local-first by design <span>·</span> Plain Markdown files</div>
    </section>
  );
}
