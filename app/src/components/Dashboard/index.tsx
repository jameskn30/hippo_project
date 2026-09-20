import { Box } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { type PropsWithChildren, useCallback } from "react";
import { Sidebar } from "../Sidebar";
import type { VaultEntry } from "@/lib/vault/types";
import "./styles.css";

type DashboardProps = PropsWithChildren<{
  sidebarOpen: boolean;
  vaultPath: string | null;
  vaultEntries: VaultEntry[];
  selectedPath: string | null;
  onOpenNote: (path: string) => void;
  onError: (error: unknown) => void;
}>;

export function Dashboard({
  children,
  sidebarOpen,
  vaultPath,
  vaultEntries,
  selectedPath,
  onOpenNote,
  onError,
}: DashboardProps) {
  const revealVault = useCallback(async () => {
    if (!vaultPath) return;
    try {
      await invoke("reveal_vault");
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
        onRevealVault={() => void revealVault()}
      />
      <Box className="main-panel" component="main">
        {children}
      </Box>
    </Box>
  );
}
