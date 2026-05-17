import { Env } from './types';

/**
 * Daily snapshot of the Epoch AI "AI Models" dataset.
 *
 * Epoch AI maintains the canonical dataset of notable ML models with
 * training compute (FLOP), parameters, dataset size, compute cost, and
 * power draw. It is the authoritative answer to "how much compute did
 * model X take" and to the frontier-compute trajectory over time. This
 * fills the AI-data-library gap "AI training compute / FLOPs estimates"
 * and is genuinely complementary to /api/models (pricing/benchmarks):
 * /api/models answers "what should I call", this answers "what did it
 * cost to train and where does it sit on the compute curve".
 *
 * License: Epoch AI data is CC-BY-4.0 (commercial redistribution
 * permitted with attribution). Attribution is REQUIRED and is baked
 * into every response payload (EPOCH_ATTRIBUTION), the same posture TF
 * uses for NVD / CISA. Source is a single CSV; ingest is a daily Worker
 * cron fetch+parse into KV, never a per-request fetch.
 *
 * KV layout (TENSORFEED_CACHE):
 *   epoch:latest             -> EpochSnapshot
 *   epoch:daily:{YYYY-MM-DD} -> EpochSnapshot (compounds; future premium
 *                               compute-trend series joins off this)
 *   epoch:index              -> string[] of dates
 */

const EPOCH_CSV = 'https://epoch.ai/data/all_ai_models.csv';

const LATEST_KEY = 'epoch:latest';
const DAILY_PREFIX = 'epoch:daily:';
const INDEX_KEY = 'epoch:index';
const MAX_INDEX_DATES = 365 * 3;

export const EPOCH_ATTRIBUTION = {
  source: 'Epoch AI',
  dataset: 'AI Models (Notable Models database)',
  source_url: EPOCH_CSV,
  homepage: 'https://epoch.ai/data/ai-models',
  license: 'CC-BY-4.0',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
  note: 'Data by Epoch AI, used under CC-BY-4.0. Attribution required. Primary source per row is the model reference Link.',
} as const;

export interface EpochModel {
  model: string;
  organization: string | null;
  org_category: string | null;
  domain: string | null;
  task: string | null;
  publication_date: string | null; // YYYY-MM-DD when parseable
  parameters: number | null;
  training_compute_flop: number | null;
  training_dataset_size: number | null;
  training_compute_cost_usd_2023: number | null;
  training_power_draw_w: number | null;
  frontier_model: boolean | null;
  notability: string | null;
  country: string | null;
  accessibility: string | null;
  reference_link: string | null;
  last_modified: string | null;
}

export interface EpochSnapshot {
  date: string;
  capturedAt: string;
  total_models: number;
  attribution: typeof EPOCH_ATTRIBUTION;
  models: EpochModel[];
  summary: {
    with_training_compute: number;
    frontier_count: number;
    by_organization: Array<{ organization: string; count: number }>;
    by_domain: Record<string, number>;
    max_training_compute_flop: { model: string; flop: number } | null;
    publication_date_range: { earliest: string | null; latest: string | null };
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * RFC-4180-ish CSV parser. Handles quoted fields containing commas,
 * embedded newlines, and escaped quotes (""). The Epoch CSV has all
 * three (Domain "Multimodal,Language,Vision", notes fields with commas
 * and quotes), so a split(',') would corrupt every wide row. Pure +
 * exported for the test.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  // Normalize a leading BOM only; keep all other bytes verbatim.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      // End the record on \n or \r\n; collapse a \r\n pair.
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      // Skip blank lines produced by trailing newlines.
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Flush the last field/row if the file does not end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === '') return null;
  // Accept plain decimals and scientific notation only. Anything with
  // stray non-numeric content (a notes leak) yields null, never a guess.
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function str(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  return t === '' ? null : t;
}

function bool(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'true' || t === 'yes') return true;
  if (t === 'false' || t === 'no') return false;
  return null;
}

function isoDate(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === '') return null;
  // Epoch publication dates are YYYY-MM-DD; keep only clean ISO dates,
  // otherwise null (do not coerce partial/garbled dates).
  const head = t.slice(0, 10);
  return ISO_DATE.test(head) && !Number.isNaN(Date.parse(head)) ? head : null;
}

/**
 * Map one parsed CSV record (header-keyed) to an EpochModel. Returns
 * null when there is no model name (a structurally empty row). Pure +
 * exported for the test.
 */
export function normalizeRow(rec: Record<string, string>): EpochModel | null {
  const model = str(rec['Model']);
  if (!model) return null;
  return {
    model,
    organization: str(rec['Organization']),
    org_category: str(rec['Organization categorization']),
    domain: str(rec['Domain']),
    task: str(rec['Task']),
    publication_date: isoDate(rec['Publication date']),
    parameters: num(rec['Parameters']),
    training_compute_flop: num(rec['Training compute (FLOP)']),
    training_dataset_size: num(rec['Training dataset size (total)']),
    training_compute_cost_usd_2023: num(rec['Training compute cost (2023 USD)']),
    training_power_draw_w: num(rec['Training power draw (W)']),
    frontier_model: bool(rec['Frontier model']),
    notability: str(rec['Notability criteria']),
    country: str(rec['Country (of organization)']),
    accessibility: str(rec['Model accessibility']),
    reference_link: str(rec['Link']),
    last_modified: str(rec['Last modified']),
  };
}

export function summarize(models: EpochModel[]): EpochSnapshot['summary'] {
  const byOrg = new Map<string, number>();
  const byDomain: Record<string, number> = {};
  let withCompute = 0;
  let frontier = 0;
  let maxC: { model: string; flop: number } | null = null;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const m of models) {
    if (m.organization) byOrg.set(m.organization, (byOrg.get(m.organization) || 0) + 1);
    if (m.domain) byDomain[m.domain] = (byDomain[m.domain] || 0) + 1;
    if (typeof m.training_compute_flop === 'number') {
      withCompute++;
      if (!maxC || m.training_compute_flop > maxC.flop) {
        maxC = { model: m.model, flop: m.training_compute_flop };
      }
    }
    if (m.frontier_model === true) frontier++;
    if (m.publication_date) {
      if (!earliest || m.publication_date < earliest) earliest = m.publication_date;
      if (!latest || m.publication_date > latest) latest = m.publication_date;
    }
  }

  const by_organization = Array.from(byOrg.entries())
    .map(([organization, count]) => ({ organization, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    with_training_compute: withCompute,
    frontier_count: frontier,
    by_organization,
    by_domain: byDomain,
    max_training_compute_flop: maxC,
    publication_date_range: { earliest, latest },
  };
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_models?: number;
  error?: string;
}

export async function captureEpochSnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  let csv: string;
  try {
    const res = await fetch(EPOCH_CSV, {
      headers: { 'User-Agent': 'tensorfeed-epoch-tracker/1.0 (+https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, date, error: `epoch returned HTTP ${res.status}` };
    csv = await res.text();
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) return { ok: false, date, error: 'empty_or_headerless_csv' };

  const headers = rows[0].map((h) => h.trim());
  const models: EpochModel[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) rec[headers[c]] = rows[r][c] ?? '';
    const m = normalizeRow(rec);
    if (m) models.push(m);
  }
  if (models.length === 0) return { ok: false, date, error: 'no_models_parsed' };

  // Stable sort by model name so day-over-day diffs are reviewable.
  models.sort((a, b) => a.model.localeCompare(b.model));

  const snapshot: EpochSnapshot = {
    date,
    capturedAt,
    total_models: models.length,
    attribution: EPOCH_ATTRIBUTION,
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

export async function getLatestEpochSnapshot(env: Env): Promise<EpochSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as EpochSnapshot | null;
  if (cached) return cached;
  const result = await captureEpochSnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as EpochSnapshot | null;
}
