import { Box } from "@mui/material";
import { openPath } from "@tauri-apps/plugin-opener";
import { type PropsWithChildren, useCallback } from "react";
import { Sidebar } from "../Sidebar";
import "./styles.css";

type DashboardProps = PropsWithChildren<{
  sidebarOpen: boolean;
  vaultPath: string | null;
  onError: (error: unknown) => void;
}>;

export function Dashboard({ children, sidebarOpen, vaultPath, onError }: DashboardProps) {
  const revealVault = useCallback(async () => {
    if (!vaultPath) return;
    try {
      await openPath(vaultPath);
    } catch (error) {
      onError(error);
    }
  }, [onError, vaultPath]);

  return (
    <Box className={`app-frame ${sidebarOpen ? "app-frame-sidebar-open" : ""}`}>
      <Sidebar open={sidebarOpen} vaultPath={vaultPath} onRevealVault={() => void revealVault()} />
      <Box className="main-panel" component="main">
        {children}
      </Box>
    </Box>
  );
}
