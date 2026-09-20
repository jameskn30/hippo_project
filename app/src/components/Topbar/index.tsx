import { AppBar, Box, Button, Chip, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import { FilePlus2, FolderOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./styles.css";
import { displayName } from "../shared/note-utils";
import type { NoteState, SaveState } from "../shared/types";

type TopbarProps = {
  vaultPath: string | null;
  note: NoteState | null;
  saveState: SaveState;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  onChooseVault: () => void;
  onCreateNote: () => void;
};

export function Topbar({
  vaultPath,
  note,
  saveState,
  sidebarOpen,
  onSidebarToggle,
  onChooseVault,
  onCreateNote,
}: TopbarProps) {
  const saveLabel =
    saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save issue";

  return (
    <AppBar className="topbar" color="transparent" elevation={0} position="static">
      <Toolbar className="topbar-toolbar">
        <Box className="breadcrumbs">
          <Tooltip title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
            <IconButton
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              className="topbar-sidebar-toggle"
              onClick={onSidebarToggle}
              size="small"
            >
              {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </IconButton>
          </Tooltip>
          <Typography className="crumb-muted" component="span">
            {vaultPath ? displayName(vaultPath) : "Hippo"}
          </Typography>
          {note && (
            <>
              <span className="crumb-divider">/</span>
              <Typography className="crumb-current" component="span">
                {displayName(note.path)}
              </Typography>
            </>
          )}
        </Box>
        <Box className="topbar-actions">
          {note && (
            <Chip
              className="save-indicator"
              color={saveState === "error" ? "error" : "default"}
              label={saveLabel}
              size="small"
              variant="outlined"
            />
          )}
          <Button
            onClick={onChooseVault}
            size="small"
            startIcon={<FolderOpen size={16} />}
            variant="outlined"
          >
            Open vault
          </Button>
          <Button
            disabled={!vaultPath}
            onClick={onCreateNote}
            size="small"
            startIcon={<FilePlus2 size={16} />}
            variant="contained"
          >
            New document
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
