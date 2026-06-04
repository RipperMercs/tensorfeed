'use client';

import { useEffect, useMemo, useState } from 'react';
import Sparkline, { buildSparkline } from './Sparkline';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  early_warning?: { note: string; detected_at: string | null };
}

type Norm = 'ok' | 'warn' | 'down' | 'unknown';

function normalize(status: string): Norm {
  const s = (status || '').toLowerCase();
  if (s === 'down' || s === 'outage' || s === 'major') return 'down';
  if (s === 'degraded' || s === 'partial' || s === 'warn') return 'warn';
  if (s === 'operational' || s === 'ok') return 'ok';
  return 'unknown';
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

function pseudoLatency(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 80 + (h % 360);
}

function rackId(idx: number): string {
  return `AI-${(idx + 1).toString().padStart(2, '0')}`;
}

interface ProviderTabStripProps {
  services: StatusService[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}

/**
 * Kinetic provider tab strip. 24-ish cells, 6px gap, full perimeter
 * alert breath on degraded/down (shared keyframes from AlertGlow.css).
 * Every ~3.5s a random cell briefly pulses with a cyan inner ring to
 * simulate a fresh probe sweep. Driven by ONE setInterval, not per-cell.
 *
 * Clicking a cell selects it; the parent renders the corresponding
 * RackCard detail panel below the strip. Single source of truth for
 * each provider (no duplicate grid).
 */
export default function ProviderTabStrip({ services, selectedName, onSelect }: ProviderTabStripProps) {
  const [pulseIdx, setPulseIdx] = useState<number | null>(null);

  useEffect(() => {
    if (services.length === 0) return;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * services.length);
      setPulseIdx(idx);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setPulseIdx(null), 1600);
    }, 3500);
    return () => {
      clearInterval(interval);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [services.length]);

  const cells = useMemo(() => {
    return services.map((s, i) => {
      const n = normalize(s.status);
      const id = s.name.toLowerCase().replace(/\s+/g, '-');
      const latency = pseudoLatency(id);
      const spark = buildSparkline(id, n, latency, 30);
      return { service: s, norm: n, id, latency, spark, rack: rackId(i) };
    });
  }, [services]);

  return (
    <section
      aria-label="Provider sweep"
      className="mb-6"
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-muted">
            Provider sweep
          </h2>
          <span className="text-[10px] font-mono text-text-muted">
            Click any tab for detail
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
            Operational
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
            Degraded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
            Down
          </span>
        </div>
      </header>
      <div
        className="rounded-lg border border-border bg-bg-secondary/40 p-1.5"
        role="tablist"
        aria-label="Provider status tabs"
      >
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}
        >
          {cells.map((c, i) => {
            const color = dotColor(c.norm);
            const isSelected = selectedName === c.service.name;
            const cls = `tf-tab ${
              c.norm === 'warn' ? 'tf-tab-warn' : c.norm === 'down' ? 'tf-tab-down' : c.norm === 'unknown' ? 'tf-tab-unknown' : 'tf-tab-ok'
            } ${pulseIdx === i ? 'tf-tab-pulse' : ''} ${isSelected ? 'tf-tab-selected' : ''} text-left w-full cursor-pointer`;
            return (
              <button
                key={c.service.name}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${c.service.name} ${c.norm}, ${c.latency}ms latency. Click for details.`}
                className={cls}
                onClick={() => onSelect(c.service.name)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: color,
                      boxShadow: c.norm === 'ok' ? `0 0 6px ${color}` : undefined,
                    }}
                  />
                  {c.service.early_warning && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: '#f59e0b', boxShadow: '0 0 4px #f59e0b' }}
                      title="early warning"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-[11px] font-semibold text-text-primary truncate">
                    {c.service.name}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-text-muted">
                  <span>{c.rack}</span>
                  <span className="tabular-nums">
                    {c.norm === 'down' ? '-' : `${c.latency}ms`}
                  </span>
                </div>
                <div style={{ height: 14, margin: '4px -1px 0' }}>
                  <Sparkline
                    data={c.spark}
                    color={color}
                    height={14}
                    fill={false}
                    stroke={1}
                    gradientId={`tabspark-${c.id}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
