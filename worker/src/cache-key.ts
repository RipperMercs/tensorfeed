/**
 * SHA-256 cache-key derivation for KV cache keys.
 *
 * Replaces the prior FNV-32 helpers used per-module. FNV-1a is fast and
 * fine for hash maps but is trivially collidable across a 32-bit output:
 * an attacker with the cache-key construction recipe in hand can craft
 * an input that hashes to the same key as a high-value lookup, then
 * pre-fill our KV cache with their preferred upstream response and
 * cause subsequent legitimate queries to read poisoned data for the
 * full TTL window. SHA-256 is collision-resistant under any known
 * model, so this attack collapses.
 *
 * Output is hex of the full 32-byte digest. KV keys have generous
 * length limits and the extra bytes are inconsequential.
 *
 * Async because Web Crypto's digest() is async; callers must await.
 */

const encoder = new TextEncoder();

export async function sha256CacheKey(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}
