# voice-captcha-api (Cloudflare Worker)

This folder is **deployed separately** from the Vite app in the repo root. It is its own Wrangler project.

## Local dev

```bash
npm install
npm run dev
```

Runs on **port 8787** by default. Copy `.dev.vars.example` → `.dev.vars` and add `GROQ_API_KEY` (and optionally `ELEVENLABS_API_KEY`).

## Deploy (production)

```bash
npx wrangler deploy
```

Set secrets in Cloudflare (not in Vercel):

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
```

Full two-app setup: [../../DEPLOY.md](../../DEPLOY.md).
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace