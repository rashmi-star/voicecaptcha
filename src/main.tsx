import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import EmbedApp from "./EmbedApp.tsx";
import "./App.css";

function initTheme(): void {
  try {
    const stored = localStorage.getItem("voicecaptcha-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
      return;
    }
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.theme = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

initTheme();

const path = window.location.pathname;
const isEmbed = path === "/embed" || path.endsWith("/embed/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isEmbed ? <EmbedApp /> : <App />}</StrictMode>
);
