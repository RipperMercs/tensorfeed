import type { Env } from './types';

/**
 * OpenReview conference-acceptance feed (Track A2, first new research source).
 *
 * Surfaces the notable-tier (Oral + Spotlight) accepted papers from current
 * top ML venues on OpenReview. The decision tier IS the acceptance signal, so
 * one bulk query per venue/tier is enough (no per-paper review fetch). Pairs
 * with /conferences and the rest of /research.
 *
 * Source posture: OpenReview public submission metadata via the v2 API
 * (api2.openreview.net), no key for public venues. TensorFeed LINKS and
 * SUMMARIZES: every entry carries the forum_url and a clipped abstract; full
 * text and PDFs are not republished.
 *
 * Architecture mirrors openalex-authors.ts: pure transform + KV with no TTL
 * (last-known-good), a refresh function with loud failure logging, and a read
 * accessor. Refreshed by the daily cron and the admin task=openreview lever.
 *
 * Maintenance: the VENUES list and per-venue tier display strings are curated
 * (ICLR capitalizes its tiers, NeurIPS and ICML lowercase them) and verified
 * against the live API. Update the list each conference season.
 */

const OPENREVIEW_BASE = 'https://api2.openreview.net';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const CURRENT_KEY = 'openreview-acceptances:current';
const PER_TIER_LIMIT = 50;
const TOTAL_CAP = 120;
const ABSTRACT_CLIP = 240;
const FETCH_TIMEOUT_MS = 15_000;

interface VenueConfig {
  venueid: string;
  label: string;
  tiers: string[];
}

const VENUES: VenueConfig[] = [
  { venueid: 'ICLR.cc/2025/Conference', label: 'ICLR 2025', tiers: ['ICLR 2025 Oral', 'ICLR 2025 Spotlight'] },
  { venueid: 'NeurIPS.cc/2025/Conference', label: 'NeurIPS 2025', tiers: ['NeurIPS 2025 oral', 'NeurIPS 2025 spotlight'] },
  { venueid: 'ICML.cc/2025/Conference', label: 'ICML 2025', tiers: ['ICML 2025 oral'] },
  { venueid: 'NeurIPS.cc/2024/Conference', label: 'NeurIPS 2024', tiers: ['NeurIPS 2024 oral', 'NeurIPS 2024 spotlight'] },
];

// ── OpenReview v2 note shape (content fields are wrapped in {value}) ──

interface ORNote {
  forum?: string;
  cdate?: number;
  content?: Record<string, { value?: unknown }>;
}
interface ORResponse {
  notes?: ORNote[];
}

// ── Public types ───────────────────────────────────────────────────

export interface AcceptedPaper {
  title: string;
  authors: string[];
  venue_group: string;
  tier: string;
  primary_area: string | null;
  keywords: string[];
  abstract_snippet: string;
  forum_url: string;
  pdf_url: string | null;
  accepted_at: string | null;
}

export interface ConferenceAcceptancesSnapshot {
  capturedAt: string;
  venues: string[];
  paper_count: number;
  papers: AcceptedPaper[];
  notes: string[];
  source: { name: string; url: string; license: string };
}

// ── Pure transforms (tested) ───────────────────────────────────────

function val<T = string>(c: Record<string, { value?: unknown }> | undefined, k: string): T | undefined {
  return c?.[k]?.value as T | undefined;
}

export function clipText(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 3).trimEnd()}...`;
}

/** Strip the venue-group prefix and normalize casing: "ICLR 2025 Oral" -> "Oral", "NeurIPS 2025 oral" -> "Oral". */
export function tierWord(rawVenue: string, group: string): string {
  const t = (rawVenue.startsWith(group) ? rawVenue.slice(group.length) : rawVenue).trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function noteToPaper(n: ORNote, group: string): AcceptedPaper | null {
  const c = n.content;
  const title = val<string>(c, 'title');
  if (!title || !n.forum) return null;
  const rawVenue = val<string>(c, 'venue') ?? group;
  const authorsRaw = val<string[]>(c, 'authors');
  const kwRaw = val<string[]>(c, 'keywords');
  const pdf = val<string>(c, 'pdf');
  const abstract = val<string>(c, 'abstract') ?? '';
  return {
    title,
    authors: Array.isArray(authorsRaw) ? authorsRaw.slice(0, 5) : [],
    venue_group: group,
    tier: tierWord(rawVenue, group),
    primary_area: val<string>(c, 'primary_area') ?? null,
    keywords: Array.isArray(kwRaw) ? kwRaw.slice(0, 6) : [],
    abstract_snippet: clipText(abstract, ABSTRACT_CLIP),
    forum_url: `https://openreview.net/forum?id=${n.forum}`,
    pdf_url: typeof pdf === 'string' && pdf.startsWith('/') ? `https://openreview.net${pdf}` : null,
    accepted_at: typeof n.cdate === 'number' ? new Date(n.cdate).toISOString() : null,
  };
}

/** Pure: assemble the snapshot from already-fetched notes grouped by venue label. */
export function buildAcceptancesSnapshot(
  groups: Array<{ label: string; notes: ORNote[] }>,
  capturedAt: string,
): ConferenceAcceptancesSnapshot {
  const papers: AcceptedPaper[] = [];
  const venues: string[] = [];
  for (const g of groups) {
    if (!venues.includes(g.label)) venues.push(g.label);
    for (const n of g.notes) {
      const p = noteToPaper(n, g.label);
      if (p) papers.push(p);
    }
  }
  papers.sort((a, b) => (b.accepted_at ?? '').localeCompare(a.accepted_at ?? ''));
  const capped = papers.slice(0, TOTAL_CAP);
  return {
    capturedAt,
    venues,
    paper_count: capped.length,
    papers: capped,
    notes: [
      'Notable-tier (Oral and Spotlight) accepted papers from current top ML venues on OpenReview. The decision tier is the acceptance signal. Abstracts are clipped; follow forum_url for the full paper. The venue list is curated and refreshed each conference season.',
    ],
    source: {
      name: 'OpenReview',
      url: 'https://openreview.net',
      license: 'OpenReview public submission metadata (v2 API). TensorFeed links and summarizes with a clipped abstract; full text and PDFs are not republished.',
    },
  };
}

// ── Fetch + refresh ────────────────────────────────────────────────

async function fetchTier(venueid: string, tier: string): Promise<ORNote[]> {
  const url =
    `${OPENREVIEW_BASE}/notes` +
    `?content.venueid=${encodeURIComponent(venueid)}` +
    `&content.venue=${encodeURIComponent(tier)}` +
    `&limit=${PER_TIER_LIMIT}` +
    `&sort=cdate:desc`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} (${venueid} / ${tier})`);
    const data = (await res.json()) as ORResponse;
    return Array.isArray(data.notes) ? data.notes : [];
  } finally {
    clearTimeout(id);
  }
}

export interface RefreshAcceptancesResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshOpenReviewAcceptances(env: Env): Promise<RefreshAcceptancesResult> {
  const groups: Array<{ label: string; notes: ORNote[] }> = [];
  let anySuccess = false;
  for (const v of VENUES) {
    const notes: ORNote[] = [];
    for (const tier of v.tiers) {
      try {
        const got = await fetchTier(v.venueid, tier);
        notes.push(...got);
        anySuccess = true;
      } catch (err) {
        console.warn(`[openreview] fetch failed for ${v.label} / ${tier}: ${(err as Error).message}`);
      }
    }
    groups.push({ label: v.label, notes });
  }

  const snapshot = buildAcceptancesSnapshot(groups, new Date().toISOString());
  if (snapshot.papers.length === 0) {
    const error = anySuccess ? 'all venue/tier queries returned 0 papers' : 'all venue/tier queries failed';
    console.warn(`[openreview] refresh skipped, snapshot NOT written: ${error}`);
    return { ok: false, error };
  }
  // No TTL: persist as last-known-good (matches the OpenAlex research snapshots).
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  return { ok: true, count: snapshot.papers.length };
}

export async function getOpenReviewAcceptances(env: Env): Promise<ConferenceAcceptancesSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConferenceAcceptancesSnapshot;
  } catch {
    return null;
  }
}
