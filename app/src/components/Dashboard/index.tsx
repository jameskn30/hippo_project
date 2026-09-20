import { Box } from "@mui/material";
import type { PropsWithChildren } from "react";
import { Sidebar } from "../Sidebar";
import "./styles.css";

type DashboardProps = PropsWithChildren<{
  sidebarOpen: boolean;
}>;

export function Dashboard({ children, sidebarOpen }: DashboardProps) {
  return (
    <Box className={`app-frame ${sidebarOpen ? "app-frame-sidebar-open" : ""}`}>
      <Sidebar open={sidebarOpen} />
      <Box className="main-panel" component="main">
        {children}
      </Box>
    </Box>
  );
}
