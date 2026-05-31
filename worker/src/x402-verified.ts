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
