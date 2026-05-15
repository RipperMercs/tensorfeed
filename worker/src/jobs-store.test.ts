import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIsolateMemoForTests } from './kill-switch';
import { assembleGigRecord, type GigSubmission } from './jobs';
import {
  putGig,
  getGig,
  listGigs,
  effectiveStatus,
  reserveNonce,
  setGigStatus,
  gigKey,
} from './jobs-store';
import type { Env } from './types';

// Minimal in-memory KV that mirrors the surface jobs-store touches.
class FakeKV {
  store = new Map<string, string>();
  async get(key: string, _type?: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async list({ prefix }: { prefix: string; cursor?: string }) {
    const keys = [...this.store.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((name) => ({ name }));
    return { keys, list_complete: true as const, cursor: undefined };
  }
}

function envWith(kv: FakeKV, killed = false): Env {
  return {
    TENSORFEED_CACHE: kv,
    ...(killed ? { KILL_SWITCH_KV_WRITES: 'true' } : {}),
  } as unknown as Env;
}

function gig(id: string, createdAt: number, over: Partial<GigSubmission> = {}) {
  const sub: GigSubmission = {
    title: over.title ?? `Gig ${id}`,
    body: over.body ?? 'Gather structured data.',
    category: over.category ?? 'research',
    budget_note: '5 USDC',
    poster_x402: 'https://example.com/api/quote',
    poster_addr: '0x' + 'a'.repeat(40),
    nonce: 'nonce-' + id,
    signed_at: createdAt,
    signature: '0xsig',
  };
  return assembleGigRecord(sub, createdAt, id);
}

beforeEach(() => {
  _resetIsolateMemoForTests();
});

describe('putGig / getGig', () => {
  it('round-trips a record', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    const rec = gig('a1', 1_778_000_000);
    expect(await putGig(env, rec)).toBe(true);
    expect(await getGig(env, 'a1')).toEqual(rec);
  });

  it('returns null for a missing record', async () => {
    expect(await getGig(envWith(new FakeKV()), 'nope')).toBeNull();
  });

  it('reads a corrupt record as absent, not a throw', async () => {
    const kv = new FakeKV();
    kv.store.set(gigKey('bad'), '{not json');
    expect(await getGig(envWith(kv), 'bad')).toBeNull();
  });
});

describe('listGigs', () => {
  it('returns active + unexpired, newest first, capped', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await putGig(env, gig('old', 1_000_000));
    await putGig(env, gig('new', 2_000_000));
    const expired = gig('exp', 100);
    await putGig(env, expired); // expires_at = 100 + 30d, far in the past vs now below
    const list = await listGigs(env, { now: 5_000_000_000, limit: 10 });
    // 'now' is well past every expires_at, so all read as expired.
    expect(list).toEqual([]);
    // now=3_000_000: 'exp' (created 100) is past its 30d TTL, 'old'
    // (1_000_000) and 'new' (2_000_000) are still inside theirs.
    const fresh = await listGigs(env, { now: 3_000_000, limit: 10 });
    expect(fresh.map((g) => g.id)).toEqual(['new', 'old']);
  });

  it('filters by exact category and case-insensitive q', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await putGig(env, gig('r1', 10, { category: 'research', title: 'Scrape PRICING tables' }));
    await putGig(env, gig('c1', 20, { category: 'coding', title: 'Refactor parser' }));
    const now = 30;
    expect((await listGigs(env, { now, limit: 10, category: 'coding' })).map((g) => g.id)).toEqual(['c1']);
    expect((await listGigs(env, { now, limit: 10, q: 'pricing' })).map((g) => g.id)).toEqual(['r1']);
  });

  it('respects the limit', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    for (let i = 0; i < 5; i++) await putGig(env, gig('g' + i, 100 + i));
    expect((await listGigs(env, { now: 200, limit: 2 })).length).toBe(2);
  });
});

describe('effectiveStatus', () => {
  it('reports an aged-out active gig as expired without a write', () => {
    const rec = gig('e', 1000);
    expect(effectiveStatus(rec, rec.expires_at - 1)).toBe('active');
    expect(effectiveStatus(rec, rec.expires_at)).toBe('expired');
  });
});

describe('reserveNonce', () => {
  it('allows once, blocks the replay', async () => {
    const env = envWith(new FakeKV());
    expect(await reserveNonce(env, 'n-1')).toBe(true);
    expect(await reserveNonce(env, 'n-1')).toBe(false);
  });
});

describe('setGigStatus', () => {
  it('removes with a reason and fails on a missing id', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await putGig(env, gig('s1', 100));
    expect(await setGigStatus(env, 's1', 'removed', 'tos_violation')).toBe(true);
    const rec = await getGig(env, 's1');
    expect(rec?.status).toBe('removed');
    expect(rec?.removed_reason).toBe('tos_violation');
    expect(await setGigStatus(env, 'ghost', 'removed', 'x')).toBe(false);
  });
});

describe('kill switch governs writes (fail-closed)', () => {
  it('blocks putGig and reserveNonce when KV writes are killed', async () => {
    const kv = new FakeKV();
    const killed = envWith(kv, true);
    expect(await putGig(killed, gig('k1', 100))).toBe(false);
    expect(await getGig(envWith(kv), 'k1')).toBeNull(); // nothing persisted
    expect(await reserveNonce(killed, 'k-nonce')).toBe(false);
  });
});
