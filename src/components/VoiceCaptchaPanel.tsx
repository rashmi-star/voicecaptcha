import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { countReadProgress, splitPhraseWords } from "@/lib/readAlongMatch";

type VerifyReason = "human_pass" | "wrong_sentence" | "bot_suspected";

type VerifyResult = {
  ok: boolean;
  reason?: VerifyReason;
  userMessage?: string;
  transcript?: string;
  error?: string;
  matchScore?: number;
  humanLikeness?: number;
};

export type VoiceCaptchaEmbedResult = {
  ok: boolean;
  reason?: VerifyReason;
  matchScore?: number;
  humanLikeness?: number;
};

export type VoiceCaptchaPanelProps = {
  onRecordingStream?: (stream: MediaStream | null) => void;
  /** Invisible reCAPTCHA: runs execute before mic. Return false to abort. */
  onPrepareRecord?: () => Promise<boolean>;
  /** Checkbox reCAPTCHA: Record stays disabled until the box is checked. */
  captchaRequired?: boolean;
  captchaSatisfied?: boolean;
  /** Called after server verify (for iframe embed / parent `postMessage`). */
  onVoiceCaptchaResult?: (result: VoiceCaptchaEmbedResult) => void;
  /** Base URL for API (e.g. `https://your-worker.workers.dev`). Empty = same-origin `/api`. */
  apiBaseUrl?: string;
  /** Tighter UI for iframe widget */
  embed?: boolean;
};

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mpeg",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function audioFilenameForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "phrase.m4a";
  if (mime.includes("mpeg")) return "phrase.mp3";
  if (mime.includes("webm")) return "phrase.webm";
  return "phrase.webm";
}

function apiPrefix(base: string | undefined): string {
  const b = (base ?? "").trim().replace(/\/$/, "");
  return b ? `${b}/api` : "/api";
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof C === "function" ? (C as new () => SpeechRecognition) : null;
}

export function VoiceCaptchaPanel({
  onRecordingStream,
  onPrepareRecord,
  captchaRequired = false,
  captchaSatisfied = true,
  onVoiceCaptchaResult,
  apiBaseUrl,
  embed = false,
}: VoiceCaptchaPanelProps) {
  const api = apiPrefix(apiBaseUrl);
  /** Challenge text for verify + on-screen copy. */
  const [phrase, setPhrase] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingVc, setRecordingVc] = useState(false);
  const recordingVcRef = useRef(false);
  const speechRecRef = useRef<SpeechRecognition | null>(null);
  const phraseWordsRef = useRef<string[]>([]);
  /** Words matched from live speech (Web Speech API) while recording. */
  const [readMatched, setReadMatched] = useState(0);
  const [readAlongAvailable, setReadAlongAvailable] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeRef = useRef<string>("audio/webm");

  const stopSpeechRecognition = useCallback(() => {
    const r = speechRecRef.current;
    speechRecRef.current = null;
    if (r) {
      r.onend = null;
      r.onresult = null;
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
      try {
        r.abort();
      } catch {
        /* */
      }
    }
    setReadMatched(0);
  }, []);

  useEffect(() => {
    setReadAlongAvailable(getSpeechRecognitionCtor() !== null);
  }, []);

  const loadChallenge = useCallback(() => {
    stopSpeechRecognition();
    setLine(null);
    setResult(null);
    fetch(`${api}/challenge`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ challengeId: string; phrase: string }>;
      })
      .then((d) => {
        setPhrase(d.phrase);
        setChallengeId(d.challengeId);
        setApiReady(true);
      })
      .catch(() => {
        setApiReady(false);
        setLine("Voice API offline");
      });
  }, [api, stopSpeechRecognition]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const startVcRecord = async () => {
    if (captchaRequired && !captchaSatisfied) {
      setLine("Complete CAPTCHA first");
      return;
    }
    if (onPrepareRecord) {
      const ok = await onPrepareRecord();
      if (!ok) {
        setLine(captchaRequired ? "Complete CAPTCHA first" : "reCAPTCHA failed—try again");
        return;
      }
    }
    setResult(null);
    setLine(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onRecordingStream?.(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      const mime = pickRecorderMime();
      recordingMimeRef.current = mime ?? "audio/webm";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      if (mr.mimeType) recordingMimeRef.current = mr.mimeType;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onRecordingStream?.(null);
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      recordingVcRef.current = true;
      setRecordingVc(true);

      const words = splitPhraseWords(phrase);
      phraseWordsRef.current = words;
      setReadMatched(0);

      const SR = getSpeechRecognitionCtor();
      if (SR && words.length > 0) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = navigator.language || "en-US";
        rec.onresult = (e: SpeechRecognitionEvent) => {
          let t = "";
          for (let i = 0; i < e.results.length; i++) {
            t += e.results[i][0].transcript;
          }
          const n = countReadProgress(phraseWordsRef.current, t);
          setReadMatched(n);
        };
        rec.onerror = () => {
          /* no-speech / aborted are common */
        };
        rec.onend = () => {
          if (recordingVcRef.current && speechRecRef.current === rec) {
            try {
              rec.start();
            } catch {
              /* */
            }
          }
        };
        speechRecRef.current = rec;
        try {
          rec.start();
        } catch {
          speechRecRef.current = null;
        }
      }
    } catch {
      setLine("Mic blocked");
      onRecordingStream?.(null);
    }
  };

  const stopVcAndVerify = async () => {
    recordingVcRef.current = false;
    stopSpeechRecognition();
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    setBusy(true);
    setResult(null);
    setLine("…");

    await new Promise<void>((resolve) => {
      mr.addEventListener("stop", () => resolve(), { once: true });
      mr.stop();
    });
    mediaRecorderRef.current = null;
    setRecordingVc(false);

    const mime = recordingMimeRef.current || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    const fd = new FormData();
    fd.append("challengeId", challengeId);
    fd.append("audio", blob, audioFilenameForMime(mime));

    try {
      const res = await fetch(`${api}/verify-voice`, { method: "POST", body: fd });
      const data = (await res.json()) as VerifyResult & {
        ok: boolean;
        error?: string;
      };
      setResult(data);
      if (!res.ok || data.error) {
        setLine(data.error ?? `${res.status}`);
        onVoiceCaptchaResult?.({ ok: false });
        return;
      }
      setLine(data.userMessage ?? (data.ok ? "OK" : "Try again"));
      onVoiceCaptchaResult?.({
        ok: Boolean(data.ok),
        reason: data.reason,
        matchScore: data.matchScore,
        humanLikeness: data.humanLikeness,
      });
    } catch {
      setLine("Network error");
      setResult({ ok: false, error: "fetch failed" });
      onVoiceCaptchaResult?.({ ok: false });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeechRecognition();
    };
  }, [stopSpeechRecognition]);

  const challengeReady = Boolean(phrase && challengeId);
  const phraseWords = useMemo(() => splitPhraseWords(phrase), [phrase]);
  const showReadAlong = recordingVc && readAlongAvailable && phraseWords.length > 0;

  return (
    <div
      className={
        embed ? "voice-captcha voice-captcha--minimal voice-captcha--embed" : "voice-captcha voice-captcha--minimal"
      }
    >
      {apiReady === false ? (
        <p className="voice-captcha__warn">{line}</p>
      ) : (
        <>
          {!challengeReady ? (
            <p className="voice-captcha__status" aria-live="polite">
              Loading…
            </p>
          ) : recordingVc ? (
            <p className="voice-captcha__status" aria-live="polite">
              Recording…
            </p>
          ) : null}
          {captchaRequired && !captchaSatisfied && !recordingVc ? (
            <p id="voice-captcha-record-gate" className="voice-captcha__hint">
              Check “I’m not a robot” on the left, then tap Record.
            </p>
          ) : null}
          {challengeReady && phrase ? (
            <div className="voice-captcha__phrase-block">
              <p className="voice-captcha__phrase-caption">Phrase to repeat</p>
              <p className="voice-captcha__phrase">
                {showReadAlong
                  ? phraseWords.map((w, i) => (
                      <span key={i}>
                        {i > 0 ? " " : null}
                        <span
                          className={cn(
                            "voice-captcha__word",
                            i < readMatched
                              ? "voice-captcha__word--done"
                              : i === readMatched
                                ? "voice-captcha__word--active"
                                : "voice-captcha__word--pending"
                          )}
                        >
                          {w}
                        </span>
                      </span>
                    ))
                  : phrase}
              </p>
              {recordingVc ? (
                <p className="voice-captcha__read-hint">
                  {readAlongAvailable
                    ? "Words highlight as you speak."
                    : "Read-along needs Web Speech (Chrome or Edge)."}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="voice-captcha__actions">
            <button
              type="button"
              className="btn-vc"
              onClick={() => void startVcRecord()}
              disabled={
                busy || recordingVc || !challengeReady || (captchaRequired && !captchaSatisfied)
              }
              aria-describedby={
                captchaRequired && !captchaSatisfied ? "voice-captcha-record-gate" : undefined
              }
            >
              Record
            </button>
            <button
              type="button"
              className="btn-vc btn-vc--primary"
              onClick={() => void stopVcAndVerify()}
              disabled={busy || !recordingVc}
            >
              Check
            </button>
            <button
              type="button"
              className="btn-vc btn-vc--icon"
              onClick={loadChallenge}
              disabled={busy}
              title="New phrase"
            >
              ↻
            </button>
          </div>
        </>
      )}

      {line && line !== "…" ? (
        <p
          className={
            result?.reason === "human_pass"
              ? "voice-captcha__line voice-captcha__line--pass"
              : result?.reason === "wrong_sentence"
                ? "voice-captcha__line voice-captcha__line--wrong"
                : result?.reason === "bot_suspected"
                  ? "voice-captcha__line voice-captcha__line--bot"
                  : "voice-captcha__line"
          }
        >
          {line}
        </p>
      ) : line === "…" ? (
        <p className="voice-captcha__line voice-captcha__line--pending">…</p>
      ) : null}
    </div>
  );
}
