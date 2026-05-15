'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_KEYS, CategoryKey } from './categories';

/**
 * SVG constellation for the research hub hero. Each category gets a
 * cluster of nodes arranged radially around a center. Every node has
 * its own phase/orbitSpeed/orbitR/breathSpeed and is derived inline
 * each frame from a single rAF-driven `t` state in this component.
 *
 * Per spec section 5: no setInterval activating "current" nodes (that
 * blinks). Continuous breathing. Reduced-motion freezes at t=0 so the
 * shapes stay visible but the animation stops.
 *
 * Designed to overlay the photo hero on /research at low intensity so
 * it adds motion to the dim atmosphere without obscuring the title.
 * If React reconciliation becomes a hotspot at >150 nodes, the spec
 * authorizes switching to a canvas paint in the rAF loop.
 */

interface Node {
  x: number;
  y: number;
  r: number;
  cat: CategoryKey;
  big: boolean;
  phase: number;
  orbitR: number;
  orbitSpeed: number;
  breathSpeed: number;
}

interface Edge {
  a: Node;
  b: Node;
  cat: CategoryKey;
  phase: number;
}

interface HeroConstellationProps {
  /** Width/height of the SVG viewBox. Defaults match a wide hero banner. */
  width?: number;
  height?: number;
  /** Maps to inverse of speed; 1.0 = default. Lower = slower breathing. */
  motion?: number;
}

export default function HeroConstellation({
  width = 1600,
  height = 540,
  motion = 1,
}: HeroConstellationProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Deterministic positions per render of the page (seeded). Same layout
  // on every mount, no jitter across reloads.
  const clusterCenters = useMemo(() => {
    const centers: Record<CategoryKey, { x: number; y: number }> = {} as Record<CategoryKey, { x: number; y: number }>;
    CATEGORY_KEYS.forEach((c, i) => {
      const angle = (i / CATEGORY_KEYS.length) * Math.PI * 2 + 0.3;
      const r = 0.32;
      centers[c] = {
        x: width * (0.5 + Math.cos(angle) * r),
        y: height * (0.52 + Math.sin(angle) * r * 0.6),
      };
    });
    return centers;
  }, [width, height]);

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    CATEGORY_KEYS.forEach((c) => {
      const center = clusterCenters[c];
      const count = 14 + Math.floor(rand() * 6);
      for (let i = 0; i < count; i++) {
        const rad = 50 + rand() * 110;
        const a = rand() * Math.PI * 2;
        out.push({
          x: center.x + Math.cos(a) * rad,
          y: center.y + Math.sin(a) * rad,
          r: 1.6 + rand() * 2.4,
          cat: c,
          big: false,
          phase: rand() * Math.PI * 2,
          orbitR: 4 + rand() * 8,
          orbitSpeed: 0.3 + rand() * 0.5,
          breathSpeed: 0.6 + rand() * 0.6,
        });
      }
      // Two larger "milestone" nodes per cluster with a soft drop-shadow.
      for (let i = 0; i < 2; i++) {
        const rad = 20 + rand() * 50;
        const a = rand() * Math.PI * 2;
        out.push({
          x: center.x + Math.cos(a) * rad,
          y: center.y + Math.sin(a) * rad,
          r: 4 + rand() * 2,
          cat: c,
          big: true,
          phase: rand() * Math.PI * 2,
          orbitR: 6 + rand() * 6,
          orbitSpeed: 0.25 + rand() * 0.3,
          breathSpeed: 0.4 + rand() * 0.4,
        });
      }
    });
    return out;
  }, [clusterCenters]);

  // Edges: small probability of connection within a cluster, only when
  // two base positions are close. Computed once; the visual length
  // updates each frame as both endpoints orbit independently.
  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    // Deterministic RNG for edge phases so they don't jitter across renders.
    let seed = 13;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    CATEGORY_KEYS.forEach((c) => {
      const cluster = nodes.filter((n) => n.cat === c);
      for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
          const a = cluster[i];
          const b = cluster[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 70 && rand() < 0.35) {
            out.push({ a, b, cat: c, phase: rand() * Math.PI * 2 });
          }
        }
      }
    });
    return out;
  }, [nodes]);

  // Single rAF tick drives the `t` state. Every node's derived position
  // happens inline in render below. Per spec section 5 anti-pattern list:
  // no per-node React state; one t for the whole component tree.
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      setT(((performance.now() - start) * 0.001) * motion);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, motion]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id="tf-hero-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tf-hero-mask">
          <rect width={width} height={height} fill="url(#tf-hero-fade)" />
        </mask>
      </defs>
      <g mask="url(#tf-hero-mask)">
        {edges.map((e, i) => {
          const cat = CATEGORIES[e.cat];
          const ax = e.a.x + Math.cos(t * e.a.orbitSpeed + e.a.phase) * e.a.orbitR;
          const ay = e.a.y + Math.sin(t * e.a.orbitSpeed + e.a.phase) * e.a.orbitR;
          const bx = e.b.x + Math.cos(t * e.b.orbitSpeed + e.b.phase) * e.b.orbitR;
          const by = e.b.y + Math.sin(t * e.b.orbitSpeed + e.b.phase) * e.b.orbitR;
          const o = 0.05 + 0.18 * (Math.sin(t * 0.4 + e.phase) * 0.5 + 0.5);
          return (
            <line
              key={`e${i}`}
              x1={ax}
              y1={ay}
              x2={bx}
              y2={by}
              stroke={cat.color}
              strokeOpacity={o}
              strokeWidth="0.6"
            />
          );
        })}
        {nodes.map((n, i) => {
          const cat = CATEGORIES[n.cat];
          const nx = n.x + Math.cos(t * n.orbitSpeed + n.phase) * n.orbitR;
          const ny = n.y + Math.sin(t * n.orbitSpeed + n.phase) * n.orbitR;
          const breath = Math.sin(t * n.breathSpeed + n.phase) * 0.5 + 0.5;
          const opacity = (n.big ? 0.7 : 0.4) + breath * 0.4;
          const haloR = (n.big ? n.r * 2 : n.r * 1.5) + breath * (n.big ? 3 : 2);
          return (
            <g key={`n${i}`}>
              <circle
                cx={nx}
                cy={ny}
                r={haloR}
                fill={cat.color}
                opacity={(n.big ? 0.1 : 0.06) + breath * 0.08}
              />
              <circle
                cx={nx}
                cy={ny}
                r={n.r + breath * 0.6}
                fill={cat.color}
                opacity={opacity}
                style={n.big ? { filter: `drop-shadow(0 0 6px ${cat.color})` } : undefined}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
