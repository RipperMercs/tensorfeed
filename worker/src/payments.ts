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

interface RevenueRecord {
  total_usd: number;
  tx_count: number;
  unique_agents: string[];
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

// === Revenue rollup ===

async function logRevenue(env: Env, amountUsd: number, agentUa: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `pay:revenue:${date}`;
  try {
    const existing = (await env.TENSORFEED_CACHE.get(key, 'json')) as RevenueRecord | null;
    const record: RevenueRecord = existing || { total_usd: 0, tx_count: 0, unique_agents: [] };
    record.total_usd = parseFloat((record.total_usd + amountUsd).toFixed(2));
    record.tx_count += 1;
    if (!record.unique_agents.includes(agentUa)) {
      record.unique_agents.push(agentUa);
      // Cap at 100 unique UAs/day to keep the record bounded
      if (record.unique_agents.length > 100) record.unique_agents = record.unique_agents.slice(-100);
    }
    await env.TENSORFEED_CACHE.put(key, JSON.stringify(record));
  } catch (e) {
    console.error('logRevenue failed:', e);
  }
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
      refund: 'Email evan@tensorfeed.ai with the tx hash within 24h of the charge for a manual refund.',
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
