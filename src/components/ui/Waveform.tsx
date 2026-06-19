"use client";

import { useRef, useEffect } from "react";

interface WaveformProps {
  stream: MediaStream | null;
  active: boolean;
}

export function Waveform({ stream, active }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) return;

    // Each active stream gets a fresh context + analyser so the visualiser
    // always reconnects (e.g. after "Record another").
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    // Browsers start the context suspended until a user gesture — resume it.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const canvasCtx = canvas?.getContext("2d");

    function draw() {
      animRef.current = requestAnimationFrame(draw);
      if (!canvas || !canvasCtx) return;

      // Resize canvas backing store to its rendered size for crisp bars.
      const w = canvas.clientWidth || 280;
      const h = canvas.clientHeight || 48;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 32;
      const step = Math.max(1, Math.floor(bufferLength / barCount));
      const gap = 3;
      const barWidth = canvas.width / barCount - gap;

      for (let i = 0; i < barCount; i++) {
        const value = active ? dataArray[i * step] : 0;
        const percent = value / 255;
        const barHeight = Math.max(2, percent * canvas.height);
        const x = i * (barWidth + gap);

        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
        gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.7)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 1)");

        canvasCtx.fillStyle = gradient;
        canvasCtx.beginPath();
        const radius = 2;
        const x1 = x;
        const y1 = canvas.height - barHeight;
        const x2 = x + barWidth;
        const y2 = canvas.height;
        canvasCtx.moveTo(x1 + radius, y1);
        canvasCtx.lineTo(x2 - radius, y1);
        canvasCtx.quadraticCurveTo(x2, y1, x2, y1 + radius);
        canvasCtx.lineTo(x2, y2 - radius);
        canvasCtx.quadraticCurveTo(x2, y2, x2 - radius, y2);
        canvasCtx.lineTo(x1 + radius, y2);
        canvasCtx.quadraticCurveTo(x1, y2, x1, y2 - radius);
        canvasCtx.lineTo(x1, y1 + radius);
        canvasCtx.quadraticCurveTo(x1, y1, x1 + radius, y1);
        canvasCtx.closePath();
        canvasCtx.fill();
      }
    }

    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      ctx.close().catch(() => {});
    };
  }, [stream, active]);

  return <canvas ref={canvasRef} className="w-full h-12 rounded-lg" />;
}
