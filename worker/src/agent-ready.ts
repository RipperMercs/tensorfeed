// worker/src/agent-ready.ts
// Derived agent-readiness views over the crawler-access snapshot. Pure: no KV/R2.
import type { DomainRecord, Snapshot, BotVerdict } from './ai-crawler-access-feed';

const ATTR = 'TensorFeed Agent-Ready Web Map. Derived from the daily crawler-access crawl of curated domains. Scores agent readiness from public surfaces (x402, agent.json, openapi, llms.txt, robots policy, ai.txt). We report stated, published surfaces, not enforcement.';

export const CORE_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

export function aiCrawlable(bots: Record<string, BotVerdict>): boolean {
  return CORE_BOTS.some((b) => bots[b] === 'allowed' || bots[b] === 'partial');
}

export interface Readiness {
  score: number;
  tier: 'closed' | 'emerging' | 'ready' | 'advanced';
  surfaces: { x402: boolean; agentJson: boolean; openapi: boolean; llmsTxt: boolean; crawlable: boolean; aiTxt: boolean };
}

export function computeReadiness(record: DomainRecord): Readiness {
  const surfaces = {
    x402: !!record.agent?.hasX402,
    agentJson: !!record.agent?.hasAgentJson,
    openapi: !!record.agent?.hasOpenapi,
    llmsTxt: record.hasLlmsTxt,
    crawlable: aiCrawlable(record.bots),
    aiTxt: record.hasAiTxt,
  };
  let score = 0;
  if (surfaces.x402) score += 25;
  if (surfaces.agentJson) score += 20;
  if (surfaces.openapi) score += 20;
  if (surfaces.llmsTxt) score += 15;
  if (surfaces.crawlable) score += 15;
  if (surfaces.aiTxt) score += 5;
  const tier = score <= 20 ? 'closed' : score <= 50 ? 'emerging' : score <= 80 ? 'ready' : 'advanced';
  return { score, tier, surfaces };
}

function profiledRecords(snapshot: Snapshot): DomainRecord[] {
  return Object.values(snapshot.byDomain).filter((r) => r.agent !== undefined);
}

export interface AgentReadySummary {
  ok: true; captured_at: string | null; domains_tracked: number; profiled: number;
  adoption_pct: { x402: number; agentJson: number; openapi: number; llmsTxt: number; crawlable: number; aiTxt: number };
  tier_distribution: Record<string, number>;
  by_sector: Record<string, { profiled: number; ready_or_better: number }>;
  leaderboard: Array<{ domain: string; sector: string; score: number; tier: string }>;
  source_attribution: string;
}

export function buildAgentReadySummary(snapshot: Snapshot | null, domainsTracked: number): AgentReadySummary {
  const empty = { x402: 0, agentJson: 0, openapi: 0, llmsTxt: 0, crawlable: 0, aiTxt: 0 };
  if (!snapshot) {
    return { ok: true, captured_at: null, domains_tracked: domainsTracked, profiled: 0, adoption_pct: empty, tier_distribution: {}, by_sector: {}, leaderboard: [], source_attribution: ATTR };
  }
  const records = profiledRecords(snapshot);
  const n = records.length;
  const pct = (count: number) => (n ? Math.round((count / n) * 100) : 0);
  const counts = { ...empty };
  const tierDist: Record<string, number> = {};
  const bySector: Record<string, { profiled: number; ready_or_better: number }> = {};
  const scored = records.map((r) => ({ r, rd: computeReadiness(r) }));
  for (const { r, rd } of scored) {
    if (rd.surfaces.x402) counts.x402++;
    if (rd.surfaces.agentJson) counts.agentJson++;
    if (rd.surfaces.openapi) counts.openapi++;
    if (rd.surfaces.llmsTxt) counts.llmsTxt++;
    if (rd.surfaces.crawlable) counts.crawlable++;
    if (rd.surfaces.aiTxt) counts.aiTxt++;
    tierDist[rd.tier] = (tierDist[rd.tier] ?? 0) + 1;
    const s = (bySector[r.sector] ??= { profiled: 0, ready_or_better: 0 });
    s.profiled++;
    if (rd.tier === 'ready' || rd.tier === 'advanced') s.ready_or_better++;
  }
  const leaderboard = scored
    .slice()
    .sort((a, b) => b.rd.score - a.rd.score || a.r.domain.localeCompare(b.r.domain))
    .slice(0, 25)
    .map(({ r, rd }) => ({ domain: r.domain, sector: r.sector, score: rd.score, tier: rd.tier }));
  return {
    ok: true, captured_at: snapshot.dataCapturedAt, domains_tracked: domainsTracked, profiled: n,
    adoption_pct: { x402: pct(counts.x402), agentJson: pct(counts.agentJson), openapi: pct(counts.openapi), llmsTxt: pct(counts.llmsTxt), crawlable: pct(counts.crawlable), aiTxt: pct(counts.aiTxt) },
    tier_distribution: tierDist, by_sector: bySector, leaderboard, source_attribution: ATTR,
  };
}

export interface AgentReadySiteResponse {
  ok: true; domain: string; found: boolean; captured_at: string | null;
  readiness: Readiness | null; record: DomainRecord | null; source_attribution: string;
}

export function buildAgentReadySite(snapshot: Snapshot | null, domain: string): AgentReadySiteResponse {
  const record = snapshot?.byDomain[domain.toLowerCase()] ?? null;
  return {
    ok: true, domain: domain.toLowerCase(), found: !!record, captured_at: record?.checkedAt ?? null,
    readiness: record ? computeReadiness(record) : null, record, source_attribution: ATTR,
  };
}

export interface AgentReadyFull {
  ok: true; captured_at: string | null;
  domains: Array<{ domain: string; sector: string; readiness: Readiness }>;
  source_attribution: string;
}

export function buildAgentReadyFull(snapshot: Snapshot | null): AgentReadyFull {
  if (!snapshot) return { ok: true, captured_at: null, domains: [], source_attribution: ATTR };
  const domains = profiledRecords(snapshot).map((r) => ({ domain: r.domain, sector: r.sector, readiness: computeReadiness(r) }));
  return { ok: true, captured_at: snapshot.dataCapturedAt, domains, source_attribution: ATTR };
}

export const AGENT_READY_ATTR = ATTR;
