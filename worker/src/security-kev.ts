/**
 * CISA Known Exploited Vulnerabilities (KEV) ingest.
 *
 * KEV is the canonical US Government list of CVEs with confirmed
 * in-the-wild exploitation. Maintained by CISA, updated whenever new
 * exploitation evidence emerges (typically a handful of entries per
 * week, with occasional bursts during major incidents).
 *
 * Single JSON file, ~2-3 MB:
 *   https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
 *
 * License: US Government work (17 USC §105), public domain. Commercial
 * redistribution explicitly permitted. We attach a standard attribution
 * block to every response.
 *
 * Storage strategy:
 *   kev:current                     full catalog as of last cron, single
 *                                   value, overwritten daily
 *   kev:added:{YYYY-MM-DD}          entries with dateAdded == this UTC
 *                                   day. Small (typically 0 to 10 entries),
 *                                   captured by the daily cron.
 *   kev:added:index                 ordered date list capped at 730 days
 *   kev:meta                        last cron run metadata
 *
 * Why deltas instead of full daily snapshots: the catalog itself is
 * cumulative, so a daily-snapshot strategy would store ~3 MB per day
 * (~1.1 GB per year). Daily-added deltas are ~0-5 entries per day with
 * a single-pointer lookup back to kev:current for the full set. Same
 * information, far less storage, faster to serve.
 */

import type { Env } from './types';

const KEV_FEED_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

const KEV_CURRENT_KEY = 'kev:current';
const KEV_ADDED_KEY = (date: string) => `kev:added:${date}`;
const KEV_ADDED_INDEX = 'kev:added:index';
const KEV_META_KEY = 'kev:meta';
const INDEX_CAP_DAYS = 730;

const ATTRIBUTION = {
  source: 'CISA Known Exploited Vulnerabilities Catalog',
  source_url:
    'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
  publisher: 'Cybersecurity and Infrastructure Security Agency (US Government)',
  license: 'US Government public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'CISA KEV is a US Government work in the public domain. No restrictions on use, reproduction, or distribution.',
};

export interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
  cwes?: string[];
}

export interface KEVCatalog {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KEVEntry[];
}

export interface KEVCaptureResult {
  ok: boolean;
  total_entries: number;
  newly_added_today: number;
  duration_ms: number;
  error?: string;
}

function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function ensureDateInIndex(env: Env, date: string): Promise<void> {
  const list = (await env.TENSORFEED_CACHE.get<string[]>(KEV_ADDED_INDEX, 'json')) ?? [];
  if (list.includes(date)) return;
  list.push(date);
  list.sort();
  while (list.length > INDEX_CAP_DAYS) list.shift();
  await env.TENSORFEED_CACHE.put(KEV_ADDED_INDEX, JSON.stringify(list));
}

/**
 * Fetch the live KEV catalog from CISA, write the full catalog to
 * kev:current, harvest entries with dateAdded == today into
 * kev:added:{date}, and update the index. Idempotent across re-runs
 * the same UTC day (overwrites are safe; the catalog is the source
 * of truth).
 */
export async function captureKEV(env: Env, now: Date = new Date()): Promise<KEVCaptureResult> {
  const startedAt = Date.now();
  const today = todayUTC(now);

  let resp: Response;
  try {
    resp = await fetch(KEV_FEED_URL, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      total_entries: 0,
      newly_added_today: 0,
      duration_ms: Date.now() - startedAt,
      error: `kev_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      total_entries: 0,
      newly_added_today: 0,
      duration_ms: Date.now() - startedAt,
      error: `kev_http_${resp.status}`,
    };
  }

  let catalog: KEVCatalog;
  try {
    catalog = (await resp.json()) as KEVCatalog;
  } catch {
    return {
      ok: false,
      total_entries: 0,
      newly_added_today: 0,
      duration_ms: Date.now() - startedAt,
      error: 'kev_invalid_json',
    };
  }

  if (!Array.isArray(catalog.vulnerabilities)) {
    return {
      ok: false,
      total_entries: 0,
      newly_added_today: 0,
      duration_ms: Date.now() - startedAt,
      error: 'kev_missing_vulnerabilities_array',
    };
  }

  await env.TENSORFEED_CACHE.put(KEV_CURRENT_KEY, JSON.stringify(catalog));

  const addedToday = catalog.vulnerabilities.filter((v) => v.dateAdded === today);
  if (addedToday.length > 0) {
    await env.TENSORFEED_CACHE.put(KEV_ADDED_KEY(today), JSON.stringify(addedToday));
    await ensureDateInIndex(env, today);
  }

  await env.TENSORFEED_CACHE.put(
    KEV_META_KEY,
    JSON.stringify({
      last_run: now.toISOString(),
      catalog_version: catalog.catalogVersion,
      catalog_date_released: catalog.dateReleased,
      total_entries: catalog.count ?? catalog.vulnerabilities.length,
      newly_added_today: addedToday.length,
    }),
  );

  return {
    ok: true,
    total_entries: catalog.vulnerabilities.length,
    newly_added_today: addedToday.length,
    duration_ms: Date.now() - startedAt,
  };
}

export async function readKEVCurrent(env: Env): Promise<KEVCatalog | null> {
  return env.TENSORFEED_CACHE.get<KEVCatalog>(KEV_CURRENT_KEY, 'json');
}

export async function readKEVByCVE(env: Env, cveId: string): Promise<KEVEntry | null> {
  const catalog = await readKEVCurrent(env);
  if (!catalog) return null;
  const target = cveId.toUpperCase();
  return catalog.vulnerabilities.find((v) => v.cveID?.toUpperCase() === target) ?? null;
}

export async function readKEVAddedOnDate(env: Env, date: string): Promise<KEVEntry[]> {
  return (await env.TENSORFEED_CACHE.get<KEVEntry[]>(KEV_ADDED_KEY(date), 'json')) ?? [];
}

export async function listKEVAddedDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(KEV_ADDED_INDEX, 'json')) ?? [];
}

export async function readKEVMeta(env: Env): Promise<unknown | null> {
  return env.TENSORFEED_CACHE.get<unknown>(KEV_META_KEY, 'json');
}

/**
 * Free-tier "current" view: top-N most recent entries by dateAdded plus
 * catalog metadata. Drives upsell to premium series for full historicals.
 */
export function summarizeKEVForFreeTier(catalog: KEVCatalog, limit = 50): {
  catalog_version: string;
  date_released: string;
  total_entries: number;
  returned: number;
  most_recent: KEVEntry[];
} {
  const sorted = [...catalog.vulnerabilities].sort((a, b) => {
    const ad = (a.dateAdded ?? '').localeCompare(b.dateAdded ?? '');
    return ad === 0 ? a.cveID.localeCompare(b.cveID) : -ad;
  });
  return {
    catalog_version: catalog.catalogVersion,
    date_released: catalog.dateReleased,
    total_entries: catalog.count ?? catalog.vulnerabilities.length,
    returned: Math.min(limit, sorted.length),
    most_recent: sorted.slice(0, limit),
  };
}

export const KEV_ATTRIBUTION = ATTRIBUTION;
