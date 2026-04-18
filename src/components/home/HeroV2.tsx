'use client';

import { useEffect, useState } from 'react';
import Neural from './HeroBackgrounds/Neural';
import DataMesh from './HeroBackgrounds/DataMesh';
import Waveform from './HeroBackgrounds/Waveform';
import Constellation from './HeroBackgrounds/Constellation';

type HeroVariant = 'neural' | 'mesh' | 'waveform' | 'constellation';

interface HeroV2Props {
  variant?: HeroVariant;
}

const ENV_VARIANT = (process.env.NEXT_PUBLIC_HERO_VARIANT ?? '').toLowerCase() as HeroVariant | '';

function resolveVariant(prop: HeroVariant | undefined): HeroVariant {
  if (prop) return prop;
  if (ENV_VARIANT === 'mesh' || ENV_VARIANT === 'waveform' || ENV_VARIANT === 'constellation' || ENV_VARIANT === 'neural') {
    return ENV_VARIANT;
  }
  return 'neural';
}

const VARIANTS: Record<HeroVariant, () => React.JSX.Element> = {
  neural: Neural,
  mesh: DataMesh,
  waveform: Waveform,
  constellation: Constellation,
};

const TITLE = 'The AI Pulse';

function useEventsPerMin() {
  const [epm, setEpm] = useState(74);
  useEffect(() => {
    const compute = () => {
      const h = new Date().getHours();
      const base = h >= 8 && h <= 20 ? 84 : 42;
      setEpm(base + Math.round((Math.random() - 0.5) * 24));
    };
    compute();
    const t = setInterval(compute, 2400);
    return () => clearInterval(t);
  }, []);
  return epm;
}

function useTickingSeconds() {
  const [v, setV] = useState('28s');
  useEffect(() => {
    const t = setInterval(() => {
      const n = Math.floor(Math.random() * 50) + 5;
      setV(`${n}s`);
    }, 4000);
    return () => clearInterval(t);
  }, []);
  return v;
}

export default function HeroV2({ variant }: HeroV2Props) {
  const epm = useEventsPerMin();
  const checked = useTickingSeconds();
  const Vis = VARIANTS[resolveVariant(variant)];

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      aria-label="TensorFeed overview"
      style={{ padding: '72px 0 56px' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
        <div className="absolute inset-0">
          <Vis />
        </div>
        <div className="absolute inset-0 tf-hero-grid" />
        <div className="absolute inset-0 tf-hero-scanlines" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div
          className="flex items-center font-mono uppercase flex-wrap"
          role="status"
          aria-live="polite"
          style={{
            gap: 18,
            marginBottom: 24,
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}
        >
          <span
            className="inline-flex items-center"
            style={{ color: 'var(--accent-green)', gap: 6 }}
          >
            <span
              className="tf-live-pulse relative inline-block"
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)' }}
            />
            LIVE
          </span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>15+ SOURCES</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>10+ API MONITORS</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>UPDATED EVERY 10 MIN</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span style={{ color: 'var(--accent-cyan)' }}>{epm} events/min</span>
        </div>

        <h1
          className="tf-hero-title-reveal"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 'clamp(48px, 7.5vw, 108px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            background: 'linear-gradient(135deg, #a5b4fc 0%, #8b5cf6 45%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            marginBottom: 16,
            display: 'inline-block',
          }}
        >
          {TITLE}
        </h1>

        <p
          style={{
            fontSize: 20,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            marginBottom: 28,
            lineHeight: 1.45,
          }}
        >
          Real-time news, model tracking, and ecosystem data for the AI industry. Readable by humans. Structured for agents.
        </p>

        <div
          role="list"
          className="flex flex-wrap"
          style={{
            gap: 0,
            marginTop: 32,
            paddingTop: 28,
            borderTop: '1px solid var(--border)',
            maxWidth: 920,
          }}
        >
          {[
            { eyebrow: 'Events per min', value: String(epm), delta: 'up 14% vs. 24h avg', deltaTone: 'up' as const },
            { eyebrow: 'Services monitored', value: '10', unit: '/10 online', delta: '1 degraded, Midjourney', deltaTone: 'warn' as const },
            { eyebrow: 'Last model release', value: '6', unit: 'm ago', delta: 'Mistral Medium 3', deltaTone: 'muted' as const },
            { eyebrow: 'Last check', value: checked, delta: 'Midjourney status', deltaTone: 'muted' as const },
          ].map((s, i, arr) => (
            <Stat key={s.eyebrow} {...s} isFirst={i === 0} isLast={i === arr.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface StatProps {
  eyebrow: string;
  value: string;
  unit?: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'warn' | 'muted';
  isFirst?: boolean;
  isLast?: boolean;
}

function Stat({ eyebrow, value, unit, delta, deltaTone, isFirst, isLast }: StatProps) {
  const deltaColor =
    deltaTone === 'up'
      ? 'var(--accent-green)'
      : deltaTone === 'down'
      ? 'var(--accent-red)'
      : deltaTone === 'warn'
      ? 'var(--accent-amber)'
      : 'var(--text-muted)';

  return (
    <div
      role="listitem"
      style={{
        flex: 1,
        minWidth: 160,
        paddingLeft: isFirst ? 0 : 28,
        paddingRight: isLast ? 0 : 28,
        borderRight: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10.5,
          color: 'var(--text-muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {eyebrow}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
        )}
      </div>
      <div className="font-mono" style={{ fontSize: 11, color: deltaColor, marginTop: 2 }}>
        {delta}
      </div>
    </div>
  );
}
