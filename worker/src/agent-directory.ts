/**
 * Agent self-directory: search + filter + sort over claimed operators.
 *
 * Spec: C:\Users\rippe\Desktop\tensorfeed-agent-directory-v0-spec.md.
 *
 * v0 architecture: search enumerates `agent-rep:claim:*` at request
 * time (paginated KV list, then N reads), filters + sorts in memory,
 * joins each claim with the operator's ReputationCard for composite_score.
 * Results are edge-cached at the route layer. For the v0 cohort size
 * (~hundreds of claims at most) this is well within the KV op budget
 * AND avoids a second index that has to stay consistent with the
 * authoritative claim records.
 *
 * Pre-built indexes (agent-directory:by-skill:* etc) are a v1
 * optimization if the cohort grows past low thousands.
 *
 * Filter semantics:
 *   - skill=<tag>     match if claim.skills_tags includes tag
 *   - service_area=t  match if claim.service_areas includes tag
 *   - language=t      match if claim.languages includes tag
 *   - available=true  only claim.available_for_hire === true
 *   - max_rate=<usd>  only claim.hourly_rate_max_usd <= max_rate (or null)
 *   - min_experience  only claim.years_experience >= min_experience
 *   - verified=true   only claims with verified_hireable_until > now
 *
 * Sort: verified-hireable first (within tier, composite_score desc),
 * then unverified by composite_score desc, ties broken by claim age
 * (older first), then by wallet (deterministic).
 */

import { Env } from './types';
import {
  CLAIM_KEY_PREFIX,
  getReputationCardByWallet,
  type OperatorClaim,
} from './agent-reputation-store';
import type { ReputationCard } from './agent-reputation';

export interface DirectorySearchFilters {
  skill?: string;
  service_area?: string;
  language?: string;
  available?: boolean;
  max_rate?: number;
  min_experience?: number;
  verified?: boolean;
}

export interface DirectorySearchEntry {
  wallet: string;
  display_name: string;
  operator_url: string | null;
  verified: boolean;
  ofac_clean: boolean;
  available_for_hire: boolean | null;
  hourly_rate_min_usd: number | null;
  hourly_rate_max_usd: number | null;
  expanded_description: string | null;
  skills_tags: string[];
  service_areas: string[];
  languages: string[];
  years_experience: number | null;
  verified_hireable: boolean;
  verified_hireable_until: string | null;
  composite_score: number;
  composite_rank: number | null;
  composite_pct: number | null;
  trust_grade: string | null;
  claimed_at: string;
}

export interface DirectorySearchResult {
  total: number;
  limit: number;
  cohort_size: number;
  results: DirectorySearchEntry[];
}

/**
 * Predicate evaluating whether a single claim matches the filters.
 * Pure function; no I/O. Returns true only if EVERY supplied filter
 * matches (AND semantics).
 */
export function matchesFilters(
  claim: OperatorClaim,
  filters: DirectorySearchFilters,
  now: number,
): boolean {
  if (filters.skill && !(claim.skills_tags ?? []).includes(filters.skill)) return false;
  if (filters.service_area && !(claim.service_areas ?? []).includes(filters.service_area)) return false;
  if (filters.language && !(claim.languages ?? []).includes(filters.language)) return false;
  if (filters.available === true && claim.available_for_hire !== true) return false;
  if (filters.available === false && claim.available_for_hire === true) return false;
  if (filters.max_rate !== undefined) {
    const r = claim.hourly_rate_max_usd;
    if (r !== null && r !== undefined && r > filters.max_rate) return false;
  }
  if (filters.min_experience !== undefined) {
    const y = claim.years_experience;
    if (y === null || y === undefined || y < filters.min_experience) return false;
  }
  if (filters.verified === true) {
    if (!claim.verified_hireable_until) return false;
    if (Date.parse(claim.verified_hireable_until) <= now) return false;
  }
  return true;
}

/**
 * Returns true if the claim has an active verified-hireable subscription
 * (verified_hireable_until is in the future). Used both as a filter
 * input and as a sort key.
 */
export function isVerifiedHireable(claim: OperatorClaim, now: number): boolean {
  if (!claim.verified_hireable_until) return false;
  const until = Date.parse(claim.verified_hireable_until);
  return Number.isFinite(until) && until > now;
}

/**
 * Compose a DirectorySearchEntry from an OperatorClaim joined with its
 * ReputationCard (or no card if the operator is brand new and hasn't
 * been picked up by a rebuild yet).
 */
export function composeDirectoryEntry(
  claim: OperatorClaim,
  card: ReputationCard | null,
  now: number,
): DirectorySearchEntry {
  return {
    wallet: claim.wallet,
    display_name: claim.display_name,
    operator_url: claim.operator_url,
    verified: claim.verified,
    ofac_clean: claim.ofac_clean,
    available_for_hire: claim.available_for_hire ?? null,
    hourly_rate_min_usd: claim.hourly_rate_min_usd ?? null,
    hourly_rate_max_usd: claim.hourly_rate_max_usd ?? null,
    expanded_description: claim.expanded_description ?? null,
    skills_tags: claim.skills_tags ?? [],
    service_areas: claim.service_areas ?? [],
    languages: claim.languages ?? [],
    years_experience: claim.years_experience ?? null,
    verified_hireable: isVerifiedHireable(claim, now),
    verified_hireable_until: claim.verified_hireable_until ?? null,
    composite_score: card?.ranks?.composite?.pct ?? 0,
    composite_rank: card?.ranks?.composite?.rank ?? null,
    composite_pct: card?.ranks?.composite?.pct ?? null,
    trust_grade: card?.trust_grade ?? null,
    claimed_at: claim.claimed_at,
  };
}

/**
 * Sort comparator for directory results. Verified-hireable first.
 * Within tier: composite_score desc, then claim age (older first),
 * then wallet asc (deterministic ties).
 */
export function compareDirectoryEntries(a: DirectorySearchEntry, b: DirectorySearchEntry): number {
  if (a.verified_hireable !== b.verified_hireable) {
    return a.verified_hireable ? -1 : 1;
  }
  if (b.composite_score !== a.composite_score) {
    return b.composite_score - a.composite_score;
  }
  if (a.claimed_at !== b.claimed_at) {
    return a.claimed_at < b.claimed_at ? -1 : 1;
  }
  return a.wallet.toLowerCase().localeCompare(b.wallet.toLowerCase());
}

/**
 * Full search: list every claim, filter, join with reputation cards,
 * sort, paginate.
 *
 * Cohort-size note: this scans every active claim at request time.
 * For v0 cohort size (low hundreds) this is well within KV op budgets
 * and edge-cacheable for 60s. v1 pre-built indexes available if the
 * cohort grows past low thousands.
 */
export async function searchDirectory(
  env: Env,
  filters: DirectorySearchFilters,
  limit: number,
  now: number = Date.now(),
): Promise<DirectorySearchResult> {
  // 1. Enumerate every claim
  const allClaims: OperatorClaim[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: CLAIM_KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.TENSORFEED_CACHE.get(k.name, 'text');
      if (!raw) continue;
      try {
        allClaims.push(JSON.parse(raw) as OperatorClaim);
      } catch {
        // skip malformed entries; the bureau readJson helper logs these
        // out of band. Don't bomb the search on one bad record.
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const cohort_size = allClaims.length;

  // 2. Filter
  const matching = allClaims.filter((c) => matchesFilters(c, filters, now));

  // 3. Join with reputation cards
  const composed: DirectorySearchEntry[] = await Promise.all(
    matching.map(async (claim) => {
      const card = await getReputationCardByWallet(env, claim.wallet);
      return composeDirectoryEntry(claim, card, now);
    }),
  );

  // 4. Sort
  composed.sort(compareDirectoryEntries);

  // 5. Paginate
  const sliced = composed.slice(0, Math.max(0, limit));

  return {
    total: composed.length,
    limit,
    cohort_size,
    results: sliced,
  };
}

/**
 * Aggregate skill-tag distribution across active claims. Returns a
 * sorted array of { tag, count } for the public categories endpoint.
 */
export async function aggregateSkillDistribution(
  env: Env,
): Promise<Array<{ tag: string; count: number }>> {
  const tally = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: CLAIM_KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.TENSORFEED_CACHE.get(k.name, 'text');
      if (!raw) continue;
      try {
        const claim = JSON.parse(raw) as OperatorClaim;
        for (const tag of claim.skills_tags ?? []) {
          tally.set(tag, (tally.get(tag) ?? 0) + 1);
        }
      } catch {
        // skip
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return Array.from(tally.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Same shape as aggregateSkillDistribution but for service_areas.
 */
export async function aggregateServiceAreaDistribution(
  env: Env,
): Promise<Array<{ area: string; count: number }>> {
  const tally = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await env.TENSORFEED_CACHE.list({ prefix: CLAIM_KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.TENSORFEED_CACHE.get(k.name, 'text');
      if (!raw) continue;
      try {
        const claim = JSON.parse(raw) as OperatorClaim;
        for (const area of claim.service_areas ?? []) {
          tally.set(area, (tally.get(area) ?? 0) + 1);
        }
      } catch {
        // skip
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return Array.from(tally.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
}
