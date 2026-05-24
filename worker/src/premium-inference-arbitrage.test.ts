import { describe, it, expect } from 'vitest';
import {
  parseFamily,
  parseMinSavingsPct,
  buildModelArbitrageRow,
  buildProviderRollups,
  buildArbitrage,
  DEFAULT_MIN_SAVINGS_PCT,
  type ModelArbitrageRow,
} from './premium-inference-arbitrage';
import {
  INFERENCE_MATRIX,
  TRACKED_PROVIDERS,
  type ModelMatrix,
  type ProviderOffer,
} from './inference-providers';

// Shared reference clock.
const REFERENCE_NOW = new Date('2026-05-24T00:00:00Z');

/**
 * Build a synthetic ProviderOffer. Defaults keep tests focused on the fields
 * that matter for each case.
 */
function makeOffer(overrides: Partial<ProviderOffer> & Pick<ProviderOffer, 'provider'>): ProviderOffer {
  return {
    providerModelId: 'test/model-id',
    inputPrice: 0.50,
    outputPrice: 1.50,
    blendedPrice: 1.00,
    contextWindow: 128000,
    outputTPS: null,
    features: [],
    url: 'https://example.test/pricing',
    note: '',
    ...overrides,
  };
}

/**
 * Build a synthetic ModelMatrix. Defaults are filled with placeholder values
 * so callers only override what matters for the test.
 */
function makeModel(overrides: Partial<ModelMatrix> & Pick<ModelMatrix, 'modelId' | 'offers'>): ModelMatrix {
  return {
    modelName: overrides.modelId,
    family: 'TestFamily',
    paramsB: 70,
    license: 'Apache-2.0',
    openWeights: true,
    ...overrides,
  };
}

// ── parseFamily ────────────────────────────────────────────────────

describe('parseFamily', () => {
  it('returns null on null input', () => {
    expect(parseFamily(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseFamily('')).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseFamily('   ')).toBeNull();
  });

  it('trims surrounding whitespace from valid input', () => {
    expect(parseFamily('  Meta  ')).toBe('Meta');
  });

  it('returns the value verbatim when already trimmed', () => {
    expect(parseFamily('DeepSeek')).toBe('DeepSeek');
  });
});

// ── parseMinSavingsPct ─────────────────────────────────────────────

describe('parseMinSavingsPct', () => {
  it('returns DEFAULT_MIN_SAVINGS_PCT on null input', () => {
    expect(parseMinSavingsPct(null)).toBe(DEFAULT_MIN_SAVINGS_PCT);
    expect(DEFAULT_MIN_SAVINGS_PCT).toBe(20);
  });

  it('returns DEFAULT_MIN_SAVINGS_PCT on empty string', () => {
    expect(parseMinSavingsPct('')).toBe(DEFAULT_MIN_SAVINGS_PCT);
  });

  it('returns DEFAULT_MIN_SAVINGS_PCT on non-numeric input', () => {
    expect(parseMinSavingsPct('abc')).toBe(DEFAULT_MIN_SAVINGS_PCT);
  });

  it('parses a valid integer string', () => {
    expect(parseMinSavingsPct('40')).toBe(40);
  });

  it('parses a valid float string', () => {
    expect(parseMinSavingsPct('33.5')).toBe(33.5);
  });

  it('clamps negative values to 0', () => {
    expect(parseMinSavingsPct('-10')).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(parseMinSavingsPct('150')).toBe(100);
  });

  it('accepts boundary 0 verbatim', () => {
    expect(parseMinSavingsPct('0')).toBe(0);
  });

  it('accepts boundary 100 verbatim', () => {
    expect(parseMinSavingsPct('100')).toBe(100);
  });
});

// ── buildModelArbitrageRow ─────────────────────────────────────────

describe('buildModelArbitrageRow', () => {
  it('single paid offer: cheapest equals most-expensive, spread=0, savings_pct=0', () => {
    const m = makeModel({
      modelId: 'solo',
      offers: [makeOffer({ provider: 'Together AI', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 })],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.offer_count_paid).toBe(1);
    expect(row.cheapest_paid).toEqual({ provider: 'Together AI', blendedPrice: 0.50 });
    expect(row.most_expensive_paid).toEqual({ provider: 'Together AI', blendedPrice: 0.50 });
    expect(row.spread_usd).toBe(0);
    expect(row.savings_pct).toBe(0);
    expect(row.median_paid_blended).toBe(0.50);
  });

  it('multi-offer paid model: identifies cheapest and most-expensive correctly', () => {
    const m = makeModel({
      modelId: 'multi',
      offers: [
        makeOffer({ provider: 'Together AI', blendedPrice: 1.00, inputPrice: 0.5, outputPrice: 1.5 }),
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 }),
        makeOffer({ provider: 'Fireworks', blendedPrice: 2.00, inputPrice: 1.0, outputPrice: 3.0 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.cheapest_paid).toEqual({ provider: 'DeepInfra', blendedPrice: 0.50 });
    expect(row.most_expensive_paid).toEqual({ provider: 'Fireworks', blendedPrice: 2.00 });
  });

  it('multi-offer paid model: spread_usd is most-expensive minus cheapest', () => {
    const m = makeModel({
      modelId: 'spread',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 1.00, inputPrice: 0.5, outputPrice: 1.5 }),
        makeOffer({ provider: 'B', blendedPrice: 3.00, inputPrice: 1.0, outputPrice: 5.0 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.spread_usd).toBe(2.00);
  });

  it('savings_pct = 50.00 when spread is half of most-expensive ($1.50 spread, $3.00 ceiling)', () => {
    const m = makeModel({
      modelId: 'savings',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 1.50, inputPrice: 0.75, outputPrice: 2.25 }),
        makeOffer({ provider: 'B', blendedPrice: 3.00, inputPrice: 1.5, outputPrice: 4.5 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.savings_pct).toBe(50.00);
  });

  it('savings_pct rounds to 2 decimal places', () => {
    // spread 1, ceiling 3 → 33.3333... → rounded to 33.33
    const m = makeModel({
      modelId: 'rounding',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 2.00, inputPrice: 1, outputPrice: 3 }),
        makeOffer({ provider: 'B', blendedPrice: 3.00, inputPrice: 1.5, outputPrice: 4.5 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.savings_pct).toBe(33.33);
  });

  it('free-tier offers (input=0 AND output=0) excluded from paid stats', () => {
    const m = makeModel({
      modelId: 'free-mix',
      offers: [
        makeOffer({
          provider: 'GitHub Models',
          inputPrice: 0,
          outputPrice: 0,
          blendedPrice: 0,
          url: 'https://github.example/free',
          note: 'rate-limited',
        }),
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 }),
        makeOffer({ provider: 'Together AI', blendedPrice: 1.00, inputPrice: 0.5, outputPrice: 1.5 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.offer_count_paid).toBe(2);
    expect(row.cheapest_paid).toEqual({ provider: 'DeepInfra', blendedPrice: 0.50 });
    expect(row.most_expensive_paid).toEqual({ provider: 'Together AI', blendedPrice: 1.00 });
  });

  it('free-tier offers surface in free_tier_offers array with provider/url/note', () => {
    const m = makeModel({
      modelId: 'free-shape',
      offers: [
        makeOffer({
          provider: 'GitHub Models',
          inputPrice: 0,
          outputPrice: 0,
          blendedPrice: 0,
          url: 'https://github.example/free',
          note: 'rate-limited prototyping',
        }),
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.free_tier_offers).toEqual([
      {
        provider: 'GitHub Models',
        url: 'https://github.example/free',
        note: 'rate-limited prototyping',
      },
    ]);
  });

  it('only free-tier offers: all paid fields null, offer_count_paid=0', () => {
    const m = makeModel({
      modelId: 'only-free',
      offers: [
        makeOffer({ provider: 'GitHub Models', inputPrice: 0, outputPrice: 0, blendedPrice: 0 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.offer_count_paid).toBe(0);
    expect(row.cheapest_paid).toBeNull();
    expect(row.most_expensive_paid).toBeNull();
    expect(row.spread_usd).toBeNull();
    expect(row.savings_pct).toBeNull();
    expect(row.median_paid_blended).toBeNull();
    expect(row.free_tier_offers.length).toBe(1);
  });

  it('median with 3 paid offers picks the middle value', () => {
    const m = makeModel({
      modelId: 'med3',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 0.20, inputPrice: 0.1, outputPrice: 0.3 }),
        makeOffer({ provider: 'B', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 }),
        makeOffer({ provider: 'C', blendedPrice: 0.90, inputPrice: 0.45, outputPrice: 1.35 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.median_paid_blended).toBe(0.50);
  });

  it('median with 4 paid offers averages the middle two', () => {
    const m = makeModel({
      modelId: 'med4',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 0.20, inputPrice: 0.1, outputPrice: 0.3 }),
        makeOffer({ provider: 'B', blendedPrice: 0.40, inputPrice: 0.2, outputPrice: 0.6 }),
        makeOffer({ provider: 'C', blendedPrice: 0.60, inputPrice: 0.3, outputPrice: 0.9 }),
        makeOffer({ provider: 'D', blendedPrice: 1.00, inputPrice: 0.5, outputPrice: 1.5 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.median_paid_blended).toBe(0.50); // (0.4 + 0.6) / 2
  });

  it('fastest_tps picks the highest outputTPS among paid offers', () => {
    const m = makeModel({
      modelId: 'tps',
      offers: [
        makeOffer({ provider: 'Together AI', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75, outputTPS: 100 }),
        makeOffer({ provider: 'Groq', blendedPrice: 0.80, inputPrice: 0.4, outputPrice: 1.2, outputTPS: 500 }),
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.40, inputPrice: 0.2, outputPrice: 0.6, outputTPS: 200 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.fastest_tps).toEqual({ provider: 'Groq', outputTPS: 500 });
  });

  it('fastest_tps is null when no paid offer reports a TPS value', () => {
    const m = makeModel({
      modelId: 'no-tps',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75, outputTPS: null }),
        makeOffer({ provider: 'B', blendedPrice: 0.80, inputPrice: 0.4, outputPrice: 1.2, outputTPS: null }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.fastest_tps).toBeNull();
  });

  it('cheapest_with_tps prefers cheapest offer that also reports TPS', () => {
    // Global cheapest has null TPS; second-cheapest reports TPS.
    const m = makeModel({
      modelId: 'cheap-tps',
      offers: [
        makeOffer({ provider: 'OpenRouter', blendedPrice: 0.30, inputPrice: 0.15, outputPrice: 0.45, outputTPS: null }),
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.40, inputPrice: 0.2, outputPrice: 0.6, outputTPS: 150 }),
        makeOffer({ provider: 'Groq', blendedPrice: 0.80, inputPrice: 0.4, outputPrice: 1.2, outputTPS: 500 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.cheapest_paid?.provider).toBe('OpenRouter');
    expect(row.cheapest_with_tps).toEqual({
      provider: 'DeepInfra',
      blendedPrice: 0.40,
      outputTPS: 150,
    });
  });

  it('cheapest_with_tps equals global cheapest when global cheapest reports TPS', () => {
    const m = makeModel({
      modelId: 'cheap-tps-match',
      offers: [
        makeOffer({ provider: 'DeepInfra', blendedPrice: 0.40, inputPrice: 0.2, outputPrice: 0.6, outputTPS: 150 }),
        makeOffer({ provider: 'Groq', blendedPrice: 0.80, inputPrice: 0.4, outputPrice: 1.2, outputTPS: 500 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.cheapest_with_tps).toEqual({
      provider: 'DeepInfra',
      blendedPrice: 0.40,
      outputTPS: 150,
    });
  });

  it('cheapest_with_tps null when no paid offer reports TPS', () => {
    const m = makeModel({
      modelId: 'no-cheap-tps',
      offers: [
        makeOffer({ provider: 'A', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75, outputTPS: null }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.cheapest_with_tps).toBeNull();
  });

  it('preserves model metadata: modelId, modelName, family, paramsB', () => {
    const m = makeModel({
      modelId: 'meta-id',
      modelName: 'Meta Display',
      family: 'TestFam',
      paramsB: 123,
      offers: [makeOffer({ provider: 'A', blendedPrice: 1.0, inputPrice: 0.5, outputPrice: 1.5 })],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.modelId).toBe('meta-id');
    expect(row.modelName).toBe('Meta Display');
    expect(row.family).toBe('TestFam');
    expect(row.paramsB).toBe(123);
  });

  it('defensive: when most-expensive blendedPrice is 0 (paid math degenerate), savings_pct stays null', () => {
    // A paid offer with blendedPrice 0 but non-zero per-direction prices: input non-zero, output zero, blended 0.
    // This shouldn't occur in real data but exercise the defensive branch.
    const m = makeModel({
      modelId: 'zero-ceiling',
      offers: [
        makeOffer({ provider: 'A', inputPrice: 0.1, outputPrice: 0, blendedPrice: 0 }),
      ],
    });
    const row = buildModelArbitrageRow(m);
    expect(row.cheapest_paid?.blendedPrice).toBe(0);
    expect(row.most_expensive_paid?.blendedPrice).toBe(0);
    expect(row.savings_pct).toBeNull();
  });
});

// ── buildProviderRollups ───────────────────────────────────────────

describe('buildProviderRollups', () => {
  it('returns one entry per TRACKED_PROVIDERS member', () => {
    const rollups = buildProviderRollups([]);
    expect(rollups.length).toBe(TRACKED_PROVIDERS.length);
    const providers = new Set(rollups.map((r) => r.provider));
    for (const p of TRACKED_PROVIDERS) {
      expect(providers.has(p)).toBe(true);
    }
  });

  it('includes unused tracked providers with zero cheapest/top_tps/free counts', () => {
    // Empty rows means no provider is cheapest or top_tps from rows.
    const rollups = buildProviderRollups([]);
    for (const r of rollups) {
      expect(r.cheapest_count).toBe(0);
      expect(r.top_tps_count).toBe(0);
      expect(r.free_tier_count).toBe(0);
    }
  });

  it('cheapest_count counts rows where this provider is cheapest_paid', () => {
    const rows: ModelArbitrageRow[] = [
      {
        modelId: 'm1',
        modelName: 'm1',
        family: 'F',
        paramsB: null,
        offer_count_paid: 2,
        free_tier_offers: [],
        cheapest_paid: { provider: 'DeepInfra', blendedPrice: 0.20 },
        most_expensive_paid: { provider: 'Together AI', blendedPrice: 0.50 },
        median_paid_blended: 0.35,
        spread_usd: 0.30,
        savings_pct: 60.00,
        fastest_tps: null,
        cheapest_with_tps: null,
      },
      {
        modelId: 'm2',
        modelName: 'm2',
        family: 'F',
        paramsB: null,
        offer_count_paid: 2,
        free_tier_offers: [],
        cheapest_paid: { provider: 'DeepInfra', blendedPrice: 0.15 },
        most_expensive_paid: { provider: 'Fireworks', blendedPrice: 0.60 },
        median_paid_blended: 0.375,
        spread_usd: 0.45,
        savings_pct: 75.00,
        fastest_tps: null,
        cheapest_with_tps: null,
      },
    ];
    const rollups = buildProviderRollups(rows);
    const deepInfra = rollups.find((r) => r.provider === 'DeepInfra');
    expect(deepInfra?.cheapest_count).toBe(2);
    const together = rollups.find((r) => r.provider === 'Together AI');
    expect(together?.cheapest_count).toBe(0);
  });

  it('top_tps_count counts rows where this provider is fastest_tps', () => {
    const rows: ModelArbitrageRow[] = [
      {
        modelId: 'm1',
        modelName: 'm1',
        family: 'F',
        paramsB: null,
        offer_count_paid: 1,
        free_tier_offers: [],
        cheapest_paid: null,
        most_expensive_paid: null,
        median_paid_blended: null,
        spread_usd: null,
        savings_pct: null,
        fastest_tps: { provider: 'Groq', outputTPS: 800 },
        cheapest_with_tps: null,
      },
      {
        modelId: 'm2',
        modelName: 'm2',
        family: 'F',
        paramsB: null,
        offer_count_paid: 1,
        free_tier_offers: [],
        cheapest_paid: null,
        most_expensive_paid: null,
        median_paid_blended: null,
        spread_usd: null,
        savings_pct: null,
        fastest_tps: { provider: 'Groq', outputTPS: 500 },
        cheapest_with_tps: null,
      },
    ];
    const rollups = buildProviderRollups(rows);
    const groq = rollups.find((r) => r.provider === 'Groq');
    expect(groq?.top_tps_count).toBe(2);
  });

  it('free_tier_count counts free_tier_offers from each provider across rows', () => {
    const rows: ModelArbitrageRow[] = [
      {
        modelId: 'm1',
        modelName: 'm1',
        family: 'F',
        paramsB: null,
        offer_count_paid: 0,
        free_tier_offers: [
          { provider: 'GitHub Models', url: 'https://x', note: '' },
        ],
        cheapest_paid: null,
        most_expensive_paid: null,
        median_paid_blended: null,
        spread_usd: null,
        savings_pct: null,
        fastest_tps: null,
        cheapest_with_tps: null,
      },
      {
        modelId: 'm2',
        modelName: 'm2',
        family: 'F',
        paramsB: null,
        offer_count_paid: 0,
        free_tier_offers: [
          { provider: 'GitHub Models', url: 'https://x', note: '' },
        ],
        cheapest_paid: null,
        most_expensive_paid: null,
        median_paid_blended: null,
        spread_usd: null,
        savings_pct: null,
        fastest_tps: null,
        cheapest_with_tps: null,
      },
    ];
    const rollups = buildProviderRollups(rows);
    const github = rollups.find((r) => r.provider === 'GitHub Models');
    expect(github?.free_tier_count).toBe(2);
  });

  it('value_score: top raw normalizes to 100, others scale proportionally', () => {
    // A is cheapest twice (raw 2), B is top_tps once (raw 0.5). Max raw = 2.
    // A → 100. B → 25.
    const rows: ModelArbitrageRow[] = [
      {
        modelId: 'm1',
        modelName: 'm1',
        family: 'F',
        paramsB: null,
        offer_count_paid: 1,
        free_tier_offers: [],
        cheapest_paid: { provider: 'DeepInfra', blendedPrice: 0.20 },
        most_expensive_paid: { provider: 'DeepInfra', blendedPrice: 0.20 },
        median_paid_blended: 0.20,
        spread_usd: 0,
        savings_pct: 0,
        fastest_tps: { provider: 'Groq', outputTPS: 500 },
        cheapest_with_tps: null,
      },
      {
        modelId: 'm2',
        modelName: 'm2',
        family: 'F',
        paramsB: null,
        offer_count_paid: 1,
        free_tier_offers: [],
        cheapest_paid: { provider: 'DeepInfra', blendedPrice: 0.15 },
        most_expensive_paid: { provider: 'DeepInfra', blendedPrice: 0.15 },
        median_paid_blended: 0.15,
        spread_usd: 0,
        savings_pct: 0,
        fastest_tps: null,
        cheapest_with_tps: null,
      },
    ];
    const rollups = buildProviderRollups(rows);
    const di = rollups.find((r) => r.provider === 'DeepInfra');
    const groq = rollups.find((r) => r.provider === 'Groq');
    expect(di?.value_score).toBe(100);
    expect(groq?.value_score).toBe(25);
  });

  it('all providers get value_score 0 when maxRaw is 0 (no cheapest or top_tps signals)', () => {
    const rollups = buildProviderRollups([]);
    for (const r of rollups) {
      expect(r.value_score).toBe(0);
    }
  });

  it('sorted by value_score desc, then appearances_paid desc, then provider name asc', () => {
    const rollups = buildProviderRollups([]);
    // All zero value_score; tie-broken first by appearances_paid desc (from real INFERENCE_MATRIX), then name asc.
    for (let i = 1; i < rollups.length; i++) {
      const prev = rollups[i - 1];
      const cur = rollups[i];
      if (prev.value_score === cur.value_score) {
        if (prev.appearances_paid === cur.appearances_paid) {
          expect(prev.provider.localeCompare(cur.provider)).toBeLessThanOrEqual(0);
        } else {
          expect(prev.appearances_paid).toBeGreaterThanOrEqual(cur.appearances_paid);
        }
      } else {
        expect(prev.value_score).toBeGreaterThan(cur.value_score);
      }
    }
  });

  it('appearances_paid is sourced from import-time INFERENCE_MATRIX, not the rows arg', () => {
    // Pass empty rows; tracked providers that have paid offers in the real
    // matrix should still surface a positive appearances_paid count.
    const rollups = buildProviderRollups([]);
    const together = rollups.find((r) => r.provider === 'Together AI');
    expect(together?.appearances_paid).toBeGreaterThan(0);
  });

  it('every rollup entry carries the documented numeric fields', () => {
    const rollups = buildProviderRollups([]);
    for (const r of rollups) {
      expect(typeof r.appearances_paid).toBe('number');
      expect(typeof r.cheapest_count).toBe('number');
      expect(typeof r.top_tps_count).toBe('number');
      expect(typeof r.free_tier_count).toBe('number');
      expect(typeof r.value_score).toBe('number');
      expect(r.value_score).toBeGreaterThanOrEqual(0);
      expect(r.value_score).toBeLessThanOrEqual(100);
    }
  });
});

// ── buildArbitrage ─────────────────────────────────────────────────

describe('buildArbitrage', () => {
  it('returns ok=true', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
  });

  it('echoes capturedAt as ISO string of now', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(r.capturedAt).toBe(REFERENCE_NOW.toISOString());
  });

  it('echoes filter back in the response', () => {
    const r = buildArbitrage({ family: 'Meta', min_savings_pct: 35 }, REFERENCE_NOW);
    expect(r.filter).toEqual({ family: 'Meta', min_savings_pct: 35 });
  });

  it('null family filter returns all models in the matrix', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r.models.length).toBe(INFERENCE_MATRIX.length);
  });

  it('family filter "Meta" returns only Meta-family models', () => {
    const r = buildArbitrage({ family: 'Meta', min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r.models.length).toBeGreaterThan(0);
    expect(r.models.every((m) => m.family === 'Meta')).toBe(true);
  });

  it('family filter is case-insensitive substring match', () => {
    const r1 = buildArbitrage({ family: 'Meta', min_savings_pct: 0 }, REFERENCE_NOW);
    const r2 = buildArbitrage({ family: 'META', min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r2.models.length).toBe(r1.models.length);
    expect(r2.models.every((m) => m.family === 'Meta')).toBe(true);
  });

  it('top_arbitrage includes only models with savings_pct >= min_savings_pct', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 50 }, REFERENCE_NOW);
    for (const row of r.top_arbitrage) {
      expect(row.savings_pct).not.toBeNull();
      expect(row.savings_pct as number).toBeGreaterThanOrEqual(50);
    }
  });

  it('top_arbitrage sorted by savings_pct descending', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW);
    for (let i = 1; i < r.top_arbitrage.length; i++) {
      const prev = r.top_arbitrage[i - 1].savings_pct ?? 0;
      const cur = r.top_arbitrage[i].savings_pct ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it('min_savings_pct=0 includes all rows with non-null savings_pct', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW);
    const expectedCount = r.models.filter((m) => m.savings_pct !== null).length;
    expect(r.top_arbitrage.length).toBe(expectedCount);
  });

  it('min_savings_pct=100 returns empty top_arbitrage (no row reaches 100%)', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 100 }, REFERENCE_NOW);
    expect(r.top_arbitrage).toEqual([]);
  });

  it('tracked_providers list returned in response', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(r.tracked_providers).toEqual([...TRACKED_PROVIDERS]);
  });

  it('models_in_matrix equals the number of rows in models', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r.models_in_matrix).toBe(r.models.length);
  });

  it('matrixOverride is honored: synthetic matrix drives models_in_matrix', () => {
    const synth: ModelMatrix[] = [
      makeModel({
        modelId: 'synth-1',
        offers: [
          makeOffer({ provider: 'A', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 }),
          makeOffer({ provider: 'B', blendedPrice: 1.00, inputPrice: 0.5, outputPrice: 1.5 }),
        ],
      }),
      makeModel({
        modelId: 'synth-2',
        offers: [
          makeOffer({ provider: 'A', blendedPrice: 0.30, inputPrice: 0.15, outputPrice: 0.45 }),
        ],
      }),
    ];
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW, synth);
    expect(r.models_in_matrix).toBe(2);
    expect(r.models.map((m) => m.modelId)).toEqual(['synth-1', 'synth-2']);
  });

  it('lastUpdatedOverride is honored when provided', () => {
    const r = buildArbitrage(
      { family: null, min_savings_pct: 20 },
      REFERENCE_NOW,
      undefined,
      '2026-12-31',
    );
    expect(r.matrix_last_updated).toBe('2026-12-31');
  });

  it('matrix_last_updated empty when matrixOverride supplied without lastUpdatedOverride', () => {
    const synth: ModelMatrix[] = [
      makeModel({
        modelId: 'x',
        offers: [makeOffer({ provider: 'A', blendedPrice: 0.50, inputPrice: 0.25, outputPrice: 0.75 })],
      }),
    ];
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW, synth);
    expect(r.matrix_last_updated).toBe('');
  });

  it('attribution.source is a non-empty string', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(typeof r.attribution.source).toBe('string');
    expect(r.attribution.source.length).toBeGreaterThan(0);
  });

  it('attribution.license is a non-empty string', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(typeof r.attribution.license).toBe('string');
    expect(r.attribution.license.length).toBeGreaterThan(0);
  });

  it('attribution.notes mentions free-tier handling', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    expect(r.attribution.notes.toLowerCase()).toContain('free');
  });

  it('provider_rollup is present and contains every tracked provider', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 20 }, REFERENCE_NOW);
    const providers = new Set(r.provider_rollup.map((p) => p.provider));
    for (const p of TRACKED_PROVIDERS) {
      expect(providers.has(p)).toBe(true);
    }
  });

  it('real-registry smoke check: models_in_matrix > 0 and every row has a non-empty modelId', () => {
    const r = buildArbitrage({ family: null, min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r.models_in_matrix).toBeGreaterThan(0);
    for (const row of r.models) {
      expect(typeof row.modelId).toBe('string');
      expect(row.modelId.length).toBeGreaterThan(0);
    }
  });

  it('family filter that matches nothing returns empty models and top_arbitrage', () => {
    const r = buildArbitrage({ family: 'nonexistent-family-xyz', min_savings_pct: 0 }, REFERENCE_NOW);
    expect(r.models).toEqual([]);
    expect(r.top_arbitrage).toEqual([]);
    expect(r.models_in_matrix).toBe(0);
  });
});
