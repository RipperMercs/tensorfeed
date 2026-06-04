'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Landmark, ExternalLink } from 'lucide-react';

interface Opp {
  notice_id: string;
  title: string;
  solicitation_number: string;
  agency: string;
  agency_path: string;
  notice_type: string;
  posted_date: string;
  response_deadline: string | null;
  naics_code: string;
  set_aside: string;
  active: boolean;
  ui_link: string;
  matched_keyword: string;
}

interface OppAgency {
  agency: string;
  open_count: number;
}

interface OppSetAside {
  set_aside: string;
  count: number;
}

interface OpportunitiesResponse {
  ok: boolean;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  keywords: string[];
  total_open: number;
  unique_agencies: number;
  by_agency: OppAgency[];
  by_set_aside: OppSetAside[];
  closing_soon: Opp[];
  recent: Opp[];
  note?: string;
}

interface Award {
  award_id: string;
  recipient: string;
  amount: number;
  agency: string;
  agency_slug: string;
  description: string;
  award_type: string;
  internal_id: string;
  date: string;
}

interface AwardAgency {
  agency: string;
  agency_slug: string;
  usd: number;
  award_count: number;
}

interface AwardVendor {
  recipient: string;
  usd: number;
  award_count: number;
  emerging: boolean;
}

interface ContractsResponse {
  ok: boolean;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  keywords: string[];
  total_usd: number;
  total_awards: number;
  unique_recipients: number;
  unique_agencies: number;
  by_agency: AwardAgency[];
  by_vendor: AwardVendor[];
  recent: Award[];
  note?: string;
}

function formatUsd(n: number): string {
  if (!n || n <= 0) return '$0';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProcurementView() {
  const [opps, setOpps] = useState<OpportunitiesResponse | null>(null);
  const [contracts, setContracts] = useState<ContractsResponse | null>(null);
  const [oppsError, setOppsError] = useState<string | null>(null);
  const [contractsError, setContractsError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/procurement/ai-opportunities')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: OpportunitiesResponse) => setOpps(j))
      .catch(e => setOppsError(e instanceof Error ? e.message : 'Failed to load'));

    fetch('https://tensorfeed.ai/api/procurement/ai-contracts')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: ContractsResponse) => setContracts(j))
      .catch(e => setContractsError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Landmark className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Federal AI Contracts and Opportunities</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          The federal government&apos;s AI demand signal, in structured form. Two feeds, sourced from SAM.gov and USAspending.gov (public domain): open AI solicitations agencies are actively soliciting now, and recent AI contract awards already obligated. By agency, by vendor, by set-aside.
        </p>
      </div>

      {/* OPPORTUNITIES SECTION */}
      <section aria-labelledby="opportunities-heading" className="mb-12">
        <h2 id="opportunities-heading" className="text-2xl font-bold text-text-primary mb-4">Open opportunities</h2>

        {oppsError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error loading opportunities: {oppsError}</div>
        )}

        {!opps && !oppsError && (
          <div className="text-text-muted text-sm">Loading open solicitations...</div>
        )}

        {opps && opps.total_open === 0 && (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-secondary">
            No open AI solicitations captured yet. The daily cron populates this feed from SAM.gov; check back soon.
          </div>
        )}

        {opps && opps.total_open > 0 && (
          <>
            <p className="text-text-secondary mb-6">
              <span className="font-mono font-semibold text-text-primary">{opps.total_open.toLocaleString()}</span> open AI {opps.total_open === 1 ? 'solicitation' : 'solicitations'} across <span className="font-mono font-semibold text-text-primary">{opps.unique_agencies.toLocaleString()}</span> {opps.unique_agencies === 1 ? 'agency' : 'agencies'}.
            </p>

            {opps.closing_soon.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Closing soon</h3>
                <div className="space-y-3">
                  {opps.closing_soon.map(o => {
                    const deadline = formatDeadline(o.response_deadline);
                    return (
                      <div key={o.notice_id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                          <a href={o.ui_link} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1 min-w-0">
                            <span className="truncate">{o.title}</span> <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                          </a>
                          {deadline && <span className="text-xs font-mono text-amber-400 shrink-0">{deadline}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
                          <span>{o.agency}</span>
                          {o.set_aside && (
                            <span className="inline-block px-1.5 py-0.5 rounded-full border border-border bg-bg-tertiary text-text-secondary font-medium">{o.set_aside}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              {opps.by_agency.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Top agencies by open count</h3>
                  <div className="space-y-1.5">
                    {opps.by_agency.slice(0, 8).map(a => (
                      <div key={a.agency} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-text-secondary truncate">{a.agency}</span>
                        <span className="font-mono text-text-primary shrink-0">{a.open_count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opps.by_set_aside.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">By set-aside</h3>
                  <div className="flex flex-wrap gap-2">
                    {opps.by_set_aside.map(s => (
                      <span key={s.set_aside} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-bg-secondary text-xs">
                        <span className="text-text-secondary">{s.set_aside || 'Unspecified'}</span>
                        <span className="font-mono text-text-primary">{s.count.toLocaleString()}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* AWARDS SECTION */}
      <section aria-labelledby="awards-heading" className="mb-10">
        <h2 id="awards-heading" className="text-2xl font-bold text-text-primary mb-4">Recent awards</h2>

        {contractsError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error loading awards: {contractsError}</div>
        )}

        {!contracts && !contractsError && (
          <div className="text-text-muted text-sm">Loading contract awards...</div>
        )}

        {contracts && contracts.total_awards === 0 && (
          <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-secondary">
            No awards captured yet. The daily cron populates this feed from USAspending.gov; check back soon.
          </div>
        )}

        {contracts && contracts.total_awards > 0 && (
          <>
            <p className="text-text-secondary mb-6">
              <span className="font-mono font-semibold text-text-primary">{contracts.total_awards.toLocaleString()}</span> AI {contracts.total_awards === 1 ? 'award' : 'awards'} totaling <span className="font-mono font-semibold text-text-primary">{formatUsd(contracts.total_usd)}</span> over the last {contracts.window_days} days, across <span className="font-mono font-semibold text-text-primary">{contracts.unique_agencies.toLocaleString()}</span> {contracts.unique_agencies === 1 ? 'agency' : 'agencies'} and <span className="font-mono font-semibold text-text-primary">{contracts.unique_recipients.toLocaleString()}</span> {contracts.unique_recipients === 1 ? 'vendor' : 'vendors'}.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {contracts.by_agency.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Buying agencies (demand)</h3>
                  <div className="space-y-1.5">
                    {contracts.by_agency.slice(0, 8).map(a => (
                      <div key={a.agency_slug || a.agency} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-text-secondary truncate">{a.agency}</span>
                        <span className="shrink-0 text-right">
                          <span className="font-mono text-text-primary">{formatUsd(a.usd)}</span>
                          <span className="text-text-muted text-xs ml-1.5">({a.award_count.toLocaleString()})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contracts.by_vendor.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Top vendors</h3>
                  <div className="space-y-1.5">
                    {contracts.by_vendor.slice(0, 8).map(v => (
                      <div key={v.recipient} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-text-secondary truncate inline-flex items-center gap-1.5">
                          {v.recipient}
                          {v.emerging && <span className="inline-block px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium uppercase tracking-wide">emerging</span>}
                        </span>
                        <span className="font-mono text-text-primary shrink-0">{formatUsd(v.usd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {contracts.recent.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Latest awards</h3>
                <div className="space-y-3">
                  {contracts.recent.slice(0, 20).map(a => {
                    const when = formatDate(a.date);
                    return (
                      <div key={a.award_id || a.internal_id} className="bg-bg-secondary border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                          <span className="font-semibold text-text-primary min-w-0 truncate">{a.recipient}</span>
                          <span className="font-mono font-bold text-text-primary shrink-0">{formatUsd(a.amount)}</span>
                        </div>
                        <div className="text-xs text-text-muted">
                          {a.agency}{when && <> · {when}</>}
                        </div>
                        {a.description && <p className="text-sm text-text-secondary leading-relaxed mt-1.5 line-clamp-2">{a.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary space-y-2">
        <p>
          For agents: same data at <Link href="/api-reference" className="text-accent-primary hover:underline font-mono">/api/procurement/ai-opportunities</Link> and <span className="text-accent-primary font-mono">/api/procurement/ai-contracts</span>. Free, public domain (US Government work), refreshed daily.
        </p>
        <p>
          Tracking the public-money side by curated AI vendor cohort instead? <Link href="/funding/federal" className="text-accent-primary hover:underline font-medium">Federal AI spending &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
