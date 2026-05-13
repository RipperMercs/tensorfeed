import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { handleClaimApplication } from './agent-claim-handler';
import {
  CLAIM_KEY_PREFIX,
  CLAIM_NONCE_KEY_PREFIX,
  PENDING_CLAIM_KEY_PREFIX,
  BAN_KEY_PREFIX,
  type OperatorClaim,
} from './agent-reputation-store';

// ── Test wallets ──
const TEST_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as `0x${string}`;
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);
const TEST_WALLET = TEST_ACCOUNT.address;

const OTHER_PRIVATE_KEY = '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210' as `0x${string}`;
const OTHER_ACCOUNT = privateKeyToAccount(OTHER_PRIVATE_KEY);

const NOW = Date.parse('2026-05-13T20:00:00.000Z');

// ── Fake KV with TTL support ──
function makeKv() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    store,
    ttls,
    async get(key: string, type?: 'json' | 'text') {
      // honor expirations lazily
      const ttl = ttls.get(key);
      if (ttl !== undefined && ttl < Date.now() / 1000) {
        store.delete(key);
        ttls.delete(key);
      }
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      store.set(key, value);
      if (options?.expirationTtl) {
        ttls.set(key, Date.now() / 1000 + options.expirationTtl);
      }
    },
    async delete(key: string) {
      store.delete(key);
      ttls.delete(key);
    },
    async list({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) {
      const all = Array.from(store.keys()).filter((k) => k.startsWith(prefix)).sort();
      const startIdx = cursor ? all.indexOf(cursor) + 1 : 0;
      const page = all.slice(startIdx, startIdx + 1000);
      const complete = startIdx + 1000 >= all.length;
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete || page.length === 0 ? undefined : page[page.length - 1],
      };
    },
  };
}

function makeEnv(opts: {
  aiResponse?: string | (() => string) | 'throw';
  chainalysisStatus?: number;
  chainalysisBody?: unknown;
  chainalysisThrows?: boolean;
} = {}) {
  const kv = makeKv();
  const aiRun = vi.fn(async () => {
    if (opts.aiResponse === 'throw') throw new Error('ai-unreachable');
    const r = typeof opts.aiResponse === 'function' ? opts.aiResponse() : opts.aiResponse;
    return { response: r ?? 'safe' };
  });
  return {
    kv,
    env: {
      TENSORFEED_CACHE: kv,
      AI: { run: aiRun },
      CHAINALYSIS_API_KEY: 'test-key',
    } as any,
    aiRun,
  };
}

function setupChainalysisFetch(opts: {
  status?: number;
  body?: unknown;
  throws?: boolean;
} = {}) {
  const mockFetch = vi.fn(async (url: string) => {
    if (opts.throws) throw new Error('network failure');
    return new Response(JSON.stringify(opts.body ?? { identifications: [] }), {
      status: opts.status ?? 200,
    });
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

function buildMessage(overrides: Record<string, string | undefined> = {}): string {
  const defaults: Record<string, string | undefined> = {
    wallet: TEST_WALLET,
    timestamp: '2026-05-13T19:59:00.000Z',
    nonce: 'deadbeef0123456789abcdef01234567',
    display_name: 'Cool Agent',
    ...overrides,
  };
  const lines = ['I claim ownership of this wallet operating an agent on TensorFeed.ai.', ''];
  for (const [k, v] of Object.entries(defaults)) {
    if (v === undefined) continue;
    lines.push(`${k}: ${v}`);
  }
  return lines.join('\n');
}

async function signed(overrides?: Record<string, string | undefined>) {
  const message = buildMessage(overrides);
  const signature = await TEST_ACCOUNT.signMessage({ message });
  return { message, signature };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ identifications: [] }))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ Bad input shape                                                  │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: input validation', () => {
  it('rejects empty body', async () => {
    const { env } = makeEnv();
    const r = await handleClaimApplication(env, {}, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('bad_request');
  });

  it('rejects non-hex signature', async () => {
    const { env } = makeEnv();
    const r = await handleClaimApplication(
      env,
      { message: buildMessage(), signature: 'not-hex' },
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('bad_request');
  });

  it('rejects malformed message (no wallet)', async () => {
    const { env } = makeEnv();
    const { signature } = await signed();
    const r = await handleClaimApplication(
      env,
      { message: 'not a claim message', signature },
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('bad_request');
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ Replay window + signature                                        │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: signature + replay', () => {
  it('rejects expired timestamp', async () => {
    const { env } = makeEnv();
    const message = buildMessage({ timestamp: '2026-05-13T19:00:00.000Z' }); // 1 hour ago
    const signature = await TEST_ACCOUNT.signMessage({ message });
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('rejected');
      expect((r as any).reason).toBe('replay_window_expired');
    }
  });

  it('rejects mismatched signature (wrong wallet signed)', async () => {
    const { env } = makeEnv();
    const message = buildMessage();
    const wrongSignature = await OTHER_ACCOUNT.signMessage({ message });
    const r = await handleClaimApplication(env, { message, signature: wrongSignature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('rejected');
      expect((r as any).reason).toBe('signature_invalid');
    }
  });

  it('rejects nonce replay (second attempt with same nonce)', async () => {
    const { env, kv } = makeEnv();
    const { message, signature } = await signed();
    // First attempt (should succeed; safe path)
    const r1 = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r1.ok).toBe(true);
    expect(kv.store.has(CLAIM_NONCE_KEY_PREFIX + 'deadbeef0123456789abcdef01234567')).toBe(true);
    // Second attempt with the SAME signed message
    const r2 = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.status).toBe('rejected');
      expect((r2 as any).reason).toBe('nonce_replayed');
    }
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ OFAC screening                                                   │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: Chainalysis OFAC', () => {
  it('bans sanctioned wallets and writes a ban record', async () => {
    setupChainalysisFetch({ body: { identifications: [{ category: 'sanctions' }] } });
    const { env, kv } = makeEnv();
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('banned');
      expect((r as any).reason).toBe('ofac_sanctioned');
    }
    expect(kv.store.has(BAN_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
    // nonce was burnt so the attacker can't retry
    expect(kv.store.has(CLAIM_NONCE_KEY_PREFIX + 'deadbeef0123456789abcdef01234567')).toBe(true);
  });

  it('fails closed when Chainalysis returns 500', async () => {
    setupChainalysisFetch({ status: 500 });
    const { env, kv } = makeEnv();
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('retry_later');
      expect((r as any).reason).toBe('ofac_oracle_unreachable');
    }
    // No ban record, no claim written, no nonce burnt — caller can retry
    expect(kv.store.has(BAN_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(false);
    expect(kv.store.has(CLAIM_KEY_PREFIX + 'claim:' + TEST_WALLET.toLowerCase())).toBe(false);
  });

  it('fails closed when Chainalysis network throws', async () => {
    setupChainalysisFetch({ throws: true });
    const { env } = makeEnv();
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe('retry_later');
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ Llama Guard pre-flight                                           │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: moderation', () => {
  it('bans on Llama Guard hard_block', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'unsafe\nS4' });
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('banned');
      expect((r as any).reason).toBe('hard_moderation_block');
      expect((r as any).category).toBe('S4');
    }
    expect(kv.store.has(BAN_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
  });

  it('queues on Llama Guard soft_review', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'unsafe\nS10' });
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('queued');
      expect((r as any).reason).toBe('soft_moderation');
    }
    expect(kv.store.has(PENDING_CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
    expect(kv.store.has(CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(false);
  });

  it('queues on Llama Guard fail_closed (AI throws)', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'throw' });
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('queued');
      expect((r as any).reason).toBe('fail_closed_moderation');
    }
    expect(kv.store.has(PENDING_CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ Brand allowlist                                                  │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: brand allowlist', () => {
  it('queues claims that hit the brand allowlist', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'safe' });
    const { message, signature } = await signed({ display_name: 'OpenAI Helper' });
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('queued');
      expect((r as any).reason).toBe('brand_allowlist');
      expect((r as any).brand_hit).toBe('openai');
    }
    expect(kv.store.has(PENDING_CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
  });
});

// ┌──────────────────────────────────────────────────────────────────┐
// │ Happy path + directory fields                                    │
// └──────────────────────────────────────────────────────────────────┘

describe('handleClaimApplication: approved path', () => {
  it('approves a clean claim and writes to KV', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'safe' });
    const { message, signature } = await signed();
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('approved');
      expect((r as any).wallet).toBe(TEST_WALLET);
      expect((r as any).display_name).toBe('Cool Agent');
    }
    const raw = kv.store.get(CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase());
    expect(raw).toBeDefined();
    const stored = JSON.parse(raw as string) as OperatorClaim;
    expect(stored.wallet).toBe(TEST_WALLET);
    expect(stored.verified).toBe(true);
    expect(stored.ofac_clean).toBe(true);
    expect(stored.signature).toBe(signature);
    expect(stored.message).toBe(message);
  });

  it('persists directory fields on the approved claim', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'safe' });
    const { message, signature } = await signed({
      available_for_hire: 'true',
      hourly_rate_min_usd: '50',
      hourly_rate_max_usd: '200',
      expanded_description: 'I do data analysis.',
      skills_tags: 'research, data-analysis',
      service_areas: 'research, data',
      languages: 'en, ja',
      years_experience: '5',
    });
    const r = await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(r.ok).toBe(true);
    const stored = JSON.parse(
      kv.store.get(CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase()) as string,
    ) as OperatorClaim;
    expect(stored.available_for_hire).toBe(true);
    expect(stored.hourly_rate_min_usd).toBe(50);
    expect(stored.hourly_rate_max_usd).toBe(200);
    expect(stored.expanded_description).toBe('I do data analysis.');
    expect(stored.skills_tags).toEqual(['research', 'data-analysis']);
    expect(stored.languages).toEqual(['en', 'ja']);
    expect(stored.years_experience).toBe(5);
  });

  it('writes nonce + active claim, NOT pending claim, on approve', async () => {
    setupChainalysisFetch();
    const { env, kv } = makeEnv({ aiResponse: 'safe' });
    const { message, signature } = await signed();
    await handleClaimApplication(env, { message, signature }, { now: NOW });
    expect(kv.store.has(CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(true);
    expect(kv.store.has(PENDING_CLAIM_KEY_PREFIX + TEST_WALLET.toLowerCase())).toBe(false);
    expect(kv.store.has(CLAIM_NONCE_KEY_PREFIX + 'deadbeef0123456789abcdef01234567')).toBe(true);
  });
});
