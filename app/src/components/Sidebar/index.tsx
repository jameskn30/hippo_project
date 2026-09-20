import {
  Avatar,
  Box,
  Divider,
  Drawer,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { Clock3, FileText, Search } from "lucide-react";
import "./styles.css";

type SidebarProps = {
  open: boolean;
};

export function Sidebar({ open }: SidebarProps) {
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
          <TextField
            className="sidebar-search"
            fullWidth
            placeholder="Search notes"
            size="small"
            slotProps={{
              htmlInput: { readOnly: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </section>

        <List className="sidebar-navigation" disablePadding aria-label="Note views">
          <ListItem className="sidebar-navigation-item sidebar-navigation-item-selected">
            <ListItemIcon>
              <FileText size={17} />
            </ListItemIcon>
            <ListItemText primary="All notes" />
          </ListItem>
          <ListItem className="sidebar-navigation-item">
            <ListItemIcon>
              <Clock3 size={17} />
            </ListItemIcon>
            <ListItemText primary="Recent" />
          </ListItem>
        </List>

        <Box className="sidebar-footer">
          <Divider />
          <Typography className="sidebar-footer-copy" variant="caption">
            Markdown files stay on this device.
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
