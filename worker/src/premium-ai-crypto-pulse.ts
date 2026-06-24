/**
 * Premium AI-crypto pulse.
 *
 * Joins the price-mover signal with the funding-rate signal over the
 * curated AI-thesis token cohort, classifying each token's current
 * setup as:
 *
 *   squeeze_up        : price rising AND funding negative (shorts trapped)
 *   chase_up          : price rising AND funding positive (leverage on
 *                       the long side, mean-reversion risk)
 *   squeeze_down      : price falling AND funding positive (longs trapped)
 *   chase_down        : price falling AND funding negative (leverage on
 *                       the short side)
 *   coiled            : low absolute price-move + extreme funding (set-up
 *                       for either direction)
 *   neutral           : nothing notable
 *
 * The squeeze classifications are the contrarian-signal alpha that
 * agents pay for; chase classifications are the "stay away" tag.
 *
 * Free /api/ai-crypto-pulse returns the raw cohort. This endpoint adds
 * the setup classification + cohort rollups + venue-weighted funding
 * skew.
 *
 * Cost: 1 credit. Bazaar Wave 9 pilot.
 */

import type {
  AiCryptoSnapshot,
  CryptoMoverEntry,
  FundingEntry,
} from './terminalfeed-crypto-fetcher';
import type { Env } from './types';
import { safePut } from './kill-switch';

// ─── Filter ────────────────────────────────────────────────────────

export interface PulseFilter {
  /** Substring (case-insensitive) match against symbol or display_name. */
  token: string | null;
  /** Filter to a specific setup classification. */
  setup: SetupKind | null;
  /** Minimum absolute price change to surface in headline rows. Default 0. */
  min_abs_change_pct: number;
}

export type SetupKind =
  | 'squeeze_up'
  | 'chase_up'
  | 'squeeze_down'
  | 'chase_down'
  | 'coiled'
  | 'neutral';

export const SETUP_KINDS: ReadonlyArray<SetupKind> = [
  'squeeze_up', 'chase_up', 'squeeze_down', 'chase_down', 'coiled', 'neutral',
];

export function parseToken(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseSetup(raw: string | null): SetupKind | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (SETUP_KINDS as ReadonlyArray<string>).includes(t) ? (t as SetupKind) : null;
}

export function parseMinAbsChangePct(raw: string | null): number {
  if (raw === null || raw === '') return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1000) return 1000;
  return n;
}

// ─── Setup classification ──────────────────────────────────────────

/**
 * Thresholds tuned for crypto market structure:
 *   - "rising" = +1% 24h or more
 *   - "falling" = -1% 24h or more
 *   - "low absolute" = within ±1%
 *   - "extreme funding" = annualized > 20% in either direction
 *   - "elevated funding" = annualized > 5% in either direction
 *
 * Annualized funding is the right comparable axis (period funding rates
 * differ across venues; annualized normalizes 1h vs 8h vs 24h schedules).
 */
const MOVE_THRESHOLD = 1.0;
const FUNDING_ELEVATED = 5.0;
const FUNDING_EXTREME = 20.0;

export function classifySetup(change_24h_pct: number, annualized_funding_pct: number | null): SetupKind {
  if (annualized_funding_pct === null) return 'neutral';
  const rising = change_24h_pct >= MOVE_THRESHOLD;
  const falling = change_24h_pct <= -MOVE_THRESHOLD;
  const flat = !rising && !falling;
  const elevated_pos = annualized_funding_pct >= FUNDING_ELEVATED;
  const elevated_neg = annualized_funding_pct <= -FUNDING_ELEVATED;
  const extreme = annualized_funding_pct >= FUNDING_EXTREME || annualized_funding_pct <= -FUNDING_EXTREME;

  if (flat && extreme) return 'coiled';
  if (rising && elevated_neg) return 'squeeze_up';
  if (rising && elevated_pos) return 'chase_up';
  if (falling && elevated_pos) return 'squeeze_down';
  if (falling && elevated_neg) return 'chase_down';
  return 'neutral';
}

// ─── Per-token pulse row ───────────────────────────────────────────

export interface PulseRow {
  symbol: string;
  display_name: string;
  thesis: string;
  price_usd: number;
  change_24h_percent: number;
  market_cap: number;
  /** Number of funding entries we have for this symbol across venues. */
  funding_venue_count: number;
  /** Median annualized funding across venues. Null when no funding data. */
  funding_median_annualized_pct: number | null;
  /** Range of annualized funding (max-min) across venues. Null when single-venue or no data. */
  funding_venue_spread_pct: number | null;
  /** Per-venue array, sorted by venue name. */
  funding_by_venue: Array<{ venue: string; annualized_pct: number; period_rate: number; mark_price: number }>;
  setup: SetupKind;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function buildPulseRow(
  mover: CryptoMoverEntry | null,
  fundings: FundingEntry[],
  fallbackSymbol?: string,
  fallbackMeta?: { display_name: string; thesis: string },
): PulseRow {
  const annualized = fundings.map((f) => f.annualized_pct);
  const med = median(annualized);
  const symbol = mover?.symbol ?? fallbackSymbol ?? '';
  const display_name = mover?.display_name ?? fallbackMeta?.display_name ?? symbol;
  const thesis = mover?.thesis ?? fallbackMeta?.thesis ?? '';
  return {
    symbol,
    display_name,
    thesis,
    price_usd: mover?.price_usd ?? 0,
    change_24h_percent: mover?.change_24h_percent ?? 0,
    market_cap: mover?.market_cap ?? 0,
    funding_venue_count: fundings.length,
    funding_median_annualized_pct: med !== null ? Math.round(med * 100) / 100 : null,
    funding_venue_spread_pct:
      fundings.length >= 2
        ? Math.round((Math.max(...annualized) - Math.min(...annualized)) * 100) / 100
        : null,
    funding_by_venue: [...fundings]
      .sort((a, b) => a.venue.localeCompare(b.venue))
      .map((f) => ({
        venue: f.venue,
        annualized_pct: Math.round(f.annualized_pct * 100) / 100,
        period_rate: f.period_rate,
        mark_price: f.mark_price,
      })),
    setup: classifySetup(mover?.change_24h_percent ?? 0, med),
  };
}

// ─── Top response ──────────────────────────────────────────────────

export interface PulseResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'terminalfeed.io federation cross-call';
  filter: { token: string | null; setup: SetupKind | null; min_abs_change_pct: number };
  cohort: {
    cohort_size: number;
    movers_seen: number;
    funding_seen: number;
    failed_venues: string[];
  };
  rows: PulseRow[];
  notable_movers: {
    squeezes_up: PulseRow[];
    squeezes_down: PulseRow[];
    coiled: PulseRow[];
    top_gainers: PulseRow[];
    top_losers: PulseRow[];
  };
  summary: {
    by_setup: Record<SetupKind, number>;
    breadth_pct_positive: number;     // 0-100, % of rows with positive 24h change
    median_change_24h_pct: number;     // across rows
  };
  /**
   * Set when the underlying snapshot was a single-source (partial) fetch:
   * movers OR funding was unreachable and could not be back-filled from
   * last-known-good (cold-start partial). The squeeze/chase join loses a
   * side, so the premium handler serves this free (no-charge).
   */
  degraded?: boolean;
  partial_sources?: string[];
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildPulse(
  snapshot: AiCryptoSnapshot,
  filter: PulseFilter,
): PulseResponse {
  // Index funding by symbol for quick join.
  const fundingBySymbol = new Map<string, FundingEntry[]>();
  for (const f of snapshot.funding) {
    const arr = fundingBySymbol.get(f.symbol) ?? [];
    arr.push(f);
    fundingBySymbol.set(f.symbol, arr);
  }

  // Build a row for every symbol that appears in EITHER movers OR funding.
  const seen = new Set<string>();
  const rows: PulseRow[] = [];
  for (const m of snapshot.movers) {
    seen.add(m.symbol);
    rows.push(buildPulseRow(m, fundingBySymbol.get(m.symbol) ?? []));
  }
  for (const [sym, fundings] of fundingBySymbol) {
    if (seen.has(sym)) continue;
    const first = fundings[0];
    rows.push(
      buildPulseRow(null, fundings, sym, { display_name: first.display_name, thesis: first.thesis }),
    );
  }

  // Apply filter.
  const tokenNeedle = filter.token?.toLowerCase();
  const filtered = rows.filter((r) => {
    if (tokenNeedle) {
      const hay = `${r.symbol} ${r.display_name}`.toLowerCase();
      if (!hay.includes(tokenNeedle)) return false;
    }
    if (filter.setup && r.setup !== filter.setup) return false;
    if (Math.abs(r.change_24h_percent) < filter.min_abs_change_pct) return false;
    return true;
  });

  // Sort: descending absolute 24h change so the most-action surfaces first.
  filtered.sort((a, b) => Math.abs(b.change_24h_percent) - Math.abs(a.change_24h_percent));

  // Notable movers cohorts (drawn from filtered set so respect to filters).
  const squeezes_up = filtered.filter((r) => r.setup === 'squeeze_up');
  const squeezes_down = filtered.filter((r) => r.setup === 'squeeze_down');
  const coiled = filtered.filter((r) => r.setup === 'coiled');
  const top_gainers = [...filtered]
    .filter((r) => r.change_24h_percent > 0)
    .sort((a, b) => b.change_24h_percent - a.change_24h_percent)
    .slice(0, 5);
  const top_losers = [...filtered]
    .filter((r) => r.change_24h_percent < 0)
    .sort((a, b) => a.change_24h_percent - b.change_24h_percent)
    .slice(0, 5);

  // Summary rollups.
  const by_setup: Record<SetupKind, number> = {
    squeeze_up: 0, chase_up: 0, squeeze_down: 0, chase_down: 0, coiled: 0, neutral: 0,
  };
  let positiveCount = 0;
  const changes: number[] = [];
  for (const r of filtered) {
    by_setup[r.setup]++;
    if (r.change_24h_percent > 0) positiveCount++;
    changes.push(r.change_24h_percent);
  }
  const breadth_pct_positive = filtered.length > 0 ? Math.round((positiveCount / filtered.length) * 100) : 0;
  const med_change = median(changes);
  const median_change_24h_pct = med_change !== null ? Math.round(med_change * 100) / 100 : 0;

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    snapshot_captured_at: snapshot.capturedAt,
    source: 'terminalfeed.io federation cross-call',
    filter: { token: filter.token, setup: filter.setup, min_abs_change_pct: filter.min_abs_change_pct },
    cohort: {
      cohort_size: filtered.length,
      movers_seen: snapshot.movers_cohort_size,
      funding_seen: snapshot.funding_cohort_size,
      failed_venues: snapshot.failed_venues,
    },
    rows: filtered,
    notable_movers: { squeezes_up, squeezes_down, coiled, top_gainers, top_losers },
    summary: { by_setup, breadth_pct_positive, median_change_24h_pct },
    ...(snapshot.degraded ? { degraded: true, partial_sources: snapshot.partial_sources ?? [] } : {}),
    attribution: {
      source: 'TerminalFeed.io (AFTA federation sister site). Upstream data: crypto market aggregators + perp funding venues (dYdX, Hyperliquid, Binance, Bybit) via TerminalFeed.',
      license: 'Federation cross-call to TerminalFeed free endpoints. Upstream market data carries the upstream provider\'s own terms; we link back via per-row venue field.',
      notes: 'Setup classification: squeeze = price move OPPOSITE the leveraged side (shorts/longs trapped); chase = price move WITH the leveraged side (mean-reversion risk); coiled = flat price + extreme funding. Thresholds: 1% 24h move + 5% annualized funding for elevated, 20% for extreme.',
    },
  };
}

// ─── Free preview (the /api/preview/ai-crypto-pulse taste) ──────────

export interface AiCryptoPulsePreview {
  ok: true;
  preview: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: PulseResponse['source'];
  cohort: PulseResponse['cohort'];
  summary: PulseResponse['summary'];
  top_setups: Array<{ symbol: string; display_name: string; setup: SetupKind; change_24h_percent: number }>;
  degraded?: boolean;
  attribution: PulseResponse['attribution'];
  unlock: {
    full_endpoint: string;
    free_raw: string;
    note: string;
    withheld: string[];
  };
}

/**
 * Shape the AI-crypto pulse down to the free discovery taste.
 *
 * The raw movers and funding arrays are ALREADY free at /api/ai-crypto-pulse;
 * the paid endpoint's value is the derived layer (per-token setup
 * classification + venue-weighted funding analytics). So the taste reveals
 * the derived shape (cohort, the setup distribution + breadth + median move,
 * and a few classified standouts reduced to a headline) while withholding the
 * full classified rows and the per-venue funding detail. Pure function.
 */
export function previewAiCryptoPulse(result: PulseResponse): AiCryptoPulsePreview {
  const candidates = [
    result.notable_movers.squeezes_up[0],
    result.notable_movers.squeezes_down[0],
    result.notable_movers.coiled[0],
  ];
  const top_setups = candidates
    .filter((r): r is PulseRow => Boolean(r))
    .map((r) => ({
      symbol: r.symbol,
      display_name: r.display_name,
      setup: r.setup,
      change_24h_percent: r.change_24h_percent,
    }));
  return {
    ok: true,
    preview: true,
    capturedAt: result.capturedAt,
    snapshot_captured_at: result.snapshot_captured_at,
    source: result.source,
    cohort: result.cohort,
    summary: result.summary,
    top_setups,
    ...(result.degraded ? { degraded: true } : {}),
    attribution: result.attribution,
    unlock: {
      full_endpoint: '/api/premium/ai-crypto-pulse',
      free_raw: '/api/ai-crypto-pulse',
      note: 'Free preview: the cohort size, the derived setup distribution (squeeze/chase/coiled counts plus breadth and median move), and a few classified standouts. The full per-token classified rows (each with venue-weighted funding analytics) and the complete notable-movers slices are 1 credit ($0.02) at /api/premium/ai-crypto-pulse. The raw movers and funding arrays are already free at /api/ai-crypto-pulse.',
      withheld: [
        'the full per-token classified rows',
        'per-token venue-weighted funding analytics and the complete notable-movers slices',
      ],
    },
  };
}

/**
 * IP-based daily rate limit for the free /api/preview/ai-crypto-pulse taste.
 * Mirrors checkWhatsNewPreviewRateLimit with a distinct KV key. 1 read plus
 * (0 or 1) writes per call; the write is skipped under the kill switch.
 */
export async function checkAiCryptoPulsePreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:ai-crypto-pulse-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
