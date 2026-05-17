import { Env } from './types';
import { ORSnapshot, dailyKey as orDailyKey } from './openrouter-catalog';

/**
 * Premium time series over the daily OpenRouter catalog snapshots.
 *
 * openrouter-catalog.ts captures or:daily:{date} once per day on the
 * 14:00 UTC cron. OpenRouter's public /models endpoint serves only
 * current state, so this history cannot be backfilled: every day TF
 * captures and a competitor does not is a permanent, uncompressible
 * lead. This module is the paid read over that compounding record.
 *
 * Derived metric, grounded in what or:daily actually stores: per-day
 * catalog size, the cheapest paid input/output USD-per-million floor,
 * free-tier count, namespace breadth, plus day-over-day model
 * add/remove churn and per-model price-change counts versus the prior
 * day that has data. Note: OpenRouter exposes one entry per model id,
 * not per-provider sub-routes, so this is per-model and catalog-floor
 * drift, not per-provider routing drift.
 *
 * Mirrors mcp-registry.ts's range and series discipline: a pure
 * projection (no env, fully unit-testable) plus a thin env-bound
 * reader.
 */

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayUTC = (): string => new Date().toISOString().slice(0, 10);

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

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

/**
 * Same contract as mcp-registry.resolveRange: optional from/to, default
 * a trailing DEFAULT_RANGE_DAYS window ending today, hard cap at
 * MAX_RANGE_DAYS. Optional params (not required) so the route can stay
 * non-strict-premium like /api/premium/mcp/registry/series.
 */
export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };

  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  const span = daysBetween(from, to);
  if (span + 1 > MAX_RANGE_DAYS) return { ok: false, error: 'range_exceeds_max_days' };

  return { ok: true, from, to };
}

export interface ORSeriesPoint {
  date: string;
  total_models: number | null;
  cheapest_input_usd_per_m: number | null;
  cheapest_output_usd_per_m: number | null;
  free_tier_count: number | null;
  namespace_count: number | null;
  top_namespace: string | null;
  /** Models present today not present the prior has-data day. */
  added: number | null;
  /** Models present the prior has-data day not present today. */
  removed: number | null;
  /** Models present both days whose prompt or completion price changed. */
  price_changes: number | null;
  added_sample: string[];
  removed_sample: string[];
  has_data: boolean;
}

export interface ORAttribution {
  source: string;
  source_url: string;
  license: string;
  note: string;
}

export const OPENROUTER_ATTRIBUTION: ORAttribution = {
  source: 'OpenRouter',
  source_url: 'https://openrouter.ai/api/v1/models',
  license:
    'Public catalog data; pricing and capabilities owned by OpenRouter and the underlying inference providers.',
  note: 'OpenRouter serves only current state. This multi-day series is TensorFeed-captured and cannot be backfilled.',
};

export interface ORSeriesResult {
  from: string;
  to: string;
  days: number;
  points: ORSeriesPoint[];
  delta_in_window: {
    start_total: number | null;
    end_total: number | null;
    net: number | null;
    cheapest_input_start: number | null;
    cheapest_input_end: number | null;
    cheapest_output_start: number | null;
    cheapest_output_end: number | null;
  };
  attribution: ORAttribution;
  notes: string[];
}

const SAMPLE_CAP = 50;

type PriceMap = Map<string, { p: number | null; c: number | null }>;

/**
 * Pure: project an ordered list of (date, snapshot|null) into a series.
 *
 * Input MUST be chronologically ascending (getORSeries builds it that
 * way). Churn is computed against the most recent PRIOR day that has
 * data, so a missing day in the middle does not produce a spurious
 * full-catalog add then remove.
 */
export function projectORSeries(
  from: string,
  to: string,
  byDate: ReadonlyArray<{ date: string; snap: ORSnapshot | null }>,
): ORSeriesResult {
  let prevModels: PriceMap | null = null;

  const points: ORSeriesPoint[] = byDate.map(({ date, snap }) => {
    if (!snap) {
      return {
        date,
        total_models: null,
        cheapest_input_usd_per_m: null,
        cheapest_output_usd_per_m: null,
        free_tier_count: null,
        namespace_count: null,
        top_namespace: null,
        added: null,
        removed: null,
        price_changes: null,
        added_sample: [],
        removed_sample: [],
        has_data: false,
      };
    }

    const curModels: PriceMap = new Map();
    for (const m of snap.models) {
      curModels.set(m.id, { p: m.pricing.prompt, c: m.pricing.completion });
    }

    let added: number | null = null;
    let removed: number | null = null;
    let priceChanges: number | null = null;
    const addedSample: string[] = [];
    const removedSample: string[] = [];

    if (prevModels) {
      added = 0;
      removed = 0;
      priceChanges = 0;
      for (const [id, price] of curModels) {
        const prev = prevModels.get(id);
        if (!prev) {
          added++;
          if (addedSample.length < SAMPLE_CAP) addedSample.push(id);
        } else if (prev.p !== price.p || prev.c !== price.c) {
          priceChanges++;
        }
      }
      for (const id of prevModels.keys()) {
        if (!curModels.has(id)) {
          removed++;
          if (removedSample.length < SAMPLE_CAP) removedSample.push(id);
        }
      }
    }

    prevModels = curModels;

    return {
      date,
      total_models: snap.total_models,
      cheapest_input_usd_per_m: snap.summary.cheapest_input?.usd_per_million ?? null,
      cheapest_output_usd_per_m: snap.summary.cheapest_output?.usd_per_million ?? null,
      free_tier_count: snap.summary.free_tier_count,
      namespace_count: snap.summary.by_namespace.length,
      top_namespace: snap.summary.by_namespace[0]?.namespace ?? null,
      added,
      removed,
      price_changes: priceChanges,
      added_sample: addedSample,
      removed_sample: removedSample,
      has_data: true,
    };
  });

  const withData = points.filter((p) => p.has_data);
  const first = withData[0] ?? null;
  const last = withData.length > 0 ? withData[withData.length - 1] : null;
  const startTotal = first?.total_models ?? null;
  const endTotal = last?.total_models ?? null;

  const notes: string[] = [];
  const missing = points.length - withData.length;
  if (missing > 0) notes.push(`${missing} day(s) in range have no captured snapshot yet`);
  if (withData.length === 1) {
    notes.push('Only one day has data; churn metrics need at least two captured days.');
  }
  if (withData.length === 0) {
    notes.push('No captured snapshots in this range yet. or:daily is captured on the 14:00 UTC cron.');
  }

  return {
    from,
    to,
    days: points.length,
    points,
    delta_in_window: {
      start_total: startTotal,
      end_total: endTotal,
      net: startTotal !== null && endTotal !== null ? endTotal - startTotal : null,
      cheapest_input_start: first?.cheapest_input_usd_per_m ?? null,
      cheapest_input_end: last?.cheapest_input_usd_per_m ?? null,
      cheapest_output_start: first?.cheapest_output_usd_per_m ?? null,
      cheapest_output_end: last?.cheapest_output_usd_per_m ?? null,
    },
    attribution: OPENROUTER_ATTRIBUTION,
    notes,
  };
}

/**
 * Thin env-bound reader. Reads or:daily:{date} for each date in range
 * (missing day reads as null, same as mcp-registry.getSeries) then
 * defers all logic to the pure projector.
 */
export async function getORSeries(env: Env, from: string, to: string): Promise<ORSeriesResult> {
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const snaps = await Promise.all(
    dates.map(
      (d) => env.TENSORFEED_CACHE.get(orDailyKey(d), 'json') as Promise<ORSnapshot | null>,
    ),
  );

  return projectORSeries(
    from,
    to,
    dates.map((date, i) => ({ date, snap: snaps[i] })),
  );
}
