'use client';

import { useEffect, useMemo, useState } from 'react';

interface MeshNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  hub?: boolean;
}

const SERVICES: MeshNode[] = [
  { id: 'claude', name: 'CLAUDE', x: 300, y: 170, color: 'var(--src-anthropic)' },
  { id: 'openai', name: 'OPENAI', x: 560, y: 110, color: 'var(--src-openai)' },
  { id: 'gemini', name: 'GEMINI', x: 880, y: 140, color: 'var(--src-google)' },
  { id: 'mistral', name: 'MISTRAL', x: 1220, y: 190, color: 'var(--accent-amber)' },
  { id: 'hf', name: 'HUGGINGFACE', x: 220, y: 390, color: 'var(--src-huggingface)' },
  { id: 'cohere', name: 'COHERE', x: 520, y: 420, color: 'var(--accent-primary)' },
  { id: 'perp', name: 'PERPLEXITY', x: 820, y: 440, color: 'var(--accent-cyan)' },
  { id: 'bedrock', name: 'BEDROCK', x: 1160, y: 410, color: 'var(--accent-secondary)' },
  { id: 'hub', name: 'TENSORFEED', x: 720, y: 280, color: 'var(--accent-cyan)', hub: true },
];

export default function DataMesh() {
  const services = useMemo(() => SERVICES, []);
  const hub = services[services.length - 1];
  const spokes = useMemo(() => services.slice(0, -1), [services]);

  const [pulse, setPulse] = useState(-1);

  useEffect(() => {
    const t = setInterval(() => {
      setPulse(Math.floor(Math.random() * spokes.length));
    }, 900);
    return () => clearInterval(t);
  }, [spokes.length]);

  return (
    <svg
      viewBox="0 0 1600 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id="meshFade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="meshMask">
          <rect width="1600" height="560" fill="url(#meshFade)" />
        </mask>
      </defs>
      <g mask="url(#meshMask)">
        {spokes.map((s, i) => (
          <line
            key={`l-${s.id}`}
            x1={s.x}
            y1={s.y}
            x2={hub.x}
            y2={hub.y}
            stroke={i === pulse ? s.color : 'var(--accent-primary)'}
            strokeOpacity={i === pulse ? 0.7 : 0.14}
            strokeWidth={i === pulse ? 1.6 : 0.8}
            strokeDasharray={i === pulse ? '0' : '4 6'}
          />
        ))}
        {spokes.map((s, i) => (
          <g key={s.id}>
            <circle
              cx={s.x}
              cy={s.y}
              r={i === pulse ? 10 : 5}
              fill={s.color}
              opacity={i === pulse ? 0.25 : 0.12}
            />
            <circle
              cx={s.x}
              cy={s.y}
              r={4}
              fill={s.color}
              style={i === pulse ? { filter: `drop-shadow(0 0 8px ${s.color})` } : undefined}
            />
            <text
              x={s.x}
              y={s.y - 14}
              textAnchor="middle"
              fill="var(--text-muted)"
              style={{
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: 9,
              }}
            >
              {s.name}
            </text>
          </g>
        ))}

        <circle cx={hub.x} cy={hub.y} r={20} fill={hub.color} opacity={0.12} />
        <circle cx={hub.x} cy={hub.y} r={12} fill={hub.color} opacity={0.25} />
        <circle
          cx={hub.x}
          cy={hub.y}
          r={6}
          fill={hub.color}
          style={{ filter: `drop-shadow(0 0 10px ${hub.color})` }}
        />
        <text
          x={hub.x}
          y={hub.y + 34}
          textAnchor="middle"
          fill="var(--text-primary)"
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 10,
            letterSpacing: '0.2em',
            fontWeight: 600,
          }}
        >
          TENSORFEED
        </text>
      </g>
    </svg>
  );
}
