"use client";

import { useEffect, useRef } from "react";

// Live voice level while recording: bars follow the microphone, so the person
// sees their voice being kept. Reads an AnalyserNode every frame and writes
// straight to the bars (no React renders per frame).

const BARS = 28;

export function LiveWave({ stream }: { stream: MediaStream }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.72;
    context.createMediaStreamSource(stream).connect(analyser);
    const levels = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      analyser.getByteFrequencyData(levels);
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        // Voice sits in the lower bins; mirror them so the wave is centred.
        const bin = Math.abs(i - BARS / 2) + 2;
        const level = levels[bin] / 255;
        bar.style.scale = `1 ${Math.max(0.12, level).toFixed(3)}`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      void context.close();
    };
  }, [stream]);

  return (
    <div className="live-wave" aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          ref={(node) => {
            bars.current[i] = node;
          }}
        />
      ))}
    </div>
  );
}
