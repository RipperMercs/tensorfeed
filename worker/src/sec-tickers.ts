import { Env } from './types';

/**
 * SEC company tickers ingest from data.sec.gov.
 *
 * Pulls the official ticker -> CIK -> company-name mapping from SEC.gov,
 * normalizes the CIK to the 10-digit zero-padded form used elsewhere in
 * the EDGAR API, and writes to KV. Daily cron, single small file.
 *
 * Source license: SEC publications are US Government works in the public
 * domain (17 USC s105). Free to redistribute; attribution shipped on
 * every response shape via SEC_ATTRIBUTION as a courtesy and to disclose
 * provenance to consuming agents.
 *
 * SEC requires a descriptive User-Agent identifying contact info on
 * automated requests; non-compliant traffic is rate-limited or blocked.
 *
 * V1 scope:
 *   - company_tickers.json (~1 MB raw, ~10k entries): full ticker -> CIK
 *     mapping for all SEC-registered companies with publicly traded stock.
 *
 * Deferred:
 *   - submissions/CIK{cik}.json (per-company filing history, premium tier)
 *   - api/xbrl/companyfacts/CIK{cik}.json (per-company XBRL fundamentals,
 *     premium tier)
 */

const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const FETCH_TIMEOUT_MS = 30_000;

const TICKERS_KEY = 'sec:tickers';
const TICKERS_META_KEY = 'sec:tickers:meta';

// SEC requires a descriptive User-Agent. Format per
// https://www.sec.gov/os/accessing-edgar-data: "Sample Company Name
// AdminContact@<sample company domain>.com"
const SEC_USER_AGENT = 'TensorFeed evan@tensorfeed.ai';

// ── Types ───────────────────────────────────────────────────────────

export interface SECTicker {
  cik: string;          // 10-digit zero-padded, e.g. "0000320193"
  cik_int: number;      // raw integer form, e.g. 320193
  ticker: string;       // e.g. "AAPL"
  company_name: string; // e.g. "Apple Inc."
}

export interface SECAttribution {
  source: string;
  source_url: string;
  license: string;
  license_url: string;
  required_credit: string;
}

export const SEC_ATTRIBUTION: SECAttribution = {
  source: 'U.S. Securities and Exchange Commission (EDGAR)',
  source_url: 'https://www.sec.gov/edgar/sec-api-documentation',
  license: 'Public domain (17 USC s105)',
  license_url: 'https://www.sec.gov/privacy.htm',
  required_credit:
    'Company tickers via the U.S. Securities and Exchange Commission EDGAR system. Public-domain US Government work.',
};

// ── Parser ──────────────────────────────────────────────────────────

// SEC ships company_tickers.json as an object keyed by stringified
// integers, each value being { cik_str: number, ticker: string,
// title: string }. We flatten to an array and normalize fields.
interface SECRawEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

export function parseTickersJSON(raw: unknown): SECTicker[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: SECTicker[] = [];
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const entry = (raw as Record<string, unknown>)[key] as SECRawEntry | undefined;
    if (!entry || typeof entry !== 'object') continue;
    const cikInt = Number(entry.cik_str);
    if (!Number.isFinite(cikInt) || cikInt <= 0) continue;
    const ticker = typeof entry.ticker === 'string' ? entry.ticker.trim().toUpperCase() : '';
    const company_name = typeof entry.title === 'string' ? entry.title.trim() : '';
    if (!ticker || !company_name) continue;
    out.push({
      cik: String(cikInt).padStart(10, '0'),
      cik_int: cikInt,
      ticker,
      company_name,
    });
  }
  // Deterministic order: alphabetical by ticker.
  out.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return out;
}

export async function fetchTickers(): Promise<SECTicker[]> {
  const res = await fetch(TICKERS_URL, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 300 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`sec tickers fetch failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  return parseTickersJSON(json);
}

// ── Cron entry point ─────────────────────────────────────────────────

export interface SECIngestResult {
  ok: boolean;
  tickers_count?: number;
  errors: string[];
  capturedAt: string;
}

export async function captureSECTickersDaily(env: Env): Promise<SECIngestResult> {
  const capturedAt = new Date().toISOString();
  const errors: string[] = [];
  let tickers_count: number | undefined;

  try {
    const tickers = await fetchTickers();
    await env.TENSORFEED_NEWS.put(TICKERS_KEY, JSON.stringify(tickers));
    await env.TENSORFEED_NEWS.put(
      TICKERS_META_KEY,
      JSON.stringify({
        count: tickers.length,
        capturedAt,
        source: TICKERS_URL,
      }),
    );
    tickers_count = tickers.length;
  } catch (err) {
    errors.push(`tickers: ${(err as Error).message}`);
  }

  return {
    ok: errors.length === 0,
    tickers_count,
    errors,
    capturedAt,
  };
}

// ── Read API ─────────────────────────────────────────────────────────

interface TickersMeta {
  count: number;
  capturedAt: string;
  source: string;
}

export interface SECTickersResponse {
  ok: true;
  count: number;
  tickers: SECTicker[];
  filters: {
    q?: string;
    ticker?: string;
  };
  data_freshness: { captured_at: string | null };
  attribution: SECAttribution;
}

export interface SECTickersOptions {
  q?: string;       // substring of company name OR ticker
  ticker?: string;  // exact ticker match (case-insensitive)
  limit?: number;
}

export async function readSECTickers(
  env: Env,
  options: SECTickersOptions = {},
): Promise<SECTickersResponse> {
  const all = ((await env.TENSORFEED_NEWS.get(TICKERS_KEY, 'json')) as SECTicker[] | null) ?? [];
  const meta = (await env.TENSORFEED_NEWS.get(TICKERS_META_KEY, 'json')) as TickersMeta | null;
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));

  const ticker = options.ticker?.toUpperCase().trim();
  const q = options.q?.toLowerCase().trim();

  const filtered = all.filter(t => {
    if (ticker && t.ticker !== ticker) return false;
    if (q) {
      const inName = t.company_name.toLowerCase().includes(q);
      const inTicker = t.ticker.toLowerCase().includes(q);
      if (!inName && !inTicker) return false;
    }
    return true;
  });

  return {
    ok: true,
    count: Math.min(filtered.length, limit),
    tickers: filtered.slice(0, limit),
    filters: {
      ...(options.q ? { q: options.q } : {}),
      ...(options.ticker ? { ticker: options.ticker } : {}),
    },
    data_freshness: { captured_at: meta?.capturedAt ?? null },
    attribution: SEC_ATTRIBUTION,
  };
}

export interface SECTickerDetailResponse {
  ok: true;
  ticker: SECTicker;
  data_freshness: { captured_at: string | null };
  attribution: SECAttribution;
}

export interface SECTickerDetailError {
  ok: false;
  error: string;
}

// Look up a single entry by either ticker symbol (e.g. "AAPL") or CIK.
// Accepts CIK in any of these forms: "320193", "0000320193", "CIK0000320193",
// "cik320193". Ticker matching is case-insensitive.
export async function readSECTicker(
  env: Env,
  identifier: string,
): Promise<SECTickerDetailResponse | SECTickerDetailError> {
  const all = ((await env.TENSORFEED_NEWS.get(TICKERS_KEY, 'json')) as SECTicker[] | null) ?? [];
  const meta = (await env.TENSORFEED_NEWS.get(TICKERS_META_KEY, 'json')) as TickersMeta | null;

  const raw = identifier.trim();
  if (!raw) return { ok: false, error: 'identifier_required' };

  // Try CIK form first (digits-only after stripping CIK prefix)
  const cikDigits = raw.replace(/^cik/i, '').replace(/^0+/, '');
  if (/^\d+$/.test(cikDigits)) {
    const cikInt = Number(cikDigits);
    const byCIK = all.find(t => t.cik_int === cikInt);
    if (byCIK) {
      return {
        ok: true,
        ticker: byCIK,
        data_freshness: { captured_at: meta?.capturedAt ?? null },
        attribution: SEC_ATTRIBUTION,
      };
    }
  }

  // Fall back to ticker symbol match
  const upper = raw.toUpperCase();
  const byTicker = all.find(t => t.ticker === upper);
  if (byTicker) {
    return {
      ok: true,
      ticker: byTicker,
      data_freshness: { captured_at: meta?.capturedAt ?? null },
      attribution: SEC_ATTRIBUTION,
    };
  }

  return { ok: false, error: 'ticker_not_found' };
}
