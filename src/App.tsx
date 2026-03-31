import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { VoiceCaptchaPanel } from "./components/VoiceCaptchaPanel";

const ORB_CLASSES = ["orb orb-1", "orb orb-2", "orb orb-3", "orb orb-4"];

/** Official Google test key (v2) — always passes; use only for local dev. */
const RECAPTCHA_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const recaptchaSiteKey =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ||
  RECAPTCHA_TEST_SITE_KEY;

const recaptchaInvisible =
  (import.meta.env.VITE_RECAPTCHA_SIZE as string | undefined)?.trim().toLowerCase() ===
  "invisible";

type Theme = "light" | "dark";

function readThemeFromDom(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readThemeFromDom);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(
    null
  );
  const animationRef = useRef<number>(0);
  const splitShellRef = useRef<HTMLDivElement>(null);
  const streamSetupGenRef = useRef(0);
  const [splitLeftPct, setSplitLeftPct] = useState(42);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("voicecaptcha-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const disconnectNodes = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopVisualizerLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    orbRefs.current.forEach((orb) => {
      if (orb) orb.style.transform = "";
    });
    stageRef.current?.classList.remove("active");
  }, []);

  const runVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    stageRef.current?.classList.add("active");
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const time = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      animationRef.current = requestAnimationFrame(tick);
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      const n = Math.min(freq.length, 64);
      for (let i = 0; i < n; i++) sum += freq[i];
      const avg = sum / n / 255;
      const boost = 0.35 + avg * 1.4;

      analyser.getByteTimeDomainData(time);
      let peak = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      const pulse = 0.92 + peak * 0.35;

      const t = performance.now() * 0.001;
      orbRefs.current.forEach((orb, i) => {
        if (!orb) return;
        const phase = i * 0.9;
        const wobble = Math.sin(t * 2 + phase) * 0.04 * boost;
        const scale = (1 + wobble) * boost * pulse;
        const rot = Math.sin(t * 1.5 + phase) * 3 * boost;
        orb.style.transform = `translate(${Math.sin(t + phase) * 6 * boost}%, ${Math.cos(t * 0.8 + phase) * 5 * boost}%) scale(${scale}) rotate(${rot}deg)`;
        orb.style.opacity = String(0.65 + avg * 0.35);
      });
    };
    tick();
  }, []);

  const handleVoiceCaptchaStream = useCallback(
    (stream: MediaStream | null) => {
      streamSetupGenRef.current += 1;
      const gen = streamSetupGenRef.current;
      disconnectNodes();
      stopVisualizerLoop();
      if (!stream) return;

      void (async () => {
        await ensureAudioContext();
        if (gen !== streamSetupGenRef.current) return;
        const ctx = audioContextRef.current;
        if (!ctx) return;

        disconnectNodes();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;
        sourceRef.current = source;
        if (gen !== streamSetupGenRef.current) return;
        runVisualizer();
      })();
    },
    [disconnectNodes, ensureAudioContext, runVisualizer, stopVisualizerLoop]
  );

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

  useEffect(() => {
    return () => {
      disconnectNodes();
      stopVisualizerLoop();
    };
  }, [disconnectNodes, stopVisualizerLoop]);

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
              {ORB_CLASSES.map((cls, i) => (
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
          />
        </section>
      </div>
      </div>
    </div>
  );
}
