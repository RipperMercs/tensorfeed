import { describe, it, expect, vi, afterEach } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { gatePosting, verifyPosterSignature, screenPoster } from './jobs-gate';
import { buildSignedMessage, type GigSignedPayload, type GigSubmission } from './jobs';
import type { Env } from './types';

// Well-known public test key (Hardhat account 0). Not a secret.
const TEST_PK =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(TEST_PK);

const KEYED_ENV = { CHAINALYSIS_API_KEY: 'test-key' } as unknown as Env;
const NO_KEY_ENV = {} as unknown as Env;

async function makeSubmission(): Promise<GigSubmission> {
  const payload: GigSignedPayload = {
    title: 'Gather structured AI API pricing data',
    body: 'Daily snapshot across providers.',
    category: 'research',
    budget_note: '5 USDC, negotiable',
    poster_x402: 'https://example.com/api/quote',
    poster_addr: account.address,
    nonce: 'nonce-abc',
    signed_at: 1_778_000_000,
  };
  const signature = await account.signMessage({
    message: buildSignedMessage(payload),
  });
  return { ...payload, signature };
}

type FetchImpl = (...a: unknown[]) => Promise<unknown>;
function stubFetch(impl: FetchImpl) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('gatePosting: signature', () => {
  it('rejects a bad signature and never spends a screen call', async () => {
    const sub = await makeSubmission();
    const wrongSig = await account.signMessage({ message: 'a different message' });
    const fetchMock = stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ identifications: [] }),
    }));
    const r = await gatePosting({ ...sub, signature: wrongSig }, KEYED_ENV);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a valid signature over a clean screen', async () => {
    const sub = await makeSubmission();
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ identifications: [] }),
    }));
    const r = await gatePosting(sub, KEYED_ENV);
    expect(r).toEqual({ ok: true });
  });
});

describe('gatePosting: OFAC fail-closed', () => {
  it('rejects a sanctioned wallet', async () => {
    const sub = await makeSubmission();
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ identifications: [{ category: 'sanctions' }] }),
    }));
    const r = await gatePosting(sub, KEYED_ENV);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('ofac_sanctioned');
  });

  it('fails closed on a Chainalysis 500', async () => {
    const sub = await makeSubmission();
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const r = await gatePosting(sub, KEYED_ENV);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('screen_unavailable');
      expect(r.detail).toContain('chainalysis_status_500');
    }
  });

  it('fails closed when Chainalysis network throws', async () => {
    const sub = await makeSubmission();
    stubFetch(async () => {
      throw new Error('network down');
    });
    const r = await gatePosting(sub, KEYED_ENV);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('screen_unavailable');
  });

  it('fails closed (not a false sanctions label) when screening is not configured', async () => {
    const sub = await makeSubmission();
    const fetchMock = stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ identifications: [] }),
    }));
    const r = await gatePosting(sub, NO_KEY_ENV);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('screen_unavailable');
      expect(r.detail).toBe('screening_not_configured');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('granular gate steps (used by the POST handler)', () => {
  it('verifyPosterSignature: true for a valid sig, false for a wrong one', async () => {
    const sub = await makeSubmission();
    expect(await verifyPosterSignature(sub)).toBe(true);
    const wrong = await account.signMessage({ message: 'other' });
    expect(await verifyPosterSignature({ ...sub, signature: wrong })).toBe(false);
  });

  it('screenPoster: clean passes, sanctioned and outage both fail closed', async () => {
    const sub = await makeSubmission();
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ identifications: [] }) }));
    expect(await screenPoster(sub, KEYED_ENV)).toEqual({ ok: true });

    vi.unstubAllGlobals();
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ identifications: [{ category: 'sanctions' }] }),
    }));
    const s = await screenPoster(sub, KEYED_ENV);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.reason).toBe('ofac_sanctioned');

    vi.unstubAllGlobals();
    stubFetch(async () => {
      throw new Error('down');
    });
    const u = await screenPoster(sub, KEYED_ENV);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.reason).toBe('screen_unavailable');
  });
});
