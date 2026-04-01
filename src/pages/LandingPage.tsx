import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Code2,
  Layers,
  Mic,
  Moon,
  Rocket,
  Shield,
  Sun,
  Workflow,
} from "lucide-react";

const iframeSnippet = `<iframe
  title="Voice CAPTCHA"
  src="https://YOUR_APP_ORIGIN/embed?api_base=YOUR_WORKER_ORIGIN&parent_origin=YOUR_SITE"
  width="420"
  height="560"
  style="border: 1px solid oklch(0.9 0 0); border-radius: 12px;"
></iframe>`;

const listenerSnippet = `window.addEventListener("message", (e) => {
  if (e.origin !== "https://YOUR_APP_ORIGIN") return;
  const d = e.data;
  if (d?.type !== "voicecaptcha" || d.version !== 1) return;
  if (d.event === "ready") return;
  if (d.ok) {
    // allow submit — voice + your server checks passed
  }
});`;

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="theme min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="font-heading text-sm font-semibold tracking-tight">
            Voice CAPTCHA
          </a>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href="/demo"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground"
              )}
            >
              Live demo
            </a>
            <a href="/embed-demo.html" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Embed test
            </a>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Human-in-the-loop verification
            </Badge>
            <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Prove a person is speaking — not a bot replaying audio
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Combine familiar tools like reCAPTCHA with a spoken phrase check. Users read a
              random sentence; your backend scores the recording for match and human-like speech.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="/demo" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                Try the interactive demo
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#integrate"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Add to your site
              </a>
            </div>
          </div>
        </section>

        <Separator />

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Why this exists
            </h2>
            <p className="mt-2 text-muted-foreground">
              Puzzles and checkboxes catch many bots, but layered checks work best when something
              must be generated live.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Shield className="size-4 text-foreground" />
                </div>
                <CardTitle>Defense in depth</CardTitle>
                <CardDescription>
                  reCAPTCHA reduces automated abuse; voice verification adds a signal that is hard
                  to fake without a real speaker each time.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Mic className="size-4 text-foreground" />
                </div>
                <CardTitle>Fresh audio each session</CardTitle>
                <CardDescription>
                  Phrases come from your API per challenge. Playback of old clips is less likely
                  to match wording and timing expectations.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Workflow className="size-4 text-foreground" />
                </div>
                <CardTitle>Fits your stack</CardTitle>
                <CardDescription>
                  Drop in an iframe widget, listen for <code className="text-xs">postMessage</code>
                  , and keep your own rate limits and policies on the server.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Alert>
              <Layers className="size-4" />
              <AlertTitle>What we are building</AlertTitle>
              <AlertDescription className="mt-2 text-pretty leading-relaxed">
                A developer-friendly voice challenge: browser capture → Cloudflare Worker with
                speech-to-text and heuristics → clear pass / retry / suspected-bot outcomes. The UI
                can sit beside Google reCAPTCHA (checkbox or invisible) so you gate the mic the
                same way you gate forms today — then require a successful voice result before
                sensitive actions.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        <section id="integrate" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              How to add it to your website
            </h2>
            <p className="mt-2 text-muted-foreground">
              Host the static app, deploy the Worker API, then embed the widget and verify messages
              on the parent page.
            </p>
          </div>

          <Tabs defaultValue="embed" className="mx-auto mt-10 max-w-3xl">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
              <TabsTrigger value="embed" className="gap-2">
                <Code2 className="size-3.5" />
                Iframe embed
              </TabsTrigger>
              <TabsTrigger value="recaptcha" className="gap-2">
                <Shield className="size-3.5" />
                With reCAPTCHA
              </TabsTrigger>
              <TabsTrigger value="deploy" className="gap-2">
                <Rocket className="size-3.5" />
                Vercel + Worker
              </TabsTrigger>
            </TabsList>
            <TabsContent value="embed" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>1. Point an iframe at <code className="text-sm">/embed</code></CardTitle>
                  <CardDescription>
                    Optional query params: <code className="text-xs">api_base</code> (Worker URL
                    without <code className="text-xs">/api</code>),{" "}
                    <code className="text-xs">parent_origin</code> for secure{" "}
                    <code className="text-xs">postMessage</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-left text-xs leading-relaxed">
                    <code>{iframeSnippet}</code>
                  </pre>
                  <p className="text-sm text-muted-foreground">
                    2. In the parent window, validate <code className="text-xs">origin</code> and
                    handle results:
                  </p>
                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-left text-xs leading-relaxed">
                    <code>{listenerSnippet}</code>
                  </pre>
                  <p className="text-sm text-muted-foreground">
                    Full details: <code className="text-xs">EMBED.md</code> and{" "}
                    <code className="text-xs">DEPLOY.md</code> in the repository.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recaptcha" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended layout</CardTitle>
                  <CardDescription>
                    Keep reCAPTCHA on the parent page (as in our live demo). Only after the
                    checkbox or invisible challenge succeeds should you enable recording or submit
                    the form together with both signals.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    The embed route (<code className="text-xs">/embed</code>) ships without the
                    split reCAPTCHA panel — it is meant to drop into your layout next to your own
                    CAPTCHA or auth flow.
                  </p>
                  <p>
                    For the full split view (reCAPTCHA + voice + visualizer), open{" "}
                    <a href="/demo" className="font-medium text-foreground underline underline-offset-4">
                      /demo
                    </a>
                    .
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="deploy" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Two separate deployments</CardTitle>
                  <CardDescription>
                    Ship the static site and the Worker on their own schedules — different projects,
                    URLs, and env vars. The UI is on Vercel (or similar); the API + secrets stay on
                    Cloudflare.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Vercel:</strong> deploy the Vite app. Set
                    only public vars such as{" "}
                    <code className="text-xs">VITE_RECAPTCHA_SITE_KEY</code> (reCAPTCHA site keys are
                    meant to be public).
                  </p>
                  <p>
                    <strong className="text-foreground">ElevenLabs &amp; Groq:</strong> configure
                    on the <strong className="text-foreground">Cloudflare Worker</strong>, e.g.{" "}
                    <code className="text-xs">wrangler secret put ELEVENLABS_API_KEY</code> and{" "}
                    <code className="text-xs">wrangler secret put GROQ_API_KEY</code>. The optional
                    “Play ElevenLabs voice” button appears when the Worker exposes TTS via that
                    secret.
                  </p>
                  <p>
                    <strong className="text-foreground">Embed:</strong> point{" "}
                    <code className="text-xs">api_base</code> at your Worker URL so the iframe loads
                    challenges and verify from the edge — not from Vercel serverless.
                  </p>
                  <p className="text-xs">
                    Step-by-step: <code>README.md</code> and <code>DEPLOY.md</code>; Worker-only:{" "}
                    <code>workers/voice-captcha-api/README.md</code>.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="font-heading text-center text-xl font-semibold tracking-tight">
            FAQ
          </h2>
          <Accordion defaultValue={[]} className="mt-6 w-full">
            <AccordionItem value="a">
              <AccordionTrigger>Does this replace reCAPTCHA?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. It complements it. Use reCAPTCHA (or similar) for broad bot friction and use
                voice verification when you need an extra live-human signal.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>What about accessibility?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Spoken challenges help some users and hinder others. Offer alternative paths
                (support, different factor) where required by policy or WCAG-aligned practice.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Where does the API run?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The reference implementation uses a Cloudflare Worker; you configure CORS and
                secrets for your STT / scoring providers. Point <code className="text-xs">api_base</code>{" "}
                at that deployment when the app is not same-origin.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="d">
              <AccordionTrigger>Do I add my ElevenLabs key in Vercel?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. ElevenLabs is used only on the server (Worker) for <code className="text-xs">/api/tts-demo</code>{" "}
                and health checks. Put <code className="text-xs">ELEVENLABS_API_KEY</code> in
                Wrangler secrets, not in Vercel — otherwise you would expose paid API usage or tempt
                shipping keys to the client.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left sm:px-6">
          <span>Voice CAPTCHA — hackathon-style reference implementation.</span>
          <div className="flex gap-4">
            <a href="/demo" className="hover:text-foreground">
              Demo
            </a>
            <a href="/embed" className="hover:text-foreground">
              Embed UI
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
