'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Condition, Feed, Item, ItemState } from './types';
import { fetchFeed, POLL_MS, buildDemoFeed } from './feed';

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

// Component status to the widget's state-color vocabulary. Real data is
// already normalized by feed.ts cleanComponents (ok|warn|down|unknown);
// the extra aliases keep it robust if a vendor word slips through.
const COMP_CS: Record<string, string> = {
  ok: 'nominal', operational: 'nominal',
  warn: 'degraded', degraded: 'degraded', partial: 'degraded',
  down: 'critical', outage: 'critical', major: 'critical',
};
function compCs(status: string): string {
  return COMP_CS[(status || '').toLowerCase()] || 'offline';
}

// Per-provider wave desync. A deterministic hash of the id (same idea
// as makeHistory in feed.ts) gives each provider its own stable phase,
// duration and direction, so the alert rows never move in lockstep and
// the board reads organic, not like a synchronized rank. Stable across
// polls because it is id-seeded, so the wave never jumps on refresh.
// Only emitted for the animated states; other rows get no inline style.
function sweepVars(item: Item): CSSProperties | undefined {
  if (item.state !== 'critical' && item.state !== 'degraded') return undefined;
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) >>> 0;
  const dur = (1.8 + (h % 9) * 0.1).toFixed(2); // 1.80s to 2.60s
  const delay = (-(((h >>> 3) % 40) * 0.1)).toFixed(2); // 0 to -3.9s phase
  const dir = h & 1 ? 'reverse' : 'normal'; // half sweep the other way
  const vars: Record<string, string> = {
    '--sw-dur': `${dur}s`,
    '--sw-delay': `${delay}s`,
    '--sw-dir': dir,
  };
  return vars as CSSProperties;
}

function Row({
  item,
  open,
  onToggle,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
}) {
  const drawerId = `tf-d-${item.id}`;
  const hasComps = item.components.length > 0;
  return (
    <li className="tf-row-wrap" data-state={item.state}>
      {/* The whole summary is the disclosure control. A div with button
          semantics (not a real <button>) keeps the grid layout and the
          role="img" sparkline valid and avoids nested interactives. */}
      <div
        className="tf-row tf-row-sum"
        data-state={item.state}
        style={sweepVars(item)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
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
        <div className="tf-r-act" aria-hidden="true">
          <span className="tf-r-chev" data-open={open ? 'true' : undefined}>
            ▾
          </span>
        </div>
      </div>

      {open && (
        <div
          id={drawerId}
          className="tf-drawer"
          data-state={item.state}
          role="region"
          aria-label={`${item.name} detail`}
        >
          <div className="tf-dr-grid">
            <div className="tf-dr-cell">
              <span className="tf-dr-k">STATUS</span>
              <span className="tf-dr-v">{STATUS_LABEL[item.state]}</span>
            </div>
            {item.latencyMs != null && (
              <div className="tf-dr-cell">
                <span className="tf-dr-k">P95 LATENCY</span>
                <span className="tf-dr-v">
                  {item.latencyMs.toLocaleString()} ms <em>24h</em>
                </span>
              </div>
            )}
            {item.uptimePct != null && (
              <div className="tf-dr-cell">
                <span className="tf-dr-k">UPTIME</span>
                <span className="tf-dr-v">
                  {Number.isInteger(item.uptimePct) ? item.uptimePct : item.uptimePct.toFixed(2)}% <em>7d</em>
                </span>
              </div>
            )}
            {item.lastCheckedAgoS != null && (
              <div className="tf-dr-cell">
                <span className="tf-dr-k">LAST CHECK</span>
                <span className="tf-dr-v">{formatAgo(item.lastCheckedAgoS)} ago</span>
              </div>
            )}
          </div>

          {hasComps ? (
            <div className="tf-dr-comps">
              <div className="tf-dr-h">COMPONENTS / {item.components.length} TRACKED</div>
              <ul className="tf-dr-clist" role="list">
                {item.components.map((c) => (
                  <li key={c.name} className="tf-dr-citem">
                    <span className="tf-dr-cdot" data-cs={compCs(c.status)} aria-hidden="true" />
                    <span className="tf-dr-cname">{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="tf-dr-none">No component breakdown published by this vendor.</div>
          )}

          <div className="tf-dr-act">
            <a
              className="tf-dr-cta"
              href={item.detailHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Full 7-day history and incidents on TensorFeed{' '}
              <span aria-hidden="true">→</span>
            </a>
            {item.sourceUrl && (
              <a
                className="tf-dr-src"
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Vendor status page <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
      )}
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

// Demo mode now uses buildDemoFeed (feed.ts): a self-contained
// synthetic feed with zero network dependency, so ?demo= renders the
// alert chrome instantly and works offline. A loud SIMULATION banner
// is shown whenever it is active so it can never be mistaken for real
// status. Real embeds and the extension popup never pass ?demo=.

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
  // Which row's detail drawer is open (accordion: one at a time keeps a
  // compact embed from ballooning). Reset when the visible set changes
  // so a stale row from another tab/filter cannot stay expanded.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setAppearance(readAppearance());
    setDemo(readDemo());
  }, []);

  useEffect(() => {
    setOpenId(null);
  }, [tab, filter, demo]);

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

  // Demo mode renders a self-contained synthetic feed: no dependency on
  // the live API, the poll, or the network, so the alert chrome shows
  // instantly and works offline / before any fetch returns.
  const effFeed = useMemo(() => (demo ? buildDemoFeed(demo) : feed), [feed, demo]);
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
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
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
        {loading && !demo ? (
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
          visible.map((item) => (
            <Row
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() => setOpenId((o) => (o === item.id ? null : item.id))}
            />
          ))
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
    </div>
  );
}
