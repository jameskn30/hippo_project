import { Box } from "@mui/material";
import { openPath } from "@tauri-apps/plugin-opener";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type PropsWithChildren, useCallback, useMemo } from "react";
import { Sidebar } from "../Sidebar";
import type { VaultEntry } from "@/lib/vault/types";
import { buildVaultTree, findVaultTreeItem } from "./vault-tree";
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
      await openPath(vaultPath);
    } catch (error) {
      onError(error);
    }
  }, [onError, vaultPath]);

  const vaultItems = useMemo(() => buildVaultTree(vaultEntries), [vaultEntries]);
  const vaultTree = vaultItems.length ? (
    <RichTreeView
      className="vault-tree"
      defaultExpandedItems={vaultItems.filter((item) => item.isDirectory).map((item) => item.id)}
      items={vaultItems}
      itemChildrenIndentation={16}
      onItemClick={(_, itemId) => {
        const item = findVaultTreeItem(vaultItems, itemId);
        if (item && !item.isDirectory) onOpenNote(item.id);
      }}
      selectedItems={selectedPath ?? null}
      slots={{ collapseIcon: ChevronDown, expandIcon: ChevronRight }}
    />
  ) : (
    <p className="vault-tree-empty">No Markdown notes in this vault.</p>
  );

  return (
    <Box className={`app-frame ${sidebarOpen ? "app-frame-sidebar-open" : ""}`}>
      <Sidebar
        open={sidebarOpen}
        vaultPath={vaultPath}
        tree={vaultTree}
        onRevealVault={() => void revealVault()}
      />
      <Box className="main-panel" component="main">
        {children}
      </Box>
    </Box>
  );
}
