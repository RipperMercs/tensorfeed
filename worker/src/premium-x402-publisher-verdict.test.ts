import { describe, it, expect, vi } from 'vitest';
import {
  buildX402PublisherVerdict,
  redactX402PublisherVerdictForPreview,
  computeX402PublisherVerdict,
} from './premium-x402-publisher-verdict';

vi.mock('./x402-index/query', () => ({
  getPublisherReceipts: vi.fn(async () => ({
    publisher: { domain: 'a.com', pay_to_wallets: [], first_seen: '2026-05-29' },
    window: { from: '2026-05-06', to: '2026-06-04', days: 30 },
    rollup: { volume_usdc: '0.000000', count: 0, avg_amount: '0.000000', daily_series: [] },
    captured_at: null,
    has_data: false,
    attribution: 'x',
    license: 'CC BY 4.0',
  })),
}));

const NOW = new Date('2026-06-04T12:00:00Z');

function entry(over: Partial<Record<string, unknown>> = {}) {
  return {
    domain: 'x402.tavily.com',
    status: 'verified-settling',
    activity: 'active',
    settlement_count: 40,
    volume_usdc: '12.500000',
    first_settled: '2026-05-29',
    last_settled: '2026-06-03',
    pay_to_wallets: ['0xc78f83c13ba79be3781e7c5f658d1341729515b0'],
    manifest_url: 'https://x402.tavily.com/.well-known/x402',
    source: 'manual',
    note: null,
    first_seen: '2026-05-29',
    ...over,
  } as never;
}

function receipts(series: Array<{ date: string; volume_usdc: string; count: number }>, over: Partial<Record<string, unknown>> = {}) {
  const count = series.reduce((a, s) => a + s.count, 0);
  return {
    publisher: { domain: 'x402.tavily.com', pay_to_wallets: ['0xc78f'], first_seen: '2026-05-29' },
    window: { from: '2026-05-05', to: '2026-06-04', days: 31 },
    rollup: { volume_usdc: '12.500000', count, avg_amount: '0.312500', daily_series: series },
    captured_at: '2026-06-04T11:55:00Z',
    has_data: series.length > 0,
    attribution: 'x', license: 'CC BY 4.0',
    ...over,
  } as never;
}

describe('buildX402PublisherVerdict', () => {
  it('verdict actively_settling for verified-settling + active', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry(), receipts([
      { date: '2026-05-29', volume_usdc: '5.000000', count: 16 },
      { date: '2026-06-03', volume_usdc: '7.500000', count: 24 },
    ]), NOW);
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe('actively_settling');
    expect(r.capturedAt).toBe('2026-06-04T11:55:00Z');
  });

  it('verdict recently_quiet for verified-settling + quiet', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ activity: 'quiet', last_settled: '2026-05-10' }), receipts([]), NOW);
    expect(r.verdict).toBe('recently_quiet');
  });

  it('verdict registered_no_settlement for unverified', () => {
    const r = buildX402PublisherVerdict('d.com', entry({ status: 'unverified', activity: null, settlement_count: 0 }), receipts([]), NOW);
    expect(r.verdict).toBe('registered_no_settlement');
  });

  it('verdict unreachable and no_base_payto map through', () => {
    expect(buildX402PublisherVerdict('d.com', entry({ status: 'unreachable', activity: null }), null, NOW).verdict).toBe('unreachable');
    expect(buildX402PublisherVerdict('d.com', entry({ status: 'no-base-payto', activity: null, pay_to_wallets: [] }), null, NOW).verdict).toBe('no_base_payto');
  });

  it('verdict not_indexed when directory entry is null', () => {
    const r = buildX402PublisherVerdict('unknown.com', null, null, NOW);
    expect(r.verdict).toBe('not_indexed');
    expect(r.evidence.count).toBe(0);
  });

  it('momentum expanding when recent half outgrows prior half', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-01' }), receipts([
      { date: '2026-05-06', volume_usdc: '1.000000', count: 4 },
      { date: '2026-06-02', volume_usdc: '9.000000', count: 30 },
    ]), NOW);
    expect(r.momentum).toBe('expanding');
  });

  it('momentum contracting when recent half collapses', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-01' }), receipts([
      { date: '2026-05-06', volume_usdc: '9.000000', count: 30 },
      { date: '2026-05-08', volume_usdc: '1.000000', count: 4 },
    ]), NOW);
    expect(r.momentum).toBe('contracting');
  });

  it('momentum nascent when publisher first_seen inside the window', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-29' }), receipts([
      { date: '2026-05-30', volume_usdc: '5.000000', count: 16 },
    ]), NOW);
    expect(r.momentum).toBe('nascent');
  });

  it('momentum steady when volume is flat across both halves', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-01' }), receipts([
      { date: '2026-05-07', volume_usdc: '5.000000', count: 10 },
      { date: '2026-06-01', volume_usdc: '5.000000', count: 10 },
    ]), NOW);
    expect(r.momentum).toBe('steady');
  });

  it('momentum expanding from a zero prior half when the recent half has volume', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-01' }), receipts([
      { date: '2026-05-30', volume_usdc: '8.000000', count: 20 },
    ]), NOW);
    expect(r.momentum).toBe('expanding');
  });

  it('momentum treats a malformed volume string as zero, not NaN', () => {
    const r = buildX402PublisherVerdict('x402.tavily.com', entry({ first_seen: '2026-05-01' }), receipts([
      { date: '2026-05-07', volume_usdc: '5.000000', count: 10 },
      { date: '2026-06-01', volume_usdc: 'not-a-number', count: 10 },
    ]), NOW);
    // prior=5, recent guarded to 0 -> contracting, never NaN-collapsed to steady
    expect(r.momentum).toBe('contracting');
  });

  it('wallet_shared false for a plain provenance note', () => {
    const r = buildX402PublisherVerdict('a.com', entry({ note: 'Manually seeded from the live 402 challenge.' }), receipts([]), NOW);
    expect(r.trust.wallet_shared).toBe(false);
  });

  it('empty receipts yield the zero-evidence fallback', () => {
    const r = buildX402PublisherVerdict('a.com', entry({ activity: 'quiet' }), receipts([], { captured_at: null }), NOW);
    expect(r.evidence.window_days).toBe(30);
    expect(r.evidence.count).toBe(0);
    expect(r.evidence.daily_series).toEqual([]);
    expect(r.capturedAt).toBeNull();
  });

  it('wallet_shared true when the directory note discloses sharing', () => {
    const r = buildX402PublisherVerdict('a.com', entry({ note: 'Verified through a Base payTo wallet shared with b.com. Counts shown are the wallet total.' }), receipts([]), NOW);
    expect(r.trust.wallet_shared).toBe(true);
    expect(r.trust.disclosure).toContain('shared with');
  });

  it('capturedAt is the passed data time, never the clock', () => {
    const r = buildX402PublisherVerdict('a.com', entry(), receipts([], { captured_at: '2026-06-04T10:00:00Z' }), NOW);
    expect(r.capturedAt).toBe('2026-06-04T10:00:00Z');
  });

  it('emits zero em dashes and zero double hyphens', () => {
    const r = buildX402PublisherVerdict('a.com', entry(), receipts([{ date: '2026-06-03', volume_usdc: '1.0', count: 2 }]), NOW);
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json).not.toContain('–');
    expect(json.includes('--')).toBe(false);
  });
});

describe('redactX402PublisherVerdictForPreview', () => {
  it('keeps verdict/claim/captured_at/domain and drops momentum, trust, evidence', () => {
    const full = buildX402PublisherVerdict('a.com', entry(), receipts([{ date: '2026-06-03', volume_usdc: '1.0', count: 2 }]), NOW);
    const p = redactX402PublisherVerdictForPreview(full);
    expect(p.preview).toBe(true);
    expect(p.verdict).toBe(full.verdict);
    expect(p.domain).toBe('a.com');
    expect((p as unknown as Record<string, unknown>).momentum).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).trust).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).evidence).toBeUndefined();
  });
});

describe('computeX402PublisherVerdict', () => {
  it('falls back to the directory blob captured_at when receipts lack one', async () => {
    const env = {
      TENSORFEED_CACHE: {
        get: async (key: string) =>
          key === 'x402-idx:verified'
            ? {
                captured_at: '2026-06-04T09:00:00Z',
                publishers: [
                  {
                    domain: 'a.com',
                    status: 'verified-settling',
                    activity: 'quiet',
                    pay_to_wallets: [],
                    first_settled: '2026-05-29',
                    last_settled: '2026-05-30',
                    note: null,
                    first_seen: '2026-05-29',
                  },
                ],
              }
            : null,
        put: async () => undefined,
      },
    } as unknown as Parameters<typeof computeX402PublisherVerdict>[0];
    // normalizes 'A.com' -> 'a.com', mocked receipts return captured_at:null,
    // so capturedAt must come from the directory blob.
    const r = await computeX402PublisherVerdict(env, 'A.com');
    expect(r.verdict).toBe('recently_quiet');
    expect(r.capturedAt).toBe('2026-06-04T09:00:00Z');
  });
});
