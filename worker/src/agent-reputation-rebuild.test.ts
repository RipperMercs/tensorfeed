import { describe, it, expect } from 'vitest';
import {
  computeCohortSpendCap,
  rebuildAllReputationCards,
} from './agent-reputation-rebuild';
import {
  getLeaderboard,
  getReputationCardByToken,
  getReputationCardByWallet,
  getReputationDates,
  getReputationMeta,
  getRollup,
  tokenShortFromFull,
} from './agent-reputation-store';
import type { AgentTelemetry } from './agent-reputation';

interface FakeKV {
  store: Map<string, string>;
  get(key: string, type?: 'json' | 'text'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

function makeKv(initial: Record<string, unknown> = {}): FakeKV {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) {
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    store,
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix = '', cursor } = {}) {
      const all = Array.from(store.keys()).filter((k) => k.startsWith(prefix)).sort();
      const startIdx = cursor ? all.indexOf(cursor) + 1 : 0;
      const page = all.slice(startIdx, startIdx + 1000);
      const complete = startIdx + 1000 >= all.length;
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete || page.length === 0 ? undefined : page[page.length - 1],
      };
    },
  };
}

function makeEnv(kv: FakeKV) {
  return { TENSORFEED_CACHE: kv } as any;
}

const TODAY = '2026-05-13';
const NOW = '2026-05-13T04:30:00Z';
const VERSION = 'v0.1';
const OPTS = { today: TODAY, generated_at: NOW, version: VERSION };

describe('computeCohortSpendCap', () => {
  const tel = (paid: number, free = 0): AgentTelemetry => ({
    token_prefix: 'tf_live_x',
    wallet: null,
    first_seen: '2026-05-01T00:00:00Z',
    last_active: '2026-05-13T00:00:00Z',
    active_dates: [],
    endpoints_used: [],
    successful_calls: 0,
    errors_4xx: 0,
    errors_5xx: 0,
    paid_calls: paid,
    free_trial_calls: free,
    receipts_signed: 0,
    total_credits_spent: 0,
    total_credits_purchased: 0,
    daily_spend_30d: {},
  });

  it('returns 1 for an empty cohort', () => {
    expect(computeCohortSpendCap([])).toBe(1);
  });
  it('returns the single value (min 1) for a one-agent cohort', () => {
    expect(computeCohortSpendCap([tel(20)])).toBe(100); // 20*5
    expect(computeCohortSpendCap([tel(0)])).toBe(1);
  });
  it('returns the 95th-percentile spend across the cohort', () => {
    const cohort = Array.from({ length: 20 }, (_, i) => tel(i * 10));
    const cap = computeCohortSpendCap(cohort);
    // spends = [0, 50, 100, ..., 950]; 95th-pct idx = floor(20*0.95) = 19 → 950
    expect(cap).toBe(950);
  });
});

describe('rebuildAllReputationCards', () => {
  it('returns zeros and writes meta when the universe is empty', async () => {
    const env = makeEnv(makeKv());
    const result = await rebuildAllReputationCards(env, OPTS);
    expect(result.total_agents).toBe(0);
    expect(result.wallet_cards).toBe(0);
    expect(result.token_only_cards).toBe(0);
    expect(result.cards_written).toBe(0);
    expect(result.leaderboards_written).toBe(5);
    const meta = await getReputationMeta(env);
    expect(meta?.total_agents).toBe(0);
    expect(meta?.version).toBe(VERSION);
  });

  it('creates a token-only card when a token has no pay:tx binding', async () => {
    const full = 'tf_live_abcdefghijklmnopqrstuvwx';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 100,
          created: '2026-04-13T00:00:00Z',
          last_used: '2026-05-13T12:00:00Z',
          agent_ua: 'X',
          total_purchased: 250,
        },
        [`pay:usage:${full}`]: {
          entries: [
            { endpoint: '/api/x', credits: 1, at: '2026-05-12T10:00:00Z' },
            { endpoint: '/api/y', credits: 5, at: '2026-05-13T10:00:00Z' },
          ],
        },
      }),
    );
    const result = await rebuildAllReputationCards(env, OPTS);
    expect(result.total_agents).toBe(1);
    expect(result.token_only_cards).toBe(1);
    expect(result.wallet_cards).toBe(0);
    const card = await getReputationCardByToken(env, 'tf_live_abcdefgh');
    expect(card).not.toBeNull();
    expect(card?.wallet).toBeNull();
    expect(card?.token_prefix).toBe('tf_live_abcdefgh');
    expect(card?.metrics.paid_calls).toBe(2);
    expect(card?.metrics.total_credits_spent).toBe(6);
    expect(card?.ranks.composite.rank).toBe(1);
    expect(card?.ranks.composite.total).toBe(1);
  });

  it('merges multiple tokens into one wallet card', async () => {
    const t1 = 'tf_live_111111111aaaaaaaa11111111';
    const t2 = 'tf_live_222222222bbbbbbbb22222222';
    const wallet = '0xwalletbeef';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${t1}`]: {
          balance: 10,
          created: '2026-04-01T00:00:00Z',
          last_used: '2026-05-10T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 100,
        },
        [`pay:credits:${t2}`]: {
          balance: 90,
          created: '2026-04-20T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 100,
        },
        [`pay:usage:${t1}`]: {
          entries: [{ endpoint: '/api/x', credits: 1, at: '2026-05-10T10:00:00Z' }],
        },
        [`pay:usage:${t2}`]: {
          entries: [{ endpoint: '/api/y', credits: 1, at: '2026-05-13T10:00:00Z' }],
        },
        'pay:tx:0xtx1': {
          amount_usd: 5,
          credits: 250,
          token: t1,
          created: '2026-04-01T00:00:00Z',
          sender_wallet: wallet,
        },
        'pay:tx:0xtx2': {
          amount_usd: 5,
          credits: 250,
          token: t2,
          created: '2026-04-20T00:00:00Z',
          sender_wallet: wallet,
        },
      }),
    );
    const result = await rebuildAllReputationCards(env, OPTS);
    expect(result.total_agents).toBe(1);
    expect(result.wallet_cards).toBe(1);
    expect(result.token_only_cards).toBe(0);
    const card = await getReputationCardByWallet(env, wallet);
    expect(card).not.toBeNull();
    expect(card?.wallet).toBe(wallet);
    expect(card?.first_seen).toBe('2026-04-01T00:00:00Z');
    expect(card?.last_active).toBe('2026-05-13T00:00:00Z');
    expect(card?.metrics.paid_calls).toBe(2);
    expect(card?.metrics.unique_endpoints_used).toBe(2);
    expect(card?.wallet_age_days).toBe(42);
  });

  it('applies a ban overlay (banned + ban_reason + trust grade F)', async () => {
    const full = 'tf_live_bannedtokenaaaaaaaaaaaaaa';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 0,
          created: '2026-04-01T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'sus',
          total_purchased: 10,
        },
        [`pay:usage:${full}`]: {
          entries: [{ endpoint: '/api/x', credits: 1, at: '2026-05-13T10:00:00Z' }],
        },
        // Ban targets the token prefix (token-only agent)
        'agent-rep:ban:tf_live_bannedto': {
          target: 'tf_live_bannedto',
          reason: 'sock_puppet',
          evidence_url: null,
          banned_at: '2026-05-13T10:00:00Z',
          banned_by_admin: 'admin-1',
        },
      }),
    );
    await rebuildAllReputationCards(env, OPTS);
    const card = await getReputationCardByToken(env, 'tf_live_bannedto');
    expect(card?.banned).toBe(true);
    expect(card?.ban_reason).toBe('sock_puppet');
    expect(card?.trust_grade).toBe('F');
  });

  it('applies a verified-claim overlay (display_name + operator_url + verified)', async () => {
    const full = 'tf_live_claimedtokenaaaaaaaaaaaa';
    const wallet = '0xclaimed';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 50,
          created: '2026-02-01T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 100,
        },
        [`pay:usage:${full}`]: {
          entries: Array.from({ length: 25 }, (_, i) => ({
            endpoint: `/api/x${i % 5}`,
            credits: 1,
            at: `2026-05-${String((i % 13) + 1).padStart(2, '0')}T10:00:00Z`,
          })),
        },
        [`pay:tx:0xtxc`]: {
          amount_usd: 5,
          credits: 250,
          token: full,
          created: '2026-02-01T00:00:00Z',
          sender_wallet: wallet,
        },
        [`agent-rep:claim:${wallet}`]: {
          wallet,
          display_name: 'Operator Alice',
          operator_url: 'https://alice.example',
          contact: null,
          signature: '0xdead',
          message: 'I claim',
          timestamp: '2026-05-13T00:00:00Z',
          nonce: 'nonceA',
          verified: true,
          ofac_clean: true,
          claimed_at: '2026-05-13T00:00:01Z',
        },
      }),
    );
    await rebuildAllReputationCards(env, OPTS);
    const card = await getReputationCardByWallet(env, wallet);
    expect(card?.display_name).toBe('Operator Alice');
    expect(card?.operator_url).toBe('https://alice.example');
    expect(card?.verified).toBe(true);
    expect(card?.ofac_clean).toBe(true);
  });

  it('ranks two agents and writes 5 leaderboards', async () => {
    const heavy = 'tf_live_heavyusedheavyuseduuuuuuu';
    const light = 'tf_live_lightuseduuuuuuuuuuuuuuuu';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${heavy}`]: {
          balance: 0,
          created: '2026-04-13T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 1000,
        },
        [`pay:usage:${heavy}`]: {
          entries: Array.from({ length: 50 }, (_, i) => ({
            endpoint: `/api/x${i % 8}`,
            credits: 10,
            at: `2026-05-${String((i % 13) + 1).padStart(2, '0')}T10:00:00Z`,
          })),
        },
        [`pay:credits:${light}`]: {
          balance: 0,
          created: '2026-05-13T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 1,
        },
        [`pay:usage:${light}`]: {
          entries: [{ endpoint: '/api/x', credits: 1, at: '2026-05-13T10:00:00Z' }],
        },
      }),
    );
    const result = await rebuildAllReputationCards(env, OPTS);
    expect(result.total_agents).toBe(2);
    expect(result.leaderboards_written).toBe(5);

    const composite = await getLeaderboard(env, 'composite', 'all');
    expect(composite).toHaveLength(2);
    expect(composite[0]).toBe('tf_live_heavyuse');
    expect(composite[1]).toBe('tf_live_lightuse');

    const spend = await getLeaderboard(env, 'spend', 'all');
    expect(spend[0]).toBe('tf_live_heavyuse');

    const heavyCard = await getReputationCardByToken(env, 'tf_live_heavyuse');
    expect(heavyCard?.ranks.composite.rank).toBe(1);
    expect(heavyCard?.ranks.composite.total).toBe(2);
  });

  it('writes the rollup with cohort_spend_cap and updates dates index', async () => {
    const full = 'tf_live_solorollupaaaaaaaaaaaaaaa';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 0,
          created: '2026-05-01T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 100,
        },
        [`pay:usage:${full}`]: {
          entries: [{ endpoint: '/api/x', credits: 5, at: '2026-05-13T10:00:00Z' }],
        },
      }),
    );
    await rebuildAllReputationCards(env, OPTS);
    const rollup = await getRollup(env, TODAY);
    expect(rollup).not.toBeNull();
    expect(rollup?.date).toBe(TODAY);
    expect(rollup?.total_agents).toBe(1);
    expect(rollup?.cohort_spend_cap).toBeGreaterThanOrEqual(1);
    expect(rollup?.leaderboards.composite).toEqual(['tf_live_soloroll']);

    const dates = await getReputationDates(env);
    expect(dates).toContain(TODAY);
  });

  it('folds free-trial calls into the agent record by token_short match', async () => {
    const full = 'tf_live_freecallsaaaaaaaaaa11111111';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 0,
          created: '2026-04-13T00:00:00Z',
          last_used: '2026-05-13T00:00:00Z',
          agent_ua: 'X',
          total_purchased: 0,
        },
        [`pay:usage:${full}`]: { entries: [] },
        'pay:no-charge:index': ['2026-05-13'],
        'pay:no-charge:2026-05-13': {
          events: [
            { ts: '2026-05-13T10:00:00Z', endpoint: '/api/x', cost_skipped: 1, token_short: tokenShortFromFull(full) },
            { ts: '2026-05-13T11:00:00Z', endpoint: '/api/y', cost_skipped: 1, token_short: tokenShortFromFull(full) },
          ],
        },
      }),
    );
    await rebuildAllReputationCards(env, OPTS);
    const card = await getReputationCardByToken(env, 'tf_live_freecall');
    expect(card?.metrics.free_trial_calls).toBe(2);
  });
});
