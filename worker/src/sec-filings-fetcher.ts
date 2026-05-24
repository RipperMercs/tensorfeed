/**
 * SEC EDGAR filings ingest for the AI bellwether cohort.
 *
 * Path B per session 2026-05-24: TF CC handles ingestion + raw endpoints;
 * the offline DataPal CC rig runs Qwen 3.6 27B over filing bodies for
 * AI-capex / AI-revenue / AI-partnership field extraction, hands back a
 * structured per-filing extraction file. Premium endpoints land in a
 * follow-up commit reading from that DataPal-produced data.
 *
 * Cohort: 14 AI-relevant US-traded companies (silicon, hyperscaler,
 * AI-native, infra). CIKs hardcoded — they're stable identifiers, no
 * benefit to lookup on every cron run. Adding/removing companies is a
 * code change, intentionally.
 *
 * Source: data.sec.gov/submissions/CIK{cik}.json — official EDGAR API,
 * public domain, requires a descriptive User-Agent identifying contact
 * info. We reuse SEC_USER_AGENT from sec-tickers.ts.
 *
 * Cron: 5 *\/6 * * * UTC (every 6h at :05). SEC rate limit is 10 req/sec
 * from a single IP; 14 sequential fetches per run is comfortably under
 * that. Polite UA + sequential calls also satisfies SEC's automated-
 * access guidelines.
 *
 * Free endpoints:
 *   /api/sec/filings/recent              recent across all cohort
 *   /api/sec/filings/{cik}/recent        per-company
 *
 * Premium endpoints (queued for Phase 3f.3, after DataPal extraction):
 *   /api/premium/sec/filings/ai-flagged       Qwen-extracted AI-relevant
 *   /api/premium/sec/filings/by-form          form-type rollup with extraction
 */

import type { Env } from './types';

const SUBMISSIONS_URL_BASE = 'https://data.sec.gov/submissions/';
const SEC_USER_AGENT = 'TensorFeed evan@tensorfeed.ai';
const FETCH_TIMEOUT_MS = 20_000;
const PER_COMPANY_RECENT_CAP = 25;
const COHORT_RECENT_CAP = 100;

export const SEC_FILINGS_CURRENT_KEY = 'sec-filings:current';
export const SEC_FILINGS_BY_CIK_PREFIX = 'sec-filings:by-cik:';
export const SEC_FILINGS_INDEX_KEY = 'sec-filings:index';

// ── AI bellwether cohort (CIK + display metadata) ──────────────────

export interface AIBellwether {
  cik: string;             // 10-digit zero-padded
  ticker: string;
  display_name: string;
  category: 'silicon' | 'hyperscaler' | 'ai-native' | 'infra' | 'consumer';
}

export const AI_BELLWETHERS: ReadonlyArray<AIBellwether> = [
  // Silicon
  { cik: '0001045810', ticker: 'NVDA',  display_name: 'NVIDIA',                category: 'silicon' },
  { cik: '0000002488', ticker: 'AMD',   display_name: 'AMD',                   category: 'silicon' },
  { cik: '0001730168', ticker: 'AVGO',  display_name: 'Broadcom',              category: 'silicon' },
  { cik: '0001046179', ticker: 'TSM',   display_name: 'Taiwan Semiconductor',  category: 'silicon' },
  { cik: '0001973239', ticker: 'ARM',   display_name: 'Arm Holdings',          category: 'silicon' },
  // Hyperscaler / cloud
  { cik: '0000789019', ticker: 'MSFT',  display_name: 'Microsoft',             category: 'hyperscaler' },
  { cik: '0001652044', ticker: 'GOOGL', display_name: 'Alphabet (Google)',     category: 'hyperscaler' },
  { cik: '0001018724', ticker: 'AMZN',  display_name: 'Amazon',                category: 'hyperscaler' },
  { cik: '0001341439', ticker: 'ORCL',  display_name: 'Oracle',                category: 'hyperscaler' },
  // AI-native + infra
  { cik: '0001321655', ticker: 'PLTR',  display_name: 'Palantir',              category: 'ai-native' },
  { cik: '0001375365', ticker: 'SMCI',  display_name: 'Super Micro Computer',  category: 'infra' },
  // Consumer / multi-product
  { cik: '0000320193', ticker: 'AAPL',  display_name: 'Apple',                 category: 'consumer' },
  { cik: '0001326801', ticker: 'META',  display_name: 'Meta Platforms',        category: 'consumer' },
  { cik: '0001318605', ticker: 'TSLA',  display_name: 'Tesla',                 category: 'consumer' },
];

// ── Upstream shape ─────────────────────────────────────────────────

interface UpstreamFilingsRecent {
  accessionNumber?: string[];
  filingDate?: string[];
  reportDate?: string[];
  form?: string[];
  primaryDocument?: string[];
  primaryDocDescription?: string[];
}

interface UpstreamSubmissions {
  cik?: string;
  name?: string;
  tickers?: string[];
  filings?: {
    recent?: UpstreamFilingsRecent;
  };
}

// ── Normalized TF shape ────────────────────────────────────────────

export interface SecFiling {
  accession_number: string;          // formatted with dashes, e.g. "0001045810-25-000123"
  cik: string;                        // 10-digit zero-padded
  company_name: string;
  ticker: string;
  category: AIBellwether['category'];
  form: string;                       // e.g. "8-K", "10-K", "10-Q", "DEF 14A"
  filing_date: string;                // YYYY-MM-DD
  report_date: string | null;
  primary_doc: string;
  primary_doc_description: string;
  primary_doc_url: string;            // direct link to primary document
  index_url: string;                  // filing index page
}

export interface SecFilingsSnapshot {
  capturedAt: string;
  source: 'data.sec.gov/submissions';
  source_license: 'Public domain (17 USC 105). SEC EDGAR.';
  cohort_size: number;
  filings_count: number;
  filings_by_company: Record<string, number>;  // ticker -> count
  filings: SecFiling[];                         // unified, sorted by filing_date desc
}

// ── Helpers ────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * EDGAR accession numbers come in two forms across the API:
 *   - dashless: "0001045810250000123"  (in URL paths)
 *   - dashed:   "0001045810-25-000123" (canonical display)
 * The submissions API returns dashed; we keep it that way for display
 * but derive a dashless variant for URL construction.
 */
export function dashlessAccession(accession: string): string {
  return accession.replace(/-/g, '');
}

export function primaryDocUrl(cik: string, accession: string, primaryDoc: string): string {
  // cik in URL is the integer form (no leading zeros)
  const cikInt = String(parseInt(cik, 10));
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${dashlessAccession(accession)}/${primaryDoc}`;
}

export function filingIndexUrl(cik: string, accession: string): string {
  const cikInt = String(parseInt(cik, 10));
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=&dateb=&owner=include&count=40#${accession}`;
}

/**
 * Normalize one company's submissions JSON into a list of recent filings.
 * Defensive: SEC's columnar shape pairs arrays by index; we only return
 * filings where every required field has a matching index.
 */
export function normalizeSubmissions(
  raw: UpstreamSubmissions,
  bellwether: AIBellwether,
  cap = PER_COMPANY_RECENT_CAP,
): SecFiling[] {
  const recent = raw.filings?.recent;
  if (!recent) return [];
  const accessions = recent.accessionNumber ?? [];
  const dates = recent.filingDate ?? [];
  const reportDates = recent.reportDate ?? [];
  const forms = recent.form ?? [];
  const primaryDocs = recent.primaryDocument ?? [];
  const primaryDocDescs = recent.primaryDocDescription ?? [];
  const company_name = typeof raw.name === 'string' ? raw.name : bellwether.display_name;

  const out: SecFiling[] = [];
  const n = Math.min(accessions.length, dates.length, forms.length, primaryDocs.length, cap);
  for (let i = 0; i < n; i++) {
    const accession = accessions[i];
    const form = forms[i];
    const filingDate = dates[i];
    const primaryDoc = primaryDocs[i];
    if (!accession || !form || !filingDate || !primaryDoc) continue;
    const reportDate = i < reportDates.length ? reportDates[i] : '';
    const desc = i < primaryDocDescs.length ? (primaryDocDescs[i] ?? '') : '';
    out.push({
      accession_number: accession,
      cik: bellwether.cik,
      company_name,
      ticker: bellwether.ticker,
      category: bellwether.category,
      form,
      filing_date: filingDate,
      report_date: reportDate || null,
      primary_doc: primaryDoc,
      primary_doc_description: desc,
      primary_doc_url: primaryDocUrl(bellwether.cik, accession, primaryDoc),
      index_url: filingIndexUrl(bellwether.cik, accession),
    });
  }
  return out;
}

async function fetchCompanySubmissions(bellwether: AIBellwether): Promise<SecFiling[]> {
  const url = `${SUBMISSIONS_URL_BASE}CIK${bellwether.cik}.json`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as UpstreamSubmissions;
    return normalizeSubmissions(body, bellwether);
  } catch {
    return [];
  }
}

/**
 * Top-level refresh. Sequential per-company fetches to stay polite under
 * SEC's 10-req/sec single-IP rate ceiling. 14 fetches at ~500ms each
 * completes in roughly 7 seconds, well within the cron 30s budget.
 */
export async function refreshSecFilingsSnapshot(env: Env): Promise<SecFilingsSnapshot> {
  const capturedAt = new Date().toISOString();
  const all: SecFiling[] = [];
  const filings_by_company: Record<string, number> = {};

  for (const bellwether of AI_BELLWETHERS) {
    const filings = await fetchCompanySubmissions(bellwether);
    if (filings.length > 0) {
      filings_by_company[bellwether.ticker] = filings.length;
      // Per-company snapshot for the /{cik}/recent endpoint.
      await env.TENSORFEED_CACHE.put(
        `${SEC_FILINGS_BY_CIK_PREFIX}${bellwether.cik}`,
        JSON.stringify({
          capturedAt,
          cik: bellwether.cik,
          ticker: bellwether.ticker,
          company_name: bellwether.display_name,
          filings,
        }),
      );
      all.push(...filings);
    }
  }

  // Unified snapshot: sort by filing_date desc, then accession desc for
  // deterministic tie-break (newer accessions sort later in lexical desc).
  all.sort((a, b) => {
    if (b.filing_date !== a.filing_date) return b.filing_date.localeCompare(a.filing_date);
    return b.accession_number.localeCompare(a.accession_number);
  });
  const trimmed = all.slice(0, COHORT_RECENT_CAP);

  const snapshot: SecFilingsSnapshot = {
    capturedAt,
    source: 'data.sec.gov/submissions',
    source_license: 'Public domain (17 USC 105). SEC EDGAR.',
    cohort_size: AI_BELLWETHERS.length,
    filings_count: trimmed.length,
    filings_by_company,
    filings: trimmed,
  };

  await env.TENSORFEED_CACHE.put(SEC_FILINGS_CURRENT_KEY, JSON.stringify(snapshot));

  const dateKey = capturedAt.slice(0, 10);
  const idxRaw = (await env.TENSORFEED_CACHE.get(SEC_FILINGS_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(SEC_FILINGS_INDEX_KEY, JSON.stringify(dates.slice(-180)));
  }
  return snapshot;
}

export async function getSecFilingsSnapshot(env: Env): Promise<SecFilingsSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(SEC_FILINGS_CURRENT_KEY, 'json')) as SecFilingsSnapshot | null;
}

export interface PerCompanySnapshot {
  capturedAt: string;
  cik: string;
  ticker: string;
  company_name: string;
  filings: SecFiling[];
}

export async function getCompanyFilingsSnapshot(env: Env, cik: string): Promise<PerCompanySnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(`${SEC_FILINGS_BY_CIK_PREFIX}${cik}`, 'json')) as PerCompanySnapshot | null;
}
