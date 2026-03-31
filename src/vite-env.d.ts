/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  /** "checkbox" (default) or "invisible" — invisible runs on Start; image grid appears when Google asks */
  readonly VITE_RECAPTCHA_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
