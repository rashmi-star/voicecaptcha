# ElevenHacks submission checklist

Official challenge page: **[Hack #2: Cloudflare](https://hacks.elevenlabs.io/hackathons/1)** — read **Submission guide** and **Sign in to submit** on that site for binding rules, timezone, and the entry form.

## Compliance vs [Hack #2](https://hacks.elevenlabs.io/hackathons/1) requirements

| Official ask | This project |
|--------------|----------------|
| **“Build an AI-powered app using both Cloudflare and ElevenLabs’ developer platforms”** | **Cloudflare:** Workers + **Durable Objects** (`ChallengeCoordinator`). **ElevenLabs:** TTS via `POST /api/tts-demo` (Worker holds `xi-api-key`) — users hear the challenge phrase in synthetic speech, then repeat it. |
| **“Creative use of Workers, Durable Objects, and … ElevenLabs APIs”** | Workers = API + Groq transcription orchestration; DO = per-challenge state; ElevenLabs = **multilingual TTS** for the spoken challenge. **Groq** is extra (not required by brief but fine). |
| **“Submit a high-quality viral-style video demonstrating what you’ve built”** | **Your action item:** record and upload per their form (see [ARCHITECTURE.md](./ARCHITECTURE.md) video outline). Code alone is not enough if the rules require video. |
| **Deployed on Cloudflare** | **Worker (+ DO)** is deployed to Cloudflare — this satisfies the platform requirement. UI can stay on Vercel/elsewhere; the hack brief still highlights Workers + DO + ElevenLabs in the **backend**. |
| **Tag @CloudflareDev, @elevenlabsio, #ElevenHacks** | Do this on submission social posts for scoring (+50 pts/platform per their [scoring](https://hacks.elevenlabs.io/hackathons/1)). |

**Deadline (listed on the hack page):** submission window **closes Thu 2 Apr, 17:00** (confirm timezone on the live page — often UK). **Winners** announced **Tue 7 Apr, 17:00**.

### Gaps to close before you’re “compliant”

1. **Submit through the site** — [Sign in to submit](https://hacks.elevenlabs.io/hackathons/1) with repo + demo link + video as required.  
2. **Video** — matches their explicit ask for a **viral-style** demo.  
3. **Live demo** — public Worker URL + working `ELEVENLABS_API_KEY` / `GROQ_API_KEY` on Cloudflare so judges can try TTS and verify.  
4. **Optional:** deploy **Pages** for the static app on Cloudflare if you want the whole stack on one vendor; **not** strictly required if Workers + ElevenLabs are clearly demonstrated.

---

Your app matches the **Cloudflare × ElevenLabs** track: edge Worker API, **Durable Object** challenge state, **Groq** Whisper verify, **ElevenLabs** TTS contrast after pass. Broader hub: [ElevenHacks](https://hacks.elevenlabs.io/).

## Before you submit

1. **Public repo** — Push to GitHub (e.g. `rashmi-star/voicecaptcha`) with **no** secrets in history (`.env` / `.dev.vars` stay gitignored).
2. **Live demo** — Deploy **both** pieces separately ([DEPLOY.md](./DEPLOY.md)):
   - Frontend (Vercel or similar): `/`, `/demo`, `/embed`.
   - Worker: `wrangler deploy`; secrets only on Cloudflare (`GROQ_API_KEY`, `ELEVENLABS_API_KEY`).
3. **README** — Root [README.md](./README.md) already explains the stack; add your **live URLs** at the top when ready.
4. **Short video (often required)** — 30–60s: `/demo` or `/embed`, **Play phrase** (ElevenLabs) → user repeats → pass/fail. Mention Workers + DO + ElevenLabs + Groq. Outline: [ARCHITECTURE.md](./ARCHITECTURE.md) (“Viral-style video outline”).
5. **Social / tags** (when they ask for posts) — [@CloudflareDev](https://x.com/CloudflareDev), [@elevenlabsio](https://x.com/elevenlabsio), hashtag **`#ElevenHacks`** (see [ARCHITECTURE.md](./ARCHITECTURE.md) § ElevenHacks).

## What judges can verify

| Requirement | Where in this repo |
|---------------|-------------------|
| Cloudflare Workers | `workers/voice-captcha-api/` |
| ElevenLabs API | `POST /api/tts-demo`, `ELEVENLABS_API_KEY` on Worker |
| Durable Objects | `ChallengeCoordinator` in `challenge-do.ts` |
| Optional narrative | reCAPTCHA + voice on `/demo` |

## Honest scope

ElevenLabs is **TTS** here (contrast clip), not a licensed “deepfake detector.” Say that in the write-up if they ask about “AI voice detection” — see [ARCHITECTURE.md](./ARCHITECTURE.md) § “AI voice detection expectation.”
