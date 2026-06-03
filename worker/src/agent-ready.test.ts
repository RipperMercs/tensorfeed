// worker/src/agent-ready.test.ts
import { describe, it, expect } from 'vitest';
import { computeReadiness, buildAgentReadySummary, buildAgentReadySite, buildAgentReadyFull } from './agent-ready';
import type { DomainRecord, Snapshot } from './ai-crawler-access-feed';

function rec(over: Partial<DomainRecord>): DomainRecord {
  return {
    domain: 'a.com', sector: 'saas', checkedAt: '2026-06-02T00:00:00Z', robotsStatus: 200,
    bots: { GPTBot: 'allowed' }, hasLlmsTxt: false, hasAiTxt: false, llmsTxtBytes: null, ...over,
  };
}
function snap(records: DomainRecord[]): Snapshot {
  const byDomain: Record<string, DomainRecord> = {};
  for (const r of records) byDomain[r.domain] = r;
  return { dataCapturedAt: '2026-06-01T00:00:00Z', generatedAt: '2026-06-02T00:00:00Z', botCount: 14, byDomain,
    stats: { domainsWithData: records.length, botBlockedPct: {}, botAllowedPct: {}, llmsTxtAdoptionPct: 0, aiTxtAdoptionPct: 0, bySector: {} } };
}

describe('computeReadiness', () => {
  it('a bare site (no agent field, GPTBot allowed) scores only crawlable', () => {
    const r = computeReadiness(rec({}));
    expect(r.score).toBe(15);   // crawlable only
    expect(r.tier).toBe('closed');
    expect(r.surfaces.x402).toBe(false);
  });
  it('a fully-equipped site scores 100 and is advanced', () => {
    const r = computeReadiness(rec({
      bots: { GPTBot: 'allowed' }, hasLlmsTxt: true, hasAiTxt: true,
      agent: { hasX402: true, hasAgentJson: true, hasOpenapi: true },
    }));
    expect(r.score).toBe(100);
    expect(r.tier).toBe('advanced');
  });
  it('x402 + agentJson + openapi without llms/ai but crawlable is 80 (ready)', () => {
    const r = computeReadiness(rec({ bots: { ClaudeBot: 'partial' }, agent: { hasX402: true, hasAgentJson: true, hasOpenapi: true } }));
    expect(r.score).toBe(80);
    expect(r.tier).toBe('ready');
  });
  it('all bots blocked or unknown is not crawlable', () => {
    const r = computeReadiness(rec({ bots: { GPTBot: 'blocked', ClaudeBot: 'unknown' } }));
    expect(r.surfaces.crawlable).toBe(false);
    expect(r.score).toBe(0);
    expect(r.tier).toBe('closed');
  });
});

describe('buildAgentReadySummary', () => {
  it('null snapshot returns empty, keeps domains_tracked', () => {
    const s = buildAgentReadySummary(null, 500);
    expect(s.domains_tracked).toBe(500);
    expect(s.profiled).toBe(0);
    expect(s.captured_at).toBeNull();
  });
  it('counts adoption and tiers over profiled records only', () => {
    const s = buildAgentReadySummary(snap([
      rec({ domain: 'a.com', agent: { hasX402: true, hasAgentJson: false, hasOpenapi: false } }),
      rec({ domain: 'b.com', agent: { hasX402: false, hasAgentJson: false, hasOpenapi: false } }),
      rec({ domain: 'c.com' }), // no agent field => not profiled
    ]), 500);
    expect(s.profiled).toBe(2);                 // a.com, b.com
    expect(s.adoption_pct.x402).toBe(50);       // 1 of 2 profiled
    expect(s.captured_at).toBe('2026-06-01T00:00:00Z');
  });
});

describe('buildAgentReadySite', () => {
  it('found=false for untracked domain', () => {
    expect(buildAgentReadySite(snap([rec({})]), 'nope.com').found).toBe(false);
  });
  it('returns readiness for a tracked domain', () => {
    const r = buildAgentReadySite(snap([rec({ domain: 'a.com', agent: { hasX402: true, hasAgentJson: false, hasOpenapi: false } })]), 'a.com');
    expect(r.found).toBe(true);
    expect(r.readiness?.surfaces.x402).toBe(true);
  });
});

describe('buildAgentReadyFull', () => {
  it('captured_at equals snapshot dataCapturedAt', () => {
    expect(buildAgentReadyFull(snap([rec({})])).captured_at).toBe('2026-06-01T00:00:00Z');
  });
});
