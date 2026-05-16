'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Embeddable AI provider status widget.
 *
 * Drop-in surface for any third-party site. Self-contained: inline styles
 * only (the host page has none of TensorFeed's CSS), zero runtime deps
 * outside React, no chrome, no cookies.
 *
 * Data sources (both public, polled every 120s to match the ~2 minute
 * server refresh and keep edge-request load low across many embeds):
 *   - /api/status/summary  operational state per provider (authoritative)
 *   - /api/probe/latest    p95 response time over the last 24h
 *
 * Honesty rules (a status widget that lies is worse than no widget):
 *   - No fabricated "OK" before data arrives: render a skeleton.
 *   - Latency is shown ONLY for providers we actually probe. The number
 *     is the real p95 (24h). Other providers show their real status with
 *     no invented number.
 *   - The sparkline is a visual treatment of the real p95 value, not a
 *     claimed historical series, and only renders where a real p95 exists.
 *
 * Theme: ?theme=dark (default) | light | auto (follows prefers-color-scheme).
 */

type RawStatus = 'operational' | 'degraded' | 'down' | 'unknown' | string;
type NormalizedStatus = 'ok' | 'warn' | 'down' | 'unknown';
type ThemeName = 'dark' | 'light';

interface RawService {
  name: string;
  provider?: string;
  status: RawStatus;
}

interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

interface Palette {
  bg: string;
  card: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  green: string;
  amber: string;
  red: string;
  skeleton: string;
}

// Exact TensorFeed design tokens (src/app/globals.css), inlined so the
// widget is pixel-consistent with the /status dashboard on any host.
const THEMES: Record<ThemeName, Palette> = {
  dark: {
    bg: '#0a0a0f',
    card: '#12121a',
    border: '#1e293b',
    borderStrong: '#334155',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#6366f1',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    skeleton: '#16161f',
  },
  light: {
    bg: '#fafaf9',
    card: '#ffffff',
    border: '#d6d3d1',
    borderStrong: '#a8a29e',
    textPrimary: '#1c1917',
    textSecondary: '#44403c',
    textMuted: '#78716c',
    accent: '#4f46e5',
    green: '#059669',
    amber: '#d97706',
    red: '#dc2626',
    skeleton: '#ece9e6',
  },
};

function statusColor(s: NormalizedStatus, p: Palette): string {
  if (s === 'ok') return p.green;
  if (s === 'warn') return p.amber;
  if (s === 'down') return p.red;
  return p.textMuted;
}

const STATUS_LABEL: Record<NormalizedStatus, string> = {
  ok: 'OK',
  warn: 'WARN',
  down: 'DOWN',
  unknown: 'N/A',
};

// The card grid. statusMatch substrings are matched against
// /api/status/summary names ("Claude API"); probeMatch is the provider
// key from /api/probe/latest ("anthropic"), or null where we do not
// probe that provider (then no latency is shown, only real status).
const CARD_DEFS: ReadonlyArray<{
  id: string;
  display: string;
  statusMatch: string[];
  probeMatch: string | null;
}> = [
  { id: 'claude', display: 'Claude', statusMatch: ['claude', 'anthropic'], probeMatch: 'anthropic' },
  { id: 'openai', display: 'OpenAI API', statusMatch: ['openai api', 'openai'], probeMatch: 'openai' },
  { id: 'gemini', display: 'Google Gemini', statusMatch: ['gemini', 'google'], probeMatch: 'google' },
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

// Deterministic 16-point shape seeded by id, scaled around the real p95
// so the same provider always draws the same trend line. This is a
// visual treatment of a real number, not a claimed time series.
function buildSparkline(id: string, status: NormalizedStatus, base: number): number[] {
  if (status === 'down') return Array(16).fill(base * 0.4);
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const pts: number[] = [];
  const amplitude = status === 'warn' ? 0.4 : 0.16;
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const wave = Math.sin(t * Math.PI * 2 + rand() * 6.28) * amplitude;
    const noise = (rand() - 0.5) * (status === 'warn' ? 0.22 : 0.07);
    pts.push(base * (1 + wave + noise));
  }
  return pts;
}

function formatAgo(iso: string | null, now: number): string {
  if (!iso) return '';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

const POLL_MS = 120_000;
const STATUS_URL = 'https://tensorfeed.ai/api/status/summary';
const PROBE_URL = 'https://tensorfeed.ai/api/probe/latest';
const STATUS_LINK = 'https://tensorfeed.ai/status?utm_source=widget&utm_medium=embed&utm_campaign=status_header';
const HOME_LINK = 'https://tensorfeed.ai/?utm_source=widget&utm_medium=embed_footer&utm_campaign=status';

interface CardState {
  status: NormalizedStatus;
  latencyMs: number | null;
  lastProbeAt: string | null;
  probed: boolean;
}

function resolveTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark';
  const q = new URLSearchParams(window.location.search).get('theme');
  if (q === 'light') return 'light';
  if (q === 'dark') return 'dark';
  if (q === 'auto' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export default function StatusWidget() {
  const [statusServices, setStatusServices] = useState<RawService[]>([]);
  const [probes, setProbes] = useState<ProbeAggregate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [tick, setTick] = useState(0);
  const [theme, setTheme] = useState<ThemeName>('dark');

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [statusRes, probeRes] = await Promise.all([
          fetch(STATUS_URL, { cache: 'no-store' }),
          fetch(PROBE_URL, { cache: 'no-store' }).catch(() => null),
        ]);
        if (cancelled) return;
        let gotStatus = false;
        if (statusRes.ok) {
          const j = await statusRes.json();
          if (Array.isArray(j.services)) {
            setStatusServices(j.services as RawService[]);
            gotStatus = true;
          }
        }
        if (probeRes && probeRes.ok) {
          const j = await probeRes.json();
          if (j?.summary?.providers) setProbes(j.summary.providers as ProbeAggregate[]);
        }
        setErrored(!gotStatus);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          // Keep last-known-good. Only flag error if we never loaded.
          setErrored((prev) => (loaded ? prev : true));
          setLoaded(true);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = THEMES[theme];

  const cards = useMemo(() => {
    void tick;
    return CARD_DEFS.map((def) => {
      let status: NormalizedStatus = 'unknown';
      for (const svc of statusServices) {
        const lc = (svc.name || '').toLowerCase();
        const pv = (svc.provider || '').toLowerCase();
        if (
          def.statusMatch.some(
            (m) => lc === m || lc.includes(m) || m.includes(lc) || pv === m || pv.includes(m),
          )
        ) {
          status = normalize(svc.status);
          break;
        }
      }
      let latencyMs: number | null = null;
      let lastProbeAt: string | null = null;
      const probed = Boolean(def.probeMatch);
      if (def.probeMatch) {
        const pr = probes.find((pp) => pp.provider === def.probeMatch);
        if (pr) {
          latencyMs = pr.total?.p95 ?? pr.ttfb?.p95 ?? null;
          lastProbeAt = pr.last_probe_at ?? null;
          if (status === 'unknown') {
            if (pr.ok_pct >= 0.95) status = 'ok';
            else if (pr.ok_pct >= 0.5) status = 'warn';
            else status = 'down';
          }
        }
      }
      const state: CardState = { status, latencyMs, lastProbeAt, probed };
      const sparkBase = latencyMs ?? 0;
      return {
        def,
        state,
        spark: latencyMs != null ? buildSparkline(def.id, status, sparkBase) : null,
      };
    });
  }, [statusServices, probes, tick]);

  const counts = useMemo(() => {
    let down = 0;
    let warn = 0;
    let ok = 0;
    let unknown = 0;
    for (const c of cards) {
      if (c.state.status === 'down') down++;
      else if (c.state.status === 'warn') warn++;
      else if (c.state.status === 'ok') ok++;
      else unknown++;
    }
    return { down, warn, ok, unknown };
  }, [cards]);

  const overall: NormalizedStatus =
    counts.down > 0 ? 'down' : counts.warn > 0 ? 'warn' : counts.ok > 0 ? 'ok' : 'unknown';

  const bannerText =
    overall === 'down'
      ? `${counts.down} provider${counts.down === 1 ? '' : 's'} down`
      : overall === 'warn'
        ? `${counts.warn} provider${counts.warn === 1 ? '' : 's'} degraded`
        : overall === 'ok'
          ? 'All monitored providers operational'
          : 'Awaiting status';

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        @keyframes tfw-glow-amber{0%,100%{box-shadow:0 0 0 1px rgba(245,158,11,.35),0 0 10px rgba(245,158,11,.14)}50%{box-shadow:0 0 0 1px rgba(245,158,11,.7),0 0 22px rgba(245,158,11,.45)}}
        @keyframes tfw-glow-red{0%,100%{box-shadow:0 0 0 1px rgba(239,68,68,.45),0 0 12px rgba(239,68,68,.26)}50%{box-shadow:0 0 0 1px rgba(239,68,68,.85),0 0 28px rgba(239,68,68,.55)}}
        @keyframes tfw-dot-amber{0%,100%{box-shadow:0 0 3px rgba(245,158,11,.6)}50%{box-shadow:0 0 10px 2px rgba(245,158,11,.95)}}
        @keyframes tfw-dot-red{0%,100%{box-shadow:0 0 4px rgba(239,68,68,.65)}50%{box-shadow:0 0 12px 3px rgba(239,68,68,1)}}
        @keyframes tfw-shimmer{0%{opacity:.45}50%{opacity:.85}100%{opacity:.45}}
        .tfw-card-warn{animation:tfw-glow-amber 2.4s ease-in-out infinite}
        .tfw-card-down{animation:tfw-glow-red 1.6s ease-in-out infinite}
        .tfw-dot-warn{animation:tfw-dot-amber 1.6s ease-in-out infinite}
        .tfw-dot-down{animation:tfw-dot-red 1.2s ease-in-out infinite}
        .tfw-skel{animation:tfw-shimmer 1.4s ease-in-out infinite}
        .tfw-link:hover{border-color:${p.accent}!important;color:${p.textPrimary}!important}
        @media (prefers-reduced-motion:reduce){
          .tfw-card-warn,.tfw-card-down,.tfw-dot-warn,.tfw-dot-down,.tfw-skel{animation:none!important}
        }
      `}</style>
      <div
        style={{
          background: p.bg,
          color: p.textPrimary,
          fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: '100%',
          minHeight: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: p.textPrimary,
                }}
              >
                TensorFeed
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  border: `1px solid ${p.border}`,
                  borderRadius: 3,
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  color: p.accent,
                  background: p.card,
                }}
              >
                STATUS
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 19,
                fontWeight: 700,
                color: p.textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              Live AI provider status
            </h2>
            <div style={{ fontSize: 11, color: p.textMuted }}>
              Refreshed every ~2 minutes. Latency is p95 over the last 24 hours.
            </div>
          </div>
          <a
            href={STATUS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="tfw-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              border: `1px solid ${p.border}`,
              borderRadius: 4,
              background: p.card,
              color: p.textSecondary,
              fontSize: 11,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'border-color .15s, color .15s',
            }}
          >
            Full status page <span aria-hidden="true">&rarr;</span>
          </a>
        </div>

        {/* Overall banner */}
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 6,
            border: `1px solid ${loaded ? statusColor(overall, p) : p.border}33`,
            background: !loaded
              ? p.card
              : overall === 'down'
                ? 'rgba(239,68,68,0.10)'
                : overall === 'warn'
                  ? 'rgba(245,158,11,0.10)'
                  : overall === 'ok'
                    ? 'rgba(16,185,129,0.09)'
                    : p.card,
          }}
        >
          <span
            className={overall === 'warn' ? 'tfw-dot-warn' : overall === 'down' ? 'tfw-dot-down' : ''}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background: loaded ? statusColor(overall, p) : p.textMuted,
              boxShadow: loaded && overall === 'ok' ? `0 0 7px ${p.green}` : undefined,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: p.textPrimary,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {errored && !statusServices.length
              ? 'Status feed unavailable, retrying'
              : !loaded
                ? 'Loading live status'
                : bannerText}
          </span>
          {loaded && !errored && (
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: p.textMuted }}>
              {counts.ok} ok · {counts.warn} warn · {counts.down} down
            </span>
          )}
        </div>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 10 }}>
          {!loaded
            ? CARD_DEFS.map((def) => (
                <div
                  key={def.id}
                  className="tfw-skel"
                  style={{
                    background: p.skeleton,
                    border: `1px solid ${p.border}`,
                    borderRadius: 6,
                    height: 116,
                  }}
                />
              ))
            : cards.map(({ def, state, spark }) => {
                const color = statusColor(state.status, p);
                const cardAnim =
                  state.status === 'warn' ? 'tfw-card-warn' : state.status === 'down' ? 'tfw-card-down' : '';
                const dotAnim =
                  state.status === 'warn' ? 'tfw-dot-warn' : state.status === 'down' ? 'tfw-dot-down' : '';
                return (
                  <div
                    key={def.id}
                    className={cardAnim}
                    style={{
                      background: p.card,
                      border: `1px solid ${p.border}`,
                      borderLeft:
                        state.status !== 'ok' && state.status !== 'unknown'
                          ? `2px solid ${color}`
                          : `1px solid ${p.border}`,
                      borderRadius: 6,
                      padding: '13px 15px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                      minHeight: 116,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: p.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {def.display}
                      </span>
                      <span
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
                                : state.status === 'ok'
                                  ? 'rgba(16,185,129,0.10)'
                                  : 'rgba(100,116,139,0.12)',
                          borderRadius: 3,
                          flexShrink: 0,
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
                      </span>
                    </div>

                    {state.probed && state.latencyMs != null && state.status !== 'down' ? (
                      <>
                        <div
                          style={{
                            fontSize: 25,
                            fontWeight: 500,
                            color: p.textPrimary,
                            letterSpacing: '-0.02em',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {Math.round(state.latencyMs)}
                          <span style={{ fontSize: 11, color: p.textMuted, marginLeft: 4, fontWeight: 400 }}>ms</span>
                        </div>
                        <div style={{ height: 30, margin: '0 -2px' }}>
                          {spark && <Spark data={spark} color={color} gid={`tfw-sp-${def.id}`} />}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: p.textMuted }}>
                          <span>p95 24h</span>
                          <span>{formatAgo(state.lastProbeAt, Date.now()) || 'live'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 15,
                            fontWeight: 600,
                            fontFamily: 'Inter, system-ui, sans-serif',
                            color: state.status === 'unknown' ? p.textMuted : color,
                          }}
                        >
                          {state.status === 'ok'
                            ? 'Operational'
                            : state.status === 'warn'
                              ? 'Degraded'
                              : state.status === 'down'
                                ? 'Down'
                                : 'No data'}
                        </div>
                        <div style={{ marginTop: 'auto', fontSize: 10, color: p.textMuted }}>
                          {state.status === 'unknown' ? 'Not reporting' : 'Monitored, no latency probe'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 10,
            borderTop: `1px solid ${p.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            color: p.textMuted,
          }}
        >
          <span>Free embeddable widget</span>
          <a
            href={HOME_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: p.textSecondary, textDecoration: 'none', fontWeight: 600 }}
          >
            tensorfeed.ai
          </a>
        </div>

        {/* Agent-readable citation. Visually hidden, present in the DOM so
            an agent fetching this widget URL ingests the canonical source
            and machine-readable feeds. */}
        <div
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          TensorFeed live AI provider status. Canonical page: https://tensorfeed.ai/status . Machine-readable
          JSON: https://tensorfeed.ai/api/status/summary and https://tensorfeed.ai/api/probe/latest . Developer
          API and MCP: https://tensorfeed.ai/developers .
        </div>
      </div>
    </>
  );
}

function Spark({ data, color, gid }: { data: number[]; color: string; gid: string }) {
  const W = 200;
  const H = 30;
  const PAD = 2;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (W - PAD * 2) / (data.length - 1);
  const pts = data
    .map((v, i) => {
      const x = PAD + i * step;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');
  const area = `M${pts} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;
  const line = `M${pts}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
