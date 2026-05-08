import { describe, expect, it } from 'vitest';
import { PAYMENT_PACKS, paymentPacksPayload } from './payment-packs';

describe('PAYMENT_PACKS catalog', () => {
  it('has at least one starter and one routing pack', () => {
    const ids = PAYMENT_PACKS.map(p => p.id);
    expect(ids).toContain('starter');
    expect(ids).toContain('ai_routing');
  });

  it('every pack has stable shape', () => {
    for (const p of PAYMENT_PACKS) {
      expect(p.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.useCase.length).toBeGreaterThan(20);
      expect(p.suggestedUsd).toBeGreaterThanOrEqual(1);
      expect(p.suggestedUsd).toBeLessThanOrEqual(1000);
      expect(p.approxCredits).toBeGreaterThan(0);
      expect(p.highlightedEndpoints.length).toBeGreaterThan(0);
      expect(p.sampleCall.length).toBeGreaterThan(20);
    }
  });

  it('approxCredits matches volume-tier math at suggestedUsd', () => {
    for (const p of PAYMENT_PACKS) {
      // 50/55/65/80 tiers at 1/5/30/200 USD
      const tier =
        p.suggestedUsd >= 200 ? 80 : p.suggestedUsd >= 30 ? 65 : p.suggestedUsd >= 5 ? 55 : 50;
      const expected = Math.floor(p.suggestedUsd * tier);
      expect(p.approxCredits).toBe(expected);
    }
  });

  it('highlighted endpoints are paths under /api/premium/', () => {
    for (const p of PAYMENT_PACKS) {
      for (const ep of p.highlightedEndpoints) {
        expect(ep.startsWith('/api/premium/')).toBe(true);
      }
    }
  });

  it('paymentPacksPayload returns the expected envelope', () => {
    const payload = paymentPacksPayload();
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe('tensorfeed.ai');
    expect(payload.count).toBe(PAYMENT_PACKS.length);
    expect(payload.packs).toBe(PAYMENT_PACKS);
    expect(payload.note).toContain('fungible');
  });

  it('no duplicate pack ids', () => {
    const ids = PAYMENT_PACKS.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
