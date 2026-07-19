import { describe, it, expect } from 'vitest';
import {
  TIME_MACHINE_DOMAINS,
  isTimeMachineDomain,
  isValidTimeMachineDate,
  getTimeMachineCoverage,
  readTimeMachineDomain,
  readTimeMachineAll,
  MIN_DOMAINS_FOR_CHARGE,
} from './time-machine';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  seed(key: string, value: unknown): void {
    this.store.set(key, JSON.stringify(value));
  }
}

function makeEnv(): { env: Env; kv: MockKV } {
  const kv = new MockKV();
  return { env: { TENSORFEED_CACHE: kv } as unknown as Env, kv };
}

const NOW = new Date('2026-07-18T12:00:00Z');

function seedHistory(kv: MockKV, date: string): void {
  kv.seed('history:index', [date]);
  for (const t of ['pricing', 'models', 'benchmarks', 'status']) {
    kv.seed(`history:${date}:${t}`, {
      date,
      type: t,
      capturedAt: `${date}T00:05:00Z`,
      data: { sample: t },
    });
  }
}

describe('date and domain validation', () => {
  it('accepts past and today, rejects future, malformed, impossible', () => {
    expect(isValidTimeMachineDate('2026-06-01', NOW)).toBe(true);
    expect(isValidTimeMachineDate('2026-07-18', NOW)).toBe(true);
    expect(isValidTimeMachineDate('2026-07-19', NOW)).toBe(false);
    expect(isValidTimeMachineDate('2026-6-1', NOW)).toBe(false);
    expect(isValidTimeMachineDate('not-a-date', NOW)).toBe(false);
    expect(isValidTimeMachineDate('2026-13-40', NOW)).toBe(false);
  });

  it('recognizes exactly the published domains', () => {
    for (const d of TIME_MACHINE_DOMAINS) expect(isTimeMachineDomain(d)).toBe(true);
    expect(isTimeMachineDomain('all')).toBe(false);
    expect(isTimeMachineDomain('crypto')).toBe(false);
  });
});

describe('coverage', () => {
  it('reports per-domain from/to/days and empty domains as null', async () => {
    const { env, kv } = makeEnv();
    kv.seed('history:index', ['2026-05-02', '2026-05-01', '2026-05-03']);
    kv.seed('news:daily:index', ['2026-04-27', '2026-04-28']);
    kv.seed('kev:added:index', ['2026-05-13']);
    const c = await getTimeMachineCoverage(env);
    expect(c.domains.pricing).toEqual({ from: '2026-05-01', to: '2026-05-03', days: 3 });
    expect(c.domains.status).toEqual(c.domains.pricing);
    expect(c.domains.news).toEqual({ from: '2026-04-27', to: '2026-04-28', days: 2 });
    expect(c.domains.kev.days).toBe(1);
    expect(c.domains.gpu).toEqual({ from: null, to: null, days: 0 });
  });
});

describe('readTimeMachineDomain', () => {
  it('returns a history-backed snapshot with its original capture time', async () => {
    const { env, kv } = makeEnv();
    seedHistory(kv, '2026-06-01');
    const r = await readTimeMachineDomain(env, 'pricing', '2026-06-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.captured_at).toBe('2026-06-01T00:05:00Z');
    expect((r.snapshot as { type: string }).type).toBe('pricing');
  });

  it('miss returns the live coverage range', async () => {
    const { env, kv } = makeEnv();
    seedHistory(kv, '2026-06-01');
    const r = await readTimeMachineDomain(env, 'models', '2026-06-02');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.coverage).toEqual({ from: '2026-06-01', to: '2026-06-01', days: 1 });
  });

  it('news joins the daily snapshot with that date\'s clusters', async () => {
    const { env, kv } = makeEnv();
    kv.seed('news:daily:2026-06-01', {
      date: '2026-06-01',
      captured_at: '2026-06-01T23:00:00Z',
      articles_count: 1,
      articles: [{ id: 'a1' }],
    });
    kv.seed('news:cluster:index:2026-06-01', ['c1']);
    kv.seed('news:cluster:2026-06-01:c1', { cluster_id: 'c1', source_count: 2 });
    const r = await readTimeMachineDomain(env, 'news', '2026-06-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const snap = r.snapshot as { clusters: unknown[] };
    expect(snap.clusters.length).toBe(1);
    expect(r.captured_at).toBe('2026-06-01T23:00:00Z');
  });

  it('kev: a date in coverage with zero additions is a hit, outside coverage is a miss', async () => {
    const { env, kv } = makeEnv();
    kv.seed('kev:added:index', ['2026-06-01']);
    kv.seed('kev:added:2026-06-01', []);
    const hit = await readTimeMachineDomain(env, 'kev', '2026-06-01');
    expect(hit.ok).toBe(true);
    if (hit.ok) {
      expect((hit.snapshot as { added_count: number }).added_count).toBe(0);
    }
    const miss = await readTimeMachineDomain(env, 'kev', '2026-06-02');
    expect(miss.ok).toBe(false);
  });
});

describe('readTimeMachineAll', () => {
  it('aggregates resolved domains, lists missing with coverage, takes latest captured_at', async () => {
    const { env, kv } = makeEnv();
    seedHistory(kv, '2026-06-01');
    kv.seed('news:daily:index', ['2026-06-01']);
    kv.seed('news:daily:2026-06-01', {
      date: '2026-06-01',
      captured_at: '2026-06-01T23:00:00Z',
      articles: [],
    });
    const all = await readTimeMachineAll(env, '2026-06-01');
    expect(all.resolved).toBe(5); // 4 history + news
    expect(all.partial).toBe(true); // gpu + kev missing
    expect(all.missing.map((m) => m.domain).sort()).toEqual(['gpu', 'kev']);
    expect(all.captured_at).toBe('2026-06-01T23:00:00Z'); // latest wins
    expect(all.resolved).toBeGreaterThanOrEqual(MIN_DOMAINS_FOR_CHARGE);
  });

  it('below the charge floor when almost nothing existed', async () => {
    const { env, kv } = makeEnv();
    kv.seed('kev:added:index', ['2026-04-01']);
    kv.seed('kev:added:2026-04-01', []);
    const all = await readTimeMachineAll(env, '2026-04-01');
    expect(all.resolved).toBe(1);
    expect(all.resolved).toBeLessThan(MIN_DOMAINS_FOR_CHARGE);
  });
});
