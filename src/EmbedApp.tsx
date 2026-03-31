import { useCallback, useEffect, useState } from "react";
import {
  VoiceCaptchaPanel,
  type VoiceCaptchaEmbedResult,
} from "./components/VoiceCaptchaPanel";

const params = new URLSearchParams(window.location.search);
const parentOrigin = params.get("parent_origin") || "*";
const apiBaseUrl = params.get("api_base")?.trim() || "";

function targetOrigin(): string {
  return parentOrigin === "*" ? "*" : parentOrigin;
}

function postResult(result: VoiceCaptchaEmbedResult) {
  try {
    window.parent.postMessage(
      { type: "voicecaptcha", version: 1, ...result },
      targetOrigin()
    );
  } catch {
    /* ignore */
  }
}

export default function EmbedApp() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("voicecaptcha-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const onResult = useCallback((result: VoiceCaptchaEmbedResult) => {
    postResult(result);
  }, []);

  useEffect(() => {
    try {
      window.parent.postMessage(
        { type: "voicecaptcha", version: 1, event: "ready" },
        targetOrigin()
      );
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="embed-root">
      <div className="embed-chrome">
        <span className="embed-brand">Voice CAPTCHA</span>
        <button
          type="button"
          className="theme-toggle embed-theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <svg className="theme-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z"
              />
            </svg>
          )}
        </button>
      </div>

      <p className="embed-hint">
        Add your own bot checks (e.g. reCAPTCHA) on this page; this widget verifies the spoken phrase.
      </p>

      <VoiceCaptchaPanel
        captchaRequired={false}
        embed
        apiBaseUrl={apiBaseUrl || undefined}
        onVoiceCaptchaResult={onResult}
      />
    </div>
  );
}
