import { describe, it, expect } from 'vitest';
import {
  FED_AI_COHORT,
  FED_SPEND_SNAPSHOT_KEY,
  FED_SOURCE,
  FED_LICENSE,
  ACTIVE_WINDOW_DAYS,
  matchesVendor,
  rollupVendor,
  buildSnapshot,
} from './federal-spending-fetcher';
import type { FedVendor, FedAward } from './federal-spending-fetcher';

// Fixed clock for every window calculation in this suite.
const NOW_MS = Date.parse('2026-05-31T00:00:00Z');
const DAY_MS = 86_400_000;

// Helper: produce a YYYY-MM-DD string a given number of days before NOW.
function daysAgo(n: number): string {
  return new Date(NOW_MS - n * DAY_MS).toISOString().slice(0, 10);
}

const palantir = FED_AI_COHORT.find((v) => v.slug === 'palantir') as FedVendor;
const anthropic = FED_AI_COHORT.find((v) => v.slug === 'anthropic') as FedVendor;

function award(partial: Partial<FedAward>): FedAward {
  return {
    award_id: 'A1',
    recipient: 'Palantir Technologies Inc.',
    amount: 1000,
    agency: 'Department of Defense',
    agency_slug: 'dod',
    award_type: 'contract',
    internal_id: 'CONT_AWD_1',
    date: daysAgo(10),
    ...partial,
  };
}

describe('cohort + constants', () => {
  it('has 12 vendors with the expected exact slugs', () => {
    expect(FED_AI_COHORT).toHaveLength(12);
    expect(FED_AI_COHORT.map((v) => v.slug)).toEqual([
      'palantir',
      'anduril',
      'scale-ai',
      'shield-ai',
      'rebellion-defense',
      'vannevar-labs',
      'primer',
      'saronic',
      'skydio',
      'openai',
      'anthropic',
      'nvidia',
    ]);
  });

  it('exports the KV key, source, license, and window constants', () => {
    expect(FED_SPEND_SNAPSHOT_KEY).toBe('fedspend:snapshot');
    expect(FED_SOURCE).toContain('USAspending.gov');
    expect(FED_LICENSE).toContain('Public domain');
    expect(ACTIVE_WINDOW_DAYS).toBe(365);
  });
});

describe('matchesVendor', () => {
  it('matches case-insensitively on the vendor match token', () => {
    expect(matchesVendor('PALANTIR TECHNOLOGIES INC.', palantir)).toBe(true);
    expect(matchesVendor('Palantir USG, Inc.', palantir)).toBe(true);
  });

  it('returns false when the token is absent', () => {
    expect(matchesVendor('Lockheed Martin Corporation', palantir)).toBe(false);
    expect(matchesVendor('Anthropic PBC', palantir)).toBe(false);
  });

  it('matches multi-word tokens like "scale ai"', () => {
    const scale = FED_AI_COHORT.find((v) => v.slug === 'scale-ai') as FedVendor;
    expect(matchesVendor('SCALE AI INC', scale)).toBe(true);
    expect(matchesVendor('Scale Computing', scale)).toBe(false);
  });
});

describe('rollupVendor', () => {
  it('sums total_usd and award_count over all awards including null-date ones', () => {
    const awards = [
      award({ amount: 1000, date: daysAgo(10) }),
      award({ amount: 2000, date: daysAgo(20) }),
      award({ amount: 5000, date: null }),
    ];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.total_usd).toBe(8000);
    expect(r.award_count).toBe(3);
  });

  it('excludes null-date awards from both windows but keeps them in the total', () => {
    const awards = [
      award({ amount: 1000, date: daysAgo(10) }), // recent
      award({ amount: 9999, date: null }), // neither window
    ];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.recent_90d_usd).toBe(1000);
    expect(r.prior_90d_usd).toBe(0);
    expect(r.total_usd).toBe(10999);
  });

  it('computes a positive momentum_pct when recent exceeds prior', () => {
    const awards = [
      award({ amount: 3000, date: daysAgo(30) }), // recent 90d
      award({ amount: 1000, date: daysAgo(120) }), // prior 90d
    ];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.recent_90d_usd).toBe(3000);
    expect(r.prior_90d_usd).toBe(1000);
    // (3000 - 1000) / 1000 * 100 = 200
    expect(r.momentum_pct).toBe(200);
  });

  it('computes a negative momentum_pct when recent is below prior', () => {
    const awards = [
      award({ amount: 500, date: daysAgo(30) }), // recent
      award({ amount: 1000, date: daysAgo(120) }), // prior
    ];
    const r = rollupVendor(palantir, awards, NOW_MS);
    // (500 - 1000) / 1000 * 100 = -50
    expect(r.momentum_pct).toBe(-50);
  });

  it('returns null momentum_pct when prior window is zero', () => {
    const awards = [award({ amount: 1000, date: daysAgo(10) })];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.prior_90d_usd).toBe(0);
    expect(r.momentum_pct).toBeNull();
  });

  it('treats day 90 as outside the recent window (recent is strictly < 90 days)', () => {
    const awards = [award({ amount: 1000, date: daysAgo(95) })];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.recent_90d_usd).toBe(0);
    expect(r.prior_90d_usd).toBe(1000);
  });

  it('returns top 3 agencies sorted by summed usd desc', () => {
    const awards = [
      award({ amount: 100, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 400, agency: 'Navy', agency_slug: 'navy' }),
      award({ amount: 50, agency: 'Air Force', agency_slug: 'af' }),
      award({ amount: 300, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 999, agency: 'CIA', agency_slug: 'cia' }),
    ];
    const r = rollupVendor(palantir, awards, NOW_MS);
    expect(r.top_agencies).toHaveLength(3);
    expect(r.top_agencies.map((a) => a.agency_slug)).toEqual(['cia', 'army', 'navy']);
    expect(r.top_agencies[0]).toEqual({ agency: 'CIA', agency_slug: 'cia', usd: 999 });
    expect(r.top_agencies[1]).toEqual({ agency: 'Army', agency_slug: 'army', usd: 400 });
    expect(r.top_agencies[2]).toEqual({ agency: 'Navy', agency_slug: 'navy', usd: 400 });
  });

  it('carries through vendor identity fields', () => {
    const r = rollupVendor(anthropic, [], NOW_MS);
    expect(r.slug).toBe('anthropic');
    expect(r.name).toBe('Anthropic');
    expect(r.category).toBe('frontier-lab');
    expect(r.total_usd).toBe(0);
    expect(r.award_count).toBe(0);
    expect(r.top_agencies).toEqual([]);
    expect(r.momentum_pct).toBeNull();
  });
});

describe('buildSnapshot', () => {
  it('sorts vendors by total_usd desc and sums totals', () => {
    const small = rollupVendor(anthropic, [award({ amount: 1000, recipient: 'Anthropic PBC' })], NOW_MS);
    const big = rollupVendor(palantir, [award({ amount: 9000 })], NOW_MS);
    const snap = buildSnapshot([small, big], [], '2026-05-31T00:00:00.000Z', 365);
    expect(snap.vendors.map((v) => v.slug)).toEqual(['palantir', 'anthropic']);
    expect(snap.total_usd).toBe(10000);
    expect(snap.total_awards).toBe(2);
    expect(snap.cohort_size).toBe(2);
  });

  it('attaches source, license, window, ok, and captured_at', () => {
    const snap = buildSnapshot([], [], '2026-05-31T00:00:00.000Z', 365);
    expect(snap.ok).toBe(true);
    expect(snap.source).toBe(FED_SOURCE);
    expect(snap.license).toBe(FED_LICENSE);
    expect(snap.window_days).toBe(365);
    expect(snap.captured_at).toBe('2026-05-31T00:00:00.000Z');
  });

  it('orders recent by date desc, caps at 25, and drops null-date awards', () => {
    const allAwards: FedAward[] = [];
    for (let i = 0; i < 30; i++) {
      allAwards.push(award({ award_id: `R${i}`, internal_id: `id-${i}`, amount: 1, date: daysAgo(i) }));
    }
    // Two null-date awards that must never appear in recent.
    allAwards.push(award({ award_id: 'NULL1', internal_id: 'null-1', date: null }));
    allAwards.push(award({ award_id: 'NULL2', internal_id: 'null-2', date: null }));
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.recent).toHaveLength(25);
    // Newest (daysAgo(0)) first.
    expect(snap.recent[0].award_id).toBe('R0');
    expect(snap.recent[24].award_id).toBe('R24');
    expect(snap.recent.every((a) => a.date !== null)).toBe(true);
  });

  it('computes cohort-wide top 10 agencies across all awards', () => {
    const allAwards: FedAward[] = [];
    // 12 distinct agencies, increasing usd so ordering is predictable.
    for (let i = 0; i < 12; i++) {
      allAwards.push(
        award({
          award_id: `A${i}`,
          internal_id: `id-${i}`,
          amount: (i + 1) * 100,
          agency: `Agency ${i}`,
          agency_slug: `ag-${i}`,
          date: daysAgo(i),
        }),
      );
    }
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.agencies).toHaveLength(10);
    expect(snap.agencies[0]).toEqual({ agency: 'Agency 11', agency_slug: 'ag-11', usd: 1200 });
    expect(snap.agencies[9]).toEqual({ agency: 'Agency 2', agency_slug: 'ag-2', usd: 300 });
  });

  it('aggregates agency usd across multiple awards to the same agency', () => {
    const allAwards = [
      award({ award_id: 'X1', internal_id: 'x1', amount: 200, agency: 'NSA', agency_slug: 'nsa' }),
      award({ award_id: 'X2', internal_id: 'x2', amount: 300, agency: 'NSA', agency_slug: 'nsa' }),
    ];
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.agencies).toHaveLength(1);
    expect(snap.agencies[0]).toEqual({ agency: 'NSA', agency_slug: 'nsa', usd: 500 });
  });
});
