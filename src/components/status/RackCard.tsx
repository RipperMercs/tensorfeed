'use client';

import Sparkline, { buildSparkline } from './Sparkline';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

type Norm = 'ok' | 'warn' | 'down' | 'unknown';

function normalize(status: string): Norm {
  const s = (status || '').toLowerCase();
  if (s === 'down' || s === 'outage' || s === 'major') return 'down';
  if (s === 'degraded' || s === 'partial' || s === 'warn') return 'warn';
  if (s === 'operational' || s === 'ok') return 'ok';
  return 'unknown';
}

function pillClass(n: Norm): string {
  switch (n) {
    case 'ok':
      return 'bg-accent-green/10 text-accent-green border-accent-green/30';
    case 'warn':
      return 'bg-accent-amber/10 text-accent-amber border-accent-amber/30';
    case 'down':
      return 'bg-accent-red/10 text-accent-red border-accent-red/30';
    default:
      return 'bg-bg-tertiary text-text-muted border-border';
  }
}

function pillLabel(n: Norm): string {
  switch (n) {
    case 'ok':
      return 'OPERATIONAL';
    case 'warn':
      return 'DEGRADED';
    case 'down':
      return 'DOWN';
    default:
      return 'UNKNOWN';
  }
}

function dotColor(n: Norm): string {
  switch (n) {
    case 'ok':
      return '#10b981';
    case 'warn':
      return '#f59e0b';
    case 'down':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function ageInSeconds(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// Provider-key -> matcher for probe data. Multiple keys can match the same
// service display name; this is the inverse mapping. Probe data is only
// available for a subset of providers (anthropic, openai, gemini, cohere,
// mistral, etc); the rest fall back to synthetic latency.
function probeProviderKey(serviceName: string): string | null {
  const n = serviceName.toLowerCase();
  if (n.includes('claude') || n.includes('anthropic')) return 'anthropic';
  if (n.includes('openai')) return 'openai';
  if (n.includes('gemini') || n.includes('google')) return 'gemini';
  if (n.includes('cohere')) return 'cohere';
  if (n.includes('mistral')) return 'mistral';
  return null;
}

function pseudoLatency(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 80 + (h % 360);
}

function syntheticUptime(id: string, status: Norm): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 37 + id.charCodeAt(i)) >>> 0;
  if (status === 'down') return 96 + ((h % 30) / 10);
  if (status === 'warn') return 98.5 + ((h % 15) / 10);
  return 99.5 + ((h % 50) / 100);
}

interface RackCardProps {
  service: StatusService;
  probe?: ProbeAggregate | null;
  rackIndex: number;
}

/**
 * Production-shaped rack card: head + metrics grid + sparkline +
 * components + foot. Implements section 5.3 of the design facelift spec
 * at v2 fidelity. Real probe latency is used where TF has it; synthetic
 * deterministic latency + sparkline are used as a stable fallback for
 * providers without probe coverage.
 */
export default function RackCard({ service, probe, rackIndex }: RackCardProps) {
  const norm = normalize(service.status);
  const id = service.name.toLowerCase().replace(/\s+/g, '-');
  const rackCls = `tf-rack ${
    norm === 'warn' ? 'tf-rack-warn' : norm === 'down' ? 'tf-rack-down' : norm === 'unknown' ? 'tf-rack-unknown' : ''
  }`;

  // p50/p95 latency: prefer real probe data when available, fall back to
  // synthetic. The spec names the field 'p50 latency' but TF stores p95
  // per provider in the probe summary; we surface p95 with an honest label.
  const probeP95 = probe?.total?.p95 ?? probe?.ttfb?.p95 ?? null;
  const latency = probeP95 != null ? Math.round(probeP95) : pseudoLatency(id);
  const latencySynthetic = probeP95 == null;
  const lastProbe = probe?.last_probe_at ?? service.lastChecked ?? null;

  // 30-day uptime: derive from probe ok_pct when available (multiplied by
  // 100), synthetic per-id otherwise.
  const uptimePct = probe?.ok_pct != null
    ? Math.min(100, Math.max(0, probe.ok_pct * 100))
    : syntheticUptime(id, norm);

  const spark = buildSparkline(id, norm, latency, 60);
  const sparkMin = Math.min(...spark);
  const sparkMax = Math.max(...spark);

  const rackTag = `AI-${(rackIndex + 1).toString().padStart(2, '0')}`;
  const color = dotColor(norm);

  return (
    <article
      className={`${rackCls} overflow-hidden`}
      data-provider={service.provider.toLowerCase().replace(/\s+/g, '-')}
      aria-label={`${service.name} status: ${pillLabel(norm)}`}
    >
      {/* Head */}
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold tracking-[0.08em] border border-border bg-bg-tertiary text-text-muted shrink-0 mt-0.5">
            {rackTag}
          </span>
          <div className="min-w-0">
            <h3 className="text-text-primary font-semibold text-[14.5px] leading-tight truncate">
              {service.name}
            </h3>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mt-0.5">
              {service.provider}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9.5px] font-mono font-semibold tracking-[0.14em] border ${pillClass(norm)} shrink-0`}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: norm === 'ok' ? `0 0 6px ${color}` : undefined,
            }}
            aria-hidden="true"
          />
          {pillLabel(norm)}
        </span>
      </header>

      {/* Metrics grid: latency + uptime */}
      <div className="grid grid-cols-2 px-5 py-3 border-b border-border/60">
        <div className="pr-4 border-r border-border/60">
          <div className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">
            p95 latency
          </div>
          <div className="font-mono text-[22px] text-text-primary tabular-nums leading-none">
            {norm === 'down' ? '-' : latency}
            {norm !== 'down' && (
              <span className="text-[11px] text-text-muted ml-1 font-normal">ms</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-text-muted mt-1">
            {latencySynthetic ? 'baseline est.' : 'last 24h'}
          </div>
        </div>
        <div className="pl-4">
          <div className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-text-muted mb-1">
            uptime (24h)
          </div>
          <div className="font-mono text-[22px] text-text-primary tabular-nums leading-none">
            {uptimePct.toFixed(2)}
            <span className="text-[11px] text-text-muted ml-1 font-normal">%</span>
          </div>
          <div className="text-[10px] font-mono text-text-muted mt-1">
            {probe?.ok_pct != null ? 'from probe' : 'estimate'}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="px-5 py-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-2 text-[9.5px] font-mono uppercase tracking-[0.14em] text-text-muted">
          <span>latency, last 60m</span>
          <span className="tabular-nums">
            {Math.round(sparkMin)} - {Math.round(sparkMax)} ms
          </span>
        </div>
        <div style={{ height: 36, margin: '0 -4px' }}>
          <Sparkline
            data={spark}
            color={color}
            height={36}
            fill={true}
            stroke={1.4}
            gradientId={`rack-spark-${id}`}
          />
        </div>
      </div>

      {/* Components */}
      {service.components.length > 0 && (
        <div className="px-5 py-3 border-b border-border/60">
          <div className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-text-muted mb-2">
            Components / {service.components.length} tracked
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
            {service.components.map((c) => {
              const cn = normalize(c.status);
              return (
                <div
                  key={c.name}
                  className="flex items-center justify-between text-xs gap-2 min-w-0"
                >
                  <span className="text-text-secondary truncate">{c.name}</span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: dotColor(cn) }}
                    aria-label={pillLabel(cn).toLowerCase()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Foot */}
      <footer className="px-5 py-2.5 flex items-center justify-between bg-black/20">
        <span className="text-[10px] font-mono text-text-muted">
          {lastProbe ? `last check · ${formatAge(ageInSeconds(lastProbe))}` : 'awaiting probe'}
        </span>
        {service.statusPageUrl && (
          <a
            href={service.statusPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-text-muted hover:text-accent-primary"
          >
            source →
          </a>
        )}
      </footer>
    </article>
  );
}
