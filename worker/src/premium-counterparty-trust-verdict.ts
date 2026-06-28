// Signed counterparty trust verdict for agent-to-agent commerce. Given a
// settlement address, fuses signals that apply to ANY wallet (sanctions
// screening + live on-chain presence) with TF-unique signals (x402 settlement
// footprint + agent reputation) and a Sybil-safe ERC-8004 registry leg.
//
// Pure builder mirrors premium-x402-publisher-verdict.ts. The deterministic
// rollup is the only thing that drives the signed verdict; ERC-8004 raw
// reputation is permissionless and Sybil-exposed, so it is surfaced as labeled
// context and NEVER feeds the score. Sanctions are a hard gate.

export type SanctionsStatus = 'clear' | 'sanctioned' | 'unavailable';

export type Erc8004Coverage = 'registered' | 'not_registered' | 'not_resolved' | 'unavailable';

export type CounterpartyVerdict =
  | 'avoid'
  | 'established'
  | 'active'
  | 'limited_history'
  | 'unknown'
  | 'screening_unavailable';

export interface SanctionsLeg {
  status: SanctionsStatus;
  identifications_count: number | null;
}
export interface OnchainLeg {
  tx_count: number;
  native_balance_wei: string;
  usdc_balance_6: string;
}
export interface TfFootprintLeg {
  indexed: boolean;
  active: boolean;
  first_settled: string | null;
  last_settled: string | null;
  wallet_shared: boolean;
  disclosure: string | null;
}
export interface TfReputationLeg {
  known: boolean;
  reputable: boolean;
  trust_grade: string | null;
  paid_calls: number | null;
}
export interface Erc8004Leg {
  coverage: Erc8004Coverage;
  agent_id: string | null;
  agent_uri: string | null;
  raw_feedback_count: number | null;
}

export interface CounterpartyLegs {
  sanctions: SanctionsLeg;
  onchain: OnchainLeg | null;
  tfFootprint: TfFootprintLeg | null;
  tfReputation: TfReputationLeg | null;
  erc8004: Erc8004Leg | null;
}

export interface CounterpartyTrustVerdictResult {
  ok: true;
  capturedAt: string | null;
  address: string;
  verdict: CounterpartyVerdict;
  sanctions: { status: SanctionsStatus };
  onchain: { tx_count: number; native_balance_wei: string; usdc_balance_6: string; funded: boolean } | null;
  tf: {
    settling: boolean;
    first_settled: string | null;
    last_settled: string | null;
    reputation_known: boolean;
    trust_grade: string | null;
    wallet_shared: boolean;
    disclosure: string | null;
  };
  erc8004: {
    coverage: Erc8004Coverage;
    agent_id: string | null;
    agent_uri: string | null;
    raw_feedback_count: number | null;
  };
  claim: string;
  notes: string[];
  attribution: { sources: string[]; license: string };
}

export interface CounterpartyTrustVerdictPreview {
  ok: true;
  preview: true;
  address: string;
  verdict: CounterpartyVerdict;
  claim: string;
  captured_at: string | null;
}

// Activity tiers keyed on the address nonce (transaction count). Deliberately
// coarse; this is a directional realness signal, not a precise score.
const ESTABLISHED_TX = 100;
const ACTIVE_TX = 10;

function gtZero(intLike: string): boolean {
  try {
    return BigInt(intLike) > 0n;
  } catch {
    return false;
  }
}

function decideVerdict(legs: CounterpartyLegs): CounterpartyVerdict {
  if (legs.sanctions.status === 'sanctioned') return 'avoid';
  if (legs.sanctions.status === 'unavailable') return 'screening_unavailable';

  const strongTf =
    (!!legs.tfReputation?.known && !!legs.tfReputation?.reputable) ||
    (!!legs.tfFootprint?.indexed && !!legs.tfFootprint?.active);
  if (strongTf) return 'established';

  const tx = legs.onchain?.tx_count ?? 0;
  if (tx >= ESTABLISHED_TX) return 'established';
  if (tx >= ACTIVE_TX) return 'active';
  if (tx >= 1) return 'limited_history';
  return 'unknown';
}

function claimFor(verdict: CounterpartyVerdict, address: string): string {
  switch (verdict) {
    case 'avoid':
      return `This counterparty (${address}) appears on a sanctions screening list. Do not transact.`;
    case 'screening_unavailable':
      return `Sanctions screening was unavailable when this counterparty (${address}) was checked, so it could not be cleared; treat it as unscreened.`;
    case 'established':
      return `This counterparty (${address}) shows an established, non-sanctioned track record across the signals TF can verify.`;
    case 'active':
      return `This counterparty (${address}) is a real, non-sanctioned address with a moderate on-chain track record.`;
    case 'limited_history':
      return `This counterparty (${address}) is a real, non-sanctioned address but has only a thin track record; verify before large transactions.`;
    case 'unknown':
    default:
      return `TF has no settlement, reputation, or meaningful on-chain history for this counterparty (${address}). Verify it independently before transacting.`;
  }
}

export function buildCounterpartyTrustVerdict(
  address: string,
  legs: CounterpartyLegs,
  capturedAt: string | null,
): CounterpartyTrustVerdictResult {
  const verdict = decideVerdict(legs);

  const oc = legs.onchain;
  const onchain = oc
    ? {
        tx_count: oc.tx_count,
        native_balance_wei: oc.native_balance_wei,
        usdc_balance_6: oc.usdc_balance_6,
        funded: gtZero(oc.usdc_balance_6) || gtZero(oc.native_balance_wei),
      }
    : null;

  const foot = legs.tfFootprint;
  const rep = legs.tfReputation;
  const erc = legs.erc8004 ?? { coverage: 'not_resolved' as const, agent_id: null, agent_uri: null, raw_feedback_count: null };

  const notes: string[] = [];
  notes.push('On-chain balances and transaction counts are read live from Base mainnet at the captured time and move continuously.');

  if (legs.sanctions.status === 'unavailable') {
    notes.push('Sanctions screening was unavailable at read time, so this address was not screened; the absence of a hit is not clearance.');
  }
  if (foot?.wallet_shared) {
    notes.push('This counterparty settles through a shared Base wallet, so its on-chain totals cannot be attributed to it alone.');
  }
  switch (erc.coverage) {
    case 'registered':
      notes.push(
        'ERC-8004 reputation shown is the raw, unfiltered on-chain feedback count. It is permissionless and Sybil-exposed, with no trusted-client filter applied, so treat it as a discovery signal, not a trust score.',
      );
      break;
    case 'not_resolved':
      notes.push('ERC-8004 maps an agentId to a wallet, not the reverse, so resolving a wallet to its agentId needs an indexer; pass agent_id to include the registry leg.');
      break;
    case 'not_registered':
      notes.push('This address is not registered in the ERC-8004 Identity Registry on Base.');
      break;
    case 'unavailable':
      notes.push('The ERC-8004 registry read was unavailable, so the registry leg is omitted from this verdict.');
      break;
  }
  if (verdict === 'unknown') {
    notes.push('TF found no meaningful history for this address; verify it independently before transacting.');
  }

  return {
    ok: true,
    capturedAt,
    address,
    verdict,
    sanctions: { status: legs.sanctions.status },
    onchain,
    tf: {
      settling: !!(foot?.indexed && foot?.active),
      first_settled: foot?.first_settled ?? null,
      last_settled: foot?.last_settled ?? null,
      reputation_known: !!rep?.known,
      trust_grade: rep?.trust_grade ?? null,
      wallet_shared: !!foot?.wallet_shared,
      disclosure: foot?.disclosure ?? null,
    },
    erc8004: {
      coverage: erc.coverage,
      agent_id: erc.agent_id,
      agent_uri: erc.agent_uri,
      raw_feedback_count: erc.raw_feedback_count,
    },
    claim: claimFor(verdict, address),
    notes,
    attribution: {
      sources: [
        'Base mainnet on-chain reads (transaction count, balances, ERC-8004 registries)',
        'OFAC sanctions screening (derived status only)',
        'TF x402 settlement index',
        'TF agent reputation',
      ],
      license: 'CC BY 4.0',
    },
  };
}

export function redactCounterpartyTrustVerdictForPreview(full: CounterpartyTrustVerdictResult): CounterpartyTrustVerdictPreview {
  return {
    ok: true,
    preview: true,
    address: full.address,
    verdict: full.verdict,
    claim: full.claim,
    captured_at: full.capturedAt,
  };
}
