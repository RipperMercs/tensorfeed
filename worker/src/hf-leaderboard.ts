import { Env } from './types';

/**
 * Hugging Face Open LLM Leaderboard pipeline.
 *
 * Source: HF's open-llm-leaderboard/contents dataset, served via the
 * datasets-server.huggingface.co JSON API. CC-BY-SA on dataset outputs
 * per HF dataset license; freely redistributable with attribution.
 *
 * Six v2 tasks: IFEval, BBH, MATH Lvl 5, GPQA, MUSR, MMLU-PRO.
 * Each row carries average score, per-task scores, model metadata
 * (params, precision, license, type, base model).
 *
 * Captured daily at 04:45 UTC. Dated snapshots compound into a
 * time series for premium /api/premium/hf-leaderboard/* endpoints
 * once we have multiple days on disk.
 *
 * KV layout:
 *   hf-leaderboard:latest        full normalized current snapshot
 *   hf-leaderboard:date:YYYY-MM-DD  dated snapshot for series queries
 *   hf-leaderboard:dates         JSON array of dates we have captured
 */

const DATASET = 'open-llm-leaderboard/contents';
const DATASETS_SERVER = 'https://datasets-server.huggingface.co';
const PAGE_SIZE = 100;
const MAX_PAGES = 60; // 6000 rows cap; current leaderboard is ~2-3k
const FETCH_TIMEOUT_MS = 30_000;
const POLITE_UA = 'tensorfeed/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';

const KV_LATEST = 'hf-leaderboard:latest';
const KV_DATE_PREFIX = 'hf-leaderboard:date:';
const KV_DATES = 'hf-leaderboard:dates';

// ── Public types ────────────────────────────────────────────────────

export interface LeaderboardScores {
  ifeval: number | null;
  bbh: number | null;
  math_lvl_5: number | null;
  gpqa: number | null;
  musr: number | null;
  mmlu_pro: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  model_id: string;
  params_b: number | null;
  precision: string | null;
  license: string | null;
  base_model: string | null;
  type: string | null;
  average: number | null;
  scores: LeaderboardScores;
  submitted_at: string | null;
}

export interface LeaderboardSnapshot {
  capturedAt: string;
  source: string;
  total_models: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardAttribution {
  source: string;
  source_url: string;
  license: string;
  derivation: string;
}

export const LEADERBOARD_ATTRIBUTION: LeaderboardAttribution = {
  source: 'Hugging Face Open LLM Leaderboard v2',
  source_url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard',
  license: 'CC-BY-SA 4.0 per Hugging Face dataset terms',
  derivation:
    'Daily snapshot of the underlying open-llm-leaderboard/contents dataset via the public datasets-server.huggingface.co API. Field names normalized into a stable schema (rank, model_id, params_b, precision, license, base_model, type, average, scores).',
};

// ── Field normalization ─────────────────────────────────────────────

/**
 * HF dataset field names occasionally drift (emoji-prefixed columns,
 * casing variations). This helper picks the first non-empty value from
 * a list of candidate keys so we are resilient to small renames without
 * breaking the daily capture.
 */
function pickField(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const k of candidates) {
    if (k in row && row[k] !== null && row[k] !== undefined && row[k] !== '') {
      return row[k];
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return null;
}

/**
 * Strip emoji + spaces from type field. HF often prepends an emoji
 * indicator (🟢 : pretrained, 🔶 : fine-tuned, etc.) to the type column.
 */
function cleanType(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/([a-zA-Z][a-zA-Z\s-]+)$/);
  return m ? m[1].trim().toLowerCase().replace(/\s+/g, '-') : raw.trim().toLowerCase();
}

export function normalizeRow(raw: Record<string, unknown>): LeaderboardEntry | null {
  const model_id = toString(pickField(raw, ['eval_name', 'fullname', 'Model', 'model']));
  if (!model_id) return null;
  const average = toNumber(pickField(raw, ['Average ⬆️', 'Average', 'average', 'avg']));
  return {
    rank: 0, // assigned after sort
    model_id,
    params_b: toNumber(pickField(raw, ['#Params (B)', 'Params (B)', 'params_b', 'num_params_b'])),
    precision: toString(pickField(raw, ['Precision', 'precision'])),
    license: toString(pickField(raw, ['Hub License', 'License', 'license'])),
    base_model: toString(pickField(raw, ['Base Model', 'base_model'])),
    type: cleanType(toString(pickField(raw, ['Type', 'type', 'model_type']))),
    average,
    scores: {
      ifeval: toNumber(pickField(raw, ['IFEval', 'ifeval'])),
      bbh: toNumber(pickField(raw, ['BBH', 'bbh'])),
      math_lvl_5: toNumber(pickField(raw, ['MATH Lvl 5', 'MATH_Lvl_5', 'math_lvl_5', 'MATH'])),
      gpqa: toNumber(pickField(raw, ['GPQA', 'gpqa'])),
      musr: toNumber(pickField(raw, ['MUSR', 'musr'])),
      mmlu_pro: toNumber(pickField(raw, ['MMLU-PRO', 'MMLU_PRO', 'mmlu_pro', 'MMLU Pro'])),
    },
    submitted_at: toString(pickField(raw, ['Submitted At', 'submitted_at', 'created_at'])),
  };
}

// ── Fetch ────────────────────────────────────────────────────────────

interface DatasetsServerPage {
  rows?: Array<{ row?: Record<string, unknown> }>;
  num_rows_total?: number;
  num_rows_per_page?: number;
}

async function fetchPageOnce(offset: number): Promise<DatasetsServerPage> {
  const url = `${DATASETS_SERVER}/rows?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${PAGE_SIZE}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`HF datasets-server HTTP ${res.status} at offset=${offset}`);
    }
    return (await res.json()) as DatasetsServerPage;
  } finally {
    clearTimeout(timer);
  }
}

const FETCH_MAX_ATTEMPTS = 3;
const FETCH_BACKOFF_MS = 4_000;

async function fetchPage(offset: number): Promise<DatasetsServerPage> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchPageOnce(offset);
    } catch (e) {
      lastErr = e;
      if (attempt < FETCH_MAX_ATTEMPTS) {
        await new Promise((res) => setTimeout(res, FETCH_BACKOFF_MS * attempt));
      }
    }
  }
  throw lastErr;
}

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;
  let pages = 0;
  let partial_page_failures: string[] = [];
  while (pages < MAX_PAGES) {
    let page: DatasetsServerPage;
    try {
      page = await fetchPage(offset);
    } catch (e) {
      // After all retries exhausted: keep what we already have if it's
      // enough to pass validation, log the failure point, and stop
      // paginating. Partial captures beat losing the whole snapshot.
      partial_page_failures.push(`offset=${offset}: ${(e as Error).message}`);
      console.warn(`hf-leaderboard fetch gave up at offset=${offset}: ${(e as Error).message}`);
      break;
    }
    const rows = page.rows ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.row) allRows.push(r.row);
    }
    offset += rows.length;
    pages += 1;
    if (page.num_rows_total !== undefined && offset >= page.num_rows_total) break;
    if (rows.length < PAGE_SIZE) break;
  }
  if (partial_page_failures.length > 0) {
    console.warn(`hf-leaderboard partial capture: ${allRows.length} rows fetched before pagination aborted (${partial_page_failures.join('; ')})`);
  }

  const normalized = allRows.map(normalizeRow).filter((r): r is LeaderboardEntry => r !== null);
  // Sort by average desc; null averages go to the end.
  normalized.sort((a, b) => {
    const av = a.average ?? -Infinity;
    const bv = b.average ?? -Infinity;
    return bv - av;
  });
  normalized.forEach((r, i) => { r.rank = i + 1; });

  return {
    capturedAt: new Date().toISOString().slice(0, 10),
    source: DATASET,
    total_models: normalized.length,
    entries: normalized,
  };
}

// ── Snapshot validation ─────────────────────────────────────────────

/**
 * Sanity-check before we commit a snapshot to KV. Rejects malformed
 * snapshots so a one-off upstream schema shift never corrupts the
 * dated-history chain.
 */
export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

const MIN_MODELS = 50;
const MIN_AVERAGE_COVERAGE = 0.5;
const MIN_TASK_COVERAGE = 0.3;

export function validateSnapshot(snap: LeaderboardSnapshot): ValidationResult {
  if (!snap.entries || snap.entries.length < MIN_MODELS) {
    return { ok: false, reason: `too few entries (${snap.entries?.length ?? 0} < ${MIN_MODELS})` };
  }
  const withAverage = snap.entries.filter((e) => e.average !== null).length;
  if (withAverage / snap.entries.length < MIN_AVERAGE_COVERAGE) {
    return { ok: false, reason: `low average coverage (${withAverage}/${snap.entries.length})` };
  }
  const tasks = ['ifeval', 'bbh', 'math_lvl_5', 'gpqa', 'musr', 'mmlu_pro'] as const;
  for (const t of tasks) {
    const covered = snap.entries.filter((e) => e.scores[t] !== null).length;
    if (covered / snap.entries.length < MIN_TASK_COVERAGE) {
      return { ok: false, reason: `low ${t} coverage (${covered}/${snap.entries.length})` };
    }
  }
  return { ok: true };
}

// ── KV write ────────────────────────────────────────────────────────

export interface CaptureResult {
  ok: boolean;
  reason?: string;
  capturedAt?: string;
  total_models?: number;
}

export async function captureLeaderboard(env: Env): Promise<CaptureResult> {
  let snap: LeaderboardSnapshot;
  try {
    snap = await fetchLeaderboard();
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${(e as Error).message}` };
  }
  const v = validateSnapshot(snap);
  if (!v.ok) {
    return { ok: false, reason: `validation failed: ${v.reason}` };
  }

  const body = JSON.stringify(snap);
  await env.TENSORFEED_CACHE.put(KV_LATEST, body);
  await env.TENSORFEED_CACHE.put(`${KV_DATE_PREFIX}${snap.capturedAt}`, body);

  // Maintain the dates index. List of ISO YYYY-MM-DD strings, sorted asc,
  // capped at 365 entries.
  const existingDates = ((await env.TENSORFEED_CACHE.get(KV_DATES, 'json')) as string[] | null) ?? [];
  if (!existingDates.includes(snap.capturedAt)) {
    existingDates.push(snap.capturedAt);
    existingDates.sort();
    while (existingDates.length > 365) existingDates.shift();
    await env.TENSORFEED_CACHE.put(KV_DATES, JSON.stringify(existingDates));
  }

  return { ok: true, capturedAt: snap.capturedAt, total_models: snap.total_models };
}

// ── Reader (route handler input) ────────────────────────────────────

// Raw series readers for the premium movers endpoint. readLatest applies the
// free filter/limit; these return the full dated snapshots so the premium layer
// can diff complete cohorts period over period.
export async function readDates(env: Env): Promise<string[]> {
  return ((await env.TENSORFEED_CACHE.get(KV_DATES, 'json')) as string[] | null) ?? [];
}

export async function readSnapshotByDate(env: Env, date: string): Promise<LeaderboardSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(`${KV_DATE_PREFIX}${date}`, 'json')) as LeaderboardSnapshot | null;
}

export interface LatestQuery {
  limit?: number;
  min_average?: number;
}

export interface LatestResult {
  ok: true;
  capturedAt: string;
  source: string;
  total_models: number;
  returned: number;
  entries: LeaderboardEntry[];
  attribution: LeaderboardAttribution;
}

export interface LatestError {
  ok: false;
  error: string;
  hint?: string;
}

export async function readLatest(
  env: Env,
  q: LatestQuery = {},
): Promise<LatestResult | LatestError> {
  const snap = (await env.TENSORFEED_CACHE.get(KV_LATEST, 'json')) as LeaderboardSnapshot | null;
  if (!snap) {
    return {
      ok: false,
      error: 'no_snapshot_yet',
      hint: 'Daily refresh runs at 04:45 UTC. After deploy, the first snapshot lands within 24 hours.',
    };
  }
  const limit = q.limit != null && Number.isFinite(q.limit) ? Math.max(1, Math.min(q.limit, 500)) : 50;
  const minAvg = q.min_average != null && Number.isFinite(q.min_average) ? q.min_average : null;
  let entries = snap.entries;
  if (minAvg !== null) {
    entries = entries.filter((e) => e.average !== null && e.average >= minAvg);
  }
  entries = entries.slice(0, limit);
  return {
    ok: true,
    capturedAt: snap.capturedAt,
    source: snap.source,
    total_models: snap.total_models,
    returned: entries.length,
    entries,
    attribution: LEADERBOARD_ATTRIBUTION,
  };
}
