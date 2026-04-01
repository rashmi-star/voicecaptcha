import { Button, buttonVariants } from "@/components/ui/button";
import { VoiceCaptchaLogo, VoiceCaptchaWordmark } from "@/components/VoiceCaptchaLogo";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ArrowRight, Moon, Sun } from "lucide-react";

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
  /** Current page for nav emphasis */
  active: "home" | "developers" | "demo";
};

export function SiteHeader({ theme, onToggleTheme, active }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 outline-offset-4">
          <VoiceCaptchaLogo size="sm" />
          <VoiceCaptchaWordmark className="text-base sm:text-lg" />
        </a>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {active !== "home" ? (
            <a
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground"
              )}
            >
              Product
            </a>
          ) : null}
          {active !== "developers" ? (
            <a
              href="/developers"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground"
              )}
            >
              Developers
            </a>
          ) : null}
          {active === "demo" ? (
            <span
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "cursor-default gap-1.5 font-medium"
              )}
              aria-current="page"
            >
              Live demo
              <ArrowRight className="size-3.5 opacity-70" aria-hidden />
            </span>
          ) : (
            <a
              href="/demo"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "gap-1.5 font-medium"
              )}
            >
              Try demo
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
