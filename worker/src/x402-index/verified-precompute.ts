import type { Env } from '../types';
import { getPublisherReceipts } from './query';
import {
  classifyPublisher,
  summarizeReceipts,
  aggregateSummaries,
  sharedWalletNote,
  buildVerifiedDirectory,
  type SettlementSummary,
  type VerifiedPublisher,
  type DirectoryResult,
} from '../x402-verified';
import { curatedDomains, kvKeyPublisher, KV_KEY_VERIFIED, KV_KEY_CURSOR, KV_KEY_PUBLISHERS } from './constants';
import type { IndexerCursor, PublisherRecord } from './types';
import { safePut } from '../kill-switch';

// Subtract `days` whole UTC days from a YYYY-MM-DD date string, returning a
// YYYY-MM-DD string. Kept local so the precompute window math never touches the
// request clock; it derives entirely from the passed-in today.
function subtractDaysUtc(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// 89 days back keeps the inclusive from..today window at 90 days, comfortably
// inside getPublisherReceipts' MAX_SERIES_RANGE_DAYS ceiling while still covering
// the index's full forward-only history with margin.
const WINDOW_LOOKBACK_DAYS = 89;

/**
 * Build the verified-publisher directory across a curated domain set. For each
 * domain it reads the per-publisher KV record, pulls the windowed settlement
 * rollup via getPublisherReceipts, summarizes it, and classifies the publisher
 * (verified-settling / unverified / unreachable / no-base-payto). The directory
 * captured_at is the indexer cursor's last_run_at, matching every other
 * x402-index response's real-freshness contract.
 *
 * Both the domain list and today are injectable so the cron path uses the live
 * curated set and the test path can pin a fixed clock + domain.
 */
export async function computeVerifiedDirectory(
  env: Env,
  domains: string[] = curatedDomains(),
  today?: string,
): Promise<DirectoryResult> {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  const fromStr = subtractDaysUtc(todayStr, WINDOW_LOOKBACK_DAYS);
  const nowMs = Date.parse(todayStr + 'T00:00:00Z');

  // The wallet map attributes each Base payTo wallet to one settlement-holder
  // domain (first-wins on collision), so a wallet co-owned by federation siblings
  // maps to whichever domain the indexer registered first. Reading each holder's
  // rollup lets every co-owner inherit that wallet's on-chain proof instead of the
  // second co-owner reading as unverified. Keys are lowercase 0x addresses.
  const walletMap = ((await env.TENSORFEED_CACHE.get(KV_KEY_PUBLISHERS, 'json')) as Record<string, string> | null) ?? {};

  // Read each settlement-holder domain's rollup at most once, so a wallet shared by
  // several publishers does not re-fetch the same per-publisher-day series.
  const holderSummaries = new Map<string, SettlementSummary | null>();
  const summaryForDomain = async (d: string): Promise<SettlementSummary | null> => {
    if (holderSummaries.has(d)) return holderSummaries.get(d) ?? null;
    const receipts = await getPublisherReceipts(env, d, fromStr, todayStr);
    const s = receipts ? summarizeReceipts(receipts.rollup) : null;
    holderSummaries.set(d, s);
    return s;
  };

  const list: VerifiedPublisher[] = [];
  for (const domain of domains) {
    const record = (await env.TENSORFEED_CACHE.get(kvKeyPublisher(domain), 'json')) as PublisherRecord | null;
    // A curated domain with no crawled or seeded record yet is skipped: there is
    // nothing to classify until the registry crawl or manual seed lands it.
    if (!record) continue;

    // Resolve which domains hold this publisher's wallets' settlements. A wallet
    // absent from the map (not yet indexed) falls back to the publisher's own
    // domain, preserving the prior behavior for non-shared publishers.
    const holders = new Set<string>();
    for (const w of record.pay_to_wallets) holders.add(walletMap[w.toLowerCase()] ?? domain);
    if (holders.size === 0) holders.add(domain);

    const parts: SettlementSummary[] = [];
    for (const h of holders) {
      const s = await summaryForDomain(h);
      if (s) parts.push(s);
    }
    const summary: SettlementSummary = parts.length > 0
      ? aggregateSummaries(parts)
      : { count: 0, volume_usdc: '0.000000', first_settled: null, last_settled: null };

    const vp = classifyPublisher(record, summary, nowMs);
    // Only disclose a shared wallet when it actually produced the proof: a verified
    // publisher whose settlements are attributed in-index to a sibling domain.
    const sharedWith = [...holders].filter((h) => h !== domain);
    if (sharedWith.length > 0 && vp.status === 'verified-settling') {
      vp.note = sharedWalletNote(vp.note, sharedWith);
    }
    list.push(vp);
  }

  const cur = (await env.TENSORFEED_CACHE.get(KV_KEY_CURSOR, 'json')) as IndexerCursor | null;
  const capturedAt = cur?.last_run_at ?? null;

  return buildVerifiedDirectory(list, capturedAt);
}

/**
 * Compute and persist the verified directory blob under KV_KEY_VERIFIED. Wrapped
 * in safePut so the daily precompute respects the KV-writes kill switch.
 */
export async function writeVerifiedDirectory(env: Env, domains?: string[], today?: string): Promise<void> {
  const dir = await computeVerifiedDirectory(env, domains, today);
  await safePut(env, env.TENSORFEED_CACHE, KV_KEY_VERIFIED, JSON.stringify(dir));
}
