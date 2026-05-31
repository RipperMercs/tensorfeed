'use client';

import { useEffect, useRef, useState } from 'react';
import { Banknote, FileText, Building2, ExternalLink, TrendingUp } from 'lucide-react';

// API response shapes (mirror worker/src/federal-spending-fetcher FedSnapshot).

interface AgencyUsd {
  agency: string;
  agency_slug: string;
  usd: number;
}

interface VendorRollup {
  slug: string;
  name: string;
  category: string;
  total_usd: number;
  award_count: number;
  last_award_date: string | null;
  top_agencies: AgencyUsd[];
}

interface FedAward {
  award_id: string;
  recipient: string;
  amount: number;
  agency: string;
  agency_slug: string;
  award_type: string;
  internal_id: string;
  date: string | null;
}

interface FedSnapshot {
  ok: boolean;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  cohort_size: number;
  total_usd: number;
  total_awards: number;
  vendors: VendorRollup[];
  agencies: AgencyUsd[];
  recent: FedAward[];
}

const ENDPOINT = 'https://tensorfeed.ai/api/funding/federal/summary';
const AWARD_BASE = 'https://www.usaspending.gov/award/';

// Helpers

// Compact USD, e.g. $1.2B, $340.0M, $12.5K, $0. Always one decimal at scale,
// whole dollars below a thousand.
function formatUsdCompact(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${sign}$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sign}$${(v / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(v).toLocaleString()}`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toUTCString();
}

function categoryLabel(category: string): string {
  switch (category) {
    case 'ai-native':
      return 'AI native';
    case 'defense-ai':
      return 'Defense AI';
    case 'frontier-lab':
      return 'Frontier lab';
    case 'silicon':
      return 'Silicon';
    default:
      return category;
  }
}

function categoryClasses(category: string): string {
  switch (category) {
    case 'ai-native':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'defense-ai':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'frontier-lab':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    case 'silicon':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${categoryClasses(
        category,
      )}`}
    >
      {categoryLabel(category)}
    </span>
  );
}

// Vendor share of the cohort total as a 1 dp percent string, e.g. 42.7%.
function sharePct(vendorUsd: number, totalUsd: number): string {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0) return 'n/a';
  return `${(Math.round((vendorUsd / totalUsd) * 1000) / 10).toFixed(1)}%`;
}

// Skeleton

function FederalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-20"
          />
        ))}
      </div>
      <div className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-72" />
      <div className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-48" />
    </div>
  );
}

// Main component

export default function FederalSpending() {
  const [data, setData] = useState<FedSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = () => {
    setError(null);
    fetch(ENDPOINT)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<FedSnapshot>;
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
    // fetchData is stable (no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <FederalSkeleton />;

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted flex flex-wrap items-center gap-3">
        <span>Could not load the federal spending snapshot: {error}.</span>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="px-3 py-1 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary text-xs"
          aria-label="Retry loading the federal spending snapshot"
        >
          Retry
        </button>
        <span className="text-text-muted">
          Or read the machine-readable feed directly at{' '}
          <a
            href={ENDPOINT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline font-mono"
          >
            /api/funding/federal/summary
          </a>
          .
        </span>
      </div>
    );
  }

  if (!data) return null;

  const { vendors, agencies, recent, total_usd, total_awards, cohort_size, captured_at } = data;

  return (
    <div className="space-y-10">
      {/* Summary strip */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <SummaryCard
          icon={<Banknote className="w-4 h-4 text-accent-primary shrink-0" />}
          label="Total obligated"
          value={formatUsdCompact(total_usd)}
        />
        <SummaryCard
          icon={<FileText className="w-4 h-4 text-accent-primary shrink-0" />}
          label="Awards"
          value={total_awards.toLocaleString()}
        />
        <SummaryCard
          icon={<Building2 className="w-4 h-4 text-accent-primary shrink-0" />}
          label="Cohort vendors"
          value={cohort_size.toLocaleString()}
        />
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4 text-accent-primary shrink-0" />}
          label="Top agencies"
          value={agencies.length.toLocaleString()}
        />
      </div>

      {/* Data freshness */}
      <div className="text-xs text-text-muted font-mono">
        Refreshes every 60s in your browser.
        {captured_at ? (
          <> Data captured at {formatTimestamp(captured_at)}.</>
        ) : (
          <> Capture time not yet recorded.</>
        )}
      </div>

      {/* Cohort table */}
      <section aria-labelledby="cohort-heading">
        <h2 id="cohort-heading" className="text-2xl font-semibold text-text-primary mb-2">
          The AI vendor cohort
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          Total federal contract and grant dollars obligated to each cohort vendor over the trailing
          window, with that vendor share of the cohort total, the date of its most recent award, and
          its top awarding agency. Sorted by total dollars, as received from the feed.
        </p>

        {vendors.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
            No cohort awards observed yet. The snapshot refreshes daily on a cron; check back after
            the next pass.
          </div>
        ) : (
          <>
            {/* Table on sm and up */}
            <div className="hidden sm:block bg-bg-secondary border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Federal contract and grant awards to the curated AI vendor cohort, by total dollars
                </caption>
                <thead>
                  <tr className="bg-bg-tertiary text-left text-xs font-mono uppercase tracking-wide text-text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Vendor
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Total obligated
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Share
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Last award
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Top agency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map(v => (
                    <tr key={v.slug} className="hover:bg-bg-tertiary/50 transition-colors">
                      <th
                        scope="row"
                        className="px-4 py-3 font-mono text-text-primary font-normal text-left"
                      >
                        {v.name}
                        <span className="block mt-0.5 text-xs font-normal text-text-muted">
                          {v.award_count.toLocaleString()} awards
                        </span>
                      </th>
                      <td className="px-4 py-3">
                        <CategoryBadge category={v.category} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {formatUsdCompact(v.total_usd)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {sharePct(v.total_usd, total_usd)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {v.last_award_date ?? 'n/a'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {v.top_agencies.length > 0 ? (
                          <>
                            {v.top_agencies[0].agency}
                            <span className="block text-text-muted font-mono">
                              {formatUsdCompact(v.top_agencies[0].usd)}
                            </span>
                          </>
                        ) : (
                          <span className="text-text-muted">none</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on mobile */}
            <div className="sm:hidden space-y-3">
              {vendors.map(v => (
                <article
                  key={v.slug}
                  className="bg-bg-secondary border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-sm text-text-primary min-w-0 break-words">
                      {v.name}
                    </span>
                    <CategoryBadge category={v.category} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-text-muted">Total obligated</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {formatUsdCompact(v.total_usd)}
                    </dd>
                    <dt className="text-text-muted">Awards</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {v.award_count.toLocaleString()}
                    </dd>
                    <dt className="text-text-muted">Share</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {sharePct(v.total_usd, total_usd)}
                    </dd>
                    <dt className="text-text-muted">Last award</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {v.last_award_date ?? 'n/a'}
                    </dd>
                    <dt className="text-text-muted">Top agency</dt>
                    <dd className="text-text-secondary text-right break-words">
                      {v.top_agencies.length > 0 ? (
                        <>
                          {v.top_agencies[0].agency}{' '}
                          <span className="text-text-muted font-mono">
                            ({formatUsdCompact(v.top_agencies[0].usd)})
                          </span>
                        </>
                      ) : (
                        <span className="text-text-muted">none</span>
                      )}
                    </dd>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Cohort-wide top agencies strip */}
      <section aria-labelledby="agencies-heading">
        <h2 id="agencies-heading" className="text-2xl font-semibold text-text-primary mb-2">
          Where the money comes from
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          Cohort-wide top awarding agencies, by total dollars obligated across every vendor.
        </p>

        {agencies.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
            No awarding agencies recorded yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {agencies.map(a => (
              <div
                key={a.agency_slug || a.agency}
                className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-text-primary">{a.agency || 'Unattributed'}</span>
                <span className="ml-2 font-mono text-text-muted">{formatUsdCompact(a.usd)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent awards */}
      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-2xl font-semibold text-text-primary mb-2">
          Recent awards
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          The newest dated awards across the cohort. Each links to its full record on USAspending.gov
          when an award identifier is available.
        </p>

        {recent.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
            No recent awards observed yet.
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-lg divide-y divide-border">
            {recent.map((a, i) => {
              const inner = (
                <>
                  <div className="min-w-0">
                    <span className="text-text-primary break-words">{a.recipient || 'Unnamed recipient'}</span>
                    <span className="block text-xs text-text-muted">
                      {a.agency || 'Unattributed agency'}
                      {a.award_type ? ` (${a.award_type})` : ''}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-text-secondary">{formatUsdCompact(a.amount)}</span>
                    <span className="block text-xs text-text-muted font-mono">
                      {a.date ?? 'undated'}
                    </span>
                  </div>
                </>
              );
              const rowClass =
                'flex items-start justify-between gap-3 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors';
              return a.internal_id ? (
                <a
                  key={a.award_id || a.internal_id || i}
                  href={`${AWARD_BASE}${encodeURIComponent(a.internal_id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${rowClass} hover:text-accent-primary`}
                >
                  {inner}
                  <ExternalLink className="w-3 h-3 text-text-muted shrink-0 mt-1" />
                </a>
              ) : (
                <div key={a.award_id || i} className={rowClass}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* License footnote */}
      <div className="text-xs text-text-muted font-mono">
        Source: {data.source}. License: {data.license}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-mono uppercase tracking-wide text-text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary font-mono leading-none">{value}</div>
    </div>
  );
}
