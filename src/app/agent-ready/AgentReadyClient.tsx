'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gauge, Layers, Trophy, ExternalLink } from 'lucide-react';

// Mirrors the worker AgentReadySummary envelope from
// worker/src/agent-ready.ts. Keep these in lockstep: if the worker shape
// changes, this type and the render below change with it.
interface AgentReadySummary {
  ok: true;
  captured_at: string | null;
  domains_tracked: number;
  profiled: number;
  adoption_pct: {
    x402: number;
    agentJson: number;
    openapi: number;
    llmsTxt: number;
    crawlable: number;
    aiTxt: number;
  };
  tier_distribution: Record<string, number>;
  by_sector: Record<string, { profiled: number; ready_or_better: number }>;
  leaderboard: Array<{ domain: string; sector: string; score: number; tier: string }>;
  source_attribution: string;
}

const SUMMARY_URL = 'https://tensorfeed.ai/api/agent-ready/summary.json';
const POLL_MS = 3_600_000; // hourly: the snapshot only moves once a day

// Surface labels, the weight each adds to the score, and a brand color for the
// adoption bar. Order matches the score weighting, heaviest first. Kept local so
// the bars read cleanly without a metadata round-trip.
const SURFACE_META: { key: keyof AgentReadySummary['adoption_pct']; label: string; weight: number; color: string }[] = [
  { key: 'x402', label: 'x402 manifest', weight: 25, color: '#10a37f' },
  { key: 'agentJson', label: 'agent.json', weight: 20, color: '#d97757' },
  { key: 'openapi', label: 'OpenAPI spec', weight: 20, color: '#4285f4' },
  { key: 'llmsTxt', label: 'llms.txt', weight: 15, color: '#20808d' },
  { key: 'crawlable', label: 'AI-bot-crawlable', weight: 15, color: '#1877f2' },
  { key: 'aiTxt', label: 'ai.txt', weight: 5, color: '#a2aaad' },
];

// Tier order, label, and color. Closed to advanced, lowest to highest.
const TIER_META: { key: string; label: string; bar: string; text: string }[] = [
  { key: 'closed', label: 'Closed', bar: 'bg-text-muted', text: 'text-text-muted' },
  { key: 'emerging', label: 'Emerging', bar: 'bg-accent-amber', text: 'text-accent-amber' },
  { key: 'ready', label: 'Ready', bar: 'bg-accent-primary', text: 'text-accent-primary' },
  { key: 'advanced', label: 'Advanced', bar: 'bg-accent-green', text: 'text-accent-green' },
];

const SECTOR_LABELS: Record<string, string> = {
  'ai-media': 'AI media',
  'dev-docs': 'Developer docs',
  saas: 'SaaS',
  'ai-company': 'AI companies',
  ecommerce: 'E-commerce',
  reference: 'Reference',
  government: 'Government',
  publishing: 'Publishing',
};

function tierMeta(tier: string) {
  return TIER_META.find((t) => t.key === tier) || TIER_META[0];
}

function formatCapturedAt(iso: string | null): string {
  if (!iso) return 'not captured yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'not captured yet';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

export default function AgentReadyClient() {
  const [data, setData] = useState<AgentReadySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(SUMMARY_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AgentReadySummary;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Total profiled domains across all tiers, used to size the tier-distribution
  // strip. Falls back to the reported profiled count so a missing tier bucket
  // never breaks the proportions.
  const tierTotal = useMemo(() => {
    if (!data) return 0;
    const summed = Object.values(data.tier_distribution).reduce((a, b) => a + b, 0);
    return summed || data.profiled;
  }, [data]);

  if (loading && !data) {
    return <SkeletonState />;
  }

  if (error && !data) {
    return (
      <div className="border border-accent-red/30 bg-accent-red/5 rounded-xl p-5 text-sm text-text-secondary">
        Could not reach the live summary feed ({error}). The endpoint is{' '}
        <a
          href={SUMMARY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          /api/agent-ready/summary.json
        </a>
        . Refresh in a moment, or pull it directly.
      </div>
    );
  }

  const seeding = !!data && data.profiled < data.domains_tracked;

  return (
    <div className="space-y-8">
      {/* Live indicator + capture stamp */}
      <div className="flex items-center gap-2 text-text-muted text-xs flex-wrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
        </span>
        <span>
          Live from <code className="font-mono">/api/agent-ready/summary.json</code>, polled hourly.
        </span>
        {data && (
          <span className="font-mono text-text-secondary">
            Data captured: {formatCapturedAt(data.captured_at)}.
          </span>
        )}
        {error && <span className="text-accent-red">(stale: {error})</span>}
      </div>

      {/* Coverage stat cards. profiled vs domains_tracked is the honest
          rolling-fill signal: profiled grows toward domains_tracked over a week. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Domains tracked"
          value={data ? data.domains_tracked.toLocaleString() : '-'}
          hint="curated universe"
        />
        <StatCard
          label="Profiled"
          value={data ? data.profiled.toLocaleString() : '-'}
          hint="scored for agent surfaces"
        />
        <StatCard
          label="x402 adoption"
          value={data ? `${data.adoption_pct.x402}%` : '-'}
          hint="of profiled domains"
        />
        <StatCard
          label="Crawlable"
          value={data ? `${data.adoption_pct.crawlable}%` : '-'}
          hint="core AI bot allowed"
        />
      </div>

      {seeding && (
        <div className="border border-bg-tertiary rounded-xl p-5 bg-bg-secondary/50 text-sm text-text-secondary">
          The map is still seeding. The crawl is rolling, so the full set fills in over about a week.
          Watch as <span className="font-mono text-text-primary">profiled</span> climbs toward{' '}
          <span className="font-mono text-text-primary">domains tracked</span>. Every percentage
          below is computed over profiled domains only, never the full universe.
        </div>
      )}

      {/* Per-surface adoption bars */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-accent-primary" />
          Agent-surface adoption
        </h2>
        <p className="text-text-muted text-xs mb-4">
          Share of profiled domains that publish each surface. The number after each label is the
          points that surface adds to a domain&apos;s 0 to 100 readiness score.
        </p>
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          {SURFACE_META.map((s, idx) => {
            const pct = data ? data.adoption_pct[s.key] : 0;
            return (
              <div key={s.key} className={`px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                      aria-hidden
                    />
                    <span className="text-text-primary font-mono text-sm truncate">{s.label}</span>
                    <span className="text-text-muted text-xs flex-shrink-0">+{s.weight} pts</span>
                  </div>
                  <span className="text-text-muted text-xs font-mono flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: s.color }}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tier distribution strip */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-primary" />
          Readiness tiers
        </h2>
        <p className="text-text-muted text-xs mb-4">
          How profiled domains split across the four tiers. Closed scores 20 or below, emerging 21 to
          50, ready 51 to 80, advanced above 80.
        </p>
        {tierTotal === 0 ? (
          <p className="text-text-muted text-sm">No tier data in the snapshot yet.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-bg-tertiary">
              {TIER_META.map((t) => {
                const count = data?.tier_distribution[t.key] ?? 0;
                const pct = tierTotal ? Math.round((count / tierTotal) * 100) : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={t.key}
                    className={`h-full ${t.bar}`}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {TIER_META.map((t) => {
                const count = data?.tier_distribution[t.key] ?? 0;
                const pct = tierTotal ? Math.round((count / tierTotal) * 100) : 0;
                return (
                  <div key={t.key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.bar}`} aria-hidden />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${t.text}`}>{t.label}</div>
                      <div className="text-text-muted text-xs font-mono">
                        {count} ({pct}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Top-25 leaderboard */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent-primary" />
          Top 25 most agent-ready domains
        </h2>
        <p className="text-text-muted text-xs mb-4">
          Ranked by score, ties broken alphabetically. Each domain links to its crawler-access page
          for the full robots.txt and surface breakdown.
        </p>
        {!data || data.leaderboard.length === 0 ? (
          <p className="text-text-muted text-sm">No leaderboard yet. Check back as the map seeds.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_8rem_4rem_5rem] gap-3 px-4 py-2.5 border-b border-border text-text-muted text-[11px] uppercase tracking-wide">
              <span>#</span>
              <span>Domain</span>
              <span className="hidden sm:block">Sector</span>
              <span className="hidden sm:block text-right">Score</span>
              <span className="text-right sm:text-left">Tier</span>
            </div>
            {data.leaderboard.map((row, idx) => {
              const tm = tierMeta(row.tier);
              return (
                <div
                  key={row.domain}
                  className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_8rem_4rem_5rem] gap-3 px-4 py-3 items-center border-t border-border first:border-t-0"
                >
                  <span className="text-text-muted font-mono text-sm">{idx + 1}</span>
                  <Link
                    href={`/ai-crawler-access/${row.domain}`}
                    className="text-accent-primary hover:underline font-mono text-sm truncate"
                  >
                    {row.domain}
                  </Link>
                  <span className="hidden sm:block text-text-secondary text-xs truncate">
                    {SECTOR_LABELS[row.sector] || row.sector}
                  </span>
                  <span className="hidden sm:block text-text-primary font-mono text-sm text-right">
                    {row.score}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${tm.text} justify-end sm:justify-start`}
                  >
                    <span className={`w-2 h-2 rounded-full ${tm.bar} flex-shrink-0`} aria-hidden />
                    {tm.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pull-it-yourself */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3">Pull this data yourself</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <pre className="text-xs overflow-x-auto"><code className="text-text-primary font-mono">{`# Aggregate summary (free, no auth)
curl -s https://tensorfeed.ai/api/agent-ready/summary.json | jq

# One domain (free, no auth)
curl -s "https://tensorfeed.ai/api/agent-ready/site?domain=example.com" | jq

# Full per-domain dataset is premium (1 credit):
# /api/premium/agent-ready/full`}</code></pre>
          <Link
            href="/developers"
            className="text-accent-primary hover:underline text-sm inline-flex items-center gap-1 mt-3"
          >
            Browse the developer reference <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-text-primary text-2xl sm:text-3xl font-mono font-semibold mb-1">
        {value}
      </div>
      <div className="text-text-muted text-xs">{hint}</div>
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading agent-ready data">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="h-3 w-20 bg-bg-tertiary rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-2 w-24 bg-bg-tertiary rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`px-4 py-4 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div className="h-3 w-32 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-2 w-full bg-bg-tertiary rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
