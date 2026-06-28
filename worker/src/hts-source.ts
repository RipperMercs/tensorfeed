import type { Env } from './types';

/**
 * I/O for the USITC Harmonized Tariff Schedule (HTS) reststop API.
 *
 *   exportList?from=&to=&format=JSON  -> base HTS records (rate columns).
 *   search?keyword=                   -> Chapter 99 add-on records.
 *
 * No auth. The data is US Government public domain. The research probe reached
 * hts.usitc.gov from a datacenter, but cbp.gov bot-gates datacenter egress, so a
 * descriptive User-Agent is set and the live Worker reachability MUST still be
 * probed before the verdict is trusted. Every fetch fails to null so the verdict
 * layer can degrade to a no-charge "source unavailable" rather than guess.
 *
 * Pure I/O: rate-string parsing lives in tariff-rates.ts, the verdict assembly
 * in premium-landed-cost-verdict.ts.
 */

export const HTS_EXPORT_URL = 'https://hts.usitc.gov/reststop/exportList';
export const HTS_SEARCH_URL = 'https://hts.usitc.gov/reststop/search';

const FETCH_TIMEOUT_MS = 12000;
const UA = 'tensorfeed-landed-cost/1.0 (+https://tensorfeed.ai)';

export interface HtsFootnote {
  value: string;
  columns: string[];
}

export interface HtsRecord {
  htsno: string;
  description: string;
  units: string[];
  general: string; // Column 1 General (MFN) rate text
  special: string; // Column 1 Special (FTA/preferential) rate text
  other: string; // Column 2 rate text
  footnotes: HtsFootnote[];
}

export interface Chapter99Record {
  htsno: string;
  description: string;
  rate_text: string; // the add-on rate, e.g. "...applicable subheading + 7.5%"
}

interface RawHtsRecord {
  htsno?: string | null;
  description?: string | null;
  units?: Array<string | null> | null;
  general?: string | null;
  special?: string | null;
  other?: string | null;
  footnotes?: Array<{ value?: string | null; columns?: Array<string | null> | null } | null> | null;
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

function normalizeRecord(raw: RawHtsRecord): HtsRecord {
  return {
    htsno: String(raw.htsno ?? ''),
    description: String(raw.description ?? ''),
    units: (raw.units ?? []).filter((u): u is string => typeof u === 'string'),
    general: String(raw.general ?? ''),
    special: String(raw.special ?? ''),
    other: String(raw.other ?? ''),
    footnotes: (raw.footnotes ?? [])
      .filter((f): f is { value?: string | null; columns?: Array<string | null> | null } => !!f)
      .map((f) => ({
        value: String(f.value ?? ''),
        columns: (f.columns ?? []).filter((c): c is string => typeof c === 'string'),
      })),
  };
}

async function getJson(url: string, fetchFn: typeof fetch): Promise<unknown | null> {
  try {
    const res = await fetchFn(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHtsRecord(
  env: Env,
  htsno: string,
  fetchFn: typeof fetch = fetch,
): Promise<HtsRecord | null> {
  const code = htsno.trim();
  const params = new URLSearchParams({ from: code, to: code, format: 'JSON', styles: 'true' });
  const data = await getJson(`${HTS_EXPORT_URL}?${params.toString()}`, fetchFn);
  if (!Array.isArray(data)) return null;
  const wantDigits = digitsOnly(code);
  const matches = (data as RawHtsRecord[]).filter(
    (r) => digitsOnly(String(r.htsno ?? '')) === wantDigits,
  );
  if (matches.length === 0) return null;
  // Parent/header lines come back with empty rate fields; prefer the line that
  // actually carries a rate.
  const withRate = matches.find((r) => String(r.general ?? '').trim().length > 0);
  return normalizeRecord(withRate ?? matches[0]);
}

export async function fetchChapter99Record(
  env: Env,
  code: string,
  fetchFn: typeof fetch = fetch,
): Promise<Chapter99Record | null> {
  const params = new URLSearchParams({ keyword: code.trim() });
  const data = await getJson(`${HTS_SEARCH_URL}?${params.toString()}`, fetchFn);
  if (!Array.isArray(data)) return null;
  const wantDigits = digitsOnly(code);
  const match = (data as RawHtsRecord[]).find(
    (r) => digitsOnly(String(r.htsno ?? '')) === wantDigits,
  );
  if (!match) return null;
  return {
    htsno: String(match.htsno ?? ''),
    description: String(match.description ?? ''),
    rate_text: String(match.general ?? ''),
  };
}

/**
 * Pull Chapter 99 codes (9903.xx.xx) out of an HTS line's footnote endnotes.
 * The footnote linkage is the official mechanism connecting a base line to its
 * stacked add-on tariffs. Order preserved, deduped.
 */
export function extractChapter99Codes(
  footnotes: Array<{ value?: string | null; columns?: unknown }>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /9903\.\d{2}\.\d{2}/g;
  for (const f of footnotes) {
    const text = String(f?.value ?? '');
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!seen.has(m[0])) {
        seen.add(m[0]);
        out.push(m[0]);
      }
    }
  }
  return out;
}
