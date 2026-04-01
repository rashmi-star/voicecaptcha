import { useCallback, useEffect, useRef, useState } from "react";

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
  /** Kept in state for TTS + verify only — never rendered. */
  const [phrase, setPhrase] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingVc, setRecordingVc] = useState(false);
  const recordingVcRef = useRef(false);
  const [elevenLabsReady, setElevenLabsReady] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeRef = useRef<string>("audio/webm");

  const loadChallenge = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    setTtsPlaying(false);
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
  }, [api]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  useEffect(() => {
    fetch(`${api}/health`)
      .then((r) => r.json() as Promise<{ elevenlabs?: boolean }>)
      .then((d) => setElevenLabsReady(Boolean(d.elevenlabs)))
      .catch(() => setElevenLabsReady(false));
  }, [api]);

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
    } catch {
      setLine("Mic blocked");
      onRecordingStream?.(null);
    }
  };

  const stopVcAndVerify = async () => {
    recordingVcRef.current = false;
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

  const playElevenLabsTts = async (text: string) => {
    if (!text.trim() || !elevenLabsReady) return;
    setTtsError(null);
    setTtsPlaying(true);
    try {
      const res = await fetch(`${api}/tts-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        audioBase64?: string;
        mime?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.audioBase64) {
        setTtsError(data.error ?? "ElevenLabs TTS unavailable");
        setTtsPlaying(false);
        return;
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = "";
      }
      const mime = data.mime ?? "audio/mpeg";
      const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
      ttsAudioRef.current = audio;
      audio.onended = () => setTtsPlaying(false);
      audio.onerror = () => setTtsPlaying(false);
      await audio.play();
    } catch {
      setTtsPlaying(false);
      setTtsError("Playback failed");
    }
  };

  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, []);

  const challengeReady = Boolean(phrase && challengeId);

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
          {!elevenLabsReady ? (
            <p className="voice-captcha__warn">
              Add <code>ELEVENLABS_API_KEY</code> on the Worker to hear the phrase (nothing is shown on screen).
            </p>
          ) : null}
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
          <div className="voice-captcha__actions">
            <button
              type="button"
              className="btn-vc btn-vc--tts"
              onClick={() => void playElevenLabsTts(phrase)}
              disabled={busy || !challengeReady || !elevenLabsReady || ttsPlaying}
              title="Hear the challenge phrase"
            >
              {ttsPlaying ? "Playing…" : "Play phrase"}
            </button>
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

      {ttsError ? <p className="voice-captcha__tts-err">{ttsError}</p> : null}
    </div>
  );
}
