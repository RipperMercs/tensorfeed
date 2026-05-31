'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, CheckCircle2, Clock, ExternalLink, Moon, ShieldQuestion } from 'lucide-react';

// API response shapes (mirrors worker/src/x402-index verified handler)

type PublisherStatus = 'verified-settling' | 'unverified' | 'unreachable' | 'no-base-payto';
type PublisherActivity = 'active' | 'quiet' | null;

interface Publisher {
  domain: string;
  status: PublisherStatus;
  activity: PublisherActivity;
  settlement_count: number;
  volume_usdc: string;
  first_settled: string | null;
  last_settled: string | null;
  pay_to_wallets: string[];
  manifest_url: string;
  source: 'manifest' | 'manual';
  note: string | null;
  first_seen: string;
}

interface Summary {
  verified: number;
  active: number;
  quiet: number;
  unverified: number;
  unreachable: number;
  no_base_payto: number;
  total: number;
}

interface VerifiedResponse {
  ok: boolean;
  captured_at: string | null;
  summary: Summary;
  publishers: Publisher[];
  attribution: string;
  license: string;
}

const ENDPOINT = 'https://tensorfeed.ai/api/x402-index/verified';

// Helpers

function formatUsdc(raw: string): string {
  const [whole, frac = ''] = raw.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${withCommas}.${frac}` : withCommas;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toUTCString();
}

function ActivityBadge({ activity }: { activity: PublisherActivity }) {
  if (activity === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <Activity className="w-3 h-3" />
        active
      </span>
    );
  }
  if (activity === 'quiet') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-500/10 text-amber-400 border-amber-500/20">
        <Moon className="w-3 h-3" />
        quiet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-500/10 text-slate-400 border-slate-500/20">
      <Clock className="w-3 h-3" />
      pending
    </span>
  );
}

// Skeleton

function DirectorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-20"
          />
        ))}
      </div>
      <div className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-64" />
    </div>
  );
}

// Main component

export default function VerifiedDirectory() {
  const [data, setData] = useState<VerifiedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = () => {
    setError(null);
    fetch(ENDPOINT)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<VerifiedResponse>;
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

  if (loading) return <DirectorySkeleton />;

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted flex flex-wrap items-center gap-3">
        <span>Could not load the verified directory: {error}.</span>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="px-3 py-1 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary text-xs"
          aria-label="Retry loading the verified directory"
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
            /api/x402-index/verified
          </a>
          .
        </span>
      </div>
    );
  }

  if (!data) return null;

  const { summary, publishers, captured_at, attribution } = data;
  const verified = publishers.filter(p => p.status === 'verified-settling');
  const unverified = publishers.filter(p => p.status !== 'verified-settling');

  return (
    <div className="space-y-10">
      {/* Summary strip */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <SummaryCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          label="Verified"
          value={summary.verified}
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4 text-emerald-400 shrink-0" />}
          label="Active"
          value={summary.active}
        />
        <SummaryCard
          icon={<Moon className="w-4 h-4 text-amber-400 shrink-0" />}
          label="Quiet"
          value={summary.quiet}
        />
        <SummaryCard
          icon={<ShieldQuestion className="w-4 h-4 text-text-muted shrink-0" />}
          label="Unverified"
          value={summary.unverified}
        />
        <SummaryCard
          icon={<Clock className="w-4 h-4 text-accent-primary shrink-0" />}
          label="Total tracked"
          value={summary.total}
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

      {/* Verified-settling publishers */}
      <section aria-labelledby="verified-heading">
        <h2 id="verified-heading" className="text-2xl font-semibold text-text-primary mb-2">
          Verified settling on Base
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          These curated x402 publishers have at least one on-chain USDC settlement observed on Base
          mainnet, tied to a wallet declared in their published manifest. Ranked by recent activity,
          then volume.
        </p>

        {verified.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
            No verified settlements observed yet. The index is forward-only and refreshes on a cron;
            check back after the next pass.
          </div>
        ) : (
          <>
            {/* Table on sm and up */}
            <div className="hidden sm:block bg-bg-secondary border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Verified x402 publishers with observed on-chain USDC settlements on Base mainnet
                </caption>
                <thead>
                  <tr className="bg-bg-tertiary text-left text-xs font-mono uppercase tracking-wide text-text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Domain
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Activity
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Settlements
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Volume (USDC)
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Last settled
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verified.map(p => (
                    <tr key={p.domain} className="hover:bg-bg-tertiary/50 transition-colors">
                      <th
                        scope="row"
                        className="px-4 py-3 font-mono text-text-primary font-normal text-left"
                      >
                        <a
                          href={`https://${p.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent-primary hover:underline"
                        >
                          {p.domain}
                          <ExternalLink className="w-3 h-3 text-text-muted" />
                        </a>
                      </th>
                      <td className="px-4 py-3">
                        <ActivityBadge activity={p.activity} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {p.settlement_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {formatUsdc(p.volume_usdc)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-muted text-xs">
                        {p.last_settled ? formatTimestamp(p.last_settled) : 'pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on mobile */}
            <div className="sm:hidden space-y-3">
              {verified.map(p => (
                <article
                  key={p.domain}
                  className="bg-bg-secondary border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <a
                      href={`https://${p.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-text-primary inline-flex items-center gap-1 hover:text-accent-primary hover:underline min-w-0 break-all"
                    >
                      {p.domain}
                      <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                    </a>
                    <ActivityBadge activity={p.activity} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-text-muted">Settlements</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {p.settlement_count.toLocaleString()}
                    </dd>
                    <dt className="text-text-muted">Volume (USDC)</dt>
                    <dd className="font-mono text-text-secondary text-right">
                      {formatUsdc(p.volume_usdc)}
                    </dd>
                    <dt className="text-text-muted">Last settled</dt>
                    <dd className="font-mono text-text-muted text-right">
                      {p.last_settled ? formatTimestamp(p.last_settled) : 'pending'}
                    </dd>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Unverified, softly framed */}
      <section aria-labelledby="unverified-heading">
        <h2 id="unverified-heading" className="text-2xl font-semibold text-text-primary mb-2">
          No settlements observed yet
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          These curated publishers are in the directory but have no on-chain USDC settlement on Base
          mainnet that we can tie to their declared wallet yet. That can mean a brand-new manifest, a
          publisher that settles on another network, a wallet that is not yet observable from our
          index, or simply no paid traffic so far. Absence of an observed settlement is not evidence
          of anything wrong. It only means we have nothing to verify at this time.
        </p>

        {unverified.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
            Every tracked publisher currently has at least one observed settlement.
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-lg divide-y divide-border">
            {unverified.map(p => (
              <div
                key={p.domain}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors"
              >
                <a
                  href={`https://${p.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-text-primary inline-flex items-center gap-1 hover:text-accent-primary hover:underline min-w-0 break-all"
                >
                  {p.domain}
                  <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                </a>
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-500/10 text-slate-400 border-slate-500/20">
                  {p.status}
                </span>
                {p.note ? (
                  <span className="text-xs text-text-muted w-full sm:w-auto">{p.note}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Methodology / caveat */}
      <section
        aria-labelledby="methodology-heading"
        className="bg-bg-secondary border border-border rounded-lg p-5"
      >
        <h2 id="methodology-heading" className="text-lg font-semibold text-text-primary mb-2">
          Methodology and caveats
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">{attribution}</p>
        <p className="text-xs text-text-muted font-mono mt-3">
          Machine-readable feed:{' '}
          <a
            href={ENDPOINT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            /api/x402-index/verified
          </a>
          . License: {data.license}.
        </p>
      </section>

      {/* Cross-link to the settlement index hub */}
      <div className="text-sm text-text-secondary">
        Looking for aggregate volume and the live settlement leaderboard? See the{' '}
        <Link href="/x402" className="text-accent-primary hover:underline">
          x402 settlement index hub
        </Link>
        .
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
  value: number;
}) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-mono uppercase tracking-wide text-text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary font-mono leading-none">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
