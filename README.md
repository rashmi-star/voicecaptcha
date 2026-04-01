# Voice CAPTCHA

React UI + Cloudflare Worker API for spoken-phrase verification (with optional reCAPTCHA and ElevenLabs TTS demo).

## Separate deployments

The **frontend** and **API** are built and deployed independently:

| Part | Location | Typical host |
|------|-----------|----------------|
| Web app | Repo root (`npm run build` → `dist/`) | Vercel / Netlify / Pages |
| API | [`workers/voice-captcha-api`](./workers/voice-captcha-api) | Cloudflare Workers |

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step Vercel + Worker setup. On Vercel, set **`VITE_API_BASE_URL`** to your Worker origin (see `.env.example`) so `/demo` and `/embed` can reach the API.

## Local development

```bash
npm install
npm run dev
```

In another terminal:

```bash
npm run worker:dev
```

Vite proxies `/api` to the worker on port 8787.

## Docs

- [DEPLOY.md](./DEPLOY.md) — two deployments, secrets, embed wiring  
- [EMBED.md](./EMBED.md) — iframe + `postMessage`  
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system overview  
- [ELEVENHACKS.md](./ELEVENHACKS.md) — hackathon submission checklist ([ElevenHacks](https://hacks.elevenlabs.io/))  
