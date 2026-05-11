/**
 * Edge-cache helper for lazy-proxy upstream responses.
 *
 * Wraps Cloudflare's free, unlimited Cache API in a get-or-fetch pattern
 * that mirrors the previous KV-with-TTL idiom. The Cache API is the right
 * primitive for response-shaped caches whose only purpose is to amortize
 * upstream API calls and whose loss on eviction is harmless (just triggers
 * a re-fetch on the next miss).
 *
 * Trade vs KV:
 *   + Free, unbounded reads/writes (KV bills writes against the 1M/mo bundle)
 *   + Cache API is purpose-built for response caching
 *   - Per-data-center, not global; a cache hit in IAD does not mean a hit in SJC
 *   - Cloudflare may evict anytime under memory pressure (KV is durable)
 *
 * For lazy-proxy upstream caches, both downsides are FINE:
 *   - Each POP just re-fetches upstream on cold cache, same as KV would have
 *     done before its first write
 *   - Eviction just means one extra upstream hit, not data loss
 *
 * Do NOT use this helper for state that must be durable or globally
 * consistent (payments, credits, anomaly buffers, daily snapshots). Those
 * stay in KV.
 *
 * Test posture: when `caches.default` is not available (vitest unit tests
 * outside the Workers runtime), the helper falls through to the fetcher
 * with no caching. Existing test logic for upstream behavior keeps working
 * because the fetcher path is preserved unchanged.
 */

/**
 * Read a JSON entry from the edge cache. Returns null on miss, on corrupt
 * entry, or when the Cache API is unavailable (e.g. in unit tests).
 *
 * Shape-compatible with `env.KV.get<T>(key, 'json')` so migrations of
 * lazy-proxy caches are a near-1:1 replacement.
 */
export async function readEdgeCacheJSON<T>(cacheKey: string): Promise<T | null> {
  const cache = resolveCache();
  if (!cache) return null;
  const hit = await cache.match(buildCacheRequest(cacheKey));
  if (!hit) return null;
  try {
    return (await hit.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON entry to the edge cache with the given TTL. No-op when the
 * Cache API is unavailable. Shape-compatible with
 * `env.KV.put(key, JSON.stringify(value), { expirationTtl })`.
 */
export async function writeEdgeCacheJSON(cacheKey: string, value: unknown, ttlSeconds: number): Promise<void> {
  const cache = resolveCache();
  if (!cache) return;
  const response = new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `s-maxage=${ttlSeconds}`,
    },
  });
  await cache.put(buildCacheRequest(cacheKey), response);
}

/**
 * Get-or-fetch with edge-cache amortization. Convenience wrapper over the
 * split read/write helpers above. Suited for new code, not retrofits.
 *
 * @param cacheKey logical key. Should be unique per (endpoint, distinct
 *                 query). The helper synthesizes a fake URL from it so
 *                 the Cache API can use Request-based addressing.
 * @param ttlSeconds how long the response is fresh on the edge.
 * @param fetcher upstream fetcher. Called on cache miss. If it throws,
 *                nothing is cached and the throw propagates.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = await readEdgeCacheJSON<T>(cacheKey);
  if (hit !== null) return hit;
  const value = await fetcher();
  await writeEdgeCacheJSON(cacheKey, value, ttlSeconds);
  return value;
}

/**
 * Explicit cache invalidation for a key. Use sparingly; normal TTL
 * expiration is preferred. Returns true on success, false if there was
 * no entry or no cache available.
 */
export async function invalidateCached(cacheKey: string): Promise<boolean> {
  const cache = resolveCache();
  if (!cache) return false;
  return await cache.delete(buildCacheRequest(cacheKey));
}

function resolveCache(): Cache | null {
  try {
    if (typeof caches === 'undefined') return null;
    return caches.default ?? null;
  } catch {
    return null;
  }
}

function buildCacheRequest(cacheKey: string): Request {
  return new Request(`https://tf-edge-cache.internal/v1/${encodeURIComponent(cacheKey)}`, {
    method: 'GET',
  });
}
