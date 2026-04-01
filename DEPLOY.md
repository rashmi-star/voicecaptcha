# Separate deployments (frontend vs API)

This repo is designed for **two independent deployments**. They use different hosts, build steps, and secrets. You can ship or roll back each one without the other.

| Deployment | Platform (example) | What it is | When it changes |
|------------|-------------------|------------|-----------------|
| **1 · Web UI** | Vercel, Netlify, Cloudflare Pages | Static Vite build (`dist/`) | UI, copy, `/embed`, `/demo` |
| **2 · Voice API** | Cloudflare Workers | `workers/voice-captcha-api` | Groq, ElevenLabs, challenge logic, CORS |

**URLs are different.** The browser loads the app from e.g. `https://voicecaptcha.vercel.app` and calls the API at e.g. `https://voice-captcha-api.<subdomain>.workers.dev` via `api_base` on `/embed` or your own proxy.

---

## Deployment 1 — Frontend (Vercel)

**Root directory:** repository root (not `workers/`).

1. Create a **new Vercel project** from this GitHub repo.
2. **Framework:** Vite. **Build command:** `npm run build`. **Output:** `dist`.
3. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Required? | Notes |
   |------|------------|--------|
   | `VITE_API_BASE_URL` | **Yes** for API calls | Worker **origin only**, no `/api` (e.g. `https://voice-captcha-api.xxx.workers.dev`). Without this, `/demo` and `/embed` try same-origin `/api`, which **does not exist** on Vercel (unlike local dev, which proxies `/api` to Wrangler). |
   | `VITE_RECAPTCHA_SITE_KEY` | Optional | Your reCAPTCHA **site** key; omit to rely on Google’s test key in dev only — use a real key in production. |
   | `VITE_RECAPTCHA_SIZE` | Optional | `checkbox` or `invisible`. |

   Redeploy after changing env vars (Vite bakes `VITE_*` at build time).

4. Deploy. Note the site URL, e.g. `https://your-app.vercel.app`.

**Do not** put `GROQ_API_KEY` or `ELEVENLABS_API_KEY` here — only on the Worker.

`vercel.json` provides SPA rewrites for `/`, `/demo`, `/embed`.

---

## Deployment 2 — Cloudflare Worker (API)

**Directory:** `workers/voice-captcha-api/` (its own Wrangler project).

From repo root:

```bash
npm run deploy:worker
```

Or from that folder:

```bash
cd workers/voice-captcha-api
npx wrangler login   # once per machine
npx wrangler deploy
```

**Secrets** (Worker only — Cloudflare dashboard or CLI):

```bash
cd workers/voice-captcha-api
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
```

Optional: `ELEVENLABS_VOICE_ID` in `wrangler.toml` `[vars]` or dashboard.

Note the **Worker URL** (Workers & Pages → your worker → URL).

See [workers/voice-captcha-api/README.md](./workers/voice-captcha-api/README.md) for details.

---

## Connect the two

After both are live:

1. **Embed / production:** use the **Vercel** URL in the iframe `src`, and the **Worker** origin (no `/api` suffix) as `api_base`:

   ```html
   <iframe
     src="https://your-app.vercel.app/embed?api_base=https%3A%2F%2Fvoice-captcha-api.your-account.workers.dev&parent_origin=https%3A%2F%2Fyoursite.com"
     ...
   ></iframe>
   ```

2. **CORS:** the Worker already sends permissive CORS for API routes; tighten `Access-Control-Allow-Origin` in production if you only allow specific origins.

3. **Order of deploy:** either deployment can go first. Until both exist, use local dev (`npm run dev` + `npm run worker:dev`) or leave `api_base` unset only when testing same-origin proxy.

---

## Summary

- **Vercel** = UI only, public `VITE_*`.  
- **Cloudflare** = API + Groq + ElevenLabs secrets.  
- **Never** duplicate provider keys into the frontend env.

More: [EMBED.md](./EMBED.md).
