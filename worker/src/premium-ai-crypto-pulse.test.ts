import { describe, it, expect } from 'vitest';
import {
  parseToken,
  parseSetup,
  parseMinAbsChangePct,
  classifySetup,
  buildPulseRow,
  buildPulse,
} from './premium-ai-crypto-pulse';
import type {
  AiCryptoSnapshot,
  CryptoMoverEntry,
  FundingEntry,
} from './terminalfeed-crypto-fetcher';

// ── factories ──────────────────────────────────────────────────────

function makeMover(partial: Partial<CryptoMoverEntry> & { symbol: string }): CryptoMoverEntry {
  return {
    symbol: partial.symbol,
    display_name: partial.display_name ?? partial.symbol,
    thesis: partial.thesis ?? '',
    upstream_name: partial.upstream_name ?? partial.display_name ?? partial.symbol,
    price_usd: partial.price_usd ?? 0,
    change_24h_percent: partial.change_24h_percent ?? 0,
    market_cap: partial.market_cap ?? 0,
  };
}

function makeFunding(partial: Partial<FundingEntry> & { symbol: string; venue: string }): FundingEntry {
  return {
    symbol: partial.symbol,
    display_name: partial.display_name ?? partial.symbol,
    thesis: partial.thesis ?? '',
    venue: partial.venue,
    upstream_symbol: partial.upstream_symbol ?? partial.symbol,
    period_hours: partial.period_hours ?? 8,
    period_rate: partial.period_rate ?? 0,
    annualized_pct: partial.annualized_pct ?? 0,
    mark_price: partial.mark_price ?? 0,
  };
}

function makeSnapshot(
  movers: CryptoMoverEntry[],
  funding: FundingEntry[],
  capturedAt = '2026-05-24T00:00:00.000Z',
): AiCryptoSnapshot {
  return {
    capturedAt,
    source: 'terminalfeed.io',
    upstream_endpoints: {
      movers: 'https://terminalfeed.io/api/crypto-movers',
      funding: 'https://terminalfeed.io/api/funding-rates',
    },
    source_license:
      "Federation cross-call to TerminalFeed (free public endpoints). Upstream crypto market data carries the upstream provider's own terms.",
    movers_cohort_size: movers.length,
    movers_total_upstream: movers.length,
    funding_cohort_size: funding.length,
    funding_total_upstream: funding.length,
    failed_venues: [],
    movers,
    funding,
  };
}

const DEFAULT_FILTER = {
  token: null,
  setup: null,
  min_abs_change_pct: 0,
};

// ── parseToken ─────────────────────────────────────────────────────

describe('parseToken', () => {
  it('returns null on null input', () => {
    expect(parseToken(null)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseToken('   ')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseToken('')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseToken('  TAO  ')).toBe('TAO');
  });
});

// ── parseSetup ─────────────────────────────────────────────────────

describe('parseSetup', () => {
  it('returns null on null input', () => {
    expect(parseSetup(null)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseSetup('   ')).toBeNull();
  });

  it('returns null on invalid kind', () => {
    expect(parseSetup('not-a-kind')).toBeNull();
  });

  it('accepts squeeze_up', () => {
    expect(parseSetup('squeeze_up')).toBe('squeeze_up');
  });

  it('accepts chase_up case-insensitively', () => {
    expect(parseSetup('CHASE_UP')).toBe('chase_up');
  });

  it('accepts squeeze_down', () => {
    expect(parseSetup('squeeze_down')).toBe('squeeze_down');
  });

  it('accepts chase_down', () => {
    expect(parseSetup('chase_down')).toBe('chase_down');
  });

  it('accepts coiled', () => {
    expect(parseSetup('coiled')).toBe('coiled');
  });

  it('accepts neutral', () => {
    expect(parseSetup('neutral')).toBe('neutral');
  });
});

// ── parseMinAbsChangePct ───────────────────────────────────────────

describe('parseMinAbsChangePct', () => {
  it('returns 0 on null', () => {
    expect(parseMinAbsChangePct(null)).toBe(0);
  });

  it('returns 0 on empty string', () => {
    expect(parseMinAbsChangePct('')).toBe(0);
  });

  it('returns 0 on non-numeric input', () => {
    expect(parseMinAbsChangePct('abc')).toBe(0);
  });

  it('parses floats', () => {
    expect(parseMinAbsChangePct('2.5')).toBe(2.5);
  });

  it('clamps negative values to 0', () => {
    expect(parseMinAbsChangePct('-5')).toBe(0);
  });

  it('clamps above 1000 to 1000', () => {
    expect(parseMinAbsChangePct('5000')).toBe(1000);
  });

  it('accepts boundary 0', () => {
    expect(parseMinAbsChangePct('0')).toBe(0);
  });

  it('accepts boundary 1000', () => {
    expect(parseMinAbsChangePct('1000')).toBe(1000);
  });
});

// ── classifySetup ──────────────────────────────────────────────────

describe('classifySetup', () => {
  it('returns neutral when funding is null', () => {
    expect(classifySetup(5, null)).toBe('neutral');
    expect(classifySetup(-5, null)).toBe('neutral');
    expect(classifySetup(0, null)).toBe('neutral');
  });

  it('rising + extremely negative funding -> squeeze_up', () => {
    expect(classifySetup(2, -25)).toBe('squeeze_up');
  });

  it('rising + elevated positive funding -> chase_up', () => {
    expect(classifySetup(2, 10)).toBe('chase_up');
  });

  it('falling + elevated positive funding -> squeeze_down', () => {
    expect(classifySetup(-2, 10)).toBe('squeeze_down');
  });

  it('falling + elevated negative funding -> chase_down', () => {
    expect(classifySetup(-2, -10)).toBe('chase_down');
  });

  it('flat + extreme positive funding -> coiled', () => {
    expect(classifySetup(0.5, 30)).toBe('coiled');
  });

  it('flat + extreme negative funding -> coiled', () => {
    expect(classifySetup(0.5, -30)).toBe('coiled');
  });

  it('flat + elevated (but not extreme) funding -> neutral', () => {
    expect(classifySetup(0.5, 10)).toBe('neutral');
  });

  it('rising + funding not elevated -> neutral', () => {
    expect(classifySetup(2, 2)).toBe('neutral');
  });

  it('boundary: change exactly +1.0 counts as rising (>=)', () => {
    expect(classifySetup(1.0, 10)).toBe('chase_up');
    expect(classifySetup(0.99, 10)).toBe('neutral');
  });

  it('boundary: change exactly -1.0 counts as falling (<=)', () => {
    expect(classifySetup(-1.0, 10)).toBe('squeeze_down');
  });

  it('boundary: funding +5 elevated, +4.99 not', () => {
    expect(classifySetup(2, 5)).toBe('chase_up');
    expect(classifySetup(2, 4.99)).toBe('neutral');
  });

  it('boundary: funding +20 extreme (coiled when flat)', () => {
    expect(classifySetup(0.5, 20)).toBe('coiled');
  });
});

// ── buildPulseRow ──────────────────────────────────────────────────

describe('buildPulseRow', () => {
  it('mover-only (no funding) -> zero venue count, null median/spread, neutral setup', () => {
    const m = makeMover({ symbol: 'TAO', display_name: 'Bittensor', thesis: 't', price_usd: 400, change_24h_percent: 2, market_cap: 1e9 });
    const r = buildPulseRow(m, []);
    expect(r.symbol).toBe('TAO');
    expect(r.display_name).toBe('Bittensor');
    expect(r.funding_venue_count).toBe(0);
    expect(r.funding_median_annualized_pct).toBeNull();
    expect(r.funding_venue_spread_pct).toBeNull();
    expect(r.funding_by_venue).toEqual([]);
    expect(r.setup).toBe('neutral');
  });

  it('funding-only (no mover) uses fallback symbol/meta and defaults price/change/marketcap', () => {
    const f = makeFunding({ symbol: 'TAO', venue: 'dYdX', annualized_pct: 10 });
    const r = buildPulseRow(null, [f], 'TAO', { display_name: 'Bittensor', thesis: 't' });
    expect(r.symbol).toBe('TAO');
    expect(r.display_name).toBe('Bittensor');
    expect(r.thesis).toBe('t');
    expect(r.price_usd).toBe(0);
    expect(r.change_24h_percent).toBe(0);
    expect(r.market_cap).toBe(0);
    expect(r.funding_venue_count).toBe(1);
  });

  it('single funding entry -> spread is null, median equals that value', () => {
    const f = makeFunding({ symbol: 'TAO', venue: 'dYdX', annualized_pct: 7.5 });
    const r = buildPulseRow(makeMover({ symbol: 'TAO' }), [f]);
    expect(r.funding_venue_spread_pct).toBeNull();
    expect(r.funding_median_annualized_pct).toBe(7.5);
  });

  it('3 fundings [4, 6, 8] -> median 6, spread 4', () => {
    const f1 = makeFunding({ symbol: 'TAO', venue: 'dYdX', annualized_pct: 4 });
    const f2 = makeFunding({ symbol: 'TAO', venue: 'Binance', annualized_pct: 6 });
    const f3 = makeFunding({ symbol: 'TAO', venue: 'Hyperliquid', annualized_pct: 8 });
    const r = buildPulseRow(makeMover({ symbol: 'TAO' }), [f1, f2, f3]);
    expect(r.funding_median_annualized_pct).toBe(6);
    expect(r.funding_venue_spread_pct).toBe(4);
  });

  it('4 fundings [2, 4, 6, 8] -> median 5 (avg of two middle)', () => {
    const f1 = makeFunding({ symbol: 'TAO', venue: 'a', annualized_pct: 2 });
    const f2 = makeFunding({ symbol: 'TAO', venue: 'b', annualized_pct: 4 });
    const f3 = makeFunding({ symbol: 'TAO', venue: 'c', annualized_pct: 6 });
    const f4 = makeFunding({ symbol: 'TAO', venue: 'd', annualized_pct: 8 });
    const r = buildPulseRow(makeMover({ symbol: 'TAO' }), [f1, f2, f3, f4]);
    expect(r.funding_median_annualized_pct).toBe(5);
  });

  it('funding_by_venue sorted by venue name asc', () => {
    const f1 = makeFunding({ symbol: 'TAO', venue: 'Zeta', annualized_pct: 1 });
    const f2 = makeFunding({ symbol: 'TAO', venue: 'Alpha', annualized_pct: 2 });
    const f3 = makeFunding({ symbol: 'TAO', venue: 'Mango', annualized_pct: 3 });
    const r = buildPulseRow(makeMover({ symbol: 'TAO' }), [f1, f2, f3]);
    expect(r.funding_by_venue.map((v) => v.venue)).toEqual(['Alpha', 'Mango', 'Zeta']);
  });

  it('median rounded to 2 decimals', () => {
    const f1 = makeFunding({ symbol: 'TAO', venue: 'a', annualized_pct: 1.234 });
    const f2 = makeFunding({ symbol: 'TAO', venue: 'b', annualized_pct: 3.567 });
    const r = buildPulseRow(makeMover({ symbol: 'TAO' }), [f1, f2]);
    // (1.234 + 3.567) / 2 = 2.4005 -> 2.4
    expect(r.funding_median_annualized_pct).toBe(2.4);
  });
});

// ── buildPulse: union + join ───────────────────────────────────────

describe('buildPulse: union of movers and funding', () => {
  it('builds rows for symbols in EITHER movers OR funding', () => {
    const m = makeMover({ symbol: 'TAO', display_name: 'Bittensor', change_24h_percent: 2 });
    const f = makeFunding({ symbol: 'FET', display_name: 'Fetch.ai', venue: 'dYdX', annualized_pct: 10 });
    const r = buildPulse(makeSnapshot([m], [f]), DEFAULT_FILTER);
    expect(r.rows.map((row) => row.symbol).sort()).toEqual(['FET', 'TAO']);
  });

  it('mover data wins when a symbol is in both feeds', () => {
    const m = makeMover({ symbol: 'TAO', display_name: 'Bittensor', price_usd: 400, change_24h_percent: 5, market_cap: 1e9 });
    const f = makeFunding({ symbol: 'TAO', display_name: 'IGNORED', venue: 'dYdX', annualized_pct: 10 });
    const r = buildPulse(makeSnapshot([m], [f]), DEFAULT_FILTER);
    const tao = r.rows.find((row) => row.symbol === 'TAO')!;
    expect(tao.display_name).toBe('Bittensor');
    expect(tao.price_usd).toBe(400);
    expect(tao.change_24h_percent).toBe(5);
    expect(tao.market_cap).toBe(1e9);
  });

  it('funding-only symbol uses fallback metadata from the first funding entry', () => {
    const f1 = makeFunding({ symbol: 'FET', display_name: 'Fetch.ai', thesis: 'agent economy', venue: 'dYdX', annualized_pct: 10 });
    const f2 = makeFunding({ symbol: 'FET', display_name: 'IGNORED', thesis: 'IGNORED', venue: 'Binance', annualized_pct: 12 });
    const r = buildPulse(makeSnapshot([], [f1, f2]), DEFAULT_FILTER);
    const fet = r.rows.find((row) => row.symbol === 'FET')!;
    expect(fet.display_name).toBe('Fetch.ai');
    expect(fet.thesis).toBe('agent economy');
  });
});

// ── buildPulse: filters ────────────────────────────────────────────

describe('buildPulse: token filter', () => {
  it('case-insensitive substring on symbol', () => {
    const m1 = makeMover({ symbol: 'TAO', display_name: 'Bittensor' });
    const m2 = makeMover({ symbol: 'FET', display_name: 'Fetch.ai' });
    const r = buildPulse(makeSnapshot([m1, m2], []), { ...DEFAULT_FILTER, token: 'tao' });
    expect(r.rows.map((row) => row.symbol)).toEqual(['TAO']);
  });

  it('case-insensitive substring on display_name', () => {
    const m1 = makeMover({ symbol: 'TAO', display_name: 'Bittensor' });
    const m2 = makeMover({ symbol: 'FET', display_name: 'Fetch.ai' });
    const r = buildPulse(makeSnapshot([m1, m2], []), { ...DEFAULT_FILTER, token: 'fetch' });
    expect(r.rows.map((row) => row.symbol)).toEqual(['FET']);
  });
});

describe('buildPulse: setup filter', () => {
  it('exact match on setup', () => {
    // chase_up: rising + elevated positive
    const m1 = makeMover({ symbol: 'TAO', change_24h_percent: 2 });
    const f1 = makeFunding({ symbol: 'TAO', venue: 'a', annualized_pct: 10 });
    // squeeze_down: falling + elevated positive
    const m2 = makeMover({ symbol: 'FET', change_24h_percent: -2 });
    const f2 = makeFunding({ symbol: 'FET', venue: 'a', annualized_pct: 10 });
    const r = buildPulse(makeSnapshot([m1, m2], [f1, f2]), { ...DEFAULT_FILTER, setup: 'chase_up' });
    expect(r.rows.map((row) => row.symbol)).toEqual(['TAO']);
  });
});

describe('buildPulse: min_abs_change_pct filter', () => {
  it('drops rows whose |change| < threshold', () => {
    const m1 = makeMover({ symbol: 'TAO', change_24h_percent: 5 });
    const m2 = makeMover({ symbol: 'FET', change_24h_percent: -0.5 });
    const m3 = makeMover({ symbol: 'RNDR', change_24h_percent: -3 });
    const r = buildPulse(makeSnapshot([m1, m2, m3], []), { ...DEFAULT_FILTER, min_abs_change_pct: 1 });
    expect(r.rows.map((row) => row.symbol).sort()).toEqual(['RNDR', 'TAO']);
  });
});

// ── buildPulse: sort ───────────────────────────────────────────────

describe('buildPulse: sort', () => {
  it('rows sorted descending by |change_24h_percent|', () => {
    const m1 = makeMover({ symbol: 'TAO', change_24h_percent: 2 });
    const m2 = makeMover({ symbol: 'FET', change_24h_percent: -5 });
    const m3 = makeMover({ symbol: 'RNDR', change_24h_percent: 3 });
    const r = buildPulse(makeSnapshot([m1, m2, m3], []), DEFAULT_FILTER);
    expect(r.rows.map((row) => row.symbol)).toEqual(['FET', 'RNDR', 'TAO']);
  });
});

// ── buildPulse: notable_movers ─────────────────────────────────────

describe('buildPulse: notable_movers', () => {
  it('squeezes_up filtered to setup=squeeze_up', () => {
    // squeeze_up: rising + negative funding
    const m = makeMover({ symbol: 'TAO', change_24h_percent: 2 });
    const f = makeFunding({ symbol: 'TAO', venue: 'a', annualized_pct: -10 });
    const r = buildPulse(makeSnapshot([m], [f]), DEFAULT_FILTER);
    expect(r.notable_movers.squeezes_up.map((row) => row.symbol)).toEqual(['TAO']);
  });

  it('squeezes_down filtered to setup=squeeze_down', () => {
    const m = makeMover({ symbol: 'FET', change_24h_percent: -2 });
    const f = makeFunding({ symbol: 'FET', venue: 'a', annualized_pct: 10 });
    const r = buildPulse(makeSnapshot([m], [f]), DEFAULT_FILTER);
    expect(r.notable_movers.squeezes_down.map((row) => row.symbol)).toEqual(['FET']);
  });

  it('coiled filtered to setup=coiled', () => {
    const m = makeMover({ symbol: 'RNDR', change_24h_percent: 0.5 });
    const f = makeFunding({ symbol: 'RNDR', venue: 'a', annualized_pct: 30 });
    const r = buildPulse(makeSnapshot([m], [f]), DEFAULT_FILTER);
    expect(r.notable_movers.coiled.map((row) => row.symbol)).toEqual(['RNDR']);
  });

  it('top_gainers: top 5 by change_24h_percent desc among positive change', () => {
    const movers = [
      makeMover({ symbol: 'TAO', change_24h_percent: 10 }),
      makeMover({ symbol: 'FET', change_24h_percent: 8 }),
      makeMover({ symbol: 'RNDR', change_24h_percent: 6 }),
      makeMover({ symbol: 'AKT', change_24h_percent: 4 }),
      makeMover({ symbol: 'AGIX', change_24h_percent: 2 }),
      makeMover({ symbol: 'WLD', change_24h_percent: 1 }),
      makeMover({ symbol: 'IO', change_24h_percent: -3 }),
    ];
    const r = buildPulse(makeSnapshot(movers, []), DEFAULT_FILTER);
    expect(r.notable_movers.top_gainers.map((row) => row.symbol)).toEqual(['TAO', 'FET', 'RNDR', 'AKT', 'AGIX']);
  });

  it('top_losers: top 5 by change_24h_percent asc among negative change', () => {
    const movers = [
      makeMover({ symbol: 'TAO', change_24h_percent: -10 }),
      makeMover({ symbol: 'FET', change_24h_percent: -8 }),
      makeMover({ symbol: 'RNDR', change_24h_percent: -6 }),
      makeMover({ symbol: 'AKT', change_24h_percent: -4 }),
      makeMover({ symbol: 'AGIX', change_24h_percent: -2 }),
      makeMover({ symbol: 'WLD', change_24h_percent: -1 }),
      makeMover({ symbol: 'IO', change_24h_percent: 3 }),
    ];
    const r = buildPulse(makeSnapshot(movers, []), DEFAULT_FILTER);
    expect(r.notable_movers.top_losers.map((row) => row.symbol)).toEqual(['TAO', 'FET', 'RNDR', 'AKT', 'AGIX']);
  });
});

// ── buildPulse: summary ────────────────────────────────────────────

describe('buildPulse: summary', () => {
  it('by_setup initialized with all 6 keys to 0', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.summary.by_setup).toEqual({
      squeeze_up: 0,
      chase_up: 0,
      squeeze_down: 0,
      chase_down: 0,
      coiled: 0,
      neutral: 0,
    });
  });

  it('by_setup counts correctly across rows', () => {
    // chase_up: rising + elevated_pos
    const m1 = makeMover({ symbol: 'TAO', change_24h_percent: 2 });
    const f1 = makeFunding({ symbol: 'TAO', venue: 'a', annualized_pct: 10 });
    // squeeze_up: rising + elevated_neg
    const m2 = makeMover({ symbol: 'FET', change_24h_percent: 2 });
    const f2 = makeFunding({ symbol: 'FET', venue: 'a', annualized_pct: -10 });
    // neutral: no funding
    const m3 = makeMover({ symbol: 'RNDR', change_24h_percent: 0 });
    const r = buildPulse(makeSnapshot([m1, m2, m3], [f1, f2]), DEFAULT_FILTER);
    expect(r.summary.by_setup.chase_up).toBe(1);
    expect(r.summary.by_setup.squeeze_up).toBe(1);
    expect(r.summary.by_setup.neutral).toBe(1);
  });

  it('breadth_pct_positive: percent of rows with positive change', () => {
    const movers = [
      makeMover({ symbol: 'TAO', change_24h_percent: 1 }),
      makeMover({ symbol: 'FET', change_24h_percent: 2 }),
      makeMover({ symbol: 'RNDR', change_24h_percent: -3 }),
      makeMover({ symbol: 'AKT', change_24h_percent: 0 }),
    ];
    const r = buildPulse(makeSnapshot(movers, []), DEFAULT_FILTER);
    expect(r.summary.breadth_pct_positive).toBe(50);
  });

  it('breadth_pct_positive is 0 when no rows', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.summary.breadth_pct_positive).toBe(0);
  });

  it('median_change_24h_pct: median across rows, rounded 2dp', () => {
    const movers = [
      makeMover({ symbol: 'TAO', change_24h_percent: 1 }),
      makeMover({ symbol: 'FET', change_24h_percent: 3 }),
      makeMover({ symbol: 'RNDR', change_24h_percent: 5 }),
    ];
    const r = buildPulse(makeSnapshot(movers, []), DEFAULT_FILTER);
    expect(r.summary.median_change_24h_pct).toBe(3);
  });

  it('median_change_24h_pct is 0 when no rows', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.summary.median_change_24h_pct).toBe(0);
  });
});

// ── buildPulse: cohort + echo ──────────────────────────────────────

describe('buildPulse: cohort metadata', () => {
  it('cohort.cohort_size equals filtered row count', () => {
    const movers = [
      makeMover({ symbol: 'TAO', change_24h_percent: 5 }),
      makeMover({ symbol: 'FET', change_24h_percent: 0.1 }),
    ];
    const r = buildPulse(makeSnapshot(movers, []), { ...DEFAULT_FILTER, min_abs_change_pct: 1 });
    expect(r.cohort.cohort_size).toBe(1);
  });

  it('cohort echoes movers_seen, funding_seen, failed_venues from snapshot', () => {
    const snap = makeSnapshot(
      [makeMover({ symbol: 'TAO' })],
      [makeFunding({ symbol: 'TAO', venue: 'a' })],
    );
    snap.failed_venues = ['Bybit'];
    const r = buildPulse(snap, DEFAULT_FILTER);
    expect(r.cohort.movers_seen).toBe(1);
    expect(r.cohort.funding_seen).toBe(1);
    expect(r.cohort.failed_venues).toEqual(['Bybit']);
  });

  it('echoes filter back', () => {
    const filter = { token: 'tao', setup: 'chase_up' as const, min_abs_change_pct: 1.5 };
    const r = buildPulse(makeSnapshot([], []), filter);
    expect(r.filter).toEqual(filter);
  });

  it('preserves snapshot_captured_at from input snapshot', () => {
    const snap = makeSnapshot([], [], '2026-01-15T12:34:56.000Z');
    const r = buildPulse(snap, DEFAULT_FILTER);
    expect(r.snapshot_captured_at).toBe('2026-01-15T12:34:56.000Z');
  });
});

// ── buildPulse: attribution ────────────────────────────────────────

describe('buildPulse: attribution', () => {
  it('attribution.source mentions TerminalFeed and federation', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.attribution.source).toContain('TerminalFeed');
    expect(r.attribution.source.toLowerCase()).toContain('federation');
  });

  it('attribution.notes mentions squeeze and coiled', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('squeeze');
    expect(r.attribution.notes.toLowerCase()).toContain('coiled');
  });

  it('ok is true', () => {
    const r = buildPulse(makeSnapshot([], []), DEFAULT_FILTER);
    expect(r.ok).toBe(true);
  });
});
