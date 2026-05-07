'use client';

import { useEffect, useState } from 'react';

interface PackageEntry {
  name: string;
  category: string;
  description: string;
  homepage: string | null;
  // npm shape
  downloads_last_week?: number;
  // pypi shape
  downloads_last_month?: number;
  rank: number;
  rank_in_category: number;
}

interface ApiResponse {
  ok: true;
  capturedAt: string;
  packages: PackageEntry[];
  total_packages: number;
}

interface Props {
  endpoint: string;
  ecosystem: 'npm' | 'pypi';
  categories: Array<{ id: string; label: string }>;
  emptyMessage: string;
}

function formatDownloads(n: number | undefined): string {
  if (n === undefined || n === 0) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function packageUrl(name: string, ecosystem: 'npm' | 'pypi'): string {
  if (ecosystem === 'npm') return `https://www.npmjs.com/package/${name}`;
  return `https://pypi.org/project/${name}/`;
}

export default function PackageTrendingWidget({ endpoint, ecosystem, categories, emptyMessage }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (categoryFilter) params.set('category', categoryFilter);
        const res = await fetch(`${endpoint}?${params.toString()}`);
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
  }, [endpoint, categoryFilter]);

  const downloadsLabel = ecosystem === 'npm' ? 'Last week' : 'Last month';
  const getDownloads = (p: PackageEntry) =>
    ecosystem === 'npm' ? p.downloads_last_week : p.downloads_last_month;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`text-xs px-3 py-1 rounded font-mono transition-colors ${
              categoryFilter === c.id
                ? 'bg-accent-primary text-bg-primary'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-bg-tertiary rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="text-sm text-text-secondary py-4">
          {emptyMessage} <span className="text-text-tertiary text-xs">({error})</span>
        </div>
      )}

      {data && data.packages.length === 0 && (
        <div className="text-sm text-text-secondary py-4">No packages match the current filter.</div>
      )}

      {data && data.packages.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-tertiary text-xs font-mono uppercase border-b border-bg-tertiary">
                <th className="text-left py-2 pr-4">Rank</th>
                <th className="text-left py-2 pr-4">Package</th>
                <th className="text-left py-2 pr-4">Category</th>
                <th className="text-right py-2 pl-4">{downloadsLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.packages.map(p => (
                <tr key={p.name} className="border-b border-bg-tertiary/50 hover:bg-bg-secondary/30">
                  <td className="py-2 pr-4 text-text-tertiary font-mono">{p.rank}</td>
                  <td className="py-2 pr-4">
                    <a
                      href={packageUrl(p.name, ecosystem)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-primary font-mono hover:text-accent-primary"
                    >
                      {p.name}
                    </a>
                    <div className="text-xs text-text-tertiary line-clamp-1">{p.description}</div>
                  </td>
                  <td className="py-2 pr-4 text-text-secondary text-xs font-mono">{p.category}</td>
                  <td className="py-2 pl-4 text-right text-text-primary font-mono">
                    {formatDownloads(getDownloads(p))}
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
