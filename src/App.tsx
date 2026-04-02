import { useEffect, useState } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { VoiceCaptchaPanel } from "./components/VoiceCaptchaPanel";
import { ORB_CLASS_NAMES, useMicVisualizer } from "./hooks/useMicVisualizer";
import { applyTheme, type Theme } from "./lib/theme";

function readThemeFromDom(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readThemeFromDom);
  const { stageRef, orbRefs, handleVoiceCaptchaStream } = useMicVisualizer();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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
          <div className="demo-shell">
            <section className="panel panel--demo" aria-label="Voice CAPTCHA">
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
