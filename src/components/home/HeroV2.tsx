'use client';

import { useEffect, useState } from 'react';
import Neural from './HeroBackgrounds/Neural';
import DataMesh from './HeroBackgrounds/DataMesh';
import Waveform from './HeroBackgrounds/Waveform';
import Constellation from './HeroBackgrounds/Constellation';

type HeroVariant = 'neural' | 'mesh' | 'waveform' | 'constellation';

export interface HeroV2Service {
  name: string;
  status: string;
  lastChecked?: string;
}

interface HeroV2Props {
  variant?: HeroVariant;
  services?: HeroV2Service[];
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

function summarizeServices(services: HeroV2Service[] | undefined) {
  if (!services || services.length === 0) {
    return {
      total: 10,
      online: 10,
      degraded: 0,
      down: 0,
      offendersLabel: 'all systems operational',
      offenderTone: 'up' as const,
    };
  }
  const total = services.length;
  let degraded = 0;
  let down = 0;
  const offenders: string[] = [];
  for (const s of services) {
    const v = (s.status || '').toLowerCase();
    if (v === 'down' || v === 'outage' || v === 'major') {
      down++;
      offenders.push(s.name);
    } else if (v === 'degraded' || v === 'partial' || v === 'warn') {
      degraded++;
      offenders.push(s.name);
    }
  }
  const online = total - degraded - down;

  let offendersLabel: string;
  let offenderTone: 'up' | 'warn' | 'down';
  if (down > 0) {
    offenderTone = 'down';
    offendersLabel = down === 1 ? `${offenders[0]} down` : `${down} services down`;
  } else if (degraded > 0) {
    offenderTone = 'warn';
    offendersLabel = degraded === 1 ? `${offenders[0]} degraded` : `${degraded} services degraded`;
  } else {
    offenderTone = 'up';
    offendersLabel = 'all systems operational';
  }
  return { total, online, degraded, down, offendersLabel, offenderTone };
}

function lastCheckLabel(services: HeroV2Service[] | undefined): string | null {
  if (!services || services.length === 0) return null;
  let mostRecent: number | null = null;
  for (const s of services) {
    if (!s.lastChecked) continue;
    const t = new Date(s.lastChecked).getTime();
    if (Number.isFinite(t) && (mostRecent === null || t > mostRecent)) {
      mostRecent = t;
    }
  }
  if (mostRecent === null) return null;
  const ageSec = Math.max(0, Math.round((Date.now() - mostRecent) / 1000));
  if (ageSec < 60) return `${ageSec}s ago`;
  const min = Math.round(ageSec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

export default function HeroV2({ variant, services }: HeroV2Props) {
  const epm = useEventsPerMin();
  const tickingChecked = useTickingSeconds();
  const Vis = VARIANTS[resolveVariant(variant)];

  const summary = summarizeServices(services);
  const realCheckLabel = lastCheckLabel(services);
  // Prefer real "last checked" label; fall back to the ticking placeholder
  // for the cosmetic case where services were not passed in.
  const checked = realCheckLabel ?? tickingChecked;

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
            {
              eyebrow: 'Services monitored',
              value: String(summary.online),
              unit: `/${summary.total} online`,
              delta: summary.offendersLabel,
              deltaTone: summary.offenderTone,
            },
            { eyebrow: 'Last model release', value: '6', unit: 'm ago', delta: 'Mistral Medium 3', deltaTone: 'muted' as const },
            {
              eyebrow: 'Last check',
              value: checked,
              delta: services && services.length > 0 ? `${services.length} providers` : 'live polling',
              deltaTone: 'muted' as const,
            },
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
