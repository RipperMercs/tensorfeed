'use client';

import { useEffect, useState } from 'react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import {
  type ServiceStatusData,
  statusHeading,
  statusMessage,
  statusBg,
  pickService,
} from '@/lib/status-display';

// Poll cadence. Matches the "auto-refreshes every 2 minutes" copy on the page
// and the 120s revalidate the static build uses for the first paint.
const POLL_MS = 120_000;

/**
 * The big status indicator + component breakdown for an /is-X-down page, made
 * genuinely live. The server build passes `initial` (fetched from /api/status)
 * so the static HTML ships with real status content for crawlers and first
 * paint; once hydrated, this island polls /api/status every two minutes and
 * updates in place. That makes the page's "auto-refreshes" claim true.
 */
export default function LiveServiceStatus({
  serviceName,
  providerName,
  initial,
  statusPageUrl,
}: {
  serviceName: string;
  providerName: string;
  initial: ServiceStatusData | null;
  /** When set, renders an "Official status page" link inside the card. */
  statusPageUrl?: string;
}) {
  const [service, setService] = useState<ServiceStatusData | null>(initial);
  // Gate the locale-formatted "Last checked" time on mount so the static build
  // and the first client render agree (avoids a timezone hydration mismatch).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // No tracked service name means nothing to poll against; show initial only.
    if (!serviceName) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (!res.ok) return;
        const next = pickService(await res.json(), serviceName);
        if (!cancelled && next) setService(next);
      } catch {
        // keep the last known state on a failed poll
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [serviceName]);

  const status = service?.status || 'unknown';

  return (
    <>
      {/* Big Status Indicator */}
      <div
        className={`bg-gradient-to-br ${statusBg(status)} border rounded-xl p-8 mb-8 text-center`}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className={`inline-block w-5 h-5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
          />
          <h2 className="text-2xl font-bold text-text-primary">
            {statusHeading(providerName, status)}
          </h2>
        </div>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          {statusMessage(providerName, status)}
        </p>
        {mounted && service?.lastChecked && (
          <p className="text-text-muted text-xs mt-4">
            Last checked:{' '}
            <span className="font-mono">
              {new Date(service.lastChecked).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        )}
        {statusPageUrl && (
          <p className="text-text-muted text-xs mt-3">
            Official status page:{' '}
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              {statusPageUrl.replace(/^https?:\/\//, '')}
            </a>
          </p>
        )}
      </div>

      {/* Component Status */}
      {service && service.components.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Component Status</h2>
          <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
            {service.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-text-secondary">{comp.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[comp.status] || STATUS_DOTS.unknown}`}
                  />
                  <span
                    className={`text-sm capitalize ${STATUS_COLORS[comp.status] || STATUS_COLORS.unknown}`}
                  >
                    {comp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
