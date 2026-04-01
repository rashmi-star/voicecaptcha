# Embedding Voice CAPTCHA

Host the voice check in an **iframe** on your site (similar to [Loading reCAPTCHA](https://developers.google.com/recaptcha/docs/loading): use **resource hints** where helpful, and don’t assume the widget is usable until it signals **ready**). Put other bot checks on the parent page; the iframe handles the spoken verification step.

**No API keys on your site** — pass our public **`api_base`** in the iframe URL. Full copy-paste guide: **`/developers`** on the hosted app.

Self-hosting and backend setup: **[GitHub repo](https://github.com/rashmi-star/voicecaptcha)** (not required to use the hosted embed).

## Quick start

1. Add **`preconnect`** in `<head>` to the embed app origin and verification API origin (optional, improves first load — same idea as Google’s loading doc).
2. Point the iframe at **`/embed`** and pass **`api_base`** (required for typical cross-origin embeds).
3. Listen for **`postMessage`**; wait for **`event: "ready"`** before treating the widget as loaded (like **`grecaptcha.ready()`**).

### Why `api_base` is required on other sites

The widget loads from your app origin (e.g. `https://your-app.vercel.app/embed`). By default it calls **`/api/...`** on **that** origin. **Vercel (and most static hosts) have no `/api` route**, so the challenge request fails and the UI shows **“Voice API offline”.**

Always set **`api_base`** to your Worker origin (no `/api` suffix), URL-encoded:

```text
https://YOUR_WORKER_SUBDOMAIN.workers.dev
```

### Loading sample (head + iframe + listener)

```html
<head>
  <link rel="preconnect" href="https://voicecaptcha.vercel.app" />
  <link rel="preconnect" href="https://voice-captcha-api.rashmie30.workers.dev" />
</head>
<body>
  <!-- iframe + postMessage listener: see /developers for full HTML -->
</body>
```

### Iframe snippet (production)

Use this shape — **`api_base` is not optional** for embeds that are not proxied to the Worker:

```html
<iframe
  id="voicecaptcha"
  title="Voice CAPTCHA"
  src="https://voicecaptcha.vercel.app/embed?api_base=https%3A%2F%2Fvoice-captcha-api.rashmie30.workers.dev&parent_origin=https%3A%2F%2Fyoursite.com"
  width="420"
  height="560"
  allow="microphone"
  style="border: 1px solid #ccc; border-radius: 12px;"
></iframe>
```

**Hosted service:** `api_base` is **`https://voice-captcha-api.rashmie30.workers.dev`** (no `/api`). If you self-host, use your deployment’s API base URL instead — see the repo.

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
