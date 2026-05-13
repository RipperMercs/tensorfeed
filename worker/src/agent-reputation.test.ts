import { describe, it, expect } from 'vitest';
import {
  COMPOSITE_WEIGHTS_FROZEN,
  NEW_WALLET_AGE_DAYS,
  PAID_FREE_RATIO,
  computeCompositeScore,
  computeFlags,
  computeMetrics,
  computeReliabilityPct,
  computeSpendScore,
  computeStreaks,
  computeTotalCalls,
  computeTrustGrade,
  daysBetween,
  rankCohort,
  rolling30dAvgSpend,
  utcDate,
  type AgentTelemetry,
  type FlagInput,
  type TrustGradeInput,
} from './agent-reputation';

const TODAY = '2026-05-13';

function tel(overrides: Partial<AgentTelemetry> = {}): AgentTelemetry {
  return {
    token_prefix: 'tf_live_abcdef12',
    wallet: '0x0000000000000000000000000000000000000001',
    first_seen: '2026-04-13T00:00:00Z',
    last_active: '2026-05-13T12:00:00Z',
    active_dates: [],
    endpoints_used: [],
    successful_calls: 0,
    errors_4xx: 0,
    errors_5xx: 0,
    paid_calls: 0,
    free_trial_calls: 0,
    receipts_signed: 0,
    total_credits_spent: 0,
    total_credits_purchased: 0,
    daily_spend_30d: {},
    ...overrides,
  };
}

describe('utcDate', () => {
  it('extracts YYYY-MM-DD from a UTC ISO string', () => {
    expect(utcDate('2026-05-13T12:34:56.789Z')).toBe('2026-05-13');
  });
});

describe('daysBetween', () => {
  it('returns whole UTC day diff', () => {
    expect(daysBetween('2026-05-01T00:00:00Z', '2026-05-13T00:00:00Z')).toBe(12);
  });
  it('clamps negative diffs to 0', () => {
    expect(daysBetween('2026-06-01T00:00:00Z', '2026-05-13T00:00:00Z')).toBe(0);
  });
  it('returns 0 for unparseable inputs', () => {
    expect(daysBetween('not-a-date', '2026-05-13T00:00:00Z')).toBe(0);
  });
});

describe('computeReliabilityPct', () => {
  it('returns 100 when no qualifying calls (benefit of the doubt)', () => {
    expect(computeReliabilityPct(0, 0)).toBe(100);
  });
  it('excludes 5xx from the denominator implicitly (it never enters this fn)', () => {
    expect(computeReliabilityPct(95, 5)).toBe(95);
  });
  it('rounds to one decimal', () => {
    expect(computeReliabilityPct(2, 1)).toBeCloseTo(66.7, 1);
  });
  it('returns 0 when every qualifying call was 4xx', () => {
    expect(computeReliabilityPct(0, 10)).toBe(0);
  });
});

describe('computeTotalCalls', () => {
  it('sums all three outcome buckets', () => {
    expect(
      computeTotalCalls(tel({ successful_calls: 100, errors_4xx: 5, errors_5xx: 2 })),
    ).toBe(107);
  });
});

describe('computeStreaks', () => {
  it('returns zero for empty input', () => {
    expect(computeStreaks([], TODAY)).toEqual({ current_streak_days: 0, longest_streak_days: 0 });
  });
  it('returns 1/1 for a single-day streak ending today', () => {
    expect(computeStreaks([TODAY], TODAY)).toEqual({ current_streak_days: 1, longest_streak_days: 1 });
  });
  it('returns 0 current when today is not in the set', () => {
    expect(computeStreaks(['2026-05-10', '2026-05-11', '2026-05-12'], TODAY)).toEqual({
      current_streak_days: 0,
      longest_streak_days: 3,
    });
  });
  it('detects a multi-day current streak ending today', () => {
    expect(
      computeStreaks(['2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13'], TODAY),
    ).toEqual({ current_streak_days: 4, longest_streak_days: 4 });
  });
  it('handles a longest > current case', () => {
    const dates = [
      '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', // 5-day run
      '2026-05-12', '2026-05-13', // 2-day current run ending today
    ];
    expect(computeStreaks(dates, TODAY)).toEqual({
      current_streak_days: 2,
      longest_streak_days: 5,
    });
  });
  it('deduplicates duplicate dates', () => {
    expect(computeStreaks(['2026-05-13', '2026-05-13'], TODAY).longest_streak_days).toBe(1);
  });
});

describe('computeSpendScore', () => {
  it('weights paid 5x free in v0', () => {
    expect(computeSpendScore(10, 0, 50)).toBe(100);
    expect(computeSpendScore(0, 50, 50)).toBe(100);
    expect(computeSpendScore(0, 10, 50)).toBe(20);
    expect(PAID_FREE_RATIO).toBe(5);
  });
  it('caps at 100 even when paid_calls dominates', () => {
    expect(computeSpendScore(1000, 0, 50)).toBe(100);
  });
  it('returns 0 when there is no spend', () => {
    expect(computeSpendScore(0, 0, 50)).toBe(0);
  });
  it('handles cohortSpendCap=0 by collapsing to 0 or 100', () => {
    expect(computeSpendScore(0, 0, 0)).toBe(0);
    expect(computeSpendScore(1, 0, 0)).toBe(100);
  });
});

describe('computeCompositeScore', () => {
  const baseMetrics = {
    total_calls: 100,
    successful_calls: 95,
    reliability_pct: 95,
    total_premium_calls: 50,
    total_credits_spent: 50,
    receipts_signed: 50,
    active_days: 30,
    current_streak_days: 30,
    longest_streak_days: 30,
    unique_endpoints_used: 5,
    errors_4xx: 5,
    errors_5xx: 0,
    free_trial_calls: 0,
    paid_calls: 50,
    wallet_age_days: 30,
  };

  it('returns a number in [0,100]', () => {
    const score = computeCompositeScore(baseMetrics, 250);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  it('is monotone increasing in reliability', () => {
    const lo = computeCompositeScore({ ...baseMetrics, reliability_pct: 50 }, 250);
    const hi = computeCompositeScore({ ...baseMetrics, reliability_pct: 100 }, 250);
    expect(hi).toBeGreaterThan(lo);
  });
  it('weights sum to 1 (frozen)', () => {
    const w = COMPOSITE_WEIGHTS_FROZEN;
    expect(w.reliability + w.activity + w.spend + w.streak).toBeCloseTo(1, 9);
  });
  it('throws if supplied weights do not sum to 1', () => {
    expect(() =>
      computeCompositeScore(baseMetrics, 250, {
        reliability: 0.5,
        activity: 0.5,
        spend: 0.5,
        streak: 0.5,
      }),
    ).toThrow(/weights must sum to 1/);
  });
});

describe('computeTrustGrade', () => {
  const base: TrustGradeInput = {
    wallet_age_days: 0,
    paid_calls: 0,
    verified: false,
    banned: false,
    ofac_clean: true,
    flag_count: 0,
  };
  it('F when banned, regardless of age/spend', () => {
    expect(computeTrustGrade({ ...base, banned: true, wallet_age_days: 365, paid_calls: 1000 })).toBe('F');
  });
  it('F when ofac_clean is false', () => {
    expect(computeTrustGrade({ ...base, ofac_clean: false })).toBe('F');
  });
  it('F when 2+ flags', () => {
    expect(computeTrustGrade({ ...base, wallet_age_days: 365, paid_calls: 200, verified: true, flag_count: 2 })).toBe('F');
  });
  it('A only with all thresholds met AND zero flags', () => {
    expect(
      computeTrustGrade({ ...base, wallet_age_days: 90, paid_calls: 100, verified: true }),
    ).toBe('A');
    expect(
      computeTrustGrade({ ...base, wallet_age_days: 90, paid_calls: 100, verified: true, flag_count: 1 }),
    ).not.toBe('A');
  });
  it('B at 30d + 20 paid with no flags', () => {
    expect(computeTrustGrade({ ...base, wallet_age_days: 30, paid_calls: 20 })).toBe('B');
  });
  it('C at 7d + verified OR 5 paid calls', () => {
    expect(computeTrustGrade({ ...base, wallet_age_days: 7, verified: true })).toBe('C');
    expect(computeTrustGrade({ ...base, wallet_age_days: 7, paid_calls: 5 })).toBe('C');
  });
  it('D when wallet < 7d or no paid calls', () => {
    expect(computeTrustGrade({ ...base, wallet_age_days: 3, paid_calls: 100 })).toBe('D');
    expect(computeTrustGrade({ ...base, wallet_age_days: 100, paid_calls: 0 })).toBe('D');
  });
  it('NEW_WALLET_AGE_DAYS is the public C boundary', () => {
    expect(NEW_WALLET_AGE_DAYS).toBe(7);
  });
});

describe('computeFlags', () => {
  const base: FlagInput = {
    wallet_age_days: 100,
    paid_calls: 10,
    daily_spend_today: 0,
    rolling_30d_avg_spend: 0,
    unique_endpoints_used: 10,
    errors_4xx: 0,
    total_calls: 100,
    claim_disputed: false,
  };
  it('returns [] for a healthy agent', () => {
    expect(computeFlags(base)).toEqual([]);
  });
  it('flags new_wallet under 7 days', () => {
    expect(computeFlags({ ...base, wallet_age_days: 3 })).toContain('new_wallet');
  });
  it('flags no_paid_calls when paid_calls == 0', () => {
    expect(computeFlags({ ...base, paid_calls: 0 })).toContain('no_paid_calls');
  });
  it('flags spend_spike at 5x rolling average', () => {
    expect(
      computeFlags({ ...base, daily_spend_today: 100, rolling_30d_avg_spend: 10 }),
    ).toContain('spend_spike');
  });
  it('does NOT flag spend_spike when rolling avg is 0 (no baseline)', () => {
    expect(
      computeFlags({ ...base, daily_spend_today: 100, rolling_30d_avg_spend: 0 }),
    ).not.toContain('spend_spike');
  });
  it('flags low_endpoint_diversity only after 10+ calls', () => {
    expect(computeFlags({ ...base, unique_endpoints_used: 1, total_calls: 9 })).not.toContain(
      'low_endpoint_diversity',
    );
    expect(computeFlags({ ...base, unique_endpoints_used: 1, total_calls: 10 })).toContain(
      'low_endpoint_diversity',
    );
  });
  it('flags high_error_rate only with 20+ calls and >=20% 4xx', () => {
    expect(computeFlags({ ...base, errors_4xx: 5, total_calls: 19 })).not.toContain('high_error_rate');
    expect(computeFlags({ ...base, errors_4xx: 5, total_calls: 20 })).toContain('high_error_rate');
  });
  it('flags claim_disputed when explicitly set', () => {
    expect(computeFlags({ ...base, claim_disputed: true })).toContain('claim_disputed');
  });
});

describe('rolling30dAvgSpend', () => {
  it('excludes today and returns simple mean', () => {
    const avg = rolling30dAvgSpend(
      { '2026-05-13': 100, '2026-05-12': 10, '2026-05-11': 20 },
      '2026-05-13',
    );
    expect(avg).toBe(15);
  });
  it('returns 0 for empty input', () => {
    expect(rolling30dAvgSpend({}, '2026-05-13')).toBe(0);
  });
  it('returns 0 if only today has data', () => {
    expect(rolling30dAvgSpend({ '2026-05-13': 100 }, '2026-05-13')).toBe(0);
  });
});

describe('rankCohort', () => {
  it('higher score gets rank 1', () => {
    const m = rankCohort([
      { id: 'a', score: 10 },
      { id: 'b', score: 50 },
      { id: 'c', score: 30 },
    ]);
    expect(m.get('b')?.rank).toBe(1);
    expect(m.get('c')?.rank).toBe(2);
    expect(m.get('a')?.rank).toBe(3);
  });
  it('ties resolved by id ASC, deterministically', () => {
    const m = rankCohort([
      { id: 'b', score: 50 },
      { id: 'a', score: 50 },
    ]);
    expect(m.get('a')?.rank).toBe(1);
    expect(m.get('b')?.rank).toBe(2);
  });
  it('percentile: rank 1 of N → 100, rank N of N → 0', () => {
    const m = rankCohort([
      { id: 'a', score: 10 },
      { id: 'b', score: 20 },
      { id: 'c', score: 30 },
    ]);
    expect(m.get('c')?.pct).toBe(100);
    expect(m.get('a')?.pct).toBe(0);
  });
  it('single-entry cohort gets pct=100', () => {
    const m = rankCohort([{ id: 'a', score: 5 }]);
    expect(m.get('a')?.pct).toBe(100);
  });
  it('total reflects cohort size', () => {
    const m = rankCohort([
      { id: 'a', score: 1 },
      { id: 'b', score: 2 },
    ]);
    expect(m.get('a')?.total).toBe(2);
  });
});

describe('computeMetrics (integration of the pure functions)', () => {
  it('assembles a full ReputationMetrics from telemetry', () => {
    const t = tel({
      first_seen: '2026-04-13T00:00:00Z',
      successful_calls: 95,
      errors_4xx: 5,
      errors_5xx: 2,
      paid_calls: 50,
      free_trial_calls: 10,
      receipts_signed: 50,
      total_credits_spent: 50,
      active_dates: ['2026-05-11', '2026-05-12', '2026-05-13'],
      endpoints_used: ['/api/x', '/api/x', '/api/y'],
    });
    const m = computeMetrics(t, TODAY);
    expect(m.total_calls).toBe(102);
    expect(m.reliability_pct).toBe(95);
    expect(m.active_days).toBe(3);
    expect(m.current_streak_days).toBe(3);
    expect(m.longest_streak_days).toBe(3);
    expect(m.unique_endpoints_used).toBe(2);
    expect(m.wallet_age_days).toBe(30);
    expect(m.paid_calls).toBe(50);
    expect(m.free_trial_calls).toBe(10);
  });
});
