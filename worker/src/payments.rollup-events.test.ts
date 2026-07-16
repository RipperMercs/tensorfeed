import { describe, it, expect } from 'vitest';
import {
  logRevenue,
  logPremiumUsage,
  reconcileRollupForDate,
  type DailyRollup,
} from './payments';
import type { Env } from './types';

// The daily rollup is written read-modify-write on one shared KV key, and
// KV has no atomic increment, so N same-second events keep ~1 update (the
// 2026-07-15 19-settle burst recorded as 7 calls / 6 settles). These tests
// cover the fix: every settle and serve appends its own single-writer
// pay:evt:* key, and reconcileRollupForDate rebuilds a completed day's
// rollup exactly from that trail using the same fold functions as the live
// path.

interface MockKV {
  store: Map<string, string>;
  get(key: string, type?: string): Promise<unknown>;
  put(key: string, value: string, opts?: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

function makeKV(): MockKV {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string, type?: string) => {
      const v = store.get(key);
      if (v === undefined) return null;
      return type === 'json' ? JSON.parse(v) : v;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    // Honors prefix and sorts lexicographically like real KV, so the
    // chronological-key-order property is actually exercised.
    list: async (opts?: { prefix?: string }) => {
      const names = [...store.keys()]
        .filter((n) => !opts?.prefix || n.startsWith(opts.prefix))
        .sort();
      return { keys: names.map((name) => ({ name })), list_complete: true };
    },
  };
}

function makeEnv(): Env & { cache: MockKV } {
  const cache = makeKV();
  return {
    TENSORFEED_NEWS: makeKV() as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV() as unknown as KVNamespace,
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
    cache,
  } as unknown as Env & { cache: MockKV };
}

const DATE = '2026-07-15';
const WALLET = '0x7e571E959cC7C75Ccdd2eAC24f8775ea2eAa2F09';

function seedEvent(env: { cache: MockKV }, at: string, evt: object, i: number): void {
  env.cache.store.set(`pay:evt:${DATE}:${at}:${String(i).padStart(4, '0')}`, JSON.stringify(evt));
}

// Recreates the 2026-07-15 shape: a burst of settles and serves in the same
// second, which the live RMW path undercounts but the event trail keeps.
function seedBurst(env: { cache: MockKV }): void {
  let i = 0;
  for (let n = 0; n < 4; n++) {
    const at = `${DATE}T22:46:53.${100 + n}Z`;
    seedEvent(env, at, { k: 'rev', at, usd: 0.02, ua: 'Dexter-Verifier/1.0' }, i++);
    seedEvent(
      env,
      at,
      { k: 'use', at, endpoint: '/api/premium/ai-cves/ai-stack-cves', ua: 'Dexter-Verifier/1.0', credits: 1, wallet: WALLET },
      i++,
    );
  }
  const at2 = `${DATE}T23:54:45.500Z`;
  seedEvent(env, at2, { k: 'rev', at: at2, usd: 0.02, ua: 'Dexter-Verifier/1.0' }, i++);
  seedEvent(
    env,
    at2,
    { k: 'use', at: at2, endpoint: '/api/premium/whats-new', ua: 'Dexter-Verifier/1.0', credits: 1, wallet: WALLET },
    i++,
  );
}

describe('event trail emission', () => {
  it('logRevenue and logPremiumUsage each append a pay:evt:* record', async () => {
    const env = makeEnv();
    await logRevenue(env, 0.02, 'agent/1');
    await logPremiumUsage(env, '/api/premium/whats-new', 'agent/1', 1, undefined, WALLET);

    const evtKeys = [...env.cache.store.keys()].filter((k) => k.startsWith('pay:evt:'));
    expect(evtKeys).toHaveLength(2);
    const events = evtKeys.map((k) => JSON.parse(env.cache.store.get(k)!));
    const rev = events.find((e) => e.k === 'rev');
    const use = events.find((e) => e.k === 'use');
    expect(rev).toMatchObject({ usd: 0.02, ua: 'agent/1' });
    expect(use).toMatchObject({
      endpoint: '/api/premium/whats-new',
      ua: 'agent/1',
      credits: 1,
      wallet: WALLET,
    });
  });

  it('rebuilding today from the live-emitted events equals the live rollup (fold equivalence)', async () => {
    const env = makeEnv();
    const today = new Date().toISOString().slice(0, 10);
    await logRevenue(env, 0.1, 'agent/a');
    await logPremiumUsage(env, '/api/premium/whats-new', 'agent/a', 1, undefined, WALLET);
    await logPremiumUsage(env, '/api/premium/routing', 'agent/b', 3);

    const live = JSON.parse(env.cache.store.get(`pay:rollup:${today}`)!) as DailyRollup;
    const result = await reconcileRollupForDate(env, today, { dry: true });
    expect(result.action).toBe('dry_run');
    expect(result.events).toBe(3);
    // last_seen/first_seen come from each event's own timestamp on both
    // paths, so sequential live writes and the rebuild agree exactly.
    expect(result.rebuilt).toEqual(live);
  });
});

describe('reconcileRollupForDate', () => {
  function seedSince(env: { cache: MockKV }, date: string): void {
    env.cache.store.set('pay:evt:since', date);
  }

  it('rebuilds an undercounted rollup exactly from the burst event trail', async () => {
    const env = makeEnv();
    seedSince(env, '2026-07-01');
    seedBurst(env);
    // The racy live rollup only kept one update from the burst.
    env.cache.store.set(
      `pay:rollup:${DATE}`,
      JSON.stringify({
        date: DATE,
        total_usd: 0.02,
        tx_count: 1,
        total_credits_charged: 1,
        call_count: 1,
        unique_agents: ['Dexter-Verifier/1.0'],
        by_endpoint: {},
        top_agents: [],
      }),
    );

    const result = await reconcileRollupForDate(env, DATE);
    expect(result.action).toBe('reconciled');
    expect(result.events).toBe(10);

    const rollup = JSON.parse(env.cache.store.get(`pay:rollup:${DATE}`)!) as DailyRollup;
    expect(rollup.tx_count).toBe(5);
    expect(rollup.total_usd).toBeCloseTo(0.1, 10);
    expect(rollup.call_count).toBe(5);
    expect(rollup.total_credits_charged).toBe(5);
    expect(rollup.by_endpoint['/api/premium/ai-cves/ai-stack-cves']).toMatchObject({
      calls: 4,
      credits_charged: 4,
      distinct_payers: 1,
    });
    expect(rollup.by_endpoint['/api/premium/whats-new']).toMatchObject({
      calls: 1,
      credits_charged: 1,
      distinct_payers: 1,
    });
    const payer = rollup.top_payers?.[WALLET.toLowerCase()];
    expect(payer).toMatchObject({ calls: 5, credits_charged: 5, wallet_raw: WALLET, rail: 'evm' });
    expect(rollup.rails?.evm).toEqual({ calls: 5, credits_charged: 5 });
    const agent = rollup.top_agents.find((a) => a.agent_ua === 'Dexter-Verifier/1.0');
    expect(agent).toMatchObject({ calls: 5, credits: 5, purchased_usd: 0.1 });
  });

  it('write mode without events leaves the existing rollup untouched', async () => {
    const env = makeEnv();
    seedSince(env, '2026-07-01');
    const existing = JSON.stringify({
      date: DATE,
      total_usd: 0.5,
      tx_count: 9,
      total_credits_charged: 9,
      call_count: 9,
      unique_agents: [],
      by_endpoint: {},
      top_agents: [],
    });
    env.cache.store.set(`pay:rollup:${DATE}`, existing);

    const result = await reconcileRollupForDate(env, DATE);
    expect(result.action).toBe('skipped_no_events');
    expect(env.cache.store.get(`pay:rollup:${DATE}`)).toBe(existing);
  });

  it('write mode bootstraps pay:evt:since on first run and skips', async () => {
    const env = makeEnv();
    seedBurst(env);
    const result = await reconcileRollupForDate(env, DATE);
    expect(result.action).toBe('skipped_partial_coverage');
    expect(env.cache.store.get('pay:evt:since')).toBe(new Date().toISOString().slice(0, 10));
    // Events exist but the rollup must not have been written.
    expect(env.cache.store.get(`pay:rollup:${DATE}`)).toBeUndefined();
  });

  it('write mode refuses dates on or before the coverage marker', async () => {
    const env = makeEnv();
    seedSince(env, DATE);
    seedBurst(env);
    const result = await reconcileRollupForDate(env, DATE);
    expect(result.action).toBe('skipped_partial_coverage');
    expect(env.cache.store.get(`pay:rollup:${DATE}`)).toBeUndefined();
  });

  it('dry run bypasses the coverage guard, rebuilds, and never writes', async () => {
    const env = makeEnv();
    seedBurst(env);

    const result = await reconcileRollupForDate(env, DATE, { dry: true });
    expect(result.action).toBe('dry_run');
    expect(result.events).toBe(10);
    expect(result.rebuilt?.tx_count).toBe(5);
    expect(result.rebuilt?.call_count).toBe(5);
    expect(env.cache.store.get(`pay:rollup:${DATE}`)).toBeUndefined();
    // Dry runs must not stamp the coverage marker either.
    expect(env.cache.store.get('pay:evt:since')).toBeUndefined();
  });

  it('ignores non-event keys that share the listing and malformed events', async () => {
    const env = makeEnv();
    seedSince(env, '2026-07-01');
    seedBurst(env);
    env.cache.store.set(`pay:evt:${DATE}:zz-not-an-event`, JSON.stringify({ junk: true }));

    const result = await reconcileRollupForDate(env, DATE);
    expect(result.action).toBe('reconciled');
    expect(result.events).toBe(10);
  });
});
