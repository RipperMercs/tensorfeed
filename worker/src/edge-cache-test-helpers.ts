/**
 * Test-only helpers for the edge-cache layer. Test files import these to
 * install a fake Cache API on `globalThis.caches.default` so the lazy-proxy
 * cache-hit / cache-miss paths can be exercised without the Workers runtime.
 *
 * Do NOT import from production code.
 */

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

export interface InstalledCache {
  cache: FakeCache;
  /**
   * Pre-populate the fake cache as if writeEdgeCacheJSON(cacheKey, value, ttl)
   * had been called. Useful when a test wants to verify the cache-hit path.
   */
  seed: (cacheKey: string, value: unknown, ttlSeconds?: number) => Promise<void>;
  uninstall: () => void;
}

/**
 * Install a fresh fake Cache API as globalThis.caches.default. Returns the
 * underlying fake (useful for inspecting stored entries) and an uninstall
 * function to call in afterEach.
 */
export function installFakeCache(): InstalledCache {
  const cache = new FakeCache();
  (globalThis as { caches?: { default: Cache } }).caches = {
    default: cache as unknown as Cache,
  };
  return {
    cache,
    seed: async (cacheKey: string, value: unknown, ttlSeconds = 60) => {
      const req = new Request(`https://tf-edge-cache.internal/v1/${encodeURIComponent(cacheKey)}`);
      const res = new Response(JSON.stringify(value), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `s-maxage=${ttlSeconds}`,
        },
      });
      await cache.put(req, res);
    },
    uninstall: () => {
      delete (globalThis as { caches?: { default: Cache } }).caches;
    },
  };
}
