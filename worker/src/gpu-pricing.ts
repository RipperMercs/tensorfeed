import { Env } from './types';

/**
 * GPU rental price aggregation.
 *
 * Polls public GPU marketplaces every 4 hours, normalizes their
 * heterogeneous GPU naming into a canonical taxonomy, computes a
 * unified snapshot, and writes a daily snapshot for the historical
 * series. Mirrors the pattern from probe.ts and mcp-registry.ts.
 *
 * Sources:
 *   - RunPod: GraphQL, requires RUNPOD_API_KEY secret. Skipped if unset.
 *
 * Vast.ai was removed 2026-05-06. Their ToS prohibits scraping,
 * systematic data extraction, and competing services even for
 * publicly accessible offers; ingest cleared the audit's RED.
 *
 * Future sources (not yet active): Lambda Labs, CoreWeave public pricing,
 * Azure Retail Prices, AWS on-demand. Each will require ToS review
 * before integration.
 *
 * Free `/api/gpu/pricing`: full current snapshot.
 * Free `/api/gpu/pricing/cheapest?gpu=H100&type=on_demand|spot`: top 3
 *   cheapest right now for one canonical GPU. Agent-friendly entry point.
 * Free `/api/gpu/pricing/series?gpu=&from=&to=`: daily price series for
 *   one canonical GPU over a 90-day window. Moved from /api/premium on
 *   2026-05-06 since GPU pricing is factual price data with low optics
 *   on a free tier and removing Vast left only RunPod, which doesn't
 *   justify a paid gate alone.
 */

const RUNPOD_GRAPHQL_URL = 'https://api.runpod.io/graphql';

const FETCH_TIMEOUT_MS = 15000;

const CURRENT_KEY = 'gpu:current';
const DAILY_PREFIX = 'gpu:daily:';
const INDEX_KEY = 'gpu:index';
const MAX_INDEX_DATES = 365 * 3;

export const GPU_MAX_RANGE_DAYS = 90;
export const GPU_DEFAULT_RANGE_DAYS = 30;

// === Canonical GPU taxonomy ===

export type CanonicalGPU =
  | 'H200'
  | 'H100'
  | 'B200'
  | 'A100-80GB'
  | 'A100-40GB'
  | 'L40S'
  | 'L40'
  | 'L4'
  | 'RTX-6000-Ada'
  | 'A6000'
  | 'A5000'
  | 'A4000'
  | 'RTX-4090'
  | 'RTX-3090'
  | 'V100'
  | 'MI300X'
  | 'MI250'
  | 'OTHER';

export const CANONICAL_VRAM: Record<Exclude<CanonicalGPU, 'OTHER'>, number> = {
  'H200': 141,
  'H100': 80,
  'B200': 192,
  'A100-80GB': 80,
  'A100-40GB': 40,
  'L40S': 48,
  'L40': 48,
  'L4': 24,
  'RTX-6000-Ada': 48,
  'A6000': 48,
  'A5000': 24,
  'A4000': 16,
  'RTX-4090': 24,
  'RTX-3090': 24,
  'V100': 32,
  'MI300X': 192,
  'MI250': 128,
};

/**
 * Normalize a provider's free-form GPU name into the canonical taxonomy.
 * Order of checks matters: more specific patterns must match before
 * less specific ones (H200 before H100, A100-80GB before A100, etc).
 * Returns 'OTHER' if no rule matches.
 */
export function normalizeGPUName(raw: string, vramHintGb?: number): { canonical: CanonicalGPU; vram_gb: number | null } {
  if (!raw) return { canonical: 'OTHER', vram_gb: vramHintGb ?? null };
  const s = raw.toUpperCase().replace(/\s+/g, ' ').trim();

  if (/H200/.test(s)) return { canonical: 'H200', vram_gb: CANONICAL_VRAM['H200'] };
  if (/B200/.test(s)) return { canonical: 'B200', vram_gb: CANONICAL_VRAM['B200'] };
  if (/H100/.test(s)) return { canonical: 'H100', vram_gb: CANONICAL_VRAM['H100'] };
  if (/A100/.test(s)) {
    if (/80\s*G?B?/.test(s) || vramHintGb === 80) {
      return { canonical: 'A100-80GB', vram_gb: 80 };
    }
    if (/40\s*G?B?/.test(s) || vramHintGb === 40) {
      return { canonical: 'A100-40GB', vram_gb: 40 };
    }
    // Default to 40GB if VRAM not specified. Older variant is more common.
    return { canonical: 'A100-40GB', vram_gb: 40 };
  }
  if (/MI300X/.test(s)) return { canonical: 'MI300X', vram_gb: CANONICAL_VRAM['MI300X'] };
  if (/MI250/.test(s)) return { canonical: 'MI250', vram_gb: CANONICAL_VRAM['MI250'] };
  if (/L40S/.test(s)) return { canonical: 'L40S', vram_gb: CANONICAL_VRAM['L40S'] };
  if (/\bL40\b/.test(s)) return { canonical: 'L40', vram_gb: CANONICAL_VRAM['L40'] };
  if (/\bL4\b/.test(s)) return { canonical: 'L4', vram_gb: CANONICAL_VRAM['L4'] };
  if (/RTX[\s-]*6000[\s-]*ADA|6000[\s-]*ADA/.test(s)) {
    return { canonical: 'RTX-6000-Ada', vram_gb: CANONICAL_VRAM['RTX-6000-Ada'] };
  }
  if (/A6000/.test(s)) return { canonical: 'A6000', vram_gb: CANONICAL_VRAM['A6000'] };
  if (/A5000/.test(s)) return { canonical: 'A5000', vram_gb: CANONICAL_VRAM['A5000'] };
  if (/A4000/.test(s)) return { canonical: 'A4000', vram_gb: CANONICAL_VRAM['A4000'] };
  if (/4090/.test(s)) return { canonical: 'RTX-4090', vram_gb: CANONICAL_VRAM['RTX-4090'] };
  if (/3090/.test(s)) return { canonical: 'RTX-3090', vram_gb: CANONICAL_VRAM['RTX-3090'] };
  if (/V100/.test(s)) return { canonical: 'V100', vram_gb: CANONICAL_VRAM['V100'] };

  return { canonical: 'OTHER', vram_gb: vramHintGb ?? null };
}

// === Types ===

export interface GPUOffer {
  provider: string;            // "runpod" | "vast"
  gpu_raw: string;             // provider's GPU name
  gpu_canonical: CanonicalGPU;
  vram_gb: number | null;
  on_demand_usd_hr: number | null;  // per-GPU price
  spot_usd_hr: number | null;       // per-GPU price (lowest bid / interruptible)
  available_count: number;
  region: string | null;
  source_url: string;
  last_seen: string;
}

export interface CanonicalSummary {
  canonical: CanonicalGPU;
  vram_gb: number | null;
  provider_count: number;
  total_offers: number;
  cheapest_on_demand: { provider: string; usd_hr: number; gpu_raw: string } | null;
  cheapest_spot: { provider: string; usd_hr: number; gpu_raw: string } | null;
}

export interface PricingSnapshot {
  capturedAt: string;
  providers: string[];
  offers: GPUOffer[];
  by_canonical: CanonicalSummary[];
  errors: Array<{ provider: string; error: string }>;
  notes: string[];
}

// === Date helpers ===

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

// === Provider adapter: RunPod GraphQL (requires RUNPOD_API_KEY) ===

interface RunPodGpuType {
  id?: string;
  displayName?: string;
  memoryInGb?: number;
  secureCloud?: boolean;
  communityCloud?: boolean;
  lowestPrice?: {
    minimumBidPrice?: number | null;       // spot
    uninterruptablePrice?: number | null;  // on-demand
  } | null;
}

async function fetchRunPod(env: Env): Promise<{ ok: true; offers: GPUOffer[]; skipped?: boolean } | { ok: false; error: string }> {
  if (!env.RUNPOD_API_KEY) {
    return { ok: true, offers: [], skipped: true };
  }
  const query = `
    query {
      gpuTypes {
        id
        displayName
        memoryInGb
        secureCloud
        communityCloud
        lowestPrice(input: { gpuCount: 1 }) {
          minimumBidPrice
          uninterruptablePrice
        }
      }
    }
  `;

  let res: Response;
  try {
    res = await fetch(RUNPOD_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'User-Agent': 'tensorfeed-gpu-pricing/1.0 (+https://tensorfeed.ai)',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, error: `runpod fetch failed: ${(err as Error).message}` };
  }
  if (!res.ok) return { ok: false, error: `runpod returned HTTP ${res.status}` };

  let data: { data?: { gpuTypes?: RunPodGpuType[] }; errors?: unknown };
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, error: `runpod JSON parse failed: ${(err as Error).message}` };
  }
  if (data.errors) {
    return { ok: false, error: `runpod GraphQL errors: ${JSON.stringify(data.errors).slice(0, 200)}` };
  }
  const types = Array.isArray(data.data?.gpuTypes) ? data.data!.gpuTypes! : [];
  const now = new Date().toISOString();

  const offers: GPUOffer[] = [];
  for (const t of types) {
    const name = (t.displayName || t.id || '').trim();
    if (!name) continue;

    const onDemand = t.lowestPrice?.uninterruptablePrice ?? null;
    const spot = t.lowestPrice?.minimumBidPrice ?? null;
    if (onDemand === null && spot === null) continue;

    const vramHintGb = typeof t.memoryInGb === 'number' ? t.memoryInGb : undefined;
    const { canonical, vram_gb } = normalizeGPUName(name, vramHintGb);

    offers.push({
      provider: 'runpod',
      gpu_raw: name,
      gpu_canonical: canonical,
      vram_gb: vram_gb ?? vramHintGb ?? null,
      on_demand_usd_hr: onDemand !== null ? round4(onDemand) : null,
      spot_usd_hr: spot !== null ? round4(spot) : null,
      available_count: (t.secureCloud ? 1 : 0) + (t.communityCloud ? 1 : 0),
      region: null,
      source_url: 'https://runpod.io',
      last_seen: now,
    });
  }
  return { ok: true, offers };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// === Snapshot summarization ===

export function summarizeOffers(offers: GPUOffer[]): CanonicalSummary[] {
  const byCanon = new Map<CanonicalGPU, GPUOffer[]>();
  for (const o of offers) {
    if (!byCanon.has(o.gpu_canonical)) byCanon.set(o.gpu_canonical, []);
    byCanon.get(o.gpu_canonical)!.push(o);
  }

  const out: CanonicalSummary[] = [];
  for (const [canonical, group] of byCanon) {
    const providerSet = new Set(group.map(o => o.provider));

    let cheapestOnDemand: CanonicalSummary['cheapest_on_demand'] = null;
    let cheapestSpot: CanonicalSummary['cheapest_spot'] = null;

    for (const o of group) {
      if (o.on_demand_usd_hr !== null && o.on_demand_usd_hr > 0) {
        if (!cheapestOnDemand || o.on_demand_usd_hr < cheapestOnDemand.usd_hr) {
          cheapestOnDemand = { provider: o.provider, usd_hr: o.on_demand_usd_hr, gpu_raw: o.gpu_raw };
        }
      }
      if (o.spot_usd_hr !== null && o.spot_usd_hr > 0) {
        if (!cheapestSpot || o.spot_usd_hr < cheapestSpot.usd_hr) {
          cheapestSpot = { provider: o.provider, usd_hr: o.spot_usd_hr, gpu_raw: o.gpu_raw };
        }
      }
    }

    out.push({
      canonical,
      vram_gb: canonical === 'OTHER' ? null : CANONICAL_VRAM[canonical],
      provider_count: providerSet.size,
      total_offers: group.length,
      cheapest_on_demand: cheapestOnDemand,
      cheapest_spot: cheapestSpot,
    });
  }

  // Stable sort: known canonicals first by VRAM desc, OTHER last.
  const order: Record<string, number> = {};
  (Object.keys(CANONICAL_VRAM) as CanonicalGPU[]).forEach((g, i) => { order[g] = i; });
  out.sort((a, b) => {
    if (a.canonical === 'OTHER') return 1;
    if (b.canonical === 'OTHER') return -1;
    return (order[a.canonical] ?? 999) - (order[b.canonical] ?? 999);
  });
  return out;
}

// === Refresh ===

export async function refreshCurrent(env: Env): Promise<PricingSnapshot> {
  const capturedAt = new Date().toISOString();
  const errors: PricingSnapshot['errors'] = [];
  const notes: string[] = [];
  const allOffers: GPUOffer[] = [];
  const providersIncluded: string[] = [];

  const runpodResult = await fetchRunPod(env);

  if (runpodResult.ok) {
    if (runpodResult.skipped) {
      notes.push('runpod skipped: RUNPOD_API_KEY secret not configured');
    } else {
      allOffers.push(...runpodResult.offers);
      providersIncluded.push('runpod');
    }
  } else {
    errors.push({ provider: 'runpod', error: runpodResult.error });
  }

  const snapshot: PricingSnapshot = {
    capturedAt,
    providers: providersIncluded,
    offers: allOffers,
    by_canonical: summarizeOffers(allOffers),
    errors,
    notes,
  };

  // Cache the snapshot. If both providers failed AND there is a previous
  // good snapshot, keep the previous one so the public endpoint never
  // serves blank data. Same fallback discipline as snapshots.ts.
  if (allOffers.length === 0 && errors.length > 0) {
    const prev = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as PricingSnapshot | null;
    if (prev) {
      prev.notes = [...(prev.notes || []), `refresh failed at ${capturedAt}, serving stale snapshot`];
      return prev;
    }
  }

  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  return snapshot;
}

// === Read current ===

export async function getCurrent(env: Env): Promise<PricingSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as PricingSnapshot | null;
  if (cached) return cached;
  // Cold-start bootstrap: refresh once so the free endpoint never returns null.
  const fresh = await refreshCurrent(env);
  return fresh.offers.length > 0 ? fresh : null;
}

// === Daily snapshot for premium series ===

interface DailySnapshot {
  date: string;
  capturedAt: string;
  by_canonical: CanonicalSummary[];
  providers: string[];
  total_offers: number;
}

async function readIndex(env: Env): Promise<string[]> {
  const raw = await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json') as string[] | null;
  return raw || [];
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_offers?: number;
  providers?: string[];
  error?: string;
}

export async function captureDailySnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  let snapshot: PricingSnapshot;
  try {
    snapshot = await refreshCurrent(env);
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  if (snapshot.offers.length === 0) {
    return { ok: false, date, error: 'no offers collected' };
  }

  const daily: DailySnapshot = {
    date,
    capturedAt: snapshot.capturedAt,
    by_canonical: snapshot.by_canonical,
    providers: snapshot.providers,
    total_offers: snapshot.offers.length,
  };

  await env.TENSORFEED_CACHE.put(dailyKey(date), JSON.stringify(daily));
  await pushIndexDate(env, date);

  return { ok: true, date, total_offers: snapshot.offers.length, providers: snapshot.providers };
}

// === Cheapest helper for the free /api/gpu/pricing/cheapest endpoint ===

export interface CheapestResult {
  ok: true;
  gpu: CanonicalGPU;
  vram_gb: number | null;
  type: 'on_demand' | 'spot';
  results: Array<{ provider: string; usd_hr: number; gpu_raw: string; available_count: number; region: string | null }>;
  capturedAt: string;
}

export function pickCheapest(snapshot: PricingSnapshot, gpu: CanonicalGPU, type: 'on_demand' | 'spot', limit = 3): CheapestResult {
  const matching = snapshot.offers.filter(o => o.gpu_canonical === gpu);
  const priced = matching
    .map(o => ({
      provider: o.provider,
      usd_hr: type === 'on_demand' ? o.on_demand_usd_hr : o.spot_usd_hr,
      gpu_raw: o.gpu_raw,
      available_count: o.available_count,
      region: o.region,
    }))
    .filter((o): o is { provider: string; usd_hr: number; gpu_raw: string; available_count: number; region: string | null } =>
      o.usd_hr !== null && o.usd_hr > 0,
    )
    .sort((a, b) => a.usd_hr - b.usd_hr)
    .slice(0, limit);

  return {
    ok: true,
    gpu,
    vram_gb: gpu === 'OTHER' ? null : CANONICAL_VRAM[gpu],
    type,
    results: priced,
    capturedAt: snapshot.capturedAt,
  };
}

// === Range queries (premium series) ===

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };

  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(GPU_DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  const span = daysBetween(from, to);
  if (span + 1 > GPU_MAX_RANGE_DAYS) return { ok: false, error: 'range_exceeds_max_days' };

  return { ok: true, from, to };
}

export interface SeriesPoint {
  date: string;
  cheapest_on_demand_usd_hr: number | null;
  cheapest_on_demand_provider: string | null;
  cheapest_spot_usd_hr: number | null;
  cheapest_spot_provider: string | null;
  provider_count: number | null;
  total_offers: number | null;
  has_data: boolean;
}

export interface SeriesResult {
  from: string;
  to: string;
  gpu: CanonicalGPU;
  vram_gb: number | null;
  days: number;
  points: SeriesPoint[];
  delta_in_window: {
    on_demand: { start: number | null; end: number | null; pct_change: number | null };
    spot: { start: number | null; end: number | null; pct_change: number | null };
  };
  notes: string[];
}

export function isCanonicalGPU(s: string): s is CanonicalGPU {
  return s === 'OTHER' || (s in CANONICAL_VRAM);
}

export async function getSeries(env: Env, gpu: CanonicalGPU, from: string, to: string): Promise<SeriesResult> {
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const dailies = await Promise.all(
    dates.map(d => env.TENSORFEED_CACHE.get(dailyKey(d), 'json') as Promise<DailySnapshot | null>),
  );

  const points: SeriesPoint[] = dates.map((date, i) => {
    const snap = dailies[i];
    if (!snap) {
      return {
        date,
        cheapest_on_demand_usd_hr: null,
        cheapest_on_demand_provider: null,
        cheapest_spot_usd_hr: null,
        cheapest_spot_provider: null,
        provider_count: null,
        total_offers: null,
        has_data: false,
      };
    }
    const summary = snap.by_canonical.find(s => s.canonical === gpu);
    if (!summary) {
      return {
        date,
        cheapest_on_demand_usd_hr: null,
        cheapest_on_demand_provider: null,
        cheapest_spot_usd_hr: null,
        cheapest_spot_provider: null,
        provider_count: 0,
        total_offers: 0,
        has_data: true,
      };
    }
    return {
      date,
      cheapest_on_demand_usd_hr: summary.cheapest_on_demand?.usd_hr ?? null,
      cheapest_on_demand_provider: summary.cheapest_on_demand?.provider ?? null,
      cheapest_spot_usd_hr: summary.cheapest_spot?.usd_hr ?? null,
      cheapest_spot_provider: summary.cheapest_spot?.provider ?? null,
      provider_count: summary.provider_count,
      total_offers: summary.total_offers,
      has_data: true,
    };
  });

  const onDemandPoints = points.filter(p => p.has_data && p.cheapest_on_demand_usd_hr !== null);
  const spotPoints = points.filter(p => p.has_data && p.cheapest_spot_usd_hr !== null);
  const onDemandStart = onDemandPoints[0]?.cheapest_on_demand_usd_hr ?? null;
  const onDemandEnd = onDemandPoints[onDemandPoints.length - 1]?.cheapest_on_demand_usd_hr ?? null;
  const spotStart = spotPoints[0]?.cheapest_spot_usd_hr ?? null;
  const spotEnd = spotPoints[spotPoints.length - 1]?.cheapest_spot_usd_hr ?? null;

  const pct = (start: number | null, end: number | null): number | null => {
    if (start === null || end === null || start === 0) return null;
    return round4(((end - start) / start) * 100);
  };

  const notes: string[] = [];
  const missing = points.length - points.filter(p => p.has_data).length;
  if (missing > 0) notes.push(`${missing} day(s) in range have no captured snapshot yet`);
  const noGpuDays = points.filter(p => p.has_data && p.total_offers === 0).length;
  if (noGpuDays > 0) notes.push(`${noGpuDays} day(s) had no offers for ${gpu}`);

  return {
    from,
    to,
    gpu,
    vram_gb: gpu === 'OTHER' ? null : CANONICAL_VRAM[gpu],
    days: points.length,
    points,
    delta_in_window: {
      on_demand: { start: onDemandStart, end: onDemandEnd, pct_change: pct(onDemandStart, onDemandEnd) },
      spot: { start: spotStart, end: spotEnd, pct_change: pct(spotStart, spotEnd) },
    },
    notes,
  };
}

export async function listIndexedDates(env: Env): Promise<string[]> {
  return readIndex(env);
}
