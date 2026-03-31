import { useCallback, useEffect, useRef, useState } from "react";

type VerifyReason = "human_pass" | "wrong_sentence" | "bot_suspected";

type VerifyResult = {
  ok: boolean;
  reason?: VerifyReason;
  userMessage?: string;
  transcript?: string;
  error?: string;
  /** Server echoes phrase for ElevenLabs TTS on pass */
  ttsPhraseOnPass?: string;
  matchScore?: number;
  humanLikeness?: number;
};

export type VoiceCaptchaEmbedResult = {
  ok: boolean;
  reason?: VerifyReason;
  matchScore?: number;
  humanLikeness?: number;
};

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function tokenizePhrase(phrase: string): string[] {
  return phrase.split(/\s+/).map(normalizeToken).filter(Boolean);
}

function transcriptToTokens(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

/** How many words fully matched; which word is active (partial or next). */
function computeHighlight(
  expected: string[],
  spoken: string[]
): { doneCount: number; activeIndex: number | null } {
  if (expected.length === 0) return { doneCount: 0, activeIndex: null };
  let i = 0;
  while (i < expected.length && i < spoken.length && spoken[i] === expected[i]) {
    i++;
  }
  const doneCount = i;
  if (doneCount >= expected.length) return { doneCount: expected.length, activeIndex: null };
  if (i < spoken.length) {
    const p = spoken[i];
    const e = expected[i];
    if (p && e.startsWith(p)) return { doneCount, activeIndex: i };
  }
  if (spoken.length === 0) return { doneCount: 0, activeIndex: null };
  return { doneCount, activeIndex: doneCount };
}

/** Web Speech API (Chrome/Edge); not in all TS DOM libs */
type SpeechRecognitionResultEv = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly 0: { readonly transcript: string };
    };
  };
};

type SpeechRecognitionHandle = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionResultEv) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionHandle) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionHandle;
    webkitSpeechRecognition?: new () => SpeechRecognitionHandle;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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
  const [phrase, setPhrase] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingVc, setRecordingVc] = useState(false);
  const recordingVcRef = useRef(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [elevenLabsReady, setElevenLabsReady] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeRef = useRef<string>("audio/webm");
  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);

  const loadChallenge = useCallback(() => {
    setLine(null);
    setResult(null);
    setSpeechTranscript("");
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

  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      try {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.stop();
      } catch {
        /* ignore */
      }
    }
    setSpeechTranscript("");
  }, []);

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
    setSpeechTranscript("");
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

      const Rec = getSpeechRecognitionCtor();
      if (Rec) {
        setSpeechSupported(true);
        const rec = new Rec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (event: SpeechRecognitionResultEv) => {
          let full = "";
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript;
          }
          setSpeechTranscript(full);
        };
        rec.onerror = (ev: Event) => {
          const err = (ev as { error?: string }).error;
          if (err === "aborted") return;
          if (err === "not-allowed" || err === "audio-capture") {
            setSpeechSupported(false);
          }
        };
        rec.onend = () => {
          if (recognitionRef.current === rec && recordingVcRef.current) {
            try {
              rec.start();
            } catch {
              /* ignore */
            }
          }
        };
        recognitionRef.current = rec;
        const tryStartSpeech = () => {
          if (recognitionRef.current !== rec || !recordingVcRef.current) return;
          try {
            rec.start();
          } catch {
            recognitionRef.current = null;
            setSpeechSupported(false);
          }
        };
        window.setTimeout(tryStartSpeech, 120);
      } else {
        setSpeechSupported(false);
      }
    } catch {
      setLine("Mic blocked");
      onRecordingStream?.(null);
    }
  };

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  const stopVcAndVerify = async () => {
    recordingVcRef.current = false;
    stopRecognition();
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
        ttsPhraseOnPass?: string;
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

  const expectedWords = tokenizePhrase(phrase);
  const spokenTokens = transcriptToTokens(speechTranscript);
  const { doneCount, activeIndex } = computeHighlight(expectedWords, spokenTokens);

  const rawWords = phrase.trim() ? phrase.trim().split(/\s+/) : [];

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
          <blockquote className="voice-captcha__phrase" aria-live="polite">
            {rawWords.length === 0 ? (
              "…"
            ) : (
              <>
                {rawWords.map((w, i) => {
                  const isDone = i < doneCount;
                  const isActive = activeIndex !== null && i === activeIndex && recordingVc;
                  let cls = "voice-captcha__word";
                  if (isDone) cls += " voice-captcha__word--done";
                  else if (isActive) cls += " voice-captcha__word--active";
                  else cls += " voice-captcha__word--pending";
                  return (
                    <span key={`${i}-${w}`} className={cls}>
                      {w}
                      {i < rawWords.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </>
            )}
          </blockquote>
          {!speechSupported && recordingVc ? (
            <p className="voice-captcha__hint" aria-hidden="true">
              Live highlight needs Chrome / Edge
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
              className="btn-vc"
              onClick={() => void startVcRecord()}
              disabled={
                busy || recordingVc || !phrase || (captchaRequired && !captchaSatisfied)
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

      {result?.reason === "human_pass" && elevenLabsReady && result.ttsPhraseOnPass ? (
        <div className="voice-captcha__tts">
          <button
            type="button"
            className="btn-vc btn-vc--tts"
            disabled={ttsPlaying || busy}
            onClick={() => void playElevenLabsTts(result.ttsPhraseOnPass ?? phrase)}
          >
            {ttsPlaying ? "Playing…" : "Play ElevenLabs voice"}
          </button>
          <span className="voice-captcha__tts-hint">Same phrase, synthetic voice — hackathon demo</span>
          {ttsError ? <p className="voice-captcha__tts-err">{ttsError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
