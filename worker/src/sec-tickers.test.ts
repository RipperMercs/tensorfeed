/**
 * Pure-logic tests for sec-tickers (SEC company tickers ingest).
 *
 * Covers JSON parsing/normalization (CIK zero-padding, ticker upper-casing,
 * skip rules) and the read helpers with ticker / CIK / search filters.
 * Network fetches (fetchTickers) are not tested here; they would require
 * a fixture HTTP layer beyond V1 scope.
 */

import { describe, it, expect } from 'vitest';
import {
  parseTickersJSON,
  readSECTickers,
  readSECTicker,
  SEC_ATTRIBUTION,
  SECTicker,
} from './sec-tickers';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const news = makeKV(initial);
  return {
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV({}) as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

// ── parseTickersJSON ────────────────────────────────────────────────

describe('parseTickersJSON', () => {
  it('parses the SEC schema (object keyed by stringified integer)', () => {
    const raw = {
      '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
      '1': { cik_str: 789019, ticker: 'MSFT', title: 'Microsoft Corp' },
    };
    const out = parseTickersJSON(raw);
    expect(out).toHaveLength(2);
    const aapl = out.find(t => t.ticker === 'AAPL')!;
    expect(aapl.cik).toBe('0000320193');
    expect(aapl.cik_int).toBe(320193);
    expect(aapl.company_name).toBe('Apple Inc.');
  });

  it('zero-pads CIK to 10 digits', () => {
    const raw = {
      '0': { cik_str: 1, ticker: 'X', title: 'X Corp' },
      '1': { cik_str: 1234567890, ticker: 'BIG', title: 'Big Corp' },
    };
    const out = parseTickersJSON(raw);
    expect(out.find(t => t.ticker === 'X')!.cik).toBe('0000000001');
    expect(out.find(t => t.ticker === 'BIG')!.cik).toBe('1234567890');
  });

  it('upper-cases ticker symbols', () => {
    const raw = { '0': { cik_str: 1, ticker: 'aapl', title: 'Apple Inc.' } };
    expect(parseTickersJSON(raw)[0].ticker).toBe('AAPL');
  });

  it('returns alphabetical-by-ticker order', () => {
    const raw = {
      '0': { cik_str: 3, ticker: 'ZZZ', title: 'Z Corp' },
      '1': { cik_str: 1, ticker: 'AAA', title: 'A Corp' },
      '2': { cik_str: 2, ticker: 'MMM', title: 'M Corp' },
    };
    const out = parseTickersJSON(raw);
    expect(out.map(t => t.ticker)).toEqual(['AAA', 'MMM', 'ZZZ']);
  });

  it('skips entries with missing or invalid fields', () => {
    const raw = {
      '0': { cik_str: 1, ticker: 'OK', title: 'OK Corp' },
      '1': { cik_str: 0, ticker: 'BAD', title: 'Bad Corp' },          // zero CIK
      '2': { cik_str: 2, ticker: '', title: 'No Ticker' },             // empty ticker
      '3': { cik_str: 3, ticker: 'NONAME', title: '' },                 // empty title
      '4': null,                                                        // null entry
      '5': { ticker: 'NOCIK', title: 'No CIK Corp' },                  // no cik_str
    };
    const out = parseTickersJSON(raw);
    expect(out).toHaveLength(1);
    expect(out[0].ticker).toBe('OK');
  });

  it('returns empty array for non-object input', () => {
    expect(parseTickersJSON(null)).toEqual([]);
    expect(parseTickersJSON(undefined)).toEqual([]);
    expect(parseTickersJSON('not an object')).toEqual([]);
    expect(parseTickersJSON(42)).toEqual([]);
  });
});

// ── readSECTickers ──────────────────────────────────────────────────

const SAMPLE_TICKERS: SECTicker[] = [
  { cik: '0000320193', cik_int: 320193, ticker: 'AAPL', company_name: 'Apple Inc.' },
  { cik: '0000789019', cik_int: 789019, ticker: 'MSFT', company_name: 'Microsoft Corp' },
  { cik: '0001018724', cik_int: 1018724, ticker: 'AMZN', company_name: 'Amazon.com Inc.' },
  { cik: '0001652044', cik_int: 1652044, ticker: 'GOOGL', company_name: 'Alphabet Inc.' },
];

describe('readSECTickers', () => {
  it('returns all tickers up to limit', async () => {
    const env = makeEnv({
      'sec:tickers': SAMPLE_TICKERS,
      'sec:tickers:meta': { count: 4, capturedAt: '2026-05-08T04:15:00Z', source: 'x' },
    });
    const r = await readSECTickers(env);
    expect(r.count).toBe(4);
    expect(r.tickers).toHaveLength(4);
  });

  it('respects limit', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { limit: 2 });
    expect(r.count).toBe(2);
    expect(r.tickers).toHaveLength(2);
  });

  it('caps limit at 500', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { limit: 99999 });
    // Filtered count should still be 4, but the limit ceiling is 500
    expect(r.count).toBe(4);
  });

  it('filters by exact ticker (case-insensitive)', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { ticker: 'aapl' });
    expect(r.count).toBe(1);
    expect(r.tickers[0].company_name).toBe('Apple Inc.');
  });

  it('searches by company name substring', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { q: 'apple' });
    expect(r.count).toBe(1);
    expect(r.tickers[0].ticker).toBe('AAPL');
  });

  it('search matches ticker symbol too', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { q: 'msft' });
    expect(r.count).toBe(1);
    expect(r.tickers[0].ticker).toBe('MSFT');
  });

  it('handles empty corpus gracefully', async () => {
    const env = makeEnv({});
    const r = await readSECTickers(env);
    expect(r.count).toBe(0);
    expect(r.tickers).toEqual([]);
  });

  it('attaches public-domain attribution', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env);
    expect(r.attribution).toEqual(SEC_ATTRIBUTION);
    expect(r.attribution.license).toContain('Public domain');
  });

  it('echoes filters back in the response', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTickers(env, { q: 'corp', ticker: 'MSFT' });
    expect(r.filters).toEqual({ q: 'corp', ticker: 'MSFT' });
  });
});

// ── readSECTicker (single lookup) ────────────────────────────────────

describe('readSECTicker', () => {
  it('finds by ticker symbol (case-insensitive)', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, 'aapl');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ticker.company_name).toBe('Apple Inc.');
  });

  it('finds by integer CIK', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, '320193');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ticker.ticker).toBe('AAPL');
  });

  it('finds by zero-padded CIK', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, '0000320193');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ticker.ticker).toBe('AAPL');
  });

  it('finds by CIK-prefixed identifier', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, 'CIK0000320193');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ticker.ticker).toBe('AAPL');
  });

  it('returns error for unknown ticker', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, 'NOTREAL');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('ticker_not_found');
  });

  it('returns error for unknown CIK', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, '99999999');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('ticker_not_found');
  });

  it('returns error for empty identifier', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, '   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('identifier_required');
  });

  it('attaches attribution on success', async () => {
    const env = makeEnv({ 'sec:tickers': SAMPLE_TICKERS });
    const r = await readSECTicker(env, 'AAPL');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.attribution).toEqual(SEC_ATTRIBUTION);
  });
});
