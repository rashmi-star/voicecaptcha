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
  style="border-radius: 12px; box-shadow: 0 0 0 1px oklch(0.88 0 0 / 0.5);"
></iframe>`;

const dynamicEmbedSnippet = `const iframe = document.createElement("iframe");
iframe.title = "Voice CAPTCHA";
iframe.width = "420";
iframe.height = "560";
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
              Embed the voice widget in an iframe and listen for results with{" "}
              <InlineCode>postMessage</InlineCode>. Verification runs against your deployed API (
              <InlineCode>api_base</InlineCode>); secrets stay on the server (e.g. Cloudflare Worker),
              not in the parent page.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              1. Load the Voice CAPTCHA widget
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The widget is the <InlineCode>/embed</InlineCode> route on your static host. Treat it
              like any third-party iframe: don’t assume it is ready until it has loaded, and prefer
              validating the <InlineCode>ready</InlineCode> message (below) before relying on the mic
              UI for critical UX.
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
                  Replace placeholders with your deployed app URL, Worker base (no{" "}
                  <InlineCode>/api</InlineCode>), and your site origin for{" "}
                  <InlineCode>parent_origin</InlineCode>.
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
                  Useful if you inject the widget after your page or shell is ready—avoids racing the
                  iframe before the DOM exists.
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
              Always check <InlineCode>e.origin</InlineCode> matches the origin that hosts{" "}
              <InlineCode>/embed</InlineCode>. Messages use <InlineCode>type: &quot;voicecaptcha&quot;</InlineCode>{" "}
              and <InlineCode>version: 1</InlineCode>. The <InlineCode>ready</InlineCode> event means the
              iframe loaded; pass/fail comes on later messages when the user taps Check.
            </p>
            <pre className={preClass}>
              <code>{listenerSnippet}</code>
            </pre>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              3. Query parameters
            </h2>
            <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>
                <InlineCode>api_base</InlineCode> — Base URL of your Voice CAPTCHA API (Worker){" "}
                <strong className="font-medium text-foreground">without</strong>{" "}
                <InlineCode>/api</InlineCode>. Omit only when the embed is same-origin and proxied to
                the API (typical local dev).
              </li>
              <li>
                <InlineCode>parent_origin</InlineCode> — Your site’s origin for secure{" "}
                <InlineCode>postMessage</InlineCode> targeting (use a real origin in production, not{" "}
                <InlineCode>*</InlineCode>).
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              4. Suggested flow on your page
            </h2>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
              <li>Render the iframe (static HTML or JS).</li>
              <li>
                Optionally wait for <InlineCode>event: &quot;ready&quot;</InlineCode> before emphasizing the
                voice step.
              </li>
              <li>
                When the user passes (<InlineCode>ok: true</InlineCode>), continue checkout, signup, or
                admin action.
              </li>
              <li>
                Enforce limits and server-side checks on your Worker; the iframe is only the client UI.
              </li>
            </ol>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can combine this with any other abuse signal on the parent page (for example a
              checkbox CAPTCHA). Voice CAPTCHA only covers the spoken verification step.
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
