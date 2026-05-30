/**
 * Premium x402 Settlement Verdict.
 *
 * One signed ruling on the state of the x402 USDC settlement market on Base,
 * computed over TensorFeed's OWN on-chain settlement index. It is the decision
 * layer over the same public data the free /api/x402-index/summary and
 * /api/x402-index/leaderboard endpoints serve, but instead of raw aggregates it
 * returns three classifications an agent can act on without running the analysis:
 *
 *   momentum       expanding, steady, contracting, or nascent (versus the
 *                  immediately prior window of equal length).
 *   concentration  concentrated, moderate, or diversified, by the Herfindahl
 *                  index over publisher volume share.
 *   leading        the single highest-volume publisher in the window.
 *
 * The thesis: an agent deciding whether to build x402 payments into its own
 * stack wants the market read (is settlement activity growing, is it a
 * one-publisher show or a real market, who leads) more than the raw rollups.
 * The verdict fuses both into one ruling with an AFTA-signed receipt.
 *
 * Coverage caveat (load-bearing, repeated in notes): the index covers the x402
 * USDC settlements on Base that TensorFeed indexes, forward-only from launch. It
 * is NOT all of x402 and NOT other chains. The verdict is honest about its
 * vantage; it is a ruling over TF's own measurements, not a market-wide claim.
 *
 * Free sibling: /api/x402-index/summary + /api/x402-index/leaderboard (raw).
 * Premium: /api/premium/x402-settlement-verdict (the ruling, full ranking,
 * signed receipt). Free preview: /api/preview/x402-settlement-verdict (the
 * three classifications only, no ranking, no signed receipt).
 *
 * Freshness: capturedAt is the index cursor last_run_at (the real index
 * freshness), never the request clock. The 10-minute SLA in freshness.ts
 * matches the x402-index family: the indexer advances last_run_at on every
 * block-processing tick (every 5 min, even in a quiet period with zero new
 * settlements), so a stale captured_at means a real indexer outage and triggers
 * a no-charge. An agent only pays when the index is current.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import { getSummary, getLeaderboard, type SummaryResult, type LeaderboardResult, type Window } from './x402-index/query';

// Herfindahl index thresholds on a 0 to 10000 scale, mirroring the FTC and DOJ
// Horizontal Merger Guidelines: below 1500 is unconcentrated (diversified),
// 1500 to 2500 is moderately concentrated (moderate), above 2500 is highly
// concentrated (concentrated). Standard, citable, and not an arbitrary cutoff.
const HHI_DIVERSIFIED_BELOW = 1500;
const HHI_CONCENTRATED_ABOVE = 2500;

// Momentum band on window-over-window volume change. A move of at least 25
// percent in either direction is a real trend; inside the band is steady.
const MOMENTUM_PCT_BAND = 25;

export type Momentum = 'expanding' | 'steady' | 'contracting' | 'nascent';
export type Concentration = 'concentrated' | 'moderate' | 'diversified' | 'empty';

export interface X402PublisherRankEntry {
  rank: number;
  domain: string;
  volume_usdc: string;
  count: number;
  share_pct: number;
}

export interface X402SettlementVerdictResult {
  ok: true;
  capturedAt: string | null;
  window_label: Window | null;
  verdict: {
    momentum: Momentum;
    concentration: Concentration;
    leading_publisher: string | null;
  };
  ecosystem: {
    volume_usdc: string;
    count: number;
    unique_publishers: number;
    volume_change_pct: number;
    count_change_pct: number;
    prior_window_empty: boolean;
    top_publisher_share_pct: number | null;
    hhi: number | null; // Herfindahl index over publisher volume share, 0 to 10000; higher is more concentrated
  };
  ranking: X402PublisherRankEntry[];
  claim: string;
  notes: string[];
  attribution: { sources: string[]; license: string };
}

const CLAIM =
  'TensorFeed rules on the state of the x402 USDC settlement market on Base, fusing its own on-chain settlement index into a single verdict (momentum versus the prior window of equal length, concentration by the Herfindahl index, and the leading publisher) with an AFTA-signed receipt. It is a ruling over the publishers TensorFeed indexes on Base, forward-only from launch, not a claim about all of x402, other chains, or any future settlement volume.';

function classifyMomentum(volumePct: number, priorWindowEmpty: boolean, count: number): Momentum {
  // No activity in the window, or activity growing from a zero prior baseline:
  // there is no honest trend to call, so report nascent rather than a sentinel
  // +100 percent that would read as real growth.
  if (count === 0 || priorWindowEmpty) return 'nascent';
  if (volumePct >= MOMENTUM_PCT_BAND) return 'expanding';
  if (volumePct <= -MOMENTUM_PCT_BAND) return 'contracting';
  return 'steady';
}

function classifyConcentration(hhi: number | null): Concentration {
  if (hhi === null) return 'empty';
  if (hhi < HHI_DIVERSIFIED_BELOW) return 'diversified';
  if (hhi > HHI_CONCENTRATED_ABOVE) return 'concentrated';
  return 'moderate';
}

export function buildX402SettlementVerdict(
  summary: SummaryResult | null,
  leaderboard: LeaderboardResult | null,
  _now: Date,
): X402SettlementVerdictResult {
  const attribution = {
    sources: [
      'TensorFeed x402 settlement index over public Base mainnet on-chain data (/api/x402-index/summary, /api/x402-index/leaderboard)',
    ],
    license:
      'The underlying settlement events are public Base mainnet on-chain data, published by TensorFeed under CC BY 4.0. The momentum, concentration, and leading-publisher verdict is TensorFeed editorial work over its own index, not investment advice and not a market-wide guarantee.',
  };

  const leaders = leaderboard?.leaders ?? [];
  const ranking: X402PublisherRankEntry[] = leaders.map((l) => ({
    rank: l.rank,
    domain: l.domain,
    volume_usdc: l.volume_usdc,
    count: l.count,
    share_pct: l.share_pct,
  }));

  // Herfindahl index over the returned leaders' volume share. The leaderboard
  // share_pct denominator is the FULL windowed ecosystem volume, so for a young
  // market where the returned slice (up to 25) is effectively the whole
  // publisher set this equals the true HHI; any unreturned long tail contributes
  // only negligible squared terms. Null when there are no publishers.
  const hhi =
    ranking.length === 0
      ? null
      : Math.round(ranking.reduce((acc, e) => acc + e.share_pct * e.share_pct, 0));

  const count = summary?.count ?? 0;
  const volumeChangePct = summary?.change_vs_prior_window?.volume_pct ?? 0;
  const countChangePct = summary?.change_vs_prior_window?.count_pct ?? 0;
  const priorWindowEmpty = summary?.change_vs_prior_window?.prior_window_empty ?? true;

  const momentum = classifyMomentum(volumeChangePct, priorWindowEmpty, count);
  const concentration = classifyConcentration(hhi);
  const leadingPublisher = ranking[0]?.domain ?? null;
  const topShare = ranking[0]?.share_pct ?? null;

  const notes: string[] = [
    'Momentum compares trailing-window volume against the immediately prior window of equal length; growth from a zero prior baseline or an empty window is reported as nascent, not as growth.',
    'Concentration uses the Herfindahl index over publisher volume share (0 to 10000): below 1500 is diversified, 1500 to 2500 is moderate, above 2500 is concentrated, matching the FTC and DOJ merger-guideline bands.',
    'Coverage is the x402 USDC settlements on Base that TensorFeed indexes, forward-only from the index launch. It is not all of x402 and not other chains.',
    'This is a ruling over TensorFeed-measured on-chain settlements, not investment advice and not a forecast.',
  ];
  if (priorWindowEmpty && count > 0) {
    notes.push(
      'The prior window had no indexed settlements, so the change percentages are reported against a zero baseline and the momentum is held at nascent.',
    );
  }

  return {
    ok: true,
    capturedAt: summary?.captured_at ?? leaderboard?.captured_at ?? null,
    window_label: summary?.window ?? leaderboard?.window ?? null,
    verdict: { momentum, concentration, leading_publisher: leadingPublisher },
    ecosystem: {
      volume_usdc: summary?.volume_usdc ?? '0.000000',
      count,
      unique_publishers: summary?.unique_publishers ?? 0,
      volume_change_pct: volumeChangePct,
      count_change_pct: countChangePct,
      prior_window_empty: priorWindowEmpty,
      top_publisher_share_pct: topShare,
      hhi,
    },
    ranking,
    claim: CLAIM,
    notes,
    attribution,
  };
}

export async function computeX402SettlementVerdict(env: Env, window: Window = '7d'): Promise<X402SettlementVerdictResult> {
  const [summary, leaderboard] = await Promise.all([
    getSummary(env, window),
    getLeaderboard(env, window, 25),
  ]);
  return buildX402SettlementVerdict(summary, leaderboard, new Date());
}

/**
 * IP-based daily rate limit for the free /api/preview/x402-settlement-verdict
 * preview. Mirrors checkReliabilityVerdictPreviewRateLimit with a distinct KV
 * key so the previews do not share a budget. 1 read plus (0 or 1) writes per
 * call; the write is skipped under the kill switch.
 */
export async function checkX402SettlementVerdictPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:x402-settlement-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
