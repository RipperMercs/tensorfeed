// worker/src/ai-crawler-access-feed.test.ts
import { describe, it, expect } from 'vitest';
import { computeStats, detectFlips, oldestCheckedAt } from './ai-crawler-access-feed';
import type { DomainRecord } from './ai-crawler-access-feed';

function rec(over: Partial<DomainRecord>): DomainRecord {
  return {
    domain: 'a.com', sector: 'saas', checkedAt: '2026-06-02T00:00:00Z',
    robotsStatus: 200, bots: { GPTBot: 'allowed', ClaudeBot: 'blocked' },
    hasLlmsTxt: false, hasAiTxt: false, llmsTxtBytes: null, ...over,
  };
}

describe('computeStats', () => {
  it('computes blocked/allowed percentages excluding unknown', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', bots: { GPTBot: 'allowed' } }),
      'b.com': rec({ domain: 'b.com', bots: { GPTBot: 'blocked' } }),
      'c.com': rec({ domain: 'c.com', bots: { GPTBot: 'unknown' } }),
    };
    const s = computeStats(byDomain, 14);
    expect(s.domainsWithData).toBe(3);
    // GPTBot known verdicts: 1 allowed, 1 blocked, unknown excluded => 50%
    expect(s.botBlockedPct.GPTBot).toBe(50);
    expect(s.botAllowedPct.GPTBot).toBe(50);
  });
  it('computes llms.txt adoption and per-sector rollup', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', sector: 'saas', hasLlmsTxt: true }),
      'b.com': rec({ domain: 'b.com', sector: 'saas', hasLlmsTxt: false }),
    };
    const s = computeStats(byDomain, 14);
    expect(s.llmsTxtAdoptionPct).toBe(50);
    expect(s.bySector.saas).toEqual({ domains: 2, llmsTxt: 1 });
  });
});

describe('detectFlips', () => {
  it('returns empty when no prior record', () => {
    expect(detectFlips(undefined, rec({}), '2026-06-02T00:00:00Z')).toEqual([]);
  });
  it('records a bot verdict change', () => {
    const prev = rec({ bots: { ClaudeBot: 'blocked' } });
    const next = rec({ bots: { ClaudeBot: 'allowed' } });
    const flips = detectFlips(prev, next, '2026-06-02T01:00:00Z');
    expect(flips).toContainEqual({ domain: 'a.com', field: 'ClaudeBot', from: 'blocked', to: 'allowed', at: '2026-06-02T01:00:00Z' });
  });
  it('records llms.txt appearing', () => {
    const flips = detectFlips(rec({ hasLlmsTxt: false }), rec({ hasLlmsTxt: true }), '2026-06-02T01:00:00Z');
    expect(flips).toContainEqual({ domain: 'a.com', field: 'llms.txt', from: 'absent', to: 'present', at: '2026-06-02T01:00:00Z' });
  });
});

describe('oldestCheckedAt', () => {
  it('returns the minimum ISO timestamp', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', checkedAt: '2026-06-02T05:00:00Z' }),
      'b.com': rec({ domain: 'b.com', checkedAt: '2026-05-30T05:00:00Z' }),
    };
    expect(oldestCheckedAt(byDomain)).toBe('2026-05-30T05:00:00Z');
  });
});
