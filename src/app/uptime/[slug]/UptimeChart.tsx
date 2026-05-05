'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface DayPoint {
  date: string;
  polls: number;
  operational: number;
  degraded: number;
  down: number;
  unknown: number;
  uptime_pct: number | null;
}

interface SeriesOk {
  ok: true;
  provider: string;
  range: { from: string; to: string; days: number };
  poll_interval_minutes: number;
  series: DayPoint[];
  summary: {
    polls: number;
    operational_polls: number;
    degraded_polls: number;
    down_polls: number;
    unknown_polls: number;
    uptime_pct: number | null;
    downtime_minutes: number;
    hard_down_minutes: number;
    days_with_data: number;
  };
}

interface SeriesErr {
  ok: false;
  error: string;
  message?: string;
}

interface Props {
  slug: string;
  initialData: SeriesOk | SeriesErr | null;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function uptimeColor(pct: number | null): string {
  if (pct === null) return '#404040'; // neutral gray for no-data
  if (pct >= 99.9) return '#10b981'; // emerald-500
  if (pct >= 99) return '#84cc16'; // lime-500
  if (pct >= 95) return '#f59e0b'; // amber-500
  if (pct >= 90) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function formatDateLabel(iso: string): string {
  // 2026-05-04 -> May 4
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function UptimeChart({ slug, initialData }: Props) {
  const [data, setData] = useState<SeriesOk | SeriesErr | null>(initialData);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        setRefreshing(true);
        const res = await fetch(`/api/uptime/series?provider=${encodeURIComponent(slug)}&days=7`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const fresh = (await res.json()) as SeriesOk | SeriesErr;
        if (!cancelled) setData(fresh);
      } catch {
        // Keep last-known-good state.
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [slug]);

  if (!data) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center text-text-secondary">
        Uptime data temporarily unavailable. Please refresh in a moment.
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Uptime data is accumulating
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {data.message ||
            'No counter samples captured for this provider in the requested window. Counter capture started 2026-05-05; check back in a few hours.'}
        </p>
      </div>
    );
  }

  const { series, summary, range, poll_interval_minutes } = data;

  // Chart geometry
  const barWidth = 48;
  const barGap = 8;
  const chartH = 160;
  const chartPaddingTop = 12;
  const chartPaddingBottom = 36; // room for date labels
  const totalChartHeight = chartH + chartPaddingTop + chartPaddingBottom;
  const totalChartWidth = series.length * (barWidth + barGap) + barGap;

  // y axis: 90% to 100% scale to make differences in high-uptime range visible.
  // Anything below 90% gets bottomed out at the bottom edge but still shows the value.
  const yMin = 90;
  const yMax = 100;
  const heightFor = (pct: number | null) => {
    if (pct === null) return 0;
    const clamped = Math.max(yMin, Math.min(yMax, pct));
    return ((clamped - yMin) / (yMax - yMin)) * chartH;
  };

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1">
            7-day uptime
          </div>
          <div
            className="font-mono text-2xl font-bold"
            style={{ color: uptimeColor(summary.uptime_pct) }}
          >
            {summary.uptime_pct === null ? '—' : `${summary.uptime_pct.toFixed(2)}%`}
          </div>
          <div className="text-xs text-text-muted mt-1 inline-flex items-center gap-1.5">
            {refreshing && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{poll_interval_minutes}-min polls</span>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1">
            Total polls
          </div>
          <div className="font-mono text-2xl font-bold text-text-primary">
            {summary.polls.toLocaleString('en-US')}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {summary.days_with_data} day{summary.days_with_data === 1 ? '' : 's'} with data
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1">
            Downtime
          </div>
          <div className="font-mono text-2xl font-bold text-text-primary">
            {formatDuration(summary.downtime_minutes)}
          </div>
          <div className="text-xs text-text-muted mt-1">degraded + down</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1">
            Hard down
          </div>
          <div className="font-mono text-2xl font-bold text-text-primary">
            {formatDuration(summary.hard_down_minutes)}
          </div>
          <div className="text-xs text-text-muted mt-1">down only</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-bg-secondary border border-border rounded-xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Daily uptime</h2>
          <span className="text-xs text-text-muted font-mono">
            {range.from} to {range.to}
          </span>
        </div>
        <svg
          width={totalChartWidth}
          height={totalChartHeight}
          role="img"
          aria-label="Daily uptime chart"
          style={{ minWidth: totalChartWidth }}
        >
          {/* Y-axis reference lines */}
          {[100, 99, 95, 90].map((y) => {
            const yPos = chartPaddingTop + chartH - heightFor(y);
            return (
              <g key={y}>
                <line
                  x1={0}
                  x2={totalChartWidth}
                  y1={yPos}
                  y2={yPos}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.4}
                />
                <text
                  x={4}
                  y={yPos - 2}
                  fontSize={10}
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {y}%
                </text>
              </g>
            );
          })}
          {/* Bars */}
          {series.map((d, i) => {
            const x = barGap + i * (barWidth + barGap);
            const h = heightFor(d.uptime_pct);
            const y = chartPaddingTop + chartH - h;
            const color = uptimeColor(d.uptime_pct);
            const noData = d.uptime_pct === null;
            return (
              <g key={d.date}>
                <title>
                  {d.date}:{' '}
                  {noData
                    ? 'No data'
                    : `${d.uptime_pct?.toFixed(2)}% (${d.polls} polls, ${d.operational} operational, ${d.degraded} degraded, ${d.down} down)`}
                </title>
                {noData ? (
                  // Render an outlined placeholder for no-data days
                  <rect
                    x={x}
                    y={chartPaddingTop + chartH - 4}
                    width={barWidth}
                    height={4}
                    fill="var(--border)"
                    opacity={0.6}
                  />
                ) : (
                  <rect x={x} y={y} width={barWidth} height={h} fill={color} rx={2} />
                )}
                <text
                  x={x + barWidth / 2}
                  y={chartPaddingTop + chartH + 16}
                  fontSize={11}
                  fill="var(--text-muted)"
                  textAnchor="middle"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatDateLabel(d.date)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartPaddingTop + chartH + 30}
                  fontSize={10}
                  fill="var(--text-muted)"
                  textAnchor="middle"
                  fontFamily="var(--font-mono, monospace)"
                  opacity={0.7}
                >
                  {noData ? '—' : `${d.uptime_pct?.toFixed(1)}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
