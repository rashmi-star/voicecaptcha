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

const preconnectSnippet = `<!-- Optional: faster first connection to your Voice CAPTCHA app host -->
<link rel="preconnect" href="https://YOUR_APP_ORIGIN" />`;

const iframeSnippet = `<iframe
  id="voicecaptcha"
  title="Voice CAPTCHA"
  src="https://YOUR_APP_ORIGIN/embed?api_base=https%3A%2F%2FYOUR_WORKER.workers.dev&parent_origin=https%3A%2F%2Fyoursite.com"
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
  "https://YOUR_APP_ORIGIN/embed?api_base=" +
  encodeURIComponent("https://YOUR_WORKER.workers.dev") +
  "&parent_origin=" +
  encodeURIComponent(window.location.origin);
document.getElementById("voicecaptcha-slot")?.appendChild(iframe);`;

const listenerSnippet = `window.addEventListener("message", (e) => {
  if (e.origin !== "https://YOUR_APP_ORIGIN") return;
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
              Everything below is self-contained — embed the <InlineCode>/embed</InlineCode> iframe, pass your Worker URL
              as <InlineCode>api_base</InlineCode>, and listen for <InlineCode>postMessage</InlineCode>. Groq and
              ElevenLabs keys stay on your <strong className="font-medium text-foreground">Cloudflare Worker</strong>{" "}
              only, never in the parent page.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Before you embed
            </h2>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>
                Deploy the <strong className="font-medium text-foreground">static app</strong> (e.g. Vercel) — this
                serves <InlineCode>/</InlineCode>, <InlineCode>/demo</InlineCode>, <InlineCode>/embed</InlineCode>.
              </li>
              <li>
                Deploy the <strong className="font-medium text-foreground">Voice API</strong> on Cloudflare Workers (
                <InlineCode>workers/voice-captcha-api</InlineCode>). Note the Worker URL, e.g.{" "}
                <InlineCode>https://YOUR_WORKER.workers.dev</InlineCode> — <strong className="font-medium text-foreground">no</strong>{" "}
                <InlineCode>/api</InlineCode> suffix.
              </li>
              <li>
                Set <InlineCode>GROQ_API_KEY</InlineCode> and <InlineCode>ELEVENLABS_API_KEY</InlineCode> as{" "}
                <strong className="font-medium text-foreground">Wrangler secrets</strong> on that Worker (not in Vercel).
              </li>
              <li>
                For the main site demo, set <InlineCode>VITE_API_BASE_URL</InlineCode> on Vercel to that same Worker
                origin. For <strong className="font-medium text-foreground">iframes on other websites</strong>, pass the
                same value as the <InlineCode>api_base</InlineCode> query parameter (see below).
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              1. Load the Voice CAPTCHA widget
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The widget is the <InlineCode>/embed</InlineCode> route on your app host. The voice API runs on the Worker,
              not on Vercel — the iframe <strong className="font-medium text-foreground">must</strong> include{" "}
              <InlineCode>api_base=…</InlineCode> pointing at your Worker, or the browser requests{" "}
              <InlineCode>/api</InlineCode> on the static host and shows <strong className="font-medium text-foreground">Voice API offline</strong>.
              Use <InlineCode>allow=&quot;microphone&quot;</InlineCode> so the iframe can record.
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
                  Replace <InlineCode>YOUR_APP_ORIGIN</InlineCode> (where you deployed this repo),{" "}
                  <InlineCode>YOUR_WORKER.workers.dev</InlineCode> (Cloudflare), and{" "}
                  <InlineCode>yoursite.com</InlineCode> (parent page origin for <InlineCode>postMessage</InlineCode>).
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
                for embeds on other sites: Worker origin <strong className="font-medium text-foreground">without</strong>{" "}
                <InlineCode>/api</InlineCode>. URL-encode it in the <InlineCode>src</InlineCode> (e.g.{" "}
                <InlineCode>https%3A%2F%2Fxxx.workers.dev</InlineCode>). Without it → “Voice API offline.”
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
                <strong className="font-medium text-foreground">“Voice API offline”</strong> — Add{" "}
                <InlineCode>api_base=&lt;your Worker origin&gt;</InlineCode> to the iframe <InlineCode>src</InlineCode>.
                The static app does not implement <InlineCode>/api</InlineCode>; only the Worker does.
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
