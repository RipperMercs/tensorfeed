/**
 * Government AI procurement ingest, filtered by AI NAICS codes across the
 * whole federal market (NOT a curated vendor cohort).
 *
 * This is the complement to federal-spending-fetcher.ts. Where that feed
 * tracks USAspending awards to 8 hand-picked AI vendors by recipient-name
 * match (a vendor-side leaderboard), this feed pulls AI procurement across
 * EVERY vendor via NAICS codes (541511 custom programming, 541512 computer
 * systems design, 518210 data processing and hosting) and rolls up by AGENCY
 * demand plus an emerging-vendor flag. It answers the agent-native question
 * "which agencies are buying AI, from whom, and how much," surfacing
 * contractors outside the known cohort.
 *
 * Source is USAspending.gov, the official public-domain federal spending data
 * published under the DATA Act (the same source the fed feed relies on).
 *
 * Mirrors federal-spending-fetcher.ts: the USAspending POST request shape, the
 * AbortController timeout, the bounded MAX_PAGES pagination loop, the
 * best-effort try/catch with structured console.warn (this never throws), the
 * obligation-date-first mapRow logic, and the agency rollup. The differences:
 * the filter is naics_codes (one query across all vendors, no per-vendor loop),
 * and the rollups are by agency demand and by vendor with an emerging flag.
 */

import type { Env } from './types';
import { FED_AI_COHORT } from './federal-spending-fetcher';

// AI NAICS codes (grounding-tested): 541511 custom computer programming
// services, 541512 computer systems design services, 518210 data processing,
// hosting and related services. Single hyphens in this note are fine.
export const AI_NAICS_CODES = ['541511', '541512', '518210'];

// Look-back window for the snapshot, in days.
export const WINDOW_DAYS = 180;

// Hard ceiling on pages. 10 pages x 100 = the top 1000 awards by amount over
// the window. The cap exists only to guarantee termination if hasNext
// misbehaves; the sort by Award Amount desc keeps the largest awards first.
export const MAX_PAGES = 10;

// KV keys.
export const AI_PROCUREMENT_SNAPSHOT_KEY = 'ai-procurement:snapshot';
export const AI_PROCUREMENT_DAY_PREFIX = 'ai-procurement:day:';

export const PROCUREMENT_SOURCE =
  'USAspending.gov (US federal contract awards, public domain under the DATA Act). Filtered by AI NAICS codes (541511, 541512, 518210) across all vendors, not a curated cohort. Coverage is standard award records; some vehicles such as OTA agreements are reported separately and may not appear, so totals are a verifiable floor.';
export const PROCUREMENT_LICENSE =
  'Public domain (US Government work). TensorFeed editorial aggregation and derivation.';

const DAY_MS = 86_400_000;

// Normalized TF shape for a single AI procurement award.
export interface AiAward {
  award_id: string;
  recipient: string;
  amount: number;
  agency: string;
  agency_slug: string;
  naics_code: string;
  award_type: 'contract';
  internal_id: string;
  date: string | null; // YYYY-MM-DD or null
}

// Agency-side demand rollup: how much AI procurement spend an agency drives.
export interface AgencyDemand {
  agency: string;
  agency_slug: string;
  usd: number;
  award_count: number;
}

// Vendor-side rollup with an emerging flag (recipient not in the known cohort).
export interface VendorAward {
  recipient: string;
  usd: number;
  award_count: number;
  emerging: boolean;
}

export interface ProcurementSnapshot {
  ok: true;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  naics_codes: string[];
  total_usd: number;
  total_awards: number;
  unique_recipients: number;
  unique_agencies: number;
  by_agency: AgencyDemand[]; // top agencies by AI procurement spend (demand)
  by_vendor: VendorAward[]; // top recipients, with emerging flag
  recent: AiAward[]; // 25 newest dated awards
}

// ── Pure rollups ───────────────────────────────────────────────────

/**
 * Sum usd and award_count by agency_slug, returning agencies sorted by usd
 * desc. Multiple awards to the same agency aggregate into one entry.
 */
export function rollupAgencies(awards: AiAward[]): AgencyDemand[] {
  const bySlug = new Map<string, AgencyDemand>();
  for (const a of awards) {
    const existing = bySlug.get(a.agency_slug);
    if (existing) {
      existing.usd += a.amount;
      existing.award_count += 1;
    } else {
      bySlug.set(a.agency_slug, {
        agency: a.agency,
        agency_slug: a.agency_slug,
        usd: a.amount,
        award_count: 1,
      });
    }
  }
  return [...bySlug.values()].sort((x, y) => y.usd - x.usd);
}

/**
 * Sum usd and award_count by recipient, returning vendors sorted by usd desc.
 * A vendor is emerging when no cohort token is a case-insensitive substring of
 * the recipient name, meaning it is winning AI work outside the known cohort.
 */
export function rollupVendors(awards: AiAward[], cohortTokens: string[]): VendorAward[] {
  const byRecipient = new Map<string, { recipient: string; usd: number; award_count: number }>();
  for (const a of awards) {
    const existing = byRecipient.get(a.recipient);
    if (existing) {
      existing.usd += a.amount;
      existing.award_count += 1;
    } else {
      byRecipient.set(a.recipient, { recipient: a.recipient, usd: a.amount, award_count: 1 });
    }
  }
  return [...byRecipient.values()]
    .map((v) => {
      const lower = v.recipient.toLowerCase();
      const emerging = !cohortTokens.some((t) => lower.includes(t));
      return { recipient: v.recipient, usd: v.usd, award_count: v.award_count, emerging };
    })
    .sort((x, y) => y.usd - x.usd);
}

// Cohort match tokens derived from the existing fed feed. Reusing FED_AI_COHORT
// keeps "known vendor" defined in exactly one place, so emerging is the inverse
// of "matches the same cohort the vendor-side feed tracks."
const COHORT_TOKENS: string[] = FED_AI_COHORT.map((v) => v.match);

/**
 * Assemble the snapshot from the flat award list. Totals sum every award
 * amount and count, unique counts are distinct recipients and agency_slugs,
 * by_agency is the top 15 agencies by spend, by_vendor is the top 25 recipients
 * (emerging flagged against the cohort), and recent is the 25 newest dated
 * awards (null-date awards still count toward totals but never appear here).
 */
export function buildProcurementSnapshot(
  awards: AiAward[],
  capturedAt: string,
  windowDays: number,
): ProcurementSnapshot {
  const total_usd = awards.reduce((sum, a) => sum + a.amount, 0);
  const total_awards = awards.length;
  const unique_recipients = new Set(awards.map((a) => a.recipient)).size;
  const unique_agencies = new Set(awards.map((a) => a.agency_slug)).size;

  const by_agency = rollupAgencies(awards).slice(0, 15);
  const by_vendor = rollupVendors(awards, COHORT_TOKENS).slice(0, 25);

  const recent = awards
    .filter((a) => a.date !== null)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 25);

  return {
    ok: true,
    captured_at: capturedAt,
    source: PROCUREMENT_SOURCE,
    license: PROCUREMENT_LICENSE,
    window_days: windowDays,
    naics_codes: AI_NAICS_CODES,
    total_usd,
    total_awards,
    unique_recipients,
    unique_agencies,
    by_agency,
    by_vendor,
    recent,
  };
}

// ── Network layer (USAspending.gov) ────────────────────────────────

// USAspending Award Search endpoint. Same const the fed fetcher uses; do not
// change the request shape without re-validating against the live API.
const USA_SPENDING_AWARD_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FETCH_TIMEOUT_MS = 15_000;
const PAGE_LIMIT = 100;

// Contract award type codes (A, B, C, D). No grant codes here: AI procurement
// in v1 is contract awards under the AI NAICS codes.
const CONTRACT_AWARD_TYPE_CODES = ['A', 'B', 'C', 'D'];

// Upstream row shape. agency_slug and generated_internal_id ride along
// automatically even though they are not in the requested `fields`.
interface UsaSpendingRow {
  'Award ID'?: string | null;
  'Recipient Name'?: string | null;
  'Award Amount'?: number | string | null;
  'Awarding Agency'?: string | null;
  'NAICS Code'?: string | null;
  agency_slug?: string | null;
  generated_internal_id?: string | null;
  'Start Date'?: string | null;
  'Base Obligation Date'?: string | null;
}

interface UsaSpendingResponse {
  results?: UsaSpendingRow[];
  page_metadata?: { hasNext?: boolean };
}

// Map one upstream row into the normalized AiAward shape. Date is the
// obligation date (when the award action committed the money), which is always
// in the past, NOT the period-of-performance Start Date, which is often
// future-dated for new contracts. Using the obligation date keeps the recent
// list reflecting real activity. award_type is always 'contract' for this feed.
function mapRow(row: UsaSpendingRow): AiAward {
  const rawDate = row['Base Obligation Date'] ?? row['Start Date'] ?? null;
  const date = rawDate === null ? null : String(rawDate).slice(0, 10);
  return {
    award_id: String(row['Award ID'] ?? ''),
    recipient: String(row['Recipient Name'] ?? ''),
    amount: Number(row['Award Amount']) || 0,
    agency: row['Awarding Agency'] ?? '',
    agency_slug: row.agency_slug ?? '',
    naics_code: row['NAICS Code'] ?? '',
    award_type: 'contract',
    internal_id: row.generated_internal_id ?? '',
    date,
  };
}

/**
 * Fetch all in-window AI procurement contract awards across every vendor,
 * filtered by NAICS code.
 *
 * Best effort by design: this never throws. On a non-ok response, an aborted or
 * thrown fetch, or a JSON parse failure, it logs a structured warning and stops
 * paginating, returning whatever it has collected so far. Unlike the fed
 * fetcher there is no per-vendor loop and no recipient match filter, since
 * NAICS is the filter rather than a fuzzy recipient_search_text.
 */
export async function fetchAiAwards(
  fromDate: string,
  toDate: string,
  fetchFn: typeof fetch = fetch,
): Promise<AiAward[]> {
  const out: AiAward[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = {
      filters: {
        naics_codes: AI_NAICS_CODES,
        award_type_codes: CONTRACT_AWARD_TYPE_CODES,
        time_period: [{ start_date: fromDate, end_date: toDate }],
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Award Amount',
        'Awarding Agency',
        'NAICS Code',
        'Start Date',
        'Base Obligation Date',
      ],
      page,
      limit: PAGE_LIMIT,
      sort: 'Award Amount',
      order: 'desc',
    };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    let parsed: UsaSpendingResponse;
    try {
      const res = await fetchFn(USA_SPENDING_AWARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        console.warn(
          JSON.stringify({ event: 'ai_procurement_fetch_error', page, message: `http ${res.status}` }),
        );
        break;
      }
      parsed = (await res.json()) as UsaSpendingResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'ai_procurement_fetch_error', page, message }));
      break;
    } finally {
      clearTimeout(timer);
    }

    const rows = parsed.results ?? [];
    for (const row of rows) {
      out.push(mapRow(row));
    }

    const hasNext = parsed.page_metadata?.hasNext === true;
    if (!hasNext) break;

    if (page === MAX_PAGES) {
      console.warn(JSON.stringify({ event: 'ai_procurement_truncated', page }));
    }
  }

  return out;
}

/**
 * Capture a full AI procurement snapshot and write it to KV.
 *
 * Fetches the last WINDOW_DAYS of NAICS-filtered AI contract awards, builds the
 * snapshot, and writes two KV keys: the current snapshot and a forward-only
 * daily key for the premium history once it accrues. capturedAt is the live
 * fetch time, the real data capture time for a fresh fetch. KV writes are
 * best-effort and guarded on env.TENSORFEED_CACHE so this never throws.
 */
export async function captureAiProcurement(
  env: Env,
  nowMs: number = Date.now(),
  fetchFn: typeof fetch = fetch,
): Promise<{ awards: number }> {
  const toDate = new Date(nowMs).toISOString().slice(0, 10);
  const fromDate = new Date(nowMs - WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);

  const awards = await fetchAiAwards(fromDate, toDate, fetchFn);
  const snapshot = buildProcurementSnapshot(awards, new Date(nowMs).toISOString(), WINDOW_DAYS);

  if (env.TENSORFEED_CACHE) {
    const payload = JSON.stringify(snapshot);
    try {
      await env.TENSORFEED_CACHE.put(AI_PROCUREMENT_SNAPSHOT_KEY, payload);
      await env.TENSORFEED_CACHE.put(`${AI_PROCUREMENT_DAY_PREFIX}${toDate}`, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'ai_procurement_kv_write_error', message }));
    }
  }

  return { awards: awards.length };
}
