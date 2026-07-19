import { describe, it, expect } from 'vitest';
import {
  generateAttestationId,
  isValidAttestationId,
  attestRequested,
  storeAttestation,
  getAttestation,
  deleteAttestation,
  attestationBlock,
  ATTEST_TTL_SECONDS,
  ATTEST_SURCHARGE_CREDITS,
} from './attest';
import type { Env } from './types';
import type { SignedReceipt } from './receipts';

class MockKV {
  store = new Map<string, string>();
  ttls = new Map<string, number | undefined>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
    this.ttls.set(key, opts?.expirationTtl);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function makeEnv(): Env {
  return { TENSORFEED_CACHE: new MockKV() } as unknown as Env;
}

const RECEIPT = {
  v: 2,
  id: 'rcpt_0123456789abcdef',
  endpoint: '/api/premium/whats-new',
  method: 'GET',
  token_short: 'tf_live_aaaaaaaa...bbbbbbbb',
  credits_charged: 1,
  credits_remaining: 41,
  request_hash: 'r'.repeat(64),
  response_hash: 's'.repeat(64),
  captured_at: '2026-07-18T09:00:00.000Z',
  server_time: '2026-07-18T09:00:01.000Z',
  no_charge_reason: null,
  freshness_sla_seconds: 3600,
  agent_nonce: null,
  signature: 'sig',
  key_id: 'k1',
  signing_alg: 'EdDSA',
  signing_curve: 'Ed25519',
} as unknown as SignedReceipt;

describe('attestation ids', () => {
  it('generates att_<16hex> ids that validate', () => {
    for (let i = 0; i < 20; i += 1) {
      const id = generateAttestationId();
      expect(id).toMatch(/^att_[0-9a-f]{16}$/);
      expect(isValidAttestationId(id)).toBe(true);
    }
  });

  it('rejects malformed ids (traversal, wrong prefix, wrong length)', () => {
    expect(isValidAttestationId('att_XYZ')).toBe(false);
    expect(isValidAttestationId('att_' + 'a'.repeat(15))).toBe(false);
    expect(isValidAttestationId('rcpt_0123456789abcdef')).toBe(false);
    expect(isValidAttestationId('att_0123456789abcdef/../x')).toBe(false);
    expect(isValidAttestationId('')).toBe(false);
  });
});

describe('attestRequested', () => {
  it('detects the query param form', () => {
    const url = new URL('https://tensorfeed.ai/api/premium/whats-new?attest=store');
    const req = new Request(url.toString());
    expect(attestRequested(req, url)).toBe(true);
  });

  it('detects the header form', () => {
    const url = new URL('https://tensorfeed.ai/api/premium/whats-new');
    const req = new Request(url.toString(), { headers: { 'X-Attest': 'store' } });
    expect(attestRequested(req, url)).toBe(true);
  });

  it('ignores other values', () => {
    const url = new URL('https://tensorfeed.ai/api/premium/whats-new?attest=yes');
    const req = new Request(url.toString(), { headers: { 'X-Attest': 'please' } });
    expect(attestRequested(req, url)).toBe(false);
  });
});

describe('store / fetch / delete', () => {
  it('roundtrips a receipt with the documented TTL', async () => {
    const env = makeEnv();
    const now = new Date('2026-07-18T10:00:00.000Z');
    const record = await storeAttestation(env, RECEIPT, now);
    expect(record.stored_at).toBe('2026-07-18T10:00:00.000Z');
    expect(record.expires_at).toBe(
      new Date(now.getTime() + ATTEST_TTL_SECONDS * 1000).toISOString(),
    );

    const fetched = await getAttestation(env, record.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.receipt.id).toBe('rcpt_0123456789abcdef');

    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(kv.ttls.get(`attest:${record.id}`)).toBe(ATTEST_TTL_SECONDS);
  });

  it('returns null for unknown or malformed ids', async () => {
    const env = makeEnv();
    expect(await getAttestation(env, 'att_0000000000000000')).toBeNull();
    expect(await getAttestation(env, 'not-an-id')).toBeNull();
  });

  it('deleteAttestation removes the record and tolerates bad ids', async () => {
    const env = makeEnv();
    const record = await storeAttestation(env, RECEIPT);
    await deleteAttestation(env, record.id);
    expect(await getAttestation(env, record.id)).toBeNull();
    await deleteAttestation(env, 'nonsense'); // must not throw
  });
});

describe('attestationBlock', () => {
  it('builds the public block with urls, surcharge, and verify pointer', async () => {
    const env = makeEnv();
    const record = await storeAttestation(env, RECEIPT);
    const block = attestationBlock(record, 'https://tensorfeed.ai');
    expect(block.url).toBe(`https://tensorfeed.ai/attest?id=${record.id}`);
    expect(block.api_url).toBe(`https://tensorfeed.ai/api/attest/${record.id}`);
    expect(block.surcharge_credits).toBe(ATTEST_SURCHARGE_CREDITS);
    expect(block.verify).toBe('https://tensorfeed.ai/api/receipt/verify');
    expect(block.expires_at).toBe(record.expires_at);
  });
});
