import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VERIFY_HIREABLE_PRICE_USD,
  VH_TX_KEY_PREFIX,
  confirmVerifyHireable,
  issueVerifyHireableQuote,
} from './agent-directory-charge';
import {
  CLAIM_KEY_PREFIX,
  putOperatorClaim,
  type OperatorClaim,
} from './agent-reputation-store';

const SENDER_WALLET = '0x1111111111111111111111111111111111111111';
const OUR_PAYMENT_WALLET = '0x0000000000000000000000000000000000aaaaaa';
const TX_HASH = '0x' + 'a'.repeat(64);
const NOW = Date.parse('2026-05-13T20:00:00.000Z');

// ── Fake KV ──
function makeKv() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string, type?: 'json' | 'text') {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string, _opts?: any) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) {
      const all = Array.from(store.keys()).filter((k) => k.startsWith(prefix)).sort();
      const startIdx = cursor ? all.indexOf(cursor) + 1 : 0;
      const page = all.slice(startIdx, startIdx + 1000);
      return {
        keys: page.map((name) => ({ name })),
        list_complete: startIdx + 1000 >= all.length,
        cursor: undefined,
      };
    },
  };
}

function makeEnv(opts: { skipClaim?: boolean } = {}) {
  const kv = makeKv();
  const env = {
    TENSORFEED_CACHE: kv,
    PAYMENT_WALLET: OUR_PAYMENT_WALLET,
    CHAINALYSIS_API_KEY: 'test-key',
    BASE_RPC_URL: 'https://base.test/rpc',
  } as any;
  if (!opts.skipClaim) {
    const claim: OperatorClaim = {
      wallet: SENDER_WALLET,
      display_name: 'Test Op',
      operator_url: null,
      contact: null,
      signature: '0xsig',
      message: 'msg',
      timestamp: '2026-05-13T19:00:00.000Z',
      nonce: 'origN',
      verified: true,
      ofac_clean: true,
      claimed_at: '2026-05-13T19:00:00.000Z',
    };
    kv.store.set(CLAIM_KEY_PREFIX + SENDER_WALLET.toLowerCase(), JSON.stringify(claim));
  }
  return { kv, env };
}

/**
 * Stub fetch to mock:
 *  - Base RPC eth_getTransactionReceipt
 *  - Chainalysis public sanctions API
 *
 * Routes by URL pattern. Both can be configured independently.
 */
function setupFetch(opts: {
  rpcOk?: boolean;
  rpcSender?: string;
  rpcAmountBaseUnits?: number;
  rpcStatus?: '0x1' | '0x0';
  rpcThrows?: boolean;
  rpcNoTransfer?: boolean;
  chainalysisStatus?: number;
  chainalysisSanctioned?: boolean;
  chainalysisThrows?: boolean;
} = {}) {
  const fetchSpy = vi.fn(async (urlOrReq: any, _init?: any) => {
    const url = typeof urlOrReq === 'string' ? urlOrReq : urlOrReq.url;
    if (url.includes('base.test/rpc')) {
      if (opts.rpcThrows) throw new Error('rpc network failure');
      const sender = opts.rpcSender ?? SENDER_WALLET;
      const amountBase = opts.rpcAmountBaseUnits ?? 5_000_000; // $5
      // Build a fake transfer log to our PAYMENT_WALLET (or omit if no transfer)
      const logs = opts.rpcNoTransfer
        ? []
        : [
            {
              address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC base
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x000000000000000000000000' + sender.slice(2).toLowerCase(),
                '0x000000000000000000000000' + OUR_PAYMENT_WALLET.slice(2).toLowerCase(),
              ],
              data: '0x' + amountBase.toString(16).padStart(64, '0'),
            },
          ];
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            status: opts.rpcStatus ?? '0x1',
            blockNumber: '0x1c8b9d',
            logs,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('chainalysis.com')) {
      if (opts.chainalysisThrows) throw new Error('chainalysis network failure');
      if ((opts.chainalysisStatus ?? 200) !== 200) {
        return new Response('', { status: opts.chainalysisStatus });
      }
      return new Response(
        JSON.stringify({
          identifications: opts.chainalysisSanctioned ? [{ category: 'sanctions' }] : [],
        }),
        { status: 200 },
      );
    }
    return new Response('not stubbed: ' + url, { status: 500 });
  });
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  setupFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ issueVerifyHireableQuote                                         │
// └──────────────────────────────────────────────────────────────────┘

describe('issueVerifyHireableQuote', () => {
  it('returns a quote bound to PAYMENT_WALLET when claim exists', async () => {
    const { env } = makeEnv();
    const r = await issueVerifyHireableQuote(env, SENDER_WALLET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.amount_usd).toBe(VERIFY_HIREABLE_PRICE_USD);
      expect(r.amount_usd).toBe(5);
      expect(r.wallet).toBe(OUR_PAYMENT_WALLET);
      expect(r.duration_days).toBe(30);
      expect(r.memo).toContain('Verified Hireable');
      expect(r.nonce.length).toBeGreaterThan(0);
    }
  });

  it('rejects an invalid sender wallet', async () => {
    const { env } = makeEnv();
    const r = await issueVerifyHireableQuote(env, 'not-a-wallet');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_sender_wallet');
  });

  it('rejects when no operator claim exists for the wallet', async () => {
    const { env } = makeEnv({ skipClaim: true });
    const r = await issueVerifyHireableQuote(env, SENDER_WALLET);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_operator_claim');
      expect(r.status).toBe(404);
    }
  });

  it('errors when PAYMENT_WALLET is not configured', async () => {
    const { env } = makeEnv();
    env.PAYMENT_WALLET = '';
    const r = await issueVerifyHireableQuote(env, SENDER_WALLET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('payments_disabled');
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ confirmVerifyHireable                                            │
// └──────────────────────────────────────────────────────────────────┘

async function newQuote(env: any) {
  const r = await issueVerifyHireableQuote(env, SENDER_WALLET);
  if (!r.ok) throw new Error('quote setup failed');
  return r.nonce;
}

describe('confirmVerifyHireable: input validation', () => {
  it('rejects invalid nonce', async () => {
    const { env } = makeEnv();
    const r = await confirmVerifyHireable(env, {
      nonce: 'short',
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_nonce');
  });

  it('rejects malformed txHash', async () => {
    const { env } = makeEnv();
    const r = await confirmVerifyHireable(env, {
      nonce: 'a'.repeat(32),
      txHash: 'not-hex',
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_tx_hash');
  });

  it('rejects invalid sender_wallet', async () => {
    const { env } = makeEnv();
    const r = await confirmVerifyHireable(env, {
      nonce: 'a'.repeat(32),
      txHash: TX_HASH,
      sender_wallet: 'not-a-wallet',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_sender_wallet');
  });
});

describe('confirmVerifyHireable: replay + quote checks', () => {
  it('rejects when txHash is in flight (claim-intent placeholder present)', async () => {
    const { env, kv } = makeEnv();
    kv.store.set(
      VH_TX_KEY_PREFIX + TX_HASH,
      JSON.stringify({ amount_usd: 0, pending: true, sender_wallet: SENDER_WALLET.toLowerCase() }),
    );
    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('tx_in_flight');
      expect(r.status).toBe(409);
    }
  });

  it('rejects when txHash was already used', async () => {
    const { env, kv } = makeEnv();
    kv.store.set(VH_TX_KEY_PREFIX + TX_HASH, JSON.stringify({ amount_usd: 5 }));
    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('tx_already_used');
      expect(r.status).toBe(409);
    }
  });

  it('rejects when quote nonce was never issued', async () => {
    const { env } = makeEnv();
    const r = await confirmVerifyHireable(env, {
      nonce: 'b'.repeat(32),
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('quote_not_found_or_expired');
  });

  it('rejects when sender_wallet does not match the quote', async () => {
    const { env } = makeEnv();
    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: '0x2222222222222222222222222222222222222222',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('sender_wallet_mismatch');
  });
});

describe('confirmVerifyHireable: on-chain verification', () => {
  it('rejects when the tx is not found on-chain', async () => {
    const { env } = makeEnv();
    const nonce = await newQuote(env);
    setupFetch({ rpcNoTransfer: true });
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('chain_verification_failed');
  });

  it('rejects when the on-chain sender does not match (Tx-Sniper guard)', async () => {
    const { env } = makeEnv();
    const nonce = await newQuote(env);
    setupFetch({ rpcSender: '0x9999999999999999999999999999999999999999' });
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('chain_sender_mismatch');
  });

  it('rejects when on-chain amount does not match the quote', async () => {
    const { env } = makeEnv();
    const nonce = await newQuote(env);
    setupFetch({ rpcAmountBaseUnits: 1_000_000 }); // sent $1 instead of $5
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('amount_mismatch');
  });
});

describe('confirmVerifyHireable: OFAC re-screen', () => {
  it('bans + rejects when Chainalysis flags the wallet at renewal', async () => {
    const { env, kv } = makeEnv();
    const nonce = await newQuote(env);
    setupFetch({ chainalysisSanctioned: true });
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('wallet_sanctioned');
      expect(r.status).toBe(403);
    }
    // Ban record written
    expect(kv.store.has('agent-rep:ban:' + SENDER_WALLET.toLowerCase())).toBe(true);
  });

  it('fail-closes when Chainalysis is unreachable', async () => {
    const { env } = makeEnv();
    const nonce = await newQuote(env);
    setupFetch({ chainalysisStatus: 500 });
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('ofac_oracle_unreachable');
      expect(r.status).toBe(503);
    }
  });
});

describe('confirmVerifyHireable: happy path + renewal extension', () => {
  it('grants 30 days from now on first verify-hireable charge', async () => {
    const { env, kv } = makeEnv();
    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expectedMs = NOW + 30 * 24 * 60 * 60 * 1000;
      expect(Date.parse(r.verified_hireable_until)).toBe(expectedMs);
      expect(r.previous_verified_hireable_until).toBeNull();
      expect(r.renewal_count).toBe(1);
      expect(r.total_paid_usd).toBe(5);
      expect(r.tx_amount_usd).toBe(5);
    }
    // The vh-tx record was written for replay protection
    expect(kv.store.has(VH_TX_KEY_PREFIX + TX_HASH)).toBe(true);
    // The original quote was burned
    expect(kv.store.has(`pay:quote:${nonce}`)).toBe(false);
  });

  it('extends from the EXISTING expiry on an early renewal (no lost time)', async () => {
    const { env, kv } = makeEnv();
    // Plant an existing verified_hireable_until 10 days in the future
    const futureUntil = new Date(NOW + 10 * 24 * 60 * 60 * 1000).toISOString();
    const existingClaim: OperatorClaim = JSON.parse(
      kv.store.get(CLAIM_KEY_PREFIX + SENDER_WALLET.toLowerCase()) as string,
    );
    existingClaim.verified_hireable_until = futureUntil;
    existingClaim.verified_hireable_renewal_count = 1;
    existingClaim.verified_hireable_total_paid_usd = 5;
    await putOperatorClaim(env, existingClaim);

    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expectedMs = Date.parse(futureUntil) + 30 * 24 * 60 * 60 * 1000;
      expect(Date.parse(r.verified_hireable_until)).toBe(expectedMs);
      expect(r.previous_verified_hireable_until).toBe(futureUntil);
      expect(r.renewal_count).toBe(2);
      expect(r.total_paid_usd).toBe(10);
    }
  });

  it('starts fresh from now when the existing expiry is in the past', async () => {
    const { env, kv } = makeEnv();
    const pastUntil = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
    const existingClaim: OperatorClaim = JSON.parse(
      kv.store.get(CLAIM_KEY_PREFIX + SENDER_WALLET.toLowerCase()) as string,
    );
    existingClaim.verified_hireable_until = pastUntil;
    existingClaim.verified_hireable_renewal_count = 3;
    existingClaim.verified_hireable_total_paid_usd = 15;
    await putOperatorClaim(env, existingClaim);

    const nonce = await newQuote(env);
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const expectedMs = NOW + 30 * 24 * 60 * 60 * 1000;
      expect(Date.parse(r.verified_hireable_until)).toBe(expectedMs);
      expect(r.renewal_count).toBe(4);
      expect(r.total_paid_usd).toBe(20);
    }
  });

  it('rejects when the operator claim was deleted between quote and confirm', async () => {
    const { env, kv } = makeEnv();
    const nonce = await newQuote(env);
    // Admin revokes the claim between quote and confirm
    kv.store.delete(CLAIM_KEY_PREFIX + SENDER_WALLET.toLowerCase());
    const r = await confirmVerifyHireable(env, {
      nonce,
      txHash: TX_HASH,
      sender_wallet: SENDER_WALLET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_operator_claim');
  });
});
