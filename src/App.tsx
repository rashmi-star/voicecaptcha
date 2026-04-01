import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { VoiceCaptchaPanel } from "./components/VoiceCaptchaPanel";
import { ORB_CLASS_NAMES, useMicVisualizer } from "./hooks/useMicVisualizer";
import { applyTheme, type Theme } from "./lib/theme";

/** Official Google test key (v2) — always passes; use only for local dev. */
const RECAPTCHA_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const recaptchaSiteKey =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ||
  RECAPTCHA_TEST_SITE_KEY;

const recaptchaInvisible =
  (import.meta.env.VITE_RECAPTCHA_SIZE as string | undefined)?.trim().toLowerCase() ===
  "invisible";

function readThemeFromDom(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readThemeFromDom);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const splitShellRef = useRef<HTMLDivElement>(null);
  const [splitLeftPct, setSplitLeftPct] = useState(42);
  const { stageRef, orbRefs, handleVoiceCaptchaStream } = useMicVisualizer();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const prepareVoiceRecord = useCallback(async (): Promise<boolean> => {
    if (recaptchaInvisible) {
      const widget = recaptchaRef.current;
      if (!widget) return false;
      try {
        const token = await widget.executeAsync();
        if (!token) return false;
        setCaptchaToken(token);
        return true;
      } catch {
        recaptchaRef.current?.reset();
        return false;
      }
    }
    return Boolean(captchaToken);
  }, [captchaToken]);

  const handleDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const divider = e.currentTarget;
    const shell = splitShellRef.current;
    if (!shell) return;
    divider.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const r = shell.getBoundingClientRect();
      const pct = ((ev.clientX - r.left) / r.width) * 100;
      setSplitLeftPct(Math.min(68, Math.max(24, pct)));
    };

    const onUp = (ev: PointerEvent) => {
      divider.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="app">
      <h1 className="sr-only">Voice captcha</h1>

      <div className="app__content">
      <div className="app__topbar">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <svg
              className="theme-toggle__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
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

      <div
        className="split-shell"
        ref={splitShellRef}
        style={{ "--split-left": `${splitLeftPct}%` } as React.CSSProperties}
      >
        <section className="panel panel--left" aria-label="Verification">
          <div className="panel-left-center">
            <div
              className={
                recaptchaInvisible ? "recaptcha-wrap recaptcha-wrap--invisible" : "recaptcha-wrap"
              }
            >
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                size={recaptchaInvisible ? "invisible" : "normal"}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => {
                  setCaptchaToken(null);
                }}
                onErrored={() => {
                  setCaptchaToken(null);
                }}
              />
            </div>
          </div>
        </section>

        <div
          className="split-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          tabIndex={0}
          onPointerDown={handleDividerPointerDown}
        />

        <section className="panel panel--right" aria-label="Audio">
          <div className="stage" ref={stageRef} aria-hidden="true">
            <div className="orb-wrap">
              {ORB_CLASS_NAMES.map((cls, i) => (
                <div
                  key={cls}
                  className={cls}
                  ref={(el) => {
                    orbRefs.current[i] = el;
                  }}
                />
              ))}
            </div>
          </div>

          <VoiceCaptchaPanel
            onRecordingStream={handleVoiceCaptchaStream}
            onPrepareRecord={prepareVoiceRecord}
            captchaRequired={!recaptchaInvisible}
            captchaSatisfied={!!captchaToken}
            apiBaseUrl={
              (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || undefined
            }
          />
        </section>
      </div>
      </div>
    </div>
  );
}
