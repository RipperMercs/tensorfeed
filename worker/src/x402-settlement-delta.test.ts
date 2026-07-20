/**
 * Delta cursor loop for /api/premium/x402-settlement-verdict (Task 2).
 *
 * Drives the REAL worker.fetch boundary (test-harness.ts) over a seeded x402
 * index: a fixed newest-settlement event in KV_KEY_RECENT (the delta gate
 * signal), a recent indexer cursor (so the 10-min freshness SLA does not
 * itself no-charge the call), and a day rollup + publisher registry so the
 * verdict computes over real data.
 *
 * Gate signal: the NEWEST SETTLEMENT timestamp from getRecent(env, 1), not the
 * index captured_at (which ticks every ~5 min) and not the windowed count
 * (which drifts as the trailing window slides). A same-window re-poll with a
 * fresh cursor and no new settlement must reach no_charge and serve the
 * headline verdict only, never the paid ranking/ecosystem.
 */
import { describe, expect, it } from 'vitest';
import { makeEnv, seedToken, call } from './test-harness';
import { KV_KEY_CURSOR, KV_KEY_RECENT, kvKeyDayRollup, kvKeyPubDayRollup, kvKeyPublisher } from './x402-index/constants';
import type { SettlementEvent, IndexerCursor, DailyRollup, PublisherDailyRollup, PublisherRecord } from './x402-index/types';
import type { Env } from './types';

// Unique per-call IP + token: the per-IP free-trial counters and per-token
// records are process-scoped, so uniqueness isolates each test (mirrors
// index.bill-on-empty.test.ts).
let seq = 0;
function uniqueIp(): string {
  seq += 1;
  return `198.51.100.${(seq % 250) + 1}`;
}
function uniqueToken(): string {
  seq += 1;
  return `tf_live_x402settle_${seq}`;
}

const PUBLISHER_DOMAIN = 'pub-a.com';

// FIXED across every call in a test, so a same-window re-poll genuinely
// reaches no_charge (the cap must not move between calls).
const FIXED_SETTLEMENT_TS = '2026-07-15T12:00:00.000Z';

function makeEvent(ts: string, txHash: string): SettlementEvent {
  return {
    tx_hash: txHash,
    block: 1000,
    ts,
    from_address: '0x1111111111111111111111111111111111111111',
    to_address: '0x2222222222222222222222222222222222222222',
    amount_usdc: '10.000000',
    publisher_domain: PUBLISHER_DOMAIN,
    asset: 'USDC',
    chain: 'base',
  };
}

/**
 * Seed the x402 index KV so computeX402SettlementVerdict(env, window) returns
 * a real (non-empty) verdict, and getRecent(env, 1) returns a stable newest
 * settlement ts for the delta gate.
 */
async function seedX402Index(env: Env): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Indexer cursor: recent last_run_at so the 10-min freshness SLA does not
  // itself trigger a stale-data no-charge on the charged-path tests.
  const recentRunAt = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const cursor: IndexerCursor = { block: 999, ts: recentRunAt, last_run_at: recentRunAt };
  await env.TENSORFEED_CACHE.put(KV_KEY_CURSOR, JSON.stringify(cursor));

  // Recent settlement feed (newest first): the delta gate signal.
  const event = makeEvent(FIXED_SETTLEMENT_TS, '0xaaaa000000000000000000000000000000000000000000000000000000000001');
  await env.TENSORFEED_CACHE.put(KV_KEY_RECENT, JSON.stringify([event]));

  // Day rollup + publisher registry so getSummary/getLeaderboard return real
  // (non-empty) data and the verdict's ranking is populated.
  const dayRollup: DailyRollup = {
    date: today,
    volume_usdc: '10.000000',
    count: 1,
    top_publishers: [{ domain: PUBLISHER_DOMAIN, volume_usdc: '10.000000', count: 1 }],
  };
  await env.TENSORFEED_CACHE.put(kvKeyDayRollup(today), JSON.stringify(dayRollup));

  const pubRecord: PublisherRecord = {
    domain: PUBLISHER_DOMAIN,
    manifest_url: `https://${PUBLISHER_DOMAIN}/.well-known/x402.json`,
    pay_to_wallets: ['0x2222222222222222222222222222222222222222'],
    first_seen: recentRunAt,
    last_crawled: recentRunAt,
    last_crawl_error: null,
    last_event_at: FIXED_SETTLEMENT_TS,
  };
  await env.TENSORFEED_CACHE.put(kvKeyPublisher(PUBLISHER_DOMAIN), JSON.stringify(pubRecord));

  const pubDayRollup: PublisherDailyRollup = {
    date: today,
    domain: PUBLISHER_DOMAIN,
    volume_usdc: '10.000000',
    count: 1,
  };
  await env.TENSORFEED_CACHE.put(kvKeyPubDayRollup(PUBLISHER_DOMAIN, today), JSON.stringify(pubDayRollup));
}

/** Prepend a settlement with a LATER ts, so it becomes the new newest event. */
async function seedNewerSettlement(env: Env): Promise<void> {
  const raw = (await env.TENSORFEED_CACHE.get(KV_KEY_RECENT, 'json')) as SettlementEvent[] | null;
  const laterTs = new Date(Date.parse(FIXED_SETTLEMENT_TS) + 60 * 1000).toISOString();
  const newer = makeEvent(laterTs, '0xbbbb000000000000000000000000000000000000000000000000000000000002');
  await env.TENSORFEED_CACHE.put(KV_KEY_RECENT, JSON.stringify([newer, ...(raw ?? [])]));
}

async function setup(): Promise<{ env: Env; token: string }> {
  const env = await makeEnv();
  await seedX402Index(env);
  const token = uniqueToken();
  await seedToken(env, token, 100);
  return { env, token };
}

interface CallVerdictOptions {
  window?: '24h' | '7d' | '30d';
  since?: string;
  token: string;
}

async function callVerdict(env: Env, opts: CallVerdictOptions) {
  const params = new URLSearchParams();
  if (opts.window) params.set('window', opts.window);
  if (opts.since) params.set('since', opts.since);
  const qs = params.toString();
  const path = `/api/premium/x402-settlement-verdict${qs ? `?${qs}` : ''}`;
  return call(env, path, { token: opts.token, ip: uniqueIp() });
}

describe('x402-settlement delta cursor', () => {
  it('first paid call returns the full verdict plus a cursor and charges 1', async () => {
    const { env, token } = await setup();
    const res = await callVerdict(env, { window: '7d', token });
    const json = res.json as Record<string, unknown>;

    expect(json.cursor).toBeTruthy();
    const continuation = json.continuation as Record<string, unknown>;
    expect(continuation.method).toBe('GET');
    expect(json.ranking).toBeDefined(); // full content on the charged path
    const billing = json.billing as Record<string, unknown>;
    expect(billing.credits_charged).toBe(1);
  });

  it('re-poll with the fresh cursor and no new settlement is free, headline only', async () => {
    const { env, token } = await setup();
    const first = (await callVerdict(env, { window: '7d', token })).json as Record<string, unknown>;
    const firstBilling = first.billing as Record<string, unknown>;
    const balAfterFirst = firstBilling.credits_remaining as number;

    const second = await callVerdict(env, { window: '7d', since: first.cursor as string, token });
    const json = second.json as Record<string, unknown>;
    const billing = json.billing as Record<string, unknown>;

    expect(json.changed).toBe(false);
    expect(billing.credits_charged).toBe(0);
    expect(billing.no_charge_reason).toBe('no_new_since_cursor');
    expect(json.verdict).toBeTruthy(); // headline verdict present (== free preview)
    expect(json.ranking).toBeUndefined(); // SECURITY: paid content withheld
    expect(json.ecosystem).toBeUndefined();
    expect(billing.credits_remaining).toBe(balAfterFirst); // held, unchanged
  });

  it('a different window with the prior cursor charges full (key mismatch)', async () => {
    const { env, token } = await setup();
    const first = (await callVerdict(env, { window: '7d', token })).json as Record<string, unknown>;

    const second = await callVerdict(env, { window: '24h', since: first.cursor as string, token });
    const json = second.json as Record<string, unknown>;
    const billing = json.billing as Record<string, unknown>;

    expect(billing.credits_charged).toBe(1);
    expect(json.changed).toBeUndefined();
  });

  it('a new settlement after the cursor charges full', async () => {
    const { env, token } = await setup();
    const first = (await callVerdict(env, { window: '7d', token })).json as Record<string, unknown>;

    await seedNewerSettlement(env);

    const second = await callVerdict(env, { window: '7d', since: first.cursor as string, token });
    const json = second.json as Record<string, unknown>;
    const billing = json.billing as Record<string, unknown>;

    expect(billing.credits_charged).toBe(1);
    expect(json.ranking).toBeDefined();
  });

  it('a garbage cursor charges full', async () => {
    const { env, token } = await setup();
    const res = await callVerdict(env, { window: '7d', since: 'garbage', token });
    const json = res.json as Record<string, unknown>;
    const billing = json.billing as Record<string, unknown>;

    expect(billing.credits_charged).toBe(1);
  });
});
