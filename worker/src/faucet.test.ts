import { describe, it, expect, beforeAll } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { parseFaucetMessage, handleFaucetClaim, type FaucetDeps } from './faucet';
import type { Env } from './types';

// Hardhat account #0. Test-only key, never used for real funds.
const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
let account: ReturnType<typeof privateKeyToAccount>;

beforeAll(() => {
  account = privateKeyToAccount(TEST_PK);
});

const TS = '2026-05-28T12:00:00.000Z';
const NOW = Date.parse(TS);

function buildMessage(wallet: string, ts: string, nonce: string): string {
  return [
    'I am requesting TensorFeed trial credits for this wallet.',
    '',
    `wallet: ${wallet}`,
    `timestamp: ${ts}`,
    `nonce: ${nonce}`,
  ].join('\n');
}

// Minimal in-memory KV stub good enough for the nonce + one-grant markers.
function mockEnv(): Env {
  const store = new Map<string, string>();
  const kv = {
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
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
  };
  return { TENSORFEED_CACHE: kv } as unknown as Env;
}

const cleanScreen: FaucetDeps['screen'] = async () => ({ sanctioned: false });
let mintCalls = 0;
const stubMint: FaucetDeps['mint'] = async () => {
  mintCalls++;
  return { token: 'tf_live_testtoken', credits: 25, expiresAt: '2026-06-27T12:00:00.000Z' };
};

function deps(over: Partial<FaucetDeps> = {}): FaucetDeps {
  return { now: NOW, screen: cleanScreen, mint: stubMint, ...over };
}

async function signedBody(ts = TS, nonce = 'deadbeefdeadbeef00112233') {
  const message = buildMessage(account.address, ts, nonce);
  const signature = await account.signMessage({ message });
  return { message, signature };
}

describe('parseFaucetMessage', () => {
  it('parses a valid message', () => {
    const r = parseFaucetMessage(buildMessage(account.address, TS, 'deadbeefdeadbeef'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.req.wallet).toBe(account.address);
      expect(r.req.timestamp).toBe(TS);
      expect(r.req.nonce).toBe('deadbeefdeadbeef');
    }
  });

  it('rejects a missing/invalid wallet', () => {
    const r = parseFaucetMessage(`timestamp: ${TS}\nnonce: deadbeefdeadbeef`);
    expect(r).toEqual({ ok: false, error: 'invalid_wallet' });
  });

  it('rejects a bad timestamp', () => {
    const r = parseFaucetMessage(`wallet: ${account.address}\ntimestamp: not-a-date\nnonce: deadbeefdeadbeef`);
    expect(r).toEqual({ ok: false, error: 'invalid_timestamp' });
  });

  it('rejects a too-short nonce', () => {
    const r = parseFaucetMessage(`wallet: ${account.address}\ntimestamp: ${TS}\nnonce: abc`);
    expect(r).toEqual({ ok: false, error: 'invalid_nonce' });
  });
});

describe('handleFaucetClaim', () => {
  it('grants on a valid first claim', async () => {
    mintCalls = 0;
    const env = mockEnv();
    const out = await handleFaucetClaim(env, await signedBody(), 'tester/1.0', deps());
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.status).toBe('granted');
      expect(out.token).toBe('tf_live_testtoken');
      expect(out.credits).toBe(25);
      expect(out.wallet).toBe(account.address);
    }
    expect(mintCalls).toBe(1);
    // one-grant marker was written
    const claimed = await env.TENSORFEED_CACHE.get(`pay:faucet-claimed:${account.address.toLowerCase()}`);
    expect(claimed).not.toBeNull();
  });

  it('rejects a replayed nonce', async () => {
    const env = mockEnv();
    const body = await signedBody(TS, 'aaaabbbbccccdddd0000');
    const first = await handleFaucetClaim(env, body, 'tester/1.0', deps());
    expect(first.ok).toBe(true);
    const second = await handleFaucetClaim(env, body, 'tester/1.0', deps());
    expect(second).toMatchObject({ ok: false, status: 'rejected', reason: 'nonce_replayed' });
  });

  it('rejects a second claim from the same wallet with a fresh nonce', async () => {
    const env = mockEnv();
    const first = await handleFaucetClaim(env, await signedBody(TS, '1111222233334444aaaa'), 'tester/1.0', deps());
    expect(first.ok).toBe(true);
    const second = await handleFaucetClaim(env, await signedBody(TS, '5555666677778888bbbb'), 'tester/1.0', deps());
    expect(second).toMatchObject({ ok: false, status: 'already_claimed', wallet: account.address });
  });

  it('rejects an invalid signature', async () => {
    mintCalls = 0;
    const env = mockEnv();
    const signed = await signedBody(TS, '9999000011112222cccc');
    // Submit a different message body with the original signature.
    const tampered = { message: buildMessage(account.address, TS, 'ffffeeeedddd0000aaaa'), signature: signed.signature };
    const out = await handleFaucetClaim(env, tampered, 'tester/1.0', deps());
    expect(out).toMatchObject({ ok: false, status: 'rejected', reason: 'signature_invalid' });
    expect(mintCalls).toBe(0);
  });

  it('rejects an expired timestamp', async () => {
    const env = mockEnv();
    const out = await handleFaucetClaim(env, await signedBody(TS, 'eeee111122223333dddd'), 'tester/1.0', deps({ now: NOW + 11 * 60 * 1000 }));
    expect(out).toMatchObject({ ok: false, status: 'rejected', reason: 'replay_window_expired' });
  });

  it('bans a sanctioned wallet and does not mint', async () => {
    mintCalls = 0;
    const env = mockEnv();
    const out = await handleFaucetClaim(
      env,
      await signedBody(TS, 'abcabcabcabcabcabc12'),
      'tester/1.0',
      deps({ screen: async () => ({ sanctioned: true }) }),
    );
    expect(out).toMatchObject({ ok: false, status: 'banned', reason: 'ofac_sanctioned' });
    expect(mintCalls).toBe(0);
  });

  it('returns retry_later when the OFAC screen errors, and does not mint', async () => {
    mintCalls = 0;
    const env = mockEnv();
    const out = await handleFaucetClaim(
      env,
      await signedBody(TS, 'def0def0def0def0def0'),
      'tester/1.0',
      deps({ screen: async () => ({ sanctioned: false, error: 'chainalysis_unreachable' }) }),
    );
    expect(out).toMatchObject({ ok: false, status: 'retry_later', reason: 'ofac_oracle_unreachable' });
    expect(mintCalls).toBe(0);
  });

  it('rejects a malformed signature shape before any ECDSA work', async () => {
    const env = mockEnv();
    const out = await handleFaucetClaim(env, { message: buildMessage(account.address, TS, 'deadbeefdeadbeef'), signature: '0xabc' }, 'tester/1.0', deps());
    expect(out).toMatchObject({ ok: false, status: 'bad_request' });
  });

  it('emits no em dashes or double hyphens in any outcome', async () => {
    const env = mockEnv();
    const out = await handleFaucetClaim(env, await signedBody(TS, 'cafecafecafecafe1234'), 'tester/1.0', deps());
    const json = JSON.stringify(out);
    expect(json).not.toContain('—');
    expect(json.includes('--')).toBe(false);
  });
});
