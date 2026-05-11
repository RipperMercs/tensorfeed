import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  refreshX402Registry,
  getLatestX402Registry,
  X402_REGISTRY_ATTRIBUTION,
} from './x402-registry';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function makeEnv(): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
  } as unknown as Env;
}

const SAMPLE_MANIFEST = {
  x402Version: 2,
  site: 'tensorfeed.ai',
  publisher: {
    name: 'TensorFeed.ai',
    url: 'https://tensorfeed.ai',
    description: 'Machine-payable API for AI agents.',
    docs: 'https://tensorfeed.ai/developers/agent-payments',
    llmsTxt: 'https://tensorfeed.ai/llms.txt',
    agent_fair_trade: 'TensorFeed is agent fair-trade certified.',
  },
  payment: {
    wallet: '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1',
    assetSymbol: 'USDC',
    network: 'eip155:8453',
  },
  items: [
    {
      resource: 'https://tensorfeed.ai/api/premium/routing',
      accepts: [{ scheme: 'exact', network: 'eip155:8453', extra: { name: 'USD Coin' } }],
    },
    {
      resource: 'https://tensorfeed.ai/api/premium/compare/models',
      accepts: [{ scheme: 'exact', network: 'eip155:8453', extra: { name: 'USD Coin' } }],
    },
  ],
  freeEndpoints: [
    { resource: 'https://tensorfeed.ai/api/news' },
  ],
};

describe('refreshX402Registry', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('crawls the seed list and returns a normalized snapshot', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_MANIFEST,
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    expect(snap.total).toBe(2); // 2 seed entries
    expect(snap.ok_count).toBe(2);
    expect(snap.error_count).toBe(0);
    expect(snap.federation_count).toBe(2);
    expect(snap.by_network['eip155:8453']).toBe(2);
    for (const entry of snap.entries) {
      expect(entry.status).toBe('ok');
      expect(entry.publisher_name).toBe('TensorFeed.ai');
      expect(entry.paid_endpoints_count).toBe(2);
      expect(entry.free_endpoints_count).toBe(1);
      expect(entry.payment_wallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(entry.payment_asset_symbol).toBe('USDC');
      expect(entry.federation_member).toBe(true);
      expect(entry.agent_fair_trade_declared).toBe(true);
      expect(entry.accepts_summary?.[0]).toMatchObject({
        scheme: 'exact',
        network: 'eip155:8453',
        asset_symbol: 'USDC',
        count: 2,
      });
    }
    expect(snap.attribution).toBe(X402_REGISTRY_ATTRIBUTION);
  });

  it('records not_found cleanly when /.well-known/x402 returns 404', async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    expect(snap.ok_count).toBe(0);
    expect(snap.error_count).toBe(2);
    for (const e of snap.entries) {
      expect(e.status).toBe('not_found');
      expect(e.http_status).toBe(404);
      expect(e.federation_member).toBe(true); // assertion preserved
    }
  });

  it('records http_error on 5xx', async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    for (const e of snap.entries) {
      expect(e.status).toBe('http_error');
      expect(e.http_status).toBe(503);
    }
  });

  it('records invalid_json when the response is not JSON', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json');
      },
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    for (const e of snap.entries) {
      expect(e.status).toBe('invalid_json');
    }
  });

  it('records invalid_schema when JSON parses but is not x402-shaped', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }), // missing x402Version + items/free/payment
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    for (const e of snap.entries) {
      expect(e.status).toBe('invalid_schema');
    }
  });

  it('records fetch_error on network failure', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const snap = await refreshX402Registry(env, { crawlDelayMs: 0 });
    for (const e of snap.entries) {
      expect(e.status).toBe('fetch_error');
      expect(e.error).toMatch(/ECONNREFUSED/);
    }
  });

  it('persists latest + dated + index keys', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_MANIFEST,
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    await refreshX402Registry(env);
    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(kv.store.has('x402-reg:latest')).toBe(true);
    const idx = JSON.parse(kv.store.get('x402-reg:index')!);
    expect(Array.isArray(idx)).toBe(true);
    expect(idx.length).toBeGreaterThanOrEqual(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(idx).toContain(today);
    expect(kv.store.has(`x402-reg:daily:${today}`)).toBe(true);
  });
});

describe('getLatestX402Registry', () => {
  it('returns null when no snapshot is stored', async () => {
    const env = makeEnv();
    expect(await getLatestX402Registry(env)).toBeNull();
  });

  it('returns the stored snapshot after refresh', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_MANIFEST,
    })) as unknown as typeof globalThis.fetch;
    const env = makeEnv();
    const refreshed = await refreshX402Registry(env, { crawlDelayMs: 0 });
    const fetched = await getLatestX402Registry(env);
    expect(fetched).not.toBeNull();
    expect(fetched?.total).toBe(refreshed.total);
    expect(fetched?.entries.length).toBe(refreshed.entries.length);
  });
});
