'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_KEYS, CategoryKey } from './categories';

/**
 * SVG knowledge landscape for the research hub. Shows a 3×3 grid of
 * category clusters with cross-cluster "knowledge flow" lines between
 * random milestone nodes that mostly stay dark and briefly brighten.
 *
 * Per spec section 5: same orbit + breathing approach as HeroConstellation
 * (one global rAF tick drives `t`, all positions/opacities derived inline),
 * with the addition of 18 flow lines on their own slow cycle (0.15-0.25
 * rad/s) that wave in and out independently of node breathing.
 *
 * ~24 small + 3 milestone nodes per cluster = ~243 nodes total. If
 * React reconciliation profiles as a hotspot, the spec authorizes
 * switching the render to a canvas paint inside the rAF loop.
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

interface FlowEdge {
  a: Node;
  b: Node;
  phase: number;
  cycleSpeed: number;
}

interface KnowledgeLandscapeProps {
  width?: number;
  height?: number;
  motion?: number;
}

const COLS = 3;
const ROWS = 3;
const SMALL_NODES_MIN = 18;
const SMALL_NODES_MAX = 26;
const BIG_NODES_PER_CLUSTER = 3;
const FLOW_LINE_COUNT = 18;

export default function KnowledgeLandscape({
  width = 1400,
  height = 380,
  motion = 1,
}: KnowledgeLandscapeProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Deterministic node positions seeded so re-renders never re-shuffle.
  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    let seed = 23;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    CATEGORY_KEYS.forEach((c, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const cx = ((col + 0.5) / COLS) * width;
      const cy = ((row + 0.5) / ROWS) * height;
      const count = SMALL_NODES_MIN + Math.floor(rand() * (SMALL_NODES_MAX - SMALL_NODES_MIN));
      for (let i = 0; i < count; i++) {
        const rad = 8 + rand() * 80;
        const a = rand() * Math.PI * 2;
        out.push({
          x: cx + Math.cos(a) * rad,
          y: cy + Math.sin(a) * rad,
          r: 1.6 + rand() * 2.6,
          cat: c,
          big: false,
          phase: rand() * Math.PI * 2,
          orbitR: 3 + rand() * 6,
          orbitSpeed: 0.25 + rand() * 0.5,
          breathSpeed: 0.4 + rand() * 0.6,
        });
      }
      for (let i = 0; i < BIG_NODES_PER_CLUSTER; i++) {
        const rad = 5 + rand() * 30;
        const a = rand() * Math.PI * 2;
        out.push({
          x: cx + Math.cos(a) * rad,
          y: cy + Math.sin(a) * rad,
          r: 5 + rand() * 3,
          cat: c,
          big: true,
          phase: rand() * Math.PI * 2,
          orbitR: 4 + rand() * 4,
          orbitSpeed: 0.2 + rand() * 0.3,
          breathSpeed: 0.3 + rand() * 0.4,
        });
      }
    });
    return out;
  }, [width, height]);

  // Cross-cluster citation flow edges. Each edge has its own slow cycle
  // so the field reads as "occasional brightening between distant ideas".
  const flowEdges = useMemo<FlowEdge[]>(() => {
    const out: FlowEdge[] = [];
    let seed = 91;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const bigs = nodes.filter((n) => n.big);
    if (bigs.length < 2) return out;
    for (let i = 0; i < FLOW_LINE_COUNT; i++) {
      const a = bigs[Math.floor(rand() * bigs.length)];
      const b = bigs[Math.floor(rand() * bigs.length)];
      if (a !== b) {
        out.push({
          a,
          b,
          phase: rand() * Math.PI * 2,
          cycleSpeed: 0.15 + rand() * 0.25,
        });
      }
    }
    return out;
  }, [nodes]);

  // Single rAF tick drives all derived positions.
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

  // Cluster labels are positioned via percentage so they re-flow with
  // any width/height change. Each label sits above its cluster center.
  const clusterLabels = useMemo(
    () =>
      CATEGORY_KEYS.map((c, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        return {
          cat: c,
          x: ((col + 0.5) / COLS) * 100,
          y: ((row + 0.5) / ROWS) * 100,
        };
      }),
    [],
  );

  return (
    <section
      aria-labelledby="tf-landscape-heading"
      className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <h2
          id="tf-landscape-heading"
          className="text-sm font-mono uppercase tracking-[0.14em] text-text-secondary"
        >
          Research landscape · last 90 days
        </h2>
        <div className="hidden sm:flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
          {CATEGORY_KEYS.slice(0, 6).map((k) => {
            const cat = CATEGORIES[k];
            return (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: cat.color }}
                  aria-hidden="true"
                />
                {cat.name}
              </span>
            );
          })}
        </div>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ width: '100%', height: 'auto', minHeight: 320, display: 'block' }}
        >
          {/* Cross-cluster citation flow lines. Mostly dark, briefly bright,
              each with its own slow cycle. Drawn first so nodes sit on top. */}
          {flowEdges.map((e, i) => {
            const ax = e.a.x + Math.cos(t * e.a.orbitSpeed + e.a.phase) * e.a.orbitR;
            const ay = e.a.y + Math.sin(t * e.a.orbitSpeed + e.a.phase) * e.a.orbitR;
            const bx = e.b.x + Math.cos(t * e.b.orbitSpeed + e.b.phase) * e.b.orbitR;
            const by = e.b.y + Math.sin(t * e.b.orbitSpeed + e.b.phase) * e.b.orbitR;
            const wave = Math.sin(t * e.cycleSpeed + e.phase) * 0.5 + 0.5;
            const opacity = Math.max(0, wave - 0.55) * 0.85;
            const ca = CATEGORIES[e.a.cat].color;
            const cb = CATEGORIES[e.b.cat].color;
            const gid = `tf-landscape-edge-${i}`;
            return (
              <g key={`e${i}`}>
                <defs>
                  <linearGradient
                    id={gid}
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={ca} stopOpacity={opacity} />
                    <stop offset="100%" stopColor={cb} stopOpacity={opacity} />
                  </linearGradient>
                </defs>
                <line
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  stroke={`url(#${gid})`}
                  strokeWidth="0.8"
                />
              </g>
            );
          })}

          {/* Nodes. Big milestone nodes get a drop-shadow filter. */}
          {nodes.map((n, i) => {
            const cat = CATEGORIES[n.cat];
            const nx = n.x + Math.cos(t * n.orbitSpeed + n.phase) * n.orbitR;
            const ny = n.y + Math.sin(t * n.orbitSpeed + n.phase) * n.orbitR;
            const breath = Math.sin(t * n.breathSpeed + n.phase) * 0.5 + 0.5;
            const opacity = (n.big ? 0.78 : 0.45) + breath * 0.35;
            const haloR = (n.big ? n.r * 2.2 : n.r * 1.6) + breath * (n.big ? 4 : 3);
            return (
              <g key={`n${i}`}>
                <circle
                  cx={nx}
                  cy={ny}
                  r={haloR}
                  fill={cat.color}
                  opacity={(n.big ? 0.14 : 0.06) + breath * 0.1}
                />
                <circle
                  cx={nx}
                  cy={ny}
                  r={n.r + breath * 0.5}
                  fill={cat.color}
                  opacity={opacity}
                  style={n.big ? { filter: `drop-shadow(0 0 5px ${cat.color})` } : undefined}
                />
              </g>
            );
          })}
        </svg>

        {/* Cluster name labels positioned over each cluster's center.
            DOM elements rather than SVG text so the typography matches
            the rest of the hub UI exactly. */}
        {clusterLabels.map((l) => {
          const cat = CATEGORIES[l.cat];
          return (
            <div
              key={l.cat}
              className="absolute pointer-events-none text-[10px] font-mono font-semibold uppercase tracking-[0.14em]"
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                transform: 'translate(-50%, -50%) translateY(-90px)',
                color: cat.color,
                textShadow: `0 0 12px ${cat.color}33`,
              }}
            >
              {cat.short}
            </div>
          );
        })}
      </div>

      <footer className="px-5 py-2 text-[10px] font-mono text-text-muted border-t border-border">
        Each node is one AI research paper from the last 90 days, grouped by category. Cross-cluster lines flicker on shared influence between fields.
      </footer>
    </section>
  );
}
