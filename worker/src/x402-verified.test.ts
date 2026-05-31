import { describe, it, expect } from 'vitest';
import { SEED_PUBLISHERS, MANUAL_PUBLISHERS, curatedDomains } from './x402-index/constants';
import { isValidPublisherDomain } from './x402-index/publisher-registry';

describe('curated publisher lists are well-formed', () => {
  it('every seed domain is a valid publisher domain', () => {
    for (const d of SEED_PUBLISHERS) expect(isValidPublisherDomain(d)).toBe(true);
  });
  it('every manual domain is valid and every wallet is a lowercase 0x-40-hex', () => {
    for (const m of MANUAL_PUBLISHERS) {
      expect(isValidPublisherDomain(m.domain)).toBe(true);
      expect(m.wallets.length).toBeGreaterThan(0);
      for (const w of m.wallets) expect(/^0x[a-f0-9]{40}$/.test(w)).toBe(true);
      expect(m.note.length).toBeGreaterThan(10);
    }
  });
  it('curatedDomains() dedupes manual domains against seeds', () => {
    const all = curatedDomains();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(SEED_PUBLISHERS.length);
  });
});
