import { describe, it, expect, beforeEach } from 'vitest';
import {
  maybeSimulatedErrorResponse,
  applySimulatedLatency,
  CHAOS_LIMITS,
  noteSimulatedResponse,
  maybeFlushChaos,
  getChaosStats,
  _resetChaosCounterForTests,
} from './chaos';

function req(headers: Record<string, string> = {}, url = 'https://tensorfeed.ai/api/news'): Request {
  return new Request(url, { headers });
}

describe('maybeSimulatedErrorResponse', () => {
  it('returns null when the simulate-error header is absent', () => {
    expect(maybeSimulatedErrorResponse(req())).toBeNull();
  });

  it('returns the requested status code when the header is set', async () => {
    const res = maybeSimulatedErrorResponse(req({ 'X-TensorFeed-Simulate-Error': '503' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    expect(res!.headers.get('X-TensorFeed-Simulated')).toBe('true');
    const body = await res!.json() as { error: string; simulated: boolean; status: number };
    expect(body.error).toBe('simulated_error');
    expect(body.simulated).toBe(true);
    expect(body.status).toBe(503);
  });

  it('handles 4xx codes too', async () => {
    const res = maybeSimulatedErrorResponse(req({ 'X-TensorFeed-Simulate-Error': '429' }));
    expect(res!.status).toBe(429);
    const body = await res!.json() as { status: number };
    expect(body.status).toBe(429);
  });

  it('rejects sub-400 codes as 400 with a hint', async () => {
    const res = maybeSimulatedErrorResponse(req({ 'X-TensorFeed-Simulate-Error': '200' }));
    expect(res!.status).toBe(400);
    const body = await res!.json() as { error: string; hint: string };
    expect(body.hint).toContain('503');
  });

  it('rejects super-599 codes as 400', () => {
    const res = maybeSimulatedErrorResponse(req({ 'X-TensorFeed-Simulate-Error': '700' }));
    expect(res!.status).toBe(400);
  });

  it('rejects non-numeric input as 400', () => {
    const res = maybeSimulatedErrorResponse(req({ 'X-TensorFeed-Simulate-Error': 'panic' }));
    expect(res!.status).toBe(400);
  });
});

describe('applySimulatedLatency', () => {
  it('returns 0 when no header is set', async () => {
    const ms = await applySimulatedLatency(req());
    expect(ms).toBe(0);
  });

  it('actually waits the requested duration', async () => {
    const start = Date.now();
    const ms = await applySimulatedLatency(req({ 'X-TensorFeed-Simulate-Latency': '50' }));
    const elapsed = Date.now() - start;
    expect(ms).toBe(50);
    // Real sleep, so allow a tolerance for slow CI but reject obvious no-ops
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it('caps absurdly large values at MAX_LATENCY_MS', async () => {
    // Stub setTimeout so we don't actually sleep MAX_LATENCY_MS during the test
    const realSetTimeout = globalThis.setTimeout;
    let observedDelay = -1;
    globalThis.setTimeout = ((cb: () => void, delay: number) => {
      observedDelay = delay;
      return realSetTimeout(cb, 0);
    }) as typeof setTimeout;
    try {
      const ms = await applySimulatedLatency(req({ 'X-TensorFeed-Simulate-Latency': '999999999' }));
      expect(ms).toBe(CHAOS_LIMITS.MAX_LATENCY_MS);
      expect(observedDelay).toBe(CHAOS_LIMITS.MAX_LATENCY_MS);
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
  });

  it('ignores zero and negative values', async () => {
    expect(await applySimulatedLatency(req({ 'X-TensorFeed-Simulate-Latency': '0' }))).toBe(0);
    expect(await applySimulatedLatency(req({ 'X-TensorFeed-Simulate-Latency': '-100' }))).toBe(0);
  });

  it('ignores non-numeric values', async () => {
    expect(await applySimulatedLatency(req({ 'X-TensorFeed-Simulate-Latency': 'forever' }))).toBe(0);
  });
});

describe('chaos counter', () => {
  function makeKVStub(): { TENSORFEED_CACHE: KVNamespace; backing: Map<string, string> } {
    const backing = new Map<string, string>();
    const kv = {
      get: async (key: string, type?: 'json') => {
        const raw = backing.get(key);
        if (raw === undefined) return null;
        return type === 'json' ? JSON.parse(raw) : raw;
      },
      put: async (key: string, value: string) => {
        backing.set(key, value);
      },
      delete: async (key: string) => {
        backing.delete(key);
      },
      list: async () => ({ keys: [], list_complete: true, cursor: '' }),
      getWithMetadata: async () => ({ value: null, metadata: null }),
    } as unknown as KVNamespace;
    return { TENSORFEED_CACHE: kv, backing };
  }

  beforeEach(() => {
    _resetChaosCounterForTests();
  });

  it('reports zero state when nothing has been recorded', async () => {
    const { TENSORFEED_CACHE } = makeKVStub();
    const stats = await getChaosStats({ TENSORFEED_CACHE });
    expect(stats.total).toBe(0);
    expect(stats.by_status).toEqual({});
    expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reflects in-memory pending counts even before flush', async () => {
    const { TENSORFEED_CACHE, backing } = makeKVStub();
    noteSimulatedResponse(504);
    noteSimulatedResponse(504);
    noteSimulatedResponse(503);

    const stats = await getChaosStats({ TENSORFEED_CACHE });
    expect(stats.total).toBe(3);
    expect(stats.by_status['504']).toBe(2);
    expect(stats.by_status['503']).toBe(1);
    // No KV write yet because batch threshold (20) not hit
    expect(backing.size).toBe(0);
  });

  it('flushes to KV when forced via direct flush', async () => {
    const { TENSORFEED_CACHE, backing } = makeKVStub();
    for (let i = 0; i < 25; i++) noteSimulatedResponse(504);

    await maybeFlushChaos({ TENSORFEED_CACHE });

    expect(backing.has('chaos:counter')).toBe(true);
    const stored = JSON.parse(backing.get('chaos:counter')!);
    expect(stored.total).toBe(25);
    expect(stored.by_status['504']).toBe(25);
  });

  it('does not double-count after flush', async () => {
    const { TENSORFEED_CACHE } = makeKVStub();
    for (let i = 0; i < 25; i++) noteSimulatedResponse(504);
    await maybeFlushChaos({ TENSORFEED_CACHE });

    const stats = await getChaosStats({ TENSORFEED_CACHE });
    expect(stats.total).toBe(25);
    expect(stats.by_status['504']).toBe(25);
  });

  it('accumulates across flushes', async () => {
    const { TENSORFEED_CACHE } = makeKVStub();
    for (let i = 0; i < 20; i++) noteSimulatedResponse(504);
    await maybeFlushChaos({ TENSORFEED_CACHE });

    for (let i = 0; i < 20; i++) noteSimulatedResponse(503);
    await maybeFlushChaos({ TENSORFEED_CACHE });

    const stats = await getChaosStats({ TENSORFEED_CACHE });
    expect(stats.total).toBe(40);
    expect(stats.by_status['504']).toBe(20);
    expect(stats.by_status['503']).toBe(20);
  });

  it('is a no-op when nothing is pending', async () => {
    const { TENSORFEED_CACHE, backing } = makeKVStub();
    await maybeFlushChaos({ TENSORFEED_CACHE });
    expect(backing.size).toBe(0);
  });
});
