/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Worker origin only, no `/api` suffix (e.g. `https://voice-captcha-api.xxx.workers.dev`).
   * Required on Vercel — there is no dev proxy; API calls go here + `/api/...`.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
