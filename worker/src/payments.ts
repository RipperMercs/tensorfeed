import { Env } from './types';

/**
 * Payment middleware for premium endpoints.
 *
 * Architecture: USDC on Base, credits-first with x402 fallback.
 *  - Agent buys credits once via /api/payment/buy-credits + /api/payment/confirm
 *  - Worker mints a bearer token, decrements credits per call (50ms latency)
 *  - Per-call x402 still works as a discovery fallback (slower, but no pre-flight)
 *
 * KV layout (TENSORFEED_CACHE namespace):
 *   pay:credits:{token}   -> { balance, created, last_used, agent_ua, total_purchased } (no TTL)
 *   pay:tx:{txHash}       -> { amount_usd, credits, token, created } (no TTL, replay protection)
 *   pay:quote:{nonce}     -> { amount_usd, credits, expires_at, created } (TTL: 30 min)
 *   pay:revenue:{date}    -> { total_usd, tx_count, unique_agents } (no TTL, daily rollup)
 *   pay:usage:{token}     -> { entries: TokenUsageEntry[] } ring buffer of last 100 calls per token
 *
 * On-chain trust anchor: Base mainnet RPC verifies the USDC Transfer event
 * to our wallet. We log the block_number on every accepted tx for forensic
 * traceability.
 *
 * Wallet attestation for MVP: TLS + multi-publication (llms.txt,
 * /api/payment/info, README, X bio). DNS TXT signed attestation deferred
 * to Phase 2 if a real attack surface emerges.
 */

// === Constants ===

const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const USDC_DECIMALS = 6;
const DEFAULT_BASE_RPC = 'https://mainnet.base.org';

const QUOTE_TTL_SECONDS = 30 * 60;
const TIER_COSTS: Record<1 | 2 | 3, number> = { 1: 1, 2: 1, 3: 5 };

// Volume tiers (credits per USD): higher tiers are cheaper per credit
function creditsPerUsd(amountUsd: number): { rate: number; tier: string } {
  if (amountUsd >= 200) return { rate: 80, tier: '40% volume discount' };
  if (amountUsd >= 30) return { rate: 65, tier: '25% volume discount' };
  if (amountUsd >= 5) return { rate: 55, tier: '10% volume discount' };
  return { rate: 50, tier: 'base' };
}

function calculateCredits(amountUsd: number): number {
  return Math.floor(amountUsd * creditsPerUsd(amountUsd).rate);
}

// === Internal types ===

interface CreditsRecord {
  balance: number;
  created: string;
  last_used: string;
  agent_ua: string;
  total_purchased: number;
}

interface QuoteRecord {
  amount_usd: number;
  credits: number;
  expires_at: number;
  created: string;
}

interface TxRecord {
  amount_usd: number;
  credits: number;
  token: string;
  created: string;
  block_number?: number;
}

interface DailyRollup {
  date: string;
  // Revenue side (credit purchases)
  total_usd: number;
  tx_count: number;
  // Usage side (premium endpoint calls)
  total_credits_charged: number;
  call_count: number;
  // Cross-cutting
  unique_agents: string[]; // capped at 100
  by_endpoint: Record<
    string,
    { calls: number; credits_charged: number; first_seen: string; last_seen: string }
  >;
  top_agents: Array<{
    agent_ua: string;
    calls: number;
    credits: number;
    purchased_usd: number;
    last_seen: string;
  }>; // capped at 25, sorted by calls desc
}

// === Helpers ===

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `tf_live_${toHex(bytes)}`;
}

function generateNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `tf-${toHex(bytes)}`;
}

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

// === On-chain verification ===

interface VerifiedTx {
  ok: boolean;
  reason?: string;
  amountUsd: number;
  blockNumber?: number;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

interface RpcReceipt {
  status: string;
  logs: RpcLog[];
  blockNumber: string;
}

export async function verifyBaseUSDCTransaction(
  txHash: string,
  env: Env,
): Promise<VerifiedTx> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, reason: 'invalid_tx_hash_format', amountUsd: 0 };
  }

  const rpcUrl = env.BASE_RPC_URL || DEFAULT_BASE_RPC;
  let receipt: RpcReceipt;
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { ok: false, reason: `rpc_http_${res.status}`, amountUsd: 0 };
    }
    const json = (await res.json()) as { result?: RpcReceipt | null; error?: { message: string } };
    if (json.error) {
      return { ok: false, reason: `rpc_error: ${json.error.message}`, amountUsd: 0 };
    }
    if (!json.result) {
      return { ok: false, reason: 'tx_not_found_or_pending', amountUsd: 0 };
    }
    receipt = json.result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `rpc_fetch_failed: ${msg}`, amountUsd: 0 };
  }

  if (receipt.status !== '0x1') {
    return { ok: false, reason: 'tx_failed_on_chain', amountUsd: 0 };
  }

  const ourWallet = env.PAYMENT_WALLET.toLowerCase();
  const usdcContractLower = USDC_BASE_CONTRACT.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcContractLower) continue;
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    // topics[2] is the recipient address (32-byte left-padded). Last 40 hex
    // chars are the actual address.
    const toAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
    if (toAddress !== ourWallet) continue;

    const amountWei = BigInt(log.data);
    const amountUsd = Number(amountWei) / Math.pow(10, USDC_DECIMALS);

    return {
      ok: true,
      amountUsd,
      blockNumber: parseInt(receipt.blockNumber, 16),
    };
  }

  return { ok: false, reason: 'no_usdc_transfer_to_wallet', amountUsd: 0 };
}

// === Daily rollup (revenue + usage analytics) ===
//
// Single KV key per day captures both purchase events (revenue side) and
// per-endpoint call events (usage side) plus a top-agent leaderboard.
// One read+write per event. KV is last-write-wins; under heavy concurrency
// some increments may be lost but at MVP scale this is acceptable. If/when
// concurrency becomes a problem, move to Durable Objects with atomic
// counters.

const ROLLUP_AGENT_CAP = 100;
const ROLLUP_TOP_AGENTS_CAP = 25;

function emptyRollup(date: string): DailyRollup {
  return {
    date,
    total_usd: 0,
    tx_count: 0,
    total_credits_charged: 0,
    call_count: 0,
    unique_agents: [],
    by_endpoint: {},
    top_agents: [],
  };
}

async function readRollup(env: Env, date: string): Promise<DailyRollup> {
  const existing = (await env.TENSORFEED_CACHE.get(`pay:rollup:${date}`, 'json')) as DailyRollup | null;
  return existing || emptyRollup(date);
}

async function writeRollup(env: Env, rollup: DailyRollup): Promise<void> {
  await env.TENSORFEED_CACHE.put(`pay:rollup:${rollup.date}`, JSON.stringify(rollup));
}

function noteUniqueAgent(rollup: DailyRollup, agentUa: string): void {
  if (!rollup.unique_agents.includes(agentUa)) {
    rollup.unique_agents.push(agentUa);
    if (rollup.unique_agents.length > ROLLUP_AGENT_CAP) {
      rollup.unique_agents = rollup.unique_agents.slice(-ROLLUP_AGENT_CAP);
    }
  }
}

function bumpTopAgent(
  rollup: DailyRollup,
  agentUa: string,
  delta: { calls?: number; credits?: number; purchased_usd?: number },
): void {
  const now = new Date().toISOString();
  let entry = rollup.top_agents.find(a => a.agent_ua === agentUa);
  if (!entry) {
    entry = { agent_ua: agentUa, calls: 0, credits: 0, purchased_usd: 0, last_seen: now };
    rollup.top_agents.push(entry);
  }
  entry.calls += delta.calls ?? 0;
  entry.credits += delta.credits ?? 0;
  entry.purchased_usd = parseFloat(((entry.purchased_usd ?? 0) + (delta.purchased_usd ?? 0)).toFixed(2));
  entry.last_seen = now;
  rollup.top_agents.sort((a, b) => b.calls - a.calls || b.credits - a.credits);
  if (rollup.top_agents.length > ROLLUP_TOP_AGENTS_CAP) {
    rollup.top_agents = rollup.top_agents.slice(0, ROLLUP_TOP_AGENTS_CAP);
  }
}

async function logRevenue(env: Env, amountUsd: number, agentUa: string): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const rollup = await readRollup(env, date);
    rollup.total_usd = parseFloat((rollup.total_usd + amountUsd).toFixed(2));
    rollup.tx_count += 1;
    noteUniqueAgent(rollup, agentUa);
    bumpTopAgent(rollup, agentUa, { purchased_usd: amountUsd });
    await writeRollup(env, rollup);
  } catch (e) {
    console.error('logRevenue failed:', e);
  }
}

/**
 * Record a successful premium endpoint call so we can see what's selling.
 * Caller should wrap in ctx.waitUntil so this never blocks the response.
 *
 * Writes to two places:
 *   1. The site-wide daily rollup (pay:rollup:{date})
 *   2. The per-token usage ring buffer (pay:usage:{token}) when token is set,
 *      so /api/payment/usage and the human-facing /account dashboard can
 *      show "you spent N credits across these endpoints" without scanning
 *      every daily rollup.
 */
export async function logPremiumUsage(
  env: Env,
  endpoint: string,
  agentUa: string,
  creditsCharged: number,
  token?: string,
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const rollup = await readRollup(env, date);

    rollup.call_count += 1;
    rollup.total_credits_charged += creditsCharged;
    noteUniqueAgent(rollup, agentUa);
    bumpTopAgent(rollup, agentUa, { calls: 1, credits: creditsCharged });

    const slot = rollup.by_endpoint[endpoint] || {
      calls: 0,
      credits_charged: 0,
      first_seen: now,
      last_seen: now,
    };
    slot.calls += 1;
    slot.credits_charged += creditsCharged;
    slot.last_seen = now;
    rollup.by_endpoint[endpoint] = slot;

    await writeRollup(env, rollup);

    if (token && token.startsWith('tf_live_')) {
      await appendTokenUsage(env, token, endpoint, creditsCharged, now);
    }
  } catch (e) {
    console.error('logPremiumUsage failed:', e);
  }
}

// === Per-token usage ring buffer ===

const TOKEN_USAGE_CAP = 100;

export interface TokenUsageEntry {
  endpoint: string;
  credits: number;
  at: string;
}

interface TokenUsageRecord {
  entries: TokenUsageEntry[];
}

async function appendTokenUsage(
  env: Env,
  token: string,
  endpoint: string,
  credits: number,
  at: string,
): Promise<void> {
  try {
    const existing = (await env.TENSORFEED_CACHE.get(`pay:usage:${token}`, 'json')) as TokenUsageRecord | null;
    const entries = existing?.entries ?? [];
    entries.push({ endpoint, credits, at });
    if (entries.length > TOKEN_USAGE_CAP) {
      entries.splice(0, entries.length - TOKEN_USAGE_CAP);
    }
    await env.TENSORFEED_CACHE.put(`pay:usage:${token}`, JSON.stringify({ entries }));
  } catch (e) {
    console.error('appendTokenUsage failed:', e);
  }
}

export interface TokenUsageSummary {
  ok: true;
  token_balance: number | null;
  total_calls: number;
  total_credits_spent: number;
  by_endpoint: Record<string, { calls: number; credits: number; last_seen: string }>;
  recent: TokenUsageEntry[];
}

// ── Per-token payment history (purchases) ───────────────────────────
//
// pay:purchases:{token} holds an append-only list of credit purchases
// scoped to one bearer token. Used by /api/payment/history so an
// agent can audit how its credits were funded (which on-chain txs
// added how many credits and when), independent of /api/payment/usage
// which logs how those credits were *spent*.
//
// Backward compat: tokens that confirmed before this field was added
// will read an empty list. Existing pay:tx:{txHash} records remain the
// authoritative replay-protection ledger; this is purely a per-token
// view layered on top.

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

const PURCHASES_CAP = 100;

export async function appendTokenPurchase(
  env: Env,
  token: string,
  purchase: PurchaseEntry,
): Promise<void> {
  try {
    const existing = (await env.TENSORFEED_CACHE.get(
      `pay:purchases:${token}`,
      'json',
    )) as PurchaseRecord | null;
    const entries = existing?.entries ?? [];
    entries.push(purchase);
    if (entries.length > PURCHASES_CAP) {
      entries.splice(0, entries.length - PURCHASES_CAP);
    }
    await env.TENSORFEED_CACHE.put(
      `pay:purchases:${token}`,
      JSON.stringify({ entries }),
    );
  } catch (e) {
    console.error('appendTokenPurchase failed:', e);
  }
}

export interface PaymentHistorySummary {
  ok: true;
  token_short: string;
  current_balance: number;
  total_purchased_usd: number;
  total_credits_added: number;
  purchase_count: number;
  purchases: PurchaseEntry[];
}

/**
 * Read the per-token purchase ledger. Auth-bound: caller must already
 * have validated the bearer token. Returns null if the token is not
 * recognized so the route handler can return 404 without leaking
 * existence to a wrong-secret guess.
 */
export async function getPaymentHistory(
  env: Env,
  token: string,
): Promise<PaymentHistorySummary | null> {
  if (!token.startsWith('tf_live_')) return null;
  const credits = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!credits) return null;

  const ledger = (await env.TENSORFEED_CACHE.get(
    `pay:purchases:${token}`,
    'json',
  )) as PurchaseRecord | null;
  const entries = ledger?.entries ?? [];

  let totalUsd = 0;
  let totalCredits = 0;
  for (const e of entries) {
    totalUsd += e.amount_usd;
    totalCredits += e.credits_added;
  }

  // Newest first for caller convenience.
  const sorted = entries.slice().sort((a, b) => (a.confirmed_at < b.confirmed_at ? 1 : -1));

  return {
    ok: true,
    token_short: token.slice(0, 16) + '...',
    current_balance: credits.balance,
    total_purchased_usd: Number(totalUsd.toFixed(6)),
    total_credits_added: totalCredits,
    purchase_count: entries.length,
    purchases: sorted,
  };
}

/**
 * Read the per-token usage ring buffer and aggregate it for the dashboard.
 * Returns null if the token isn't recognized.
 */
export async function getTokenUsage(env: Env, token: string): Promise<TokenUsageSummary | null> {
  if (!token.startsWith('tf_live_')) return null;
  const credits = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!credits) return null;

  const usage = (await env.TENSORFEED_CACHE.get(`pay:usage:${token}`, 'json')) as TokenUsageRecord | null;
  const entries = usage?.entries ?? [];

  const byEndpoint: Record<string, { calls: number; credits: number; last_seen: string }> = {};
  let totalCredits = 0;
  for (const e of entries) {
    totalCredits += e.credits;
    const slot = byEndpoint[e.endpoint] || { calls: 0, credits: 0, last_seen: e.at };
    slot.calls += 1;
    slot.credits += e.credits;
    if (e.at > slot.last_seen) slot.last_seen = e.at;
    byEndpoint[e.endpoint] = slot;
  }

  // Recent: newest first, capped at 25
  const recent = entries.slice().reverse().slice(0, 25);

  return {
    ok: true,
    token_balance: credits.balance,
    total_calls: entries.length,
    total_credits_spent: totalCredits,
    by_endpoint: byEndpoint,
    recent,
  };
}

/**
 * Read a single day's rollup for the admin dashboard. Returns null if no
 * data exists for that date.
 */
export async function getRollup(env: Env, date: string): Promise<DailyRollup | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return (await env.TENSORFEED_CACHE.get(`pay:rollup:${date}`, 'json')) as DailyRollup | null;
}

/**
 * List dates with rollup data available, newest first.
 */
export async function listRollupDates(env: Env): Promise<string[]> {
  const list = await env.TENSORFEED_CACHE.list({ prefix: 'pay:rollup:' });
  return list.keys
    .map(k => k.name.replace('pay:rollup:', ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
}

// === Public API ===

export async function getPaymentInfo(env: Env): Promise<unknown> {
  const sample = [1.0, 5.0, 30.0, 200.0].map(amt => ({
    amount_usd: amt,
    credits: calculateCredits(amt),
    rate: creditsPerUsd(amt).tier,
  }));
  return {
    ok: true,
    operator: {
      legal_entity: 'Pizza Robot Studios LLC',
      jurisdiction: 'California, USA',
      contact: 'evan@tensorfeed.ai',
      note: 'The legal entity behind the payment wallet. Premium credits are non-refundable per Section 17.5 of the Terms of Service at https://tensorfeed.ai/terms.',
    },
    wallet: {
      address: env.PAYMENT_WALLET,
      currency: 'USDC',
      network: 'base',
      contract: USDC_BASE_CONTRACT,
      decimals: USDC_DECIMALS,
    },
    pricing: {
      base_rate: '50 credits per $1 USDC ($0.02 per credit)',
      volume_bundles: sample,
      tiers: {
        '1_enhanced_data': '1 credit per call',
        '2_computed_intelligence': '1 credit per call (routing)',
        '3_bulk_streaming': '5 credits per call',
      },
    },
    flow: {
      with_quote: [
        'POST /api/payment/buy-credits with { amount_usd } -> { wallet, memo, credits, expires_at }',
        'Send USDC on Base to wallet',
        'POST /api/payment/confirm with { tx_hash, nonce } -> { token, credits, balance }',
        'Use Authorization: Bearer <token> on premium endpoints',
      ],
      x402_fallback: [
        'GET /api/premium/<endpoint> with no auth -> 402 with payment instructions',
        'Send USDC on Base to wallet',
        'GET /api/premium/<endpoint> with X-Payment-Tx header -> serves data + returns token in X-Payment-Token header',
      ],
    },
    verification: {
      attestation_method: 'TLS + multi-publication',
      address_published_at: [
        'https://tensorfeed.ai/llms.txt',
        'https://tensorfeed.ai/api/payment/info',
        'https://github.com/RipperMercs/tensorfeed (README)',
        'https://x.com/tensorfeed (bio)',
      ],
      note: 'Cross-check the wallet address across all four sources before sending funds. If any disagree, do not send.',
    },
    terms: {
      no_training: 'Premium data is licensed for inference use only. Use of TensorFeed premium data for training, fine-tuning, evaluation, or distillation of ML models is prohibited.',
      refund: 'All credit purchases are final and non-refundable per Section 17.5 of the Terms. Credits do not expire and remain redeemable across tensorfeed.ai and terminalfeed.io. Buy small, top up as needed.',
      sanctions: 'Premium API access is unavailable to persons or entities subject to OFAC, EU, UK, or UN sanctions, and to residents of comprehensively sanctioned jurisdictions (Cuba, Iran, North Korea, Syria, Crimea, Donetsk, Luhansk). See https://tensorfeed.ai/terms#premium Section 17.9. Inbound credit-purchase transactions are screened against the Chainalysis public sanctions API.',
      acceptable_use: 'No reselling of bearer tokens or proxy APIs that reproduce the Premium API surface. No use of premium responses to train or evaluate competing models. See Section 17.12.',
      governing_law: 'California law, exclusive venue Los Angeles County, California. See Section 15 Governing Law and Venue.',
      kill_switch: env.PAYMENT_ENABLED === 'true' ? 'enabled' : 'disabled',
    },
  };
}

export async function createQuote(
  env: Env,
  amountUsd: number,
): Promise<{ nonce: string; quote: QuoteRecord; wallet: string }> {
  const credits = calculateCredits(amountUsd);
  const nonce = generateNonce();
  const expiresAt = Date.now() + QUOTE_TTL_SECONDS * 1000;
  const quote: QuoteRecord = {
    amount_usd: amountUsd,
    credits,
    expires_at: expiresAt,
    created: new Date().toISOString(),
  };
  await env.TENSORFEED_CACHE.put(`pay:quote:${nonce}`, JSON.stringify(quote), {
    expirationTtl: QUOTE_TTL_SECONDS,
  });
  return { nonce, quote, wallet: env.PAYMENT_WALLET };
}

export type ConfirmResult =
  | { ok: true; token: string; credits: number; balance: number; tx_amount_usd: number; rate: string }
  | { ok: false; error: string; reason?: string };

export async function confirmPayment(
  env: Env,
  txHash: string,
  request: Request,
  nonce?: string,
): Promise<ConfirmResult> {
  const existingTx = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
  if (existingTx) {
    return {
      ok: false,
      error: 'tx_already_claimed',
      reason: 'This transaction has already been used to mint credits.',
    };
  }

  let quote: QuoteRecord | null = null;
  if (nonce) {
    quote = (await env.TENSORFEED_CACHE.get(`pay:quote:${nonce}`, 'json')) as QuoteRecord | null;
    if (!quote) {
      return {
        ok: false,
        error: 'quote_not_found_or_expired',
        reason: 'Quote may have expired (30 min TTL). Call /api/payment/confirm without nonce to use the default rate.',
      };
    }
    if (Date.now() > quote.expires_at) {
      return {
        ok: false,
        error: 'quote_expired',
        reason: 'Call /api/payment/confirm without nonce to use the default rate based on actual tx amount.',
      };
    }
  }

  const verified = await verifyBaseUSDCTransaction(txHash, env);
  if (!verified.ok) {
    return { ok: false, error: 'verification_failed', reason: verified.reason };
  }

  let credits: number;
  let rate: string;
  if (quote && Math.abs(verified.amountUsd - quote.amount_usd) < 0.01) {
    credits = quote.credits;
    rate = creditsPerUsd(quote.amount_usd).tier;
  } else {
    credits = calculateCredits(verified.amountUsd);
    rate = creditsPerUsd(verified.amountUsd).tier;
  }

  const token = generateToken();
  const now = new Date().toISOString();
  const tokenRecord: CreditsRecord = {
    balance: credits,
    created: now,
    last_used: now,
    agent_ua: request.headers.get('User-Agent') || 'unknown',
    total_purchased: credits,
  };
  const txRec: TxRecord = {
    amount_usd: verified.amountUsd,
    credits,
    token,
    created: now,
    block_number: verified.blockNumber,
  };

  await Promise.all([
    env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
    env.TENSORFEED_CACHE.put(`pay:tx:${txHash}`, JSON.stringify(txRec)),
    nonce ? env.TENSORFEED_CACHE.delete(`pay:quote:${nonce}`) : Promise.resolve(),
    logRevenue(env, verified.amountUsd, request.headers.get('User-Agent') || 'unknown'),
    appendTokenPurchase(env, token, {
      tx_hash: txHash,
      amount_usd: verified.amountUsd,
      credits_added: credits,
      block_number: verified.blockNumber,
      confirmed_at: now,
    }),
  ]);

  return {
    ok: true,
    token,
    credits,
    balance: credits,
    tx_amount_usd: verified.amountUsd,
    rate,
  };
}

export type BalanceResult =
  | { ok: true; balance: number; created: string; last_used: string; total_purchased: number }
  | { ok: false; error: string };

export async function getBalance(env: Env, token: string): Promise<BalanceResult> {
  if (!token.startsWith('tf_live_')) {
    return { ok: false, error: 'invalid_token_format' };
  }
  const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
  if (!record) {
    return { ok: false, error: 'token_not_found' };
  }
  return {
    ok: true,
    balance: record.balance,
    created: record.created,
    last_used: record.last_used,
    total_purchased: record.total_purchased,
  };
}

// === Cross-Worker validate-and-charge ===
//
// Same atomic credit-charge logic that requirePayment runs internally,
// but exposed as a pure function so the /api/internal/validate-and-charge
// HTTP wrapper can call it from sister-site Workers (TerminalFeed, etc.).
//
// Bearer-token-only path. The x402 fallback is NOT supported here because
// sister sites have already authenticated their end users via this same
// token; they should not be re-broadcasting fresh on-chain payments
// through a server-to-server hop.
//
// Side effects: decrements `pay:credits:{token}` on success. The caller
// is responsible for calling logPremiumUsage (typically via
// ctx.waitUntil) so the daily rollup and per-token usage history get
// updated. We keep this helper pure-over-credits so internal callers
// can decide their own logging cadence.

export type ValidateAndChargeReason =
  | 'invalid_token'
  | 'insufficient_credits'
  | 'expired'
  | 'replayed';

export type ValidateAndChargeResult =
  | { ok: true; credits_remaining: number }
  | { ok: false; reason: ValidateAndChargeReason };

export async function validateAndCharge(
  env: Env,
  args: { token: string; cost: number; endpoint?: string },
): Promise<ValidateAndChargeResult> {
  const { token, cost } = args;
  if (
    typeof token !== 'string' ||
    !token ||
    !token.startsWith('tf_live_')
  ) {
    return { ok: false, reason: 'invalid_token' };
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, reason: 'invalid_token' };
  }
  const record = (await env.TENSORFEED_CACHE.get(
    `pay:credits:${token}`,
    'json',
  )) as CreditsRecord | null;
  if (!record) {
    return { ok: false, reason: 'invalid_token' };
  }
  if (record.balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }
  record.balance -= cost;
  record.last_used = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
  return { ok: true, credits_remaining: record.balance };
}

// === Middleware: requirePayment ===

export interface PaymentResult {
  paid: boolean;
  response?: Response;
  tokenRemaining?: number;
  token?: string;
  newToken?: boolean; // true if minted via x402 (caller should advertise it)
}

export async function requirePayment(
  request: Request,
  env: Env,
  tier: 1 | 2 | 3,
): Promise<PaymentResult> {
  if (env.PAYMENT_ENABLED !== 'true') {
    return {
      paid: false,
      response: jsonResponse(
        {
          ok: false,
          error: 'payment_disabled',
          message: 'Premium endpoints are temporarily disabled. See /api/payment/info for status.',
        },
        503,
      ),
    };
  }

  const cost = TIER_COSTS[tier];

  // Path 1: bearer token (credits flow, primary)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (!token.startsWith('tf_live_')) {
      return {
        paid: false,
        response: jsonResponse({ ok: false, error: 'invalid_token_format' }, 401),
      };
    }
    const record = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as CreditsRecord | null;
    if (!record) {
      return { paid: false, response: jsonResponse({ ok: false, error: 'token_not_found' }, 401) };
    }
    if (record.balance < cost) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'insufficient_credits',
            balance: record.balance,
            required: cost,
            top_up_at: '/api/payment/buy-credits',
          },
          402,
        ),
      };
    }
    record.balance -= cost;
    record.last_used = new Date().toISOString();
    await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
    return { paid: true, tokenRemaining: record.balance, token };
  }

  // Path 2: x402 fallback (per-call payment via tx hash)
  const txHash = request.headers.get('X-Payment-Tx');
  if (txHash) {
    const existing = (await env.TENSORFEED_CACHE.get(`pay:tx:${txHash}`, 'json')) as TxRecord | null;
    if (existing) {
      // Already claimed; charge against the existing token if it has balance
      const tokenRecord = (await env.TENSORFEED_CACHE.get(`pay:credits:${existing.token}`, 'json')) as CreditsRecord | null;
      if (tokenRecord && tokenRecord.balance >= cost) {
        tokenRecord.balance -= cost;
        tokenRecord.last_used = new Date().toISOString();
        await env.TENSORFEED_CACHE.put(`pay:credits:${existing.token}`, JSON.stringify(tokenRecord));
        return { paid: true, tokenRemaining: tokenRecord.balance, token: existing.token };
      }
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'tx_already_used',
            message: 'This tx was already claimed and the issued token is depleted.',
            token: existing.token,
            top_up_at: '/api/payment/buy-credits',
          },
          409,
        ),
      };
    }

    const verified = await verifyBaseUSDCTransaction(txHash, env);
    if (!verified.ok) {
      return {
        paid: false,
        response: jsonResponse(
          { ok: false, error: 'tx_verification_failed', reason: verified.reason },
          402,
        ),
      };
    }

    const credits = calculateCredits(verified.amountUsd);
    if (credits < cost) {
      return {
        paid: false,
        response: jsonResponse(
          {
            ok: false,
            error: 'insufficient_credits_from_tx',
            tx_credits: credits,
            required: cost,
            tx_amount_usd: verified.amountUsd,
            message: `Your tx of $${verified.amountUsd.toFixed(2)} buys ${credits} credits, but this call requires ${cost}. Send more.`,
          },
          402,
        ),
      };
    }

    const token = generateToken();
    const now = new Date().toISOString();
    const tokenRecord: CreditsRecord = {
      balance: credits - cost,
      created: now,
      last_used: now,
      agent_ua: request.headers.get('User-Agent') || 'unknown',
      total_purchased: credits,
    };
    const txRec: TxRecord = {
      amount_usd: verified.amountUsd,
      credits,
      token,
      created: now,
      block_number: verified.blockNumber,
    };

    await Promise.all([
      env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(tokenRecord)),
      env.TENSORFEED_CACHE.put(`pay:tx:${txHash}`, JSON.stringify(txRec)),
      logRevenue(env, verified.amountUsd, request.headers.get('User-Agent') || 'unknown'),
      appendTokenPurchase(env, token, {
        tx_hash: txHash,
        amount_usd: verified.amountUsd,
        credits_added: credits,
        block_number: verified.blockNumber,
        confirmed_at: now,
      }),
    ]);

    return {
      paid: true,
      tokenRemaining: tokenRecord.balance,
      token,
      newToken: true,
    };
  }

  // No payment provided -> return 402 with full payment instructions
  return { paid: false, response: paymentRequiredResponse(env, cost, tier) };
}

function paymentRequiredResponse(env: Env, creditsRequired: number, tier: number): Response {
  const minUsd = Math.max(1, creditsRequired * 0.02);
  return jsonResponse(
    {
      ok: false,
      error: 'payment_required',
      message: 'This is a paid endpoint. Pay via USDC on Base or use a bearer token.',
      payment: {
        wallet: env.PAYMENT_WALLET,
        currency: 'USDC',
        network: 'base',
        contract: USDC_BASE_CONTRACT,
        minimum_amount_usd: minUsd,
        tier,
        credits_required: creditsRequired,
        credits_per_usd: 50,
      },
      endpoints: {
        info: '/api/payment/info',
        quote: '/api/payment/buy-credits',
        confirm: '/api/payment/confirm',
        balance: '/api/payment/balance',
      },
      flow_options: {
        recommended: 'Buy credits once via /api/payment/buy-credits, get a bearer token, use Authorization: Bearer <token> for all future calls (50ms latency).',
        x402_fallback: 'Send USDC on Base, retry this request with X-Payment-Tx: <txHash> header. Slower but no pre-flight needed.',
      },
    },
    402,
    {
      'X-Payment-Address': env.PAYMENT_WALLET,
      'X-Payment-Currency': 'USDC',
      'X-Payment-Network': 'base',
      'X-Payment-Credits-Required': String(creditsRequired),
      'X-Payment-Min-USD': String(minUsd),
    },
  );
}
