import { useCallback, useEffect, useRef } from "react";

export const ORB_CLASS_NAMES = ["orb orb-1", "orb orb-2", "orb orb-3", "orb orb-4"];

/**
 * Web Audio analyser + rAF loop driving the orb “Siri-style” visualizer from a mic stream.
 */
export function useMicVisualizer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(
    null
  );
  const animationRef = useRef<number>(0);
  const streamSetupGenRef = useRef(0);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const disconnectNodes = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopVisualizerLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    orbRefs.current.forEach((orb) => {
      if (orb) orb.style.transform = "";
    });
    stageRef.current?.classList.remove("active");
  }, []);

  const runVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    stageRef.current?.classList.add("active");
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const time = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      animationRef.current = requestAnimationFrame(tick);
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      const n = Math.min(freq.length, 64);
      for (let i = 0; i < n; i++) sum += freq[i];
      const avg = sum / n / 255;
      const boost = 0.35 + avg * 1.4;

      analyser.getByteTimeDomainData(time);
      let peak = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      const pulse = 0.92 + peak * 0.35;

      const t = performance.now() * 0.001;
      orbRefs.current.forEach((orb, i) => {
        if (!orb) return;
        const phase = i * 0.9;
        const wobble = Math.sin(t * 2 + phase) * 0.04 * boost;
        const scale = (1 + wobble) * boost * pulse;
        const rot = Math.sin(t * 1.5 + phase) * 3 * boost;
        orb.style.transform = `translate(${Math.sin(t + phase) * 6 * boost}%, ${Math.cos(t * 0.8 + phase) * 5 * boost}%) scale(${scale}) rotate(${rot}deg)`;
        orb.style.opacity = String(0.65 + avg * 0.35);
      });
    };
    tick();
  }, []);

  const handleVoiceCaptchaStream = useCallback(
    (stream: MediaStream | null) => {
      streamSetupGenRef.current += 1;
      const gen = streamSetupGenRef.current;
      disconnectNodes();
      stopVisualizerLoop();
      if (!stream) return;

      void (async () => {
        await ensureAudioContext();
        if (gen !== streamSetupGenRef.current) return;
        const ctx = audioContextRef.current;
        if (!ctx) return;

        disconnectNodes();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.65;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;
        sourceRef.current = source;
        if (gen !== streamSetupGenRef.current) return;
        runVisualizer();
      })();
    },
    [disconnectNodes, ensureAudioContext, runVisualizer, stopVisualizerLoop]
  );

  useEffect(() => {
    return () => {
      disconnectNodes();
      stopVisualizerLoop();
    };
  }, [disconnectNodes, stopVisualizerLoop]);

  return { stageRef, orbRefs, handleVoiceCaptchaStream };
}
