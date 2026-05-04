'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Scale, ExternalLink, AlertTriangle } from 'lucide-react';

interface Lawsuit {
  id: string;
  name: string;
  plaintiff: string;
  defendants: string[];
  jurisdiction: string;
  court: string;
  caseNumber: string | null;
  filed: string;
  status: string;
  stage: string;
  claims: string[];
  summary: string;
  sources: string[];
}

interface ApiResponse {
  ok: boolean;
  disclaimer: string;
  lastUpdated: string;
  count: number;
  lawsuits: Lawsuit[];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  settled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  dismissed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  judgment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  consolidated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  withdrawn: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const CLAIM_LABEL: Record<string, string> = {
  'copyright-infringement': 'Copyright',
  'dmca-violation': 'DMCA',
  'trademark-infringement': 'Trademark',
  'unfair-competition': 'Unfair competition',
  'right-of-publicity': 'Right of publicity',
  'privacy': 'Privacy',
  'breach-of-contract': 'Breach of contract',
  'unjust-enrichment': 'Unjust enrichment',
  'antitrust': 'Antitrust',
  'consumer-protection': 'Consumer protection',
  'tort': 'Tort',
  'regulatory-investigation': 'Regulatory',
};

export default function AILawsuitsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeClaim, setActiveClaim] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/ai-lawsuits')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: ApiResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const statuses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.lawsuits.map(l => l.status)));
  }, [data]);

  const claims = useMemo(() => {
    if (!data) return [];
    const all = new Set<string>();
    for (const l of data.lawsuits) for (const c of l.claims) all.add(c);
    return Array.from(all);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.lawsuits;
    if (activeStatus !== 'all') rows = rows.filter(l => l.status === activeStatus);
    if (activeClaim !== 'all') rows = rows.filter(l => l.claims.includes(activeClaim));
    return rows;
  }, [data, activeStatus, activeClaim]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Scale className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Lawsuits Tracker</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Structured catalog of active and notable AI litigation: training-data copyright cases, voice-cloning, music, code, antitrust, product liability, and regulatory inquiries. Each entry has parties, court, case number, claims, current stage, and primary-source citations. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6 text-sm text-amber-300/90 flex gap-3 items-start">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-amber-200">Editorial disclaimer:</span> Summaries are based on public court filings and reputable news coverage. <span className="text-amber-200">Not legal advice.</span> Statuses change quickly. Verify against the cited sources before acting on any of this.
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Status:</span>
        <button
          onClick={() => setActiveStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeStatus === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {statuses.map(s => (
          <button key={s} onClick={() => setActiveStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeStatus === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Claim:</span>
        <button
          onClick={() => setActiveClaim('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeClaim === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {claims.map(c => (
          <button key={c} onClick={() => setActiveClaim(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeClaim === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{CLAIM_LABEL[c] || c}</button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(l => (
            <article key={l.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-text-primary text-lg">{l.name}</h2>
                  <div className="text-xs text-text-muted mt-0.5">
                    {l.court} {l.caseNumber ? `· ${l.caseNumber}` : ''} · Filed {l.filed}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[l.status] || ''}`}>
                    {l.status}
                  </span>
                  <div className="text-xs text-text-muted mt-1">stage: {l.stage}</div>
                </div>
              </div>
              <div className="text-xs text-text-muted mb-2">
                <span className="text-text-secondary">vs:</span> {l.defendants.join(', ')}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{l.summary}</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {l.claims.map(c => (
                  <span key={c} className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                    {CLAIM_LABEL[c] || c}
                  </span>
                ))}
                {l.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40"
                  >
                    source {i + 1} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}
          <Link href="/api-reference/ai-lawsuits" className="text-accent-primary hover:underline font-mono">/api/ai-lawsuits</Link>. Filter with <code className="font-mono">?status=active|settled|...</code>, <code className="font-mono">?claim=copyright-infringement|...</code>, or <code className="font-mono">?jurisdiction=US|UK|EU</code>. Free, no auth, cached 10 min. Daily snapshot in the{' '}
          <Link href="/datasets" className="text-accent-primary hover:underline">Hugging Face dataset</Link>.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'AI Lawsuits Tracker',
            url: 'https://tensorfeed.ai/ai-lawsuits',
            description:
              'Structured catalog of active AI litigation including training-data copyright cases, voice-cloning, music, code, antitrust, product liability.',
            isPartOf: { '@type': 'WebSite', name: 'TensorFeed', url: 'https://tensorfeed.ai' },
          }),
        }}
      />
    </div>
  );
}
