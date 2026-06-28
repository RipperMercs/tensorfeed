import type { Env } from './types';

/**
 * Restricted-party screening against the US Consolidated Screening List (CSL).
 *
 * The CSL is the International Trade Administration's consolidation of the
 * export and sanctions screening lists an agent should check before transacting
 * with a counterparty: Treasury OFAC (SDN, FSE, SSI, CAPTA, NS-MBS, CMIC, PLC),
 * Commerce BIS (Entity List, Denied Persons, Unverified, Military End User), and
 * State Department (Nonproliferation ISN, AECA Debarred). It is US Government
 * work in the public domain, so screening results are free to redistribute. We
 * pull from trade.gov directly, never from third-party repackagers that attach a
 * non-commercial license to the same public data.
 *
 * This module is I/O only: it queries the live CSL search API and normalizes the
 * response into a typed result. The decision posture (and the load-bearing
 * framing that a match is a screening signal, not a legal determination) lives
 * in the verdict builder, not here.
 *
 * Auth: the search API is gated by a free ITA Developer Portal subscription key,
 * passed as a `subscription-key` header. When the key is absent we short-circuit
 * to a screening_not_configured result (the verdict layer maps that to a
 * no-charge screening_unavailable), so the endpoint degrades honestly instead of
 * silently clearing a party it never actually screened.
 */

export const CSL_SEARCH_URL = 'https://data.trade.gov/consolidated_screening_list/v1/search';

const FETCH_TIMEOUT_MS = 8000;
const SEARCH_SIZE = 25;
const MAX_MATCHES = 25;

export type CslMatchType = 'exact' | 'fuzzy';

export interface CslMatch {
  name: string;
  alt_names: string[];
  type: string;
  source: string;
  source_list_url: string | null;
  source_information_url: string | null;
  programs: string[];
  entity_number: string | null;
  countries: string[];
  score: number | null;
  match_type: CslMatchType;
}

export interface CslScreenResult {
  available: boolean;
  error: string | null;
  total: number;
  matches: CslMatch[];
}

export interface CslScreenOptions {
  sources?: string; // comma-separated CSL source abbreviations (SDN, EL, DPL, ...)
  country?: string; // ISO-2 country filter
}

interface RawCslResult {
  name?: string | null;
  alt_names?: Array<string | null> | null;
  type?: string | null;
  source?: string | null;
  source_list_url?: string | null;
  source_information_url?: string | null;
  programs?: Array<string | null> | null;
  entity_number?: string | null;
  addresses?: Array<{ country?: string | null } | null> | null;
  score?: number | null;
}

interface RawCslResponse {
  total?: number;
  results?: RawCslResult[] | null;
}

export function normalizeForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapMatch(raw: RawCslResult, queryNorm: string): CslMatch {
  const name = String(raw.name ?? '');
  const altNames = (raw.alt_names ?? []).filter(
    (a): a is string => typeof a === 'string' && a.length > 0,
  );
  const exact =
    normalizeForCompare(name) === queryNorm ||
    altNames.some((a) => normalizeForCompare(a) === queryNorm);
  const countries = Array.from(
    new Set(
      (raw.addresses ?? [])
        .map((a) => (a && typeof a.country === 'string' ? a.country : null))
        .filter((c): c is string => !!c),
    ),
  );
  return {
    name,
    alt_names: altNames,
    type: String(raw.type ?? ''),
    source: String(raw.source ?? ''),
    source_list_url: raw.source_list_url ?? null,
    source_information_url: raw.source_information_url ?? null,
    programs: (raw.programs ?? []).filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    ),
    entity_number: raw.entity_number ?? null,
    countries,
    score: typeof raw.score === 'number' ? raw.score : null,
    match_type: exact ? 'exact' : 'fuzzy',
  };
}

export async function screenPartyAgainstCSL(
  env: Env,
  name: string,
  opts: CslScreenOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<CslScreenResult> {
  const key = env.TRADE_GOV_CSL_KEY;
  if (!key) {
    return { available: false, error: 'screening_not_configured', total: 0, matches: [] };
  }

  const params = new URLSearchParams();
  params.set('name', name);
  params.set('fuzzy_name', 'true');
  params.set('size', String(SEARCH_SIZE));
  if (opts.sources) params.set('sources', opts.sources);
  if (opts.country) params.set('countries', opts.country);
  const url = `${CSL_SEARCH_URL}?${params.toString()}`;

  try {
    const res = await fetchFn(url, {
      headers: {
        'subscription-key': key,
        'User-Agent': 'tensorfeed-compliance-screen/1.0 (+https://tensorfeed.ai)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { available: false, error: 'upstream_error', total: 0, matches: [] };
    }
    const data = (await res.json()) as RawCslResponse;
    const queryNorm = normalizeForCompare(name);
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const matches = rawResults.slice(0, MAX_MATCHES).map((r) => mapMatch(r, queryNorm));
    const total = typeof data.total === 'number' ? data.total : matches.length;
    return { available: true, error: null, total, matches };
  } catch {
    return { available: false, error: 'upstream_error', total: 0, matches: [] };
  }
}
