import { describe, it, expect } from 'vitest';
import {
  classifyVelocity,
  computeVelocityRatio,
  buildVelocityEntries,
  computeResearchVelocity,
  RESEARCH_VELOCITY_ATTRIBUTION,
} from './premium-research-velocity';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, JSON.parse(value));
    },
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

// ── Math helpers ───────────────────────────────────────────────────

describe('classifyVelocity', () => {
  it('returns accelerating above 1.2', () => {
    expect(classifyVelocity(1.21)).toBe('accelerating');
    expect(classifyVelocity(2)).toBe('accelerating');
  });
  it('returns decelerating below 0.8', () => {
    expect(classifyVelocity(0.79)).toBe('decelerating');
    expect(classifyVelocity(0.5)).toBe('decelerating');
  });
  it('returns steady in the band', () => {
    expect(classifyVelocity(1)).toBe('steady');
    expect(classifyVelocity(1.2)).toBe('steady');
    expect(classifyVelocity(0.8)).toBe('steady');
  });
  it('returns insufficient_data for null', () => {
    expect(classifyVelocity(null)).toBe('insufficient_data');
  });
});

describe('computeVelocityRatio', () => {
  it('returns annualized / last_year ratio', () => {
    expect(computeVelocityRatio(1200, 1000)).toBe(1.2);
    expect(computeVelocityRatio(800, 1000)).toBe(0.8);
  });
  it('returns null for zero or negative baseline', () => {
    expect(computeVelocityRatio(1000, 0)).toBeNull();
    expect(computeVelocityRatio(1000, -5)).toBeNull();
  });
});

// ── buildVelocityEntries ──────────────────────────────────────────

describe('buildVelocityEntries', () => {
  const baseline = [
    { rank: 1, openalex_id: 'I1', display_name: 'MIT', country_code: 'US', type: 'education', ai_works_last_year: 1200, total_works_count: 10000 },
    { rank: 2, openalex_id: 'I2', display_name: 'Stanford', country_code: 'US', type: 'education', ai_works_last_year: 1000, total_works_count: 9000 },
    { rank: 3, openalex_id: 'I3', display_name: 'Tsinghua', country_code: 'CN', type: 'education', ai_works_last_year: 900, total_works_count: 8000 },
    { rank: 4, openalex_id: 'I4', display_name: 'Google Research', country_code: 'US', type: 'company', ai_works_last_year: 600, total_works_count: 5000 },
  ];

  // Annualization now scales the recent count over the REALIZED completed
  // window (30d minus a 14-day lag buffer = 16 days), not a naive 30, so the
  // multiplier is 365/16 unless an explicit window is passed. We pass the
  // window explicitly here so the math is pinned regardless of the default.
  it('joins baseline with recent counts and computes velocity over a 30d-equivalent window', () => {
    // Pass 30 explicitly to keep the historical 365/30 math.
    // I1: 200 * (365/30) / 1200 ≈ 2.028 (accelerating)
    // I2: 80 * (365/30) / 1000 ≈ 0.973 (steady)
    // I3: 50 * (365/30) / 900 ≈ 0.676 (decelerating)
    // I4: 0 (no recent) -> 0/600 = 0 (decelerating)
    const recent = { I1: 200, I2: 80, I3: 50 };
    const out = buildVelocityEntries(baseline, recent, 30);
    expect(out).toHaveLength(4);
    const mit = out.find(e => e.openalex_id === 'I1')!;
    expect(mit.velocity_ratio).toBeCloseTo(2.028, 2);
    expect(mit.direction).toBe('accelerating');
    const stanford = out.find(e => e.openalex_id === 'I2')!;
    expect(stanford.direction).toBe('steady');
    const tsinghua = out.find(e => e.openalex_id === 'I3')!;
    expect(tsinghua.direction).toBe('decelerating');
    const googleRes = out.find(e => e.openalex_id === 'I4')!;
    expect(googleRes.ai_works_last_30d).toBe(0);
    expect(googleRes.velocity_ratio).toBe(0);
    expect(googleRes.direction).toBe('decelerating');
  });

  it('annualizes over the realized window length, not a naive 30', () => {
    // Same recent count, two different realized windows. A 16-day window must
    // annualize higher than a 30-day window for the same count, because the
    // count was accumulated over fewer days.
    const recent = { I1: 100 };
    const over16 = buildVelocityEntries(baseline, recent, 16)[0];
    const over30 = buildVelocityEntries(baseline, recent, 30)[0];
    expect(over16.annualized_30d).toBeCloseTo(100 * (365 / 16), 0);
    expect(over30.annualized_30d).toBeCloseTo(100 * (365 / 30), 0);
    expect(over16.annualized_30d).toBeGreaterThan(over30.annualized_30d);
  });

  it('does not mislabel a flat institution as decelerating purely from the lag window', () => {
    // A genuinely flat institution publishes at the SAME monthly pace it
    // averaged over the year. Over a completed 16-day window it published
    // ~ baseline/365*16 works. The naive 365/30 annualization of that same
    // count would read well below 1.0 (false "decelerating"); the realized
    // 365/16 annualization correctly reads ~1.0 ("steady").
    const flatBaseline = [
      { rank: 1, openalex_id: 'IF', display_name: 'Flat Lab', country_code: 'US', type: 'education', ai_works_last_year: 365, total_works_count: 5000 },
    ];
    // Flat pace over a completed 16-day window: 365/365*16 = 16 works.
    const recent = { IF: 16 };
    const realized = buildVelocityEntries(flatBaseline, recent, 16)[0];
    expect(realized.velocity_ratio).toBeCloseTo(1.0, 1);
    expect(realized.direction).toBe('steady');
    // The pre-fix naive path (same 16 works annualized as if it were 30 days)
    // would have falsely flagged the flat lab as decelerating.
    const naive = buildVelocityEntries(flatBaseline, recent, 30)[0];
    expect(naive.direction).toBe('decelerating');
  });

  it('ranks by velocity descending', () => {
    const recent = { I1: 200, I2: 80, I3: 50 };
    const out = buildVelocityEntries(baseline, recent, 30);
    expect(out[0].openalex_id).toBe('I1');
    expect(out[0].rank_by_velocity).toBe(1);
  });

  it('handles institution with zero baseline (insufficient_data)', () => {
    const baselineWithZero = [
      { rank: 1, openalex_id: 'I0', display_name: 'New Lab', country_code: 'US', type: 'company', ai_works_last_year: 0, total_works_count: null },
    ];
    const out = buildVelocityEntries(baselineWithZero, { I0: 50 });
    expect(out[0].velocity_ratio).toBeNull();
    expect(out[0].direction).toBe('insufficient_data');
  });

  it('returns empty when baseline is empty', () => {
    expect(buildVelocityEntries([], {})).toEqual([]);
  });
});

// ── computeResearchVelocity ───────────────────────────────────────

const SAMPLE_BASELINE = {
  capturedAt: '2026-05-06T04:00:00Z',
  institutions: [
    { rank: 1, openalex_id: 'I1', display_name: 'MIT', country_code: 'US', type: 'education', ai_works_last_year: 1200, total_works_count: 10000 },
    { rank: 2, openalex_id: 'I2', display_name: 'Stanford', country_code: 'US', type: 'education', ai_works_last_year: 1000, total_works_count: 9000 },
    { rank: 3, openalex_id: 'I3', display_name: 'Tsinghua', country_code: 'CN', type: 'education', ai_works_last_year: 900, total_works_count: 8000 },
    { rank: 4, openalex_id: 'I4', display_name: 'Google Research', country_code: 'US', type: 'company', ai_works_last_year: 600, total_works_count: 5000 },
  ],
};

// Recent counts are over the realized completed 16-day sub-window
// (30d minus the 14-day OpenAlex indexing-lag buffer). Annualization uses
// 365/16, so these counts are chosen to reproduce the original direction mix.
const SAMPLE_RECENT = {
  fetchedAt: '2026-05-06T18:00:00Z',
  windowDays: 30,
  realizedWindowDays: 16,
  lagBufferDays: 14,
  fromDate: '2026-04-06',
  toDate: '2026-04-22',
  countsById: { I1: 100, I2: 44, I3: 25, I4: 50 },
};

describe('computeResearchVelocity', () => {
  it('returns no_baseline_yet when baseline is missing', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:recent-30d': SAMPLE_RECENT });
    const r = await computeResearchVelocity(env);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_baseline_yet');
  });

  it('uses cached recent snapshot when present', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.total_institutions).toBe(4);
    // recent_window_days now reports the REALIZED completed window length.
    expect(r.recent_window_days).toBe(16);
    expect(r.recent_window_lag_buffer_days).toBe(14);
    expect(r.recent_window_from).toBe('2026-04-06');
    expect(r.recent_window_to).toBe('2026-04-22');
  });

  it('discloses the OpenAlex indexing-lag window exclusion in notes', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lagNote = r.notes.find(n => n.toLowerCase().includes('index'));
    expect(lagNote).toBeDefined();
    expect(lagNote!.toLowerCase()).toContain('decelerating');
    expect(lagNote).toContain('14');
  });

  it('classifies directions based on the ratio thresholds', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    if (!r.ok) return;
    // Annualized over the realized 16-day window (multiplier 365/16 = 22.81):
    // I1: 100*22.81/1200 = 1.90 -> accelerating
    // I2: 44*22.81/1000 = 1.00 -> steady
    // I3: 25*22.81/900  = 0.63 -> decelerating
    // I4: 50*22.81/600  = 1.90 -> accelerating
    expect(r.totals_by_direction.accelerating).toBe(2);
    expect(r.totals_by_direction.steady).toBe(1);
    expect(r.totals_by_direction.decelerating).toBe(1);
  });

  it('builds notable_movers correctly', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    if (!r.ok) return;
    expect(r.notable_movers.top_accelerating[0].openalex_id).toBe('I1');
    expect(r.notable_movers.top_decelerating[0].openalex_id).toBe('I3');
  });

  it('aggregates by_country and by_type', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    if (!r.ok) return;
    expect(r.by_country.US.accelerating).toBe(2); // MIT, Google Research
    expect(r.by_country.US.steady).toBe(1);       // Stanford
    expect(r.by_country.CN.decelerating).toBe(1); // Tsinghua
    expect(r.by_type.education.accelerating).toBe(1); // MIT
    expect(r.by_type.company.accelerating).toBe(1);   // Google Research
  });

  it('attaches attribution', async () => {
    const env = makeEnv({
      'openalex-ai-institutions:current': SAMPLE_BASELINE,
      'openalex-ai-institutions:recent-30d': SAMPLE_RECENT,
    });
    const r = await computeResearchVelocity(env);
    if (!r.ok) return;
    expect(r.attribution).toEqual(RESEARCH_VELOCITY_ATTRIBUTION);
    expect(r.attribution.license).toContain('CC0');
  });
});
