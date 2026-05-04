import { Env } from './types';

/**
 * Daily snapshot of the OpenRouter model catalog.
 *
 * OpenRouter exposes a single normalized inference API across 50+
 * providers (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek,
 * Together, Fireworks, Groq, Replicate, etc). Their public
 * `/api/v1/models` endpoint returns every model they route to, with
 * comparable pricing (per-token), context window, modality, and
 * provider metadata. No auth required.
 *
 * This is genuinely complementary to /api/models (TensorFeed's
 * curated frontier-model catalog): /api/models is a tight, opinionated
 * list of the dominant labs; this surfaces the long tail of open and
 * fine-tuned models priced for inference. Together they cover both
 * "which frontier model should I pick" and "which OSS-on-cloud model
 * is the cheapest fit for my workload" questions.
 *
 * KV layout (TENSORFEED_CACHE):
 *   or:latest               -> ORSnapshot
 *   or:daily:{YYYY-MM-DD}   -> ORSnapshot (compounds, future premium)
 *   or:index                -> string[] of dates
 */

const OR_BASE = 'https://openrouter.ai/api/v1/models';

const LATEST_KEY = 'or:latest';
const DAILY_PREFIX = 'or:daily:';
const INDEX_KEY = 'or:index';
const MAX_INDEX_DATES = 365 * 3;

const DESC_CAP = 600;

export interface ORPricing {
  prompt: number | null;        // USD per token
  completion: number | null;    // USD per token
  image: number | null;         // USD per image (when supported)
  request: number | null;       // USD per request (when supported)
}

export interface ORModel {
  id: string;                   // e.g. "anthropic/claude-3.5-sonnet"
  name: string;
  description: string | null;
  created: number | null;       // unix seconds
  context_length: number | null;
  modality: string | null;      // e.g. "text+image->text"
  instruct_type: string | null; // e.g. "claude", "llama2", null
  tokenizer: string | null;
  pricing: ORPricing;
  top_provider: {
    max_completion_tokens: number | null;
    is_moderated: boolean | null;
  };
  supported_parameters: string[];
}

export interface ORSnapshot {
  date: string;
  capturedAt: string;
  total_models: number;
  models: ORModel[];
  summary: {
    by_namespace: Array<{ namespace: string; count: number }>;
    by_modality: Record<string, number>;
    cheapest_input: { id: string; usd_per_million: number } | null;
    cheapest_output: { id: string; usd_per_million: number } | null;
    largest_context: { id: string; tokens: number } | null;
    free_tier_count: number; // models where prompt + completion both 0
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function namespaceOf(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(0, slash);
}

function parsePrice(raw: unknown): number | null {
  // OpenRouter returns prices as strings like "0.000003"
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

interface RawORModel {
  id?: string;
  name?: string;
  description?: string | null;
  created?: number | null;
  context_length?: number | null;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    instruct_type?: string | null;
    tokenizer?: string;
  };
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
    image?: string | number;
    request?: string | number;
  };
  top_provider?: {
    max_completion_tokens?: number | null;
    is_moderated?: boolean | null;
  };
  supported_parameters?: string[];
}

interface RawORResponse {
  data?: RawORModel[];
}

export function normalizeModel(raw: RawORModel): ORModel | null {
  const id = raw.id?.trim();
  if (!id) return null;
  const name = raw.name?.trim() || id;

  let modality: string | null = raw.architecture?.modality?.trim() || null;
  if (!modality && (raw.architecture?.input_modalities || raw.architecture?.output_modalities)) {
    const ins = raw.architecture.input_modalities?.join('+') || 'text';
    const outs = raw.architecture.output_modalities?.join('+') || 'text';
    modality = `${ins}->${outs}`;
  }

  return {
    id,
    name,
    description: raw.description ? clampStr(String(raw.description).trim(), DESC_CAP) : null,
    created: typeof raw.created === 'number' ? raw.created : null,
    context_length: typeof raw.context_length === 'number' ? raw.context_length : null,
    modality,
    instruct_type: raw.architecture?.instruct_type ?? null,
    tokenizer: raw.architecture?.tokenizer?.trim() || null,
    pricing: {
      prompt: parsePrice(raw.pricing?.prompt),
      completion: parsePrice(raw.pricing?.completion),
      image: parsePrice(raw.pricing?.image),
      request: parsePrice(raw.pricing?.request),
    },
    top_provider: {
      max_completion_tokens: raw.top_provider?.max_completion_tokens ?? null,
      is_moderated: raw.top_provider?.is_moderated ?? null,
    },
    supported_parameters: Array.isArray(raw.supported_parameters)
      ? raw.supported_parameters.filter((p): p is string => typeof p === 'string')
      : [],
  };
}

export function summarize(models: ORModel[]): ORSnapshot['summary'] {
  const byNs = new Map<string, number>();
  const byModality: Record<string, number> = {};
  let cheapestInput: { id: string; price: number } | null = null;
  let cheapestOutput: { id: string; price: number } | null = null;
  let largest: { id: string; tokens: number } | null = null;
  let freeCount = 0;

  for (const m of models) {
    byNs.set(namespaceOf(m.id), (byNs.get(namespaceOf(m.id)) || 0) + 1);
    if (m.modality) byModality[m.modality] = (byModality[m.modality] || 0) + 1;

    const p = m.pricing.prompt;
    const c = m.pricing.completion;

    if (p === 0 && c === 0) freeCount++;

    // For "cheapest" rankings, only consider paid models (>0) so we don't
    // surface a misleading "free" winner that's just a free-tier model.
    if (typeof p === 'number' && p > 0) {
      if (!cheapestInput || p < cheapestInput.price) cheapestInput = { id: m.id, price: p };
    }
    if (typeof c === 'number' && c > 0) {
      if (!cheapestOutput || c < cheapestOutput.price) cheapestOutput = { id: m.id, price: c };
    }

    if (typeof m.context_length === 'number' && m.context_length > 0) {
      if (!largest || m.context_length > largest.tokens) largest = { id: m.id, tokens: m.context_length };
    }
  }

  const by_namespace = Array.from(byNs.entries())
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    by_namespace,
    by_modality: byModality,
    cheapest_input: cheapestInput
      ? { id: cheapestInput.id, usd_per_million: cheapestInput.price * 1_000_000 }
      : null,
    cheapest_output: cheapestOutput
      ? { id: cheapestOutput.id, usd_per_million: cheapestOutput.price * 1_000_000 }
      : null,
    largest_context: largest,
    free_tier_count: freeCount,
  };
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_models?: number;
  error?: string;
}

export async function captureORSnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  let raw: RawORResponse;
  try {
    const res = await fetch(OR_BASE, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'tensorfeed-openrouter-tracker/1.0 (+https://tensorfeed.ai)',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, date, error: `openrouter returned HTTP ${res.status}` };
    }
    raw = (await res.json()) as RawORResponse;
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  const list = Array.isArray(raw.data) ? raw.data : [];
  if (list.length === 0) {
    return { ok: false, date, error: 'empty_response' };
  }

  const models = list
    .map(normalizeModel)
    .filter((m): m is ORModel => m !== null)
    // Stable sort by id so day-over-day diffs are reviewable.
    .sort((a, b) => a.id.localeCompare(b.id));

  const snapshot: ORSnapshot = {
    date,
    capturedAt,
    total_models: models.length,
    models,
    summary: summarize(models),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_models: models.length };
}

async function readIndex(env: Env): Promise<string[]> {
  const r = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  return r || [];
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

export async function getLatestSnapshot(env: Env): Promise<ORSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as ORSnapshot | null;
  if (cached) return cached;
  const result = await captureORSnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as ORSnapshot | null;
}
