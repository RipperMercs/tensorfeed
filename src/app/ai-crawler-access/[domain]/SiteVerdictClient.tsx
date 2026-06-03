'use client';

import { useEffect, useState } from 'react';
import { FileText, ShieldCheck, ShieldX, ShieldAlert, HelpCircle } from 'lucide-react';

// Mirrors the worker SiteResponse envelope from
// worker/src/premium-ai-crawler-access.ts (buildSiteResponse). Keep these in
// lockstep: if the worker record shape changes, this type changes with it.
interface SiteRecord {
  domain: string;
  sector: string;
  checkedAt: string;
  robotsStatus: number | null;
  bots: Record<string, string>;
  hasLlmsTxt: boolean;
  hasAiTxt: boolean;
  llmsTxtBytes: number | null;
}

interface SiteResponse {
  ok: boolean;
  domain: string;
  found: boolean;
  captured_at: string | null;
  record: SiteRecord | null;
}

// Mirrors the worker AgentReadySiteResponse from worker/src/agent-ready.ts
// (buildAgentReadySite). The readiness field is null until the domain has been
// profiled by the enriched crawl.
interface Readiness {
  score: number;
  tier: 'closed' | 'emerging' | 'ready' | 'advanced';
  surfaces: {
    x402: boolean;
    agentJson: boolean;
    openapi: boolean;
    llmsTxt: boolean;
    crawlable: boolean;
    aiTxt: boolean;
  };
}

interface AgentReadySiteResponse {
  ok: boolean;
  domain: string;
  found: boolean;
  captured_at: string | null;
  readiness: Readiness | null;
}

const TIER_META: Record<
  Readiness['tier'],
  { label: string; text: string; ring: string; bg: string }
> = {
  advanced: {
    label: 'Advanced',
    text: 'text-accent-green',
    ring: 'border-accent-green/40',
    bg: 'bg-accent-green/10',
  },
  ready: {
    label: 'Ready',
    text: 'text-emerald-400',
    ring: 'border-emerald-400/40',
    bg: 'bg-emerald-400/10',
  },
  emerging: {
    label: 'Emerging',
    text: 'text-accent-amber',
    ring: 'border-accent-amber/40',
    bg: 'bg-accent-amber/10',
  },
  closed: {
    label: 'Closed',
    text: 'text-text-muted',
    ring: 'border-border',
    bg: 'bg-bg-tertiary',
  },
};

// Ordered surface labels for the one-line summary.
const SURFACE_LABELS: Array<{ key: keyof Readiness['surfaces']; label: string }> = [
  { key: 'x402', label: 'x402' },
  { key: 'agentJson', label: 'agent.json' },
  { key: 'openapi', label: 'openapi' },
  { key: 'llmsTxt', label: 'llms.txt' },
  { key: 'aiTxt', label: 'ai.txt' },
];

function tierMeta(tier: string) {
  return TIER_META[tier as Readiness['tier']] || TIER_META.closed;
}

const SECTOR_LABELS: Record<string, string> = {
  'ai-media': 'AI media',
  'dev-docs': 'Developer docs',
  saas: 'SaaS',
  'ai-company': 'AI company',
  ecommerce: 'E-commerce',
  reference: 'Reference',
  government: 'Government',
  publishing: 'Publishing',
};

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

function timeAgo(iso: string | null): string {
  if (!iso) return 'not checked yet';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'not checked yet';
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function SiteVerdictClient({ domain }: { domain: string }) {
  const [data, setData] = useState<SiteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<AgentReadySiteResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `https://tensorfeed.ai/api/ai-crawler-access/site?domain=${encodeURIComponent(domain)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SiteResponse;
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
    async function loadReadiness() {
      try {
        const res = await fetch(
          `https://tensorfeed.ai/api/agent-ready/site?domain=${encodeURIComponent(domain)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AgentReadySiteResponse;
        if (cancelled) return;
        setReadiness(json);
      } catch {
        // Readiness is a non-blocking enhancement. If it fails to load we just
        // render without the readiness line; the core verdict still shows.
        if (cancelled) return;
        setReadiness(null);
      }
    }
    load();
    loadReadiness();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading && !data) {
    return <SkeletonState />;
  }

  if (error && !data) {
    return (
      <div className="border border-accent-red/30 bg-accent-red/5 rounded-xl p-5 text-sm text-text-secondary">
        Could not reach the live verdict feed ({error}). Pull it directly from{' '}
        <a
          href={`https://tensorfeed.ai/api/ai-crawler-access/site?domain=${encodeURIComponent(domain)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline font-mono"
        >
          /api/ai-crawler-access/site
        </a>
        , or refresh in a moment.
      </div>
    );
  }

  if (data && !data.found) {
    return (
      <div className="border border-bg-tertiary rounded-xl p-5 bg-bg-secondary/50 text-sm text-text-secondary">
        Pending first crawl. This domain is tracked and will appear after the next rolling crawl
        (within 7 days).
      </div>
    );
  }

  const record = data?.record;
  if (!record) {
    return (
      <div className="border border-bg-tertiary rounded-xl p-5 bg-bg-secondary/50 text-sm text-text-secondary">
        Pending first crawl. This domain is tracked and will appear after the next rolling crawl
        (within 7 days).
      </div>
    );
  }

  const botRows = Object.entries(record.bots).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {/* Agent-readiness line (graceful when the domain is not yet profiled) */}
      <ReadinessLine readiness={readiness?.readiness ?? null} />

      {/* Meta strip: sector, robots status, last checked */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-muted">
        <span className="px-2 py-0.5 rounded-md bg-bg-tertiary border border-border text-text-secondary">
          {SECTOR_LABELS[record.sector] || record.sector}
        </span>
        <span className="font-mono">
          robots.txt HTTP {record.robotsStatus === null ? 'unreachable' : record.robotsStatus}
        </span>
        <span className="font-mono">Last checked {timeAgo(record.checkedAt)}</span>
      </div>

      {/* Per-bot verdict table */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {botRows.length === 0 ? (
          <p className="px-4 py-3 text-text-muted text-sm">No per-bot data in this record yet.</p>
        ) : (
          botRows.map(([bot, verdict], idx) => {
            const meta = verdictMeta(verdict);
            const Icon = meta.Icon;
            return (
              <div
                key={bot}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  idx > 0 ? 'border-t border-border' : ''
                }`}
              >
                <span className="text-text-primary font-mono text-sm truncate">{bot}</span>
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${meta.text}`}>
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                  <span
                    className={`w-2 h-2 rounded-full ${meta.dot} flex-shrink-0`}
                    aria-hidden
                  />
                  {meta.label}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* llms.txt / ai.txt presence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PresenceCard
          label="llms.txt"
          present={record.hasLlmsTxt}
          detail={
            record.hasLlmsTxt && record.llmsTxtBytes !== null
              ? `${record.llmsTxtBytes.toLocaleString()} bytes`
              : 'not published'
          }
        />
        <PresenceCard
          label="ai.txt"
          present={record.hasAiTxt}
          detail={record.hasAiTxt ? 'published' : 'not published'}
        />
      </div>
    </div>
  );
}

function ReadinessLine({ readiness }: { readiness: Readiness | null }) {
  if (!readiness) {
    return (
      <div className="border border-border rounded-xl px-4 py-3 bg-bg-secondary/50 text-xs text-text-muted">
        Agent-readiness score pending. This domain has not been profiled by the agent-surface crawl
        yet (it backfills over the next rolling crawl). See the{' '}
        <a href="/agent-ready" className="text-accent-primary hover:underline">
          Agent-Ready Web Map
        </a>{' '}
        for the methodology.
      </div>
    );
  }

  const meta = tierMeta(readiness.tier);
  const present = SURFACE_LABELS.filter(({ key }) => readiness.surfaces[key]).map(
    ({ label }) => label,
  );
  const summary =
    present.length > 0
      ? `Exposes ${present.join(', ')}`
      : 'No published agent surfaces yet';

  return (
    <div
      className={`rounded-xl border ${meta.ring} ${meta.bg} px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2`}
    >
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-2xl font-semibold ${meta.text}`}>{readiness.score}</span>
        <span className="text-xs text-text-muted">/ 100 agent-ready</span>
      </div>
      <span
        className={`px-2 py-0.5 rounded-md border text-xs font-medium ${meta.ring} ${meta.text}`}
      >
        {meta.label}
      </span>
      <span className="text-xs text-text-secondary">{summary}</span>
      <a
        href="/agent-ready"
        className="text-xs text-accent-primary hover:underline ml-auto whitespace-nowrap"
      >
        How this is scored
      </a>
    </div>
  );
}

function PresenceCard({
  label,
  present,
  detail,
}: {
  label: string;
  present: boolean;
  detail: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center gap-3">
      <FileText
        className={`w-5 h-5 flex-shrink-0 ${present ? 'text-accent-green' : 'text-text-muted'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-text-primary font-mono text-sm">{label}</div>
        <div className={`text-xs ${present ? 'text-accent-green' : 'text-text-muted'}`}>
          {present ? 'Present' : 'Absent'} &middot; {detail}
        </div>
      </div>
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading site verdict">
      <div className="flex gap-3">
        <div className="h-6 w-24 bg-bg-tertiary rounded animate-pulse" />
        <div className="h-6 w-32 bg-bg-tertiary rounded animate-pulse" />
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-3 ${
              i > 0 ? 'border-t border-border' : ''
            }`}
          >
            <div className="h-3 w-28 bg-bg-tertiary rounded animate-pulse" />
            <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 bg-bg-secondary border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
