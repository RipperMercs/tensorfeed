import type { Env } from './types';

// AI keyword set for the policy feed. Federal Register `conditions[term]` and
// GovInfo `query` are both full-text, so a raw term match is noisy. We query
// per keyword (union by id) and then keep only documents and bills whose TITLE
// or abstract names an AI term, which is high precision. Single hyphens in
// comments are fine.
export const POLICY_AI_KEYWORDS = [
  'artificial intelligence',
  'machine learning',
  'large language model',
  'generative artificial intelligence',
  'frontier model',
  'automated decision',
];

// Policy moves slower than procurement, so a wider window than the SAM feed.
export const POLICY_WINDOW_DAYS = 120;
export const POLICY_MAX_PER_KEYWORD = 100;
export const POLICY_DOC_CAP = 250;
export const POLICY_BILL_CAP = 100;

export const POLICY_SNAPSHOT_KEY = 'federal-ai-policy:snapshot';
export const POLICY_DAY_PREFIX = 'federal-ai-policy:day:';

export const POLICY_SOURCE =
  'Federal Register API (US executive and agency actions: rules, proposed rules, notices, presidential documents; public domain) plus GovInfo BILLS search (US federal legislation; public domain). Both queried full-text for AI terms (artificial intelligence, machine learning, large language model, and related) then filtered to documents and bills whose title names an AI term. Coverage is a verifiable precision floor: a document that regulates AI without naming it in its title is not counted.';
export const POLICY_LICENSE =
  'Public domain (US Government works). TensorFeed editorial aggregation and derivation.';

const FR_SEARCH_URL = 'https://www.federalregister.gov/api/v1/documents.json';
const GOVINFO_SEARCH_URL = 'https://api.govinfo.gov/search';
const FETCH_TIMEOUT_MS = 15_000;
const DAY_MS = 86_400_000;
const USER_AGENT = 'tensorfeed-cc-policy';

// Normalized TF shape for one Federal Register document.
export interface PolicyDocument {
  document_number: string;
  title: string;
  doc_type: string; // Rule | Proposed Rule | Notice | Presidential Document
  agency: string;
  agencies: string[];
  abstract: string | null;
  publication_date: string;
  url: string;
  matched_keyword: string;
}

// Normalized TF shape for one GovInfo bill.
export interface PolicyBill {
  package_id: string;
  title: string;
  bill_number: string; // e.g. "H.R. 1234"
  congress: string;
  origin_chamber: string; // House | Senate
  date_issued: string;
  url: string;
  matched_keyword: string;
}

export interface AgencyCount {
  agency: string;
  count: number;
}

export interface TypeCount {
  doc_type: string;
  count: number;
}

export interface PolicySnapshot {
  ok: true;
  captured_at: string;
  source: string;
  license: string;
  window_days: number;
  keywords: string[];
  // Executive / agency layer (Federal Register).
  total_documents: number;
  unique_agencies: number;
  by_agency: AgencyCount[];
  by_type: TypeCount[];
  recent_documents: PolicyDocument[];
  documents: PolicyDocument[];
  // Legislative layer (GovInfo BILLS, key-gated).
  bills_enabled: boolean;
  total_bills: number;
  recent_bills: PolicyBill[];
  bills: PolicyBill[];
}

// Upstream Federal Register document shape (only the fields we read).
interface FrAgency {
  name?: string | null;
  raw_name?: string | null;
}
interface FrDocument {
  document_number?: string | null;
  title?: string | null;
  type?: string | null;
  abstract?: string | null;
  publication_date?: string | null;
  html_url?: string | null;
  agencies?: FrAgency[] | null;
  agency_names?: string[] | null;
}
interface FrResponse {
  count?: number;
  results?: FrDocument[];
}

// Upstream GovInfo search result shape (only the fields we read).
interface GovInfoResult {
  packageId?: string | null;
  title?: string | null;
  dateIssued?: string | null;
}
interface GovInfoResponse {
  count?: number;
  results?: GovInfoResult[];
}

// Deterministic YYYY-MM-DD from epoch ms (UTC). Used for both upstream date
// filters, which take ISO calendar dates.
export function formatIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// True when any AI keyword appears (case-insensitive substring) in the text.
export function hasAiTerm(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return POLICY_AI_KEYWORDS.some((kw) => lower.includes(kw));
}

// Map one Federal Register document to the normalized shape. agency is the
// first agency_names entry (falling back to the first agencies[].name).
export function mapFrDocument(raw: FrDocument, matchedKeyword: string): PolicyDocument {
  const agencies = (raw.agency_names ?? [])
    .map((n) => String(n).trim())
    .filter(Boolean);
  if (agencies.length === 0 && Array.isArray(raw.agencies)) {
    for (const a of raw.agencies) {
      const name = (a?.name ?? a?.raw_name ?? '').toString().trim();
      if (name) agencies.push(name);
    }
  }
  return {
    document_number: String(raw.document_number ?? ''),
    title: String(raw.title ?? ''),
    doc_type: String(raw.type ?? ''),
    agency: agencies[0] ?? 'Unknown',
    agencies,
    abstract: raw.abstract ? String(raw.abstract) : null,
    publication_date: raw.publication_date ? String(raw.publication_date).slice(0, 10) : '',
    url: String(raw.html_url ?? ''),
    matched_keyword: matchedKeyword,
  };
}

// Display map for a GovInfo bill-type slug parsed out of a packageId.
const BILL_TYPE_DISPLAY: Record<string, string> = {
  hr: 'H.R.',
  s: 'S.',
  hres: 'H.Res.',
  sres: 'S.Res.',
  hjres: 'H.J.Res.',
  sjres: 'S.J.Res.',
  hconres: 'H.Con.Res.',
  sconres: 'S.Con.Res.',
};

// Parse a GovInfo BILLS packageId (e.g. "BILLS-119hr1234ih") into a display
// bill number, congress, and origin chamber. Returns nulls on a shape we do
// not recognize so the caller can keep the row without inventing data.
export function parsePackageId(packageId: string): {
  bill_number: string;
  congress: string;
  origin_chamber: string;
} {
  const m = /^BILLS-(\d+)([a-z]+?)(\d+)[a-z]+$/.exec(packageId);
  if (!m) return { bill_number: '', congress: '', origin_chamber: '' };
  const [, congress, typeSlug, number] = m;
  const display = BILL_TYPE_DISPLAY[typeSlug] ?? typeSlug.toUpperCase();
  const origin_chamber = typeSlug.startsWith('h') ? 'House' : typeSlug.startsWith('s') ? 'Senate' : '';
  return { bill_number: `${display} ${number}`, congress, origin_chamber };
}

// Map one GovInfo result to the normalized bill shape.
export function mapBill(raw: GovInfoResult, matchedKeyword: string): PolicyBill {
  const package_id = String(raw.packageId ?? '');
  const parsed = parsePackageId(package_id);
  return {
    package_id,
    title: String(raw.title ?? ''),
    bill_number: parsed.bill_number,
    congress: parsed.congress,
    origin_chamber: parsed.origin_chamber,
    date_issued: raw.dateIssued ? String(raw.dateIssued).slice(0, 10) : '',
    url: package_id ? `https://www.govinfo.gov/app/details/${package_id}` : '',
    matched_keyword: matchedKeyword,
  };
}

// Union by document_number, keeping the first occurrence. Idempotent.
export function dedupeDocs(docs: PolicyDocument[]): PolicyDocument[] {
  const seen = new Map<string, PolicyDocument>();
  for (const d of docs) {
    if (d.document_number && !seen.has(d.document_number)) seen.set(d.document_number, d);
  }
  return [...seen.values()];
}

// Union by package_id, keeping the first occurrence. Idempotent.
export function dedupeBills(bills: PolicyBill[]): PolicyBill[] {
  const seen = new Map<string, PolicyBill>();
  for (const b of bills) {
    if (b.package_id && !seen.has(b.package_id)) seen.set(b.package_id, b);
  }
  return [...seen.values()];
}

export function rollupAgencies(docs: PolicyDocument[]): AgencyCount[] {
  const by = new Map<string, number>();
  for (const d of docs) {
    const key = d.agency || 'Unknown';
    by.set(key, (by.get(key) ?? 0) + 1);
  }
  return [...by.entries()]
    .map(([agency, count]) => ({ agency, count }))
    .sort((a, b) => b.count - a.count);
}

export function rollupTypes(docs: PolicyDocument[]): TypeCount[] {
  const by = new Map<string, number>();
  for (const d of docs) {
    const key = d.doc_type || 'Unknown';
    by.set(key, (by.get(key) ?? 0) + 1);
  }
  return [...by.entries()]
    .map(([doc_type, count]) => ({ doc_type, count }))
    .sort((a, b) => b.count - a.count);
}

// Keep only high-signal documents: an AI term in the TITLE. Title-only matching
// (not abstract) so a rule that merely mentions AI once in its abstract is
// dropped; the title is where a document declares it is actually about AI. This
// is consistent with the bill filter, which is also title-only.
export function highSignalDocs(docs: PolicyDocument[]): PolicyDocument[] {
  return docs.filter((d) => hasAiTerm(d.title));
}

// Keep only bills whose title names an AI term, same precision rationale.
export function highSignalBills(bills: PolicyBill[]): PolicyBill[] {
  return bills.filter((b) => hasAiTerm(b.title));
}

// Assemble the snapshot. `documents` and `bills` are the full high-signal,
// date-sorted, capped arrays; the free endpoint projects this object without
// them. recent_documents / recent_bills are the newest-N previews the free
// view keeps. bills_enabled records whether the legislative layer was queried.
export function buildPolicySnapshot(
  docs: PolicyDocument[],
  bills: PolicyBill[],
  capturedAt: string,
  windowDays: number,
  billsEnabled: boolean,
): PolicySnapshot {
  const signalDocs = highSignalDocs(dedupeDocs(docs))
    .sort((a, b) => b.publication_date.localeCompare(a.publication_date))
    .slice(0, POLICY_DOC_CAP);
  const signalBills = highSignalBills(dedupeBills(bills))
    .sort((a, b) => b.date_issued.localeCompare(a.date_issued))
    .slice(0, POLICY_BILL_CAP);

  return {
    ok: true,
    captured_at: capturedAt,
    source: POLICY_SOURCE,
    license: POLICY_LICENSE,
    window_days: windowDays,
    keywords: POLICY_AI_KEYWORDS,
    total_documents: signalDocs.length,
    unique_agencies: new Set(signalDocs.map((d) => d.agency || 'Unknown')).size,
    by_agency: rollupAgencies(signalDocs).slice(0, 15),
    by_type: rollupTypes(signalDocs),
    recent_documents: signalDocs.slice(0, 15),
    documents: signalDocs,
    bills_enabled: billsEnabled,
    total_bills: signalBills.length,
    recent_bills: signalBills.slice(0, 10),
    bills: signalBills,
  };
}

// Fetch AI-related Federal Register documents by running one term query per AI
// keyword and unioning by document_number. Best effort: any per-keyword failure
// logs a structured warning and continues; this never throws. No API key.
export async function fetchFrDocuments(
  fromDate: string,
  toDate: string,
  fetchFn: typeof fetch = fetch,
): Promise<PolicyDocument[]> {
  const out: PolicyDocument[] = [];
  for (const kw of POLICY_AI_KEYWORDS) {
    const params = new URLSearchParams();
    params.set('conditions[term]', kw);
    params.set('conditions[publication_date][gte]', fromDate);
    params.set('conditions[publication_date][lte]', toDate);
    params.set('per_page', String(POLICY_MAX_PER_KEYWORD));
    params.set('order', 'newest');
    for (const f of ['document_number', 'title', 'type', 'abstract', 'publication_date', 'html_url', 'agency_names']) {
      params.append('fields[]', f);
    }
    const url = `${FR_SEARCH_URL}?${params.toString()}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, { signal: ac.signal, headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        console.warn(
          JSON.stringify({ event: 'federal_ai_policy_fr_error', keyword: kw, message: `http ${res.status}` }),
        );
        continue;
      }
      const parsed = (await res.json()) as FrResponse;
      for (const row of parsed.results ?? []) out.push(mapFrDocument(row, kw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'federal_ai_policy_fr_error', keyword: kw, message }));
    } finally {
      clearTimeout(timer);
    }
  }
  return dedupeDocs(out);
}

// Fetch AI-related federal bills from GovInfo BILLS search, one query per AI
// keyword, unioned by packageId. Key-gated: a missing DATA_GOV_API_KEY logs a
// warning and returns []. Best effort, never throws.
export async function fetchAiBills(
  env: Env,
  fromDate: string,
  toDate: string,
  fetchFn: typeof fetch = fetch,
): Promise<PolicyBill[]> {
  const key = env.DATA_GOV_API_KEY;
  if (!key) {
    console.warn(JSON.stringify({ event: 'federal_ai_policy_no_data_gov_key' }));
    return [];
  }

  const out: PolicyBill[] = [];
  for (const kw of POLICY_AI_KEYWORDS) {
    const url = `${GOVINFO_SEARCH_URL}?api_key=${encodeURIComponent(key)}`;
    const body = JSON.stringify({
      query: `"${kw}" collection:(BILLS) AND publishdate:range(${fromDate},${toDate})`,
      pageSize: POLICY_MAX_PER_KEYWORD,
      offsetMark: '*',
      sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
    });

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body,
      });
      if (!res.ok) {
        console.warn(
          JSON.stringify({ event: 'federal_ai_policy_bills_error', keyword: kw, message: `http ${res.status}` }),
        );
        continue;
      }
      const parsed = (await res.json()) as GovInfoResponse;
      for (const row of parsed.results ?? []) out.push(mapBill(row, kw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'federal_ai_policy_bills_error', keyword: kw, message }));
    } finally {
      clearTimeout(timer);
    }
  }
  return dedupeBills(out);
}

// Capture a snapshot and write it to KV (current + forward-only daily key).
// capturedAt is the live fetch time. Best-effort, guarded on TENSORFEED_CACHE.
export async function captureFederalAiPolicy(
  env: Env,
  nowMs: number = Date.now(),
  fetchFn: typeof fetch = fetch,
): Promise<{ documents: number; bills: number }> {
  const toDate = formatIsoDate(nowMs);
  const fromDate = formatIsoDate(nowMs - POLICY_WINDOW_DAYS * DAY_MS);

  const docs = await fetchFrDocuments(fromDate, toDate, fetchFn);
  const billsEnabled = Boolean(env.DATA_GOV_API_KEY);
  const bills = await fetchAiBills(env, fromDate, toDate, fetchFn);

  const snapshot = buildPolicySnapshot(docs, bills, new Date(nowMs).toISOString(), POLICY_WINDOW_DAYS, billsEnabled);

  if (env.TENSORFEED_CACHE) {
    const payload = JSON.stringify(snapshot);
    const isoDay = formatIsoDate(nowMs);
    try {
      await env.TENSORFEED_CACHE.put(POLICY_SNAPSHOT_KEY, payload);
      await env.TENSORFEED_CACHE.put(`${POLICY_DAY_PREFIX}${isoDay}`, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'federal_ai_policy_kv_write_error', message }));
    }
  }

  return { documents: snapshot.total_documents, bills: snapshot.total_bills };
}
