import { Env } from './types';

/**
 * Cross-chain x402 settlement cost and finality.
 *
 * For an AI agent settling a small USDC micro-payment, this answers two
 * questions per supported x402 rail: what does it cost, and how fast does it
 * finalize. The agent-relevant number is net settlement cost as a percentage
 * of the payment, paired with finality time.
 *
 * Honesty about the dominant path: Coinbase's CDP facilitator settles roughly
 * three quarters of all x402 volume and sponsors the on-chain gas, so for a
 * facilitator-routed payment the marginal cost is a flat $0.001 (after the
 * first 1000 settlements per month are free), NOT gas as a percent of the
 * payment. We surface BOTH the raw self-settle on-chain cost AND that CDP
 * facilitator reality, because among CDP-supported rails the real
 * differentiator is finality, not gas. Solana reaches practical finality in
 * about 13 seconds versus Base at roughly 20 minutes for hard L1 finality.
 *
 * Data sources:
 *   - EVM rails: JSON-RPC eth_gasPrice against each chain's public RPC.
 *   - Solana: getRecentPrioritizationFees against a Solana RPC (public
 *     mainnet-beta by default, overridable with SOLANA_RPC_URL or HELIUS_API_KEY).
 *   - Native token prices: Coinbase public spot price API (no key).
 *   - CDP facilitator pricing: Coinbase published x402 facilitator pricing.
 *
 * Raw EVM cost is execution-layer gas only. For L2 rails the L1 data fee is
 * additional and small since EIP-4844 blobs; it is excluded and flagged.
 * Finality figures are published chain characteristics, not live measurements.
 *
 * Free  /api/settlement-rails: current cost + finality snapshot for every rail.
 * Paid  /api/premium/settlement/rail-verdict?payment_usd=&prefer=: the signed
 *       recommended rail for a given payment size, with a full ranking.
 */

// === Rail definitions ===

export type RailVm = 'evm' | 'svm';

export interface RailDef {
  id: string;
  label: string;
  caip2: string;
  vm: RailVm;
  native_token: string;
  native_price_pair: string; // Coinbase spot pair, e.g. ETH-USD
  rpc_default: string;
  is_l2: boolean;
  cdp_supported: boolean;
  finality_soft_seconds: number;
  finality_hard_seconds: number;
  finality_note: string;
  finality_source: string;
}

// USDC ERC-20 transfer costs roughly 45k to 65k gas units depending on warm
// versus cold recipient state. 55000 is a representative midpoint; the raw
// cost is a fallback signal anyway (CDP sponsors gas on the dominant path).
export const USDC_TRANSFER_GAS_UNITS = 55000;

// Solana base signature fee (one signer) plus a compute-unit budget large
// enough to cover the x402 exact-scheme instruction layout (two ComputeBudget
// instructions plus a TransferChecked). Priority fee = cuPrice * cuLimit / 1e6.
export const SOLANA_BASE_FEE_LAMPORTS = 5000;
export const SOLANA_CU_LIMIT = 50000;

// The reference payment used to express cost as a percentage in the free snapshot.
export const PAYMENT_REFERENCE_USD = 0.01;

export const CDP_FACILITATOR = {
  provider: 'cdp',
  fee_usd_after_free_tier: 0.001,
  free_settlements_per_month: 1000,
  gas_sponsored: true,
  scheme: 'exact',
};

// Traditional card-processing baseline for the cross-protocol comparison. A
// representative online card rate (Stripe-style standard pricing) is 2.9% of the
// charge plus a fixed $0.30. The fixed component is what makes card uneconomical
// for the sub-dollar payments agents settle, which is exactly why it is worth
// surfacing next to the x402 path.
export const CARD_FEE = {
  pct: 0.029,
  fixed_usd: 0.30,
  label: 'Card (2.9% + $0.30)',
};

export const RAILS: RailDef[] = [
  {
    id: 'base',
    label: 'Base',
    caip2: 'eip155:8453',
    vm: 'evm',
    native_token: 'ETH',
    native_price_pair: 'ETH-USD',
    rpc_default: 'https://mainnet.base.org',
    is_l2: true,
    cdp_supported: true,
    finality_soft_seconds: 2,
    finality_hard_seconds: 1200,
    finality_note: 'About 2s L2 blocks for soft confirmation, roughly 20 min for hard L1 batch finality.',
    finality_source: 'https://docs.base.org/base-chain/network-information/transaction-finality',
  },
  {
    id: 'solana',
    label: 'Solana',
    caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    vm: 'svm',
    native_token: 'SOL',
    native_price_pair: 'SOL-USD',
    rpc_default: 'https://api.mainnet-beta.solana.com',
    is_l2: false,
    cdp_supported: true,
    finality_soft_seconds: 2,
    finality_hard_seconds: 13,
    finality_note: 'About 1 to 2s for a confirmed (optimistic) commitment, roughly 13s for finalized (32 slots).',
    finality_source: 'https://solana.com/developers/guides/advanced/confirmation',
  },
  {
    id: 'polygon',
    label: 'Polygon PoS',
    caip2: 'eip155:137',
    vm: 'evm',
    native_token: 'POL',
    native_price_pair: 'POL-USD',
    rpc_default: 'https://polygon-rpc.com',
    is_l2: false,
    cdp_supported: true,
    finality_soft_seconds: 5,
    finality_hard_seconds: 1020,
    finality_note: 'Seconds for probabilistic confirmation, roughly 17 min for deep checkpoint finality.',
    finality_source: 'https://docs.chain.link/ccip/ccip-execution-latency',
  },
  {
    id: 'arbitrum',
    label: 'Arbitrum One',
    caip2: 'eip155:42161',
    vm: 'evm',
    native_token: 'ETH',
    native_price_pair: 'ETH-USD',
    rpc_default: 'https://arb1.arbitrum.io/rpc',
    is_l2: true,
    cdp_supported: true,
    finality_soft_seconds: 0.25,
    finality_hard_seconds: 900,
    finality_note: 'Sub-second sequencer soft confirmation, roughly 15 min for L1 finality.',
    finality_source: 'https://docs.chain.link/ccip/ccip-execution-latency',
  },
  {
    id: 'avalanche',
    label: 'Avalanche C-Chain',
    caip2: 'eip155:43114',
    vm: 'evm',
    native_token: 'AVAX',
    native_price_pair: 'AVAX-USD',
    rpc_default: 'https://api.avax.network/ext/bc/C/rpc',
    is_l2: false,
    cdp_supported: false,
    finality_soft_seconds: 1,
    finality_hard_seconds: 2,
    finality_note: 'Sub-second to about 1s single-slot finality (Snowman). Not on the CDP facilitator, so self-settle only.',
    finality_source: 'https://docs.chain.link/ccip/ccip-execution-latency',
  },
];

// === Pure cost math ===

export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Raw EVM execution-layer cost in USD for a USDC transfer.
 * Returns null if the gas price or native token price is unavailable.
 */
export function computeEvmRawCostUsd(
  gasUnits: number,
  gasPriceWei: number | null,
  nativeUsd: number | null,
): number | null {
  if (gasPriceWei == null || nativeUsd == null) return null;
  const nativeAmount = (gasUnits * gasPriceWei) / 1e18;
  return round6(nativeAmount * nativeUsd);
}

/**
 * Raw Solana cost in USD for an SPL USDC transfer.
 * cuPriceMicroLamports is the per-compute-unit priority price (null treated as 0).
 * Returns null if the SOL price is unavailable.
 */
export function computeSolanaRawCostUsd(
  baseFeeLamports: number,
  cuPriceMicroLamports: number | null,
  cuLimit: number,
  solUsd: number | null,
): number | null {
  if (solUsd == null) return null;
  const priorityLamports = Math.ceil(((cuPriceMicroLamports ?? 0) * cuLimit) / 1e6);
  const totalLamports = baseFeeLamports + priorityLamports;
  return round6((totalLamports / 1e9) * solUsd);
}

// === Snapshot shapes ===

export interface RailCost {
  id: string;
  label: string;
  caip2: string;
  vm: RailVm;
  native_token: string;
  native_token_price_usd: number | null;
  cdp_supported: boolean;
  raw_onchain_cost_usd: number | null;
  raw_cost_pct_of_reference: number | null;
  includes_l1_data_fee: boolean;
  gas_signal: string;
  finality_soft_seconds: number;
  finality_hard_seconds: number;
  finality_note: string;
  finality_source: string;
}

export interface RailsSnapshot {
  capturedAt: string;
  payment_reference_usd: number;
  rails: RailCost[];
  cdp_facilitator: typeof CDP_FACILITATOR & { supported_rails: string[] };
  best_rail_quick: { id: string; label: string; reason: string };
  sources: Array<{ name: string; url: string; license: string }>;
  notes: string[];
}

export interface RefreshInputs {
  capturedAt: string;
  gasPriceWei: Record<string, number | null>; // by rail id (evm only)
  solanaCuPriceMicroLamports: number | null;
  prices: Record<string, number | null>; // by native_price_pair
}

const SOURCES = [
  { name: 'EVM rail gas price', url: 'https://docs.base.org/base-chain/network-information/network-fees', license: 'Public chain JSON-RPC data' },
  { name: 'Solana priority fee', url: 'https://solana.com/docs/rpc/http/getrecentprioritizationfees', license: 'Public chain JSON-RPC data' },
  { name: 'Coinbase spot prices', url: 'https://api.coinbase.com', license: 'Public market data' },
  { name: 'Coinbase CDP x402 facilitator pricing', url: 'https://docs.cdp.coinbase.com/x402/core-concepts/facilitator', license: 'Coinbase published pricing' },
];

const BASE_NOTES = [
  'Raw EVM cost is execution-layer gas only. For L2 rails (Base, Arbitrum) the L1 data fee is additional and small since EIP-4844 blobs.',
  'Via the CDP facilitator (the dominant x402 path) gas is sponsored and the marginal cost is a flat $0.001 after 1000 free settlements per month, so among CDP-supported rails the real differentiator is finality, not gas.',
  'Finality figures are published chain characteristics, not live TensorFeed measurements.',
  'Raw Solana cost assumes a single signer self-settle. Through CDP the facilitator is the fee payer.',
];

/**
 * Build a snapshot from fetched inputs. Pure: no network, no clock.
 */
export function buildSnapshot(inputs: RefreshInputs, extraNotes: string[] = []): RailsSnapshot {
  const rails: RailCost[] = RAILS.map((r) => {
    const nativeUsd = inputs.prices[r.native_price_pair] ?? null;
    let raw: number | null;
    let gasSignal: string;
    if (r.vm === 'evm') {
      const gp = inputs.gasPriceWei[r.id] ?? null;
      raw = computeEvmRawCostUsd(USDC_TRANSFER_GAS_UNITS, gp, nativeUsd);
      gasSignal = gp != null ? `${USDC_TRANSFER_GAS_UNITS} gas units at live eth_gasPrice` : 'gas price unavailable';
    } else {
      raw = computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, inputs.solanaCuPriceMicroLamports, SOLANA_CU_LIMIT, nativeUsd);
      gasSignal = inputs.solanaCuPriceMicroLamports != null
        ? 'base signature fee plus live priority fee'
        : 'base signature fee only (priority fee unavailable)';
    }
    const pct = raw != null && PAYMENT_REFERENCE_USD > 0 ? round2((raw / PAYMENT_REFERENCE_USD) * 100) : null;
    return {
      id: r.id,
      label: r.label,
      caip2: r.caip2,
      vm: r.vm,
      native_token: r.native_token,
      native_token_price_usd: nativeUsd,
      cdp_supported: r.cdp_supported,
      raw_onchain_cost_usd: raw,
      raw_cost_pct_of_reference: pct,
      includes_l1_data_fee: false,
      gas_signal: gasSignal,
      finality_soft_seconds: r.finality_soft_seconds,
      finality_hard_seconds: r.finality_hard_seconds,
      finality_note: r.finality_note,
      finality_source: r.finality_source,
    };
  });

  const supportedRails = RAILS.filter((r) => r.cdp_supported).map((r) => r.id);

  const snapshot: RailsSnapshot = {
    capturedAt: inputs.capturedAt,
    payment_reference_usd: PAYMENT_REFERENCE_USD,
    rails,
    cdp_facilitator: { ...CDP_FACILITATOR, supported_rails: supportedRails },
    best_rail_quick: { id: '', label: '', reason: '' },
    sources: SOURCES,
    notes: [...BASE_NOTES, ...extraNotes],
  };

  const verdict = buildRailVerdict(snapshot, PAYMENT_REFERENCE_USD, 'balanced');
  snapshot.best_rail_quick = {
    id: verdict.recommended_rail.id,
    label: verdict.recommended_rail.label,
    reason: verdict.recommended_rail.reason,
  };
  return snapshot;
}

// === Verdict ===

export type RailPreference = 'balanced' | 'cost' | 'finality';

export function isRailPreference(s: string): s is RailPreference {
  return s === 'balanced' || s === 'cost' || s === 'finality';
}

export interface RailRankRow {
  id: string;
  label: string;
  caip2: string;
  cdp_supported: boolean;
  settle_path: 'cdp_facilitator' | 'self_settle';
  effective_cost_usd: number | null;
  effective_cost_pct: number | null;
  raw_onchain_cost_usd: number | null;
  raw_cost_pct: number | null;
  finality_soft_seconds: number;
  finality_hard_seconds: number;
}

export interface CrossProtocolComparison {
  payment_usd: number;
  x402: { method: string; cost_usd: number | null; pct_of_payment: number | null };
  card: { method: string; cost_usd: number; pct_of_payment: number | null };
  x402_saves_usd: number | null;
  card_cost_multiple_vs_x402: number | null;
  note: string;
}

export interface RailVerdictResult {
  ok: true;
  verdict_kind: 'settlement_rail';
  payment_usd: number;
  prefer: RailPreference;
  recommended_rail: { id: string; label: string; caip2: string; reason: string };
  ranking: RailRankRow[];
  accepted_rails_filter: string[] | null;
  cross_protocol: CrossProtocolComparison;
  cdp_facilitator: typeof CDP_FACILITATOR & { supported_rails: string[] };
  via_cdp_note: string;
  capturedAt: string;
  sources: Array<{ name: string; url: string; license: string }>;
  notes: string[];
  license: string;
}

const VIA_CDP_NOTE =
  'Through the CDP facilitator gas is sponsored and the marginal cost is a flat $0.001 after 1000 free settlements per month. Among CDP-supported rails the differentiator is therefore finality, not gas. Raw on-chain cost is the self-settle fallback view.';

const LICENSE = 'Public on-chain and market data; TensorFeed-derived cost and finality verdict.';

function effectiveCostUsd(row: RailCost): number | null {
  if (row.cdp_supported) return CDP_FACILITATOR.fee_usd_after_free_tier;
  return row.raw_onchain_cost_usd;
}

export function buildRailVerdict(
  snapshot: RailsSnapshot,
  paymentUsd: number,
  prefer: RailPreference,
  acceptedRails: string[] | null = null,
): RailVerdictResult {
  const allRows: RailRankRow[] = snapshot.rails.map((r) => {
    const eff = effectiveCostUsd(r);
    const effPct = eff != null && paymentUsd > 0 ? round2((eff / paymentUsd) * 100) : null;
    return {
      id: r.id,
      label: r.label,
      caip2: r.caip2,
      cdp_supported: r.cdp_supported,
      settle_path: r.cdp_supported ? 'cdp_facilitator' : 'self_settle',
      effective_cost_usd: eff != null ? round6(eff) : null,
      effective_cost_pct: effPct,
      raw_onchain_cost_usd: r.raw_onchain_cost_usd,
      raw_cost_pct: r.raw_onchain_cost_usd != null && paymentUsd > 0 ? round2((r.raw_onchain_cost_usd / paymentUsd) * 100) : null,
      finality_soft_seconds: r.finality_soft_seconds,
      finality_hard_seconds: r.finality_hard_seconds,
    };
  });

  const notes = [...snapshot.notes];

  // Optional accepted_rails filter: rank only the rails the recipient accepts.
  // Unknown ids are ignored. If the set matches no tracked rail we fall back to
  // every rail and say so rather than returning an empty ranking.
  let rows = allRows;
  let acceptedFilter: string[] | null = null;
  if (acceptedRails && acceptedRails.length > 0) {
    acceptedFilter = acceptedRails;
    const wanted = new Set(acceptedRails.map((s) => s.toLowerCase().trim()));
    const filtered = allRows.filter((r) => wanted.has(r.id));
    if (filtered.length > 0) {
      rows = filtered;
    } else {
      notes.push(`The accepted_rails set [${acceptedRails.join(', ')}] matched no tracked rail, so the ranking falls back to all supported rails.`);
    }
  }

  // CDP-supported rails always rank ahead of self-settle-only rails, because
  // x402 settles through the facilitator on the dominant path. Within that,
  // the preference decides whether finality or cost breaks the tie.
  const byCdp = (a: RailRankRow, b: RailRankRow) => Number(b.cdp_supported) - Number(a.cdp_supported);
  const byFinality = (a: RailRankRow, b: RailRankRow) => a.finality_hard_seconds - b.finality_hard_seconds;
  const byCost = (a: RailRankRow, b: RailRankRow) => {
    const ac = a.effective_cost_usd ?? Number.POSITIVE_INFINITY;
    const bc = b.effective_cost_usd ?? Number.POSITIVE_INFINITY;
    return ac - bc;
  };

  const ranking = [...rows].sort((a, b) => {
    const cdp = byCdp(a, b);
    if (cdp !== 0) return cdp;
    if (prefer === 'cost') return byCost(a, b) || byFinality(a, b);
    return byFinality(a, b) || byCost(a, b);
  });

  const top = ranking[0];
  const fastestHard = Math.min(...rows.map((r) => r.finality_hard_seconds));
  let reason = `${top.label} is the recommended rail`;
  if (top.cdp_supported) {
    reason += ` for a $${paymentUsd} settlement. It is CDP-supported (gas sponsored, flat $0.001 marginal cost)`;
    if (top.finality_hard_seconds <= fastestHard * 1.5) {
      reason += ` and reaches hard finality in about ${top.finality_hard_seconds}s, the fastest among the considered CDP rails.`;
    } else {
      reason += '.';
    }
  } else {
    reason += `. No CDP-supported rail was available among the considered rails, so this is the best self-settle option.`;
  }

  // Cross-protocol: the recommended x402 path versus a traditional card rail.
  // Static arithmetic, but it is the comparison an agent actually faces when it
  // decides how to pay, and the fixed card fee makes the gap stark at micro sizes.
  const x402Cost = top.effective_cost_usd;
  const cardCost = round6(CARD_FEE.pct * paymentUsd + CARD_FEE.fixed_usd);
  const cardPct = paymentUsd > 0 ? round2((cardCost / paymentUsd) * 100) : null;
  const x402Pct = x402Cost != null && paymentUsd > 0 ? round2((x402Cost / paymentUsd) * 100) : null;
  const x402Saves = x402Cost != null ? round6(cardCost - x402Cost) : null;
  const cardMultiple = x402Cost != null && x402Cost > 0 ? round2(cardCost / x402Cost) : null;
  const cross_protocol: CrossProtocolComparison = {
    payment_usd: paymentUsd,
    x402: { method: `${top.label} via x402 (CDP facilitator)`, cost_usd: x402Cost, pct_of_payment: x402Pct },
    card: { method: CARD_FEE.label, cost_usd: cardCost, pct_of_payment: cardPct },
    x402_saves_usd: x402Saves,
    card_cost_multiple_vs_x402: cardMultiple,
    note:
      `A card payment of $${paymentUsd} carries roughly $${cardCost} in processing fees ` +
      `(about ${cardPct}% of the payment) versus the ${top.label} x402 path` +
      (x402Cost != null ? ` at $${x402Cost}` : '') +
      `. The fixed card fee alone exceeds the entire x402 facilitator fee, so card does not undercut an x402 micropayment at agent-commerce sizes.`,
  };

  return {
    ok: true,
    verdict_kind: 'settlement_rail',
    payment_usd: paymentUsd,
    prefer,
    recommended_rail: { id: top.id, label: top.label, caip2: top.caip2, reason },
    ranking,
    accepted_rails_filter: acceptedFilter,
    cross_protocol,
    cdp_facilitator: snapshot.cdp_facilitator,
    via_cdp_note: VIA_CDP_NOTE,
    capturedAt: snapshot.capturedAt,
    sources: snapshot.sources,
    notes,
    license: LICENSE,
  };
}

// === Live fetchers (failure tolerant) ===

const FETCH_TIMEOUT_MS = 8000;
const PRICE_TIMEOUT_MS = 6000;

async function fetchEvmGasPriceWei(rpcUrl: string): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'tensorfeed-settlement-rails/1.0 (+https://tensorfeed.ai)' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string };
    if (!data.result) return null;
    const wei = parseInt(data.result, 16);
    return Number.isFinite(wei) && wei > 0 ? wei : null;
  } catch {
    return null;
  }
}

function solanaRpcUrl(env: Env): string {
  if (env.SOLANA_RPC_URL) return env.SOLANA_RPC_URL;
  if (env.HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
  return RAILS.find((r) => r.id === 'solana')!.rpc_default;
}

/**
 * Median non-zero per-compute-unit priority fee (micro-lamports) over the
 * recent sample window. Returns 0 when the network is uncongested and all
 * samples are zero, null on fetch failure.
 */
async function fetchSolanaPriorityFee(rpcUrl: string): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'tensorfeed-settlement-rails/1.0 (+https://tensorfeed.ai)' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getRecentPrioritizationFees', params: [[]] }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: Array<{ prioritizationFee?: number }> };
    if (!Array.isArray(data.result)) return null;
    const fees = data.result.map((x) => x.prioritizationFee ?? 0).filter((n) => Number.isFinite(n));
    if (fees.length === 0) return 0;
    const nonZero = fees.filter((n) => n > 0).sort((a, b) => a - b);
    if (nonZero.length === 0) return 0;
    return nonZero[Math.floor(nonZero.length / 2)];
  } catch {
    return null;
  }
}

async function fetchCoinbaseSpot(pair: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      headers: { 'User-Agent': 'tensorfeed-settlement-rails/1.0 (+https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(PRICE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { amount?: string } };
    const amt = data.data?.amount ? parseFloat(data.data.amount) : NaN;
    return Number.isFinite(amt) && amt > 0 ? amt : null;
  } catch {
    return null;
  }
}

// === Refresh + cache ===

const CACHE_KEY = 'settlement-rails:current';
const REFRESH_TTL_MS = 20 * 60 * 1000;
const MEM_TTL_MS = 60 * 1000;

let memCache: { at: number; snap: RailsSnapshot } | null = null;

export async function refreshSnapshot(env: Env): Promise<RailsSnapshot> {
  const capturedAt = new Date().toISOString();
  const evmRails = RAILS.filter((r) => r.vm === 'evm');
  const pricePairs = Array.from(new Set(RAILS.map((r) => r.native_price_pair)));

  const [gasResults, solanaCuPrice, priceResults] = await Promise.all([
    Promise.all(evmRails.map((r) => fetchEvmGasPriceWei(r.rpc_default).then((v) => [r.id, v] as const))),
    fetchSolanaPriorityFee(solanaRpcUrl(env)),
    Promise.all(pricePairs.map((p) => fetchCoinbaseSpot(p).then((v) => [p, v] as const))),
  ]);

  const gasPriceWei: Record<string, number | null> = {};
  for (const [id, v] of gasResults) gasPriceWei[id] = v;
  const prices: Record<string, number | null> = {};
  for (const [p, v] of priceResults) prices[p] = v;

  const extraNotes: string[] = [];
  const missingGas = gasResults.filter(([, v]) => v == null).map(([id]) => id);
  if (missingGas.length) extraNotes.push(`Live gas price unavailable for: ${missingGas.join(', ')}. Raw cost is null for those rails.`);
  if (solanaCuPrice == null) extraNotes.push('Solana priority fee unavailable; raw Solana cost is null.');
  const missingPrices = priceResults.filter(([, v]) => v == null).map(([p]) => p);
  if (missingPrices.length) extraNotes.push(`Native token price unavailable for: ${missingPrices.join(', ')}.`);

  const snapshot = buildSnapshot({ capturedAt, gasPriceWei, solanaCuPriceMicroLamports: solanaCuPrice, prices }, extraNotes);
  await env.TENSORFEED_CACHE.put(CACHE_KEY, JSON.stringify(snapshot));
  memCache = { at: Date.now(), snap: snapshot };
  return snapshot;
}

function isFresh(capturedAt: string, ttlMs: number): boolean {
  const t = Date.parse(capturedAt);
  return Number.isFinite(t) && Date.now() - t < ttlMs;
}

/**
 * Read the current snapshot. Serves the 60s in-memory copy, then a fresh-enough
 * KV copy, then refreshes. On refresh failure, serves the last KV copy rather
 * than returning null so the endpoint never goes blank.
 */
export async function getSnapshot(env: Env): Promise<RailsSnapshot> {
  if (memCache && Date.now() - memCache.at < MEM_TTL_MS) return memCache.snap;

  const cached = (await env.TENSORFEED_CACHE.get(CACHE_KEY, 'json')) as RailsSnapshot | null;
  if (cached && isFresh(cached.capturedAt, REFRESH_TTL_MS)) {
    memCache = { at: Date.now(), snap: cached };
    return cached;
  }

  try {
    return await refreshSnapshot(env);
  } catch {
    if (cached) return cached;
    // Last resort: a static-only snapshot (finality and CDP facts, null live cost).
    return buildSnapshot(
      { capturedAt: new Date().toISOString(), gasPriceWei: {}, solanaCuPriceMicroLamports: null, prices: {} },
      ['Live cost fetch failed; serving finality and facilitator facts with null on-chain cost.'],
    );
  }
}
