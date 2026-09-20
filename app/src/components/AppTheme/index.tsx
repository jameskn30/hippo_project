import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PropsWithChildren } from "react";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#000000" },
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#09090b", secondary: "#71717a" },
    divider: "#e4e4e7",
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
    fontSize: 16,
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export function AppTheme({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
