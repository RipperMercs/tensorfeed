'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface CanonicalSummary {
  canonical: string;
  vram_gb: number | null;
  provider_count: number;
  total_offers: number;
  cheapest_on_demand: { provider: string; usd_hr: number; gpu_raw: string } | null;
  cheapest_spot: { provider: string; usd_hr: number; gpu_raw: string } | null;
}

interface GPUOffer {
  provider: string;
  gpu_raw: string;
  gpu_canonical: string;
  vram_gb: number | null;
  on_demand_usd_hr: number | null;
  spot_usd_hr: number | null;
  available_count: number;
  region: string | null;
  source_url: string;
  last_seen: string;
}

interface PricingSnapshot {
  capturedAt: string;
  providers: string[];
  offers: GPUOffer[];
  by_canonical: CanonicalSummary[];
  errors: Array<{ provider: string; error: string }>;
  notes: string[];
}

type SortKey = 'vram_desc' | 'on_demand_asc' | 'spot_asc' | 'offers_desc';

function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return `$${n.toFixed(n < 1 ? 3 : 2)}/hr`;
}

function providerLabel(p: string): string {
  if (p === 'vast') return 'Vast.ai';
  if (p === 'runpod') return 'RunPod';
  if (p === 'lambda') return 'Lambda Labs';
  return p;
}

function providerUrl(p: string): string {
  if (p === 'vast') return 'https://vast.ai';
  if (p === 'runpod') return 'https://runpod.io';
  if (p === 'lambda') return 'https://lambda.ai';
  return '#';
}

export default function GpuPricingTable() {
  const [snapshot, setSnapshot] = useState<PricingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('vram_desc');
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/gpu/pricing');
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (!cancelled) {
            setError(body?.hint || `HTTP ${res.status}`);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSnapshot(data.snapshot);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!snapshot) return [];
    const rows = snapshot.by_canonical
      .filter(s => showOther || s.canonical !== 'OTHER');

    const sorted = [...rows];
    switch (sortKey) {
      case 'on_demand_asc':
        sorted.sort((a, b) => {
          const av = a.cheapest_on_demand?.usd_hr ?? Infinity;
          const bv = b.cheapest_on_demand?.usd_hr ?? Infinity;
          return av - bv;
        });
        break;
      case 'spot_asc':
        sorted.sort((a, b) => {
          const av = a.cheapest_spot?.usd_hr ?? Infinity;
          const bv = b.cheapest_spot?.usd_hr ?? Infinity;
          return av - bv;
        });
        break;
      case 'offers_desc':
        sorted.sort((a, b) => b.total_offers - a.total_offers);
        break;
      case 'vram_desc':
      default:
        sorted.sort((a, b) => (b.vram_gb ?? 0) - (a.vram_gb ?? 0));
        break;
    }
    return sorted;
  }, [snapshot, sortKey, showOther]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading GPU pricing">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-bg-secondary rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-accent-amber/40 bg-accent-amber/5 rounded p-4 text-text-secondary">
        <p className="font-medium text-text-primary mb-1">No pricing data right now</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!snapshot || snapshot.by_canonical.length === 0) {
    return (
      <div className="border border-bg-tertiary bg-bg-secondary rounded p-4 text-text-secondary">
        No GPU offers in the latest snapshot. Refresh runs every 4 hours.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="gpu-sort" className="text-text-secondary">Sort:</label>
        <select
          id="gpu-sort"
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="bg-bg-secondary border border-bg-tertiary rounded px-2 py-1 text-text-primary"
          aria-label="Sort GPU pricing table"
        >
          <option value="vram_desc">VRAM (high to low)</option>
          <option value="on_demand_asc">Cheapest on-demand</option>
          <option value="spot_asc">Cheapest spot</option>
          <option value="offers_desc">Most offers</option>
        </select>
        <label className="flex items-center gap-2 text-text-secondary cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showOther}
            onChange={e => setShowOther(e.target.checked)}
            className="accent-accent-primary"
          />
          Show unmapped GPUs
        </label>
      </div>

      <div className="overflow-x-auto border border-bg-tertiary rounded-lg">
        <table className="w-full text-sm font-mono">
          <thead className="bg-bg-secondary text-text-secondary">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold">GPU</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">VRAM</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">Cheapest on-demand</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">Cheapest spot</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">Providers</th>
              <th scope="col" className="text-right px-3 py-2 font-semibold">Offers</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.canonical} className="border-t border-bg-tertiary hover:bg-bg-secondary/50">
                <td className="px-3 py-2 font-semibold text-text-primary">{row.canonical}</td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {row.vram_gb ? `${row.vram_gb} GB` : '-'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.cheapest_on_demand ? (
                    <span>
                      <span className="text-accent-green font-semibold">{formatPrice(row.cheapest_on_demand.usd_hr)}</span>
                      <span className="text-text-secondary text-xs ml-2">{providerLabel(row.cheapest_on_demand.provider)}</span>
                    </span>
                  ) : (
                    <span className="text-text-secondary">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.cheapest_spot ? (
                    <span>
                      <span className="text-accent-primary font-semibold">{formatPrice(row.cheapest_spot.usd_hr)}</span>
                      <span className="text-text-secondary text-xs ml-2">{providerLabel(row.cheapest_spot.provider)}</span>
                    </span>
                  ) : (
                    <span className="text-text-secondary">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary">{row.provider_count}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{row.total_offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
        <div>
          Snapshot captured {new Date(snapshot.capturedAt).toLocaleString()}. Sources tracked:{' '}
          {snapshot.providers.map((p, i) => (
            <span key={p}>
              {i > 0 && ', '}
              <a
                href={providerUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline inline-flex items-center gap-1"
                aria-label={`${providerLabel(p)} pricing source`}
              >
                {providerLabel(p)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          ))}
          {snapshot.notes.length > 0 && (
            <span className="block mt-1">{snapshot.notes.join(' • ')}</span>
          )}
        </div>
        <a
          href="/api/gpu/pricing"
          className="text-accent-primary hover:underline"
          aria-label="View raw GPU pricing API response"
        >
          /api/gpu/pricing →
        </a>
      </div>
    </div>
  );
}
