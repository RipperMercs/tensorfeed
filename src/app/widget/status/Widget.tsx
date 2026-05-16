'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Condition, Feed, Item, ItemState } from './types';
import { fetchFeed, POLL_MS } from './feed';

/**
 * TensorFeed Live Monitor. 1:1 port of the design prototype, wired to
 * the live TensorFeed feeds via feed.ts. The scenario simulator and
 * Tweaks panel from the prototype are intentionally dropped (dev-only).
 */

const STATUS_LABEL: Record<ItemState, string> = {
  nominal: 'NOMINAL',
  degraded: 'DEGRADED',
  downgraded: 'DOWNGRADED',
  critical: 'CRITICAL',
  // "offline" here means "no status source for this provider", a
  // coverage gap, NOT an outage. Label it so it never reads as "down".
  offline: 'NO DATA',
};

function computeCondition(items: Item[]): Condition {
  // offline is NOT escalated to a widget-wide Red Alert: TF "unknown"
  // status means "no status source right now" (a coverage gap), not a
  // confirmed outage. Only a real critical (vendor down) klaxons red.
  if (items.some((i) => i.state === 'critical')) return 'critical';
  if (items.some((i) => i.state === 'degraded' || i.state === 'downgraded')) return 'degraded';
  return 'nominal';
}

function countStates(items: Item[]) {
  return items.reduce(
    (a, i) => {
      a[i.state] += 1;
      return a;
    },
    { nominal: 0, degraded: 0, downgraded: 0, critical: 0, offline: 0 } as Record<ItemState, number>,
  );
}

function formatAgo(s: number | null): string {
  if (s == null) return 'n/a';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// An unlabeled time on a global status product is ambiguous. Render the
// viewer's local time with its short timezone (e.g. "20:52:31 PDT").
function clockLabel(d: Date): string {
  const t = d.toLocaleTimeString([], { hour12: false });
  try {
    const tz = new Intl.DateTimeFormat([], { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName');
    return tz ? `${t} ${tz.value}` : `${t} local`;
  } catch {
    return `${t} local`;
  }
}

function TFMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/tf-widget-mark.png" alt="" className="tf-mark" aria-hidden="true" width={34} height={27} />
  );
}

function Row({ item }: { item: Item }) {
  return (
    <li className="tf-row" data-state={item.state}>
      <div className="tf-r-status">
        <span className="tf-r-dot" aria-hidden="true" />
        <span>{STATUS_LABEL[item.state]}</span>
      </div>
      <div className="tf-r-name">
        <span className="tf-r-name-text">{item.name}</span>
        <span className="tf-r-vendor">{item.vendor}</span>
      </div>
      {/* Sparkline only where there is a real latency probe. Drawing a
          chart on a no-probe row implies a series we do not have, which
          on a trust widget is worse than no chart. */}
      {item.latencyMs != null ? (
        <div className="tf-r-spark" role="img" aria-label={`Latency trend for ${item.name}`}>
          {item.history.map((v, i) => (
            <div key={i} className="tf-r-spark-bar" style={{ height: `${v * 100}%` }} />
          ))}
        </div>
      ) : (
        <div className="tf-r-spark" aria-hidden="true" />
      )}
      <div className="tf-r-metric">
        {item.latencyMs != null ? (
          <>
            {item.latencyMs.toLocaleString()}
            <span className="tf-r-unit">ms</span>
          </>
        ) : item.uptimePct != null ? (
          <>
            {Number.isInteger(item.uptimePct) ? item.uptimePct : item.uptimePct.toFixed(1)}
            <span className="tf-r-unit">%</span>
          </>
        ) : (
          'n/a'
        )}
        <div className="tf-r-meta">
          {item.latencyMs != null
            ? `last ${formatAgo(item.lastCheckedAgoS)}`
            : item.uptimePct != null
              ? '7d uptime'
              : item.state === 'offline'
                ? `last ${formatAgo(item.lastCheckedAgoS)}`
                : 'monitored'}
        </div>
      </div>
      <div className="tf-r-act">
        <button
          type="button"
          onClick={() => window.open(item.detailHref, '_blank', 'noopener,noreferrer')}
        >
          Detail
        </button>
      </div>
    </li>
  );
}

function TabBtn({
  active,
  onClick,
  count,
  counts,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  counts: Record<ItemState, number>;
  children: string;
}) {
  const badge =
    counts.critical > 0 ? 'crit' : counts.degraded > 0 ? 'warn' : counts.downgraded > 0 ? 'warn2' : null;
  return (
    <button type="button" className="tf-tab" role="tab" aria-selected={active} onClick={onClick}>
      <span>{children}</span>
      <span className="tf-tab-count">{count}</span>
      {badge && <span className="tf-tab-badge" data-kind={badge} aria-hidden="true" />}
    </button>
  );
}

// 'downgraded' omitted: it is a routing-layer signal TF never publishes
// (feed.ts never produces it), so a filter for it would be dead UI.
const FILTERS = ['all', 'issues', 'nominal', 'degraded', 'critical', 'offline'] as const;
const FILTER_LABEL: Record<string, string> = { offline: 'no data' };
type Filter = (typeof FILTERS)[number];

function readAppearance(): { accent: 'blue' | 'green'; accentAuto: boolean; pollMs: number } {
  if (typeof window === 'undefined') return { accent: 'blue', accentAuto: false, pollMs: POLL_MS };
  const q = new URLSearchParams(window.location.search);
  // Default is blue: a light-blue bridge spine against green status
  // indicators reads as a sci-fi array and keeps contrast in the
  // all-nominal state. auto (design default) and green stay opt-in.
  const a = (q.get('accent') || 'blue').toLowerCase();
  const pollParam = Number(q.get('poll'));
  const pollMs =
    Number.isFinite(pollParam) && pollParam >= 5 && pollParam <= 600 ? pollParam * 1000 : POLL_MS;
  return {
    accent: a === 'green' ? 'green' : 'blue',
    accentAuto: a !== 'blue' && a !== 'green',
    pollMs,
  };
}

type DemoScenario = 'nominal' | 'degraded' | 'critical' | 'offline';
const DEMO_SCENARIOS: DemoScenario[] = ['nominal', 'degraded', 'critical', 'offline'];

function readDemo(): DemoScenario | null {
  if (typeof window === 'undefined') return null;
  const d = (new URLSearchParams(window.location.search).get('demo') || '').toLowerCase();
  return (DEMO_SCENARIOS as string[]).includes(d) ? (d as DemoScenario) : null;
}

// Opt-in preview of the alert chrome so the yellow/red/no-data states
// can be verified without waiting for a real outage. Off unless ?demo=
// is in the URL, so real embeds and the extension popup (which never
// pass it) are completely unaffected. Forces every row to the chosen
// state so the condition rollup, klaxon, spine, and alert strip all
// show. A loud SIMULATION banner is rendered whenever this is active so
// it can never be mistaken for real status.
function applyDemo(feed: Feed, s: DemoScenario): Feed {
  const map = (it: Item): Item =>
    s === 'offline'
      ? { ...it, state: 'offline', latencyMs: null, uptimePct: null }
      : { ...it, state: s };
  return { ...feed, llms: feed.llms.map(map), services: feed.services.map(map) };
}

const SKELETON_ROWS = Array.from({ length: 6 });

export default function Widget() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'llms' | 'services'>('llms');
  const [filter, setFilter] = useState<Filter>('all');
  const [now, setNow] = useState<Date | null>(null);
  const [appearance, setAppearance] = useState(() => ({
    accent: 'blue' as 'blue' | 'green',
    accentAuto: false,
    pollMs: POLL_MS,
  }));
  const [demo, setDemo] = useState<DemoScenario | null>(null);
  const failRef = useRef(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    setAppearance(readAppearance());
    setDemo(readDemo());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    setNow(new Date());
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const next = await fetchFeed();
      if (cancelled) return;
      if (next) {
        failRef.current = 0;
        setFailCount(0);
        setFeed(next);
      } else {
        failRef.current += 1;
        setFailCount(failRef.current);
      }
      setLoading(false);
    }
    poll();
    const id = setInterval(poll, appearance.pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [appearance.pollMs]);

  const effFeed = useMemo(() => (demo && feed ? applyDemo(feed, demo) : feed), [feed, demo]);
  const llms = effFeed?.llms ?? [];
  const services = effFeed?.services ?? [];
  const items = tab === 'llms' ? llms : services;

  const visible = useMemo(
    () =>
      items.filter((i) =>
        filter === 'all' ? true : filter === 'issues' ? i.state !== 'nominal' : i.state === filter,
      ),
    [items, filter],
  );

  const baseCondition = computeCondition([...llms, ...services]);
  const condition: Condition =
    failCount >= 3 ? 'critical' : failCount > 0 && baseCondition === 'nominal' ? 'degraded' : baseCondition;

  const counts = countStates(items);
  const countsAll = countStates([...llms, ...services]);
  const llmCounts = countStates(llms);
  const svcCounts = countStates(services);

  const resolvedAccent = appearance.accentAuto
    ? condition === 'nominal'
      ? 'green'
      : 'blue'
    : appearance.accent;

  const conditionLabel =
    condition === 'critical' ? 'Red Alert' : condition === 'degraded' ? 'Yellow Alert' : 'Condition Green';

  const pollLabel = `Poll · ${Math.round(appearance.pollMs / 1000)}s`;

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const next = await fetchFeed();
    if (next) {
      failRef.current = 0;
      setFailCount(0);
      setFeed(next);
    } else {
      failRef.current += 1;
      setFailCount(failRef.current);
    }
    setRefreshing(false);
  };

  return (
    <>
    {demo && (
      <div
        role="alert"
        style={{
          width: '100%',
          background: '#f5a623',
          color: '#0a0a0f',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '8px 14px',
          boxSizing: 'border-box',
        }}
      >
        Simulation: sample data to preview alert states (?demo={demo}). Not live. Remove the demo
        parameter for real status.
      </div>
    )}
    <div
      className="tf-widget"
      data-condition={condition}
      data-accent={resolvedAccent}
      role="region"
      aria-label="TensorFeed live monitor"
    >
      <div className="tf-spine" aria-hidden="true">
        <span className="tf-spine-code">TF-FEED</span>
      </div>
      <span className="tf-corners" aria-hidden="true" />

      <div className="tf-klaxon" role="status" aria-live="polite">
        <span className="tf-lamp" aria-hidden="true" />
        <span className="tf-klaxon-label">{conditionLabel}</span>
        <span className="tf-klaxon-status">
          {countsAll.critical > 0 && (
            <>
              · <b>{countsAll.critical}</b> critical{' '}
            </>
          )}
          {countsAll.degraded > 0 && (
            <>
              · <b>{countsAll.degraded}</b> degraded{' '}
            </>
          )}
          {condition === 'nominal' && (
            <>
              · all monitored systems <b>nominal</b>{' '}
            </>
          )}
          {/* no-data is a coverage gap, shown neutrally, never as an
              alert, so the green headline never contradicts itself. */}
          {countsAll.offline > 0 && (
            <>
              · <b>{countsAll.offline}</b> no data{' '}
            </>
          )}
          {failCount > 0 && (
            <>
              · <b>poll failed</b>
            </>
          )}
        </span>
        <span className="tf-klaxon-clock">
          {now ? clockLabel(now) : ''}
        </span>
      </div>

      <div className="tf-head">
        <TFMark />
        <span className="tf-title">TENSORFEED</span>
        <span className="tf-sub">{'// live monitor'}</span>
        <span className="tf-tickrail" aria-hidden="true" />
      </div>

      <div className="tf-tabs" role="tablist" aria-label="Feed type">
        <TabBtn active={tab === 'llms'} onClick={() => setTab('llms')} count={llms.length} counts={llmCounts}>
          LLMs
        </TabBtn>
        <TabBtn
          active={tab === 'services'}
          onClick={() => setTab('services')}
          count={services.length}
          counts={svcCounts}
        >
          Services
        </TabBtn>
      </div>

      <div className="tf-filter">
        <span className="tf-filter-label">{'Filter //'}</span>
        <div className="tf-seg" role="group" aria-label="Filter by state">
          {FILTERS.map((k) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {FILTER_LABEL[k] ?? k}
            </button>
          ))}
        </div>
        <span className="tf-filter-grow" />
        <span className="tf-filter-now">
          SHOWING {visible.length} / {items.length}
        </span>
      </div>

      <ul className="tf-feed" role="list">
        {loading ? (
          SKELETON_ROWS.map((_, i) => (
            <li key={i} className="tf-row tf-skel" aria-hidden="true">
              <div />
              <div />
              <div />
              <div />
              <div />
            </li>
          ))
        ) : visible.length === 0 ? (
          <li className="tf-empty">
            {items.length === 0 ? 'No endpoints reporting yet.' : 'Nothing matches that filter.'}
          </li>
        ) : (
          visible.map((item) => <Row key={item.id} item={item} />)
        )}
      </ul>

      <div className="tf-foot">
        <span className="tf-stat">
          Healthy <b className="tf-stat-v">{counts.nominal}</b>
        </span>
        <span className="tf-stat">
          Issues{' '}
          <b className="tf-stat-v">
            {/* no-data excluded: a missing status source is not an
                outage, so Issues stays consistent with Condition Green */}
            {counts.degraded + counts.downgraded + counts.critical}
          </b>
        </span>
        <span className="tf-foot-grow" />
        <span>{pollLabel}</span>
        <button type="button" className="tf-refresh" onClick={doRefresh} disabled={refreshing}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              animation: refreshing ? 'tf-spin 0.8s linear infinite' : undefined,
            }}
          >
            ↻
          </span>{' '}
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {condition === 'critical' && (
        <div className="tf-alert-strip" role="alert">
          <span className="tf-alert-glyph" aria-hidden="true">
            ⚠
          </span>
          <span>Manual intervention recommended. On-call should review.</span>
          <span className="tf-foot-grow" />
          <span className="tf-alert-incident">
            incident #INC-{now ? Math.floor(now.getTime() / 60000) % 10000 : '0000'}
          </span>
        </div>
      )}
      <style>{`@keyframes tf-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
    </>
  );
}
