import { describe, it, expect } from 'vitest';
import { SEED_PUBLISHERS, MANUAL_PUBLISHERS, curatedDomains } from './x402-index/constants';
import { isValidPublisherDomain } from './x402-index/publisher-registry';
import { summarizeReceipts, classifyPublisher, buildVerifiedDirectory } from './x402-verified';
import type { PublisherRecord } from './x402-index/types';

describe('curated publisher lists are well-formed', () => {
  it('every seed domain is a valid publisher domain', () => {
    for (const d of SEED_PUBLISHERS) expect(isValidPublisherDomain(d)).toBe(true);
  });
  it('every manual domain is valid and every wallet is a lowercase 0x-40-hex', () => {
    for (const m of MANUAL_PUBLISHERS) {
      expect(isValidPublisherDomain(m.domain)).toBe(true);
      expect(m.wallets.length).toBeGreaterThan(0);
      for (const w of m.wallets) expect(/^0x[a-f0-9]{40}$/.test(w)).toBe(true);
      expect(m.note.length).toBeGreaterThan(10);
    }
  });
  it('curatedDomains() dedupes manual domains against seeds', () => {
    const all = curatedDomains();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(SEED_PUBLISHERS.length);
  });
});

const NOW = Date.parse('2026-05-30T00:00:00Z');

function rec(over: Partial<PublisherRecord>): PublisherRecord {
  return {
    domain: 'p.com', manifest_url: 'https://p.com/.well-known/x402.json',
    pay_to_wallets: ['0x' + '1'.repeat(40)], first_seen: '2026-05-01T00:00:00Z',
    last_crawled: '2026-05-30T00:00:00Z', last_crawl_error: null, last_event_at: null,
    source: 'manifest', note: null, ...over,
  };
}

describe('summarizeReceipts', () => {
  it('derives first/last settled from the non-zero daily series', () => {
    const s = summarizeReceipts({
      count: 5, volume_usdc: '0.100000',
      daily_series: [
        { date: '2026-05-20', count: 0 },
        { date: '2026-05-21', count: 2 },
        { date: '2026-05-28', count: 3 },
      ],
    });
    expect(s).toEqual({ count: 5, volume_usdc: '0.100000', first_settled: '2026-05-21', last_settled: '2026-05-28' });
  });
  it('returns null first/last for an all-zero series', () => {
    const s = summarizeReceipts({ count: 0, volume_usdc: '0.000000', daily_series: [{ date: '2026-05-20', count: 0 }] });
    expect(s.first_settled).toBeNull();
    expect(s.last_settled).toBeNull();
  });
});

describe('classifyPublisher', () => {
  const settled = { count: 3, volume_usdc: '0.060000', first_settled: '2026-05-10', last_settled: '2026-05-29' };
  const none = { count: 0, volume_usdc: '0.000000', first_settled: null, last_settled: null };

  it('verified-settling + active when last settled within ACTIVE_DAYS', () => {
    const v = classifyPublisher(rec({}), settled, NOW);
    expect(v.status).toBe('verified-settling');
    expect(v.activity).toBe('active');
    expect(v.settlement_count).toBe(3);
  });
  it('verified-settling + quiet when last settled is old', () => {
    const v = classifyPublisher(rec({}), { ...settled, last_settled: '2026-05-01' }, NOW);
    expect(v.status).toBe('verified-settling');
    expect(v.activity).toBe('quiet');
  });
  it('unverified when reachable with a wallet but no settlements', () => {
    const v = classifyPublisher(rec({}), none, NOW);
    expect(v.status).toBe('unverified');
    expect(v.activity).toBeNull();
  });
  it('unreachable when a crawlable publisher has a crawl error', () => {
    const v = classifyPublisher(rec({ last_crawl_error: 'HTTP 404', source: 'manifest' }), none, NOW);
    expect(v.status).toBe('unreachable');
  });
  it('a MANUAL publisher with a crawl error is NOT unreachable', () => {
    const v = classifyPublisher(rec({ last_crawl_error: 'HTTP 404', source: 'manual', manifest_url: '' }), settled, NOW);
    expect(v.status).toBe('verified-settling');
  });
  it('no-base-payto when reachable but no declared wallet', () => {
    const v = classifyPublisher(rec({ pay_to_wallets: [] }), none, NOW);
    expect(v.status).toBe('no-base-payto');
  });
});

describe('buildVerifiedDirectory', () => {
  it('sorts verified-active before quiet before unverified, and counts the summary', () => {
    const active = classifyPublisher(rec({ domain: 'a.com' }), { count: 9, volume_usdc: '0.900000', first_settled: '2026-05-10', last_settled: '2026-05-29' }, NOW);
    const quiet = classifyPublisher(rec({ domain: 'q.com' }), { count: 2, volume_usdc: '0.040000', first_settled: '2026-05-01', last_settled: '2026-05-02' }, NOW);
    const unver = classifyPublisher(rec({ domain: 'u.com' }), { count: 0, volume_usdc: '0.000000', first_settled: null, last_settled: null }, NOW);
    const dir = buildVerifiedDirectory([unver, quiet, active], '2026-05-30T00:05:00Z');
    expect(dir.publishers.map((p) => p.domain)).toEqual(['a.com', 'q.com', 'u.com']);
    expect(dir.summary).toEqual({ verified: 2, active: 1, quiet: 1, unverified: 1, unreachable: 0, no_base_payto: 0, total: 3 });
    expect(dir.captured_at).toBe('2026-05-30T00:05:00Z');
  });
  it('handles an empty publisher set', () => {
    const dir = buildVerifiedDirectory([], null);
    expect(dir.publishers).toEqual([]);
    expect(dir.summary.total).toBe(0);
  });
});
