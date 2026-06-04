import { describe, it, expect } from 'vitest';
import { OFFICIAL_SURFACES, buildOfficialSurfaces, CANONICAL_PAY_TO } from './official-surfaces';

describe('buildOfficialSurfaces', () => {
  const out = buildOfficialSurfaces();

  it('returns ok and the canonical payment identity', () => {
    expect(out.ok).toBe(true);
    expect(out.payment.pay_to).toBe(CANONICAL_PAY_TO);
    expect(out.payment.pay_to).toBe('0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1');
    expect(out.payment.usdc_contract).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(out.payment.network).toBe('base');
    expect(out.payment.warning.length).toBeGreaterThan(0);
  });

  it('count matches the surface array and is non-trivial', () => {
    expect(out.count).toBe(OFFICIAL_SURFACES.length);
    expect(out.surfaces.length).toBeGreaterThanOrEqual(20);
  });

  it('surfaces are sorted by category then name', () => {
    for (let i = 1; i < out.surfaces.length; i++) {
      const a = out.surfaces[i - 1];
      const b = out.surfaces[i];
      if (a.category === b.category) expect(a.name <= b.name).toBe(true);
      else expect(a.category < b.category).toBe(true);
    }
  });

  it('every surface has non-empty name, identifier, and verify', () => {
    for (const s of out.surfaces) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.identifier.length).toBeGreaterThan(0);
      expect(s.verify.length).toBeGreaterThan(0);
    }
  });

  it('every non-null url is https', () => {
    for (const s of out.surfaces) {
      if (s.url !== null) expect(s.url.startsWith('https://')).toBe(true);
    }
  });

  it('lists no pending/submitted/rejected status anywhere (live-only firewall)', () => {
    const json = JSON.stringify(out).toLowerCase();
    expect(json).not.toContain('pending');
    expect(json).not.toContain('submitted');
    expect(json).not.toContain('rejected');
  });

  it('emits zero em dashes, en dashes, and double hyphens', () => {
    const json = JSON.stringify(out);
    expect(json).not.toContain('—');
    expect(json).not.toContain('–');
    expect(json.includes('--')).toBe(false);
  });
});
