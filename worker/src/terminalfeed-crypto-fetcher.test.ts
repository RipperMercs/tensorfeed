import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  inCohort,
  normalizeMover,
  normalizeFunding,
  detectPartialCryptoSources,
  buildCryptoSnapshot,
} from './terminalfeed-crypto-fetcher';
import type {
  CryptoMoverEntry,
  FundingEntry,
  AiCryptoSnapshot,
  MoversFetchResult,
  FundingFetchResult,
} from './terminalfeed-crypto-fetcher';

// ── test fixtures (partial-fetch handling) ─────────────────────────

function moverFixture(symbol: string): CryptoMoverEntry {
  return {
    symbol,
    display_name: symbol,
    thesis: 'test',
    upstream_name: symbol,
    price_usd: 100,
    change_24h_percent: 2,
    market_cap: 1_000_000,
  };
}

function fundingFixture(symbol: string): FundingEntry {
  return {
    symbol,
    display_name: symbol,
    thesis: 'test',
    venue: 'dYdX',
    upstream_symbol: `${symbol}-PERP`,
    period_hours: 8,
    period_rate: 0.0001,
    annualized_pct: 5,
    mark_price: 100,
  };
}

function moversResult(cohort: CryptoMoverEntry[], total: number): MoversFetchResult {
  return { cohort, total };
}

function fundingResult(cohort: FundingEntry[], total: number, failed_venues: string[] = []): FundingFetchResult {
  return { cohort, total, failed_venues };
}

function fullCachedCryptoSnapshot(): AiCryptoSnapshot {
  return {
    capturedAt: '2026-05-30T00:00:00.000Z',
    source: 'terminalfeed.io',
    upstream_endpoints: { movers: 'm', funding: 'f' },
    source_license:
      "Federation cross-call to TerminalFeed (free public endpoints). Upstream crypto market data carries the upstream provider's own terms.",
    movers_cohort_size: 1,
    movers_total_upstream: 50,
    funding_cohort_size: 1,
    funding_total_upstream: 30,
    failed_venues: ['Bybit'],
    movers: [moverFixture('TAO')],
    funding: [fundingFixture('FET')],
  };
}

// ── normalizeSymbol ────────────────────────────────────────────────

describe('normalizeSymbol', () => {
  it('returns empty string on empty input', () => {
    expect(normalizeSymbol('')).toBe('');
  });

  it('passes through a bare cohort symbol', () => {
    expect(normalizeSymbol('TAO')).toBe('TAO');
  });

  it('uppercases lowercase input', () => {
    expect(normalizeSymbol('tao')).toBe('TAO');
  });

  it('strips trailing USDT', () => {
    expect(normalizeSymbol('TAOUSDT')).toBe('TAO');
  });

  it('strips trailing -USDT with separator', () => {
    expect(normalizeSymbol('TAO-USDT')).toBe('TAO');
  });

  it('strips trailing /USDC with slash separator', () => {
    expect(normalizeSymbol('TAO/USDC')).toBe('TAO');
  });

  it('strips trailing -PERP suffix', () => {
    expect(normalizeSymbol('TAO-PERP')).toBe('TAO');
  });

  it('strips both PERP and stable-pair suffixes in order', () => {
    expect(normalizeSymbol('TAOUSDT-PERP')).toBe('TAO');
  });

  it('passes through BTC unchanged (no perp/stable suffix)', () => {
    expect(normalizeSymbol('BTC')).toBe('BTC');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeSymbol('  WLD  ')).toBe('WLD');
  });

  it('strips _USDC underscore separator', () => {
    expect(normalizeSymbol('FET_USDC')).toBe('FET');
  });

  it('strips SWAP suffix', () => {
    expect(normalizeSymbol('FET-SWAP')).toBe('FET');
  });

  it('strips trailing BUSD', () => {
    expect(normalizeSymbol('RNDRBUSD')).toBe('RNDR');
  });

  it('strips trailing DAI', () => {
    expect(normalizeSymbol('AKT-DAI')).toBe('AKT');
  });
});

// ── inCohort ───────────────────────────────────────────────────────

describe('inCohort', () => {
  const COHORT = [
    'TAO', 'FET', 'RNDR', 'AKT', 'AGIX', 'WLD', 'IO',
    'ARKM', 'OCEAN', 'GRT', 'VIRTUAL', 'AI16Z', 'NMR', 'TURBO',
  ];

  it('returns true for every curated AI-thesis cohort symbol', () => {
    for (const sym of COHORT) {
      expect(inCohort(sym)).toBe(true);
    }
  });

  it('returns false for BTC', () => {
    expect(inCohort('BTC')).toBe(false);
  });

  it('returns false for ETH', () => {
    expect(inCohort('ETH')).toBe(false);
  });

  it('returns false for SOL', () => {
    expect(inCohort('SOL')).toBe(false);
  });

  it('returns false for DOGE', () => {
    expect(inCohort('DOGE')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(inCohort('')).toBe(false);
  });

  it('is case-sensitive: lowercase tao is false (normalization happens upstream)', () => {
    expect(inCohort('tao')).toBe(false);
  });
});

// ── normalizeMover ─────────────────────────────────────────────────

describe('normalizeMover', () => {
  it('returns null when symbol is missing', () => {
    expect(normalizeMover({ name: 'Bittensor' })).toBeNull();
  });

  it('returns null when symbol is non-cohort (BTC)', () => {
    expect(
      normalizeMover({ symbol: 'BTC', name: 'Bitcoin', price_usd: 50000, change_24h_percent: 1, market_cap: 1e12 }),
    ).toBeNull();
  });

  it('returns populated entry for an AI-thesis symbol with full numeric fields', () => {
    const r = normalizeMover({
      symbol: 'TAO',
      name: 'Bittensor',
      price_usd: 420.5,
      change_24h_percent: 3.2,
      market_cap: 3_500_000_000,
    });
    expect(r).not.toBeNull();
    expect(r!.symbol).toBe('TAO');
    expect(r!.display_name).toBe('Bittensor');
    expect(r!.thesis).toBe('decentralized ML training network');
    expect(r!.upstream_name).toBe('Bittensor');
    expect(r!.price_usd).toBe(420.5);
    expect(r!.change_24h_percent).toBe(3.2);
    expect(r!.market_cap).toBe(3_500_000_000);
  });

  it('strips perp suffix and emits cohort-normalized symbol', () => {
    const r = normalizeMover({
      symbol: 'FETUSDT',
      name: 'Fetch.ai',
      price_usd: 1.2,
      change_24h_percent: -0.5,
      market_cap: 800_000_000,
    });
    expect(r).not.toBeNull();
    expect(r!.symbol).toBe('FET');
    expect(r!.display_name).toBe('Fetch.ai');
    expect(r!.thesis).toBe('autonomous agent economy');
  });

  it('defaults missing price_usd to 0', () => {
    const r = normalizeMover({ symbol: 'TAO', name: 'Bittensor', change_24h_percent: 1, market_cap: 1 });
    expect(r!.price_usd).toBe(0);
  });

  it('defaults missing change_24h_percent to 0', () => {
    const r = normalizeMover({ symbol: 'TAO', name: 'Bittensor', price_usd: 100, market_cap: 1 });
    expect(r!.change_24h_percent).toBe(0);
  });

  it('defaults missing market_cap to 0', () => {
    const r = normalizeMover({ symbol: 'TAO', name: 'Bittensor', price_usd: 100, change_24h_percent: 1 });
    expect(r!.market_cap).toBe(0);
  });

  it('preserves upstream_name when present', () => {
    const r = normalizeMover({ symbol: 'TAO', name: 'Bittensor (Custom)' });
    expect(r!.upstream_name).toBe('Bittensor (Custom)');
  });

  it('falls back to display_name when upstream name missing', () => {
    const r = normalizeMover({ symbol: 'TAO' });
    expect(r!.upstream_name).toBe('Bittensor');
  });
});

// ── normalizeFunding ───────────────────────────────────────────────

describe('normalizeFunding', () => {
  it('returns null when symbol is missing', () => {
    expect(normalizeFunding({ venue: 'dYdX' })).toBeNull();
  });

  it('returns null when symbol is non-cohort (BTC)', () => {
    expect(
      normalizeFunding({
        venue: 'Binance',
        symbol: 'BTCUSDT',
        periodHours: 8,
        periodRate: 0.0001,
        annualizedPct: 11,
        markPrice: 50000,
      }),
    ).toBeNull();
  });

  it('returns populated entry on happy path with full fields', () => {
    const r = normalizeFunding({
      venue: 'Hyperliquid',
      symbol: 'TAO-PERP',
      periodHours: 1,
      periodRate: 0.0001,
      annualizedPct: 8.76,
      markPrice: 420.5,
    });
    expect(r).not.toBeNull();
    expect(r!.symbol).toBe('TAO');
    expect(r!.display_name).toBe('Bittensor');
    expect(r!.thesis).toBe('decentralized ML training network');
    expect(r!.venue).toBe('Hyperliquid');
    expect(r!.period_hours).toBe(1);
    expect(r!.period_rate).toBe(0.0001);
    expect(r!.annualized_pct).toBe(8.76);
    expect(r!.mark_price).toBe(420.5);
  });

  it('defaults missing period_hours to 8', () => {
    const r = normalizeFunding({
      venue: 'dYdX',
      symbol: 'FET',
      periodRate: 0.0001,
      annualizedPct: 10,
      markPrice: 1.2,
    });
    expect(r!.period_hours).toBe(8);
  });

  it('defaults missing period_rate to 0', () => {
    const r = normalizeFunding({
      venue: 'dYdX',
      symbol: 'FET',
      periodHours: 8,
      annualizedPct: 10,
      markPrice: 1.2,
    });
    expect(r!.period_rate).toBe(0);
  });

  it('defaults missing annualized_pct to 0', () => {
    const r = normalizeFunding({
      venue: 'dYdX',
      symbol: 'FET',
      periodHours: 8,
      periodRate: 0.0001,
      markPrice: 1.2,
    });
    expect(r!.annualized_pct).toBe(0);
  });

  it('defaults missing mark_price to 0', () => {
    const r = normalizeFunding({
      venue: 'dYdX',
      symbol: 'FET',
      periodHours: 8,
      periodRate: 0.0001,
      annualizedPct: 10,
    });
    expect(r!.mark_price).toBe(0);
  });

  it('preserves upstream_symbol as-is (original, not normalized)', () => {
    const r = normalizeFunding({
      venue: 'Binance',
      symbol: 'TAOUSDT-PERP',
      periodHours: 8,
      periodRate: 0.0001,
      annualizedPct: 5,
      markPrice: 420.5,
    });
    expect(r!.symbol).toBe('TAO');
    expect(r!.upstream_symbol).toBe('TAOUSDT-PERP');
  });

  it('defaults missing venue to empty string', () => {
    const r = normalizeFunding({
      symbol: 'TAO',
      periodHours: 8,
      periodRate: 0.0001,
      annualizedPct: 5,
      markPrice: 420.5,
    });
    expect(r!.venue).toBe('');
  });
});

// ── detectPartialCryptoSources (audit 2026-05-31 #13/#14) ───────────

describe('detectPartialCryptoSources', () => {
  it('returns [] when both upstreams have rows', () => {
    expect(
      detectPartialCryptoSources(moversResult([moverFixture('TAO')], 50), fundingResult([fundingFixture('FET')], 30)),
    ).toEqual([]);
  });

  it('returns [] when both upstreams are empty (full outage, not partial)', () => {
    expect(detectPartialCryptoSources(moversResult([], 0), fundingResult([], 0))).toEqual([]);
  });

  it('flags funding when only funding upstream is empty', () => {
    expect(detectPartialCryptoSources(moversResult([moverFixture('TAO')], 50), fundingResult([], 0))).toEqual([
      'funding',
    ]);
  });

  it('flags movers when only movers upstream is empty', () => {
    expect(detectPartialCryptoSources(moversResult([], 0), fundingResult([fundingFixture('FET')], 30))).toEqual([
      'movers',
    ]);
  });

  it('treats a non-empty upstream with zero cohort hits as present (total drives detection)', () => {
    // movers upstream returned 50 rows but none in cohort: NOT a source outage.
    expect(detectPartialCryptoSources(moversResult([], 50), fundingResult([fundingFixture('FET')], 30))).toEqual([]);
  });
});

// ── buildCryptoSnapshot (audit 2026-05-31 #13/#14) ──────────────────

describe('buildCryptoSnapshot', () => {
  const FIXED = new Date('2026-05-31T12:00:00.000Z');

  it('is not degraded when both upstreams have rows', () => {
    const snap = buildCryptoSnapshot(
      moversResult([moverFixture('TAO')], 50),
      fundingResult([fundingFixture('FET')], 30),
      null,
      FIXED,
    );
    expect(snap.degraded).toBeUndefined();
    expect(snap.partial_sources).toBeUndefined();
    expect(snap.movers_cohort_size).toBe(1);
    expect(snap.funding_cohort_size).toBe(1);
  });

  it('flags degraded + partial_sources when funding empty at cold start (no cache)', () => {
    const snap = buildCryptoSnapshot(moversResult([moverFixture('TAO')], 50), fundingResult([], 0), null, FIXED);
    expect(snap.degraded).toBe(true);
    expect(snap.partial_sources).toEqual(['funding']);
    expect(snap.funding_cohort_size).toBe(0);
  });

  it('preserves last-known-good funding on a partial funding poll (does NOT overwrite)', () => {
    const cached = fullCachedCryptoSnapshot();
    const snap = buildCryptoSnapshot(moversResult([moverFixture('NMR')], 60), fundingResult([], 0), cached, FIXED);
    // funding back-filled from cache
    expect(snap.funding).toEqual(cached.funding);
    expect(snap.funding_cohort_size).toBe(1);
    expect(snap.funding_total_upstream).toBe(30);
    expect(snap.failed_venues).toEqual(['Bybit']);
    // movers is the fresh poll
    expect(snap.movers[0].symbol).toBe('NMR');
    // marked degraded
    expect(snap.degraded).toBe(true);
    expect(snap.partial_sources).toEqual(['funding']);
  });

  it('preserves last-known-good movers on a partial movers poll', () => {
    const cached = fullCachedCryptoSnapshot();
    const snap = buildCryptoSnapshot(moversResult([], 0), fundingResult([fundingFixture('GRT')], 40), cached, FIXED);
    expect(snap.movers).toEqual(cached.movers);
    expect(snap.movers_cohort_size).toBe(1);
    expect(snap.movers_total_upstream).toBe(50);
    expect(snap.funding[0].symbol).toBe('GRT');
    expect(snap.degraded).toBe(true);
    expect(snap.partial_sources).toEqual(['movers']);
  });

  it('stamps capturedAt from the injected now', () => {
    const snap = buildCryptoSnapshot(
      moversResult([moverFixture('TAO')], 50),
      fundingResult([fundingFixture('FET')], 30),
      null,
      FIXED,
    );
    expect(snap.capturedAt).toBe('2026-05-31T12:00:00.000Z');
  });
});
