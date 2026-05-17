/**
 * Tests for the agent-subscribable event-stream log (stream.ts).
 *
 * Pure-logic, no network. Covers monotonic seq, ring trim, TTL, the
 * best-effort guarantee (must never throw into a cron cycle), cursor +
 * type + free/full read semantics, and types-CSV parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  appendStreamEvents,
  readStreamEvents,
  parseStreamTypes,
  STREAM_FREE_TAIL_MAX,
} from './stream';
import type { Env } from './types';

interface PutOpts { expirationTtl?: number }

function makeEnv(): { env: Env; lastPutOpts: () => PutOpts | undefined } {
  const store = new Map<string, unknown>();
  let lastOpts: PutOpts | undefined;
  const kv = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string, opts?: PutOpts) => {
      lastOpts = opts;
      store.set(key, JSON.parse(value));
    },
  };
  const env = { TENSORFEED_CACHE: kv } as unknown as Env;
  return { env, lastPutOpts: () => lastOpts };
}

/** A KV whose put always throws, to prove append is best-effort. */
function makeThrowingEnv(): Env {
  const kv = {
    get: async () => null,
    put: async () => {
      throw new Error('kv exploded');
    },
  };
  return { TENSORFEED_CACHE: kv } as unknown as Env;
}

describe('appendStreamEvents', () => {
  it('assigns monotonic gap-free seq across calls and types', async () => {
    const { env } = makeEnv();
    await appendStreamEvents(env, 'price', [{ a: 1 }, { a: 2 }]);
    await appendStreamEvents(env, 'status', [{ b: 1 }]);
    const r = await readStreamEvents(env, { full: true });
    expect(r.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(r.events.map((e) => e.type)).toEqual(['price', 'price', 'status']);
    expect(r.latest_cursor).toBe(3);
  });

  it('is a no-op (no write) on empty input', async () => {
    const { env, lastPutOpts } = makeEnv();
    await appendStreamEvents(env, 'price', []);
    expect(lastPutOpts()).toBeUndefined();
    const r = await readStreamEvents(env, { full: true });
    expect(r.events).toHaveLength(0);
    expect(r.latest_cursor).toBe(0);
  });

  it('passes a ~25h TTL on every write', async () => {
    const { env, lastPutOpts } = makeEnv();
    await appendStreamEvents(env, 'macro', [{ x: 1 }]);
    expect(lastPutOpts()?.expirationTtl).toBe(25 * 60 * 60);
  });

  it('trims to the newest 500 and keeps seq monotonic', async () => {
    const { env } = makeEnv();
    const batch = Array.from({ length: 600 }, (_, i) => ({ i }));
    await appendStreamEvents(env, 'price', batch);
    const r = await readStreamEvents(env, { full: true });
    expect(r.events).toHaveLength(500);
    expect(r.events[0].seq).toBe(101); // 1..600, kept 101..600
    expect(r.events[r.events.length - 1].seq).toBe(600);
    expect(r.latest_cursor).toBe(600);
  });

  it('never throws into the caller even if KV fails', async () => {
    const env = makeThrowingEnv();
    await expect(
      appendStreamEvents(env, 'digest', [{ d: 1 }]),
    ).resolves.toBeUndefined();
  });
});

describe('readStreamEvents', () => {
  async function seeded() {
    const { env } = makeEnv();
    await appendStreamEvents(env, 'price', [{ p: 1 }]); // seq 1
    await appendStreamEvents(env, 'status', [{ s: 1 }]); // seq 2
    await appendStreamEvents(env, 'price', [{ p: 2 }]); // seq 3
    return env;
  }

  it('returns only events strictly after the cursor', async () => {
    const env = await seeded();
    const r = await readStreamEvents(env, { since: 1, full: true });
    expect(r.events.map((e) => e.seq)).toEqual([2, 3]);
    expect(r.next_cursor).toBe(3);
  });

  it('filters by type', async () => {
    const env = await seeded();
    const r = await readStreamEvents(env, { types: ['price'], full: true });
    expect(r.events.map((e) => e.seq)).toEqual([1, 3]);
  });

  it('does not rewind the cursor when nothing matched', async () => {
    const env = await seeded();
    const r = await readStreamEvents(env, { since: 3, full: true });
    expect(r.events).toHaveLength(0);
    expect(r.next_cursor).toBe(3);
    expect(r.latest_cursor).toBe(3);
  });

  it('caps the free tail and full returns more than the tail', async () => {
    const { env } = makeEnv();
    await appendStreamEvents(
      env,
      'price',
      Array.from({ length: 40 }, (_, i) => ({ i })),
    );
    const free = await readStreamEvents(env);
    expect(free.events).toHaveLength(STREAM_FREE_TAIL_MAX);
    expect(free.events[free.events.length - 1].seq).toBe(40); // newest tail
    const full = await readStreamEvents(env, { full: true });
    expect(full.events).toHaveLength(40);
  });

  it('clamps an oversized free limit to the max', async () => {
    const { env } = makeEnv();
    await appendStreamEvents(
      env,
      'price',
      Array.from({ length: 40 }, (_, i) => ({ i })),
    );
    const r = await readStreamEvents(env, { limit: 1000 });
    expect(r.events).toHaveLength(STREAM_FREE_TAIL_MAX);
  });
});

describe('parseStreamTypes', () => {
  it('parses a valid csv', () => {
    expect(parseStreamTypes('price,status')).toEqual(['price', 'status']);
  });
  it('drops invalid tokens', () => {
    expect(parseStreamTypes('price,bogus, macro ')).toEqual(['price', 'macro']);
  });
  it('returns undefined for absent or all-invalid input', () => {
    expect(parseStreamTypes(null)).toBeUndefined();
    expect(parseStreamTypes('')).toBeUndefined();
    expect(parseStreamTypes('nope,zzz')).toBeUndefined();
  });
});
