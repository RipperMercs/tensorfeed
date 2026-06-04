import type { Env } from './types';

// AI title-keywords. SAM's Get Opportunities API has no description full-text
// param, only `title` (substring), so we query once per keyword and union by
// noticeId. Single hyphens in comments are fine.
export const AI_TITLE_KEYWORDS = [
  'artificial intelligence',
  'machine learning',
  'large language model',
  'generative ai',
  'deep learning',
  'neural network',
  'natural language processing',
  'computer vision',
];

export const WINDOW_DAYS = 90;
export const MAX_PER_KEYWORD = 100;
export const OPEN_CAP = 250;

export const OPP_SNAPSHOT_KEY = 'ai-opportunities:snapshot';
export const OPP_DAY_PREFIX = 'ai-opportunities:day:';

export const OPP_SOURCE =
  'SAM.gov Get Opportunities API (US federal contract opportunities, public domain). Filtered by a title-keyword search for AI terms (artificial intelligence, machine learning, large language model, and related) across all agencies. Coverage is a verifiable floor: a title search misses solicitations whose title does not name AI even when the work is AI-related.';
export const OPP_LICENSE =
  'Public domain (US Government work). TensorFeed editorial aggregation and derivation.';

const SAM_SEARCH_URL = 'https://api.sam.gov/opportunities/v2/search';
const FETCH_TIMEOUT_MS = 15_000;
const DAY_MS = 86_400_000;

// Normalized TF shape for one open AI opportunity.
export interface AiOpportunity {
  notice_id: string;
  title: string;
  solicitation_number: string;
  agency: string;
  agency_path: string;
  notice_type: string;
  posted_date: string;
  response_deadline: string | null;
  naics_code: string;
  set_aside: string;
  active: boolean;
  ui_link: string;
  matched_keyword: string;
}

export interface AgencyOpps {
  agency: string;
  open_count: number;
}

export interface SetAsideCount {
  set_aside: string;
  count: number;
}

export interface OpportunitySnapshot {
  ok: true;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  keywords: string[];
  total_open: number;
  unique_agencies: number;
  by_agency: AgencyOpps[];
  by_set_aside: SetAsideCount[];
  closing_soon: AiOpportunity[];
  recent: AiOpportunity[];
  open: AiOpportunity[];
}

// Upstream SAM notice shape (only the fields we read).
interface SamNotice {
  noticeId?: string | null;
  title?: string | null;
  solicitationNumber?: string | null;
  fullParentPathName?: string | null;
  type?: string | null;
  postedDate?: string | null;
  responseDeadLine?: string | null;
  naicsCode?: string | null;
  typeOfSetAsideDescription?: string | null;
  active?: string | null;
  uiLink?: string | null;
}

interface SamResponse {
  totalRecords?: number;
  opportunitiesData?: SamNotice[];
}

// SAM requires MM/dd/yyyy dates. Deterministic from epoch ms (UTC).
export function formatSamDate(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Map one SAM notice to the normalized shape. agency is the first segment of
// the dot-delimited fullParentPathName. active coerces the 'Yes'/'No' string.
export function mapNotice(raw: SamNotice, matchedKeyword: string): AiOpportunity {
  const path = raw.fullParentPathName ?? '';
  const agency = (path.split('.')[0] ?? '').trim();
  return {
    notice_id: String(raw.noticeId ?? ''),
    title: String(raw.title ?? ''),
    solicitation_number: String(raw.solicitationNumber ?? ''),
    agency,
    agency_path: path,
    notice_type: String(raw.type ?? ''),
    posted_date: raw.postedDate ? String(raw.postedDate).slice(0, 10) : '',
    response_deadline: raw.responseDeadLine ? String(raw.responseDeadLine) : null,
    naics_code: String(raw.naicsCode ?? ''),
    set_aside: raw.typeOfSetAsideDescription ? String(raw.typeOfSetAsideDescription) : 'None',
    active: String(raw.active ?? '').toLowerCase() === 'yes',
    ui_link: String(raw.uiLink ?? ''),
    matched_keyword: matchedKeyword,
  };
}

// Union by notice_id, keeping the first occurrence. Idempotent.
export function dedupeByNoticeId(opps: AiOpportunity[]): AiOpportunity[] {
  const seen = new Map<string, AiOpportunity>();
  for (const o of opps) {
    if (o.notice_id && !seen.has(o.notice_id)) seen.set(o.notice_id, o);
  }
  return [...seen.values()];
}

// Open = active, and either no deadline or a future deadline relative to nowMs.
export function isOpen(o: AiOpportunity, nowMs: number): boolean {
  if (!o.active) return false;
  if (o.response_deadline === null) return true;
  const t = Date.parse(o.response_deadline);
  if (Number.isNaN(t)) return true; // unparseable: keep, do not silently drop
  return t >= nowMs;
}

export function rollupAgencies(opps: AiOpportunity[]): AgencyOpps[] {
  const byAgency = new Map<string, number>();
  for (const o of opps) {
    const key = o.agency || 'Unknown';
    byAgency.set(key, (byAgency.get(key) ?? 0) + 1);
  }
  return [...byAgency.entries()]
    .map(([agency, open_count]) => ({ agency, open_count }))
    .sort((a, b) => b.open_count - a.open_count);
}

export function rollupSetAsides(opps: AiOpportunity[]): SetAsideCount[] {
  const bySet = new Map<string, number>();
  for (const o of opps) {
    const key = o.set_aside || 'None';
    bySet.set(key, (bySet.get(key) ?? 0) + 1);
  }
  return [...bySet.entries()]
    .map(([set_aside, count]) => ({ set_aside, count }))
    .sort((a, b) => b.count - a.count);
}

// Assemble the snapshot. `open` is every in-window open opportunity (capped);
// the free endpoint projects this object without `open`, the premium endpoint
// ranks `open` by deadline. closing_soon is the 10 nearest future deadlines
// (free preview); recent is the 25 newest posted.
export function buildOpportunitySnapshot(
  opps: AiOpportunity[],
  capturedAt: string,
  windowDays: number,
  nowMs: number,
): OpportunitySnapshot {
  const deduped = dedupeByNoticeId(opps);
  const open = deduped.filter((o) => isOpen(o, nowMs)).slice(0, OPEN_CAP);

  const closing_soon = open
    .filter((o) => o.response_deadline !== null)
    .sort(
      (a, b) =>
        Date.parse(a.response_deadline as string) - Date.parse(b.response_deadline as string),
    )
    .slice(0, 10);

  const recent = [...deduped]
    .filter((o) => o.posted_date)
    .sort((a, b) => b.posted_date.localeCompare(a.posted_date))
    .slice(0, 25);

  return {
    ok: true,
    captured_at: capturedAt,
    source: OPP_SOURCE,
    license: OPP_LICENSE,
    window_days: windowDays,
    keywords: AI_TITLE_KEYWORDS,
    total_open: open.length,
    unique_agencies: new Set(open.map((o) => o.agency || 'Unknown')).size,
    by_agency: rollupAgencies(open).slice(0, 15),
    by_set_aside: rollupSetAsides(open),
    closing_soon,
    recent,
    open,
  };
}

// Fetch open AI opportunities by running one title-keyword query per AI term
// and unioning by noticeId. Best effort: a missing key or any per-keyword
// failure logs a structured warning and continues; this never throws.
export async function fetchAiOpportunities(
  env: Env,
  fromDate: string,
  toDate: string,
  fetchFn: typeof fetch = fetch,
): Promise<AiOpportunity[]> {
  const key = env.SAM_GOV_API_KEY;
  if (!key) {
    console.warn(JSON.stringify({ event: 'ai_opportunities_no_key' }));
    return [];
  }

  const out: AiOpportunity[] = [];
  for (const kw of AI_TITLE_KEYWORDS) {
    const url =
      `${SAM_SEARCH_URL}?api_key=${encodeURIComponent(key)}` +
      `&postedFrom=${encodeURIComponent(fromDate)}&postedTo=${encodeURIComponent(toDate)}` +
      `&title=${encodeURIComponent(kw)}&limit=${MAX_PER_KEYWORD}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, { signal: ac.signal });
      if (!res.ok) {
        console.warn(
          JSON.stringify({ event: 'ai_opportunities_fetch_error', keyword: kw, message: `http ${res.status}` }),
        );
        continue;
      }
      const parsed = (await res.json()) as SamResponse;
      const rows = parsed.opportunitiesData ?? [];
      for (const row of rows) out.push(mapNotice(row, kw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'ai_opportunities_fetch_error', keyword: kw, message }));
    } finally {
      clearTimeout(timer);
    }
  }

  return dedupeByNoticeId(out);
}

// Capture a snapshot and write it to KV (current + forward-only daily key).
// capturedAt is the live fetch time. Best-effort, guarded on TENSORFEED_CACHE.
export async function captureAiOpportunities(
  env: Env,
  nowMs: number = Date.now(),
  fetchFn: typeof fetch = fetch,
): Promise<{ opportunities: number }> {
  const toDate = formatSamDate(nowMs);
  const fromDate = formatSamDate(nowMs - WINDOW_DAYS * DAY_MS);

  const opps = await fetchAiOpportunities(env, fromDate, toDate, fetchFn);
  const snapshot = buildOpportunitySnapshot(opps, new Date(nowMs).toISOString(), WINDOW_DAYS, nowMs);

  if (env.TENSORFEED_CACHE) {
    const payload = JSON.stringify(snapshot);
    const isoDay = new Date(nowMs).toISOString().slice(0, 10);
    try {
      await env.TENSORFEED_CACHE.put(OPP_SNAPSHOT_KEY, payload);
      await env.TENSORFEED_CACHE.put(`${OPP_DAY_PREFIX}${isoDay}`, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'ai_opportunities_kv_write_error', message }));
    }
  }

  return { opportunities: opps.length };
}
