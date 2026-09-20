import { Box } from "@mui/material";
import { type PropsWithChildren, useCallback } from "react";
import { Sidebar } from "../Sidebar";
import type { VaultEntry } from "@/lib/vault/types";
import { revealVault as revealFilesystemVault } from "@/lib/filesystem";
import "./styles.css";

type DashboardProps = PropsWithChildren<{
  sidebarOpen: boolean;
  vaultPath: string | null;
  vaultEntries: VaultEntry[];
  selectedPath: string | null;
  onOpenNote: (path: string) => void;
  onRenameEntry: (path: string, isDirectory: boolean, title: string) => Promise<void>;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onError: (error: unknown) => void;
}>;

export function Dashboard({
  children,
  sidebarOpen,
  vaultPath,
  vaultEntries,
  selectedPath,
  onOpenNote,
  onRenameEntry,
  onCreateNote,
  onCreateFolder,
  onError,
}: DashboardProps) {
  const revealVault = useCallback(async () => {
    if (!vaultPath) return;
    try {
      await revealFilesystemVault();
    } catch (error) {
      onError(error);
    }
  }, [onError, vaultPath]);

  return (
    <Box className={`app-frame ${sidebarOpen ? "app-frame-sidebar-open" : ""}`}>
      <Sidebar
        open={sidebarOpen}
        vaultPath={vaultPath}
        vaultEntries={vaultEntries}
        selectedPath={selectedPath}
        onOpenNote={onOpenNote}
        onRenameEntry={onRenameEntry}
        onCreateNote={onCreateNote}
        onCreateFolder={onCreateFolder}
        onRevealVault={() => void revealVault()}
      />
      <Box className="main-panel" component="main">
        {children}
      </Box>
    </Box>
  );
}
