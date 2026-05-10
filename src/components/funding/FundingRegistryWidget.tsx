'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface FundingEntry {
  id: string;
  from: string;
  to: string;
  amount_usd_max: number;
  amount_usd_disclosed: number | null;
  announced_date: string;
  type: string;
  recipient_silicon_dependency: string;
  commercial_quid_pro_quo: string;
  source_urls: string[];
  notes: string;
}

interface FundingSummary {
  total_commitments: number;
  total_amount_usd_max: number;
  by_silicon_dependency: Record<string, number>;
  by_type: Record<string, number>;
  by_from: Record<string, number>;
}

interface ApiResponse {
  ok: true;
  count: number;
  last_updated: string;
  filters: Record<string, string>;
  summary: FundingSummary;
  commitments: FundingEntry[];
}

const SILICON_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All silicon' },
  { id: 'nvidia', label: 'Nvidia' },
  { id: 'tpu', label: 'TPU (Google)' },
  { id: 'trainium', label: 'Trainium (AWS)' },
  { id: 'mi400', label: 'MI400 (AMD)' },
  { id: 'maia', label: 'Maia (Microsoft)' },
  { id: 'mixed', label: 'Mixed' },
];

const TYPE_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All deal types' },
  { id: 'private-equity', label: 'Private equity' },
  { id: 'public-equity', label: 'Public equity' },
  { id: 'compute-commitment', label: 'Compute commitment' },
  { id: 'capacity-partnership', label: 'Capacity partnership' },
  { id: 'convertible-note', label: 'Convertible note' },
  { id: 'warrant', label: 'Warrant' },
];

function siliconTone(silicon: string): string {
  switch (silicon) {
    case 'nvidia': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'tpu': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'trainium': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'mi400': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'maia': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'mixed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default: return 'bg-bg-tertiary text-text-tertiary border-bg-tertiary';
  }
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(n >= 100_000_000_000 ? 0 : 1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n === 0) return 'undisclosed';
  return `$${n.toLocaleString()}`;
}

function fmtTypeLabel(t: string): string {
  return t.replace(/-/g, ' ');
}

function fmtSiliconLabel(s: string): string {
  if (s === 'tpu') return 'TPU';
  if (s === 'mi400') return 'MI400';
  if (s === 'maia') return 'Maia';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function FundingRegistryWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [silicon, setSilicon] = useState<string>('');
  const [type, setType] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (silicon) params.set('silicon_dependency', silicon);
        if (type) params.set('type', type);
        const url = params.toString()
          ? `/api/funding/portfolio?${params.toString()}`
          : '/api/funding/portfolio';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [silicon, type]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          aria-label="Filter by recipient silicon dependency"
          value={silicon}
          onChange={(e) => setSilicon(e.target.value)}
          className="bg-bg-secondary border border-bg-tertiary rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        >
          {SILICON_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select
          aria-label="Filter by deal type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-bg-secondary border border-bg-tertiary rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
        >
          {TYPE_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {/* Summary card */}
      {data && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Commitments</div>
            <div className="text-2xl font-mono text-text-primary mt-1">{data.summary.total_commitments}</div>
          </div>
          <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Disclosed max</div>
            <div className="text-2xl font-mono text-text-primary mt-1">{fmtUsd(data.summary.total_amount_usd_max)}</div>
          </div>
          <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Top investor</div>
            <div className="text-base font-semibold text-text-primary mt-1 truncate">
              {Object.entries(data.summary.by_from).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'}
            </div>
          </div>
          <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Updated</div>
            <div className="text-base font-mono text-text-primary mt-1">{data.last_updated}</div>
          </div>
        </div>
      )}

      {/* Loading / error */}
      {loading && (
        <div className="text-text-muted text-sm">Loading registry...</div>
      )}
      {error && (
        <div className="text-red-400 text-sm">Error: {error}</div>
      )}

      {/* Commitments table */}
      {data && !loading && (
        <div className="bg-bg-secondary border border-bg-tertiary rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-tertiary">
                <th className="text-left px-3 py-2 text-text-primary font-semibold">From</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">To</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">Amount</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">Type</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">Silicon</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">Announced</th>
                <th className="text-left px-3 py-2 text-text-primary font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-tertiary">
              {data.commitments.map(c => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">{c.from}</td>
                  <td className="px-3 py-2 text-text-primary whitespace-nowrap">{c.to}</td>
                  <td className="px-3 py-2 font-mono text-accent-primary whitespace-nowrap">{fmtUsd(c.amount_usd_max)}</td>
                  <td className="px-3 py-2 text-text-secondary text-xs whitespace-nowrap">{fmtTypeLabel(c.type)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${siliconTone(c.recipient_silicon_dependency)}`}>
                      {fmtSiliconLabel(c.recipient_silicon_dependency)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-muted font-mono text-xs whitespace-nowrap">{c.announced_date}</td>
                  <td className="px-3 py-2">
                    {c.source_urls[0] && (
                      <a
                        href={c.source_urls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-primary hover:underline inline-flex items-center gap-1 text-xs"
                        aria-label={`Source for ${c.id}`}
                      >
                        link
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {data.commitments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-text-muted text-sm">
                    No commitments match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-entry detail (commercial quid pro quo + notes) */}
      {data && !loading && data.commitments.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Detail</h3>
          {data.commitments.map(c => (
            <details key={c.id} className="bg-bg-secondary border border-bg-tertiary rounded-lg p-4 group">
              <summary className="cursor-pointer text-text-primary text-sm font-medium flex items-center gap-2">
                <span className="text-accent-primary font-mono">{fmtUsd(c.amount_usd_max)}</span>
                <span>{c.from} &rarr; {c.to}</span>
                <span className="text-text-muted text-xs ml-auto">{c.announced_date}</span>
              </summary>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <div>
                  <span className="text-text-muted text-xs uppercase tracking-wide">What the investor gets back</span>
                  <p className="mt-1">{c.commercial_quid_pro_quo}</p>
                </div>
                <div>
                  <span className="text-text-muted text-xs uppercase tracking-wide">Editorial note</span>
                  <p className="mt-1">{c.notes}</p>
                </div>
                {c.source_urls.length > 0 && (
                  <div>
                    <span className="text-text-muted text-xs uppercase tracking-wide">Sources</span>
                    <ul className="mt-1 space-y-1">
                      {c.source_urls.map(u => (
                        <li key={u}>
                          <a href={u} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline text-xs inline-flex items-center gap-1 break-all">
                            {u}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
