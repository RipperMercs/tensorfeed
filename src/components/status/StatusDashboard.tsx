'use client';

import { useEffect, useState } from 'react';
import './AlertGlow.css';
import ProviderTabStrip from './ProviderTabStrip';
import RackCard from './RackCard';
import IncidentTimeline from './IncidentTimeline';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

interface Incident {
  id: string;
  service: string;
  provider: string;
  severity: string;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

type Norm = 'ok' | 'warn' | 'down' | 'unknown';

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  operational: 2,
};

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

function probeProviderKey(serviceName: string): string | null {
  const n = serviceName.toLowerCase();
  if (n.includes('claude') || n.includes('anthropic')) return 'anthropic';
  if (n.includes('openai')) return 'openai';
  if (n.includes('gemini') || n.includes('google')) return 'gemini';
  if (n.includes('cohere')) return 'cohere';
  if (n.includes('mistral')) return 'mistral';
  return null;
}

function formatCountdown(ms: number): string {
  if (ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  return `${secs}s`;
}

function SkeletonRack() {
  return (
    <div className="tf-rack p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-10 bg-bg-tertiary rounded" />
          <div>
            <div className="h-4 bg-bg-tertiary rounded w-32 mb-2" />
            <div className="h-2 bg-bg-tertiary rounded w-20" />
          </div>
        </div>
        <div className="h-5 bg-bg-tertiary rounded w-24" />
      </div>
      <div className="h-12 bg-bg-tertiary/60 rounded mb-3" />
      <div className="h-9 bg-bg-tertiary/60 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-bg-tertiary rounded w-3/4" />
        <div className="h-3 bg-bg-tertiary rounded w-2/3" />
      </div>
    </div>
  );
}

export default function StatusDashboard() {
  const [statuses, setStatuses] = useState<StatusService[]>([]);
  const [probes, setProbes] = useState<ProbeAggregate[]>([]);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSweep, setLastSweep] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function pollAll() {
      try {
        const [statusRes, probeRes, incidentRes] = await Promise.all([
          fetch('https://tensorfeed.ai/api/status', { cache: 'no-store' }),
          fetch('https://tensorfeed.ai/api/probe/latest', { cache: 'no-store' }).catch(() => null),
          fetch('https://tensorfeed.ai/api/incidents', { cache: 'no-store' }).catch(() => null),
        ]);
        if (cancelled) return;

        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.ok && data.services?.length) {
            const sorted = [...data.services].sort(
              (a: StatusService, b: StatusService) =>
                (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3),
            );
            setStatuses(sorted);
            setLastSweep(new Date());
          }
        }

        if (probeRes && probeRes.ok) {
          const j = await probeRes.json();
          if (j?.summary?.providers) setProbes(j.summary.providers as ProbeAggregate[]);
        }

        if (incidentRes && incidentRes.ok) {
          const j = await incidentRes.json();
          if (Array.isArray(j.incidents)) setIncidents(j.incidents as Incident[]);
          else setIncidents([]);
        }
      } catch {
        // Network blip; keep last-known.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    pollAll();
    const interval = setInterval(pollAll, 120_000);
    // Tick re-renders the last-incident counter every second without
    // touching other state. Single setInterval per spec section 7.
    const tickInterval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, []);

  const operationalCount = statuses.filter((s) => s.status === 'operational').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const downCount = statuses.filter((s) => s.status === 'down').length;
  const unknownCount = statuses.filter(
    (s) => !['operational', 'degraded', 'down'].includes(s.status),
  ).length;

  const overall: Norm =
    downCount > 0 ? 'down' : degradedCount > 0 ? 'warn' : statuses.length > 0 ? 'ok' : 'unknown';

  const headlineCls =
    overall === 'down' ? 'tf-headline-down' : overall === 'warn' ? 'tf-headline-warn' : 'tf-headline-ok';
  const headlineText =
    overall === 'down'
      ? 'Service Disruption'
      : overall === 'warn'
        ? 'Partial Degradation'
        : 'All Systems Nominal';

  // Last major incident: most recent 'down' or 'major' severity in the
  // incidents feed. Counter shows time since startedAt.
  const lastMajor = incidents
    ? incidents.find((i) => {
        const s = (i.severity || '').toLowerCase();
        return s === 'major' || s === 'critical' || s === 'down' || s === 'major_outage';
      })
    : null;
  const lastMajorMs = lastMajor ? Date.now() - new Date(lastMajor.startedAt).getTime() : null;

  // Indexed probes for RackCard lookup.
  const probeByKey: Record<string, ProbeAggregate> = {};
  for (const p of probes) probeByKey[p.provider] = p;

  return (
    <>
      {/* Page chrome: corner crosshairs + faint grid mask. Decorative. */}
      <span className="tf-corner tf-corner-tl" aria-hidden="true" />
      <span className="tf-corner tf-corner-tr" aria-hidden="true" />
      <span className="tf-corner tf-corner-bl" aria-hidden="true" />
      <span className="tf-corner tf-corner-br" aria-hidden="true" />
      <span className="tf-grid-mask" aria-hidden="true" />

      {/* Header */}
      <header className="mb-8 relative">
        <div className="flex items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted flex-wrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
          <span>Live monitoring</span>
          <span className="text-border">/</span>
          <span>AI infrastructure</span>
          <span className="text-border">/</span>
          <span>Polled every 2 minutes</span>
          <span className="text-border">/</span>
          <span>Observatory uplink stable</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] ${headlineCls}`}
            aria-label={headlineText}
            style={{ letterSpacing: '-0.035em' }}
          >
            {headlineText}
          </h1>
          {lastMajor && lastMajorMs != null ? (
            <div className="bg-bg-secondary/60 border border-border rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-2">
                Time since last major incident
              </div>
              <div
                className="text-[26px] font-mono font-bold tabular-nums leading-none"
                style={{ color: '#06b6d4' }}
              >
                {formatCountdown(lastMajorMs)}
              </div>
              <div className="text-[11px] text-text-muted mt-2 leading-snug">
                {lastMajor.service}: {lastMajor.title}
              </div>
            </div>
          ) : (
            <div className="bg-bg-secondary/60 border border-border rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted mb-2">
                Last major incident
              </div>
              <div className="text-[15px] font-mono text-accent-green">No major incidents on record</div>
              <div className="text-[11px] text-text-muted mt-2 leading-snug">
                Stability is the norm. Counter starts on the next outage.
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Summary band */}
      <section
        aria-label="Status summary"
        role="status"
        aria-live="polite"
        className="bg-bg-secondary border border-border rounded-lg p-5 mb-8 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-5 items-center relative"
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
              {lastSweep
                ? `Last sweep ${lastSweep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : 'Awaiting first sweep'}
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

      {/* Provider tab strip (kinetic) */}
      {statuses.length > 0 && <ProviderTabStrip services={statuses} />}

      {/* Rack grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonRack key={i} />)
          : statuses.map((service, i) => {
              const probeKey = probeProviderKey(service.name);
              const probe = probeKey ? probeByKey[probeKey] ?? null : null;
              return (
                <RackCard
                  key={service.name}
                  service={service}
                  probe={probe}
                  rackIndex={i}
                />
              );
            })}
      </div>

      {/* Incident timeline (last 7 days) */}
      <IncidentTimeline />
    </>
  );
}
