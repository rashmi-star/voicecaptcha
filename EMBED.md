# Embedding Voice CAPTCHA (reCAPTCHA-style)

Host the voice check in an **iframe** on your site (like Google’s widget pattern). Put **reCAPTCHA or other bot checks on the parent page**; this iframe only verifies the spoken phrase against your Worker API.

**Hosting:** The UI can live on **Vercel** (static build). **ElevenLabs** and **Groq** API keys belong on the **Cloudflare Worker** only — not in Vercel env. See **[DEPLOY.md](./DEPLOY.md)**.

## Quick start

1. Deploy the Vite app (static) and the Cloudflare Worker (`workers/voice-captcha-api`) so CORS allows your frontend origin.
2. Point the iframe at your app’s **`/embed`** route.
3. Listen for **`postMessage`** from the iframe.

### Iframe snippet

```html
<iframe
  id="voicecaptcha"
  title="Voice CAPTCHA"
  src="https://YOUR_APP_ORIGIN/embed"
  width="420"
  height="560"
  style="border: 1px solid #ccc; border-radius: 12px;"
></iframe>
```

### Query parameters

| Parameter        | Meaning |
|------------------|---------|
| `api_base`       | Base URL of the Worker **without** `/api` (e.g. `https://voice-captcha-api.your-subdomain.workers.dev`). Omit for same-origin `/api` (typical local dev with Vite proxy). |
| `parent_origin`  | Target origin for `postMessage` (e.g. `https://yoursite.com`). Use a **specific origin** in production; `*` only for quick local tests. |

Example:

```html
<iframe
  src="https://YOUR_APP_ORIGIN/embed?api_base=https%3A%2F%2FYOUR_WORKER.workers.dev&parent_origin=https%3A%2F%2Fyoursite.com"
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
