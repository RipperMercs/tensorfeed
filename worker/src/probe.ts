import { Env } from './types';

/**
 * Active LLM endpoint probing.
 *
 * Every 15 minutes the Worker fires a small prompt at each major LLM
 * provider and records the result: HTTP status, time-to-first-byte,
 * total response time, and whether the response was a valid completion.
 * The aggregated dataset is unique because nobody else publishes
 * measured (vs. self-reported) LLM SLA data systematically.
 *
 * Free `/api/probe/latest`: pre-computed last-hour summary per provider.
 * Premium `/api/premium/probe/series?provider=&from=&to=`: daily
 * aggregates over a 90-day window for 1 credit per call.
 *
 * Each provider key is independently optional. Missing keys = the
 * provider is silently skipped on this cycle (the latest summary will
 * just not include it).
 *
 * Daily budget cap (PROBE_MAX_DAILY_CALLS) prevents a runaway cron from
 * burning through inference credits if the cron config ever misfires.
 */

const PROBE_MAX_DAILY_CALLS = 200; // per provider; 96 cycles/day at */15 leaves ~2x headroom
const PROBE_TIMEOUT_MS = 15000;
const SAMPLE_PROMPT = "Reply with exactly the word 'ok' and nothing else.";
const SAMPLE_MAX_TOKENS = 8;

const HOURLY_BUFFER_PREFIX = 'probe:buf:';
const LATEST_KEY = 'probe:latest';
const DAILY_PREFIX = 'probe:daily:';
const INDEX_KEY = 'probe:index';
const BUDGET_PREFIX = 'probe:budget:';
const RESULTS_PER_PROVIDER_BUFFER = 96; // 24h at 15-min cadence

const MAX_INDEX_DATES = 365 * 3;
export const PROBE_MAX_RANGE_DAYS = 90;
export const PROBE_DEFAULT_RANGE_DAYS = 30;

// === Types ===

export interface ProbeResult {
  provider: string;
  timestamp: string;          // ISO 8601
  ok: boolean;                // true if HTTP 2xx and response shape valid
  status: number;             // HTTP status code (0 if network error before status)
  ttfb_ms: number;            // time to first response byte
  total_ms: number;           // total time including body read
  tokens_in?: number;
  tokens_out?: number;
  error?: string;             // non-empty when ok=false
}

export interface ProviderAggregate {
  provider: string;
  count: number;
  success_count: number;
  ok_pct: number;             // 0..1
  ttfb: { p50: number | null; p95: number | null; p99: number | null };
  total: { p50: number | null; p95: number | null; p99: number | null };
  status_codes: Record<string, number>;
  last_probe_at: string | null;
  last_error: string | null;
}

export interface LatestSummary {
  computed_at: string;
  window_label: string;       // e.g. "last_24h"
  providers: ProviderAggregate[];
}

export interface DailyAggregate extends ProviderAggregate {
  date: string;               // YYYY-MM-DD
  uptime_pct: number;         // == ok_pct, named for clarity
  incident_hours: Array<{ hour: string; ok_pct: number }>;
}

// === Provider configurations ===

interface ProviderConfig {
  key: string;
  envVar: keyof Env;
  url: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: () => string;
  parseTokens: (json: unknown) => { tokens_in?: number; tokens_out?: number };
  validateResponse: (json: unknown) => boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    key: 'anthropic',
    envVar: 'PROBE_ANTHROPIC_KEY',
    url: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (k) => ({
      'content-type': 'application/json',
      'x-api-key': k,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: () => JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: SAMPLE_MAX_TOKENS,
      messages: [{ role: 'user', content: SAMPLE_PROMPT }],
    }),
    parseTokens: (j) => {
      const u = (j as { usage?: { input_tokens?: number; output_tokens?: number } })?.usage;
      return { tokens_in: u?.input_tokens, tokens_out: u?.output_tokens };
    },
    validateResponse: (j) => {
      const c = (j as { content?: Array<{ text?: string }> })?.content;
      return Array.isArray(c) && c.length > 0;
    },
  },
  {
    key: 'openai',
    envVar: 'PROBE_OPENAI_KEY',
    url: 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (k) => ({
      'content-type': 'application/json',
      authorization: `Bearer ${k}`,
    }),
    buildBody: () => JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: SAMPLE_MAX_TOKENS,
      messages: [{ role: 'user', content: SAMPLE_PROMPT }],
    }),
    parseTokens: (j) => {
      const u = (j as { usage?: { prompt_tokens?: number; completion_tokens?: number } })?.usage;
      return { tokens_in: u?.prompt_tokens, tokens_out: u?.completion_tokens };
    },
    validateResponse: (j) => {
      const c = (j as { choices?: Array<{ message?: { content?: string } }> })?.choices;
      return Array.isArray(c) && c.length > 0;
    },
  },
  {
    key: 'google',
    envVar: 'PROBE_GOOGLE_KEY',
    // gemini key goes in query param per Google's REST convention
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    buildHeaders: () => ({ 'content-type': 'application/json' }),
    buildBody: () => JSON.stringify({
      contents: [{ parts: [{ text: SAMPLE_PROMPT }] }],
      generationConfig: { maxOutputTokens: SAMPLE_MAX_TOKENS },
    }),
    parseTokens: (j) => {
      const u = (j as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })?.usageMetadata;
      return { tokens_in: u?.promptTokenCount, tokens_out: u?.candidatesTokenCount };
    },
    validateResponse: (j) => {
      const c = (j as { candidates?: Array<{ content?: unknown }> })?.candidates;
      return Array.isArray(c) && c.length > 0;
    },
  },
  {
    key: 'mistral',
    envVar: 'PROBE_MISTRAL_KEY',
    url: 'https://api.mistral.ai/v1/chat/completions',
    buildHeaders: (k) => ({
      'content-type': 'application/json',
      authorization: `Bearer ${k}`,
    }),
    buildBody: () => JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: SAMPLE_MAX_TOKENS,
      messages: [{ role: 'user', content: SAMPLE_PROMPT }],
    }),
    parseTokens: (j) => {
      const u = (j as { usage?: { prompt_tokens?: number; completion_tokens?: number } })?.usage;
      return { tokens_in: u?.prompt_tokens, tokens_out: u?.completion_tokens };
    },
    validateResponse: (j) => {
      const c = (j as { choices?: Array<unknown> })?.choices;
      return Array.isArray(c) && c.length > 0;
    },
  },
  {
    key: 'cohere',
    envVar: 'PROBE_COHERE_KEY',
    url: 'https://api.cohere.com/v2/chat',
    buildHeaders: (k) => ({
      'content-type': 'application/json',
      authorization: `Bearer ${k}`,
    }),
    buildBody: () => JSON.stringify({
      model: 'command-r7b-12-2024',
      max_tokens: SAMPLE_MAX_TOKENS,
      messages: [{ role: 'user', content: SAMPLE_PROMPT }],
    }),
    parseTokens: (j) => {
      const u = (j as { usage?: { tokens?: { input_tokens?: number; output_tokens?: number } } })?.usage?.tokens;
      return { tokens_in: u?.input_tokens, tokens_out: u?.output_tokens };
    },
    validateResponse: (j) => {
      const m = (j as { message?: { content?: unknown } })?.message;
      return m !== undefined && m !== null;
    },
  },
];

// === Pure logic: percentile + aggregate ===

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

export function aggregateResults(provider: string, results: ProbeResult[]): ProviderAggregate {
  const successes = results.filter(r => r.ok);
  const ttfbValues = successes.map(r => r.ttfb_ms);
  const totalValues = successes.map(r => r.total_ms);
  const status_codes: Record<string, number> = {};
  for (const r of results) {
    const k = String(r.status);
    status_codes[k] = (status_codes[k] || 0) + 1;
  }
  const last = results[results.length - 1];
  const lastError = [...results].reverse().find(r => !r.ok && r.error)?.error || null;
  return {
    provider,
    count: results.length,
    success_count: successes.length,
    ok_pct: results.length === 0 ? 0 : successes.length / results.length,
    ttfb: { p50: percentile(ttfbValues, 0.5), p95: percentile(ttfbValues, 0.95), p99: percentile(ttfbValues, 0.99) },
    total: { p50: percentile(totalValues, 0.5), p95: percentile(totalValues, 0.95), p99: percentile(totalValues, 0.99) },
    status_codes,
    last_probe_at: last?.timestamp || null,
    last_error: lastError,
  };
}

// === Single probe ===

async function probeProvider(env: Env, cfg: ProviderConfig): Promise<ProbeResult> {
  const apiKey = env[cfg.envVar] as string | undefined;
  const ts = new Date().toISOString();
  if (!apiKey) {
    // Should never reach here if filter happened upstream, but defend.
    return { provider: cfg.key, timestamp: ts, ok: false, status: 0, ttfb_ms: 0, total_ms: 0, error: 'no_api_key' };
  }
  let url = cfg.url;
  // Google passes the key in the query string instead of a header.
  if (cfg.key === 'google') {
    url = `${cfg.url}?key=${encodeURIComponent(apiKey)}`;
  }
  const start = Date.now();
  let ttfbAt = 0;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: cfg.buildHeaders(apiKey),
      body: cfg.buildBody(),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    ttfbAt = Date.now();
    const status = res.status;
    let body: unknown = null;
    let bodyText = '';
    try {
      bodyText = await res.text();
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // non-JSON body is itself a failure for chat endpoints
    }
    const total = Date.now() - start;
    const ttfb = ttfbAt - start;
    if (!res.ok) {
      return {
        provider: cfg.key,
        timestamp: ts,
        ok: false,
        status,
        ttfb_ms: ttfb,
        total_ms: total,
        error: bodyText.slice(0, 200) || `http_${status}`,
      };
    }
    const valid = cfg.validateResponse(body);
    if (!valid) {
      return {
        provider: cfg.key,
        timestamp: ts,
        ok: false,
        status,
        ttfb_ms: ttfb,
        total_ms: total,
        error: 'invalid_response_shape',
      };
    }
    const tokens = cfg.parseTokens(body);
    return {
      provider: cfg.key,
      timestamp: ts,
      ok: true,
      status,
      ttfb_ms: ttfb,
      total_ms: total,
      ...tokens,
    };
  } catch (err) {
    const total = Date.now() - start;
    return {
      provider: cfg.key,
      timestamp: ts,
      ok: false,
      status: 0,
      ttfb_ms: ttfbAt > 0 ? ttfbAt - start : 0,
      total_ms: total,
      error: (err as Error).message?.slice(0, 200) || 'fetch_failed',
    };
  }
}

// === Budget enforcement ===

async function isWithinBudget(env: Env, providerKey: string, today: string): Promise<boolean> {
  const k = `${BUDGET_PREFIX}${today}:${providerKey}`;
  const v = await env.TENSORFEED_CACHE.get(k, 'json') as { count?: number } | null;
  return (v?.count || 0) < PROBE_MAX_DAILY_CALLS;
}

async function recordSpend(env: Env, providerKey: string, today: string): Promise<void> {
  const k = `${BUDGET_PREFIX}${today}:${providerKey}`;
  const v = await env.TENSORFEED_CACHE.get(k, 'json') as { count?: number } | null;
  const next = (v?.count || 0) + 1;
  // 36-hour TTL so the key naturally expires after the day rolls
  await env.TENSORFEED_CACHE.put(k, JSON.stringify({ count: next }), { expirationTtl: 36 * 60 * 60 });
}

// === Buffer + aggregate persistence ===

async function appendToBuffer(env: Env, providerKey: string, result: ProbeResult): Promise<ProbeResult[]> {
  const k = `${HOURLY_BUFFER_PREFIX}${providerKey}`;
  const buf = (await env.TENSORFEED_CACHE.get(k, 'json')) as ProbeResult[] | null;
  const next = [...(buf || []), result].slice(-RESULTS_PER_PROVIDER_BUFFER);
  await env.TENSORFEED_CACHE.put(k, JSON.stringify(next));
  return next;
}

async function readBuffer(env: Env, providerKey: string): Promise<ProbeResult[]> {
  const k = `${HOURLY_BUFFER_PREFIX}${providerKey}`;
  return ((await env.TENSORFEED_CACHE.get(k, 'json')) as ProbeResult[] | null) || [];
}

async function writeLatestSummary(env: Env, summary: LatestSummary): Promise<void> {
  await env.TENSORFEED_CACHE.put(LATEST_KEY, JSON.stringify(summary));
}

async function readDaily(env: Env, date: string, providerKey: string): Promise<DailyAggregate | null> {
  const k = `${DAILY_PREFIX}${date}:${providerKey}`;
  return (await env.TENSORFEED_CACHE.get(k, 'json')) as DailyAggregate | null;
}

async function writeDaily(env: Env, date: string, providerKey: string, agg: DailyAggregate): Promise<void> {
  const k = `${DAILY_PREFIX}${date}:${providerKey}`;
  await env.TENSORFEED_CACHE.put(k, JSON.stringify(agg));
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = ((await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null) || [];
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

// === Public API: cron handler ===

export interface CycleResult {
  ok: true;
  ran_at: string;
  probed: string[];
  skipped: { provider: string; reason: string }[];
}

export async function runProbeCycle(env: Env): Promise<CycleResult> {
  const ranAt = new Date().toISOString();
  const today = ranAt.slice(0, 10);

  const enabled = PROVIDERS.filter(p => !!env[p.envVar]);
  const skipped: { provider: string; reason: string }[] = [];
  for (const p of PROVIDERS) {
    if (!env[p.envVar]) skipped.push({ provider: p.key, reason: 'no_api_key' });
  }

  const eligible: ProviderConfig[] = [];
  for (const cfg of enabled) {
    if (await isWithinBudget(env, cfg.key, today)) {
      eligible.push(cfg);
    } else {
      skipped.push({ provider: cfg.key, reason: 'daily_budget_exceeded' });
    }
  }

  const results = await Promise.all(eligible.map(cfg => probeProvider(env, cfg)));

  // Append each result to the per-provider 24h ring buffer + record spend
  const aggregates: ProviderAggregate[] = [];
  for (let i = 0; i < eligible.length; i++) {
    const cfg = eligible[i];
    const r = results[i];
    const buf = await appendToBuffer(env, cfg.key, r);
    aggregates.push(aggregateResults(cfg.key, buf));
    await recordSpend(env, cfg.key, today);
  }

  // Also include providers that have keys but were budget-skipped this cycle
  // (so the latest summary still shows their last-known state).
  for (const s of skipped) {
    if (s.reason === 'daily_budget_exceeded') {
      const buf = await readBuffer(env, s.provider);
      if (buf.length > 0) aggregates.push(aggregateResults(s.provider, buf));
    }
  }

  const summary: LatestSummary = {
    computed_at: ranAt,
    window_label: 'last_24h',
    providers: aggregates,
  };
  await writeLatestSummary(env, summary);

  return {
    ok: true,
    ran_at: ranAt,
    probed: eligible.map(c => c.key),
    skipped,
  };
}

// === Public API: daily rollup ===

/**
 * Roll up yesterday's per-provider 24h buffer into a dated daily aggregate
 * for premium time-series queries. Run via a daily cron at the day boundary.
 * Idempotent: re-running the same day overwrites with the same data.
 */
export async function rollupYesterday(env: Env): Promise<{ date: string; rolled_up: string[] }> {
  const yest = new Date();
  yest.setUTCDate(yest.getUTCDate() - 1);
  const date = yest.toISOString().slice(0, 10);
  const rolled: string[] = [];
  for (const cfg of PROVIDERS) {
    if (!env[cfg.envVar]) continue;
    const buf = await readBuffer(env, cfg.key);
    if (buf.length === 0) continue;
    // Filter to entries actually within the date
    const dayResults = buf.filter(r => r.timestamp.startsWith(date));
    if (dayResults.length === 0) continue;
    const base = aggregateResults(cfg.key, dayResults);
    const incidents = computeIncidentHours(dayResults);
    const daily: DailyAggregate = {
      ...base,
      date,
      uptime_pct: base.ok_pct,
      incident_hours: incidents,
    };
    await writeDaily(env, date, cfg.key, daily);
    rolled.push(cfg.key);
  }
  if (rolled.length > 0) await pushIndexDate(env, date);
  return { date, rolled_up: rolled };
}

function computeIncidentHours(results: ProbeResult[]): Array<{ hour: string; ok_pct: number }> {
  // Group by hour, compute ok_pct, return hours below 0.95 threshold
  const byHour = new Map<string, ProbeResult[]>();
  for (const r of results) {
    const hour = r.timestamp.slice(0, 13); // "YYYY-MM-DDTHH"
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(r);
  }
  const incidents: Array<{ hour: string; ok_pct: number }> = [];
  for (const [hour, arr] of byHour) {
    const ok = arr.filter(r => r.ok).length;
    const pct = arr.length === 0 ? 0 : ok / arr.length;
    if (pct < 0.95) incidents.push({ hour, ok_pct: pct });
  }
  return incidents.sort((a, b) => (a.hour < b.hour ? -1 : 1));
}

// === Public API: read endpoints ===

export async function getLatestSummary(env: Env): Promise<LatestSummary | null> {
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as LatestSummary | null;
}

export interface SeriesPoint {
  date: string;
  count: number | null;
  ok_pct: number | null;
  uptime_pct: number | null;
  ttfb_p50: number | null;
  ttfb_p95: number | null;
  ttfb_p99: number | null;
  total_p50: number | null;
  total_p95: number | null;
  total_p99: number | null;
  incident_hours: number;
  has_data: boolean;
}

export interface SeriesResult {
  provider: string;
  from: string;
  to: string;
  days: number;
  points: SeriesPoint[];
  summary: {
    overall_uptime_pct: number | null;
    days_with_data: number;
    days_with_incidents: number;
  };
  notes: string[];
}

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayUTC(): string { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const A = new Date(`${a}T00:00:00Z`).getTime();
  const B = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((B - A) / 86400000);
}

export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };
  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(PROBE_DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  if (daysBetween(from, to) + 1 > PROBE_MAX_RANGE_DAYS) {
    return { ok: false, error: 'range_exceeds_max_days' };
  }
  return { ok: true, from, to };
}

export function listProviders(): string[] {
  return PROVIDERS.map(p => p.key);
}

export async function getProviderSeries(env: Env, provider: string, from: string, to: string): Promise<SeriesResult> {
  if (!PROVIDERS.find(p => p.key === provider)) {
    return {
      provider,
      from,
      to,
      days: 0,
      points: [],
      summary: { overall_uptime_pct: null, days_with_data: 0, days_with_incidents: 0 },
      notes: [`unknown_provider: known providers are ${listProviders().join(', ')}`],
    };
  }
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const aggs = await Promise.all(
    dates.map(d => readDaily(env, d, provider)),
  );

  const points: SeriesPoint[] = dates.map((date, i) => {
    const a = aggs[i];
    if (!a) {
      return {
        date,
        count: null,
        ok_pct: null,
        uptime_pct: null,
        ttfb_p50: null, ttfb_p95: null, ttfb_p99: null,
        total_p50: null, total_p95: null, total_p99: null,
        incident_hours: 0,
        has_data: false,
      };
    }
    return {
      date,
      count: a.count,
      ok_pct: a.ok_pct,
      uptime_pct: a.uptime_pct,
      ttfb_p50: a.ttfb.p50,
      ttfb_p95: a.ttfb.p95,
      ttfb_p99: a.ttfb.p99,
      total_p50: a.total.p50,
      total_p95: a.total.p95,
      total_p99: a.total.p99,
      incident_hours: a.incident_hours.length,
      has_data: true,
    };
  });

  const withData = points.filter(p => p.has_data);
  const overall = withData.length === 0
    ? null
    : withData.reduce((s, p) => s + (p.ok_pct || 0), 0) / withData.length;
  const incidentDays = withData.filter(p => p.incident_hours > 0).length;

  const notes: string[] = [];
  const missing = points.length - withData.length;
  if (missing > 0) notes.push(`${missing} day(s) in range have no captured data yet`);

  return {
    provider,
    from,
    to,
    days: points.length,
    points,
    summary: {
      overall_uptime_pct: overall,
      days_with_data: withData.length,
      days_with_incidents: incidentDays,
    },
    notes,
  };
}
