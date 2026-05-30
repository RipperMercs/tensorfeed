import { describe, it, expect, vi } from 'vitest';
import { deriveUsageEvent, normalizeUaFamily, recordUsageEvent } from './usage-meter';

describe('deriveUsageEvent', () => {
  it('classifies a paid premium 200 as premium/paid', () => {
    expect(deriveUsageEvent('/api/premium/research/emerging-keywords', 200, true))
      .toMatchObject({ path: '/api/premium/research/emerging-keywords', tier: 'premium', outcome: 'paid' });
  });
  it('classifies a premium 402 as premium/unpaid_402', () => {
    expect(deriveUsageEvent('/api/premium/compare/models', 402, false))
      .toMatchObject({ tier: 'premium', outcome: 'unpaid_402' });
  });
  it('classifies a tracked free 200 as free/served_free', () => {
    expect(deriveUsageEvent('/api/news', 200, false))
      .toMatchObject({ tier: 'free', outcome: 'served_free' });
  });
  it('returns null for non-tracked paths (internal/health)', () => {
    expect(deriveUsageEvent('/api/internal/track-bot', 200, false)).toBeNull();
    expect(deriveUsageEvent('/api/admin/usage', 200, false)).toBeNull();
  });
  it('classifies any non-2xx/402 as error outcome', () => {
    expect(deriveUsageEvent('/api/premium/compare/models', 500, false))
      .toMatchObject({ tier: 'premium', outcome: 'error' });
  });
});

describe('normalizeUaFamily', () => {
  it('truncates and strips versions to bound cardinality', () => {
    expect(normalizeUaFamily('axios/1.14.0')).toBe('axios');
    expect(normalizeUaFamily('')).toBe('unknown');
    expect(normalizeUaFamily('python-requests/2.31.0')).toBe('python-requests');
  });
});

describe('recordUsageEvent', () => {
  it('writes one AE data point with the expected shape', () => {
    const writeDataPoint = vi.fn();
    const env = { USAGE_AE: { writeDataPoint } } as unknown as import('./types').Env;
    recordUsageEvent(env, { path: '/api/premium/x', tier: 'premium', outcome: 'paid', wallet: '0xabc', ua: 'axios/1', country: 'US', credits: 1 });
    expect(writeDataPoint).toHaveBeenCalledOnce();
    const dp = writeDataPoint.mock.calls[0][0];
    expect(dp.indexes).toEqual(['/api/premium/x']);
    expect(dp.blobs).toEqual(['/api/premium/x', 'premium', 'paid', '0xabc', 'axios', 'US']);
    expect(dp.doubles).toEqual([1]);
  });
  it('never throws when the binding is missing (best-effort)', () => {
    const env = {} as unknown as import('./types').Env;
    expect(() => recordUsageEvent(env, { path: '/api/news', tier: 'free', outcome: 'served_free', ua: '' })).not.toThrow();
  });
});
