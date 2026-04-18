'use client';

import { useEffect, useMemo, useState } from 'react';

const W = 1600;
const H = 560;
const STEP = 6;
const SEG = 200;

export default function Waveform() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, []);

  const path = useMemo(() => {
    const mid = H / 2;
    const pts: string[] = [];
    for (let x = 0; x < W; x += STEP) {
      const local = ((x + tick * STEP) % SEG) / SEG;
      let y = mid + Math.sin((x + tick * STEP) * 0.012) * 6;
      if (local > 0.45 && local < 0.48) y = mid + 8;
      else if (local >= 0.48 && local < 0.5) y = mid - 80;
      else if (local >= 0.5 && local < 0.52) y = mid + 120;
      else if (local >= 0.52 && local < 0.54) y = mid - 20;
      else if (local >= 0.54 && local < 0.56) y = mid + 2;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  }, [tick]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="tf-wf-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0" />
          <stop offset="20%" stopColor="var(--accent-secondary)" stopOpacity="0.6" />
          <stop offset="60%" stopColor="var(--accent-cyan)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tf-wf-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tf-wf-mask">
          <rect width={W} height={H} fill="url(#tf-wf-fade)" />
        </mask>
      </defs>
      <g mask="url(#tf-wf-mask)" stroke="var(--border)" strokeWidth="1" opacity="0.4">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h${i}`} x1="0" x2={W} y1={i * 50} y2={i * 50} />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={`v${i}`} y1="0" y2={H} x1={i * 80} x2={i * 80} />
        ))}
      </g>
      <g mask="url(#tf-wf-mask)">
        <path d={path} fill="none" stroke="url(#tf-wf-grad)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
