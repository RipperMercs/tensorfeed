import { describe, it, expect } from 'vitest';
import { checkAndMarkFirstPayment, markWalletSeen } from './payments';
import type { Env } from './types';

// ── Mock KV ────────────────────────────────────────────────────────

interface MockKVOptions {
  /** If set, every get() returns the supplied value(s), advancing
   *  through the array on each call. Lets a single test simulate
   *  read-write-read where the second read sees a different value. */
  readQueue?: (string | null)[];
}

function makeMockEnv(opts: MockKVOptions = {}): Env {
  const store = new Map<string, string>();
  const readQueue = opts.readQueue ? [...opts.readQueue] : null;
  const cache = {
    get: async (_key: string, _format?: string) => {
      if (readQueue && readQueue.length > 0) {
        const v = readQueue.shift();
        return v ?? null;
      }
      const v = store.get(_key);
      return v ?? null;
    },
    put: async (key: string, value: string, _opts?: unknown) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  };
  // Cast through unknown to satisfy KVNamespace shape; tests only touch get/put/delete.
  return { TENSORFEED_CACHE: cache as unknown as KVNamespace } as Env;
}

// ── parseWalletSeen behavior is indirect via checkAndMarkFirstPayment ──

describe('checkAndMarkFirstPayment', () => {
  const WALLET = '0xabcdef1234567890abcdef1234567890abcdef12';

  it('returns isFirstPayment=false when wallet undefined', async () => {
    const env = makeMockEnv();
    const r = await checkAndMarkFirstPayment(env, undefined);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('grants bonus on a clean wallet (no prior marker)', async () => {
    const env = makeMockEnv();
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(true);
    expect(r.bonusCredits).toBe(50);
  });

  it('rejects bonus when a committed marker exists', async () => {
    const env = makeMockEnv();
    // Pre-populate as a committed wallet
    await env.TENSORFEED_CACHE.put(
      `pay:wallet-seen:${WALLET.toLowerCase()}`,
      JSON.stringify({ committed: true, at: '2026-05-01T00:00:00Z' }),
    );
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('rejects bonus on a legacy plain-string marker (backward compat)', async () => {
    const env = makeMockEnv();
    // Legacy in-prod shape: a plain ISO date string (not JSON object)
    await env.TENSORFEED_CACHE.put(
      `pay:wallet-seen:${WALLET.toLowerCase()}`,
      '2026-05-09T19:40:38.135Z',
    );
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('rejects bonus on a legacy JSON-string marker', async () => {
    const env = makeMockEnv();
    // Slightly different legacy: a JSON-encoded date string (parses to a string, not object)
    await env.TENSORFEED_CACHE.put(
      `pay:wallet-seen:${WALLET.toLowerCase()}`,
      JSON.stringify('2026-05-09T19:40:38.135Z'),
    );
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('lowercases the wallet address for the key', async () => {
    const env = makeMockEnv();
    // Pre-populate with the lowercased form
    const lower = WALLET.toLowerCase();
    await env.TENSORFEED_CACHE.put(
      `pay:wallet-seen:${lower}`,
      JSON.stringify({ committed: true, at: '2026-05-01T00:00:00Z' }),
    );
    // Query with the original (mixed-case for some wallets) form
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
  });

  // ── Race-safety: the core of the fix ──────────────────────────────

  it('race-safe: when re-read returns another stake, returns isFirstPayment=false', async () => {
    // Simulate the race: our get() returns null (clean), our put() writes
    // our stake, but the re-read sees ANOTHER request's stake (because
    // last-write-wins in KV gave the other request the final write).
    // The mock readQueue lets us inject this exact sequence: first
    // read = null (initial), second read = another stake.
    const env = makeMockEnv({
      readQueue: [
        null,                                                       // initial: no prior marker
        JSON.stringify({ pending: 'OTHER-REQUEST-ID', at: 'T0' }),  // re-read: other request won the race
      ],
    });
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('race-safe: when re-read returns committed, returns isFirstPayment=false', async () => {
    // Even rarer race: the other request not only won the stake but
    // committed before our re-read landed.
    const env = makeMockEnv({
      readQueue: [
        null,
        JSON.stringify({ committed: true, at: 'T1' }),
      ],
    });
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
  });

  it('race-safe: when initial read sees pending from another request, still stakes and rechecks', async () => {
    // If our initial read sees another request's pending stake (mid-race),
    // we still try to stake. The re-read decides. In this fixture, the
    // re-read still shows the other request's stake (they won).
    const env = makeMockEnv({
      readQueue: [
        JSON.stringify({ pending: 'OTHER', at: 'T0' }),
        JSON.stringify({ pending: 'OTHER', at: 'T0' }),
      ],
    });
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(false);
  });

  it('happy path: single caller stake survives re-read because the mock returns the put value back', async () => {
    // Without a readQueue override, the mock returns whatever was last put().
    // Single-caller flow:
    //   read -> null
    //   put({ pending: OUR_ID })
    //   read -> { pending: OUR_ID }
    // Returns first=true.
    const env = makeMockEnv();
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(true);
    expect(r.bonusCredits).toBe(50);
  });
});

// ── markWalletSeen ──────────────────────────────────────────────────

describe('markWalletSeen', () => {
  const WALLET = '0xABCDEF1234567890abcdef1234567890abcdef12';

  it('writes the committed shape', async () => {
    const env = makeMockEnv();
    await markWalletSeen(env, WALLET);
    const raw = await env.TENSORFEED_CACHE.get(`pay:wallet-seen:${WALLET.toLowerCase()}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.committed).toBe(true);
    expect(typeof parsed.at).toBe('string');
  });

  it('overwrites any prior pending stake', async () => {
    const env = makeMockEnv();
    await env.TENSORFEED_CACHE.put(
      `pay:wallet-seen:${WALLET.toLowerCase()}`,
      JSON.stringify({ pending: 'OTHER-REQUEST-ID', at: 'T0' }),
    );
    await markWalletSeen(env, WALLET);
    const raw = await env.TENSORFEED_CACHE.get(`pay:wallet-seen:${WALLET.toLowerCase()}`);
    const parsed = JSON.parse(raw!);
    expect(parsed.committed).toBe(true);
    expect(parsed.pending).toBeUndefined();
  });

  it('idempotent on re-call', async () => {
    const env = makeMockEnv();
    await markWalletSeen(env, WALLET);
    await markWalletSeen(env, WALLET);
    const raw = await env.TENSORFEED_CACHE.get(`pay:wallet-seen:${WALLET.toLowerCase()}`);
    const parsed = JSON.parse(raw!);
    expect(parsed.committed).toBe(true);
  });
});

// ── End-to-end: stake then mark sequence ─────────────────────────────

describe('stake then mark end-to-end', () => {
  const WALLET = '0xdef0123456789abcdef0123456789abcdef01234';

  it('winning request: stake survives, mint occurs, markWalletSeen finalizes', async () => {
    const env = makeMockEnv();
    // Stake-and-recheck succeeds (single caller, mock returns last put)
    const r = await checkAndMarkFirstPayment(env, WALLET);
    expect(r.isFirstPayment).toBe(true);
    // Caller mints bonus (not tested here), then commits the marker
    await markWalletSeen(env, WALLET);
    // Next caller against same wallet must NOT get the bonus
    const r2 = await checkAndMarkFirstPayment(env, WALLET);
    expect(r2.isFirstPayment).toBe(false);
  });
});
