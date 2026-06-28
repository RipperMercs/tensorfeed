import { describe, it, expect } from 'vitest';
import { PaymentClaim, CLAIM_PENDING_TTL_MS } from './payment-claim';
import type { Env } from './types';

// Mock DurableObjectState (same shape as credit-ledger.test.ts). Cloudflare's
// runtime serializes access to a single DO instance; that serialization is what
// makes the production code race-safe. These tests verify the state-machine
// logic under that single-threaded assumption.
interface MockStorage {
  data: Map<string, unknown>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(keyOrObj: string | Record<string, unknown>, value?: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}

function makeMockState(): { storage: MockStorage } {
  const data = new Map<string, unknown>();
  return {
    storage: {
      data,
      async get<T>(key: string) {
        return data.get(key) as T | undefined;
      },
      async put(keyOrObj: string | Record<string, unknown>, value?: unknown) {
        if (typeof keyOrObj === 'string') data.set(keyOrObj, value);
        else for (const [k, v] of Object.entries(keyOrObj)) data.set(k, v);
      },
      async delete(key: string) {
        return data.delete(key);
      },
    },
  };
}

function makeClaim(): PaymentClaim {
  return new PaymentClaim(makeMockState() as unknown as DurableObjectState, {} as Env);
}

const KEY = 'idem-abc';
const T0 = 1_000_000;

describe('PaymentClaim DO', () => {
  it('the first claim on a fresh key wins', async () => {
    const pc = makeClaim();
    const r = await pc.claim(KEY, T0);
    expect(r.status).toBe('won');
  });

  it('a second claim while the first is pending and fresh is in_flight', async () => {
    const pc = makeClaim();
    await pc.claim(KEY, T0);
    const r = await pc.claim(KEY, T0 + 5_000);
    expect(r.status).toBe('in_flight');
  });

  it('after commit, a later claim returns done with the original token', async () => {
    const pc = makeClaim();
    await pc.claim(KEY, T0);
    await pc.commit(KEY, 'tf_live_token123', T0 + 1_000, 'sig-xyz', 'buyerPubkey');
    const r = await pc.claim(KEY, T0 + 2_000);
    expect(r.status).toBe('done');
    expect(r.token).toBe('tf_live_token123');
  });

  it('a stale pending claim past the TTL can be re-won (crash backstop)', async () => {
    const pc = makeClaim();
    await pc.claim(KEY, T0);
    const r = await pc.claim(KEY, T0 + CLAIM_PENDING_TTL_MS + 1);
    expect(r.status).toBe('won');
  });

  it('release clears a pending claim so a genuine retry wins again', async () => {
    const pc = makeClaim();
    await pc.claim(KEY, T0);
    await pc.release(KEY);
    const r = await pc.claim(KEY, T0 + 1_000);
    expect(r.status).toBe('won');
  });

  it('release does NOT clear a committed claim (no double-mint window)', async () => {
    const pc = makeClaim();
    await pc.claim(KEY, T0);
    await pc.commit(KEY, 'tf_live_keepme', T0 + 1_000);
    await pc.release(KEY);
    const r = await pc.claim(KEY, T0 + 2_000);
    expect(r.status).toBe('done');
    expect(r.token).toBe('tf_live_keepme');
  });
});
