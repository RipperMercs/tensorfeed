import { describe, expect, it } from 'vitest';
import { SERVICE_OFFERINGS, servicesPayload } from './professional-services';

describe('SERVICE_OFFERINGS catalog', () => {
  it('every offering has a complete shape', () => {
    for (const o of SERVICE_OFFERINGS) {
      expect(o.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.shortDescription.length).toBeGreaterThan(40);
      expect(o.deliverables.length).toBeGreaterThanOrEqual(2);
      expect(o.priceBand.fromUsd).toBeLessThan(o.priceBand.toUsd);
      expect(o.priceBand.fromUsd).toBeGreaterThanOrEqual(500);
      expect(o.duration.length).toBeGreaterThan(0);
      expect(['fixed-fee', 'retainer', 'hourly', 'one-time']).toContain(o.engagement);
      expect(o.whyTf.length).toBeGreaterThan(50);
    }
  });

  it('no duplicate ids', () => {
    const ids = SERVICE_OFFERINGS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('payload has the expected envelope', () => {
    const p = servicesPayload();
    expect(p.ok).toBe(true);
    expect(p.source).toBe('tensorfeed.ai');
    expect(p.contact).toBe('contact@tensorfeed.ai');
    expect(p.count).toBe(SERVICE_OFFERINGS.length);
    expect(p.payment.accepted).toContain('USDC on Base');
    expect(p.payment.default).toContain('USDC on Base');
  });
});
