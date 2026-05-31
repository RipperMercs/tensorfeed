/**
 * Federal AI Spending ingest for a curated AI-vendor cohort.
 *
 * Surfaces US federal contract and grant awards flowing to a hand-picked
 * set of AI-relevant vendors (AI-native, defense-AI, frontier labs,
 * silicon). Data comes from USAspending.gov, the official public-domain
 * federal spending data source published under the DATA Act.
 *
 * Analogous to sec-filings-fetcher.ts: an exported const cohort, normalized
 * TF types, and KV-key constants. Task 1 (this file as committed) is the
 * cohort, types, and PURE aggregation functions only. The network fetcher
 * that calls USAspending.gov and writes KV lands in a follow-up task.
 *
 * Time discipline: every aggregation function takes the current time as a
 * `nowMs: number` argument. No Date.now() inside, so the windows are fully
 * deterministic and unit-testable.
 *
 * Windows: recent is the last 90 days before nowMs (strictly within 90
 * days). Prior is the 90 to 180 day band before nowMs. Momentum compares
 * the two. Awards with no usable date are excluded from both windows but
 * still count toward total spend and award count.
 */

// Vendor cohort identity. `match` is a lowercase substring tested against
// the lowercased recipient name. `search_text` is the human-facing query
// string the network fetcher (Task 2) sends to USAspending.gov.
export interface FedVendor {
  slug: string; name: string; search_text: string; match: string;
  category: 'ai-native' | 'defense-ai' | 'frontier-lab' | 'silicon';
}

export const FED_AI_COHORT: FedVendor[] = [
  { slug: 'palantir',          name: 'Palantir',          search_text: 'Palantir',            match: 'palantir',  category: 'ai-native' },
  { slug: 'anduril',           name: 'Anduril',           search_text: 'Anduril',             match: 'anduril',   category: 'defense-ai' },
  { slug: 'scale-ai',          name: 'Scale AI',          search_text: 'Scale AI',            match: 'scale ai',  category: 'ai-native' },
  { slug: 'shield-ai',         name: 'Shield AI',         search_text: 'Shield AI',           match: 'shield ai', category: 'defense-ai' },
  { slug: 'rebellion-defense', name: 'Rebellion Defense', search_text: 'Rebellion Defense',   match: 'rebellion', category: 'defense-ai' },
  { slug: 'vannevar-labs',     name: 'Vannevar Labs',     search_text: 'Vannevar',            match: 'vannevar',  category: 'defense-ai' },
  { slug: 'primer',            name: 'Primer AI',         search_text: 'Primer Technologies', match: 'primer',    category: 'ai-native' },
  { slug: 'saronic',           name: 'Saronic',           search_text: 'Saronic',             match: 'saronic',   category: 'defense-ai' },
  { slug: 'skydio',            name: 'Skydio',            search_text: 'Skydio',              match: 'skydio',    category: 'defense-ai' },
  { slug: 'openai',            name: 'OpenAI',            search_text: 'OpenAI',              match: 'openai',    category: 'frontier-lab' },
  { slug: 'anthropic',         name: 'Anthropic',         search_text: 'Anthropic',           match: 'anthropic', category: 'frontier-lab' },
  { slug: 'nvidia',            name: 'NVIDIA',            search_text: 'NVIDIA',              match: 'nvidia',    category: 'silicon' },
];

// Normalized TF shape for a single award.
export interface FedAward {
  award_id: string; recipient: string; amount: number; agency: string; agency_slug: string;
  award_type: 'contract' | 'grant'; internal_id: string; date: string | null; // YYYY-MM-DD or null
}

export interface VendorRollup {
  slug: string; name: string; category: string;
  total_usd: number; award_count: number;
  recent_90d_usd: number; prior_90d_usd: number; momentum_pct: number | null;
  top_agencies: { agency: string; agency_slug: string; usd: number }[];
}

export interface FedSnapshot {
  ok: true; captured_at: string; source: string; license: string;
  window_days: number; cohort_size: number;
  total_usd: number; total_awards: number;
  vendors: VendorRollup[];
  agencies: { agency: string; agency_slug: string; usd: number }[];
  recent: FedAward[];
}

export const FED_SPEND_SNAPSHOT_KEY = 'fedspend:snapshot';
export const FED_SOURCE = 'USAspending.gov (US federal spending, public domain under the DATA Act)';
export const FED_LICENSE = 'Public domain (US Government work). TensorFeed editorial aggregation and derivation.';
export const ACTIVE_WINDOW_DAYS = 365;

const DAY_MS = 86_400_000;
const WINDOW_90_MS = 90 * DAY_MS;
const WINDOW_180_MS = 180 * DAY_MS;

// Parse a YYYY-MM-DD award date into epoch ms, or null when absent/unparseable.
function awardTimeMs(date: string | null): number | null {
  if (!date) return null;
  const t = Date.parse(date + 'T00:00:00Z');
  return Number.isNaN(t) ? null : t;
}

// Accumulate agency usd into a map, returning the top N agencies by usd desc.
function topAgencies(
  awards: FedAward[],
  limit: number,
): { agency: string; agency_slug: string; usd: number }[] {
  const bySlug = new Map<string, { agency: string; agency_slug: string; usd: number }>();
  for (const a of awards) {
    const existing = bySlug.get(a.agency_slug);
    if (existing) {
      existing.usd += a.amount;
    } else {
      bySlug.set(a.agency_slug, { agency: a.agency, agency_slug: a.agency_slug, usd: a.amount });
    }
  }
  return [...bySlug.values()].sort((x, y) => y.usd - x.usd).slice(0, limit);
}

/**
 * True when the recipient name contains the vendor's match token
 * (case-insensitive substring).
 */
export function matchesVendor(recipientName: string, vendor: FedVendor): boolean {
  return recipientName.toLowerCase().includes(vendor.match);
}

/**
 * Roll a vendor's awards into totals plus a recent-vs-prior momentum read.
 * Recent window: dated strictly within 90 days of nowMs. Prior window:
 * dated 90 to 180 days before nowMs. Null-date awards count in total_usd
 * and award_count but in neither window.
 */
export function rollupVendor(vendor: FedVendor, awards: FedAward[], nowMs: number): VendorRollup {
  let total_usd = 0;
  let recent_90d_usd = 0;
  let prior_90d_usd = 0;

  for (const a of awards) {
    total_usd += a.amount;
    const t = awardTimeMs(a.date);
    if (t === null) continue;
    const age = nowMs - t;
    if (age >= 0 && age < WINDOW_90_MS) {
      recent_90d_usd += a.amount;
    } else if (age >= WINDOW_90_MS && age < WINDOW_180_MS) {
      prior_90d_usd += a.amount;
    }
  }

  const momentum_pct =
    prior_90d_usd > 0 ? Math.round(((recent_90d_usd - prior_90d_usd) / prior_90d_usd) * 100) : null;

  return {
    slug: vendor.slug,
    name: vendor.name,
    category: vendor.category,
    total_usd,
    award_count: awards.length,
    recent_90d_usd,
    prior_90d_usd,
    momentum_pct,
    top_agencies: topAgencies(awards, 3),
  };
}

/**
 * Assemble the cohort-wide snapshot from per-vendor rollups and the flat
 * award list. Vendors sort by total_usd desc, agencies are the cohort-wide
 * top 10 by usd, and recent is the 25 newest dated awards.
 */
export function buildSnapshot(
  rollups: VendorRollup[],
  allAwards: FedAward[],
  capturedAt: string,
  windowDays: number,
): FedSnapshot {
  const total_usd = rollups.reduce((sum, r) => sum + r.total_usd, 0);
  const total_awards = rollups.reduce((sum, r) => sum + r.award_count, 0);
  const vendors = [...rollups].sort((a, b) => b.total_usd - a.total_usd);

  const recent = allAwards
    .filter((a) => a.date !== null)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
    .slice(0, 25);

  return {
    ok: true,
    captured_at: capturedAt,
    source: FED_SOURCE,
    license: FED_LICENSE,
    window_days: windowDays,
    cohort_size: rollups.length,
    total_usd,
    total_awards,
    vendors,
    agencies: topAgencies(allAwards, 10),
    recent,
  };
}
