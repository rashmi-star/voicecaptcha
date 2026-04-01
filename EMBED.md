# Embedding Voice CAPTCHA (reCAPTCHA-style)

Host the voice check in an **iframe** on your site (like Google’s widget pattern). Put **reCAPTCHA or other bot checks on the parent page**; this iframe only verifies the spoken phrase against your Worker API.

**Hosting:** The UI can live on **Vercel** (static build). **ElevenLabs** and **Groq** API keys belong on the **Cloudflare Worker** only — not in Vercel env. See **[DEPLOY.md](./DEPLOY.md)**.

## Quick start

1. Deploy the **Vite app** (e.g. Vercel) and the **Cloudflare Worker** (`workers/voice-captcha-api`). The API lives **only** on the Worker — the static host does **not** expose `/api`.
2. Point the iframe at your app’s **`/embed`** route and pass **`api_base`** (see below) whenever the embed is **not** same-origin with the Worker (almost always in production).
3. Listen for **`postMessage`** from the iframe.

### Why `api_base` is required on other sites

The widget loads from your app origin (e.g. `https://your-app.vercel.app/embed`). By default it calls **`/api/...`** on **that** origin. **Vercel (and most static hosts) have no `/api` route**, so the challenge request fails and the UI shows **“Voice API offline”.**

Always set **`api_base`** to your Worker origin (no `/api` suffix), URL-encoded:

```text
https://YOUR_WORKER_SUBDOMAIN.workers.dev
```

### Iframe snippet (production)

Use this shape — **`api_base` is not optional** for embeds that are not proxied to the Worker:

```html
<iframe
  id="voicecaptcha"
  title="Voice CAPTCHA"
  src="https://YOUR_APP_ORIGIN/embed?api_base=https%3A%2F%2FYOUR_WORKER.workers.dev&parent_origin=https%3A%2F%2Fyoursite.com"
  width="420"
  height="560"
  allow="microphone"
  style="border: 1px solid #ccc; border-radius: 12px;"
></iframe>
```

Replace `YOUR_WORKER.workers.dev` with your real Worker URL from Cloudflare. Same value as **`VITE_API_BASE_URL`** for `/demo` (origin only).

### Query parameters

| Parameter        | Meaning |
|------------------|---------|
| `api_base`       | **Required** for typical production embeds: Worker base URL **without** `/api` (e.g. `https://voice-captcha-api.your-subdomain.workers.dev`). Omit only when `/embed` is **same-origin** with an app that proxies `/api` to the Worker (uncommon). |
| `parent_origin`  | Target origin for `postMessage` (e.g. `https://yoursite.com`). Use a **specific origin** in production; `*` only for quick local tests. |

Minimal example (only `api_base`):

```html
<iframe
  src="https://YOUR_APP_ORIGIN/embed?api_base=https%3A%2F%2FYOUR_WORKER.workers.dev"
  ...
></iframe>
```

## `postMessage` contract

All messages use `data.type === 'voicecaptcha'` and `data.version === 1`.

**Widget loaded (optional):**

```json
{ "type": "voicecaptcha", "version": 1, "event": "ready" }
```

**After each verify attempt** (HTTP response from `/api/verify-voice`):

```json
{
  "type": "voicecaptcha",
  "version": 1,
  "ok": true,
  "reason": "human_pass",
  "matchScore": 0.95,
  "humanLikeness": 0.88
}
```

On failure or network error, `ok` is `false`; `reason` may be omitted.

**Parent listener:**

```javascript
window.addEventListener("message", (e) => {
  if (e.origin !== "https://YOUR_APP_ORIGIN") return;
  const d = e.data;
  if (d?.type !== "voicecaptcha" || d.version !== 1) return;
  if (d.event === "ready") return;
  if (d.ok) {
    /* allow form submit / next step */
  }
});
```

## Local demo

With the dev server running, open **`/embed-demo.html`** — a minimal parent page that logs messages from `/embed`.

## SPA hosting

Ensure `/embed` serves `index.html` (same as the main app). On Netlify, `_redirects` often includes `/* /index.html 200`; configure your host similarly.

## Security notes

- Validate **`event.origin`** in the parent.
- Prefer **`parent_origin`** matching your site instead of `*`.
- The Worker should enforce rate limits and your own abuse rules; the iframe is only UX.
