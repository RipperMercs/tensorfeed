'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Scale, ExternalLink, Landmark, FileText, ArrowRight } from 'lucide-react';

type PolicyStatus = 'active' | 'phased' | 'pending' | 'rescinded' | 'vetoed' | 'proposed';
type Jurisdiction = 'US-Federal' | 'US-State' | 'EU' | 'UK' | 'China' | 'International';

interface PolicyEntry {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  type: string;
  status: PolicyStatus;
  enacted_date: string;
  effective_date: string | null;
  summary: string;
  source_url: string;
  citations: string[];
  scope: string[];
}

interface RegistryResponse {
  ok: boolean;
  count: number;
  last_updated: string;
  policies: PolicyEntry[];
}

// Live federal-activity feed shapes (subset of /api/federal-ai-policy).
interface FederalDoc {
  document_number: string;
  title: string;
  doc_type: string;
  agency: string;
  publication_date: string;
  url: string;
}
interface FederalBill {
  package_id: string;
  title: string;
  bill_number: string;
  origin_chamber: string;
  date_issued: string;
  url: string;
}
interface AgencyCount {
  agency: string;
  count: number;
}
interface FederalFeed {
  ok: boolean;
  captured_at: string | null;
  total_documents: number;
  unique_agencies: number;
  by_agency: AgencyCount[];
  recent_documents: FederalDoc[];
  bills_enabled: boolean;
  total_bills: number;
  recent_bills: FederalBill[];
}

// Editorial analysis of the federal preemption fight, newest first. These are
// the regulation-beat originals the hub frames its live data against.
const POLICY_ANALYSIS: Array<{ slug: string; title: string; date: string }> = [
  {
    slug: 'great-american-ai-act-preemption',
    title: 'Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest.',
    date: 'June 5, 2026',
  },
  {
    slug: 'california-30-ai-bills-crossover-july-sprint',
    title: 'Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.',
    date: 'June 2026',
  },
  {
    slug: 'trump-pulled-federal-ai-review-order',
    title: 'Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.',
    date: 'May 2026',
  },
  {
    slug: 'openai-frontier-governance-framework-compliance-era',
    title: 'OpenAI Mapped Its Safety Stack to the Law. Frontier AI Just Crossed From Voluntary to Mandatory.',
    date: 'May 2026',
  },
];

const STATUS_COLORS: Record<PolicyStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  phased: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  proposed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  vetoed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  rescinded: 'bg-text-muted/10 text-text-muted border-border',
};

const STATUS_FILTERS: Array<'all' | PolicyStatus> = [
  'all', 'active', 'phased', 'pending', 'proposed', 'vetoed', 'rescinded',
];

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'AI Policy Tracker',
  description:
    'US federal AI policy actions (Federal Register rules, notices, presidential documents, and federal bills) plus a curated registry of significant AI regulations across jurisdictions, and TensorFeed editorial analysis of the federal preemption fight.',
  url: 'https://tensorfeed.ai/ai-policy',
  isPartOf: { '@type': 'WebSite', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
};

export default function AIPolicyPage() {
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [activeStatus, setActiveStatus] = useState<'all' | PolicyStatus>('all');
  const [error, setError] = useState<string | null>(null);

  const [feed, setFeed] = useState<FederalFeed | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/policy/ai/registry')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: RegistryResponse) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  // Poll the live federal feed so the static export does not desync. The data
  // refreshes once a day, so a 15-minute poll is plenty to catch a fresh cron.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('https://tensorfeed.ai/api/federal-ai-policy')
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((j: FederalFeed) => { if (alive) { setFeed(j); setFeedError(null); } })
        .catch(e => { if (alive) setFeedError(e instanceof Error ? e.message : 'Failed to load'); });
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeStatus === 'all') return data.policies;
    return data.policies.filter(p => p.status === activeStatus);
  }, [data, activeStatus]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Scale className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Policy Tracker</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          The US federal AI policy beat in one place: live agency and legislative activity from the Federal Register and GovInfo, a curated registry of significant AI regulations across jurisdictions, and our analysis of the preemption fight. Each registry entry carries jurisdiction, type, status, key dates, scope tags, and a link to the canonical government source. {data?.last_updated && `Registry updated ${data.last_updated}.`}
        </p>
      </div>

      {/* Live federal activity (Federal Register + GovInfo) */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-bold text-text-primary">Live Federal Activity</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          AI-related US Federal Register actions (rules, proposed rules, notices, presidential documents) and federal bills, refreshed daily. Filtered to documents whose title or abstract names an AI term.
          {feed?.captured_at && ` Captured ${feed.captured_at.slice(0, 10)}.`}
        </p>

        {feedError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-4">Live feed error: {feedError}</div>
        )}

        {!feed && !feedError && (
          <div className="grid sm:grid-cols-2 gap-3" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-24" />
            ))}
          </div>
        )}

        {feed && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Federal Register documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-text-muted" /> Federal Register
                </h3>
                <span className="text-xs text-text-muted font-mono">{feed.total_documents} tracked / {feed.unique_agencies} agencies</span>
              </div>
              <div className="space-y-2">
                {feed.recent_documents.length === 0 && (
                  <p className="text-sm text-text-muted">No documents captured yet. Check back after the next daily refresh.</p>
                )}
                {feed.recent_documents.slice(0, 8).map(d => (
                  <a
                    key={d.document_number}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-bg-secondary border border-border rounded-lg px-3 py-2 hover:border-accent-primary transition-colors"
                  >
                    <span className="text-sm text-text-primary leading-snug line-clamp-2">{d.title}</span>
                    <span className="block text-xs text-text-muted mt-1 font-mono">
                      {d.doc_type} · {d.agency} · {d.publication_date}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Federal bills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-text-muted" /> Federal Bills
                </h3>
                <span className="text-xs text-text-muted font-mono">
                  {feed.bills_enabled ? `${feed.total_bills} tracked` : 'GovInfo layer pending'}
                </span>
              </div>
              <div className="space-y-2">
                {!feed.bills_enabled && (
                  <p className="text-sm text-text-muted">The legislative layer activates once the GovInfo source key is live.</p>
                )}
                {feed.bills_enabled && feed.recent_bills.length === 0 && (
                  <p className="text-sm text-text-muted">No AI-named bills captured in the current window yet.</p>
                )}
                {feed.recent_bills.slice(0, 8).map(b => (
                  <a
                    key={b.package_id}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-bg-secondary border border-border rounded-lg px-3 py-2 hover:border-accent-primary transition-colors"
                  >
                    <span className="text-sm text-text-primary leading-snug line-clamp-2">{b.title}</span>
                    <span className="block text-xs text-text-muted mt-1 font-mono">
                      {[b.bill_number, b.origin_chamber, b.date_issued].filter(Boolean).join(' · ')}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Curated cross-jurisdiction registry */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-bold text-text-primary">Significant AI Regulations</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          A curated registry of major AI policy actions across jurisdictions: US (federal and state), EU, UK, China, plus international frameworks. Executive orders, statutes, regulations, guidance, and frontier-model safety laws.
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setActiveStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeStatus === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

        {data && (
          <div className="space-y-4">
            {filtered.map(item => (
              <div key={item.id} className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                      {item.title} <ExternalLink className="w-3 h-3 text-text-muted" />
                    </a>
                    <div className="text-xs text-text-muted mt-0.5">
                      {item.jurisdiction} · {item.type} · Enacted {item.enacted_date}
                      {item.effective_date && item.effective_date !== item.enacted_date && ` · Effective ${item.effective_date}`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-3">{item.summary}</p>
                {item.scope.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.scope.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-primary text-text-secondary font-mono">{tag}</span>
                    ))}
                  </div>
                )}
                {item.citations.length > 0 && (
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Citations</div>
                    <ul className="space-y-1">
                      {item.citations.map(c => (
                        <li key={c}>
                          <a href={c} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1 break-all">
                            {hostOf(c)} <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editorial analysis */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-bold text-text-primary">Analysis</h2>
        </div>
        <div className="grid gap-3">
          {POLICY_ANALYSIS.map(a => (
            <Link
              key={a.slug}
              href={`/originals/${a.slug}`}
              className="group flex items-start justify-between gap-3 bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
            >
              <div className="min-w-0">
                <span className="text-sm text-text-primary group-hover:text-accent-primary transition-colors">{a.title}</span>
                <span className="block text-xs text-text-muted mt-0.5">{a.date}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted shrink-0 mt-0.5 group-hover:text-accent-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary space-y-2">
        <p>For agents: the curated registry is at <Link href="/api-reference/ai-policy" className="text-accent-primary hover:underline font-mono">/api/policy/ai/registry</Link>. Filter with <code className="font-mono">?status=active|phased|pending|proposed|vetoed|rescinded</code>, <code className="font-mono">?jurisdiction=US-Federal|US-State|EU|UK|China|International</code>, <code className="font-mono">?type=</code>, or <code className="font-mono">?scope=</code>. Free, no auth.</p>
        <p>The live federal feed is at <span className="text-accent-primary font-mono">/api/federal-ai-policy</span> (free; rollups plus recent previews). The full ranked document and bill lists are the premium read <span className="text-accent-primary font-mono">/api/premium/federal-ai-policy</span>.</p>
      </div>
    </div>
  );
}
