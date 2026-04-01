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

/** Widget host (iframe `src` origin). */
const VOICECAPTCHA_APP_ORIGIN = "https://voicecaptcha.vercel.app";
/** Public verification API — use as `api_base` (no `/api` suffix). */
const VOICECAPTCHA_PUBLIC_API_ORIGIN = "https://voice-captcha-api.rashmie30.workers.dev";
const VOICECAPTCHA_API_BASE_ENCODED = encodeURIComponent(VOICECAPTCHA_PUBLIC_API_ORIGIN);

const preconnectSnippet = `<!-- Optional: preconnect to embed host and verification API -->
<link rel="preconnect" href="${VOICECAPTCHA_APP_ORIGIN}" />
<link rel="preconnect" href="${VOICECAPTCHA_PUBLIC_API_ORIGIN}" />`;

const fullPageLoadingSample = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Voice CAPTCHA — loading sample</title>
${preconnectSnippet.split("\n").map((line) => "  " + line).join("\n")}
</head>
<body>
  <iframe
    id="voicecaptcha"
    title="Voice CAPTCHA"
    src="${VOICECAPTCHA_APP_ORIGIN}/embed?api_base=${VOICECAPTCHA_API_BASE_ENCODED}&parent_origin=https%3A%2F%2Fyoursite.com"
    width="420"
    height="560"
    allow="microphone"
  ></iframe>
  <script>
    window.addEventListener("message", (e) => {
      if (e.origin !== "${VOICECAPTCHA_APP_ORIGIN}") return;
      const d = e.data;
      if (d?.type !== "voicecaptcha" || d.version !== 1) return;
      if (d.event === "ready") {
        // Like grecaptcha.ready(): widget finished loading — safe to enable dependent UI
        return;
      }
      if (d.ok) {
        /* user passed */
      }
    });
  </script>
</body>
</html>`;

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
              Drop in an <strong className="font-medium text-foreground">iframe</strong>, pass one{" "}
              <strong className="font-medium text-foreground">API URL</strong> as <InlineCode>api_base</InlineCode> (see
              below), and listen for <InlineCode>postMessage</InlineCode> when the user passes or fails.{" "}
              <strong className="font-medium text-foreground">No API keys</strong> on your site — verification runs on
              our side.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              1. Load the Voice CAPTCHA widget
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The widget lives at <InlineCode>{VOICECAPTCHA_APP_ORIGIN}/embed</InlineCode>. Add{" "}
              <InlineCode>api_base</InlineCode> with the verification API URL below (no <InlineCode>/api</InlineCode> at
              the end) — otherwise the iframe shows <strong className="font-medium text-foreground">Voice API offline</strong>.
              Use <InlineCode>allow=&quot;microphone&quot;</InlineCode> on the iframe.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Same pattern as{" "}
              <a
                href="https://developers.google.com/recaptcha/docs/loading"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Google’s “Loading reCAPTCHA”
              </a>
              : use <InlineCode>preconnect</InlineCode> for third-party origins when you can, and don’t treat the widget as
              ready until it fires <InlineCode>event: &quot;ready&quot;</InlineCode> (like{" "}
              <InlineCode>grecaptcha.ready()</InlineCode>).
            </p>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Full page sample (preconnect + iframe + listener)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Copy-paste starting point: replace <InlineCode>yoursite.com</InlineCode> in{" "}
                  <InlineCode>parent_origin</InlineCode>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className={preClass}>
                  <code>{fullPageLoadingSample}</code>
                </pre>
              </CardContent>
            </Card>

            <Card className="ring-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Optional: preconnect resource hints
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Reduces time to first connection to the embed host and verification API.
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
                  Replace <InlineCode>yoursite.com</InlineCode> with your site’s origin for <InlineCode>parent_origin</InlineCode>.
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
                <InlineCode>api_base</InlineCode> — <strong className="font-medium text-foreground">Required</strong> when
                embedding on another domain: the verification API base URL <strong className="font-medium text-foreground">without</strong>{" "}
                <InlineCode>/api</InlineCode> (same value as in the snippets). URL-encode it in the iframe{" "}
                <InlineCode>src</InlineCode>. Without it → “Voice API offline.”
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
                <strong className="font-medium text-foreground">“Voice API offline”</strong> — Include{" "}
                <InlineCode>api_base</InlineCode> with the API URL from the snippets. The page that hosts the iframe does
                not provide the verification API by itself.
              </li>
              <li>
                <strong className="font-medium text-foreground">Mic never starts</strong> — Ensure{" "}
                <InlineCode>allow=&quot;microphone&quot;</InlineCode> on the iframe (and use HTTPS).
              </li>
              <li>
                <strong className="font-medium text-foreground">Routing</strong> — The Voice CAPTCHA app host must serve{" "}
                <InlineCode>/embed</InlineCode> as the same SPA shell (already configured for our deployment).
              </li>
              <li>
                <strong className="font-medium text-foreground">Security</strong> — Check <InlineCode>event.origin</InlineCode>{" "}
                in your listener. Use your own bot checks (e.g. reCAPTCHA) on the parent page; add rate limits where you
                integrate.
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
              <li>Add your own rate limits and abuse protections on your side.</li>
            </ol>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Voice CAPTCHA only covers the spoken verification step — add other signals (CAPTCHA, auth) on your site as
              needed.
            </p>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-10">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Open source &amp; self-hosting
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can run the full stack from this project’s{" "}
              <a
                href="https://github.com/rashmi-star/voicecaptcha"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                GitHub repository
              </a>
              . Backend setup and deployment are documented there for developers who want to host their own
              infrastructure — not required to embed the hosted widget above.
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
