import React from "react";
import ReactDOM from "react-dom/client";
import { StyledEngineProvider } from "@mui/material/styles";
import { AppTheme } from "@/components/AppTheme";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider enableCssLayer>
      <AppTheme>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </AppTheme>
    </StyledEngineProvider>
  </React.StrictMode>,
);
