// Signed restricted-party compliance screen for agent-to-agent commerce. Given a
// counterparty NAME, screens it against the US Consolidated Screening List (CSL)
// and reports list matches with citations. Companion to the wallet-based
// counterparty trust verdict: that screens an on-chain address via Chainalysis,
// this screens a named party via trade.gov.
//
// Load-bearing posture (legal): TF reports a SCREENING SIGNAL, not a legal
// permit/deny. An exact name match means the supplied name equals a listed name
// or alias; it still requires human verification against the originating agency
// notice and is NOT an authoritative legal determination and NOT legal advice. A
// no-match result is not a guarantee of clearance. The screen fails to a
// no-charge screening_unavailable when the upstream key is missing or the API
// errors, so TF never bills for a verdict it could not actually produce.
import type { Env } from './types';
import { safePut } from './kill-switch';
import { screenPartyAgainstCSL, type CslScreenResult, type CslMatchType } from './compliance-screen';

export type RestrictedPartyVerdict =
  | 'restricted_party_match'
  | 'possible_match'
  | 'no_match'
  | 'screening_unavailable';

export interface RestrictedPartyMatchRow {
  name: string;
  alt_names: string[];
  type: string;
  source: string;
  source_list_url: string | null;
  source_information_url: string | null;
  programs: string[];
  countries: string[];
  entity_number: string | null;
  match_type: CslMatchType;
}

export interface RestrictedPartyVerdictResult {
  ok: true;
  capturedAt: string | null;
  query: string;
  verdict: RestrictedPartyVerdict;
  requires_human_review: boolean;
  match_count: number;
  exact_match_count: number;
  possible_match_count: number;
  matched_lists: string[];
  matches: RestrictedPartyMatchRow[];
  claim: string;
  disclaimer: string;
  notes: string[];
  attribution: { source: string; derivation: string; license: string };
}

export interface RestrictedPartyVerdictPreview {
  ok: true;
  preview: true;
  query: string;
  verdict: RestrictedPartyVerdict;
  requires_human_review: boolean;
  match_count: number;
  claim: string;
  captured_at: string | null;
}

const DISCLAIMER =
  'A name match on the Consolidated Screening List indicates a potential hit requiring human verification against the originating agency notice. It is not an authoritative legal determination that a transaction is permitted or prohibited, and not legal advice. A no-match result is not a guarantee of clearance.';

const ATTRIBUTION = {
  source:
    'US Consolidated Screening List (CSL), International Trade Administration (trade.gov), consolidating Treasury OFAC (SDN, FSE, SSI, CAPTA, NS-MBS, CMIC, PLC), Commerce BIS (Entity List, Denied Persons, Unverified, Military End User), and State Department (Nonproliferation ISN, AECA Debarred) lists.',
  derivation:
    'TF screens the supplied name against the live CSL search API and reports list matches with citations. Matching is the trade.gov fuzzy name search; TF labels a result exact when the supplied name equals the listed name or an alias, otherwise fuzzy.',
  license:
    'Public domain (US Government work). Screening performed by TensorFeed; receipts Ed25519-signed per the AFTA spec.',
};

function decideVerdict(screen: CslScreenResult, exactCount: number): RestrictedPartyVerdict {
  if (!screen.available) return 'screening_unavailable';
  if (exactCount > 0) return 'restricted_party_match';
  if (screen.matches.length > 0) return 'possible_match';
  return 'no_match';
}

function claimFor(
  verdict: RestrictedPartyVerdict,
  query: string,
  exactCount: number,
  possibleCount: number,
  matchedLists: string[],
): string {
  switch (verdict) {
    case 'restricted_party_match':
      return `The counterparty name "${query}" exactly matches ${exactCount} ${
        exactCount === 1 ? 'entry' : 'entries'
      } on the US Consolidated Screening List (${matchedLists.join('; ')}). Treat this as a restricted-party screening hit: verify against the cited official source before proceeding. This is a screening signal, not an authoritative legal determination and not legal advice.`;
    case 'possible_match':
      return `The counterparty name "${query}" produced ${possibleCount} near ${
        possibleCount === 1 ? 'match' : 'matches'
      } on the US Consolidated Screening List but no exact match. Human review is needed to confirm or rule these out before proceeding. This is a screening signal, not an authoritative legal determination and not legal advice.`;
    case 'no_match':
      return `The counterparty name "${query}" produced no match on the US Consolidated Screening List as screened at the captured time. A no-match result is not a guarantee of clearance; it reflects only the CSL lists and the name as supplied. This is a screening signal, not an authoritative legal determination and not legal advice.`;
    case 'screening_unavailable':
    default:
      return `Restricted-party screening was unavailable, so TF could not screen the counterparty name "${query}". No charge was made. This is a screening signal service, not an authoritative legal determination and not legal advice.`;
  }
}

export function buildRestrictedPartyVerdict(
  query: string,
  screen: CslScreenResult,
  capturedAt: string | null,
): RestrictedPartyVerdictResult {
  const exactCount = screen.matches.filter((m) => m.match_type === 'exact').length;
  const possibleCount = screen.matches.filter((m) => m.match_type === 'fuzzy').length;
  const verdict = decideVerdict(screen, exactCount);

  const matchedLists = Array.from(
    new Set(screen.matches.map((m) => m.source).filter((s) => s.length > 0)),
  );

  const matches: RestrictedPartyMatchRow[] = screen.matches.map((m) => ({
    name: m.name,
    alt_names: m.alt_names,
    type: m.type,
    source: m.source,
    source_list_url: m.source_list_url,
    source_information_url: m.source_information_url,
    programs: m.programs,
    countries: m.countries,
    entity_number: m.entity_number,
    match_type: m.match_type,
  }));

  const notes: string[] = [
    'The CSL is screened live at the captured time and is refreshed by trade.gov on an hourly import from the originating agencies, so it can lag an agency action by up to about an hour.',
  ];
  if (verdict === 'restricted_party_match' || verdict === 'possible_match') {
    notes.push('Confirm against the cited source_list_url and the originating agency notice before acting; a name can collide with an unrelated party.');
  }
  if (verdict === 'no_match') {
    notes.push('Screen alternate spellings, aliases, and associated entities as well; a single-name no-match does not screen a network.');
  }
  if (verdict === 'screening_unavailable') {
    notes.push('No charge was made for this call.');
  }

  return {
    ok: true,
    capturedAt,
    query,
    verdict,
    requires_human_review: verdict === 'restricted_party_match' || verdict === 'possible_match',
    match_count: screen.matches.length,
    exact_match_count: exactCount,
    possible_match_count: possibleCount,
    matched_lists: matchedLists,
    matches,
    claim: claimFor(verdict, query, exactCount, possibleCount, matchedLists),
    disclaimer: DISCLAIMER,
    notes,
    attribution: ATTRIBUTION,
  };
}

export function redactRestrictedPartyVerdictForPreview(
  full: RestrictedPartyVerdictResult,
): RestrictedPartyVerdictPreview {
  return {
    ok: true,
    preview: true,
    query: full.query,
    verdict: full.verdict,
    requires_human_review: full.requires_human_review,
    match_count: full.match_count,
    claim: full.claim,
    captured_at: full.capturedAt,
  };
}

// === Compute layer (live I/O) ===

export function normalizePartyName(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const n = raw.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 200) return null;
  return n;
}

export async function computeRestrictedPartyVerdict(
  env: Env,
  name: string,
  opts?: { sources?: string; country?: string },
): Promise<RestrictedPartyVerdictResult> {
  const screen = await screenPartyAgainstCSL(env, name, {
    sources: opts?.sources,
    country: opts?.country,
  });
  // Live screen: the data time is the read moment, honest because the CSL search
  // is fetched fresh per call. For screening_unavailable this is the attempt
  // time and the call is not billed.
  const capturedAt = new Date().toISOString();
  return buildRestrictedPartyVerdict(name, screen, capturedAt);
}

// Free-preview rate limit. Mirrors the counterparty trust verdict preview limit:
// TENSORFEED_CACHE, a JSON { count } value, safePut with a 48h TTL, and the
// { allowed, remaining, limit } shape so the route code stays uniform.
export async function checkRestrictedPartyVerdictPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:restricted-party-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), {
    expirationTtl: 60 * 60 * 48,
  });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
