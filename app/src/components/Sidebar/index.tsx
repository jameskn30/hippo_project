import { Avatar, Box, Button, Divider, Drawer, Typography } from "@mui/material";
import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import "./styles.css";

type SidebarProps = {
  open: boolean;
  vaultPath: string | null;
  tree: ReactNode;
  onRevealVault: () => void;
};

export function Sidebar({ open, vaultPath, tree, onRevealVault }: SidebarProps) {
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
          {tree}
        </section>

        <Box className="sidebar-footer">
          <Divider />
          <Button
            className="sidebar-reveal-vault"
            disabled={!vaultPath}
            fullWidth
            onClick={onRevealVault}
            size="small"
            startIcon={<FolderOpen size={15} />}
            variant="outlined"
          >
            Reveal vault
          </Button>
          <Typography className="sidebar-footer-copy" variant="caption">
            {vaultPath ?? "Choose a vault to browse its files."}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
