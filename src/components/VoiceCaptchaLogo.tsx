import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Larger icon for hero; compact for header */
  size?: "sm" | "md" | "lg";
};

const sizeMap = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-16 w-16 md:h-20 md:w-20" };

/**
 * Brand mark: classic studio / handheld microphone (filled silhouette) inside a shield.
 * Paths follow the familiar “audio mic” glyph: capsule head + clip/stand body.
 */
export function VoiceCaptchaLogo({ className, size = "md" }: Props) {
  return (
    <svg
      className={cn("shrink-0 text-primary", sizeMap[size], className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4L8 10v14c0 9.4 6.8 18.2 16 20 9.2-1.8 16-10.6 16-20V10L24 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-primary"
        fill="none"
      />

      {/* Heroicons-style mic (24×24) scaled & centered inside shield */}
      <g
        fill="currentColor"
        className="text-foreground"
        transform="translate(11.5, 7) scale(1.05)"
      >
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
      </g>
    </svg>
  );
}

export function VoiceCaptchaWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-semibold tracking-tight text-foreground", className)}>
      Voice CAPTCHA
    </span>
  );
}
