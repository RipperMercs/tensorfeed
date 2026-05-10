import { describe, it, expect } from 'vitest';
import {
  normalizeRow,
  validateSnapshot,
  readLatest,
  LEADERBOARD_ATTRIBUTION,
  type LeaderboardSnapshot,
  type LeaderboardEntry,
} from './hf-leaderboard';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string, type?: string) => {
      const v = store.get(key);
      if (v === undefined) return null;
      return type === 'json' ? v : typeof v === 'string' ? v : JSON.stringify(v);
    },
    put: async (key: string, value: string) => { store.set(key, JSON.parse(value)); },
    delete: async (key: string) => { store.delete(key); },
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
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

// ── normalizeRow ─────────────────────────────────────────────────────

describe('normalizeRow', () => {
  it('returns null when model id is missing', () => {
    expect(normalizeRow({})).toBeNull();
    expect(normalizeRow({ Average: 50 })).toBeNull();
  });

  it('extracts canonical fields with standard HF v2 column names', () => {
    const r = normalizeRow({
      eval_name: 'meta-llama/Llama-3.3-70B-Instruct',
      'Average ⬆️': 35.2,
      IFEval: 56.79,
      BBH: 32.86,
      'MATH Lvl 5': 5.06,
      GPQA: 5.94,
      MUSR: 6.47,
      'MMLU-PRO': 19.06,
      '#Params (B)': 70,
      Precision: 'bfloat16',
      'Hub License': 'llama3',
      Type: '🔶 : fine-tuned',
      'Base Model': 'meta-llama/Meta-Llama-3-70B',
    });
    expect(r).not.toBeNull();
    expect(r!.model_id).toBe('meta-llama/Llama-3.3-70B-Instruct');
    expect(r!.average).toBe(35.2);
    expect(r!.scores.ifeval).toBe(56.79);
    expect(r!.scores.math_lvl_5).toBe(5.06);
    expect(r!.scores.mmlu_pro).toBe(19.06);
    expect(r!.params_b).toBe(70);
    expect(r!.precision).toBe('bfloat16');
    expect(r!.license).toBe('llama3');
    expect(r!.base_model).toBe('meta-llama/Meta-Llama-3-70B');
    expect(r!.type).toBe('fine-tuned');
  });

  it('tolerates alternative field names', () => {
    const r = normalizeRow({
      fullname: 'mistralai/Mixtral-8x7B-v0.1',
      average: 28.1,
      ifeval: 40,
      bbh: 25,
      math_lvl_5: 3,
      gpqa: 4,
      musr: 5,
      mmlu_pro: 18,
    });
    expect(r).not.toBeNull();
    expect(r!.model_id).toBe('mistralai/Mixtral-8x7B-v0.1');
    expect(r!.average).toBe(28.1);
    expect(r!.scores.ifeval).toBe(40);
  });

  it('strips emoji from type field', () => {
    const r = normalizeRow({ eval_name: 'foo/bar', Type: '🟢 : pretrained' });
    expect(r!.type).toBe('pretrained');
  });

  it('parses numeric strings', () => {
    const r = normalizeRow({ eval_name: 'foo/bar', 'Average ⬆️': '35.2', '#Params (B)': '7.5' });
    expect(r!.average).toBe(35.2);
    expect(r!.params_b).toBe(7.5);
  });

  it('returns null score values when missing', () => {
    const r = normalizeRow({ eval_name: 'foo/bar' });
    expect(r!.scores.ifeval).toBeNull();
    expect(r!.scores.gpqa).toBeNull();
    expect(r!.average).toBeNull();
  });
});

// ── validateSnapshot ────────────────────────────────────────────────

function makeSnap(entries: LeaderboardEntry[]): LeaderboardSnapshot {
  return {
    capturedAt: '2026-05-10',
    source: 'open-llm-leaderboard/contents',
    total_models: entries.length,
    entries,
  };
}

function makeEntry(over: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  const e: LeaderboardEntry = {
    rank: 1,
    model_id: over.model_id ?? 'x/y',
    params_b: 7,
    precision: 'bfloat16',
    license: 'apache-2.0',
    base_model: null,
    type: 'pretrained',
    average: 30,
    scores: { ifeval: 50, bbh: 30, math_lvl_5: 5, gpqa: 5, musr: 5, mmlu_pro: 20 },
    submitted_at: null,
  };
  if ('average' in over) e.average = over.average as number | null;
  if ('scores' in over) e.scores = over.scores as LeaderboardEntry['scores'];
  return e;
}

describe('validateSnapshot', () => {
  it('rejects empty snapshot', () => {
    const r = validateSnapshot(makeSnap([]));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/too few/);
  });

  it('rejects below the min-models floor', () => {
    const small = Array.from({ length: 10 }, () => makeEntry());
    expect(validateSnapshot(makeSnap(small)).ok).toBe(false);
  });

  it('accepts a healthy snapshot at the threshold', () => {
    const healthy = Array.from({ length: 60 }, (_, i) => makeEntry({ model_id: `m/${i}` }));
    expect(validateSnapshot(makeSnap(healthy)).ok).toBe(true);
  });

  it('rejects when average coverage is too low', () => {
    const mostlyNullAvg = Array.from({ length: 100 }, (_, i) =>
      makeEntry({ model_id: `m/${i}`, average: i < 30 ? 30 : null as unknown as number }),
    );
    const r = validateSnapshot(makeSnap(mostlyNullAvg));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/average coverage/);
  });

  it('rejects when a per-task coverage drops below floor', () => {
    const mostlyNullIFEval = Array.from({ length: 100 }, (_, i) =>
      makeEntry({
        model_id: `m/${i}`,
        scores: { ifeval: i < 20 ? 50 : null as unknown as number, bbh: 30, math_lvl_5: 5, gpqa: 5, musr: 5, mmlu_pro: 20 },
      }),
    );
    const r = validateSnapshot(makeSnap(mostlyNullIFEval));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/ifeval coverage/);
  });
});

// ── readLatest ──────────────────────────────────────────────────────

describe('readLatest', () => {
  it('returns no_snapshot_yet when KV empty', async () => {
    const env = makeEnv({});
    const r = await readLatest(env);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_snapshot_yet');
      expect(r.hint).toBeDefined();
    }
  });

  it('returns snapshot with default limit 50', async () => {
    const entries = Array.from({ length: 200 }, (_, i) => makeEntry({ model_id: `m/${i}`, average: 100 - i }));
    const env = makeEnv({ 'hf-leaderboard:latest': makeSnap(entries) });
    const r = await readLatest(env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.returned).toBe(50);
      expect(r.total_models).toBe(200);
      expect(r.entries[0].model_id).toBe('m/0');
      expect(r.attribution).toBe(LEADERBOARD_ATTRIBUTION);
    }
  });

  it('honors limit query param', async () => {
    const entries = Array.from({ length: 200 }, (_, i) => makeEntry({ model_id: `m/${i}`, average: 100 - i }));
    const env = makeEnv({ 'hf-leaderboard:latest': makeSnap(entries) });
    const r = await readLatest(env, { limit: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.returned).toBe(10);
  });

  it('clamps limit to 500 max', async () => {
    const entries = Array.from({ length: 200 }, (_, i) => makeEntry({ model_id: `m/${i}`, average: 100 - i }));
    const env = makeEnv({ 'hf-leaderboard:latest': makeSnap(entries) });
    const r = await readLatest(env, { limit: 99999 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.returned).toBe(200); // capped by total
  });

  it('filters by min_average', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => makeEntry({ model_id: `m/${i}`, average: 100 - i }));
    const env = makeEnv({ 'hf-leaderboard:latest': makeSnap(entries) });
    const r = await readLatest(env, { min_average: 50 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries.every((e) => (e.average ?? 0) >= 50)).toBe(true);
    }
  });
});
