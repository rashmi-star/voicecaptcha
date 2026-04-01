export type Theme = "light" | "dark";

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("voicecaptcha-theme", theme);
  } catch {
    /* ignore */
  }
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("voicecaptcha-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
