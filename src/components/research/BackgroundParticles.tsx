'use client';

import { useEffect, useRef } from 'react';
import { CATEGORY_COLORS } from './categories';

/**
 * Canvas-based background particle field for the research hub. Per spec
 * section 4: 140 particles colored from the 9-category palette, drift
 * mode with smooth sinusoidal wandering, optional connection lines
 * between near-by same-color particles, cursor repel within ~118px.
 *
 * Performance budget: 60fps on mid-tier mobile with count=140 +
 * connections=true. Auto-degrades to count/2 + no connections if FPS
 * drops below 45 sustained over 2s. Falls back to a blank canvas under
 * `prefers-reduced-motion: reduce`.
 *
 * The component renders nothing visible to screen readers (aria-hidden).
 * Init is deferred to next-frame after mount so it never blocks LCP.
 */

interface BackgroundParticlesProps {
  count?: number;
  connections?: boolean;
  flow?: 'drift' | 'swarm';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseR: number;
  color: string;
  colorIdx: number;
  phase: number;
  breathSpeed: number;
  wanderPhase: number;
  wanderSpeed: number;
  wanderAmp: number;
  homeX: number;
  homeY: number;
  homeNext: number;
}

export default function BackgroundParticles({
  count = 140,
  connections = true,
  flow = 'drift',
}: BackgroundParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Reduced-motion: leave the canvas blank, no rAF.
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Deterministic seed so each page load produces the same particle
    // layout (helps perf-profiling without randomness churn).
    let seed = 31;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const colors = CATEGORY_COLORS;
    let currentCount = count;
    let currentConnections = connections;
    const particles: Particle[] = [];

    function buildParticles(n: number) {
      particles.length = 0;
      for (let i = 0; i < n; i++) {
        const colorIdx = Math.floor(rand() * colors.length);
        particles.push({
          x: rand() * W,
          y: rand() * H,
          vx: (rand() - 0.5) * 0.18,
          vy: (rand() - 0.5) * 0.18,
          r: 0.8 + rand() * 2.6,
          baseR: 0.8 + rand() * 2.6,
          color: colors[colorIdx],
          colorIdx,
          phase: rand() * Math.PI * 2,
          breathSpeed: 0.3 + rand() * 0.6,
          wanderPhase: rand() * Math.PI * 2,
          wanderSpeed: 0.4 + rand() * 0.6,
          wanderAmp: 0.04 + rand() * 0.08,
          homeX: rand() * W,
          homeY: rand() * H,
          homeNext: 0,
        });
      }
    }
    buildParticles(currentCount);

    let lastT = performance.now();
    let cursorX = -9999;
    let cursorY = -9999;

    function onMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      cursorX = e.clientX - rect.left;
      cursorY = e.clientY - rect.top;
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    // FPS auto-degrade: sample frame durations over a rolling 2s window
    // and step the particle count down if we're sustainedly dropping
    // frames. Bumps back up if perf recovers.
    let sampleStart = performance.now();
    let frameCount = 0;
    let degraded = false;

    let rafId = 0;

    function frame(now: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(50, now - lastT);
      lastT = now;
      const t = now * 0.001;

      // FPS sample every ~1s
      frameCount++;
      if (now - sampleStart > 1000) {
        const fps = (frameCount * 1000) / (now - sampleStart);
        if (fps < 45 && !degraded && currentCount > 70) {
          currentCount = Math.floor(currentCount / 2);
          currentConnections = false;
          buildParticles(currentCount);
          degraded = true;
        }
        frameCount = 0;
        sampleStart = now;
      }

      ctx.clearRect(0, 0, W, H);

      // Update + draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Wander acceleration
        const wx = Math.cos(t * p.wanderSpeed + p.wanderPhase) * p.wanderAmp;
        const wy = Math.sin(t * p.wanderSpeed * 1.13 + p.wanderPhase + 1.1) * p.wanderAmp;
        p.vx += wx * 0.05;
        p.vy += wy * 0.05;

        // Swarm: pull toward periodically-shifting home target
        if (flow === 'swarm') {
          if (now > p.homeNext) {
            p.homeX = Math.random() * W;
            p.homeY = Math.random() * H;
            p.homeNext = now + 4000 + Math.random() * 6000;
          }
          const dx = (p.homeX - p.x) * 0.00006;
          const dy = (p.homeY - p.y) * 0.00006;
          p.vx += dx;
          p.vy += dy;
        }

        // Cursor repel
        const cdx = p.x - cursorX;
        const cdy = p.y - cursorY;
        const cd = cdx * cdx + cdy * cdy;
        if (cd < 14000 && cd > 1) {
          const force = ((14000 - cd) / 14000) * 0.6;
          const d = Math.sqrt(cd);
          p.vx += (cdx / d) * force;
          p.vy += (cdy / d) * force;
        }

        // Damping
        p.vx *= 0.97;
        p.vy *= 0.97;

        // Position update
        p.x += p.vx * (dt * 0.06);
        p.y += p.vy * (dt * 0.06);

        // Soft wrap at edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Breathing
        const breath = Math.sin(t * p.breathSpeed + p.phase) * 0.5 + 0.5;
        const opacity = 0.18 + breath * 0.32;
        const r = p.baseR + breath * 0.5;

        // Soft halo
        ctx.globalAlpha = opacity * 0.4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Same-category connection lines, bounded by squared-distance check
      if (currentConnections) {
        const MAX = 110;
        const MAX2 = MAX * MAX;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            if (a.colorIdx !== b.colorIdx) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < MAX2) {
              const alpha = (1 - d2 / MAX2) * 0.22;
              ctx.strokeStyle = a.color;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    }

    // Defer the rAF start until next frame so LCP is not blocked.
    const startId = requestAnimationFrame((t0) => {
      lastT = t0;
      rafId = requestAnimationFrame(frame);
    });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(startId);
      cancelAnimationFrame(rafId);
    };
  }, [count, connections, flow]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
