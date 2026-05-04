import { Env } from './types';

/**
 * Daily snapshot of the most-downloaded models and datasets on Hugging
 * Face. The HF public API is unauthenticated for read-only listing
 * (https://huggingface.co/api/models, /api/datasets).
 *
 * We snapshot the top N of each by downloads. Once we have multiple days
 * of snapshots, day-over-day download deltas effectively become a
 * "trending" measure that we compute, regardless of HF's own sort order.
 *
 * Backs free `/api/hf/trending`. Daily snapshot at 12:00 UTC stored under
 * `hf:*`. Dated keys compound into a future premium time series.
 */

const HF_MODELS_BASE = 'https://huggingface.co/api/models';
const HF_DATASETS_BASE = 'https://huggingface.co/api/datasets';

const TOP_N = 30;

const LATEST_KEY = 'hf:latest';
const DAILY_PREFIX = 'hf:daily:';
const INDEX_KEY = 'hf:index';
const MAX_INDEX_DATES = 365 * 3;

export interface HFModelEntry {
  id: string;                  // e.g. "meta-llama/Llama-3-8B"
  downloads: number;
  likes: number;
  pipeline_tag: string | null; // e.g. "text-generation"
  tags: string[];
  lastModified: string | null; // ISO 8601
  private: boolean;
  gated: boolean | string;     // HF returns false | "auto" | "manual"
}

export interface HFDatasetEntry {
  id: string;
  downloads: number;
  likes: number;
  tags: string[];
  lastModified: string | null;
  private: boolean;
  gated: boolean | string;
}

export interface HFSnapshot {
  date: string;
  capturedAt: string;
  models: {
    sort: 'downloads';
    count: number;
    items: HFModelEntry[];
  };
  datasets: {
    sort: 'downloads';
    count: number;
    items: HFDatasetEntry[];
  };
  summary: {
    top_pipeline_tags: Array<{ tag: string; count: number }>;
    top_namespaces: Array<{ namespace: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function namespaceOf(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(0, slash);
}

interface RawHFModel {
  id?: string;
  modelId?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string | null;
  tags?: string[];
  lastModified?: string;
  private?: boolean;
  gated?: boolean | string;
}

interface RawHFDataset {
  id?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  lastModified?: string;
  private?: boolean;
  gated?: boolean | string;
}

export function normalizeModel(raw: RawHFModel): HFModelEntry | null {
  const id = (raw.id || raw.modelId || '').trim();
  if (!id) return null;
  return {
    id,
    downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
    likes: typeof raw.likes === 'number' ? raw.likes : 0,
    pipeline_tag: raw.pipeline_tag || null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(t => typeof t === 'string') : [],
    lastModified: raw.lastModified || null,
    private: raw.private === true,
    gated: raw.gated === undefined ? false : raw.gated,
  };
}

export function normalizeDataset(raw: RawHFDataset): HFDatasetEntry | null {
  const id = (raw.id || '').trim();
  if (!id) return null;
  return {
    id,
    downloads: typeof raw.downloads === 'number' ? raw.downloads : 0,
    likes: typeof raw.likes === 'number' ? raw.likes : 0,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(t => typeof t === 'string') : [],
    lastModified: raw.lastModified || null,
    private: raw.private === true,
    gated: raw.gated === undefined ? false : raw.gated,
  };
}

export function summarize(models: HFModelEntry[], datasets: HFDatasetEntry[]): HFSnapshot['summary'] {
  const byTag = new Map<string, number>();
  for (const m of models) {
    if (m.pipeline_tag) byTag.set(m.pipeline_tag, (byTag.get(m.pipeline_tag) || 0) + 1);
  }
  const top_pipeline_tags = Array.from(byTag.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const byNs = new Map<string, number>();
  for (const m of models) byNs.set(namespaceOf(m.id), (byNs.get(namespaceOf(m.id)) || 0) + 1);
  for (const d of datasets) byNs.set(namespaceOf(d.id), (byNs.get(namespaceOf(d.id)) || 0) + 1);
  const top_namespaces = Array.from(byNs.entries())
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { top_pipeline_tags, top_namespaces };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'tensorfeed-hf-tracker/1.0 (+https://tensorfeed.ai)',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HF returned HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  model_count?: number;
  dataset_count?: number;
  error?: string;
}

export async function captureHFSnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  const modelsUrl = `${HF_MODELS_BASE}?sort=downloads&direction=-1&limit=${TOP_N}`;
  const datasetsUrl = `${HF_DATASETS_BASE}?sort=downloads&direction=-1&limit=${TOP_N}`;

  let rawModels: RawHFModel[] = [];
  let rawDatasets: RawHFDataset[] = [];

  try {
    const [m, d] = await Promise.all([
      fetchJson<RawHFModel[]>(modelsUrl),
      fetchJson<RawHFDataset[]>(datasetsUrl),
    ]);
    rawModels = Array.isArray(m) ? m : [];
    rawDatasets = Array.isArray(d) ? d : [];
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  const models = rawModels.map(normalizeModel).filter((x): x is HFModelEntry => x !== null);
  const datasets = rawDatasets.map(normalizeDataset).filter((x): x is HFDatasetEntry => x !== null);

  if (models.length === 0 && datasets.length === 0) {
    return { ok: false, date, error: 'no_entries_returned' };
  }

  const snapshot: HFSnapshot = {
    date,
    capturedAt,
    models: { sort: 'downloads', count: models.length, items: models },
    datasets: { sort: 'downloads', count: datasets.length, items: datasets },
    summary: summarize(models, datasets),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, model_count: models.length, dataset_count: datasets.length };
}

async function readIndex(env: Env): Promise<string[]> {
  const raw = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
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

export async function getLatestSnapshot(env: Env): Promise<HFSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HFSnapshot | null;
  if (cached) return cached;
  const result = await captureHFSnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HFSnapshot | null;
}
