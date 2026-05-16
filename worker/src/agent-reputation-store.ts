/**
 * Agent Reputation Bureau — KV store layer.
 *
 * v0 Week 1, step 3 of the spec at
 * C:\Users\rippe\Desktop\tensorfeed-agent-rep-bureau-spec.md.
 *
 * Responsibilities:
 *   1. Read/write helpers for every agent-rep:* KV key in the spec
 *      (cards, claims, bans, leaderboards, rollups, dates index, meta).
 *   2. Telemetry assembly: read pay:credits / pay:tx / pay:usage /
 *      pay:purchases / pay:no-charge and produce an AgentTelemetry
 *      input for the pure calculators in agent-reputation.ts.
 *   3. NO scoring math. That all lives in agent-reputation.ts.
 *   4. NO cron handlers. The daily refresh is wired in step 4.
 *
 * Non-critical writes go through safePut so the KV kill switch can
 * stop bleed without breaking payment-critical paths.
 *
 * KV layout (per spec section "Storage layout"):
 *   agent-rep:wallet:{wallet}              ReputationCard
 *   agent-rep:token:{token_prefix}         ReputationCard
 *   agent-rep:claim:{wallet}               OperatorClaim
 *   agent-rep:claim-pending:{wallet}       OperatorClaim queued for admin review
 *   agent-rep:ban:{target}                 BanRecord
 *   agent-rep:leaderboard:{metric}:{window}  string[] of ids
 *   agent-rep:rollup:{date}                ReputationRollup (daily snapshot)
 *   agent-rep:dates                        string[] of dates with rollups (cap 365)
 *   agent-rep:meta                         ReputationMeta
 */

import { Env } from './types';
import { safePut } from './kill-switch';
import type { AgentTelemetry, ReputationCard } from './agent-reputation';

// === KV key constants ===

export const WALLET_KEY_PREFIX = 'agent-rep:wallet:';
export const TOKEN_KEY_PREFIX = 'agent-rep:token:';
export const CLAIM_KEY_PREFIX = 'agent-rep:claim:';
export const PENDING_CLAIM_KEY_PREFIX = 'agent-rep:claim-pending:';
export const BAN_KEY_PREFIX = 'agent-rep:ban:';
export const LEADERBOARD_KEY_PREFIX = 'agent-rep:leaderboard:';
export const ROLLUP_KEY_PREFIX = 'agent-rep:rollup:';
export const DATES_INDEX_KEY = 'agent-rep:dates';
export const META_KEY = 'agent-rep:meta';

export const MAX_DATES_INDEXED = 365;

// === Public types stored in KV ===

export type RankableMetric = 'reliability' | 'spend' | 'activity' | 'streak' | 'composite';

export type LeaderboardWindow = '24h' | '7d' | '30d' | 'all';

export const ALL_METRICS: ReadonlyArray<RankableMetric> = [
  'reliability',
  'spend',
  'activity',
  'streak',
  'composite',
];

export const ALL_WINDOWS: ReadonlyArray<LeaderboardWindow> = ['24h', '7d', '30d', 'all'];

/**
 * Operator-signed claim binding a wallet to a display name. Persisted
 * verbatim so the signature can be re-verified later by anyone.
 * `verified` and `ofac_clean` are the Worker's gates at write time;
 * `claim_disputed` is admin-set if a claim is contested.
 *
 * Directory fields (available_for_hire, hourly_rate_*, expanded_description,
 * skills_tags, service_areas, languages, years_experience) are OPTIONAL
 * per the agent-directory v0 spec. When present they're parsed from the
 * same signed message and surfaced through the directory search endpoint.
 * The premium verified-hireable badge is gated separately on
 * verified_hireable_until.
 */
export interface OperatorClaim {
  wallet: string;
  display_name: string;
  operator_url: string | null;
  contact: string | null;
  /** EIP-191 personal_sign signature (0x-prefixed hex). */
  signature: string;
  /** Exact message that was signed; needed for replay-protection audit. */
  message: string;
  /** ISO timestamp inside the message. */
  timestamp: string;
  /** Random nonce inside the message. */
  nonce: string;
  /** True if ECDSA recovery matched `wallet` at write time. */
  verified: boolean;
  /** True if Chainalysis returned no sanctions hit at write time. */
  ofac_clean: boolean;
  /** ISO timestamp of when the Worker accepted (or queued) the claim. */
  claimed_at: string;
  /** Admin-set flag if a claim is contested. */
  claim_disputed?: boolean;

  // === Directory v0 additions (optional) ===
  available_for_hire?: boolean | null;
  hourly_rate_min_usd?: number | null;
  hourly_rate_max_usd?: number | null;
  expanded_description?: string | null;
  skills_tags?: string[];
  service_areas?: string[];
  languages?: string[];
  years_experience?: number | null;

  /** Set by /api/agents/directory/verify-hireable on a successful $5 USDC charge. */
  verified_hireable_until?: string | null;
  /** Cumulative count of successful directory premium renewals. */
  verified_hireable_renewal_count?: number;
  /** Cumulative total paid for directory premium across the wallet's lifetime. */
  verified_hireable_total_paid_usd?: number;
}

// === Claim nonce replay-protection ===
//
// Each signed claim carries a random nonce. We store the nonce with a
// short TTL after accepting it so re-submission of the same signed
// message (replay) fails. The TTL is set to the claim acceptance
// window plus a safety margin so a replay attempt always lands while
// the marker is still in KV.

export const CLAIM_NONCE_KEY_PREFIX = 'agent-rep:claim-nonce:';
/** Replay marker TTL in seconds. 15 minutes = 10-min acceptance window + 5-min margin. */
export const CLAIM_NONCE_TTL_SECONDS = 15 * 60;

export interface BanRecord {
  /** Wallet OR token_prefix being banned. */
  target: string;
  /** Short admin-facing reason (kept stable; surfaces in public ban list). */
  reason: string;
  /** Optional URL of supporting evidence. */
  evidence_url: string | null;
  banned_at: string;
  /** Identity marker for audit log (never the raw ADMIN_KEY). */
  banned_by_admin: string;
}

export interface ReputationMeta {
  generated_at: string;
  total_agents: number;
  last_refresh: string;
  /** Schema/algorithm version; bump when composite weights change. */
  version: string;
}

export interface ReputationRollup {
  date: string;
  generated_at: string;
  total_agents: number;
  cohort_spend_cap: number;
  leaderboards: Record<RankableMetric, string[]>;
}

// === Token helpers ===

/**
 * Public-facing token prefix used in reputation card URLs and the
 * by-token endpoint. First 16 chars of the bearer (e.g. "tf_live_18e54f47").
 * Never include the secret body in any public surface.
 */
export function tokenPrefix(token: string): string {
  return token.slice(0, 16);
}

/**
 * Recreate the exact string used in pay:no-charge:* events'
 * `token_short` field so we can aggregate free-trial counts back to
 * the originating token. Matches shortenToken() in payments.ts.
 * The format is "tf_live_{first8body}...{last8body}".
 */
export function tokenShortFromFull(token: string): string {
  if (!token || !token.startsWith('tf_live_')) return token.slice(0, 8) + '...';
  const body = token.slice(8);
  return `tf_live_${body.slice(0, 8)}...${body.slice(-8)}`;
}

// === Read helpers ===

/**
 * Resilient JSON read. KV's `get(key, 'json')` throws SyntaxError on
 * malformed values (truncated writes, legacy/garbage payloads), and
 * the thrown error has no stack frames into user code so the failing
 * key is impossible to identify. We read as text + parse here so any
 * malformed value is logged with its key and prefix, then treated as
 * absent. The rebuild keeps making progress instead of bombing on a
 * single bad record, and the observability log carries the breadcrumbs
 * to investigate the bad key out-of-band.
 */
async function readJson<T>(env: Env, key: string): Promise<T | null> {
  const raw = await env.TENSORFEED_CACHE.get(key, 'text');
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const preview = raw.length > 80 ? raw.slice(0, 80) + '...' : raw;
    console.error(`agent-rep readJson: malformed JSON at key=${key} (${raw.length}B): ${msg} | preview=${preview}`);
    return null;
  }
}

export function getReputationCardByWallet(env: Env, wallet: string): Promise<ReputationCard | null> {
  return readJson<ReputationCard>(env, WALLET_KEY_PREFIX + wallet.toLowerCase());
}

export function getReputationCardByToken(
  env: Env,
  tokenPrefixValue: string,
): Promise<ReputationCard | null> {
  // Token prefixes are lowercase hex by convention (tf_live_ + [0-9a-f]+).
  // Normalize the lookup key so callers that pass uppercase variants hit
  // the same record. Mirrors the wallet-lookup lowercase normalization.
  return readJson<ReputationCard>(env, TOKEN_KEY_PREFIX + tokenPrefixValue.toLowerCase());
}

export function getOperatorClaim(env: Env, wallet: string): Promise<OperatorClaim | null> {
  return readJson<OperatorClaim>(env, CLAIM_KEY_PREFIX + wallet.toLowerCase());
}

export function getPendingClaim(env: Env, wallet: string): Promise<OperatorClaim | null> {
  return readJson<OperatorClaim>(env, PENDING_CLAIM_KEY_PREFIX + wallet.toLowerCase());
}

export function getBanRecord(env: Env, target: string): Promise<BanRecord | null> {
  return readJson<BanRecord>(env, BAN_KEY_PREFIX + target.toLowerCase());
}

export async function listBans(env: Env): Promise<BanRecord[]> {
  const out: BanRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: BAN_KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const rec = await readJson<BanRecord>(env, k.name);
      if (rec) out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export async function getLeaderboard(
  env: Env,
  metric: RankableMetric,
  window: LeaderboardWindow,
): Promise<string[]> {
  return (await readJson<string[]>(env, LEADERBOARD_KEY_PREFIX + metric + ':' + window)) ?? [];
}

export function getRollup(env: Env, date: string): Promise<ReputationRollup | null> {
  return readJson<ReputationRollup>(env, ROLLUP_KEY_PREFIX + date);
}

export async function getReputationDates(env: Env): Promise<string[]> {
  return (await readJson<string[]>(env, DATES_INDEX_KEY)) ?? [];
}

export function getReputationMeta(env: Env): Promise<ReputationMeta | null> {
  return readJson<ReputationMeta>(env, META_KEY);
}

// === Write helpers (all non-critical; routed via safePut) ===

export function putReputationCard(env: Env, card: ReputationCard): Promise<boolean> {
  const writes: Promise<boolean>[] = [];
  if (card.wallet) {
    writes.push(
      safePut(env, env.TENSORFEED_CACHE, WALLET_KEY_PREFIX + card.wallet.toLowerCase(), JSON.stringify(card)),
    );
  }
  if (card.token_prefix) {
    writes.push(
      safePut(env, env.TENSORFEED_CACHE, TOKEN_KEY_PREFIX + card.token_prefix, JSON.stringify(card)),
    );
  }
  return Promise.all(writes).then((results) => results.every(Boolean));
}

export function putOperatorClaim(env: Env, claim: OperatorClaim): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    CLAIM_KEY_PREFIX + claim.wallet.toLowerCase(),
    JSON.stringify(claim),
  );
}

export function putPendingClaim(env: Env, claim: OperatorClaim): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    PENDING_CLAIM_KEY_PREFIX + claim.wallet.toLowerCase(),
    JSON.stringify(claim),
  );
}

export async function deletePendingClaim(env: Env, wallet: string): Promise<void> {
  await env.TENSORFEED_CACHE.delete(PENDING_CLAIM_KEY_PREFIX + wallet.toLowerCase());
}

/**
 * Check whether a claim nonce has been seen recently. Replay marker
 * is per-nonce, not per-wallet (a wallet can submit multiple claims;
 * each must have a fresh nonce). TTL = CLAIM_NONCE_TTL_SECONDS.
 */
export async function isClaimNonceUsed(env: Env, nonce: string): Promise<boolean> {
  const v = await env.TENSORFEED_CACHE.get(CLAIM_NONCE_KEY_PREFIX + nonce);
  return v !== null;
}

/**
 * Record a claim nonce as used. TTL'd so the bookkeeping doesn't grow
 * unbounded. Caller MUST do this AFTER the signature is verified and
 * BEFORE the claim record is written, so a duplicate concurrent
 * request loses the race here rather than mid-write.
 */
export async function recordClaimNonce(env: Env, nonce: string): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    CLAIM_NONCE_KEY_PREFIX + nonce,
    'used',
    { expirationTtl: CLAIM_NONCE_TTL_SECONDS },
  );
}

// === Admin audit log ===
//
// Every admin moderation action (ban, unban, claim approve, claim
// reject, etc) writes a row to agent-rep:admin-log:{date}:{seq}. The
// log is append-only and serves as the defensible audit trail for
// regulator / counsel asks about how TF moderated content. NEVER
// surface raw admin identities (ADMIN_KEY substrings) publicly; this
// log is admin-read only.

export const ADMIN_LOG_KEY_PREFIX = 'agent-rep:admin-log:';

export interface AdminActionLogEntry {
  /** ISO timestamp when the action was committed. */
  at: string;
  /** Stable string identifying the action class. */
  action:
    | 'ban'
    | 'unban'
    | 'claim_approve'
    | 'claim_reject'
    | 'claim_reject_and_ban'
    | 'jobs_remove'
    | 'jobs_submission_decide';
  /** Target of the action (wallet address or token prefix). Lowercased. */
  target: string;
  /** Free-text reason supplied by the admin or system. */
  reason: string;
  /** Optional supporting evidence URL. */
  evidence_url: string | null;
  /** Admin identity marker; never the raw ADMIN_KEY. */
  admin_id: string;
}

export async function recordAdminAction(env: Env, entry: AdminActionLogEntry): Promise<boolean> {
  const dateBucket = entry.at.slice(0, 10);
  const seq = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const key = ADMIN_LOG_KEY_PREFIX + dateBucket + ':' + seq;
  return safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify(entry));
}

export async function listAdminActions(
  env: Env,
  date: string,
): Promise<AdminActionLogEntry[]> {
  const prefix = ADMIN_LOG_KEY_PREFIX + date + ':';
  const out: AdminActionLogEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix, cursor });
    for (const k of page.keys) {
      const rec = await readJson<AdminActionLogEntry>(env, k.name);
      if (rec) out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** List pending claims waiting for admin review (paginated). */
export async function listPendingClaims(env: Env, limit = 100): Promise<OperatorClaim[]> {
  const out: OperatorClaim[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: PENDING_CLAIM_KEY_PREFIX, cursor });
    for (const k of page.keys) {
      if (out.length >= limit) break;
      const rec = await readJson<OperatorClaim>(env, k.name);
      if (rec) out.push(rec);
    }
    if (out.length >= limit) break;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => (a.claimed_at < b.claimed_at ? -1 : 1));
}

export function putBanRecord(env: Env, ban: BanRecord): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    BAN_KEY_PREFIX + ban.target.toLowerCase(),
    JSON.stringify(ban),
  );
}

export async function deleteBanRecord(env: Env, target: string): Promise<void> {
  await env.TENSORFEED_CACHE.delete(BAN_KEY_PREFIX + target.toLowerCase());
}

export function putLeaderboard(
  env: Env,
  metric: RankableMetric,
  window: LeaderboardWindow,
  ids: string[],
): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    LEADERBOARD_KEY_PREFIX + metric + ':' + window,
    JSON.stringify(ids),
  );
}

export function putRollup(env: Env, rollup: ReputationRollup): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    ROLLUP_KEY_PREFIX + rollup.date,
    JSON.stringify(rollup),
  );
}

export function putReputationDates(env: Env, dates: string[]): Promise<boolean> {
  const capped = dates.slice(0, MAX_DATES_INDEXED);
  return safePut(env, env.TENSORFEED_CACHE, DATES_INDEX_KEY, JSON.stringify(capped));
}

export function putReputationMeta(env: Env, meta: ReputationMeta): Promise<boolean> {
  return safePut(env, env.TENSORFEED_CACHE, META_KEY, JSON.stringify(meta));
}

// === Telemetry assembly ===
//
// Shapes pulled from payments.ts; redefined here so the store module
// is self-contained against future renames in payments.ts (any drift
// surfaces as a TypeScript build error).

interface CreditsRecord {
  balance: number;
  created: string;
  last_used: string;
  agent_ua: string;
  total_purchased: number;
}

interface TokenUsageEntry {
  endpoint: string;
  credits: number;
  at: string;
}

interface TokenUsageRecord {
  entries: TokenUsageEntry[];
}

interface PurchaseEntry {
  tx_hash: string;
  amount_usd: number;
  credits_added: number;
  block_number?: number;
  confirmed_at: string;
}

interface PurchaseRecord {
  entries: PurchaseEntry[];
}

interface TxRecord {
  amount_usd: number;
  credits: number;
  token: string;
  created: string;
  block_number?: number;
  sender_wallet?: string;
  pending?: boolean;
}

interface NoChargeEvent {
  ts: string;
  endpoint: string;
  cost_skipped: number;
  token_short: string;
}

interface DailyNoChargeRollup {
  events: NoChargeEvent[];
}

const PAY_CREDITS_PREFIX = 'pay:credits:';
const PAY_USAGE_PREFIX = 'pay:usage:';
const PAY_PURCHASES_PREFIX = 'pay:purchases:';
const PAY_TX_PREFIX = 'pay:tx:';
const PAY_NO_CHARGE_PREFIX = 'pay:no-charge:';
const PAY_NO_CHARGE_INDEX_KEY = 'pay:no-charge:index';

/**
 * Enumerate every token that ever bought credits. v0-scope: agents
 * without a paid token are out of scope for reputation tracking.
 * Paginated; safe for up to ~10000 tokens before we'd want a
 * streaming approach.
 */
export async function listAllPaidTokens(env: Env): Promise<string[]> {
  const tokens: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: PAY_CREDITS_PREFIX, cursor });
    for (const k of page.keys) {
      const token = k.name.slice(PAY_CREDITS_PREFIX.length);
      if (token) tokens.push(token);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return tokens;
}

/**
 * Walk pay:tx:* and group tokens by sender_wallet. Skips records
 * lacking a sender_wallet (legacy / pre-2026-05-05). Skips `pending`
 * records (claim-intent placeholders). Returns a Map keyed by
 * lowercased EOA → set of full token strings bound to that wallet.
 */
export async function buildWalletToTokensIndex(env: Env): Promise<Map<string, Set<string>>> {
  const index = new Map<string, Set<string>>();
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: PAY_TX_PREFIX, cursor });
    const records = await Promise.all(
      page.keys.map((k) => readJson<TxRecord>(env, k.name)),
    );
    for (const rec of records) {
      if (!rec || rec.pending) continue;
      if (!rec.sender_wallet || !rec.token) continue;
      const wallet = rec.sender_wallet.toLowerCase();
      let set = index.get(wallet);
      if (!set) {
        set = new Set<string>();
        index.set(wallet, set);
      }
      set.add(rec.token);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return index;
}

/**
 * Read pay:no-charge:* events and aggregate counts per token_short.
 * Optionally bounded to the last N days; v0 default scans every
 * indexed date because the index is capped at 3 years and per-day
 * payloads top out at ~200 events.
 *
 * Returns a Map<token_short, { count, daily_30d }>. The token_short
 * keys match tokenShortFromFull() so callers can build the lookup
 * key from the full token string.
 */
export interface FreeTrialAggregate {
  count: number;
  /** YYYY-MM-DD -> count for the last 30 days (for spend-spike baseline). */
  daily_30d: Record<string, number>;
}

export async function aggregateFreeTrialCalls(
  env: Env,
  today: string,
  daysBack?: number,
): Promise<Map<string, FreeTrialAggregate>> {
  const dates = (await readJson<string[]>(env, PAY_NO_CHARGE_INDEX_KEY)) ?? [];
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const map = new Map<string, FreeTrialAggregate>();
  for (const date of dates) {
    if (daysBack !== undefined) {
      const dayMs = Date.parse(date + 'T00:00:00Z');
      if (!Number.isFinite(dayMs)) continue;
      const ageDays = (todayMs - dayMs) / 86_400_000;
      if (ageDays > daysBack) continue;
    }
    const rollup = await readJson<DailyNoChargeRollup>(env, PAY_NO_CHARGE_PREFIX + date);
    if (!rollup || !Array.isArray(rollup.events)) continue;
    const within30d = isWithinDays(date, today, 30);
    for (const ev of rollup.events) {
      if (!ev.token_short) continue;
      let agg = map.get(ev.token_short);
      if (!agg) {
        agg = { count: 0, daily_30d: {} };
        map.set(ev.token_short, agg);
      }
      agg.count += 1;
      if (within30d) {
        agg.daily_30d[date] = (agg.daily_30d[date] ?? 0) + 1;
      }
    }
  }
  return map;
}

function isWithinDays(dateStr: string, today: string, days: number): boolean {
  const a = Date.parse(dateStr + 'T00:00:00Z');
  const b = Date.parse(today + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return (b - a) / 86_400_000 <= days;
}

/**
 * Assemble AgentTelemetry for a single token. Returns null if the
 * credits record is missing (token never existed or expired out).
 *
 * The wallet field is populated only when buildWalletToTokensIndex
 * (or another caller) supplies the mapping. Pass undefined for
 * pure token-only assembly.
 */
export async function assembleTelemetryForToken(
  env: Env,
  token: string,
  freeTrialMap: Map<string, FreeTrialAggregate>,
  wallet?: string,
): Promise<AgentTelemetry | null> {
  const credits = await readJson<CreditsRecord>(env, PAY_CREDITS_PREFIX + token);
  if (!credits) return null;
  const usage = await readJson<TokenUsageRecord>(env, PAY_USAGE_PREFIX + token);
  const purchases = await readJson<PurchaseRecord>(env, PAY_PURCHASES_PREFIX + token);

  const entries = usage?.entries ?? [];
  const activeDates = new Set<string>();
  const endpoints = new Set<string>();
  const daily_spend_30d: Record<string, number> = {};
  let paid_calls = 0;
  let total_credits_spent = 0;
  for (const e of entries) {
    if (!e.at) continue;
    const date = e.at.slice(0, 10);
    activeDates.add(date);
    if (e.endpoint) endpoints.add(e.endpoint);
    if (e.credits > 0) {
      paid_calls += 1;
      total_credits_spent += e.credits;
      daily_spend_30d[date] = (daily_spend_30d[date] ?? 0) + e.credits;
    }
  }

  const total_credits_purchased = credits.total_purchased ?? 0;

  // Pull free-trial counts via the token_short index. If a freeTrialMap
  // entry exists, fold its daily counts into the spend-history map under
  // the convention that free calls register as cost=1 for spike-detection
  // purposes only (they don't add to total_credits_spent).
  const tshort = tokenShortFromFull(token);
  const ft = freeTrialMap.get(tshort);
  const free_trial_calls = ft?.count ?? 0;
  if (ft) {
    for (const d of Object.keys(ft.daily_30d)) {
      activeDates.add(d);
    }
  }

  // We don't have direct per-token successful_calls / 4xx / 5xx from
  // the existing telemetry. paid_calls and free_trial_calls are both
  // SUCCESSFUL by definition (a 4xx pre-empts the payment middleware
  // before pay:usage gets written). Errors land in console logs but
  // not in any per-token KV record today. v0 treats:
  //   successful_calls = paid_calls + free_trial_calls
  //   errors_4xx = 0 (no per-token signal today; informational fields)
  //   errors_5xx = 0
  // When per-token error counters are added later, this assembler is
  // the single point of update.
  const successful_calls = paid_calls + free_trial_calls;

  return {
    token_prefix: tokenPrefix(token),
    wallet: wallet ?? null,
    first_seen: credits.created,
    last_active: credits.last_used,
    active_dates: Array.from(activeDates).sort(),
    endpoints_used: Array.from(endpoints).sort(),
    successful_calls,
    errors_4xx: 0,
    errors_5xx: 0,
    paid_calls,
    free_trial_calls,
    receipts_signed: paid_calls, // 1:1 with paid; AFTA signs every paid response
    total_credits_spent,
    total_credits_purchased,
    daily_spend_30d,
  };
}

/**
 * Merge multiple per-token AgentTelemetry into a single per-wallet
 * AgentTelemetry. Pure function (no I/O). first_seen takes the min,
 * last_active takes the max, all counts sum, sets union, daily_spend
 * sums per date.
 *
 * The wallet field on the result is whatever the caller supplies
 * (EIP-55 checksummed is expected; the calculator doesn't enforce).
 * token_prefix is set to null because a wallet may bind multiple
 * tokens; the by-wallet card displays the wallet, not a prefix.
 */
export function mergeTelemetryAcrossTokens(
  wallet: string,
  perTokenTelemetry: AgentTelemetry[],
): AgentTelemetry {
  if (perTokenTelemetry.length === 0) {
    throw new Error('mergeTelemetryAcrossTokens: at least one telemetry record required');
  }
  const merged: AgentTelemetry = {
    token_prefix: null,
    wallet,
    first_seen: perTokenTelemetry[0].first_seen,
    last_active: perTokenTelemetry[0].last_active,
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
  };
  const dateSet = new Set<string>();
  const epSet = new Set<string>();
  for (const t of perTokenTelemetry) {
    if (t.first_seen && t.first_seen < merged.first_seen) merged.first_seen = t.first_seen;
    if (t.last_active && t.last_active > merged.last_active) merged.last_active = t.last_active;
    for (const d of t.active_dates) dateSet.add(d);
    for (const e of t.endpoints_used) epSet.add(e);
    merged.successful_calls += t.successful_calls;
    merged.errors_4xx += t.errors_4xx;
    merged.errors_5xx += t.errors_5xx;
    merged.paid_calls += t.paid_calls;
    merged.free_trial_calls += t.free_trial_calls;
    merged.receipts_signed += t.receipts_signed;
    merged.total_credits_spent += t.total_credits_spent;
    merged.total_credits_purchased += t.total_credits_purchased;
    for (const [date, credits] of Object.entries(t.daily_spend_30d)) {
      merged.daily_spend_30d[date] = (merged.daily_spend_30d[date] ?? 0) + credits;
    }
  }
  merged.active_dates = Array.from(dateSet).sort();
  merged.endpoints_used = Array.from(epSet).sort();
  return merged;
}
