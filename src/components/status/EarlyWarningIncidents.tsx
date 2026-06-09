'use client';

import { useEffect, useState } from 'react';
import { pickService, type ServiceStatusData } from '@/lib/status-display';

// Poll cadence. Matches LiveServiceStatus and the "auto-refreshes every 2
// minutes" copy on the /is-X-down pages.
const POLL_MS = 120_000;

// /api/status services carry an additive early_warning when TensorFeed's own
// probes detect provider-side degradation the vendor page is not confirming
// yet. ServiceStatusData (shared display helper type) does not model it, so
// extend here.
interface EarlyWarning {
  source: string;
  note: string;
  detected_at: string | null;
  probe_signal: string;
}

interface ServiceWithWarning extends ServiceStatusData {
  early_warning?: EarlyWarning;
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

function pickServiceWithWarning(payload: unknown, name: string): ServiceWithWarning | null {
  // pickService validates shape and finds the entry; the runtime object keeps
  // early_warning, so widening the static type here is safe.
  return pickService(payload, name) as ServiceWithWarning | null;
}

function parseIncidents(payload: unknown, serviceName: string): Incident[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as { incidents?: unknown };
  if (!Array.isArray(data.incidents)) return [];
  return (data.incidents as Incident[])
    .filter((i) => i && i.service === serviceName)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return 'ongoing';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function IncidentsSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border animate-pulse" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-5 py-4">
          <div className="h-3.5 bg-bg-tertiary rounded w-2/3 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Lean companion island for the /is-X-down pages, rendered directly under
 * LiveServiceStatus (which owns the big verdict). Polls /api/status and
 * /api/incidents every two minutes and adds the two things the verdict card
 * lacks: the early-warning probe callout (rendered only while an
 * early_warning is present; polling continues regardless) and the last 10
 * incidents for this service.
 */
export default function EarlyWarningIncidents({
  serviceName,
  provider,
}: {
  serviceName: string;
  provider: string;
}) {
  const [earlyWarning, setEarlyWarning] = useState<EarlyWarning | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [incidentsFailed, setIncidentsFailed] = useState(false);

  useEffect(() => {
    if (!serviceName) return;
    let cancelled = false;

    const poll = async () => {
      const [statusRes, incidentRes] = await Promise.all([
        fetch('/api/status', { cache: 'no-store' }).catch(() => null),
        fetch('/api/incidents', { cache: 'no-store' }).catch(() => null),
      ]);
      if (cancelled) return;

      if (statusRes && statusRes.ok) {
        try {
          const service = pickServiceWithWarning(await statusRes.json(), serviceName);
          if (!cancelled && service) setEarlyWarning(service.early_warning ?? null);
        } catch {
          // keep the last known early-warning state on a malformed response
        }
      }

      // Failures only flag; the render keeps any already-loaded list, so a
      // blip mid-session never replaces real history with an error card.
      if (incidentRes && incidentRes.ok) {
        try {
          const next = parseIncidents(await incidentRes.json(), serviceName);
          if (!cancelled) {
            setIncidents(next);
            setIncidentsFailed(false);
          }
        } catch {
          if (!cancelled) setIncidentsFailed(true);
        }
      } else if (!cancelled) {
        setIncidentsFailed(true);
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [serviceName]);

  return (
    <>
      {/* Early-warning probe signal: only rendered while /api/status carries one. */}
      {earlyWarning && (
        <div
          className="bg-accent-amber/10 border border-accent-amber/40 rounded-xl p-5 mb-8"
          role="alert"
        >
          <p className="text-sm font-semibold text-accent-amber mb-1">
            Early warning from TensorFeed probes
            {earlyWarning.probe_signal ? (
              <span className="font-mono font-normal"> ({earlyWarning.probe_signal})</span>
            ) : null}
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {earlyWarning.note} TensorFeed runs its own synthetic probes against major AI APIs, so
            it can flag provider-side degradation before the vendor status page admits it.
          </p>
          {earlyWarning.detected_at && (
            <p className="text-text-muted text-xs font-mono mt-2">
              Detected {formatStamp(earlyWarning.detected_at)}
            </p>
          )}
        </div>
      )}

      {/* Incident history */}
      <section aria-label={`Recent ${provider} incidents`} className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Recent {provider} incidents
        </h2>
        {incidents === null ? (
          incidentsFailed ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-5">
              <p className="text-text-secondary text-sm">
                Incident history is temporarily unavailable. The live status above still updates;
                this list retries every two minutes.
              </p>
            </div>
          ) : (
            <IncidentsSkeleton />
          )
        ) : incidents.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <p className="text-text-secondary text-sm">
              No {provider} incidents in TensorFeed&apos;s recent transition log. Quiet is the
              norm; this list fills in the moment our monitor sees the status flip.
            </p>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
            {incidents.map((incident) => (
              <div key={incident.id} className="px-4 sm:px-5 py-3.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-sm text-text-primary">{incident.title}</p>
                  <span
                    className={`text-xs font-mono shrink-0 ${incident.resolvedAt ? 'text-text-muted' : 'text-accent-amber'}`}
                  >
                    {formatDuration(incident.durationMinutes)}
                  </span>
                </div>
                <p className="text-xs text-text-muted font-mono mt-1">
                  Started {formatStamp(incident.startedAt)}
                  {incident.resolvedAt
                    ? `, resolved ${formatStamp(incident.resolvedAt)}`
                    : ', still open'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
