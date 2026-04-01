import { useEffect, useRef } from "react";
import { ORB_CLASS_NAMES } from "@/hooks/useMicVisualizer";

/**
 * Same orb stack as /demo, driven by a synthetic “audio” loop (no mic) — fluid motion for marketing.
 */
export function HeroOrbVisualizer() {
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const t = performance.now() * 0.001;
      // Fake spectrum: slow breathing + shimmer (feels “alive” like the live demo)
      const avg =
        0.14 +
        Math.sin(t * 1.05) * 0.055 +
        Math.sin(t * 2.4 + 1.2) * 0.035 +
        Math.sin(t * 0.6) * 0.02;
      const boost = 0.35 + avg * 1.45;
      const pulse = 0.9 + Math.sin(t * 3.2) * 0.06 * boost;

      orbRefs.current.forEach((orb, i) => {
        if (!orb) return;
        const phase = i * 0.9;
        const wobble = Math.sin(t * 2 + phase) * 0.045 * boost;
        const scale = (1 + wobble) * boost * pulse;
        const rot = Math.sin(t * 1.5 + phase) * 3.2 * boost;
        orb.style.transform = `translate(${Math.sin(t + phase) * 6.5 * boost}%, ${Math.cos(t * 0.82 + phase) * 5.2 * boost}%) scale(${scale}) rotate(${rot}deg)`;
        orb.style.opacity = String(0.62 + avg * 0.38);
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      orbRefs.current.forEach((orb) => {
        if (orb) orb.style.transform = "";
      });
    };
  }, []);

  return (
    <div
      className="stage landing-hero-stage hero-synthetic-orbs relative mx-auto"
      aria-hidden="true"
    >
      <div className="orb-wrap">
        {ORB_CLASS_NAMES.map((cls, i) => (
          <div
            key={cls}
            className={cls}
            ref={(el) => {
              orbRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}
