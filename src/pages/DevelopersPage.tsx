import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceCaptchaLogo, VoiceCaptchaWordmark } from "@/components/VoiceCaptchaLogo";
import { applyTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Inline code: monospace, no background pill (readable on light/dark). */
function InlineCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[0.92em] text-foreground", className)}>{children}</span>
  );
}

/** Hosted Voice CAPTCHA UI (Vite app). */
const VOICECAPTCHA_APP_ORIGIN = "https://voicecaptcha.vercel.app";
/** Hosted API — pass as `api_base` (no `/api`). Self-hosters replace with their Worker origin. */
const VOICECAPTCHA_PUBLIC_API_ORIGIN = "https://voice-captcha-api.rashmie30.workers.dev";
const VOICECAPTCHA_API_BASE_ENCODED = encodeURIComponent(VOICECAPTCHA_PUBLIC_API_ORIGIN);

const preconnectSnippet = `<!-- Optional: faster first connection to your Voice CAPTCHA app host -->
<link rel="preconnect" href="${VOICECAPTCHA_APP_ORIGIN}" />`;

const iframeSnippet = `<iframe
  id="voicecaptcha"
  title="Voice CAPTCHA"
  src="${VOICECAPTCHA_APP_ORIGIN}/embed?api_base=${VOICECAPTCHA_API_BASE_ENCODED}&parent_origin=https%3A%2F%2Fyoursite.com"
  width="420"
  height="560"
  allow="microphone"
  style="border-radius: 12px; box-shadow: 0 0 0 1px oklch(0.88 0 0 / 0.5);"
></iframe>`;

const dynamicEmbedSnippet = `const iframe = document.createElement("iframe");
iframe.title = "Voice CAPTCHA";
iframe.width = "420";
iframe.height = "560";
iframe.setAttribute("allow", "microphone");
iframe.src =
  "${VOICECAPTCHA_APP_ORIGIN}/embed?api_base=" +
  encodeURIComponent("${VOICECAPTCHA_PUBLIC_API_ORIGIN}") +
  "&parent_origin=" +
  encodeURIComponent(window.location.origin);
document.getElementById("voicecaptcha-slot")?.appendChild(iframe);`;

const listenerSnippet = `window.addEventListener("message", (e) => {
  if (e.origin !== "${VOICECAPTCHA_APP_ORIGIN}") return;
  const d = e.data;
  if (d?.type !== "voicecaptcha" || d.version !== 1) return;

  if (d.event === "ready") {
    // Widget finished loading — safe to enable UI that depends on the iframe
    return;
  }

  if (d.ok) {
    // User passed the voice check — continue your flow (submit form, next step, etc.)
  }
});`;

const readyPayloadSnippet = `{
  "type": "voicecaptcha",
  "version": 1,
  "event": "ready"
}`;

const verifyPayloadSnippet = `{
  "type": "voicecaptcha",
  "version": 1,
  "ok": true,
  "reason": "human_pass",
  "matchScore": 0.95,
  "humanLikeness": 0.88
}`;

export default function DevelopersPage() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const preClass =
    "overflow-x-auto rounded-lg border border-border/40 bg-background p-4 text-left font-mono text-xs leading-relaxed text-foreground";

  return (
    <div className="theme min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        active="developers"
      />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 flex items-start gap-4">
          <VoiceCaptchaLogo size="md" className="hidden sm:block" />
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Add Voice CAPTCHA to your site
            </h1>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Voice CAPTCHA is a <strong className="font-medium text-foreground">hosted service</strong>: we run the
              Cloudflare Worker, transcription (Groq), and phrase audio (ElevenLabs).{" "}
              <strong className="font-medium text-foreground">You do not need</strong> those API keys on your site — only
              the iframe, <InlineCode>api_base</InlineCode> pointing at <strong className="font-medium text-foreground">our</strong>{" "}
              public API (<InlineCode>{VOICECAPTCHA_PUBLIC_API_ORIGIN}</InlineCode>), and{" "}
              <InlineCode>postMessage</InlineCode>. If you <strong className="font-medium text-foreground">self-host</strong>{" "}
              the Worker from this repo instead, use your deployment’s URL as <InlineCode>api_base</InlineCode> and
              configure keys there (see below).
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Before you embed
            </h2>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Typical integration (most sites)</p>
              <p className="mt-2">
                Iframe host: <InlineCode>{VOICECAPTCHA_APP_ORIGIN}</InlineCode> (<InlineCode>/embed</InlineCode>).{" "}
                <InlineCode>api_base</InlineCode>: <InlineCode>{VOICECAPTCHA_PUBLIC_API_ORIGIN}</InlineCode> — same value
                as <InlineCode>VITE_API_BASE_URL</InlineCode> for our deployment. No Groq, ElevenLabs, or Cloudflare setup
                on your side.
              </p>
            </div>
            <div className="rounded-lg border border-border/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Optional: self-host the Worker</p>
              <p className="mt-2">
                Deploy <InlineCode>workers/voice-captcha-api</InlineCode> to your Cloudflare account, set{" "}
                <InlineCode>GROQ_API_KEY</InlineCode> and <InlineCode>ELEVENLABS_API_KEY</InlineCode> as Wrangler secrets,
                and use <strong className="font-medium text-foreground">your</strong> Worker URL (no <InlineCode>/api</InlineCode>
                ) as <InlineCode>api_base</InlineCode>. Point your own static build’s <InlineCode>VITE_API_BASE_URL</InlineCode>{" "}
                at that Worker if you fork the UI.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              1. Load the Voice CAPTCHA widget
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The widget is the <InlineCode>/embed</InlineCode> route on the Voice CAPTCHA app host (static). The API is
              on a <strong className="font-medium text-foreground">separate origin</strong> (our hosted Worker or yours).
              The iframe <strong className="font-medium text-foreground">must</strong> include{" "}
              <InlineCode>api_base=…</InlineCode> pointing at that API, or the browser hits <InlineCode>/api</InlineCode> on
              the static host and shows <strong className="font-medium text-foreground">Voice API offline</strong>. Use{" "}
              <InlineCode>allow=&quot;microphone&quot;</InlineCode> so the iframe can record.
            </p>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Optional: preconnect to your app origin
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Speeds up the first connection to the host that serves <InlineCode>/embed</InlineCode>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className={preClass}>
                  <code>{preconnectSnippet}</code>
                </pre>
              </CardContent>
            </Card>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Static iframe in HTML</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Copy-paste uses <InlineCode>{VOICECAPTCHA_APP_ORIGIN}</InlineCode> and{" "}
                  <InlineCode>{VOICECAPTCHA_PUBLIC_API_ORIGIN}</InlineCode>. Replace{" "}
                  <InlineCode>yoursite.com</InlineCode> with your parent page origin for <InlineCode>parent_origin</InlineCode>.
                  Self-hosters: swap in your app URL and Worker URL.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className={preClass}>
                  <code>{iframeSnippet}</code>
                </pre>
              </CardContent>
            </Card>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Create the iframe from JavaScript
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Injects the widget after your DOM is ready; uses <InlineCode>encodeURIComponent</InlineCode> for
                  query values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className={preClass}>
                  <code>{dynamicEmbedSnippet}</code>
                </pre>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              2. Listen for ready and verification
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Always verify <InlineCode>e.origin</InlineCode> is the origin that hosts <InlineCode>/embed</InlineCode> (
              your app deployment, not the parent site). Messages use{" "}
              <InlineCode>type: &quot;voicecaptcha&quot;</InlineCode> and <InlineCode>version: 1</InlineCode>.
            </p>
            <pre className={preClass}>
              <code>{listenerSnippet}</code>
            </pre>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Message payloads</CardTitle>
                <CardDescription className="text-muted-foreground">
                  After a verify attempt, <InlineCode>ok</InlineCode> may be false; <InlineCode>reason</InlineCode> may be
                  omitted on errors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Widget loaded (optional)</p>
                  <pre className={preClass}>
                    <code>{readyPayloadSnippet}</code>
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Example: user passed</p>
                  <pre className={preClass}>
                    <code>{verifyPayloadSnippet}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              3. Query parameters on <InlineCode>/embed</InlineCode>
            </h2>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>
                <InlineCode>api_base</InlineCode> — <strong className="font-medium text-foreground">Required</strong>{" "}
                for embeds on other sites: the Voice CAPTCHA API origin (hosted service{" "}
                <strong className="font-medium text-foreground">or</strong> your Worker) <strong className="font-medium text-foreground">without</strong>{" "}
                <InlineCode>/api</InlineCode>. URL-encode it in <InlineCode>src</InlineCode>. Without it → “Voice API offline.”
              </li>
              <li>
                <InlineCode>parent_origin</InlineCode> — Your page’s origin for <InlineCode>postMessage</InlineCode>{" "}
                targeting. Use a real origin in production; avoid <InlineCode>*</InlineCode>.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              4. Troubleshooting & security
            </h2>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">“Voice API offline”</strong> — Set{" "}
                <InlineCode>api_base</InlineCode> to the hosted Voice CAPTCHA API origin (or your self-hosted Worker).
                The iframe’s static host does not serve <InlineCode>/api</InlineCode>.
              </li>
              <li>
                <strong className="font-medium text-foreground">Mic never starts</strong> — Ensure{" "}
                <InlineCode>allow=&quot;microphone&quot;</InlineCode> on the iframe (and use HTTPS).
              </li>
              <li>
                <strong className="font-medium text-foreground">Routing</strong> — Your host must serve{" "}
                <InlineCode>/embed</InlineCode> as the SPA (same as <InlineCode>index.html</InlineCode>). Vercel SPA
                rewrites already cover this in this project.
              </li>
              <li>
                <strong className="font-medium text-foreground">Security</strong> — Always check{" "}
                <InlineCode>event.origin</InlineCode> in the parent listener. Combine with your own bot checks (e.g.
                reCAPTCHA) on the parent page; rate-limit and validate on the Worker for real protection.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              5. Suggested flow on your page
            </h2>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>Render the iframe with <InlineCode>api_base</InlineCode> and <InlineCode>allow=&quot;microphone&quot;</InlineCode>.</li>
              <li>
                Optionally wait for <InlineCode>event: &quot;ready&quot;</InlineCode> before emphasizing the voice step.
              </li>
              <li>
                When the user passes (<InlineCode>ok: true</InlineCode>), continue checkout, signup, or admin action.
              </li>
              <li>Enforce limits and abuse rules on the Worker; the iframe is only the client UI.</li>
            </ol>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Voice CAPTCHA only covers the spoken verification step — add other signals (CAPTCHA, auth) on your site as
              needed.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left sm:px-6">
          <div className="flex items-center gap-2">
            <VoiceCaptchaLogo size="sm" />
            <VoiceCaptchaWordmark className="text-sm" />
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
            <a href="/" className="hover:text-foreground">
              Product
            </a>
            <a href="/demo" className="font-medium text-foreground underline-offset-4 hover:underline">
              Try demo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
