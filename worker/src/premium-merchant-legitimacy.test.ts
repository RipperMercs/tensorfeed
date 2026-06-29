import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeDomain,
  buildMerchantLegitimacyVerdict,
  redactMerchantLegitimacyForPreview,
  checkMerchantLegitimacyPreviewRateLimit,
  computeMerchantLegitimacyVerdict,
  billingKindFor,
} from './premium-merchant-legitimacy';
import type { MerchantSignals } from './merchant-signals';

vi.mock('./kill-switch', () => ({ safePut: vi.fn() }));
vi.mock('./merchant-signals', async (orig) => ({
  ...(await orig<typeof import('./merchant-signals')>()),
  fetchMerchantSignals: vi.fn(),
}));

import { safePut } from './kill-switch';
import { fetchMerchantSignals } from './merchant-signals';

describe('normalizeDomain', () => {
  it('lowercases and strips scheme, path, port, and www', () => {
    expect(normalizeDomain('HTTPS://WWW.Shop.Example.com:443/cart?x=1')).toBe('shop.example.com');
  });
  it('keeps a bare apex domain', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
  it('rejects junk and empty', () => {
    expect(normalizeDomain('not a domain')).toBeNull();
    expect(normalizeDomain('')).toBeNull();
  });
});

const CAP = '2026-06-29T00:00:00Z';

function sig(o: Partial<MerchantSignals> = {}): MerchantSignals {
  return {
    domainAgeDays: 400,
    dns: { mx: true, spf: true, dmarc: 'reject' },
    certFirstSeenDays: 390,
    majestic: { inIndex: false, rank: null },
    phishingListed: false,
    listSnapshots: { majestic: 'M', phishing: 'P' },
    liveSignalsResolved: 3,
    ...o,
  };
}

describe('buildMerchantLegitimacyVerdict', () => {
  it('established clean merchant -> proceed', () => {
    const r = buildMerchantLegitimacyVerdict('shop.com', sig({ domainAgeDays: 1200, majestic: { inIndex: true, rank: 5000 } }), Date.parse(CAP), CAP);
    expect(r.verdict).toBe('proceed');
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
  it('newly-registered, no hygiene, unknown, fresh cert -> block cluster', () => {
    const r = buildMerchantLegitimacyVerdict('scam.com', sig({ domainAgeDays: 9, dns: { mx: false, spf: false, dmarc: null }, certFirstSeenDays: 5 }), Date.parse(CAP), CAP);
    expect(r.verdict).toBe('block');
    expect(r.score).toBeLessThan(40);
  });
  it('young but clean small merchant -> step_up', () => {
    const r = buildMerchantLegitimacyVerdict('new.com', sig({ domainAgeDays: 90 }), Date.parse(CAP), CAP);
    expect(r.verdict).toBe('step_up');
  });
  it('phishing hit overrides to block regardless of score', () => {
    const r = buildMerchantLegitimacyVerdict('p.com', sig({ domainAgeDays: 2000, majestic: { inIndex: true, rank: 100 }, phishingListed: true }), Date.parse(CAP), CAP);
    expect(r.verdict).toBe('block');
    expect(r.score).toBeLessThanOrEqual(10);
  });
  it('all live signals failed -> insufficient_data, never proceed', () => {
    const r = buildMerchantLegitimacyVerdict('x.io', sig({ domainAgeDays: null, dns: { mx: false, spf: false, dmarc: null }, certFirstSeenDays: null, liveSignalsResolved: 0 }), Date.parse(CAP), CAP);
    expect(r.verdict).toBe('insufficient_data');
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThan(70);
  });
  it('carries capturedAt and emits no em dashes or double hyphens', () => {
    const r = buildMerchantLegitimacyVerdict('shop.com', sig(), Date.parse(CAP), CAP);
    expect(r.capturedAt).toBe(CAP);
    const j = JSON.stringify(r);
    expect(j).not.toContain('—');
    expect(j).not.toContain('–');
    expect(j.includes('--')).toBe(false);
  });
});

describe('preview redact + rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redaction drops signals, reasons, sources, keeps band', () => {
    const full = buildMerchantLegitimacyVerdict('shop.com', sig({ domainAgeDays: 1200, majestic: { inIndex: true, rank: 5000 } }), Date.parse(CAP), CAP);
    const p = redactMerchantLegitimacyForPreview(full);
    expect(p).toEqual({ ok: true, preview: true, domain: 'shop.com', verdict: 'proceed', score_band: 'high', capturedAt: CAP });
  });
  it('allows under the cap and writes the counter', async () => {
    const env = { TENSORFEED_CACHE: { get: async () => null } } as never;
    const r = await checkMerchantLegitimacyPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r).toEqual({ allowed: true, remaining: 9, limit: 10 });
    expect(safePut).toHaveBeenCalledTimes(1);
  });
  it('blocks at the cap', async () => {
    const env = { TENSORFEED_CACHE: { get: async () => ({ count: 10 }) } } as never;
    expect((await checkMerchantLegitimacyPreviewRateLimit(env, '1.2.3.4', 10)).allowed).toBe(false);
  });
});

describe('computeMerchantLegitimacyVerdict', () => {
  it('compute wires signals into the verdict and stamps capturedAt', async () => {
    vi.mocked(fetchMerchantSignals).mockResolvedValue(sig({ domainAgeDays: 1500, majestic: { inIndex: true, rank: 800 } }));
    const r = await computeMerchantLegitimacyVerdict({} as never, 'shop.com');
    expect(r.verdict).toBe('proceed');
    expect(typeof r.capturedAt).toBe('string');
  });
});

describe('capturedAt binding to oldest contributing data', () => {
  it('phishing-block with old snapshot: capturedAt = old snapshot time, not nowISO', () => {
    const OLD = '2026-06-01T00:00:00Z';
    const NOW = '2026-06-29T00:00:00Z';
    const r = buildMerchantLegitimacyVerdict('p.com', sig({ phishingListed: true, listSnapshots: { majestic: null, phishing: OLD } }), Date.parse(NOW), NOW);
    expect(r.capturedAt).toBe(OLD);
    expect(r.capturedAt).not.toBe(NOW);
  });
  it('live-only verdict (no list contribution): capturedAt = nowISO', () => {
    const NOW = '2026-06-29T00:00:00Z';
    const r = buildMerchantLegitimacyVerdict('shop.com', sig({ phishingListed: false, majestic: { inIndex: false, rank: null }, liveSignalsResolved: 3 }), Date.parse(NOW), NOW);
    expect(r.capturedAt).toBe(NOW);
  });
  it('majestic-contributing verdict with old snapshot: capturedAt = old majestic time when oldest', () => {
    const OLD = '2026-06-01T00:00:00Z';
    const NOW = '2026-06-29T00:00:00Z';
    const r = buildMerchantLegitimacyVerdict('m.com', sig({ majestic: { inIndex: true, rank: 5000 }, listSnapshots: { majestic: OLD, phishing: null } }), Date.parse(NOW), NOW);
    expect(r.capturedAt).toBe(OLD);
  });
});

describe('billingKindFor', () => {
  it('maps insufficient_data to no_charge', () => {
    const r = buildMerchantLegitimacyVerdict('x.io', sig({ domainAgeDays: null, dns: { mx: false, spf: false, dmarc: null }, certFirstSeenDays: null, liveSignalsResolved: 0 }), Date.parse(CAP), CAP);
    expect(billingKindFor(r)).toBe('no_charge');
  });
  it('maps normal verdicts to ok', () => {
    const r = buildMerchantLegitimacyVerdict('shop.com', sig(), Date.parse(CAP), CAP);
    expect(billingKindFor(r)).toBe('ok');
  });
});

describe('screens degraded indicator', () => {
  it('screens.phishing is unavailable when listSnapshots.phishing is null', () => {
    const r = buildMerchantLegitimacyVerdict('x.io', sig({ listSnapshots: { majestic: null, phishing: null } }), Date.parse(CAP), CAP);
    expect(r.screens.phishing).toBe('unavailable');
  });
  it('screens.phishing is active when listSnapshots.phishing is set', () => {
    const r = buildMerchantLegitimacyVerdict('x.io', sig({ listSnapshots: { majestic: null, phishing: '2026-06-01T00:00:00Z' } }), Date.parse(CAP), CAP);
    expect(r.screens.phishing).toBe('active');
  });
});
