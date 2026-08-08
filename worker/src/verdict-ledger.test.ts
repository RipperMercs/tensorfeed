import { describe, it, expect, vi } from 'vitest';
import {
  captureVerdictPanel,
  methodologyDigest,
  panelDigest,
  verdictIndexKey,
  verdictKey,
  VERDICT_PANEL,
  readVerdictDay,
  scoreVerdictHorizons,
  verdictOutcomeKey,
  type PanelQuestion,
} from './verdict-ledger';
import type { Env } from './types';

function mockCache(): any {
  const store = new Map<string, string>();
  return {
    _store: store,
    put: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    get: vi.fn(async (k: string, type?: string) => {
      const v = store.get(k);
      if (v === undefined) return null;
      return type === 'json' ? JSON.parse(v) : v;
    }),
  };
}

/** A panel whose answers are supplied by the test, so no verdict stack is mocked. */
function fakePanel(
  answers: Record<string, unknown>,
  onCompute?: (id: string) => void,
): PanelQuestion[] {
  return Object.entries(answers).map(([id, core]) => ({
    id,
    endpoint: `/api/premium/${id.split(':')[0]}`,
    verdict_class: 'model_choice',
    compute: async () => {
      onCompute?.(id);
      if (core instanceof Error) throw core;
      return core as any;
    },
  }));
}

const CORE_A = {
  decision: 'anthropic/claude-sonnet-4.6',
  alternatives: ['openai/gpt-5.5'],
  detail: { score: 0.91 },
  inputs: { pricing: '2026-08-07', benchmarks: '2026-08-02' },
};

describe('verdictKey', () => {
  it('namespaces by date so a later run never overwrites an earlier day', () => {
    expect(verdictKey('2026-08-07', 'route-verdict:task=code')).not.toBe(
      verdictKey('2026-08-08', 'route-verdict:task=code'),
    );
    expect(verdictKey('2026-08-07', 'route-verdict:task=code')).toContain('2026-08-07');
  });

  it('is prefixed so the whole ledger is listable', () => {
    expect(verdictKey('2026-08-07', 'x')).toMatch(/^verdict:/);
    expect(verdictIndexKey('2026-08-07')).toMatch(/^verdict:/);
  });
});

describe('methodologyDigest', () => {
  it('is stable across calls', () => {
    expect(methodologyDigest()).toBe(methodologyDigest());
  });

  it('hashes constant VALUES, so it is not just the version string', () => {
    // A version string would be short and human readable. This must be a
    // digest, because weights can change without a METHODOLOGY_VERSION bump.
    expect(methodologyDigest()).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('panelDigest', () => {
  it('changes when a question is added, so a scorer can detect a discontinuity', () => {
    const a = fakePanel({ 'route-verdict:task=code': CORE_A });
    const b = fakePanel({ 'route-verdict:task=code': CORE_A, 'route-verdict:task=general': CORE_A });
    expect(panelDigest(a)).not.toBe(panelDigest(b));
  });

  it('ignores the compute function, depending only on the question identity', () => {
    const a: PanelQuestion[] = [
      { id: 'q1', endpoint: '/e', verdict_class: 'model_choice', compute: async () => null },
    ];
    const b: PanelQuestion[] = [
      { id: 'q1', endpoint: '/e', verdict_class: 'model_choice', compute: async () => CORE_A as any },
    ];
    expect(panelDigest(a)).toBe(panelDigest(b));
  });
});

describe('captureVerdictPanel', () => {
  const NOW = '2026-08-07T07:05:00.000Z';

  it('writes one record per panel question plus one index', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    const panel = fakePanel({ 'route-verdict:task=code': CORE_A, 'route-verdict:task=general': CORE_A });

    const res = await captureVerdictPanel(env, NOW, panel);

    expect(res.written).toBe(2);
    expect(res.errors).toEqual([]);
    expect(res.date).toBe('2026-08-07');
    expect(cache.put).toHaveBeenCalledTimes(3); // 2 records + 1 index
    expect(cache._store.has(verdictKey('2026-08-07', 'route-verdict:task=code'))).toBe(true);
    expect(cache._store.has(verdictIndexKey('2026-08-07'))).toBe(true);
  });

  it('writes the index once with the full question list, never read-modify-write', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    const panel = fakePanel({ a: CORE_A, b: CORE_A, c: CORE_A });

    await captureVerdictPanel(env, NOW, panel);

    // No get() on the index: an incremental index would be a read-modify-write
    // on one shared key, which is the exact bug that corrupted the pay rollup.
    expect(cache.get).not.toHaveBeenCalled();
    const index = JSON.parse(cache._store.get(verdictIndexKey('2026-08-07'))!);
    expect(index.question_ids.sort()).toEqual(['a', 'b', 'c']);
  });

  it('stores the decision, its alternatives and the digests, not the whole payload', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    await captureVerdictPanel(env, NOW, fakePanel({ 'route-verdict:task=code': CORE_A }));

    const rec = JSON.parse(cache._store.get(verdictKey('2026-08-07', 'route-verdict:task=code'))!);
    expect(rec.decision).toBe('anthropic/claude-sonnet-4.6');
    expect(rec.alternatives).toEqual(['openai/gpt-5.5']);
    expect(rec.question_id).toBe('route-verdict:task=code');
    expect(rec.date).toBe('2026-08-07');
    expect(rec.captured_at).toBe(NOW);
    expect(rec.methodology_digest).toMatch(/^[0-9a-f]{16}$/);
    expect(rec.panel_digest).toMatch(/^[0-9a-f]{16}$/);
    expect(rec.inputs_digest).toMatch(/^[0-9a-f]{16}$/);
  });

  it('gives the same inputs_digest for the same inputs and a different one when they move', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    await captureVerdictPanel(env, NOW, fakePanel({ q: CORE_A }));
    const first = JSON.parse(cache._store.get(verdictKey('2026-08-07', 'q'))!).inputs_digest;

    const moved = { ...CORE_A, inputs: { pricing: '2026-08-08', benchmarks: '2026-08-02' } };
    await captureVerdictPanel(env, '2026-08-08T07:05:00.000Z', fakePanel({ q: moved }));
    const second = JSON.parse(cache._store.get(verdictKey('2026-08-08', 'q'))!).inputs_digest;

    expect(second).not.toBe(first);
  });

  it('keeps going when one question throws, and reports it', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    const panel = fakePanel({
      good: CORE_A,
      bad: new Error('snapshot missing'),
      alsoGood: CORE_A,
    });

    const res = await captureVerdictPanel(env, NOW, panel);

    expect(res.written).toBe(2);
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]).toContain('bad');
    expect(res.errors[0]).toContain('snapshot missing');
    expect(cache._store.has(verdictKey('2026-08-07', 'alsoGood'))).toBe(true);
  });

  it('skips a question that cannot answer today rather than recording a null decision', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    const res = await captureVerdictPanel(env, NOW, fakePanel({ q: null, r: CORE_A }));

    expect(res.written).toBe(1);
    expect(res.skipped).toEqual(['q']);
    expect(cache._store.has(verdictKey('2026-08-07', 'q'))).toBe(false);
  });

  it('does not overwrite an earlier day when it runs again', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    await captureVerdictPanel(env, NOW, fakePanel({ q: CORE_A }));
    const dayOne = cache._store.get(verdictKey('2026-08-07', 'q'));
    await captureVerdictPanel(env, '2026-08-08T07:05:00.000Z', fakePanel({ q: CORE_A }));

    expect(cache._store.get(verdictKey('2026-08-07', 'q'))).toBe(dayOne);
    expect(cache._store.has(verdictKey('2026-08-08', 'q'))).toBe(true);
  });

  it('computes every question even though one is slow, without serialising on failure', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    const seen: string[] = [];
    const panel = fakePanel({ a: CORE_A, b: CORE_A }, (id) => seen.push(id));

    await captureVerdictPanel(env, NOW, panel);

    expect(seen.sort()).toEqual(['a', 'b']);
  });
});

describe('VERDICT_PANEL', () => {
  it('covers all four routing tasks, the canonical question set', () => {
    const ids = VERDICT_PANEL.map((q) => q.id);
    for (const task of ['code', 'reasoning', 'creative', 'general']) {
      expect(ids).toContain(`route-verdict:task=${task}`);
    }
  });

  it('has unique, stable ids, since a changed id breaks the time series', () => {
    const ids = VERDICT_PANEL.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9:=/-]+$/);
  });

  it('is small enough that the daily write cost stays flat and trivial', () => {
    // The whole point of a fixed panel: write volume is set by panel size, not
    // by caller count, so it does not scale with a traffic wave.
    expect(VERDICT_PANEL.length).toBeGreaterThan(0);
    expect(VERDICT_PANEL.length).toBeLessThanOrEqual(25);
  });
});

describe('readVerdictDay', () => {
  const NOW = '2026-08-07T07:05:00.000Z';

  it('returns the index and every record written for that date', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    await captureVerdictPanel(env, NOW, fakePanel({ a: CORE_A, b: CORE_A }));

    const day = await readVerdictDay(env, '2026-08-07');

    expect(day.index?.question_ids.sort()).toEqual(['a', 'b']);
    expect(day.records.length).toBe(2);
    expect(day.records.map((r) => r.question_id).sort()).toEqual(['a', 'b']);
    expect(day.records[0]!.decision).toBe('anthropic/claude-sonnet-4.6');
  });

  it('returns an empty day rather than throwing when nothing was written', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    const day = await readVerdictDay(env, '2020-01-01');

    expect(day.index).toBeNull();
    expect(day.records).toEqual([]);
  });

  it('reports a record named by the index that is missing from KV', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    await captureVerdictPanel(env, NOW, fakePanel({ a: CORE_A, b: CORE_A }));
    cache._store.delete(verdictKey('2026-08-07', 'b'));

    const day = await readVerdictDay(env, '2026-08-07');

    expect(day.records.length).toBe(1);
    expect(day.missing).toEqual(['b']);
  });
});

// === phase B: forward scoring ===

/** A panel question that can also report whether a past decision still stands. */
function scorablePanel(
  todayDecision: string | null,
  invalidated: Record<string, boolean> = {},
): PanelQuestion[] {
  return [
    {
      id: 'route-verdict:task=code',
      endpoint: '/api/premium/route-verdict',
      verdict_class: 'model_choice',
      compute: async () =>
        todayDecision === null
          ? null
          : { decision: todayDecision, alternatives: [], detail: {}, inputs: { pricing: '2026-08-14' } },
      statusOf: async (_env: Env, decision: string) => ({
        invalidated: !!invalidated[decision],
        reason: invalidated[decision] ? 'sunsetted' : 'operational',
        evidence: { checked: decision },
      }),
    },
  ];
}

async function seedDay(cache: any, date: string, decision: string): Promise<Env> {
  const env = { TENSORFEED_CACHE: cache } as unknown as Env;
  await captureVerdictPanel(env, `${date}T07:00:00.000Z`, [
    {
      id: 'route-verdict:task=code',
      endpoint: '/api/premium/route-verdict',
      verdict_class: 'model_choice',
      compute: async () => ({ decision, alternatives: ['b'], detail: {}, inputs: { pricing: date } }),
    },
  ]);
  return env;
}

describe('scoreVerdictHorizons', () => {
  it('labels a decision that still stands today as held', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');

    const res = await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7], scorablePanel('model-x'));

    expect(res.scored).toBe(1);
    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    expect(out.label).toBe('held');
    expect(out.original_decision).toBe('model-x');
    expect(out.current_decision).toBe('model-x');
    expect(out.horizon_days).toBe(7);
  });

  it('labels a changed answer superseded when the original is still valid', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');

    await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7], scorablePanel('model-y'));

    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    // The world moved. The call was not wrong when it was made.
    expect(out.label).toBe('superseded');
    expect(out.current_decision).toBe('model-y');
  });

  it('labels it reversed when the original decision was invalidated', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');

    await scoreVerdictHorizons(
      env,
      '2026-08-14T07:00:00.000Z',
      [7],
      scorablePanel('model-y', { 'model-x': true }),
    );

    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    expect(out.label).toBe('reversed');
    expect(out.reason).toContain('sunsetted');
    expect(out.evidence.checked).toBe('model-x');
  });

  it('records that our own methodology moved, so a reversal is not blamed on the world', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');
    // Rewrite the stored record as if it had been captured under a different
    // methodology, which is what a weights change would look like later.
    const key = verdictKey('2026-08-07', 'route-verdict:task=code');
    const rec = JSON.parse(cache._store.get(key)!);
    rec.methodology_digest = 'ffffffffffffffff';
    cache._store.set(key, JSON.stringify(rec));

    await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7], scorablePanel('model-y'));

    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    expect(out.methodology_changed).toBe(true);
  });

  it('marks a question that is no longer on the panel as unresolved, not reversed', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');

    // Today's panel no longer contains that question id.
    const otherPanel: PanelQuestion[] = [
      { id: 'route-verdict:task=general', endpoint: '/e', verdict_class: 'model_choice', compute: async () => null },
    ];
    await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7], otherPanel);

    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    expect(out.label).toBe('unresolved');
    expect(out.reason).toContain('retired');
  });

  it('marks it unresolved when today cannot answer, rather than guessing', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');

    await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7], scorablePanel(null));

    const out = JSON.parse(cache._store.get(verdictOutcomeKey('2026-08-07', 7, 'route-verdict:task=code'))!);
    expect(out.label).toBe('unresolved');
  });

  it('does nothing for a horizon with no origin day, without throwing', async () => {
    const cache = mockCache();
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;

    const res = await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7, 30, 90], scorablePanel('x'));

    expect(res.scored).toBe(0);
    expect(res.horizons.find((h) => h.horizon_days === 7)?.origin_date).toBe('2026-08-07');
  });

  it('scores each horizon into its own key so the three never collide', () => {
    const a = verdictOutcomeKey('2026-08-07', 7, 'q');
    const b = verdictOutcomeKey('2026-08-07', 30, 'q');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^verdict:outcome:/);
  });

  it('computes today once per question rather than once per record', async () => {
    const cache = mockCache();
    const env = await seedDay(cache, '2026-08-07', 'model-x');
    await seedDay(cache, '2026-07-15', 'model-x'); // a D+30 origin as well

    let computes = 0;
    const panel = scorablePanel('model-x');
    const counting: PanelQuestion[] = [
      { ...panel[0]!, compute: async (e) => { computes++; return panel[0]!.compute(e); } },
    ];

    await scoreVerdictHorizons(env, '2026-08-14T07:00:00.000Z', [7, 30], counting);

    // Two horizons both scored, but today's verdict is computed once.
    expect(computes).toBe(1);
  });
});
