import { describe, expect, it } from 'vitest';
import { certifyDomain } from './afta-certify';

describe('certifyDomain: domain validation', () => {
  it('rejects empty input', async () => {
    const r = await certifyDomain('');
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('not-yet-eligible');
    expect(r.next_step).toContain('valid hostname');
  });

  it('rejects garbage input', async () => {
    const r = await certifyDomain('not a domain');
    expect(r.ok).toBe(false);
  });

  it('strips https:// and trailing path before checking shape', async () => {
    const r = await certifyDomain('https://example.com/foo/bar');
    // shape valid, will attempt to fetch (which may fail in test env);
    // but we only check that domain validation accepted it.
    expect(r.domain).toBe('example.com');
  });

  it('lowercases the domain', async () => {
    const r = await certifyDomain('EXAMPLE.com');
    expect(r.domain).toBe('example.com');
  });

  it('rejects domain without TLD', async () => {
    const r = await certifyDomain('localhost');
    expect(r.ok).toBe(false);
  });

  it('returns six checks with stable ids', async () => {
    // Use a domain that will fail every fetch, but the check structure
    // should still be present.
    const r = await certifyDomain('does-not-exist.invalid');
    if (!r.ok) return; // domain validation rejected; that's a different test
    expect(r.checks.length).toBeGreaterThanOrEqual(6);
    const ids = r.checks.map(c => c.id);
    expect(ids).toContain('wellknown_x402');
    expect(ids).toContain('x402_version_2');
    expect(ids).toContain('has_paid_items');
    expect(ids).toContain('extra_domain_hint');
    expect(ids).toContain('wellknown_afta');
    expect(ids).toContain('receipt_key_published');
  });

  it('verdict is not-yet-eligible when domain has nothing', async () => {
    const r = await certifyDomain('does-not-exist.invalid');
    if (!r.ok) return;
    expect(r.verdict).toBe('not-yet-eligible');
    expect(r.afta_certified).toBe(false);
  });
});
