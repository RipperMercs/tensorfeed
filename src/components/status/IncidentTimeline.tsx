'use client';

import { useEffect, useState } from 'react';

interface Incident {
  id: string;
  service: string;
  provider: string;
  severity: string;       // raw label from upstream
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

type SeverityBand = 'outage' | 'degraded' | 'notice' | 'resolved';

function bandFor(i: Incident): SeverityBand {
  if (i.resolvedAt) return 'resolved';
  const s = (i.severity || '').toLowerCase();
  if (s === 'major' || s === 'critical' || s === 'down' || s === 'major_outage') return 'outage';
  if (s === 'minor' || s === 'degraded' || s === 'partial_outage' || s === 'degraded_performance') return 'degraded';
  return 'notice';
}

function bandLabel(b: SeverityBand): string {
  return b.toUpperCase();
}

function bandClass(b: SeverityBand): string {
  switch (b) {
    case 'outage':
      return 'bg-accent-red/10 text-accent-red border-accent-red/30';
    case 'degraded':
      return 'bg-accent-amber/10 text-accent-amber border-accent-amber/30';
    case 'notice':
      return 'bg-bg-tertiary text-text-secondary border-border';
    case 'resolved':
      return 'bg-accent-green/10 text-accent-green border-accent-green/30';
  }
}

function formatStart(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(mins: number | null, resolved: boolean): string {
  if (mins == null) return resolved ? 'resolved' : 'ongoing';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

export default function IncidentTimeline() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchIncidents() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/incidents', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.incidents)) {
          const sevenDaysAgo = Date.now() - 7 * 86400_000;
          const recent = (data.incidents as Incident[])
            .filter((i) => {
              const t = new Date(i.startedAt).getTime();
              return Number.isFinite(t) && t >= sevenDaysAgo;
            })
            .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
          setIncidents(recent);
        } else {
          setIncidents([]);
        }
      } catch {
        if (!cancelled) setIncidents([]);
      }
    }
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <section
      aria-label="Recent incident activity"
      className="bg-bg-secondary border border-border rounded-lg overflow-hidden"
    >
      <header className="flex items-center justify-between px-5 py-3 bg-bg-tertiary border-b border-border">
        <h2 className="text-sm font-mono uppercase tracking-[0.14em] text-text-secondary">
          Recent activity
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
          Last 7 days {incidents != null && `· ${incidents.length} event${incidents.length === 1 ? '' : 's'}`}
        </span>
      </header>
      {incidents == null ? (
        <div className="px-5 py-8 text-text-muted text-sm font-mono">Loading activity log...</div>
      ) : incidents.length === 0 ? (
        <div className="px-5 py-8 text-text-muted text-sm font-mono">
          No incidents in the last 7 days. Provider stability is the norm.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {incidents.slice(0, 20).map((i) => {
            const band = bandFor(i);
            return (
              <li key={i.id} className="px-5 py-3 grid gap-2 sm:gap-3 sm:grid-cols-[120px_110px_140px_1fr_80px] items-center">
                <span className="text-[11px] font-mono text-text-muted tabular-nums">
                  {formatStart(i.startedAt)}
                </span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-[0.12em] border ${bandClass(band)} w-fit`}
                >
                  {bandLabel(band)}
                </span>
                <span className="text-xs font-mono text-text-secondary truncate">{i.service}</span>
                <span className="text-sm text-text-primary truncate">{i.title}</span>
                <span className="text-[11px] font-mono text-text-muted text-right tabular-nums">
                  {formatDuration(i.durationMinutes, i.resolvedAt != null)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
