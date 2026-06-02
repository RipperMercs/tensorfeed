// worker/src/premium-ai-crawler-access.test.ts
import { describe, it, expect } from 'vitest';
import { buildSummaryResponse, buildSiteResponse, buildFullResponse, buildChangesResponse } from './premium-ai-crawler-access';
import type { Snapshot, DomainRecord, FlipLogEntry } from './ai-crawler-access-feed';

function snap(over: Partial<Snapshot> = {}): Snapshot {
  const r: DomainRecord = {
    domain: 'a.com', sector: 'saas', checkedAt: '2026-06-01T00:00:00Z', robotsStatus: 200,
    bots: { GPTBot: 'allowed', ClaudeBot: 'blocked' }, hasLlmsTxt: true, hasAiTxt: false, llmsTxtBytes: 10,
  };
  return {
    dataCapturedAt: '2026-06-01T00:00:00Z', generatedAt: '2026-06-02T00:00:00Z', botCount: 14,
    byDomain: { 'a.com': r },
    stats: { domainsWithData: 1, botBlockedPct: { ClaudeBot: 100 }, botAllowedPct: { GPTBot: 100 }, llmsTxtAdoptionPct: 100, aiTxtAdoptionPct: 0, bySector: { saas: { domains: 1, llmsTxt: 1 } } },
    ...over,
  };
}

describe('buildSummaryResponse', () => {
  it('reports empty state for null snapshot but keeps domains_tracked', () => {
    const r = buildSummaryResponse(null, 300);
    expect(r.snapshot_ready).toBe(false);
    expect(r.domains_tracked).toBe(300);
    expect(r.captured_at).toBeNull();
  });
  it('passes through real captured_at and stats', () => {
    const r = buildSummaryResponse(snap(), 300);
    expect(r.captured_at).toBe('2026-06-01T00:00:00Z');
    expect(r.llms_txt_adoption_pct).toBe(100);
  });
});

describe('buildSiteResponse', () => {
  it('found=false for untracked domain', () => {
    expect(buildSiteResponse(snap(), 'nope.com').found).toBe(false);
  });
  it('found=true with the record for a tracked domain', () => {
    const r = buildSiteResponse(snap(), 'a.com');
    expect(r.found).toBe(true);
    expect(r.record?.bots.ClaudeBot).toBe('blocked');
  });
});

describe('buildFullResponse', () => {
  it('captured_at equals snapshot dataCapturedAt (never wall-clock)', () => {
    const r = buildFullResponse(snap());
    expect(r.captured_at).toBe('2026-06-01T00:00:00Z');
    expect(r.domains).toHaveLength(1);
  });
});

describe('buildChangesResponse', () => {
  const flips: FlipLogEntry[] = [
    { domain: 'a.com', field: 'ClaudeBot', from: 'blocked', to: 'allowed', at: '2026-06-01T12:00:00Z' },
    { domain: 'b.com', field: 'GPTBot', from: 'allowed', to: 'blocked', at: '2026-05-20T12:00:00Z' },
  ];
  it('filters by domain and date window, sets has_data', () => {
    const r = buildChangesResponse(flips, 'a.com', '2026-06-01', '2026-06-02', '2026-06-01T00:00:00Z');
    expect(r.changes).toHaveLength(1);
    expect(r.has_data).toBe(true);
  });
  it('has_data=false when nothing matches', () => {
    const r = buildChangesResponse(flips, 'a.com', '2026-01-01', '2026-01-02', '2026-06-01T00:00:00Z');
    expect(r.has_data).toBe(false);
  });
});
