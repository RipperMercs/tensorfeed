import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedFetch, invalidateCached } from './edge-cache';

// Mock the Workers Cache API. Stores Responses keyed by request URL.
class FakeCache {
  store = new Map<string, Response>();
  async match(req: Request): Promise<Response | undefined> {
    const r = this.store.get(req.url);
    if (!r) return undefined;
    return r.clone();
  }
  async put(req: Request, res: Response): Promise<void> {
    this.store.set(req.url, res.clone());
  }
  async delete(req: Request): Promise<boolean> {
    return this.store.delete(req.url);
  }
}

function installFakeCache(): FakeCache {
  const fake = new FakeCache();
  (globalThis as any).caches = { default: fake as unknown as Cache };
  return fake;
}

function uninstallCache() {
  delete (globalThis as any).caches;
}

describe('cachedFetch', () => {
  beforeEach(() => {
    uninstallCache();
  });

  it('calls fetcher on cache miss and returns its value', async () => {
    installFakeCache();
    const fetcher = vi.fn().mockResolvedValue({ a: 1 });
    const value = await cachedFetch('key:1', 60, fetcher);
    expect(value).toEqual({ a: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on hit without calling fetcher', async () => {
    installFakeCache();
    const fetcher = vi.fn().mockResolvedValue({ a: 1 });
    await cachedFetch('key:hit', 60, fetcher);
    fetcher.mockClear();
    const value = await cachedFetch('key:hit', 60, fetcher);
    expect(value).toEqual({ a: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('isolates entries by key', async () => {
    installFakeCache();
    const fetcherA = vi.fn().mockResolvedValue({ a: 1 });
    const fetcherB = vi.fn().mockResolvedValue({ b: 2 });
    expect(await cachedFetch('k:a', 60, fetcherA)).toEqual({ a: 1 });
    expect(await cachedFetch('k:b', 60, fetcherB)).toEqual({ b: 2 });
    expect(await cachedFetch('k:a', 60, fetcherA)).toEqual({ a: 1 });
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });

  it('writes Cache-Control: s-maxage matching ttlSeconds', async () => {
    const cache = installFakeCache();
    await cachedFetch('key:ttl', 3600, async () => ({ x: 1 }));
    const stored = await cache.match(new Request('https://tf-edge-cache.internal/v1/key%3Attl'));
    expect(stored?.headers.get('cache-control')).toBe('s-maxage=3600');
  });

  it('falls through to fetcher when caches.default is unavailable', async () => {
    uninstallCache();
    const fetcher = vi.fn().mockResolvedValue({ a: 1 });
    const value = await cachedFetch('key:no-cache', 60, fetcher);
    expect(value).toEqual({ a: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Two calls in a row both call fetcher (no caching layer)
    await cachedFetch('key:no-cache', 60, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('propagates fetcher errors without caching', async () => {
    const cache = installFakeCache();
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('upstream 500'));
    await expect(cachedFetch('key:err', 60, fetcher)).rejects.toThrow('upstream 500');
    expect(cache.store.size).toBe(0);

    // Next call (which would succeed) goes back to fetcher because nothing was cached
    fetcher.mockResolvedValueOnce({ ok: true });
    const value = await cachedFetch('key:err', 60, fetcher);
    expect(value).toEqual({ ok: true });
  });

  it('handles cache entries that fail to parse by re-fetching', async () => {
    const cache = installFakeCache();
    // Manually plant a corrupt entry
    cache.store.set(
      'https://tf-edge-cache.internal/v1/key%3Acorrupt',
      new Response('{not-json', { headers: { 'content-type': 'application/json' } }),
    );
    const fetcher = vi.fn().mockResolvedValue({ recovered: true });
    const value = await cachedFetch('key:corrupt', 60, fetcher);
    expect(value).toEqual({ recovered: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cacheKey containing special characters is encoded safely', async () => {
    installFakeCache();
    const f1 = vi.fn().mockResolvedValue('a');
    const f2 = vi.fn().mockResolvedValue('b');
    // Two keys that would collide without encoding
    await cachedFetch('foo/bar?baz=1', 60, f1);
    await cachedFetch('foo/bar?baz=2', 60, f2);
    f1.mockClear();
    f2.mockClear();
    expect(await cachedFetch('foo/bar?baz=1', 60, f1)).toBe('a');
    expect(await cachedFetch('foo/bar?baz=2', 60, f2)).toBe('b');
    expect(f1).not.toHaveBeenCalled();
    expect(f2).not.toHaveBeenCalled();
  });
});

describe('invalidateCached', () => {
  beforeEach(() => {
    uninstallCache();
  });

  it('removes a cached entry so the next call hits fetcher', async () => {
    installFakeCache();
    const fetcher = vi.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });
    await cachedFetch('key:inv', 60, fetcher);
    expect(await invalidateCached('key:inv')).toBe(true);
    const second = await cachedFetch('key:inv', 60, fetcher);
    expect(second).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns false when key is not cached', async () => {
    installFakeCache();
    expect(await invalidateCached('key:nonexistent')).toBe(false);
  });

  it('returns false when caches.default is unavailable', async () => {
    uninstallCache();
    expect(await invalidateCached('key:any')).toBe(false);
  });
});
