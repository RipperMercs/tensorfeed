'use client';

import { useEffect, useRef } from 'react';

/**
 * Warp particle streaks, canvas. Verbatim port of the prototype's
 * WarpField (README section 6). 180 stars, perspective projection,
 * trail decay via destination-out. Bails out entirely under
 * prefers-reduced-motion and cleans up on unmount.
 */
export default function WarpField({ speed = 0.5, density = 180 }: { speed?: number; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
    };

    const stars = Array.from({ length: density }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      pz: 0,
    }));

    resize();
    window.addEventListener('resize', resize);
    let lastT = performance.now();

    const draw = (t: number) => {
      const dt = Math.min((t - lastT) / 16.67, 3);
      lastT = t;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      const focal = Math.max(w, h) * 0.55;
      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed * 0.008 * dt;
        if (s.z <= 0.02) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
          s.pz = 1;
          continue;
        }
        const px = (s.x / s.pz) * focal + cx;
        const py = (s.y / s.pz) * focal + cy;
        const x = (s.x / s.z) * focal + cx;
        const y = (s.y / s.z) * focal + cy;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;
        const depth = 1 - s.z;
        const size = 0.4 + depth * 1.8;
        const alpha = 0.35 + depth * 0.65;
        ctx.strokeStyle = `rgba(220,235,255,${alpha * 0.55})`;
        ctx.lineWidth = size * 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [speed, density]);

  return <canvas ref={ref} className="tf-warp" aria-hidden="true" />;
}
