/**
 * Edge API: Durable Object challenge state + Groq Whisper + ElevenLabs TTS.
 * ElevenHacks: Cloudflare Workers + DO + ElevenLabs voice.
 */

import type { WorkerEnv } from "./types";
export { ChallengeCoordinator } from "./challenge-do";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bagOfWordsScore(expected: string, transcript: string): number {
  const aw = normalize(expected).split(" ").filter(Boolean);
  const bs = new Set(normalize(transcript).split(" ").filter(Boolean));
  if (!aw.length) return 0;
  const hits = aw.filter((w) => bs.has(w)).length;
  return hits / aw.length;
}

function wordsRoughlyEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  let d = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  if (Math.abs(a.length - b.length) > 1) return false;
  return d <= 1;
}

function orderedWordScoreFuzzy(expected: string, transcript: string): number {
  const exp = normalize(expected).split(" ").filter(Boolean);
  const got = normalize(transcript).split(" ").filter(Boolean);
  if (!exp.length) return 0;
  if (!got.length) return 0;
  let j = 0;
  for (let i = 0; i < got.length && j < exp.length; i++) {
    if (wordsRoughlyEqual(got[i], exp[j])) j++;
  }
  return j / exp.length;
}

async function transcribeGroq(audio: ArrayBuffer, mime: string, apiKey: string): Promise<string> {
  const ext = mime.includes("webm")
    ? "webm"
    : mime.includes("wav")
      ? "wav"
      : mime.includes("mp4") || mime.includes("m4a") || mime.includes("mpeg") || mime.includes("mp3")
        ? "m4a"
        : "webm";
  const form = new FormData();
  form.append("file", new Blob([audio], { type: mime || "audio/webm" }), `audio.${ext}`);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
    );
  }
  return btoa(binary);
}

function challengeStub(env: WorkerEnv): DurableObjectStub {
  return env.CHALLENGE_COORDINATOR.get(env.CHALLENGE_COORDINATOR.idFromName("global"));
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/challenge" && request.method === "GET") {
      const stub = challengeStub(env);
      const res = await stub.fetch(new Request("https://do/create", { method: "POST" }));
      const data = (await res.json()) as { challengeId?: string; phrase?: string; error?: string };
      if (!res.ok) {
        return json({ error: data.error ?? "challenge failed" }, res.status);
      }
      return json({ challengeId: data.challengeId, phrase: data.phrase });
    }

    if (url.pathname === "/api/verify-voice" && request.method === "POST") {
      if (!env.GROQ_API_KEY) {
        return json(
          {
            ok: false,
            error: "Worker missing GROQ_API_KEY. Run: wrangler secret put GROQ_API_KEY",
          },
          503
        );
      }

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return json({ ok: false, error: "Invalid form data" }, 400);
      }

      const challengeId = String(form.get("challengeId") ?? "");
      const file = form.get("audio");
      const isFileLike =
        file !== null &&
        typeof file === "object" &&
        "arrayBuffer" in file &&
        typeof (file as Blob).arrayBuffer === "function";
      if (!challengeId || !isFileLike) {
        return json({ ok: false, error: "Need challengeId and audio file" }, 400);
      }

      const stub = challengeStub(env);
      const getRes = await stub.fetch(
        new Request(`https://do/get?id=${encodeURIComponent(challengeId)}`, { method: "GET" })
      );
      if (!getRes.ok) {
        return json({ ok: false, error: "Unknown or expired challenge" }, 400);
      }
      const entry = (await getRes.json()) as { phrase: string; created: number };

      const audioBlob = file as Blob;
      const buf = await audioBlob.arrayBuffer();
      const mime = audioBlob.type || "audio/webm";

      let transcript: string;
      try {
        transcript = await transcribeGroq(buf, mime, env.GROQ_API_KEY);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return json({ ok: false, error: `Transcription failed: ${msg}` }, 502);
      }

      const ordered = orderedWordScoreFuzzy(entry.phrase, transcript);
      const bag = bagOfWordsScore(entry.phrase, transcript);
      const pass = ordered >= 0.98 && transcript.trim().length >= 8;

      await stub.fetch(
        new Request("https://do/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: challengeId }),
        })
      );

      const humanLikeness = Math.min(
        1,
        0.25 + ordered * 0.5 + bag * 0.15 + (transcript.length > 12 ? 0.1 : 0)
      );

      const trimmed = transcript.trim();
      let reason: "human_pass" | "wrong_sentence" | "bot_suspected";
      let userMessage: string;

      if (pass) {
        reason = "human_pass";
        userMessage =
          "Human pass — voice CAPTCHA cleared. Challenge passed; you may proceed.";
      } else if (!trimmed.length) {
        reason = "bot_suspected";
        userMessage =
          "CAPTCHA not cleared — no speech detected. Possible bot activity or blocked mic. Try again.";
      } else if (ordered >= 0.35 || bag >= 0.45) {
        reason = "wrong_sentence";
        userMessage = "Wrong sentence — say the exact phrase in order, then Check.";
      } else {
        reason = "bot_suspected";
        userMessage =
          "CAPTCHA not cleared — phrase does not match (possible bot voice or synthetic audio). Try again with a clear human recording.";
      }

      return json({
        ok: pass,
        reason,
        userMessage,
        transcript,
        matchScore: Math.round(ordered * 1000) / 1000,
        bagScore: Math.round(bag * 1000) / 1000,
        humanLikeness: Math.round(humanLikeness * 100) / 100,
        /** ElevenLabs TTS can read this phrase on pass (see UI). */
        ttsPhraseOnPass: pass ? entry.phrase : undefined,
        note:
          "humanLikeness is a demo score only — integrate a deepfake-audio API for real synthetic-voice detection.",
      });
    }

    if (url.pathname === "/api/tts-demo" && request.method === "POST") {
      if (!env.ELEVENLABS_API_KEY) {
        return json({ ok: false, error: "Set ELEVENLABS_API_KEY secret to enable TTS demo" }, 503);
      }
      let body: { text?: string };
      try {
        body = (await request.json()) as { text?: string };
      } catch {
        return json({ ok: false, error: "JSON body required" }, 400);
      }
      const text = (body.text ?? "").trim();
      if (!text) return json({ ok: false, error: "text required" }, 400);

      const voiceId = env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return json({ ok: false, error: `ElevenLabs ${res.status}: ${err}` }, 502);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      return json({ ok: true, audioBase64: uint8ToBase64(bytes), mime: "audio/mpeg" });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        groq: Boolean(env.GROQ_API_KEY),
        elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
        durableObjects: true,
        stack: "Cloudflare Workers + Durable Objects + Groq Whisper + ElevenLabs TTS",
      });
    }

    return json({ error: "Not found" }, 404);
  },
};
