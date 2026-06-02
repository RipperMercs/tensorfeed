// worker/src/premium-ai-crawler-access.ts
// Pure response builders (free + premium) over the AI Crawler Access Map
// snapshot and flip-log. No KV/R2 here: index.ts loads the data, these
// builders shape it (the "sibling, never fork" pattern).
//
// Every premium builder sets captured_at to the snapshot's real
// dataCapturedAt (the stored data-capture time), never a fresh wall-clock
// value, so the AFTA staleness no-charge works.

import { SEED_DOMAINS } from './ai-crawler-access-seeds';
import type { Snapshot, DomainRecord, SnapshotStats, FlipLogEntry } from './ai-crawler-access-feed';

const ATTR = 'TensorFeed AI Crawler Access Map. Daily rolling crawl of curated domains, parsing public robots.txt, llms.txt, and ai.txt. We report stated policy, not enforcement.';

export interface SummaryResponse {
  ok: true;
  captured_at: string | null;
  domains_tracked: number;     // SEED_DOMAINS.length
  domains_with_data: number;
  bot_blocked_pct: Record<string, number>;
  bot_allowed_pct: Record<string, number>;
  llms_txt_adoption_pct: number;
  ai_txt_adoption_pct: number;
  by_sector: Record<string, { domains: number; llmsTxt: number }>;
  snapshot_ready: boolean;
  source_attribution: string;
}

export interface SiteResponse {
  ok: true;
  domain: string;
  found: boolean;
  captured_at: string | null;
  record: DomainRecord | null;
  source_attribution: string;
}

export interface FullResponse {
  ok: true;
  captured_at: string | null;
  domains: DomainRecord[];
  stats: SnapshotStats;
  source_attribution: string;
}

export interface ChangesResponse {
  ok: true;
  captured_at: string | null;
  domain: string | null;
  from: string;
  to: string;
  changes: FlipLogEntry[];
  has_data: boolean;
  source_attribution: string;
}

export function buildSummaryResponse(snapshot: Snapshot | null, domainsTracked: number): SummaryResponse {
  if (!snapshot) {
    return {
      ok: true, captured_at: null, domains_tracked: domainsTracked, domains_with_data: 0,
      bot_blocked_pct: {}, bot_allowed_pct: {}, llms_txt_adoption_pct: 0, ai_txt_adoption_pct: 0,
      by_sector: {}, snapshot_ready: false, source_attribution: ATTR,
    };
  }
  const s = snapshot.stats;
  return {
    ok: true, captured_at: snapshot.dataCapturedAt, domains_tracked: domainsTracked,
    domains_with_data: s.domainsWithData, bot_blocked_pct: s.botBlockedPct, bot_allowed_pct: s.botAllowedPct,
    llms_txt_adoption_pct: s.llmsTxtAdoptionPct, ai_txt_adoption_pct: s.aiTxtAdoptionPct,
    by_sector: s.bySector, snapshot_ready: true, source_attribution: ATTR,
  };
}

export function buildSiteResponse(snapshot: Snapshot | null, domain: string): SiteResponse {
  const record = snapshot?.byDomain[domain.toLowerCase()] ?? null;
  return {
    ok: true, domain: domain.toLowerCase(), found: !!record,
    captured_at: record?.checkedAt ?? null, record, source_attribution: ATTR,
  };
}

export function buildFullResponse(snapshot: Snapshot | null): FullResponse {
  if (!snapshot) return { ok: true, captured_at: null, domains: [], stats: emptyStats(), source_attribution: ATTR };
  return { ok: true, captured_at: snapshot.dataCapturedAt, domains: Object.values(snapshot.byDomain), stats: snapshot.stats, source_attribution: ATTR };
}

export function buildChangesResponse(
  flips: FlipLogEntry[], domain: string | null, from: string, to: string, capturedAt: string | null,
): ChangesResponse {
  const fromT = Date.parse(from), toT = Date.parse(to);
  const changes = flips.filter((f) => {
    if (domain && f.domain !== domain.toLowerCase()) return false;
    const t = Date.parse(f.at);
    return t >= fromT && t <= toT;
  });
  return { ok: true, captured_at: capturedAt, domain: domain ? domain.toLowerCase() : null, from, to, changes, has_data: changes.length > 0, source_attribution: ATTR };
}

function emptyStats(): SnapshotStats {
  return { domainsWithData: 0, botBlockedPct: {}, botAllowedPct: {}, llmsTxtAdoptionPct: 0, aiTxtAdoptionPct: 0, bySector: {} };
}

export const SEED_COUNT = SEED_DOMAINS.length;
