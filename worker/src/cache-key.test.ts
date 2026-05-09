import { describe, it, expect } from 'vitest';
import { sha256CacheKey } from './cache-key';

describe('sha256CacheKey', () => {
  it('returns a 64-char lowercase hex string', async () => {
    const out = await sha256CacheKey('hello world');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches the well-known SHA-256 of "hello world"', async () => {
    const out = await sha256CacheKey('hello world');
    expect(out).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('is deterministic for the same input', async () => {
    const a = await sha256CacheKey('npm|lodash|4.17.21');
    const b = await sha256CacheKey('npm|lodash|4.17.21');
    expect(a).toBe(b);
  });

  it('produces distinct output for distinct inputs', async () => {
    const a = await sha256CacheKey('npm|lodash|4.17.21');
    const b = await sha256CacheKey('npm|lodash|4.17.22');
    expect(a).not.toBe(b);
  });

  it('handles unicode and long inputs', async () => {
    const long = 'x'.repeat(10_000);
    const out = await sha256CacheKey(long);
    expect(out).toMatch(/^[0-9a-f]{64}$/);

    const unicode = await sha256CacheKey('héllo wörld 🚀');
    expect(unicode).toMatch(/^[0-9a-f]{64}$/);
  });
});
