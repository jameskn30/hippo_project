import { Avatar, Box, Divider, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
import { FilePlus2, FolderOpen, FolderPlus } from "lucide-react";
import type { VaultEntry } from "@/lib/vault/types";
import { VaultTree } from "./VaultTree";
import "./styles.css";

type SidebarProps = {
  open: boolean;
  vaultPath: string | null;
  vaultEntries: VaultEntry[];
  selectedPath: string | null;
  onRevealVault: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onOpenNote: (path: string) => void;
  onRenameEntry: (path: string, isDirectory: boolean, title: string) => Promise<void>;
};

export function Sidebar({
  open,
  vaultPath,
  vaultEntries,
  selectedPath,
  onRevealVault,
  onCreateNote,
  onCreateFolder,
  onOpenNote,
  onRenameEntry,
}: SidebarProps) {
  return (
    <Drawer
      anchor="left"
      className={`sidebar ${open ? "sidebar-open" : "sidebar-closed"}`}
      open={open}
      slotProps={{ paper: { className: "sidebar-paper" } }}
      variant="persistent"
    >
      <Box className="sidebar-content" component="aside" aria-label="Sidebar">
        <Box className="sidebar-header">
          <Avatar className="sidebar-logo" variant="rounded">
            H
          </Avatar>
          <Box>
            <Typography className="sidebar-brand" component="span">
              Hippo
            </Typography>
            <Typography className="sidebar-subtitle" component="span">
              Local workspace
            </Typography>
          </Box>
        </Box>

        <section className="sidebar-section" aria-labelledby="sidebar-notes-heading">
          <Box className="sidebar-tree-header">
            <Typography className="sidebar-section-title" component="h2" id="sidebar-notes-heading">
              Notes
            </Typography>

            <Box className="sidebar-action-group">
              <Tooltip title="Reveal in Finder">
                <span>
                  <IconButton
                    aria-label="Reveal vault in Finder"
                    disabled={!vaultPath}
                    onClick={onRevealVault}
                    size="small"
                  >
                    <FolderOpen size={15} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="New note">
                <span>
                  <IconButton
                    aria-label="Create note"
                    disabled={!vaultPath}
                    onClick={onCreateNote}
                    size="small"
                  >
                    <FilePlus2 size={15} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="New folder">
                <span>
                  <IconButton
                    aria-label="Create folder"
                    disabled={!vaultPath}
                    onClick={onCreateFolder}
                    size="small"
                  >
                    <FolderPlus size={15} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <VaultTree
            entries={vaultEntries}
            selectedPath={selectedPath}
            onOpenNote={onOpenNote}
            onRenameEntry={onRenameEntry}
          />
        </section>

        <Box className="sidebar-footer">
          <Divider />
          <Typography className="sidebar-footer-copy" variant="caption">
            {vaultPath ?? "Choose a vault to browse its files."}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
