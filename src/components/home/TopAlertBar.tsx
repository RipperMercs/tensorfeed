'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, X } from 'lucide-react';
import StatusAlertBar from './StatusAlertBar';
import {
  chooseBar,
  isSafeHref,
  type StatusAlertBarService,
  type BreakingAlert,
} from '@/lib/alert-bar-logic';

const POLL_INTERVAL_MS = 90_000;
const DISMISS_KEY = 'tf-breaking-dismissed';

export default function TopAlertBar() {
  const [services, setServices] = useState<StatusAlertBarService[]>([]);
  const [breaking, setBreaking] = useState<BreakingAlert | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      /* sessionStorage unavailable */
    }
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const [s, b] = await Promise.all([
          fetch('/api/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/breaking', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        if (s?.ok && Array.isArray(s.services)) {
          setServices(s.services.map((x: StatusAlertBarService) => ({ name: x.name, status: x.status })));
        }
        // Server is the sole expiry authority: trust its alert (or null) verbatim.
        if (b?.ok) setBreaking(b.alert ?? null);
      } catch {
        /* keep last-known-good */
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const dismissed = !!breaking && dismissedId === breaking.id;
  const which = chooseBar({ services, breaking, dismissed });

  if (which === 'breaking' && breaking) {
    const dismiss = () => {
      try {
        sessionStorage.setItem(DISMISS_KEY, breaking.id);
      } catch {
        /* ignore */
      }
      setDismissedId(breaking.id);
      if (typeof document !== 'undefined') document.body.focus();
    };
    // headline renders as a React text child only. NEVER dangerouslySetInnerHTML.
    const headline = (
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }} className="truncate">
        {breaking.headline}
      </span>
    );
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b"
        style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.30)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          {/* leading-4 (16px) normalizes the row line-box: the 11px label and
              13px headline otherwise inherit a 24px line-height, leaving the
              headline taller than the icon and label and reading as uneven.
              16px matches the w-4 icon so all three sit on one line. */}
          <div className="inline-flex items-center gap-2.5 min-w-0 leading-4">
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-breaking)' }} aria-hidden="true" />
            <span
              className="font-mono flex-shrink-0"
              style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-breaking)' }}
            >
              Breaking
            </span>
            {isSafeHref(breaking.href) ? (
              <Link href={breaking.href} className="hover:underline min-w-0 truncate">
                {headline}
              </Link>
            ) : (
              headline
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss breaking alert"
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 focus:outline-none focus:ring-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // incident or status: delegate to StatusAlertBar (incident bar or green strip).
  return <StatusAlertBar services={services} />;
}
