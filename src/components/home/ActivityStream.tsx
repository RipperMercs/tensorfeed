'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type EventKind = 'news' | 'status' | 'release' | 'agent' | 'benchmark';

interface ActivityEvent {
  time: string;
  ts: number;
  kind: EventKind;
  type: string;
  msg: React.ReactNode;
  href?: string;
}

interface ApiArticle {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
}

interface ApiService {
  name: string;
  status: string;
  provider?: string;
}

const HL = (s: string) => (
  <span style={{ color: 'var(--accent-cyan)' }}>{s}</span>
);

const BULLET_COLORS: Record<EventKind, string> = {
  news: 'var(--accent-cyan)',
  status: 'var(--accent-amber)',
  release: 'var(--accent-secondary)',
  agent: 'var(--accent-green)',
  benchmark: 'var(--accent-primary)',
};

const BULLET_GLOW: Record<EventKind, boolean> = {
  news: true,
  status: false,
  release: true,
  agent: false,
  benchmark: false,
};

const KIND_COLORS: Record<EventKind, string> = {
  news: 'var(--accent-cyan)',
  status: 'var(--accent-amber)',
  release: 'var(--accent-secondary)',
  agent: 'var(--text-secondary)',
  benchmark: 'var(--accent-primary)',
};

function fmtUtc(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}

function relativeAgo(ms: number): string {
  if (ms < 30_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3600_000)}h ago`;
}

function buildEvents(articles: ApiArticle[], services: ApiService[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const a of articles) {
    const ts = new Date(a.publishedAt).getTime();
    if (!ts || isNaN(ts)) continue;
    events.push({
      time: fmtUtc(a.publishedAt),
      ts,
      kind: 'news',
      type: 'NEW ARTICLE',
      msg: <>{HL(truncate(a.title, 90))}</>,
      href: a.url,
    });
  }

  const now = Date.now();
  for (const s of services) {
    const status = (s.status || '').toLowerCase();
    if (status === 'operational' || status === '' || status === 'unknown') continue;
    const isDown = status === 'down' || status === 'major' || status === 'outage';
    const isWarn = status === 'degraded' || status === 'partial' || status === 'warn';
    if (!isDown && !isWarn) continue;
    const offsetMs = (s.name.charCodeAt(0) % 7) * 60_000;
    const ts = now - offsetMs;
    events.push({
      time: fmtUtc(new Date(ts).toISOString()),
      ts,
      kind: 'status',
      type: isDown ? 'OUTAGE' : 'DEGRADED',
      msg: (
        <>
          {s.name} {HL(isDown ? 'reporting outage' : 'reporting degraded performance')}
        </>
      ),
    });
  }

  return events.sort((a, b) => b.ts - a.ts).slice(0, 8);
}

export default function ActivityStream() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [newsRes, statusRes] = await Promise.all([
          fetch('/api/news?limit=8', { cache: 'no-store' }),
          fetch('/api/status/summary', { cache: 'no-store' }),
        ]);
        const newsJson = newsRes.ok ? await newsRes.json() : null;
        const statusJson = statusRes.ok ? await statusRes.json() : null;
        if (cancelled) return;
        const articles: ApiArticle[] = newsJson?.articles ?? [];
        const services: ApiService[] = statusJson?.services ?? [];
        setEvents(buildEvents(articles, services));
        setUpdatedAt(Date.now());
      } catch {
        // leave existing state in place
      }
    }

    load();
    const refresh = setInterval(load, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, []);

  const lastUpdatedLabel = updatedAt ? relativeAgo(now - updatedAt) : 'loading';

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Live activity stream"
      className="overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-tertiary)',
        }}
      >
        <div
          className="flex items-center font-mono uppercase"
          style={{
            gap: 10,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            letterSpacing: '0.1em',
          }}
        >
          <span
            className="tf-live-dot"
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-green)',
              boxShadow: '0 0 8px var(--accent-green)',
            }}
          />
          Right now on TensorFeed
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          last updated {lastUpdatedLabel}
        </div>
      </div>

      <div className="relative" style={{ padding: '6px 0', maxHeight: 360, overflow: 'hidden' }}>
        {events.length === 0 && (
          <div
            className="font-mono"
            style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)' }}
          >
            Loading live activity…
          </div>
        )}
        {events.map((ev, i) => {
          const inner = (
            <>
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: BULLET_COLORS[ev.kind],
                  boxShadow: BULLET_GLOW[ev.kind] ? `0 0 6px ${BULLET_COLORS[ev.kind]}` : undefined,
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ev.time} UTC</span>
              <span
                className="uppercase"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  color: KIND_COLORS[ev.kind],
                }}
              >
                {ev.type}
              </span>
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 13,
                }}
              >
                {ev.msg}
              </span>
            </>
          );

          const className = `tf-activity-row grid items-center font-mono ${i === 0 ? 'tf-activity-enter' : ''}`;
          const style = {
            gridTemplateColumns: '14px 92px 110px 1fr',
            gap: 14,
            padding: '7px 20px',
            fontSize: 12,
            color: 'inherit',
            textDecoration: 'none',
            transition: 'background 0.12s',
          } as const;

          if (!ev.href) {
            return (
              <div key={`${ev.ts}-${i}`} className={className} style={style}>
                {inner}
              </div>
            );
          }

          const isExternal =
            ev.href.startsWith('http') ||
            ev.href.endsWith('.txt') ||
            ev.href.endsWith('.json') ||
            ev.href.endsWith('.xml');
          if (isExternal) {
            return (
              <a
                key={`${ev.ts}-${i}`}
                href={ev.href}
                className={className}
                style={style}
                target={ev.href.startsWith('http') ? '_blank' : undefined}
                rel={ev.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {inner}
              </a>
            );
          }

          return (
            <Link key={`${ev.ts}-${i}`} href={ev.href} className={className} style={style}>
              {inner}
            </Link>
          );
        })}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: 40,
            background: 'linear-gradient(to bottom, transparent, var(--bg-secondary))',
          }}
        />
      </div>
    </div>
  );
}
