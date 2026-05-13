import { describe, it, expect, beforeEach } from 'vitest';
import type { AgentTelemetry } from './agent-reputation';
import {
  aggregateFreeTrialCalls,
  assembleTelemetryForToken,
  buildWalletToTokensIndex,
  deleteBanRecord,
  deletePendingClaim,
  getBanRecord,
  getLeaderboard,
  getOperatorClaim,
  getPendingClaim,
  getReputationCardByToken,
  getReputationCardByWallet,
  getReputationDates,
  getReputationMeta,
  getRollup,
  listAllPaidTokens,
  listBans,
  mergeTelemetryAcrossTokens,
  putBanRecord,
  putLeaderboard,
  putOperatorClaim,
  putPendingClaim,
  putReputationCard,
  putReputationDates,
  putReputationMeta,
  putRollup,
  tokenPrefix,
  tokenShortFromFull,
  type BanRecord,
  type OperatorClaim,
  type ReputationMeta,
  type ReputationRollup,
} from './agent-reputation-store';

// === Mock KV namespace with prefix list + paging ===

interface FakeKV {
  store: Map<string, string>;
  pageSize: number;
  get(key: string, type?: 'json' | 'text'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

function makeKv(initial: Record<string, unknown> = {}, pageSize = 1000): FakeKV {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) {
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    store,
    pageSize,
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
      // Cursor semantics: opaque marker for the last key returned in the
      // prior page. The next page starts strictly AFTER that key.
      let startIdx = 0;
      if (cursor) {
        const found = all.indexOf(cursor);
        startIdx = found === -1 ? all.length : found + 1;
      }
      const page = all.slice(startIdx, startIdx + this.pageSize);
      const next = startIdx + this.pageSize;
      const complete = next >= all.length;
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

beforeEach(() => {
  // No global state to reset; each test makes its own kv.
});

describe('tokenPrefix', () => {
  it('takes the first 16 chars', () => {
    expect(tokenPrefix('tf_live_18e54f47cafebabe')).toBe('tf_live_18e54f47');
  });
  it('returns shorter input verbatim when under 16 chars', () => {
    expect(tokenPrefix('tf_live_abc')).toBe('tf_live_abc');
  });
});

describe('tokenShortFromFull', () => {
  it('matches the format used in pay:no-charge events', () => {
    const full = 'tf_live_abcdefghijklmnopqrstuvwx';
    expect(tokenShortFromFull(full)).toBe('tf_live_abcdefgh...qrstuvwx');
  });
  it('falls back when token does not start with tf_live_', () => {
    expect(tokenShortFromFull('weird_token')).toBe('weird_to...');
  });
});

describe('readJson resilience (malformed JSON is skipped, not thrown)', () => {
  it('returns null + logs when a stored value is not valid JSON', async () => {
    const env = makeEnv(makeKv());
    // Write a deliberately broken value at a key that read helpers touch.
    await env.TENSORFEED_CACHE.put('agent-rep:wallet:0xdead', '{ broken');
    const card = await getReputationCardByWallet(env, '0xdead');
    expect(card).toBeNull();
  });

  it('still parses valid JSON the same way', async () => {
    const env = makeEnv(makeKv());
    await env.TENSORFEED_CACHE.put(
      'agent-rep:wallet:0xgood',
      JSON.stringify({ wallet: '0xgood', ok: true }),
    );
    const card = await getReputationCardByWallet(env, '0xgood');
    expect((card as any)?.wallet).toBe('0xgood');
  });
});

describe('read helpers (missing keys return null/[])', () => {
  it('getReputationCardByWallet returns null for unknown wallet', async () => {
    const env = makeEnv(makeKv());
    expect(await getReputationCardByWallet(env, '0xdead')).toBeNull();
  });
  it('getReputationCardByToken returns null for unknown prefix', async () => {
    const env = makeEnv(makeKv());
    expect(await getReputationCardByToken(env, 'tf_live_00000000')).toBeNull();
  });
  it('getOperatorClaim returns null when no claim filed', async () => {
    const env = makeEnv(makeKv());
    expect(await getOperatorClaim(env, '0xabc')).toBeNull();
  });
  it('getPendingClaim returns null when no pending claim queued', async () => {
    const env = makeEnv(makeKv());
    expect(await getPendingClaim(env, '0xabc')).toBeNull();
  });
  it('getBanRecord returns null when not banned', async () => {
    const env = makeEnv(makeKv());
    expect(await getBanRecord(env, '0xabc')).toBeNull();
  });
  it('getLeaderboard returns [] when never written', async () => {
    const env = makeEnv(makeKv());
    expect(await getLeaderboard(env, 'composite', '24h')).toEqual([]);
  });
  it('getReputationDates returns [] when never written', async () => {
    const env = makeEnv(makeKv());
    expect(await getReputationDates(env)).toEqual([]);
  });
  it('getReputationMeta returns null on cold start', async () => {
    const env = makeEnv(makeKv());
    expect(await getReputationMeta(env)).toBeNull();
  });
  it('getRollup returns null when date not snapshotted', async () => {
    const env = makeEnv(makeKv());
    expect(await getRollup(env, TODAY)).toBeNull();
  });
});

describe('write helpers (round-trip through KV)', () => {
  it('putOperatorClaim then getOperatorClaim roundtrips', async () => {
    const env = makeEnv(makeKv());
    const claim: OperatorClaim = {
      wallet: '0xABC',
      display_name: 'Agent X',
      operator_url: null,
      contact: null,
      signature: '0xdead',
      message: 'I claim',
      timestamp: '2026-05-13T10:00:00Z',
      nonce: 'deadbeef',
      verified: true,
      ofac_clean: true,
      claimed_at: '2026-05-13T10:00:01Z',
    };
    await putOperatorClaim(env, claim);
    const got = await getOperatorClaim(env, '0xabc');
    expect(got?.display_name).toBe('Agent X');
  });

  it('putBanRecord lowercases the target key', async () => {
    const env = makeEnv(makeKv());
    const ban: BanRecord = {
      target: '0xCAFE',
      reason: 'sock_puppet',
      evidence_url: null,
      banned_at: '2026-05-13T10:00:00Z',
      banned_by_admin: 'admin-1',
    };
    await putBanRecord(env, ban);
    expect((await getBanRecord(env, '0xCAFE'))?.reason).toBe('sock_puppet');
    expect((await getBanRecord(env, '0xcafe'))?.reason).toBe('sock_puppet');
  });

  it('deleteBanRecord removes the record', async () => {
    const env = makeEnv(makeKv());
    await putBanRecord(env, {
      target: '0xabc',
      reason: 'test',
      evidence_url: null,
      banned_at: '2026-05-13T10:00:00Z',
      banned_by_admin: 'admin',
    });
    await deleteBanRecord(env, '0xabc');
    expect(await getBanRecord(env, '0xabc')).toBeNull();
  });

  it('listBans returns every BanRecord under the prefix', async () => {
    const env = makeEnv(makeKv());
    await putBanRecord(env, {
      target: '0xaaa',
      reason: 'a',
      evidence_url: null,
      banned_at: '2026-05-13T10:00:00Z',
      banned_by_admin: 'x',
    });
    await putBanRecord(env, {
      target: 'tf_live_00000000',
      reason: 'b',
      evidence_url: null,
      banned_at: '2026-05-13T10:00:00Z',
      banned_by_admin: 'x',
    });
    const all = await listBans(env);
    expect(all.map((b) => b.target).sort()).toEqual(['0xaaa', 'tf_live_00000000']);
  });

  it('putPendingClaim + deletePendingClaim roundtrips', async () => {
    const env = makeEnv(makeKv());
    const claim: OperatorClaim = {
      wallet: '0xabc',
      display_name: 'Pending',
      operator_url: null,
      contact: null,
      signature: '0x',
      message: '',
      timestamp: '',
      nonce: '',
      verified: false,
      ofac_clean: true,
      claimed_at: '2026-05-13T10:00:00Z',
    };
    await putPendingClaim(env, claim);
    expect((await getPendingClaim(env, '0xabc'))?.display_name).toBe('Pending');
    await deletePendingClaim(env, '0xabc');
    expect(await getPendingClaim(env, '0xabc')).toBeNull();
  });

  it('putLeaderboard + getLeaderboard roundtrips', async () => {
    const env = makeEnv(makeKv());
    await putLeaderboard(env, 'composite', '24h', ['0xa', '0xb']);
    expect(await getLeaderboard(env, 'composite', '24h')).toEqual(['0xa', '0xb']);
  });

  it('putRollup + getRollup roundtrips', async () => {
    const env = makeEnv(makeKv());
    const rollup: ReputationRollup = {
      date: TODAY,
      generated_at: '2026-05-13T04:30:00Z',
      total_agents: 2,
      cohort_spend_cap: 100,
      leaderboards: {
        reliability: ['0xa', '0xb'],
        spend: ['0xb', '0xa'],
        activity: [],
        streak: [],
        composite: [],
      },
    };
    await putRollup(env, rollup);
    const got = await getRollup(env, TODAY);
    expect(got?.cohort_spend_cap).toBe(100);
  });

  it('putReputationDates caps the list', async () => {
    const env = makeEnv(makeKv());
    const dates = Array.from({ length: 500 }, (_, i) => `2026-${String(i).padStart(4, '0')}`);
    await putReputationDates(env, dates);
    const got = await getReputationDates(env);
    expect(got.length).toBe(365);
  });

  it('putReputationMeta roundtrips', async () => {
    const env = makeEnv(makeKv());
    const meta: ReputationMeta = {
      generated_at: '2026-05-13T04:30:00Z',
      total_agents: 250,
      last_refresh: '2026-05-13T04:30:00Z',
      version: 'v0.1',
    };
    await putReputationMeta(env, meta);
    expect((await getReputationMeta(env))?.total_agents).toBe(250);
  });

  it('putReputationCard writes both wallet and token indexes when both present', async () => {
    const env = makeEnv(makeKv());
    const card = {
      ok: true as const,
      wallet: '0xABCD',
      token_prefix: 'tf_live_18e54f47',
      display_name: null,
      operator_url: null,
      verified: false,
      ofac_clean: true,
      banned: false,
      ban_reason: null,
      trust_grade: 'C' as const,
      flags: [],
      first_seen: '2026-04-01T00:00:00Z',
      last_active: '2026-05-13T00:00:00Z',
      wallet_age_days: 42,
      metrics: {} as any,
      ranks: {} as any,
      attribution: {} as any,
    };
    await putReputationCard(env, card);
    expect((await getReputationCardByWallet(env, '0xabcd'))?.wallet).toBe('0xABCD');
    expect((await getReputationCardByToken(env, 'tf_live_18e54f47'))?.token_prefix).toBe(
      'tf_live_18e54f47',
    );
  });
});

describe('listAllPaidTokens', () => {
  it('returns every token under pay:credits:, sorted', async () => {
    const env = makeEnv(
      makeKv({
        'pay:credits:tf_live_aaaaaaaa11111111': { balance: 10 },
        'pay:credits:tf_live_bbbbbbbb22222222': { balance: 20 },
        'pay:usage:tf_live_aaaaaaaa11111111': { entries: [] },
        'unrelated:key': 'noise',
      }),
    );
    const tokens = await listAllPaidTokens(env);
    expect(tokens).toEqual(['tf_live_aaaaaaaa11111111', 'tf_live_bbbbbbbb22222222']);
  });
  it('paginates correctly when the list exceeds one page', async () => {
    const initial: Record<string, unknown> = {};
    for (let i = 0; i < 50; i++) {
      initial[`pay:credits:tf_live_${String(i).padStart(16, '0')}`] = { balance: i };
    }
    const env = makeEnv(makeKv(initial, 10));
    const tokens = await listAllPaidTokens(env);
    expect(tokens.length).toBe(50);
  });
});

describe('buildWalletToTokensIndex', () => {
  it('groups tokens by sender_wallet, ignoring pending records', async () => {
    const env = makeEnv(
      makeKv({
        'pay:tx:0xtx1': {
          amount_usd: 5,
          credits: 250,
          token: 'tf_live_aaa',
          created: '2026-05-01T10:00:00Z',
          sender_wallet: '0xWALLET1',
        },
        'pay:tx:0xtx2': {
          amount_usd: 5,
          credits: 250,
          token: 'tf_live_bbb',
          created: '2026-05-02T10:00:00Z',
          sender_wallet: '0xwallet1',
        },
        'pay:tx:0xtx3': {
          amount_usd: 5,
          credits: 250,
          token: 'tf_live_ccc',
          created: '2026-05-03T10:00:00Z',
          sender_wallet: '0xwallet2',
        },
        'pay:tx:0xtx4': {
          amount_usd: 0,
          credits: 0,
          token: '',
          created: '2026-05-04T10:00:00Z',
          pending: true,
        },
      }),
    );
    const index = await buildWalletToTokensIndex(env);
    expect(index.size).toBe(2);
    expect(Array.from(index.get('0xwallet1') ?? []).sort()).toEqual(['tf_live_aaa', 'tf_live_bbb']);
    expect(Array.from(index.get('0xwallet2') ?? [])).toEqual(['tf_live_ccc']);
  });

  it('skips records without sender_wallet or token', async () => {
    const env = makeEnv(
      makeKv({
        'pay:tx:0xtx1': {
          amount_usd: 5,
          credits: 250,
          token: 'tf_live_aaa',
          created: '2026-05-01T10:00:00Z',
        },
      }),
    );
    const index = await buildWalletToTokensIndex(env);
    expect(index.size).toBe(0);
  });
});

describe('aggregateFreeTrialCalls', () => {
  it('aggregates events per token_short across indexed dates', async () => {
    const env = makeEnv(
      makeKv({
        'pay:no-charge:index': ['2026-05-13', '2026-05-12'],
        'pay:no-charge:2026-05-13': {
          events: [
            { ts: '2026-05-13T10:00:00Z', endpoint: '/api/x', cost_skipped: 1, token_short: 'tf_live_aaaaaaaa...11111111' },
            { ts: '2026-05-13T11:00:00Z', endpoint: '/api/y', cost_skipped: 1, token_short: 'tf_live_aaaaaaaa...11111111' },
            { ts: '2026-05-13T12:00:00Z', endpoint: '/api/x', cost_skipped: 1, token_short: 'tf_live_bbbbbbbb...22222222' },
          ],
        },
        'pay:no-charge:2026-05-12': {
          events: [
            { ts: '2026-05-12T10:00:00Z', endpoint: '/api/x', cost_skipped: 1, token_short: 'tf_live_aaaaaaaa...11111111' },
          ],
        },
      }),
    );
    const map = await aggregateFreeTrialCalls(env, TODAY);
    expect(map.get('tf_live_aaaaaaaa...11111111')?.count).toBe(3);
    expect(map.get('tf_live_bbbbbbbb...22222222')?.count).toBe(1);
    expect(map.get('tf_live_aaaaaaaa...11111111')?.daily_30d['2026-05-13']).toBe(2);
    expect(map.get('tf_live_aaaaaaaa...11111111')?.daily_30d['2026-05-12']).toBe(1);
  });
  it('respects the daysBack window', async () => {
    const env = makeEnv(
      makeKv({
        'pay:no-charge:index': ['2026-05-13', '2026-04-01'],
        'pay:no-charge:2026-05-13': {
          events: [{ ts: '', endpoint: '', cost_skipped: 1, token_short: 'tf_live_aaa...zzz' }],
        },
        'pay:no-charge:2026-04-01': {
          events: [{ ts: '', endpoint: '', cost_skipped: 1, token_short: 'tf_live_aaa...zzz' }],
        },
      }),
    );
    const map = await aggregateFreeTrialCalls(env, TODAY, 7);
    expect(map.get('tf_live_aaa...zzz')?.count).toBe(1);
  });
  it('returns an empty map when no-charge index is empty', async () => {
    const env = makeEnv(makeKv());
    const map = await aggregateFreeTrialCalls(env, TODAY);
    expect(map.size).toBe(0);
  });
});

describe('assembleTelemetryForToken', () => {
  it('returns null when credits record is missing', async () => {
    const env = makeEnv(makeKv());
    const map = new Map();
    expect(await assembleTelemetryForToken(env, 'tf_live_zzz', map)).toBeNull();
  });

  it('happy path: assembles from credits + usage + free-trial map', async () => {
    const full = 'tf_live_abcdefghijklmnopqrstuvwx';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 100,
          created: '2026-04-13T00:00:00Z',
          last_used: '2026-05-13T12:00:00Z',
          agent_ua: 'TestAgent/1.0',
          total_purchased: 250,
        },
        [`pay:usage:${full}`]: {
          entries: [
            { endpoint: '/api/x', credits: 1, at: '2026-05-11T10:00:00Z' },
            { endpoint: '/api/x', credits: 1, at: '2026-05-12T10:00:00Z' },
            { endpoint: '/api/y', credits: 5, at: '2026-05-13T10:00:00Z' },
          ],
        },
      }),
    );
    const freeMap = new Map([
      [tokenShortFromFull(full), { count: 4, daily_30d: { '2026-05-10': 2, '2026-05-11': 2 } }],
    ]);
    const t = await assembleTelemetryForToken(env, full, freeMap);
    expect(t).not.toBeNull();
    expect(t!.token_prefix).toBe('tf_live_abcdefgh');
    expect(t!.wallet).toBeNull();
    expect(t!.first_seen).toBe('2026-04-13T00:00:00Z');
    expect(t!.last_active).toBe('2026-05-13T12:00:00Z');
    expect(t!.paid_calls).toBe(3);
    expect(t!.total_credits_spent).toBe(7);
    expect(t!.free_trial_calls).toBe(4);
    expect(t!.receipts_signed).toBe(3);
    expect(t!.endpoints_used).toEqual(['/api/x', '/api/y']);
    expect(t!.active_dates.length).toBeGreaterThanOrEqual(3);
    expect(t!.successful_calls).toBe(t!.paid_calls + t!.free_trial_calls);
    expect(t!.daily_spend_30d['2026-05-13']).toBe(5);
  });

  it('binds the wallet field when supplied', async () => {
    const full = 'tf_live_walletbound_aaaaaaaa11';
    const env = makeEnv(
      makeKv({
        [`pay:credits:${full}`]: {
          balance: 50,
          created: '2026-05-01T00:00:00Z',
          last_used: '2026-05-13T10:00:00Z',
          agent_ua: 'X',
          total_purchased: 100,
        },
      }),
    );
    const t = await assembleTelemetryForToken(env, full, new Map(), '0xWALLET');
    expect(t?.wallet).toBe('0xWALLET');
  });
});

describe('mergeTelemetryAcrossTokens', () => {
  const tel = (overrides: Partial<AgentTelemetry> = {}): AgentTelemetry => ({
    token_prefix: 'tf_live_x',
    wallet: null,
    first_seen: '2026-05-01T00:00:00Z',
    last_active: '2026-05-10T00:00:00Z',
    active_dates: [],
    endpoints_used: [],
    successful_calls: 0,
    errors_4xx: 0,
    errors_5xx: 0,
    paid_calls: 0,
    free_trial_calls: 0,
    receipts_signed: 0,
    total_credits_spent: 0,
    total_credits_purchased: 0,
    daily_spend_30d: {},
    ...overrides,
  });

  it('throws on empty input', () => {
    expect(() => mergeTelemetryAcrossTokens('0xabc', [])).toThrow();
  });

  it('takes the min first_seen and max last_active', () => {
    const merged = mergeTelemetryAcrossTokens('0xabc', [
      tel({ first_seen: '2026-05-10T00:00:00Z', last_active: '2026-05-11T00:00:00Z' }),
      tel({ first_seen: '2026-04-01T00:00:00Z', last_active: '2026-05-12T00:00:00Z' }),
    ]);
    expect(merged.first_seen).toBe('2026-04-01T00:00:00Z');
    expect(merged.last_active).toBe('2026-05-12T00:00:00Z');
  });

  it('unions active_dates and endpoints_used, deduplicates', () => {
    const merged = mergeTelemetryAcrossTokens('0xabc', [
      tel({ active_dates: ['2026-05-10', '2026-05-11'], endpoints_used: ['/api/a', '/api/b'] }),
      tel({ active_dates: ['2026-05-11', '2026-05-12'], endpoints_used: ['/api/b', '/api/c'] }),
    ]);
    expect(merged.active_dates).toEqual(['2026-05-10', '2026-05-11', '2026-05-12']);
    expect(merged.endpoints_used).toEqual(['/api/a', '/api/b', '/api/c']);
  });

  it('sums every counter', () => {
    const merged = mergeTelemetryAcrossTokens('0xabc', [
      tel({ paid_calls: 10, free_trial_calls: 5, total_credits_spent: 10, receipts_signed: 10 }),
      tel({ paid_calls: 20, free_trial_calls: 15, total_credits_spent: 25, receipts_signed: 20 }),
    ]);
    expect(merged.paid_calls).toBe(30);
    expect(merged.free_trial_calls).toBe(20);
    expect(merged.total_credits_spent).toBe(35);
    expect(merged.receipts_signed).toBe(30);
  });

  it('sums daily_spend_30d per date', () => {
    const merged = mergeTelemetryAcrossTokens('0xabc', [
      tel({ daily_spend_30d: { '2026-05-10': 5, '2026-05-11': 10 } }),
      tel({ daily_spend_30d: { '2026-05-10': 3, '2026-05-12': 7 } }),
    ]);
    expect(merged.daily_spend_30d).toEqual({
      '2026-05-10': 8,
      '2026-05-11': 10,
      '2026-05-12': 7,
    });
  });

  it('sets token_prefix to null and copies wallet from arg', () => {
    const merged = mergeTelemetryAcrossTokens('0xabc', [tel()]);
    expect(merged.token_prefix).toBeNull();
    expect(merged.wallet).toBe('0xabc');
  });
});
