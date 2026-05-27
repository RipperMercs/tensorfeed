/**
 * Form 4 insider-trades feed for the AI bellwether cohort.
 *
 * The existing /api/sec/filings/recent endpoint caps each company at 25
 * recent filings, which knocks Form 4 entries (filed frequently by
 * insiders, dwarfed by other filing types on the cohort) out of the
 * top window. This module fetches Form 4 directly from EDGAR with a
 * per-company filter, parses the Atom feed, caches the result in KV
 * for 6 hours, and serves a clean ticker-scoped insider-trade list.
 *
 * Source: SEC EDGAR Atom feed at /cgi-bin/browse-edgar?...&type=4. US
 * Government public domain (17 USC 105). SEC requires a descriptive
 * User-Agent identifying contact info on automated requests.
 *
 * V1 returns filing metadata only (accession_number, filing_date,
 * primary_doc_url, form-name). Agents that need the parsed insider
 * name + transaction details can fetch the filing_url and parse the
 * Form 4 XBRL themselves. A V2 with structured reporting-owner +
 * transactions parsing is queued behind the DataPal Qwen pipeline.
 */

import type { Env } from './types';
import { AI_BELLWETHERS, type AIBellwether } from './sec-filings-fetcher';

const EDGAR_USER_AGENT = 'TensorFeed evan@tensorfeed.ai';
const EDGAR_FETCH_TIMEOUT_MS = 15_000;
const INSIDER_KV_PREFIX = 'sec:insider-trades:';
const INSIDER_KV_TTL_SECONDS = 6 * 60 * 60;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// ─── Shapes ─────────────────────────────────────────────────────────

export interface InsiderTrade {
  accession_number: string;
  ticker: string;
  cik: string;
  company_name: string;
  form: string;
  form_name: string;
  filing_date: string;       // YYYY-MM-DD
  filing_url: string;        // SEC EDGAR filing-index URL
  size: string | null;       // upstream string like "8 KB"
}

export interface InsiderTradesSnapshot {
  cik: string;
  capturedAt: string;
  trades: InsiderTrade[];
}

export interface InsiderTradesResponse {
  ok: boolean;
  source: 'edgar.sec.gov/cgi-bin/browse-edgar';
  source_license: 'Public domain (17 USC 105). SEC EDGAR.';
  capturedAt: string | null;
  ticker: string;
  cik: string;
  company_name: string;
  trades_count: number;
  trades: InsiderTrade[];
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = EDGAR_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function findBellwether(ticker: string): AIBellwether | undefined {
  const upper = ticker.toUpperCase();
  return AI_BELLWETHERS.find((b) => b.ticker === upper);
}

export function isInCohort(ticker: string): boolean {
  return findBellwether(ticker) !== undefined;
}

// ─── Atom feed parser ───────────────────────────────────────────────

const ENTRY_RE = /<entry>([\s\S]*?)<\/entry>/g;
const FIELD_RES = {
  accession: /<accession-number>([^<]+)<\/accession-number>/,
  filingDate: /<filing-date>([^<]+)<\/filing-date>/,
  filingHref: /<filing-href>([^<]+)<\/filing-href>/,
  filingType: /<filing-type>([^<]+)<\/filing-type>/,
  formName: /<form-name>([^<]+)<\/form-name>/,
  size: /<size>([^<]+)<\/size>/,
} as const;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Pure parser. Takes an EDGAR Atom feed XML string and the company's
 * cohort metadata, returns a normalized InsiderTrade list. Returns
 * empty array on malformed input; never throws.
 */
export function parseInsiderAtom(xml: string, bellwether: AIBellwether, limit: number): InsiderTrade[] {
  const trades: InsiderTrade[] = [];
  const entryMatches = xml.matchAll(ENTRY_RE);
  for (const match of entryMatches) {
    const body = match[1];
    const accession = FIELD_RES.accession.exec(body)?.[1];
    const filingDate = FIELD_RES.filingDate.exec(body)?.[1];
    const filingHref = FIELD_RES.filingHref.exec(body)?.[1];
    const filingType = FIELD_RES.filingType.exec(body)?.[1];
    const formName = FIELD_RES.formName.exec(body)?.[1];
    const size = FIELD_RES.size.exec(body)?.[1] ?? null;
    if (!accession || !filingDate || !filingHref || !filingType || !formName) continue;
    if (filingType !== '4') continue;
    trades.push({
      accession_number: decodeEntities(accession),
      ticker: bellwether.ticker,
      cik: bellwether.cik,
      company_name: bellwether.display_name,
      form: filingType,
      form_name: decodeEntities(formName),
      filing_date: filingDate,
      filing_url: decodeEntities(filingHref),
      size,
    });
    if (trades.length >= limit) break;
  }
  return trades;
}

// ─── KV-cached fetcher ─────────────────────────────────────────────

function edgarUrl(cik: string, count: number): string {
  const cikInt = String(parseInt(cik, 10));
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=4&dateb=&owner=include&count=${count}&output=atom`;
}

/**
 * Lazy-fetch EDGAR Atom for one company and cache to KV. If the cached
 * snapshot is younger than INSIDER_KV_TTL_SECONDS, return it without
 * round-tripping to EDGAR. Returns null only on hard upstream failure
 * (so callers can distinguish "no trades found" from "EDGAR unreachable").
 */
export async function fetchAndCacheInsiderTrades(
  env: Env,
  bellwether: AIBellwether,
  limit: number = DEFAULT_LIMIT,
): Promise<InsiderTradesSnapshot | null> {
  const key = `${INSIDER_KV_PREFIX}${bellwether.cik}`;
  const cached = (await env.TENSORFEED_CACHE.get(key, 'json')) as InsiderTradesSnapshot | null;
  if (cached && cached.trades.length >= limit) {
    return { ...cached, trades: cached.trades.slice(0, limit) };
  }
  const fetchCount = Math.min(MAX_LIMIT, Math.max(limit, DEFAULT_LIMIT));
  try {
    const res = await fetchWithTimeout(edgarUrl(bellwether.cik, fetchCount), {
      headers: { 'User-Agent': EDGAR_USER_AGENT, Accept: 'application/atom+xml' },
    });
    if (!res.ok) {
      if (cached) return cached;
      return null;
    }
    const xml = await res.text();
    const trades = parseInsiderAtom(xml, bellwether, fetchCount);
    const snapshot: InsiderTradesSnapshot = {
      cik: bellwether.cik,
      capturedAt: new Date().toISOString(),
      trades,
    };
    await env.TENSORFEED_CACHE.put(key, JSON.stringify(snapshot), {
      expirationTtl: INSIDER_KV_TTL_SECONDS,
    });
    return { ...snapshot, trades: snapshot.trades.slice(0, limit) };
  } catch {
    if (cached) return cached;
    return null;
  }
}

// ─── Public builder ────────────────────────────────────────────────

export async function getInsiderTradesResponse(
  env: Env,
  ticker: string,
  limit: number = DEFAULT_LIMIT,
): Promise<InsiderTradesResponse | null> {
  const bellwether = findBellwether(ticker);
  if (!bellwether) return null;
  const clampedLimit = Math.max(1, Math.min(MAX_LIMIT, limit));
  const snapshot = await fetchAndCacheInsiderTrades(env, bellwether, clampedLimit);
  return {
    ok: snapshot !== null,
    source: 'edgar.sec.gov/cgi-bin/browse-edgar',
    source_license: 'Public domain (17 USC 105). SEC EDGAR.',
    capturedAt: snapshot?.capturedAt ?? null,
    ticker: bellwether.ticker,
    cik: bellwether.cik,
    company_name: bellwether.display_name,
    trades_count: snapshot?.trades.length ?? 0,
    trades: snapshot?.trades ?? [],
    attribution: {
      source: 'U.S. Securities and Exchange Commission (EDGAR via sec.gov/cgi-bin/browse-edgar)',
      license: 'Public domain (17 USC 105). Free to redistribute.',
      notes:
        'Form 4 insider-trade filings for the AI bellwether cohort. Lazy-fetched from EDGAR with 6h KV cache. V1 surfaces filing metadata only (accession, date, URL); structured reporting-owner and transaction parsing is queued behind the DataPal Qwen extraction pipeline.',
    },
  };
}

export function parseLimitParam(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, n);
}
