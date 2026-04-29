import { Env } from './types';

/**
 * Premium history series: derived/aggregated views over daily history:*
 * snapshots captured by worker/src/history.ts (Phase 0).
 *
 * Free `/api/history/{date}/{type}` returns a single day's full payload.
 * These functions return aggregated time series, deltas, uptime rollups,
 * and date-vs-date diffs. They are exposed under `/api/premium/history/*`
 * and gated by the credits/x402 payment middleware.
 *
 * Cap on range size: 90 days. Each request reads up to 90 KV keys; at MVP
 * scale this is fine, but if the range is too wide the cost outpaces the
 * 1-credit charge.
 */

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

export type HistoryType = 'pricing' | 'models' | 'benchmarks' | 'status' | 'agent-activity';

interface HistorySnapshot<T = unknown> {
  date: string;
  type: HistoryType;
  capturedAt: string;
  data: T;
}

// === Date helpers ===

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) {
    out.push(addDays(from, i));
  }
  return out;
}

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from: string;
  to: string;
}

/**
 * Resolve and validate `from`/`to` query params. Defaults to the last
 * DEFAULT_RANGE_DAYS ending today. Caps at MAX_RANGE_DAYS.
 */
export function resolveRange(fromParam?: string | null, toParam?: string | null): RangeResolution {
  const today = todayUTC();
  let from = fromParam || '';
  let to = toParam || today;

  if (!from && !fromParam) {
    from = addDays(today, -(DEFAULT_RANGE_DAYS - 1));
  }
  if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date_format', from, to };
  }
  if (!ISO_DATE.test(to)) {
    return { ok: false, error: 'invalid_to_date_format', from, to };
  }
  if (daysBetween(from, to) < 0) {
    return { ok: false, error: 'from_after_to', from, to };
  }
  const span = daysBetween(from, to) + 1;
  if (span > MAX_RANGE_DAYS) {
    return { ok: false, error: `range_exceeds_${MAX_RANGE_DAYS}_days`, from, to };
  }
  return { ok: true, from, to };
}

// === KV access ===

async function readSnapshot<T>(
  env: Env,
  date: string,
  type: HistoryType,
): Promise<HistorySnapshot<T> | null> {
  return (await env.TENSORFEED_CACHE.get(
    `history:${date}:${type}`,
    'json',
  )) as HistorySnapshot<T> | null;
}

async function readSnapshotRange<T>(
  env: Env,
  from: string,
  to: string,
  type: HistoryType,
): Promise<{ date: string; snapshot: HistorySnapshot<T> | null }[]> {
  const dates = enumerateDates(from, to);
  const snapshots = await Promise.all(
    dates.map(async date => ({
      date,
      snapshot: await readSnapshot<T>(env, date, type),
    })),
  );
  return snapshots;
}

// === Domain shapes (mirrors of routing.ts internal types) ===

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
  capabilities?: string[];
  tier?: string;
  openSource?: boolean;
}

interface ProviderPricing {
  id: string;
  name: string;
  models: ModelPricing[];
}

interface PricingPayload {
  lastUpdated?: string;
  providers: ProviderPricing[];
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  scores: Record<string, number>;
}

interface BenchmarksPayload {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

interface ServiceStatusEntry {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

// === Lookup helpers ===

function findPricingModel(payload: PricingPayload | null, modelKey: string):
  | { provider: ProviderPricing; model: ModelPricing }
  | null {
  if (!payload?.providers) return null;
  const k = modelKey.toLowerCase();
  for (const p of payload.providers) {
    for (const m of p.models) {
      if (m.id.toLowerCase() === k || m.name.toLowerCase() === k) {
        return { provider: p, model: m };
      }
    }
  }
  return null;
}

function findBenchmarkModel(
  payload: BenchmarksPayload | null,
  modelKey: string,
): BenchmarkModelEntry | null {
  if (!payload?.models) return null;
  const k = modelKey.toLowerCase();
  return payload.models.find(m => m.model.toLowerCase() === k) ?? null;
}

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

function pctDelta(first: number, last: number): number | null {
  if (first === 0) return null;
  return round4(((last - first) / first) * 100);
}

// === Pricing series ===

export interface PricingSeriesPoint {
  date: string;
  input: number;
  output: number;
  blended: number;
}

export interface PricingSeriesResult {
  ok: true;
  model: string;
  provider: string | null;
  range: { from: string; to: string; days: number };
  resolution: 'daily';
  points: PricingSeriesPoint[];
  summary: {
    first: PricingSeriesPoint | null;
    latest: PricingSeriesPoint | null;
    min_blended: number | null;
    max_blended: number | null;
    delta_pct_blended: number | null;
    changes_detected: number;
    days_with_data: number;
    days_missing: number;
  };
}

export async function getPricingSeries(
  env: Env,
  modelKey: string,
  from: string,
  to: string,
): Promise<PricingSeriesResult> {
  const snapshots = await readSnapshotRange<PricingPayload>(env, from, to, 'models');
  const points: PricingSeriesPoint[] = [];
  let providerName: string | null = null;
  let daysMissing = 0;

  for (const { date, snapshot } of snapshots) {
    if (!snapshot) {
      daysMissing += 1;
      continue;
    }
    const found = findPricingModel(snapshot.data, modelKey);
    if (!found) {
      daysMissing += 1;
      continue;
    }
    if (!providerName) providerName = found.provider.name;
    const input = found.model.inputPrice;
    const output = found.model.outputPrice;
    const blended = (input + output) / 2;
    points.push({ date, input, output, blended: round4(blended) });
  }

  let changes = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i].input !== points[i - 1].input ||
      points[i].output !== points[i - 1].output
    ) {
      changes += 1;
    }
  }

  const first = points[0] ?? null;
  const latest = points[points.length - 1] ?? null;
  const blendedValues = points.map(p => p.blended);
  const min_blended = blendedValues.length ? Math.min(...blendedValues) : null;
  const max_blended = blendedValues.length ? Math.max(...blendedValues) : null;
  const delta_pct_blended =
    first && latest ? pctDelta(first.blended, latest.blended) : null;

  return {
    ok: true,
    model: modelKey,
    provider: providerName,
    range: { from, to, days: daysBetween(from, to) + 1 },
    resolution: 'daily',
    points,
    summary: {
      first,
      latest,
      min_blended,
      max_blended,
      delta_pct_blended,
      changes_detected: changes,
      days_with_data: points.length,
      days_missing: daysMissing,
    },
  };
}

// === Benchmark series ===

export interface BenchmarkSeriesPoint {
  date: string;
  score: number;
}

export interface BenchmarkSeriesResult {
  ok: true;
  model: string;
  benchmark: string;
  range: { from: string; to: string; days: number };
  points: BenchmarkSeriesPoint[];
  summary: {
    first: BenchmarkSeriesPoint | null;
    latest: BenchmarkSeriesPoint | null;
    min_score: number | null;
    max_score: number | null;
    delta_pp: number | null;
    days_with_data: number;
    days_missing: number;
  };
}

export async function getBenchmarkSeries(
  env: Env,
  modelKey: string,
  benchmark: string,
  from: string,
  to: string,
): Promise<BenchmarkSeriesResult> {
  const snapshots = await readSnapshotRange<BenchmarksPayload>(env, from, to, 'benchmarks');
  const points: BenchmarkSeriesPoint[] = [];
  const benchKey = benchmark.toLowerCase();
  let daysMissing = 0;

  for (const { date, snapshot } of snapshots) {
    if (!snapshot) {
      daysMissing += 1;
      continue;
    }
    const entry = findBenchmarkModel(snapshot.data, modelKey);
    if (!entry) {
      daysMissing += 1;
      continue;
    }
    const scores = entry.scores ?? {};
    const matchKey = Object.keys(scores).find(k => k.toLowerCase() === benchKey);
    if (!matchKey) {
      daysMissing += 1;
      continue;
    }
    const value = scores[matchKey];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      daysMissing += 1;
      continue;
    }
    points.push({ date, score: round4(value) });
  }

  const first = points[0] ?? null;
  const latest = points[points.length - 1] ?? null;
  const values = points.map(p => p.score);
  const min_score = values.length ? Math.min(...values) : null;
  const max_score = values.length ? Math.max(...values) : null;
  const delta_pp = first && latest ? round4(latest.score - first.score) : null;

  return {
    ok: true,
    model: modelKey,
    benchmark,
    range: { from, to, days: daysBetween(from, to) + 1 },
    points,
    summary: {
      first,
      latest,
      min_score,
      max_score,
      delta_pp,
      days_with_data: points.length,
      days_missing: daysMissing,
    },
  };
}

// === Status uptime ===

export interface UptimeIncidentDay {
  date: string;
  status: 'degraded' | 'down' | 'unknown';
}

export interface UptimeResult {
  ok: true;
  provider: string;
  range: { from: string; to: string; days: number };
  days_total: number;
  days_with_data: number;
  days_missing: number;
  days_operational: number;
  days_degraded: number;
  days_down: number;
  days_unknown: number;
  uptime_pct: number | null;
  incident_days: UptimeIncidentDay[];
}

function statusForProvider(
  services: ServiceStatusEntry[],
  providerKey: string,
): ServiceStatusEntry | null {
  const k = providerKey.toLowerCase();
  return (
    services.find(s => {
      const sp = (s.provider || '').toLowerCase();
      const sn = (s.name || '').toLowerCase();
      return sp === k || sn === k || sp.includes(k) || k.includes(sp);
    }) ?? null
  );
}

export async function getStatusUptime(
  env: Env,
  providerKey: string,
  from: string,
  to: string,
): Promise<UptimeResult> {
  const snapshots = await readSnapshotRange<ServiceStatusEntry[]>(env, from, to, 'status');
  let operational = 0;
  let degraded = 0;
  let down = 0;
  let unknown = 0;
  let withData = 0;
  let missing = 0;
  const incidents: UptimeIncidentDay[] = [];

  for (const { date, snapshot } of snapshots) {
    if (!snapshot || !Array.isArray(snapshot.data)) {
      missing += 1;
      continue;
    }
    const entry = statusForProvider(snapshot.data, providerKey);
    if (!entry) {
      missing += 1;
      continue;
    }
    withData += 1;
    switch (entry.status) {
      case 'operational':
        operational += 1;
        break;
      case 'degraded':
        degraded += 1;
        incidents.push({ date, status: 'degraded' });
        break;
      case 'down':
        down += 1;
        incidents.push({ date, status: 'down' });
        break;
      default:
        unknown += 1;
        incidents.push({ date, status: 'unknown' });
    }
  }

  const total = daysBetween(from, to) + 1;
  // Uptime denominator excludes missing-data days so a brief outage in our
  // capture doesn't skew the SLA report.
  const measurable = withData;
  const uptime_pct =
    measurable > 0 ? round4(((operational + degraded * 0.5) / measurable) * 100) : null;

  return {
    ok: true,
    provider: providerKey,
    range: { from, to, days: total },
    days_total: total,
    days_with_data: withData,
    days_missing: missing,
    days_operational: operational,
    days_degraded: degraded,
    days_down: down,
    days_unknown: unknown,
    uptime_pct,
    incident_days: incidents,
  };
}

