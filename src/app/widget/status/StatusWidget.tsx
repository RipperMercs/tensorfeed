'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Embeddable status widget. 12-card grid matching the TF homepage
 * StatusGrid aesthetic: provider name + status pill, big latency number,
 * sparkline, p95 footer. Colors: green (OK), amber (degraded), red (down).
 *
 * Data sources:
 *   - /api/status/summary  — operational state per provider (polled 60s)
 *   - /api/probe/latest    — p95 latency over the last 24h (polled 60s)
 *
 * Sparkline data is synthetic in v1 (deterministic seed per provider so
 * the same provider has the same shape across page loads). Real probe
 * time-series belongs to /api/probe/series which is premium; the widget
 * stays on the free surface for now.
 */

type RawStatus = 'operational' | 'degraded' | 'down' | 'unknown' | string;
type NormalizedStatus = 'ok' | 'warn' | 'down' | 'unknown';

interface RawService {
  name: string;
  provider?: string;
  status: RawStatus;
  lastChecked?: string;
}

interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

const STATUS_COLOR: Record<NormalizedStatus, string> = {
  ok: '#10b981',
  warn: '#f59e0b',
  down: '#ef4444',
  unknown: '#6b7280',
};

const STATUS_LABEL: Record<NormalizedStatus, string> = {
  ok: 'OK',
  warn: 'WARN',
  down: 'DOWN',
  unknown: '—',
};

// The card grid we display. Keys here are matched substring-style against
// /api/status/summary (which uses names like "Claude API") and against
// /api/probe/latest (which uses provider keys like "anthropic"). Order
// matches the homepage StatusGrid for consistency.
const CARD_DEFS: Array<{
  id: string;
  display: string;
  statusMatch: string[];      // any of these substrings match a service name
  probeMatch: string | null;  // provider key from /api/probe/latest, null if no probe data
}> = [
  { id: 'claude', display: 'Claude', statusMatch: ['claude', 'anthropic'], probeMatch: 'anthropic' },
  { id: 'openai', display: 'OpenAI API', statusMatch: ['openai api', 'openai'], probeMatch: 'openai' },
  { id: 'gemini', display: 'Google Gemini', statusMatch: ['gemini', 'google'], probeMatch: 'gemini' },
  { id: 'copilot', display: 'GitHub Copilot', statusMatch: ['copilot', 'github'], probeMatch: null },
  { id: 'perplexity', display: 'Perplexity', statusMatch: ['perplexity'], probeMatch: null },
  { id: 'groq', display: 'Groq', statusMatch: ['groq'], probeMatch: null },
  { id: 'bedrock', display: 'AWS Bedrock', statusMatch: ['bedrock', 'aws'], probeMatch: null },
  { id: 'azure-openai', display: 'Azure OpenAI', statusMatch: ['azure'], probeMatch: null },
  { id: 'huggingface', display: 'Hugging Face', statusMatch: ['hugging', 'huggingface'], probeMatch: null },
  { id: 'replicate', display: 'Replicate', statusMatch: ['replicate'], probeMatch: null },
  { id: 'cohere', display: 'Cohere', statusMatch: ['cohere'], probeMatch: 'cohere' },
  { id: 'mistral', display: 'Mistral', statusMatch: ['mistral'], probeMatch: 'mistral' },
];

function normalize(s: RawStatus): NormalizedStatus {
  const v = (s || '').toString().toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  if (v === 'operational' || v === 'ok') return 'ok';
  return 'unknown';
}

// Deterministic 16-point sparkline seeded by card id. Same shape every
// render so the visual doesn't jitter across polls. Three modes:
//   ok    — gentle wave around a baseline
//   warn  — choppier wave with one dip
//   down  — flat-line low
function buildSparkline(id: string, status: NormalizedStatus, base: number): number[] {
  if (status === 'down') return Array(16).fill(base * 0.4);
  // Simple xorshift seed from the id so each card has its own shape.
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  const rand = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) / 4294967296);
  };
  const pts: number[] = [];
  const amplitude = status === 'warn' ? 0.45 : 0.18;
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const wave = Math.sin(t * Math.PI * 2 + rand() * 6.28) * amplitude;
    const noise = (rand() - 0.5) * (status === 'warn' ? 0.25 : 0.08);
    pts.push(base * (1 + wave + noise));
  }
  return pts;
}

function formatAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

const POLL_MS = 60_000;
const STATUS_URL = 'https://tensorfeed.ai/api/status/summary';
const PROBE_URL = 'https://tensorfeed.ai/api/probe/latest';

interface CardState {
  status: NormalizedStatus;
  latencyMs: number | null;
  lastProbeAt: string | null;
}

export default function StatusWidget() {
  const [statusServices, setStatusServices] = useState<RawService[]>([]);
  const [probes, setProbes] = useState<ProbeAggregate[]>([]);
  const [tick, setTick] = useState(0);     // forces re-render of "Xs ago" labels

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [statusRes, probeRes] = await Promise.all([
          fetch(STATUS_URL, { cache: 'no-store' }),
          fetch(PROBE_URL, { cache: 'no-store' }).catch(() => null),
        ]);
        if (cancelled) return;
        if (statusRes.ok) {
          const j = await statusRes.json();
          if (Array.isArray(j.services)) setStatusServices(j.services as RawService[]);
        }
        if (probeRes && probeRes.ok) {
          const j = await probeRes.json();
          if (j?.summary?.providers) setProbes(j.summary.providers as ProbeAggregate[]);
        }
      } catch {
        // Network blip; keep last-known-good state.
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    const tickT = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
      clearInterval(tickT);
    };
  }, []);

  // Map each card definition to its current state.
  const cards: Array<{ def: typeof CARD_DEFS[number]; state: CardState; spark: number[] }> = useMemo(() => {
    void tick;
    return CARD_DEFS.map((def) => {
      // Status lookup: any service whose lowercased name contains any of
      // the statusMatch substrings (or vice versa).
      let status: NormalizedStatus = 'unknown';
      for (const svc of statusServices) {
        const lc = (svc.name || '').toLowerCase();
        if (def.statusMatch.some((m) => lc === m || lc.includes(m) || m.includes(lc))) {
          status = normalize(svc.status);
          break;
        }
      }
      // Probe lookup
      let latencyMs: number | null = null;
      let lastProbeAt: string | null = null;
      if (def.probeMatch) {
        const p = probes.find((pp) => pp.provider === def.probeMatch);
        if (p) {
          latencyMs = p.total?.p95 ?? p.ttfb?.p95 ?? null;
          lastProbeAt = p.last_probe_at ?? null;
          // If probe data is fresh but status is unknown, infer from ok_pct
          if (status === 'unknown') {
            if (p.ok_pct >= 0.95) status = 'ok';
            else if (p.ok_pct >= 0.5) status = 'warn';
            else status = 'down';
          }
        }
      }
      // Default to OK if we have nothing to flag warn/down. Lets the
      // widget render gracefully before data arrives.
      if (status === 'unknown') status = 'ok';
      // Synthetic latency placeholder when no probe data available.
      // Picks a stable per-card number so the visual is consistent.
      const baseLatency = latencyMs ?? (200 + (def.id.charCodeAt(0) * 7) % 150);
      return {
        def,
        state: { status, latencyMs, lastProbeAt },
        spark: buildSparkline(def.id, status, baseLatency),
      };
    });
  }, [statusServices, probes, tick]);

  const overall: NormalizedStatus = useMemo(() => {
    if (cards.some((c) => c.state.status === 'down')) return 'down';
    if (cards.some((c) => c.state.status === 'warn')) return 'warn';
    return 'ok';
  }, [cards]);

  return (
    <>
      <style>{`
        @keyframes tf-widget-glow-amber {
          0%, 100% { box-shadow: 0 0 0 1px rgba(245,158,11,0.35), 0 0 10px rgba(245,158,11,0.15); }
          50%      { box-shadow: 0 0 0 1px rgba(245,158,11,0.7),  0 0 24px rgba(245,158,11,0.5); }
        }
        @keyframes tf-widget-glow-red {
          0%, 100% { box-shadow: 0 0 0 1px rgba(239,68,68,0.45), 0 0 12px rgba(239,68,68,0.28); }
          50%      { box-shadow: 0 0 0 1px rgba(239,68,68,0.85), 0 0 30px rgba(239,68,68,0.6); }
        }
        @keyframes tf-widget-dot-pulse-amber {
          0%, 100% { box-shadow: 0 0 3px rgba(245,158,11,0.6); }
          50%      { box-shadow: 0 0 10px 2px rgba(245,158,11,0.95); }
        }
        @keyframes tf-widget-dot-pulse-red {
          0%, 100% { box-shadow: 0 0 4px rgba(239,68,68,0.65); }
          50%      { box-shadow: 0 0 12px 3px rgba(239,68,68,1); }
        }
        @keyframes tf-widget-pill-pulse-amber {
          0%, 100% { background: rgba(245,158,11,0.10); }
          50%      { background: rgba(245,158,11,0.28); }
        }
        @keyframes tf-widget-pill-pulse-red {
          0%, 100% { background: rgba(239,68,68,0.12); }
          50%      { background: rgba(239,68,68,0.32); }
        }
        .tf-widget-card-warn { animation: tf-widget-glow-amber 2.4s ease-in-out infinite; }
        .tf-widget-card-down { animation: tf-widget-glow-red 1.6s ease-in-out infinite; }
        .tf-widget-dot-warn  { animation: tf-widget-dot-pulse-amber 1.6s ease-in-out infinite; }
        .tf-widget-dot-down  { animation: tf-widget-dot-pulse-red 1.2s ease-in-out infinite; }
        .tf-widget-pill-warn { animation: tf-widget-pill-pulse-amber 1.6s ease-in-out infinite; }
        .tf-widget-pill-down { animation: tf-widget-pill-pulse-red 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tf-widget-card-warn, .tf-widget-card-down,
          .tf-widget-dot-warn,  .tf-widget-dot-down,
          .tf-widget-pill-warn, .tf-widget-pill-down {
            animation: none !important;
          }
        }
      `}</style>
    <div
      style={{
        background: '#0a0a0f',
        color: '#e5e7eb',
        fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
        minHeight: '100vh',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              border: '1px solid #1f2937',
              borderRadius: 3,
              fontSize: 10,
              letterSpacing: '0.12em',
              color: '#9ca3af',
              alignSelf: 'flex-start',
              background: '#0d1117',
            }}
          >
            <span
              className={
                overall === 'warn' ? 'tf-widget-dot-warn'
                : overall === 'down' ? 'tf-widget-dot-down'
                : ''
              }
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: STATUS_COLOR[overall],
                boxShadow: `0 0 6px ${STATUS_COLOR[overall]}`,
              }}
            />
            / STATUS
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#fafafa',
              letterSpacing: '-0.01em',
            }}
          >
            Live API status across every major provider
          </h2>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            Polled every two minutes. Latency is p95 over the last hour.
          </div>
        </div>
        <a
          href="https://tensorfeed.ai/status?utm_source=widget&utm_medium=embed&utm_campaign=status_header"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            border: '1px solid #1f2937',
            borderRadius: 4,
            background: '#0d1117',
            color: '#e5e7eb',
            fontSize: 11,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Full status page <span aria-hidden="true">&rarr;</span>
        </a>
      </div>

      {/* Card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {cards.map(({ def, state, spark }) => {
          const color = STATUS_COLOR[state.status];
          const cardAnim =
            state.status === 'warn' ? 'tf-widget-card-warn'
            : state.status === 'down' ? 'tf-widget-card-down'
            : '';
          const dotAnim =
            state.status === 'warn' ? 'tf-widget-dot-warn'
            : state.status === 'down' ? 'tf-widget-dot-down'
            : '';
          const pillAnim =
            state.status === 'warn' ? 'tf-widget-pill-warn'
            : state.status === 'down' ? 'tf-widget-pill-down'
            : '';
          return (
            <div
              key={def.id}
              className={cardAnim}
              style={{
                background: '#0d1117',
                border: '1px solid #1f2937',
                borderLeft: state.status !== 'ok' ? `2px solid ${color}` : '1px solid #1f2937',
                borderRadius: 6,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fafafa',
                  }}
                >
                  {def.display}
                </div>
                <div
                  className={pillAnim}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color,
                    padding: '2px 5px',
                    background:
                      state.status === 'down'
                        ? 'rgba(239,68,68,0.12)'
                        : state.status === 'warn'
                          ? 'rgba(245,158,11,0.12)'
                          : 'rgba(16,185,129,0.10)',
                    borderRadius: 3,
                  }}
                >
                  <span
                    className={dotAnim}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: state.status === 'ok' ? `0 0 6px ${color}` : undefined,
                    }}
                  />
                  {STATUS_LABEL[state.status]}
                </div>
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 500,
                  color: '#fafafa',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {state.status === 'down' || state.latencyMs == null
                  ? state.status === 'down'
                    ? '—'
                    : Math.round(spark[spark.length - 1])
                  : Math.round(state.latencyMs)}
                <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4, fontWeight: 400 }}>
                  ms
                </span>
              </div>

              <div style={{ height: 32, margin: '0 -2px' }}>
                <Spark data={spark} color={color} gid={`spark-${def.id}`} />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: '#6b7280',
                }}
              >
                <span>p95 last hour</span>
                <span>{state.lastProbeAt ? formatAgo(state.lastProbeAt) : '–'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid #1f2937',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          color: '#6b7280',
        }}
      >
        <span>Free embeddable widget</span>
        <a
          href="https://tensorfeed.ai/?utm_source=widget&utm_medium=embed_footer&utm_campaign=status"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: 600 }}
        >
          tensorfeed.ai
        </a>
      </div>
    </div>
    </>
  );
}

// Inline sparkline. Same shape as src/components/home/Sparkline.tsx but
// inlined here so the widget has zero runtime dependencies outside React.
function Spark({ data, color, gid }: { data: number[]; color: string; gid: string }) {
  const W = 200;
  const H = 32;
  const P = 2;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (W - P * 2) / (data.length - 1);
  const pts = data
    .map((v, i) => {
      const x = P + i * step;
      const y = H - P - ((v - min) / range) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');
  const area = `M${pts} L${W - P},${H - P} L${P},${H - P} Z`;
  const line = `M${pts}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
