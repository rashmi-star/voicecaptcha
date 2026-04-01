import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { SiteHeader } from "./components/SiteHeader";
import { VoiceCaptchaPanel } from "./components/VoiceCaptchaPanel";
import { ORB_CLASS_NAMES, useMicVisualizer } from "./hooks/useMicVisualizer";
import { applyTheme, type Theme } from "./lib/theme";

/** Official Google v2 test key — only used when `VITE_RECAPTCHA_SITE_KEY` is unset in dev. */
const RECAPTCHA_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const envSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim();
const recaptchaSiteKey =
  envSiteKey ||
  (import.meta.env.DEV ? RECAPTCHA_TEST_SITE_KEY : "");

const recaptchaInvisible =
  (import.meta.env.VITE_RECAPTCHA_SIZE as string | undefined)?.trim().toLowerCase() ===
  "invisible";

function readThemeFromDom(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readThemeFromDom);
  const [, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const splitShellRef = useRef<HTMLDivElement>(null);
  const [splitLeftPct, setSplitLeftPct] = useState(42);
  const { stageRef, orbRefs, handleVoiceCaptchaStream } = useMicVisualizer();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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
    <div className="theme flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        active="demo"
      />

      <div className="app app--with-site-header">
        <h1 className="sr-only">Voice captcha</h1>

        <div className="app__content app__content--demo">
      <div
        className="split-shell"
        ref={splitShellRef}
        style={{ "--split-left": `${splitLeftPct}%` } as React.CSSProperties}
      >
        <section className="panel panel--left" aria-label="Classic CAPTCHA">
          <div className="demo-panel-stack">
            <h2 className="demo-panel-heading">Classic CAPTCHA</h2>
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

        <section className="panel panel--right" aria-label="Voice CAPTCHA">
          <div className="demo-panel-stack">
            <h2 className="demo-panel-heading">Voice CAPTCHA</h2>
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
              captchaRequired={false}
              captchaSatisfied={true}
              apiBaseUrl={
                (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || undefined
              }
            />
          </div>
        </section>
      </div>
        </div>
      </div>
    </div>
  );
}
