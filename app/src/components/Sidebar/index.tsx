import { Avatar, Box, Button, ButtonGroup, Divider, Drawer, Typography } from "@mui/material";
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

        <Divider />

        <section className="sidebar-section" aria-labelledby="sidebar-notes-heading">
          <Typography className="sidebar-section-title" component="h2" id="sidebar-notes-heading">
            Notes
          </Typography>
          <VaultTree entries={vaultEntries} selectedPath={selectedPath} onOpenNote={onOpenNote} />
        </section>

        <Box className="sidebar-footer">
          <Divider />
          <ButtonGroup
            className="sidebar-actions"
            disabled={!vaultPath}
            fullWidth
            orientation="vertical"
            variant="outlined"
          >
            <Button onClick={onRevealVault} size="small" startIcon={<FolderOpen size={15} />}>
              Reveal in Finder
            </Button>
            <Button onClick={onCreateNote} size="small" startIcon={<FilePlus2 size={15} />}>
              New note
            </Button>
            <Button onClick={onCreateFolder} size="small" startIcon={<FolderPlus size={15} />}>
              New folder
            </Button>
          </ButtonGroup>
          <Typography className="sidebar-footer-copy" variant="caption">
            {vaultPath ?? "Choose a vault to browse its files."}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
