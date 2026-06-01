'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Cpu } from 'lucide-react';
import { MODEL_DIRECTORY } from '@/lib/model-directory';

interface ModelEntry {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released?: string;
  capabilities?: string[];
  openSource?: boolean;
  license?: string;
  tier?: string;
  intelligence?: { tfii: number; methodology_version: string; as_of: string };
}

interface ProviderEntry {
  id: string;
  name: string;
  models: ModelEntry[];
}

export interface PricingData {
  lastUpdated: string;
  providers: ProviderEntry[];
  pricingNotes: {
    unit: string;
    currency: string;
    openSourceNote: string;
    disclaimer: string;
  };
}

interface Props {
  initialData: PricingData;
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M`;
  return `${(ctx / 1000).toFixed(0)}K`;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Turn a "2026-04" released string into "Apr 2026". */
function formatReleasedMonth(released?: string): string {
  if (!released) return '';
  const [yearStr, monthStr] = released.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month || month < 1 || month > 12) return released;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Numeric sort key from "2026-04" → 202604 */
function releasedSortKey(released?: string): number {
  if (!released) return 0;
  const [yearStr, monthStr] = released.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year) return 0;
  return year * 100 + (month || 0);
}

export default function ModelsDataSection({ initialData }: Props) {
  const [pricingData, setPricingData] = useState<PricingData>(initialData);

  // Client-side refresh from /api/models so the page shows fresh data
  // even if the static build is a few days old. The Worker cron updates
  // the API once per day at 7am UTC. We only swap in the fetched data if
  // its lastUpdated is >= the baked-in version, so a stale Worker KV can
  // never downgrade what we shipped at build time.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/models');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (!data?.ok || !Array.isArray(data.providers) || data.providers.length === 0) return;
        const initialStamp = (initialData.lastUpdated || '').toString();
        const fetchedStamp = (data.lastUpdated || '').toString();
        if (fetchedStamp && fetchedStamp >= initialStamp) {
          setPricingData(data);
        }
      } catch {
        // Stick with the build-time data on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  // Flatten all models with provider info
  const allModels = useMemo(() => {
    return pricingData.providers.flatMap((provider) =>
      provider.models.map((model) => ({
        ...model,
        provider: provider.name,
      }))
    );
  }, [pricingData]);

  // Latest Releases: top 8 models by released date, descending
  const latestReleases = useMemo(() => {
    return [...allModels]
      .filter((m) => m.released)
      .sort((a, b) => releasedSortKey(b.released) - releasedSortKey(a.released))
      .slice(0, 8);
  }, [allModels]);

  const paidModels = allModels.filter((m) => m.inputPrice > 0);
  const cheapestInput = paidModels.length > 0 ? Math.min(...paidModels.map((m) => m.inputPrice)) : 0;
  const cheapestOutput = paidModels.length > 0 ? Math.min(...paidModels.map((m) => m.outputPrice)) : 0;

  return (
    <>
      {/* Latest Releases */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Latest Releases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestReleases.map((model) => {
            const dirEntry = MODEL_DIRECTORY.find((m) => m.pricingId === model.id);
            const content = (
              <>
                <div className="flex items-start gap-3 mb-3">
                  <Cpu className="w-5 h-5 text-accent-cyan mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-text-primary font-semibold leading-tight">{model.name}</h3>
                    <p className="text-text-muted text-sm">
                      {model.provider} &middot; {formatReleasedMonth(model.released)}
                    </p>
                  </div>
                </div>
                {model.capabilities && model.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {model.capabilities.slice(0, 5).map((cap) => (
                      <span
                        key={cap}
                        className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-text-muted">
                  Context: <span className="text-accent-green font-medium">{formatContext(model.contextWindow)}</span>
                </p>
              </>
            );

            if (dirEntry) {
              return (
                <Link
                  key={`${model.provider}-${model.id}`}
                  href={`/models/${dirEntry.slug}`}
                  className="block bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow hover:border-accent-primary transition-all"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={`${model.provider}-${model.id}`}
                className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Pricing Comparison</h2>
        <p className="text-text-muted text-sm mb-2">
          Prices in USD per 1M tokens. Last updated {pricingData.lastUpdated}.
        </p>
        <p className="text-text-muted text-xs mb-6">
          TFII is the TensorFeed Intelligence Index (0 to 100), a composite over public benchmarks. See the{' '}
          <Link href="/intelligence" className="text-accent-primary hover:underline">methodology</Link>.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  TFII
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Input / 1M
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Output / 1M
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Context
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allModels.map((model) => {
                const dirEntry = MODEL_DIRECTORY.find((m) => m.pricingId === model.id);
                return (
                  <tr key={`${model.provider}-${model.id}`} className="bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-secondary">{model.provider}</td>
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">
                      {dirEntry ? (
                        <Link
                          href={`/models/${dirEntry.slug}`}
                          className="hover:text-accent-primary transition-colors"
                        >
                          {model.name}
                        </Link>
                      ) : (
                        model.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {typeof model.intelligence?.tfii === 'number' ? (
                        <span className="text-accent-cyan font-medium font-mono">{model.intelligence.tfii.toFixed(1)}</span>
                      ) : (
                        <span className="text-text-muted">n/a</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {model.inputPrice === 0 ? (
                        <span className="text-accent-green font-medium">Free</span>
                      ) : (
                        <span className={model.inputPrice === cheapestInput ? 'text-accent-green font-medium' : 'text-text-secondary'}>
                          ${model.inputPrice.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {model.outputPrice === 0 ? (
                        <span className="text-accent-green font-medium">Free</span>
                      ) : (
                        <span className={model.outputPrice === cheapestOutput ? 'text-accent-green font-medium' : 'text-text-secondary'}>
                          ${model.outputPrice.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary">
                      {formatContext(model.contextWindow)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-text-muted text-xs mt-3">
          {pricingData.pricingNotes.openSourceNote} {pricingData.pricingNotes.disclaimer}
        </p>
      </section>
    </>
  );
}
