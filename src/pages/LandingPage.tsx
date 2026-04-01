import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroOrbVisualizer } from "@/components/HeroOrbVisualizer";
import { SiteHeader } from "@/components/SiteHeader";
import { VoiceCaptchaLogo, VoiceCaptchaWordmark } from "@/components/VoiceCaptchaLogo";
import { applyTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Mic, Shield, Sparkles } from "lucide-react";

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="theme min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        active="home"
      />

      <main>
        {/* Hero: orb visualizer (same stack as demo) + copy — no blue wash */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07] [background-image:radial-gradient(oklch(0.45_0_0)_1px,transparent_1px)] [background-size:20px_20px]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,1fr)] lg:gap-16 lg:py-24">
            {/* Mobile: orbs first; desktop: copy left */}
            <div className="order-1 flex flex-col items-center justify-center lg:order-2 lg:items-end">
              <div className="flex w-full max-w-[440px] flex-col items-center lg:items-end">
                <HeroOrbVisualizer />
              </div>
            </div>

            <div className="order-2 space-y-6 text-center lg:order-1 lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <VoiceCaptchaLogo size="lg" />
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Voice verification
                </p>
                <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                  Stop bots without the squiggly letters
                </h1>
                <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg lg:max-w-none">
                  Voice CAPTCHA replaces hard-to-read text puzzles with a simple spoken challenge:
                  users say a short phrase aloud so you can tell real people from automated
                  scripts—without typing distorted characters.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a href="/demo" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-8")}>
                  Try the live demo
                  <ArrowRight className="size-4" aria-hidden />
                </a>
                <a
                  href="/developers"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}
                >
                  Developer setup
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-muted/15 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Why teams use voice
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Traditional CAPTCHAs frustrate humans and still get bypassed by bots. A spoken check
              asks for something that’s easy for a person to do right now—and harder for a script to
              fake at scale.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              <Card className="border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">Bot vs human</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Each session gets a fresh phrase. That makes replayed clips and canned audio less
                    likely to match what you asked for.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mic className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">Natural for many users</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Speaking is often faster than typing wavy text—especially on phones—while still
                    raising the bar for bots.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">Works with what you already use</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Pair with familiar bot checks (like reCAPTCHA) when you want both a browser
                    signal and a live voice step for sensitive actions.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              How it feels for your users
            </h2>
            <p className="mt-3 text-center text-muted-foreground">
              Three simple steps—no developer jargon required.
            </p>
            <ol className="mt-10 space-y-6">
              {[
                {
                  title: "See the phrase",
                  body: "The screen shows a short sentence to read aloud—different each time.",
                },
                {
                  title: "Speak clearly",
                  body: "They use the microphone and say the phrase in order, then confirm.",
                },
                {
                  title: "Clear or try again",
                  body: "If it matches, they’re through. If not, they get a clear message to retry.",
                },
              ].map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-xl border border-border/60 bg-muted/10 p-5 sm:p-6"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading font-semibold">{step.title}</h3>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/10 py-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 text-center sm:px-6">
            <CheckCircle2 className="size-8 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Voice CAPTCHA is built for teams that want a stronger “real person” signal than
              distorted text alone—without turning your signup flow into a puzzle game.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 pb-20 pt-4 sm:px-6">
          <h2 className="text-center font-heading text-xl font-semibold tracking-tight">
            Questions
          </h2>
          <Accordion className="mt-6 w-full" multiple={false}>
            <AccordionItem value="a">
              <AccordionTrigger>Does this replace reCAPTCHA?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Not necessarily. Many products use both: a familiar checkbox or invisible challenge
                for broad bot friction, plus a voice step when you need extra confidence that a
                human is present.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>What about accessibility?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Voice isn’t perfect for everyone. Offer a fallback path where your policy allows—
                for example support verification or another factor—so no one is blocked solely by
                this step.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Can bots still pass?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Determined attackers can try recordings or synthetic speech. Voice CAPTCHA raises the
                bar and stops casual automation; combine it with rate limits, fraud signals, and your
                own policies for high-stakes flows.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left sm:px-6">
          <div className="flex items-center gap-2">
            <VoiceCaptchaLogo size="sm" />
            <VoiceCaptchaWordmark className="text-sm" />
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
            <a href="/developers" className="hover:text-foreground">
              Developers
            </a>
            <a
              href="/demo"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Try live demo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
