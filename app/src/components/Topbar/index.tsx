import { AppBar, Box, Chip, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./styles.css";
import { displayName } from "../shared/note-utils";
import type { NoteState, SaveState } from "../shared/types";

type TopbarProps = {
  vaultPath: string | null;
  note: NoteState | null;
  saveState: SaveState;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
};

export function Topbar({ vaultPath, note, saveState, sidebarOpen, onSidebarToggle }: TopbarProps) {
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
        </Box>
      </Toolbar>
    </AppBar>
  );
}
