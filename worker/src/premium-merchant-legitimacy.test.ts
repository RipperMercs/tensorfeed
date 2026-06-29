import { describe, it, expect } from 'vitest';
import { normalizeDomain } from './premium-merchant-legitimacy';

describe('normalizeDomain', () => {
  it('lowercases and strips scheme, path, port, and www', () => {
    expect(normalizeDomain('HTTPS://WWW.Shop.Example.com:443/cart?x=1')).toBe('shop.example.com');
  });
  it('keeps a bare apex domain', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
  it('rejects junk and empty', () => {
    expect(normalizeDomain('not a domain')).toBeNull();
    expect(normalizeDomain('')).toBeNull();
  });
});
