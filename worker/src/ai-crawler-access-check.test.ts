// worker/src/ai-crawler-access-check.test.ts
import { describe, it, expect } from 'vitest';
import { validateCheckDomain } from './ai-crawler-access-check';

describe('validateCheckDomain', () => {
  it('accepts a bare domain', () => {
    expect(validateCheckDomain('example.com')).toEqual({ ok: true, domain: 'example.com' });
  });
  it('strips scheme, www, path, and lowercases', () => {
    expect(validateCheckDomain('HTTPS://www.Example.com/robots.txt')).toEqual({ ok: true, domain: 'example.com' });
  });
  it('accepts a docs subdomain', () => {
    expect(validateCheckDomain('docs.example.co.uk')).toEqual({ ok: true, domain: 'docs.example.co.uk' });
  });
  it('rejects empty / no dot', () => {
    expect(validateCheckDomain('').ok).toBe(false);
    expect(validateCheckDomain('localhost').ok).toBe(false);
  });
  it('rejects IPv4 and IPv6 literals', () => {
    expect(validateCheckDomain('127.0.0.1').ok).toBe(false);
    expect(validateCheckDomain('169.254.169.254').ok).toBe(false);
    expect(validateCheckDomain('[::1]').ok).toBe(false);
  });
  it('rejects internal suffixes and underscores', () => {
    expect(validateCheckDomain('foo.local').ok).toBe(false);
    expect(validateCheckDomain('foo.internal').ok).toBe(false);
    expect(validateCheckDomain('foo.localhost').ok).toBe(false);
    expect(validateCheckDomain('foo_bar.com').ok).toBe(false);
  });
  it('rejects overlong input', () => {
    expect(validateCheckDomain('a.'.repeat(200) + 'com').ok).toBe(false);
  });
});
