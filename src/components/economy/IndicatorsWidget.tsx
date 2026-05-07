'use client';

import { useEffect, useState } from 'react';

interface Observation {
  // BLS shape
  year?: number;
  month?: number;
  period_label?: string;
  // FRED shape
  date?: string;
  // shared
  value: number;
}

interface IndicatorEntry {
  series_id: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  source_url: string;
  observations?: Observation[];
  latest: Observation | null;
  prior: Observation | null;
  delta_absolute: number | null;
  delta_pct: number | null;
}

interface IndicatorsResponse {
  ok: true;
  capturedAt: string;
  count: number;
  indicators: IndicatorEntry[];
}

interface Props {
  endpoint: string;
  emptyMessage: string;
  category?: string;
}

function formatValue(v: number, unit: string): string {
  if (unit === '%' || unit === 'percentage points') return `${v.toFixed(2)}%`;
  if (unit === 'USD' || unit === 'USD per barrel') return `$${v.toFixed(2)}`;
  if (unit.includes('billions')) return `$${v.toFixed(1)}B`;
  if (unit.includes('thousands')) return `${(v / 1000).toFixed(1)}M`;
  if (unit === 'hours') return `${v.toFixed(1)}h`;
  if (unit.includes('index')) return v.toFixed(1);
  return v.toLocaleString();
}

function periodLabel(o: Observation): string {
  if (o.period_label) return o.period_label;
  if (o.date) return o.date;
  return '';
}

function deltaTone(delta: number | null, _seriesId: string, isInverse: boolean): 'pos' | 'neg' | 'flat' {
  if (delta === null || delta === 0) return 'flat';
  // Some indicators are "lower is better" (unemployment, mortgage rate)
  // For most we just show direction without judgment; the page is informational.
  // isInverse currently unused but reserved for future per-indicator semantics.
  void isInverse;
  return delta > 0 ? 'pos' : 'neg';
}

export default function IndicatorsWidget({ endpoint, emptyMessage, category }: Props) {
  const [data, setData] = useState<IndicatorsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const url = category ? `${endpoint}?category=${encodeURIComponent(category)}` : endpoint;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as IndicatorsResponse;
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint, category]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 animate-pulse">
            <div className="h-3 bg-bg-tertiary rounded w-1/3 mb-3" />
            <div className="h-6 bg-bg-tertiary rounded w-1/2 mb-2" />
            <div className="h-3 bg-bg-tertiary rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-text-secondary py-4">
        {emptyMessage}
        {error && <span className="block text-text-tertiary mt-1 text-xs">({error})</span>}
      </div>
    );
  }

  if (data.indicators.length === 0) {
    return <div className="text-sm text-text-secondary py-4">{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.indicators.map(ind => {
        const tone = deltaTone(ind.delta_absolute, ind.series_id, false);
        const toneClass =
          tone === 'pos' ? 'text-green-400' : tone === 'neg' ? 'text-red-400' : 'text-text-tertiary';
        const arrow = tone === 'pos' ? '↑' : tone === 'neg' ? '↓' : '·';
        return (
          <a
            key={ind.series_id}
            href={ind.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:border-accent-primary transition-colors block"
          >
            <div className="text-xs font-mono text-text-tertiary uppercase mb-1">{ind.category}</div>
            <div className="font-semibold text-text-primary leading-snug mb-1">{ind.name}</div>
            <div className="text-2xl font-bold text-text-primary mt-2">
              {ind.latest ? formatValue(ind.latest.value, ind.unit) : <span className="text-text-tertiary text-sm">no data</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              {ind.delta_absolute !== null && (
                <span className={`font-mono ${toneClass}`}>
                  {arrow} {ind.delta_absolute > 0 ? '+' : ''}{ind.delta_absolute.toFixed(2)}
                  {ind.delta_pct !== null && ` (${ind.delta_pct > 0 ? '+' : ''}${ind.delta_pct.toFixed(2)}%)`}
                </span>
              )}
              <span className="text-text-tertiary">{ind.latest ? periodLabel(ind.latest) : ''}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
