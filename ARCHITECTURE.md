# Voice CAPTCHA + Cloudflare + ElevenLabs + Groq — research & build plan

## What each product actually does (important)

| Product | Best use here | Not its core job |
|--------|----------------|------------------|
| **Google reCAPTCHA** | Bot resistance on the web form | Does not analyze voice |
| **ElevenLabs** | Text-to-speech, voice agents, conversational AI ([docs](https://elevenlabs.io/docs)) | **Not** a dedicated “human vs AI voice” detector |
| **Groq** | **Very fast** Whisper transcription ([audio transcriptions](https://console.groq.com/docs/model/whisper-large-v3)) | Does not label “synthetic voice” by default |
| **Cloudflare Workers** | Edge API, secrets, call Groq/ElevenLabs, optional [Workers AI Whisper](https://developers.cloudflare.com/workers-ai/models/whisper/) | You wire the pipeline |

**Detecting AI/synthetic speech** (deepfakes) is a **separate** problem. Vendors include **Resemble Detect**, **Modulate Velma**, **Aurigin**, and others — typically REST APIs with confidence scores. For a hackathon **demo**, combine:

1. **Challenge / response** — user must speak a **random phrase** (proves liveness + harder to replay).
2. **Transcription match** — Groq Whisper or Workers AI Whisper checks the **words** (server-side).
3. **“Authenticity” layer (creative)** — optional: call a **deepfake-audio API**, or demo **contrast** with **ElevenLabs TTS** of the *same phrase* (“this is synthetic; your clip should differ in timing/energy” — narrative, not a full forensic claim without a detector API).

## Suggested architecture (viral demo–friendly)

```
Browser (React)
  ├─ Left: reCAPTCHA
  └─ Right: Siri visualizer + record phrase → POST audio
           ↓
Cloudflare Worker (edge)
  ├─ Verify reCAPTCHA token (Google siteverify) — optional on /verify-voice
  ├─ Store challengeId → phrase (Durable Object or KV) — optional v2
  ├─ Transcribe: Groq Whisper (fast) OR @cf/openai/whisper on Workers AI
  ├─ Compare normalized text to challenge phrase
  ├─ ElevenLabs TTS same phrase → `POST /api/tts-demo` + **Play ElevenLabs voice** in UI after pass
  └─ **Durable Object** `ChallengeCoordinator` stores `challengeId → phrase` at the edge (not in-memory)
```

## Implementation steps (order)

1. **Worker API** (this repo: `workers/voice-captcha-api/`)
   - `GET /api/challenge` — returns `{ challengeId, phrase }`.
   - `POST /api/verify-voice` — multipart `audio` + `challengeId` + `phrase` → Groq transcription → `{ ok, transcript, matchScore }`.
   - `wrangler secret put GROQ_API_KEY` for production.
2. **Vite proxy** — `vite.config.ts` proxies `/api` → `http://127.0.0.1:8787` during dev.
3. **UI** — `VoiceCaptchaPanel` in the right column: show phrase, record, verify, show result + optional “synthetic demo” line.
4. **ElevenLabs (optional)** — `POST /api/tts-demo` calls [TTS API](https://elevenlabs.io/docs/api-reference/text-to-speech) with `xi-api-key`; UI plays AI clip next to user clip for the video.
5. **Cloudflare hardening** — deploy Worker, bind custom domain, move secrets to Workers secrets.
6. **Video (30–60s)** — Screen record: split UI, solve reCAPTCHA, speak phrase, show pass/fail + optional “ElevenLabs says the same phrase” contrast + one line on Workers + Groq.

## Viral-style video outline

1. Hook: “Bots pass CAPTches — what about **voice**?”
2. Show left reCAPTCHA + right voice challenge in one frame.
3. Live: speak the phrase → **pass** with transcript overlay.
4. (Optional) Play **ElevenLabs** TTS of same phrase — “same words, different origin.”
5. Close: “Built on Cloudflare Workers + Groq (+ ElevenLabs for voice).”

## ElevenHacks (Cloudflare × ElevenLabs) — what to show in your video

- **Cloudflare Workers** — HTTP API at the edge (`/api/*`).
- **Durable Objects** — `ChallengeCoordinator` (`src/challenge-do.ts`): challenge sessions persist in DO storage (singleton `idFromName("global")`).
- **Groq** — Whisper transcription for verify.
- **ElevenLabs** — After a **human pass**, click **Play ElevenLabs voice** to hear the same phrase in synthetic TTS (contrast: human recording vs AI voice). Set `ELEVENLABS_API_KEY` in `.dev.vars` / Wrangler secrets.
- Tag [@CloudflareDev](https://x.com/CloudflareDev) and [@elevenlabsio](https://x.com/elevenlabsio), hashtag `#ElevenHacks` — see [Hack #2](https://hacks.elevenlabs.io/hackathons/1).

## Files added in this repo

- `workers/voice-captcha-api/` — Worker, **Durable Object**, `wrangler.toml` migrations
- `workers/voice-captcha-api/src/challenge-do.ts` — `ChallengeCoordinator` DO
- `src/components/VoiceCaptchaPanel.tsx` — voice challenge + ElevenLabs playback on pass
- `vite.config.ts` — `/api` proxy for local dev

Run Worker: `cd workers/voice-captcha-api && npm install && npm run dev` (port **8787**).  
Run app: `npm run dev` (port **5173**). Vite proxies `/api` → the worker.

### Groq + deploy

1. Create a [Groq API key](https://console.groq.com/) (Whisper transcription).
2. Local: `cd workers/voice-captcha-api && npx wrangler secret put GROQ_API_KEY` and paste the key.
3. Deploy: `npx wrangler deploy` then set the same secret in the Cloudflare dashboard.

### ElevenLabs (optional TTS demo)

1. [ElevenLabs API](https://elevenlabs.io/docs/api-reference/text-to-speech) — `POST /v1/text-to-speech/{voice_id}` with header `xi-api-key`.
2. `wrangler secret put ELEVENLABS_API_KEY` and optionally `ELEVENLABS_VOICE_ID` in `wrangler.toml` `[vars]` or dashboard.
3. Call `POST /api/tts-demo` with JSON `{ "text": "your phrase" }` — returns `audioBase64` (MPEG) for an “AI voice” A/B clip in your video.

### “AI voice detection” expectation

**ElevenLabs does not ship a public “is this AI?” detector** in the same way. For a production “synthetic voice” score, plan to integrate a **deepfake-audio** API or host a classifier; this repo uses a **demo** `humanLikeness` derived from phrase match (see Worker response `note` field).
