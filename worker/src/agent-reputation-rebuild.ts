/**
 * Agent Reputation Bureau — daily rebuild orchestrator.
 *
 * v0 Week 1, step 4 (guts) of the spec at
 * C:\Users\rippe\Desktop\tensorfeed-agent-rep-bureau-spec.md. This file
 * stitches together the pure calculators in agent-reputation.ts and the
 * KV store helpers in agent-reputation-store.ts into a single rebuild
 * pass that the daily cron and the manual admin refresh both call into.
 *
 * Flow:
 *   1. Aggregate free-trial counts across the pay:no-charge:* index.
 *   2. Build wallet -> tokens map from pay:tx:*.
 *   3. Enumerate every token under pay:credits:*.
 *   4. Assemble per-token AgentTelemetry. Tokens bound to a wallet are
 *      deferred and merged into a per-wallet record; unbound tokens get
 *      their own token-only record.
 *   5. Compute metrics + composite score for every agent. cohort_spend_cap
 *      anchors the spend sub-score at the 95th percentile so a single
 *      whale doesn't squash everyone else's signal.
 *   6. Apply ban + claim overlays (claim state populates display_name,
 *      operator_url, verified flag; ban state populates banned + ban_reason
 *      and forces trust grade F).
 *   7. Rank the cohort by each of the 5 metrics and assemble final cards.
 *   8. Write per-agent cards, leaderboards (one per metric, window="all"
 *      in v0), the daily rollup, dates index, and meta.
 *
 * v0 scope notes:
 *   - Only token-holding agents are tracked. Anonymous IP-keyed free-trial
 *     callers (no token) don't have a stable identity to reputation-track.
 *   - Leaderboards are written under the "all" window only. Window-filtered
 *     leaderboards (24h, 7d, 30d) require historical per-day metric snapshots
 *     and are deferred to v1.
 *   - The bureau does not gate on payment-critical writes; all writes are
 *     routed through safePut so the kill switch can throttle bleed.
 */

import { Env } from './types';
import {
  COMPOSITE_WEIGHTS_FROZEN,
  STANDARD_ATTRIBUTION,
  computeCompositeScore,
  computeFlags,
  computeMetrics,
  computeTrustGrade,
  rankCohort,
  rolling30dAvgSpend,
  type AgentTelemetry,
  type RankEntry,
  type ReputationCard,
  type ReputationFlag,
  type ReputationMetrics,
  type TrustGrade,
} from './agent-reputation';
import {
  ALL_METRICS,
  aggregateFreeTrialCalls,
  assembleTelemetryForToken,
  buildWalletToTokensIndex,
  getBanRecord,
  getOperatorClaim,
  getReputationDates,
  listAllPaidTokens,
  mergeTelemetryAcrossTokens,
  putLeaderboard,
  putReputationCard,
  putReputationDates,
  putReputationMeta,
  putRollup,
  type LeaderboardWindow,
  type RankableMetric,
  type ReputationRollup,
} from './agent-reputation-store';

export interface RebuildOptions {
  /** YYYY-MM-DD UTC the rebuild is anchored to. */
  today: string;
  /** ISO timestamp recorded on the rollup + meta. */
  generated_at: string;
  /** Schema/algorithm version label. */
  version: string;
}

export interface RebuildResult {
  generated_at: string;
  total_agents: number;
  wallet_cards: number;
  token_only_cards: number;
  cohort_spend_cap: number;
  cards_written: number;
  leaderboards_written: number;
  date: string;
  version: string;
}

const ROLLUP_WINDOW: LeaderboardWindow = 'all';

interface AgentEntry {
  /** Stable id used for ranking + leaderboard storage. Wallet (lowercased)
   *  for wallet-bound agents, token_prefix for token-only agents. */
  id: string;
  telemetry: AgentTelemetry;
  metrics: ReputationMetrics;
  composite_score: number;
  reliability_score: number;
  spend_score: number;
  activity_score: number;
  streak_score: number;
}

/**
 * Compute the 95th-percentile spend across the cohort. Used as the
 * upper anchor for computeSpendScore so one whale doesn't squash
 * everyone else's signal. Falls back to max(1) when the pool is too
 * small to have a meaningful percentile.
 */
export function computeCohortSpendCap(telemetry: AgentTelemetry[]): number {
  if (telemetry.length === 0) return 1;
  const spends = telemetry
    .map((t) => t.paid_calls * 5 + t.free_trial_calls)
    .sort((a, b) => a - b);
  if (spends.length < 2) return Math.max(1, spends[0] ?? 1);
  const idx = Math.floor(spends.length * 0.95);
  const cap = spends[Math.min(idx, spends.length - 1)];
  return Math.max(1, cap);
}

export async function rebuildAllReputationCards(
  env: Env,
  opts: RebuildOptions,
): Promise<RebuildResult> {
  const { today, generated_at, version } = opts;

  const [freeMap, walletIndex, allTokens] = await Promise.all([
    aggregateFreeTrialCalls(env, today),
    buildWalletToTokensIndex(env),
    listAllPaidTokens(env),
  ]);

  // Reverse the wallet index for O(1) token -> wallet lookup
  const tokenToWallet = new Map<string, string>();
  for (const [wallet, tokens] of walletIndex) {
    for (const tk of tokens) tokenToWallet.set(tk, wallet);
  }

  const perWalletTokens = new Map<string, AgentTelemetry[]>();
  const tokenOnly: AgentTelemetry[] = [];

  for (const token of allTokens) {
    const wallet = tokenToWallet.get(token);
    const t = await assembleTelemetryForToken(env, token, freeMap, wallet);
    if (!t) continue;
    if (wallet) {
      const list = perWalletTokens.get(wallet) ?? [];
      list.push(t);
      perWalletTokens.set(wallet, list);
    } else {
      tokenOnly.push(t);
    }
  }

  const walletTelemetry: AgentTelemetry[] = [];
  for (const [wallet, list] of perWalletTokens) {
    walletTelemetry.push(mergeTelemetryAcrossTokens(wallet, list));
  }

  const cohortTelemetry = [...walletTelemetry, ...tokenOnly];
  const cohort_spend_cap = computeCohortSpendCap(cohortTelemetry);

  const entries: AgentEntry[] = cohortTelemetry.map((t) => {
    const metrics = computeMetrics(t, today);
    const reliability_score = metrics.reliability_pct;
    const spend_score =
      cohort_spend_cap > 0
        ? Math.min(100, ((t.paid_calls * 5 + t.free_trial_calls) / cohort_spend_cap) * 100)
        : 0;
    const activity_score = Math.min(100, (Math.min(metrics.active_days, 30) / 30) * 100);
    const streak_score = Math.min(100, (Math.min(metrics.current_streak_days, 30) / 30) * 100);
    const composite_score = computeCompositeScore(metrics, cohort_spend_cap, COMPOSITE_WEIGHTS_FROZEN);
    return {
      id: (t.wallet ?? t.token_prefix ?? '').toLowerCase(),
      telemetry: t,
      metrics,
      composite_score,
      reliability_score,
      spend_score,
      activity_score,
      streak_score,
    };
  });

  const rankByMetric: Record<RankableMetric, Map<string, RankEntry>> = {
    reliability: rankCohort(entries.map((e) => ({ id: e.id, score: e.reliability_score }))),
    spend: rankCohort(entries.map((e) => ({ id: e.id, score: e.spend_score }))),
    activity: rankCohort(entries.map((e) => ({ id: e.id, score: e.activity_score }))),
    streak: rankCohort(entries.map((e) => ({ id: e.id, score: e.streak_score }))),
    composite: rankCohort(entries.map((e) => ({ id: e.id, score: e.composite_score }))),
  };

  let cards_written = 0;
  let leaderboards_written = 0;

  for (const entry of entries) {
    const card = await composeCard(env, entry, rankByMetric, today);
    const ok = await putReputationCard(env, card);
    if (ok) cards_written += 1;
  }

  // Leaderboards: one per metric, window='all'. Each leaderboard is the
  // id list in rank order. Cohort size is the total length; consumers
  // slice for the requested limit.
  for (const metric of ALL_METRICS) {
    const ranked = entries
      .map((e) => ({ id: e.id, rank: rankByMetric[metric].get(e.id)?.rank ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.rank - b.rank)
      .map((e) => e.id);
    const wrote = await putLeaderboard(env, metric, ROLLUP_WINDOW, ranked);
    if (wrote) leaderboards_written += 1;
  }

  const rollup: ReputationRollup = {
    date: today,
    generated_at,
    total_agents: entries.length,
    cohort_spend_cap,
    leaderboards: {
      reliability: leaderboardIds(entries, rankByMetric.reliability),
      spend: leaderboardIds(entries, rankByMetric.spend),
      activity: leaderboardIds(entries, rankByMetric.activity),
      streak: leaderboardIds(entries, rankByMetric.streak),
      composite: leaderboardIds(entries, rankByMetric.composite),
    },
  };
  await putRollup(env, rollup);

  // Maintain the dates index (most recent first, capped server-side
  // in putReputationDates).
  const dates = await getReputationDates(env);
  if (!dates.includes(today)) {
    dates.unshift(today);
    await putReputationDates(env, dates);
  }

  await putReputationMeta(env, {
    generated_at,
    total_agents: entries.length,
    last_refresh: generated_at,
    version,
  });

  return {
    generated_at,
    total_agents: entries.length,
    wallet_cards: walletTelemetry.length,
    token_only_cards: tokenOnly.length,
    cohort_spend_cap,
    cards_written,
    leaderboards_written,
    date: today,
    version,
  };
}

function leaderboardIds(
  entries: AgentEntry[],
  rankMap: Map<string, RankEntry>,
): string[] {
  return entries
    .map((e) => ({ id: e.id, rank: rankMap.get(e.id)?.rank ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank)
    .map((e) => e.id);
}

async function composeCard(
  env: Env,
  entry: AgentEntry,
  rankByMetric: Record<RankableMetric, Map<string, RankEntry>>,
  today: string,
): Promise<ReputationCard> {
  const t = entry.telemetry;
  const metrics = entry.metrics;

  // Ban overlay (target can be wallet OR token_prefix; check both).
  let banned = false;
  let ban_reason: string | null = null;
  if (t.wallet) {
    const b = await getBanRecord(env, t.wallet);
    if (b) {
      banned = true;
      ban_reason = b.reason;
    }
  }
  if (!banned && t.token_prefix) {
    const b = await getBanRecord(env, t.token_prefix);
    if (b) {
      banned = true;
      ban_reason = b.reason;
    }
  }

  // Claim overlay (only wallet-bound agents can have a verified claim).
  let display_name: string | null = null;
  let operator_url: string | null = null;
  let verified = false;
  let ofac_clean = true;
  let claim_disputed = false;
  if (t.wallet) {
    const claim = await getOperatorClaim(env, t.wallet);
    if (claim) {
      display_name = claim.display_name;
      operator_url = claim.operator_url;
      verified = claim.verified;
      ofac_clean = claim.ofac_clean;
      claim_disputed = claim.claim_disputed ?? false;
    }
  }

  const today_spend = t.daily_spend_30d[today] ?? 0;
  const flags = computeFlags({
    wallet_age_days: metrics.wallet_age_days,
    paid_calls: metrics.paid_calls,
    daily_spend_today: today_spend,
    rolling_30d_avg_spend: rolling30dAvgSpend(t.daily_spend_30d, today),
    unique_endpoints_used: metrics.unique_endpoints_used,
    errors_4xx: metrics.errors_4xx,
    total_calls: metrics.total_calls,
    claim_disputed,
  });

  const trust_grade: TrustGrade = computeTrustGrade({
    wallet_age_days: metrics.wallet_age_days,
    paid_calls: metrics.paid_calls,
    verified,
    banned,
    ofac_clean,
    flag_count: flags.length,
  });

  const ranks = {
    reliability: rankByMetric.reliability.get(entry.id) ?? noRank(),
    spend: rankByMetric.spend.get(entry.id) ?? noRank(),
    activity: rankByMetric.activity.get(entry.id) ?? noRank(),
    streak: rankByMetric.streak.get(entry.id) ?? noRank(),
    composite: rankByMetric.composite.get(entry.id) ?? noRank(),
  };

  const card: ReputationCard = {
    ok: true,
    wallet: t.wallet,
    token_prefix: t.token_prefix,
    display_name,
    operator_url,
    verified,
    ofac_clean,
    banned,
    ban_reason,
    trust_grade,
    flags: flags as ReputationFlag[],
    first_seen: t.first_seen,
    last_active: t.last_active,
    wallet_age_days: metrics.wallet_age_days,
    metrics,
    ranks,
    attribution: STANDARD_ATTRIBUTION,
  };
  return card;
}

function noRank(): RankEntry {
  return { rank: 0, total: 0, pct: 0 };
}
