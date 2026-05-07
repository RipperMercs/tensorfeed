'use client';

import { useEffect, useState } from 'react';

interface Institution {
  rank: number;
  openalex_id: string;
  display_name: string;
  country_code: string | null;
  type: string | null;
  ai_works_last_year: number;
  total_works_count: number | null;
}

interface ApiResponse {
  ok: true;
  count: number;
  capturedAt: string;
  institutions: Institution[];
}

const TYPE_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All' },
  { id: 'education', label: 'Universities' },
  { id: 'company', label: 'Companies' },
  { id: 'government', label: 'Government / Non-profit' },
];

export default function InstitutionsWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (typeFilter) params.set('type', typeFilter);
        const res = await fetch(`/api/research/institutions/ai?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ApiResponse;
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
  }, [typeFilter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`text-xs px-3 py-1 rounded font-mono transition-colors ${
              typeFilter === f.id
                ? 'bg-accent-primary text-bg-primary'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="text-sm text-text-secondary py-4">
          Snapshot unavailable. <span className="text-text-tertiary text-xs">({error})</span>
        </div>
      )}

      {data && data.institutions.length === 0 && (
        <div className="text-sm text-text-secondary py-4">No institutions match the current filter.</div>
      )}

      {data && data.institutions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-tertiary text-xs font-mono uppercase border-b border-bg-tertiary">
                <th className="text-left py-2 pr-4">Rank</th>
                <th className="text-left py-2 pr-4">Institution</th>
                <th className="text-left py-2 pr-4">Country</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 pl-4">AI works (last 12 mo)</th>
              </tr>
            </thead>
            <tbody>
              {data.institutions.map(inst => (
                <tr key={inst.openalex_id} className="border-b border-bg-tertiary/50 hover:bg-bg-secondary/30">
                  <td className="py-2 pr-4 text-text-tertiary font-mono">{inst.rank}</td>
                  <td className="py-2 pr-4 text-text-primary font-medium">
                    <a
                      href={`https://openalex.org/${inst.openalex_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent-primary"
                    >
                      {inst.display_name}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-text-secondary font-mono text-xs">{inst.country_code ?? '-'}</td>
                  <td className="py-2 pr-4 text-text-secondary text-xs">{inst.type ?? '-'}</td>
                  <td className="py-2 pl-4 text-right text-text-primary font-mono">
                    {inst.ai_works_last_year.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
