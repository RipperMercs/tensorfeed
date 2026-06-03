'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { CRAWLER_DOMAIN_SET } from '@/data/ai-crawler-access/domains';

// Mirrors the worker SummaryResponse envelope from
// worker/src/premium-ai-crawler-access.ts. Keep these in lockstep: if the
// worker shape changes, this type and the render below change with it.
interface SummaryResponse {
  ok: true;
  captured_at: string | null;
  domains_tracked: number;
  domains_with_data: number;
  bot_blocked_pct: Record<string, number>;
  bot_allowed_pct: Record<string, number>;
  llms_txt_adoption_pct: number;
  ai_txt_adoption_pct: number;
  by_sector: Record<string, { domains: number; llmsTxt: number }>;
  snapshot_ready: boolean;
  source_attribution: string;
}

const SUMMARY_URL = 'https://tensorfeed.ai/api/ai-crawler-access/summary.json';
const POLL_MS = 3_600_000; // hourly: the snapshot only moves once a day

// Vendor labels and brand colors for the tracked bots. Kept local to the
// client so the bars read cleanly without a network round-trip for metadata.
const BOT_META: Record<string, { color: string; vendor: string }> = {
  GPTBot: { color: '#10a37f', vendor: 'OpenAI' },
  'OAI-SearchBot': { color: '#10a37f', vendor: 'OpenAI' },
  'ChatGPT-User': { color: '#10a37f', vendor: 'OpenAI' },
  ClaudeBot: { color: '#d97757', vendor: 'Anthropic' },
  'Claude-SearchBot': { color: '#d97757', vendor: 'Anthropic' },
  'Claude-User': { color: '#d97757', vendor: 'Anthropic' },
  PerplexityBot: { color: '#20808d', vendor: 'Perplexity' },
  CCBot: { color: '#6b7280', vendor: 'Common Crawl' },
  'Google-Extended': { color: '#4285f4', vendor: 'Google' },
  Bytespider: { color: '#111827', vendor: 'ByteDance' },
  Amazonbot: { color: '#ff9900', vendor: 'Amazon' },
  'Applebot-Extended': { color: '#a2aaad', vendor: 'Apple' },
  'Meta-ExternalAgent': { color: '#1877f2', vendor: 'Meta' },
  'cohere-ai': { color: '#39594d', vendor: 'Cohere' },
};

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

// Verdict styling for the inline live-check result. Mirrors the per-domain
// SiteVerdictClient so a freshly crawled untracked domain reads identically to
// a tracked one.
const VERDICT_META: Record<
  string,
  { label: string; dot: string; text: string; Icon: typeof ShieldCheck }
> = {
  allowed: { label: 'Allowed', dot: 'bg-accent-green', text: 'text-accent-green', Icon: ShieldCheck },
  blocked: { label: 'Blocked', dot: 'bg-accent-red', text: 'text-accent-red', Icon: ShieldX },
  partial: { label: 'Partial', dot: 'bg-accent-amber', text: 'text-accent-amber', Icon: ShieldAlert },
  unknown: { label: 'Unknown', dot: 'bg-text-muted', text: 'text-text-muted', Icon: HelpCircle },
};

function verdictMeta(v: string) {
  return VERDICT_META[v] || VERDICT_META.unknown;
}

// Shape of the /api/ai-crawler-access/check response (untracked domains only).
interface CheckRecord {
  bots: Record<string, string>;
  hasLlmsTxt: boolean;
  hasAiTxt: boolean;
}

interface CheckResponse {
  ok: boolean;
  domain: string;
  found: boolean;
  tracked: boolean;
  record: CheckRecord;
}

function metaFor(bot: string) {
  return BOT_META[bot] || { color: 'var(--accent-primary)', vendor: 'Unknown' };
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

export default function AICrawlerAccessClient() {
  const router = useRouter();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainQuery, setDomainQuery] = useState('');
  const [check, setCheck] = useState<CheckResponse | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(SUMMARY_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SummaryResponse;
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

  // Sort bots by blocked percentage so the most-restricted crawlers surface
  // first. Only render bots that actually appear in the snapshot payload.
  const botRows = useMemo(() => {
    if (!data) return [] as { bot: string; blocked: number; allowed: number }[];
    const names = new Set<string>([
      ...Object.keys(data.bot_blocked_pct),
      ...Object.keys(data.bot_allowed_pct),
    ]);
    return Array.from(names)
      .map((bot) => ({
        bot,
        blocked: data.bot_blocked_pct[bot] ?? 0,
        allowed: data.bot_allowed_pct[bot] ?? 0,
      }))
      .sort((a, b) => b.blocked - a.blocked);
  }, [data]);

  const sectorRows = useMemo(() => {
    if (!data) return [] as { sector: string; domains: number; llmsTxt: number }[];
    return Object.entries(data.by_sector)
      .map(([sector, v]) => ({ sector, domains: v.domains, llmsTxt: v.llmsTxt }))
      .sort((a, b) => b.domains - a.domains);
  }, [data]);

  const cleanDomain = domainQuery
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  // Hybrid lookup. A domain already in the tracked set routes to its static,
  // indexable per-domain page. Anything else is crawled live on demand through
  // the free /check endpoint and rendered inline, labeled as not tracked.
  async function onCheck() {
    const d = cleanDomain;
    if (!d) return;
    if (CRAWLER_DOMAIN_SET.has(d)) {
      router.push(`/ai-crawler-access/${d}`);
      return;
    }
    setCheck(null);
    setCheckErr(null);
    setChecking(true);
    try {
      const res = await fetch(
        `https://tensorfeed.ai/api/ai-crawler-access/check?domain=${encodeURIComponent(d)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        setCheckErr(
          res.status === 400
            ? 'Enter a valid public domain (for example, example.com).'
            : `HTTP ${res.status}`,
        );
        return;
      }
      setCheck((await res.json()) as CheckResponse);
    } catch {
      setCheckErr('Live check failed, try again.');
    } finally {
      setChecking(false);
    }
  }

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
          /api/ai-crawler-access/summary.json
        </a>
        . Refresh in a moment, or pull it directly.
      </div>
    );
  }

  const ready = !!data && data.snapshot_ready;

  return (
    <div className="space-y-8">
      {/* Live indicator + capture stamp */}
      <div className="flex items-center gap-2 text-text-muted text-xs flex-wrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
        </span>
        <span>
          Live from <code className="font-mono">/api/ai-crawler-access/summary.json</code>, polled
          hourly.
        </span>
        {data && (
          <span className="font-mono text-text-secondary">
            Data captured: {formatCapturedAt(data.captured_at)}.
          </span>
        )}
        {error && <span className="text-accent-red">(stale: {error})</span>}
      </div>

      {/* Coverage stat cards. domains_tracked vs domains_with_data is the
          honest rolling-refresh signal: the crawl fills 1/7 per day. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Domains tracked"
          value={data ? data.domains_tracked.toLocaleString() : '-'}
          hint="curated universe"
        />
        <StatCard
          label="With data"
          value={data ? data.domains_with_data.toLocaleString() : '-'}
          hint="crawled at least once"
        />
        <StatCard
          label="llms.txt adoption"
          value={data ? `${data.llms_txt_adoption_pct}%` : '-'}
          hint="of domains with data"
        />
        <StatCard
          label="ai.txt adoption"
          value={data ? `${data.ai_txt_adoption_pct}%` : '-'}
          hint="of domains with data"
        />
      </div>

      {!ready && (
        <div className="border border-bg-tertiary rounded-xl p-5 bg-bg-secondary/50 text-sm text-text-secondary">
          The first snapshot is still seeding. The crawl is rolling, about one seventh of the
          universe per day, so the full set fills in over a week. Check back as{' '}
          <span className="font-mono text-text-primary">domains with data</span> climbs toward{' '}
          <span className="font-mono text-text-primary">domains tracked</span>.
        </div>
      )}

      {/* Per-bot blocked / allowed bars */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent-primary" />
          Per-bot access across tracked domains
        </h2>
        <p className="text-text-muted text-xs mb-4">
          Share of known robots.txt verdicts that block each AI crawler at the site root. Domains
          where robots.txt could not be read are excluded, never counted as allowed.
        </p>
        {botRows.length === 0 ? (
          <p className="text-text-muted text-sm">No per-bot data in the snapshot yet.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            {botRows.map((row, idx) => {
              const meta = metaFor(row.bot);
              return (
                <div
                  key={row.bot}
                  className={`px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: meta.color }}
                        aria-hidden
                      />
                      <span className="text-text-primary font-mono text-sm truncate">{row.bot}</span>
                      <span className="text-text-muted text-xs flex-shrink-0">{meta.vendor}</span>
                    </div>
                    <span className="text-text-muted text-xs font-mono flex-shrink-0">
                      {row.blocked}% blocked
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden flex">
                    <div
                      className="h-full bg-accent-red/70"
                      style={{ width: `${row.blocked}%` }}
                      aria-hidden
                    />
                    <div
                      className="h-full bg-accent-green/60"
                      style={{ width: `${row.allowed}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="mt-1 text-text-muted text-[11px] font-mono">
                    {row.allowed}% allowed
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sector rollup */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent-primary" />
          llms.txt by sector
        </h2>
        <p className="text-text-muted text-xs mb-4">
          How many tracked domains in each sector publish an llms.txt file.
        </p>
        {sectorRows.length === 0 ? (
          <p className="text-text-muted text-sm">No sector data yet.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            {sectorRows.map((row, idx) => {
              const pct = row.domains ? Math.round((row.llmsTxt / row.domains) * 100) : 0;
              return (
                <div
                  key={row.sector}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-text-primary text-sm truncate">
                        {SECTOR_LABELS[row.sector] || row.sector}
                      </span>
                      <span className="text-text-muted text-xs font-mono flex-shrink-0">
                        {row.llmsTxt}/{row.domains} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-primary"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Check your site (hybrid lookup) */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-accent-primary" />
          Check any site
        </h2>
        <p className="text-text-muted text-xs mb-4">
          Type a domain to see which AI bots it allows or blocks in robots.txt, plus llms.txt and
          ai.txt presence. If it is in the tracked set you go straight to its page; if not, we crawl
          it live right here. We report stated policy, not enforcement.
        </p>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void onCheck();
            }}
          >
            <label htmlFor="domain-lookup" className="sr-only">
              Domain to check
            </label>
            <input
              id="domain-lookup"
              type="text"
              inputMode="url"
              placeholder="example.com"
              value={domainQuery}
              onChange={(e) => setDomainQuery(e.target.value)}
              className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            />
            <button
              type="submit"
              disabled={!cleanDomain || checking}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                cleanDomain && !checking
                  ? 'bg-accent-primary text-bg-primary hover:opacity-90'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              }`}
            >
              {checking ? 'Crawling...' : 'Check'}
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {checkErr && (
            <p className="text-accent-red text-xs mt-3" role="alert">
              {checkErr}
            </p>
          )}

          {check && check.record && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-text-primary font-mono text-sm break-all">{check.domain}</span>
                <span className="text-text-muted text-[11px] inline-flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                  </span>
                  Not in the tracked set; crawled live just now.
                </span>
              </div>
              <div className="bg-bg-tertiary/40 border border-border rounded-lg overflow-hidden">
                {Object.entries(check.record.bots)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([bot, verdict], idx) => {
                    const meta = verdictMeta(verdict);
                    const Icon = meta.Icon;
                    return (
                      <div
                        key={bot}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                          idx > 0 ? 'border-t border-border' : ''
                        }`}
                      >
                        <span className="text-text-primary font-mono text-sm truncate">{bot}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${meta.text}`}
                        >
                          <Icon className="w-3.5 h-3.5" aria-hidden />
                          <span
                            className={`w-2 h-2 rounded-full ${meta.dot} flex-shrink-0`}
                            aria-hidden
                          />
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    check.record.hasLlmsTxt ? 'text-accent-green' : 'text-text-muted'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden />
                  llms.txt {check.record.hasLlmsTxt ? 'present' : 'absent'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    check.record.hasAiTxt ? 'text-accent-green' : 'text-text-muted'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden />
                  ai.txt {check.record.hasAiTxt ? 'present' : 'absent'}
                </span>
              </div>
              <p className="text-text-muted text-[11px] mt-3 font-mono break-all">
                GET /api/ai-crawler-access/check?domain={check.domain}
              </p>
            </div>
          )}

          {cleanDomain && !check && !checkErr && (
            <p className="text-text-muted text-xs mt-3 font-mono break-all">
              GET /api/ai-crawler-access/check?domain={cleanDomain}
            </p>
          )}
        </div>
      </section>

      {/* Pull-it-yourself */}
      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3">Pull this data yourself</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <pre className="text-xs overflow-x-auto"><code className="text-text-primary font-mono">{`# Aggregate summary (free, no auth)
curl -s https://tensorfeed.ai/api/ai-crawler-access/summary.json | jq

# One domain (free, no auth)
curl -s "https://tensorfeed.ai/api/ai-crawler-access/site?domain=example.com" | jq

# Full dataset + historical flip log are premium (1 credit each):
# /api/premium/ai-crawler-access/full
# /api/premium/ai-crawler-access/changes?from=YYYY-MM-DD&to=YYYY-MM-DD`}</code></pre>
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
    <div className="space-y-8" aria-busy="true" aria-label="Loading AI crawler access data">
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
          <div
            key={i}
            className={`px-4 py-4 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <div className="h-3 w-32 bg-bg-tertiary rounded animate-pulse mb-2" />
            <div className="h-2 w-full bg-bg-tertiary rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
