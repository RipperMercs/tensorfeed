import { describe, expect, it } from 'vitest';
import { LICENSABLE_DATASETS, dataLicensingPayload } from './data-licensing';

describe('LICENSABLE_DATASETS catalog', () => {
  it('every dataset has a complete shape', () => {
    for (const d of LICENSABLE_DATASETS) {
      expect(d.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(40);
      expect(d.targetBuyer.length).toBeGreaterThan(10);
      expect(['daily', 'weekly', 'monthly']).toContain(d.refresh);
      expect(d.suggestedPriceUsd).toBeGreaterThanOrEqual(100);
      expect(d.suggestedPriceUsd).toBeLessThanOrEqual(50_000);
      expect(d.windows.length).toBeGreaterThan(0);
      expect(d.formats.length).toBeGreaterThan(0);
      expect(d.sampleFields.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate ids', () => {
    const ids = LICENSABLE_DATASETS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('payload has the expected envelope', () => {
    const p = dataLicensingPayload();
    expect(p.ok).toBe(true);
    expect(p.source).toBe('tensorfeed.ai');
    expect(p.contact).toBe('contact@tensorfeed.ai');
    expect(p.count).toBe(LICENSABLE_DATASETS.length);
    expect(p.datasets).toBe(LICENSABLE_DATASETS);
    expect(p.process.length).toBeGreaterThanOrEqual(3);
    expect(p.license_type).toContain('inference-only');
  });
});
