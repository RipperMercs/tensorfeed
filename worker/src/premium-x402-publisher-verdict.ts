// Signed single-publisher x402 trust verdict, derived from the existing on-chain
// settlement index (verified directory KV blob + per-publisher receipts). Pure
// builder mirrors premium-x402-settlement-verdict.ts; redaction mirrors ssvc-verdict.ts.
import type { Env } from './types';
import { safePut } from './kill-switch';
import { getPublisherReceipts } from './x402-index/query';
import { KV_KEY_VERIFIED } from './x402-index/constants';

export type PublisherVerdict =
  | 'actively_settling'
  | 'recently_quiet'
  | 'registered_no_settlement'
  | 'unreachable'
  | 'no_base_payto'
  | 'not_indexed';

export type Momentum = 'expanding' | 'steady' | 'contracting' | 'nascent';

const WINDOW_DAYS = 30;
const HALF_DAYS = 15;
const MOMENTUM_BAND_PCT = 15;

// Minimal shapes we read (kept local so this module does not couple to the
// directory/query internals beyond the documented fields).
interface DirEntry {
  domain: string;
  status: 'verified-settling' | 'unverified' | 'unreachable' | 'no-base-payto';
  activity: 'active' | 'quiet' | null;
  pay_to_wallets: string[];
  first_settled: string | null;
  last_settled: string | null;
  note: string | null;
  first_seen: string;
}
interface DirectoryBlob {
  captured_at: string | null;
  publishers: DirEntry[];
}
interface DailyPoint { date: string; volume_usdc: string; count: number }
interface Receipts {
  window: { from: string; to: string; days: number };
  rollup: { volume_usdc: string; count: number; avg_amount: string; daily_series: DailyPoint[] };
  captured_at: string | null;
  has_data: boolean;
}

export interface X402PublisherVerdictResult {
  ok: true;
  capturedAt: string | null;
  domain: string;
  verdict: PublisherVerdict;
  momentum: Momentum;
  trust: {
    wallet_shared: boolean;
    disclosure: string | null;
    pay_to_wallets: string[];
    first_seen: string | null;
    first_settled: string | null;
    last_settled: string | null;
  };
  evidence: {
    window_days: number;
    volume_usdc: string;
    count: number;
    avg_amount: string;
    daily_series: DailyPoint[];
  };
  claim: string;
  notes: string[];
  attribution: { sources: string[]; license: string };
}

export interface X402PublisherVerdictPreview {
  ok: true;
  preview: true;
  domain: string;
  verdict: PublisherVerdict;
  claim: string;
  captured_at: string | null;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function decideVerdict(entry: DirEntry | null): PublisherVerdict {
  if (!entry) return 'not_indexed';
  switch (entry.status) {
    case 'verified-settling':
      return entry.activity === 'active' ? 'actively_settling' : 'recently_quiet';
    case 'unverified':
      return 'registered_no_settlement';
    case 'unreachable':
      return 'unreachable';
    case 'no-base-payto':
      return 'no_base_payto';
    default:
      return 'not_indexed';
  }
}

function computeMomentum(series: DailyPoint[], firstSeen: string | null, fromDate: string, midDate: string): Momentum {
  const totalCount = series.reduce((a, s) => a + s.count, 0);
  if (totalCount === 0) return 'nascent';
  if (firstSeen && firstSeen >= fromDate) return 'nascent';
  const sumVol = (arr: DailyPoint[]) => arr.reduce((a, s) => a + Number(s.volume_usdc), 0);
  const prior = sumVol(series.filter((s) => s.date < midDate));
  const recent = sumVol(series.filter((s) => s.date >= midDate));
  if (prior === 0) return recent > 0 ? 'expanding' : 'nascent';
  const changePct = ((recent - prior) / prior) * 100;
  if (changePct > MOMENTUM_BAND_PCT) return 'expanding';
  if (changePct < -MOMENTUM_BAND_PCT) return 'contracting';
  return 'steady';
}

function claimFor(verdict: PublisherVerdict, domain: string): string {
  switch (verdict) {
    case 'actively_settling':
      return `${domain} is actively settling USDC on Base: a verified payTo wallet with on-chain settlement inside the last 14 days.`;
    case 'recently_quiet':
      return `${domain} has settled USDC on Base before but has gone quiet, with no observed settlement in the last 14 days.`;
    case 'registered_no_settlement':
      return `${domain} declares a Base payTo wallet but TF has observed no on-chain x402 settlements to it yet.`;
    case 'unreachable':
      return `${domain} could not be reached on the last x402 manifest crawl, so treat its payment terms as unconfirmed.`;
    case 'no_base_payto':
      return `${domain} does not declare a Base payTo wallet, so it cannot settle x402 payments on Base.`;
    case 'not_indexed':
    default:
      return `${domain} is not in TF's x402 publisher registry, so TF has no on-chain settlement signal; verify the payTo wallet on-chain before paying.`;
  }
}

export function buildX402PublisherVerdict(
  domain: string,
  entry: DirEntry | null,
  receipts: Receipts | null,
  now: Date,
): X402PublisherVerdictResult {
  const verdict = decideVerdict(entry);
  const fromDate = ymd(addDays(now, -(WINDOW_DAYS - 1)));
  const midDate = ymd(addDays(now, -HALF_DAYS));
  const series = receipts && receipts.has_data ? receipts.rollup.daily_series : [];
  const momentum = computeMomentum(series, entry?.first_seen ?? null, fromDate, midDate);

  const note = entry?.note ?? null;
  const walletShared = !!note && /shared with/i.test(note);

  const notes: string[] = [];
  if (walletShared) {
    notes.push('On-chain settlements to a co-owned wallet cannot be split between owners, so the counts shown are the wallet total.');
  }
  notes.push('TF indexes x402 settlement on Base forward-only from 2026-05-28; windows that predate that read as empty.');

  const evidence = receipts && receipts.has_data
    ? {
        window_days: receipts.window.days,
        volume_usdc: receipts.rollup.volume_usdc,
        count: receipts.rollup.count,
        avg_amount: receipts.rollup.avg_amount,
        daily_series: receipts.rollup.daily_series,
      }
    : { window_days: WINDOW_DAYS, volume_usdc: '0.000000', count: 0, avg_amount: '0.000000', daily_series: [] };

  return {
    ok: true,
    capturedAt: receipts?.captured_at ?? null,
    domain,
    verdict,
    momentum,
    trust: {
      wallet_shared: walletShared,
      disclosure: note,
      pay_to_wallets: entry?.pay_to_wallets ?? [],
      first_seen: entry?.first_seen ?? null,
      first_settled: entry?.first_settled ?? null,
      last_settled: entry?.last_settled ?? null,
    },
    evidence,
    claim: claimFor(verdict, domain),
    notes,
    attribution: { sources: ['Base mainnet USDC Transfer events (on-chain)'], license: 'CC BY 4.0' },
  };
}

export function redactX402PublisherVerdictForPreview(full: X402PublisherVerdictResult): X402PublisherVerdictPreview {
  return {
    ok: true,
    preview: true,
    domain: full.domain,
    verdict: full.verdict,
    claim: full.claim,
    captured_at: full.capturedAt,
  };
}

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, '');
}

export async function computeX402PublisherVerdict(env: Env, rawDomain: string): Promise<X402PublisherVerdictResult> {
  const domain = normalizeDomain(rawDomain);
  const now = new Date();

  let dir: DirectoryBlob | null = null;
  try {
    dir = (await env.TENSORFEED_CACHE.get(KV_KEY_VERIFIED, 'json')) as DirectoryBlob | null;
  } catch {
    dir = null;
  }
  const entry = dir?.publishers?.find((p) => p.domain === domain) ?? null;

  const to = ymd(now);
  const from = ymd(addDays(now, -(WINDOW_DAYS - 1)));
  let receipts: Receipts | null = null;
  try {
    receipts = (await getPublisherReceipts(env, domain, from, to)) as Receipts | null;
  } catch {
    receipts = null;
  }

  const result = buildX402PublisherVerdict(domain, entry, receipts, now);
  // Prefer the indexer-anchored directory capture time when receipts lack one.
  if (!result.capturedAt && dir?.captured_at) {
    return { ...result, capturedAt: dir.captured_at };
  }
  return result;
}

// Free-preview rate limit. Matches checkX402SettlementVerdictPreviewRateLimit in
// premium-x402-settlement-verdict.ts: same TENSORFEED_CACHE binding, JSON
// { count } value, safePut with a 48h TTL, and the { allowed, remaining, limit }
// return shape so the route code stays uniform across the two preview endpoints.
export async function checkX402PublisherVerdictPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:x402-publisher-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
