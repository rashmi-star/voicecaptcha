import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import EmbedApp from "./EmbedApp.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import { applyTheme, readStoredTheme } from "./lib/theme.ts";
import "./index.css";
import "./App.css";

applyTheme(readStoredTheme());

const path = window.location.pathname;
const isEmbed = path === "/embed" || path.endsWith("/embed/");
const isDemo = path === "/demo" || path.endsWith("/demo/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isEmbed ? <EmbedApp /> : isDemo ? <App /> : <LandingPage />}
  </StrictMode>
);
