import { ACTIVE_DAYS } from './x402-index/constants';
import type { PublisherRecord } from './x402-index/types';

export type VerificationStatus = 'verified-settling' | 'unverified' | 'unreachable' | 'no-base-payto';
export type ActivityTier = 'active' | 'quiet' | null;

export interface SettlementSummary {
  count: number;
  volume_usdc: string;
  first_settled: string | null;
  last_settled: string | null;
}

export interface VerifiedPublisher {
  domain: string;
  status: VerificationStatus;
  activity: ActivityTier;
  settlement_count: number;
  volume_usdc: string;
  first_settled: string | null;
  last_settled: string | null;
  pay_to_wallets: string[];
  manifest_url: string;
  source: 'manifest' | 'manual';
  note: string | null;
  first_seen: string;
}

export interface DirectorySummary {
  verified: number; active: number; quiet: number;
  unverified: number; unreachable: number; no_base_payto: number; total: number;
}

export interface DirectoryResult {
  ok: true;
  captured_at: string | null;
  summary: DirectorySummary;
  publishers: VerifiedPublisher[];
  attribution: string;
  license: string;
}

export const VERIFIED_ATTRIBUTION =
  'TensorFeed x402 Verified Directory: which curated x402 publishers have observed USDC settlements on Base in the TensorFeed index. Verification is a positive, on-chain-grounded claim. Absence of observed settlements is NOT a claim that a publisher is fake: the index is forward-only from launch, does not see settlements routed through shared facilitator wallets it does not attribute, and covers Base only. Always verify a payTo on-chain before sending funds.';
export const VERIFIED_LICENSE = 'TensorFeed.ai editorial derivation over public Base on-chain data. Attribution required.';

interface DailyRow { date: string; count: number; }

export function summarizeReceipts(rollup: { count: number; volume_usdc: string; daily_series: DailyRow[] }): SettlementSummary {
  let first: string | null = null;
  let last: string | null = null;
  for (const row of rollup.daily_series) {
    if (row.count > 0) {
      if (first === null) first = row.date;
      last = row.date;
    }
  }
  return { count: rollup.count, volume_usdc: rollup.volume_usdc, first_settled: first, last_settled: last };
}

// Convert a fixed 6-decimal USDC string ("4.420000") to integer micro units.
// The volume_usdc contract is always "<whole>.<6 digits>", so this is exact and
// avoids float drift when folding several summaries together.
function microUnits(usdc: string): bigint {
  const [whole, frac = ''] = usdc.split('.');
  return BigInt(whole || '0') * 1_000_000n + BigInt((frac + '000000').slice(0, 6));
}

function fromMicro(micro: bigint): string {
  const s = micro.toString().padStart(7, '0');
  return s.slice(0, -6) + '.' + s.slice(-6);
}

// Fold several settlement summaries into one: counts and volume sum, first_settled
// is the earliest non-null and last_settled the latest. Used to roll a publisher's
// shared-wallet settlements (which the first-wins wallet map attributes to a
// sibling domain) back onto every publisher that declares that wallet.
export function aggregateSummaries(summaries: SettlementSummary[]): SettlementSummary {
  let count = 0;
  let micro = 0n;
  let first: string | null = null;
  let last: string | null = null;
  for (const s of summaries) {
    count += s.count;
    micro += microUnits(s.volume_usdc);
    if (s.first_settled && (first === null || s.first_settled < first)) first = s.first_settled;
    if (s.last_settled && (last === null || s.last_settled > last)) last = s.last_settled;
  }
  return { count, volume_usdc: fromMicro(micro), first_settled: first, last_settled: last };
}

// Disclosure note for a publisher verified only through a Base payTo wallet it
// shares with sibling domains. The on-chain proof is real, but settlements to a
// co-owned wallet cannot be split between owners, so we name where they sit in the
// index and keep any existing provenance note.
export function sharedWalletNote(existing: string | null, sharedWith: string[]): string {
  const who = sharedWith.slice().sort().join(', ');
  const disclosure = `Verified through a Base payTo wallet shared with ${who}. On-chain settlements to a co-owned wallet cannot be split between owners, so the counts shown are the wallet total.`;
  return existing && existing.trim().length > 0 ? `${existing} ${disclosure}` : disclosure;
}

export function classifyPublisher(record: PublisherRecord, s: SettlementSummary, nowMs: number): VerifiedPublisher {
  const source = record.source ?? 'manifest';
  let status: VerificationStatus;
  if (source === 'manifest' && record.last_crawl_error !== null) {
    status = 'unreachable';
  } else if (record.pay_to_wallets.length === 0) {
    status = 'no-base-payto';
  } else if (s.count > 0) {
    status = 'verified-settling';
  } else {
    status = 'unverified';
  }

  let activity: ActivityTier = null;
  if (status === 'verified-settling' && s.last_settled) {
    const lastMs = Date.parse(s.last_settled + 'T00:00:00Z');
    activity = nowMs - lastMs <= ACTIVE_DAYS * 86_400_000 ? 'active' : 'quiet';
  }

  return {
    domain: record.domain,
    status,
    activity,
    settlement_count: s.count,
    volume_usdc: s.volume_usdc,
    first_settled: s.first_settled,
    last_settled: s.last_settled,
    pay_to_wallets: record.pay_to_wallets,
    manifest_url: record.manifest_url,
    source,
    note: record.note ?? null,
    first_seen: record.first_seen,
  };
}

const STATUS_RANK: Record<VerificationStatus, number> = {
  'verified-settling': 0, 'unverified': 1, 'unreachable': 2, 'no-base-payto': 3,
};
const ACTIVITY_RANK: Record<'active' | 'quiet' | 'none', number> = { active: 0, quiet: 1, none: 2 };

export function buildVerifiedDirectory(publishers: VerifiedPublisher[], capturedAt: string | null): DirectoryResult {
  const sorted = [...publishers].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    const ar = ACTIVITY_RANK[a.activity ?? 'none'];
    const br = ACTIVITY_RANK[b.activity ?? 'none'];
    if (ar !== br) return ar - br;
    const av = Number(a.volume_usdc.replace('.', ''));
    const bv = Number(b.volume_usdc.replace('.', ''));
    return bv - av;
  });

  const summary: DirectorySummary = {
    verified: 0, active: 0, quiet: 0, unverified: 0, unreachable: 0, no_base_payto: 0, total: sorted.length,
  };
  for (const p of sorted) {
    if (p.status === 'verified-settling') {
      summary.verified++;
      if (p.activity === 'active') summary.active++;
      else summary.quiet++;
    } else if (p.status === 'unverified') summary.unverified++;
    else if (p.status === 'unreachable') summary.unreachable++;
    else if (p.status === 'no-base-payto') summary.no_base_payto++;
  }

  return { ok: true, captured_at: capturedAt, summary, publishers: sorted, attribution: VERIFIED_ATTRIBUTION, license: VERIFIED_LICENSE };
}
