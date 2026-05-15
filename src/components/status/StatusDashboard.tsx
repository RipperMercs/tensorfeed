'use client';

import { useEffect, useState } from 'react';
import './AlertGlow.css';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

type Norm = 'ok' | 'warn' | 'down' | 'unknown';

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  operational: 2,
};

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

function StatusCard({ service }: { service: StatusService }) {
  const n = normalize(service.status);
  const rackCls = `tf-rack ${n === 'warn' ? 'tf-rack-warn' : n === 'down' ? 'tf-rack-down' : n === 'unknown' ? 'tf-rack-unknown' : ''}`;
  const checkedTime = service.lastChecked
    ? new Date(service.lastChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <article
      className={`${rackCls} p-5`}
      data-provider={service.provider.toLowerCase().replace(/\s+/g, '-')}
      aria-label={`${service.name} status: ${pillLabel(n)}`}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-text-primary font-semibold text-base truncate">{service.name}</h3>
          <p className="text-text-muted text-xs mt-0.5 font-mono uppercase tracking-wider">
            {service.provider}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold tracking-[0.12em] border ${pillClass(n)}`}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: dotColor(n),
              boxShadow: n === 'ok' ? `0 0 6px ${dotColor(n)}` : undefined,
            }}
            aria-hidden="true"
          />
          {pillLabel(n)}
        </span>
      </header>

      {service.components.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Components / {service.components.length} tracked
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
            {service.components.map((c) => {
              const cn = normalize(c.status);
              return (
                <div
                  key={c.name}
                  className="flex items-center justify-between text-xs gap-2 min-w-0"
                >
                  <span className="text-text-secondary truncate">{c.name}</span>
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: dotColor(cn) }}
                    aria-label={pillLabel(cn).toLowerCase()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <footer className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          {checkedTime ? `Last check ${checkedTime}` : 'Awaiting probe'}
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

function SkeletonCard() {
  return (
    <div className="tf-rack p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-4 bg-bg-tertiary rounded w-32 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-20" />
        </div>
        <div className="h-5 bg-bg-tertiary rounded w-24" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-bg-tertiary rounded w-full" />
        <div className="h-3 bg-bg-tertiary rounded w-3/4" />
        <div className="h-3 bg-bg-tertiary rounded w-2/3" />
      </div>
    </div>
  );
}

export default function StatusDashboard() {
  const [statuses, setStatuses] = useState<StatusService[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSweep, setLastSweep] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatuses() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/status', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.services?.length) {
          const sorted = [...data.services].sort(
            (a: StatusService, b: StatusService) =>
              (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3),
          );
          setStatuses(sorted);
          setLastSweep(new Date());
        }
      } catch {
        // Network blip; keep last-known.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const operationalCount = statuses.filter((s) => s.status === 'operational').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const downCount = statuses.filter((s) => s.status === 'down').length;
  const unknownCount = statuses.filter((s) => !['operational', 'degraded', 'down'].includes(s.status)).length;

  const overall: Norm = downCount > 0 ? 'down' : degradedCount > 0 ? 'warn' : statuses.length > 0 ? 'ok' : 'unknown';
  const headlineCls =
    overall === 'down'
      ? 'tf-headline-down'
      : overall === 'warn'
        ? 'tf-headline-warn'
        : 'tf-headline-ok';
  const headlineText =
    overall === 'down'
      ? 'Service Disruption'
      : overall === 'warn'
        ? 'Partial Degradation'
        : 'All Systems Nominal';

  return (
    <>
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
          <span>Live monitoring</span>
          <span className="text-border">/</span>
          <span>AI infrastructure</span>
          <span className="text-border">/</span>
          <span>Polled every 2 minutes</span>
        </div>
        <h1
          className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${headlineCls}`}
          aria-label={headlineText}
        >
          {headlineText}
        </h1>
        <p className="text-text-muted text-sm mt-3">
          Real-time operational status of major AI services. Each card pulses on degradation or outage.
        </p>
      </header>

      {/* Summary band — breathing LED + state counts + sweep meta */}
      <section
        aria-label="Status summary"
        role="status"
        aria-live="polite"
        className="bg-bg-secondary border border-border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-5 items-center"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`tf-master-led tf-led-${overall}`}
            style={{ color: dotColor(overall) }}
          />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-muted">
              {overall === 'down'
                ? 'Outage detected'
                : overall === 'warn'
                  ? 'Degradation detected'
                  : 'All systems nominal'}
            </div>
            <div className="text-[10px] font-mono text-text-muted mt-0.5">
              {lastSweep ? `Last sweep ${lastSweep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting first sweep'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-accent-green/30 bg-accent-green/10 text-accent-green">
            <span className="font-bold tabular-nums">{operationalCount}</span> operational
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
            <span className="font-bold tabular-nums">{degradedCount}</span> degraded
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-accent-red/30 bg-accent-red/10 text-accent-red">
            <span className="font-bold tabular-nums">{downCount}</span> down
          </span>
          {unknownCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-border bg-bg-tertiary text-text-muted">
              <span className="font-bold tabular-nums">{unknownCount}</span> unknown
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted text-right hidden sm:block">
          {statuses.length} probes / 60s cadence
        </div>
      </section>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : statuses.map((service) => <StatusCard key={service.name} service={service} />)}
      </div>
    </>
  );
}
