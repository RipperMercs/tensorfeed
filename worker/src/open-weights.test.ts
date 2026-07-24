import { describe, it, expect } from 'vitest';
import { OPEN_WEIGHTS_CATALOG, OPEN_WEIGHTS_LAST_UPDATED } from './open-weights';

describe('OPEN_WEIGHTS_CATALOG integrity', () => {
  it('has unique model ids', () => {
    const ids = OPEN_WEIGHTS_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every model at a huggingface.co URL', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      expect(m.hfUrl, m.id).toMatch(/^https:\/\/huggingface\.co\/[\w.-]+\/[\w.-]+$/);
    }
  });

  it('keeps active params at or below total params', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      if (m.activeParamsB !== null) {
        expect(m.activeParamsB, m.id).toBeLessThanOrEqual(m.totalParamsB);
      }
    }
  });

  it('gives every model at least one quantization with a positive VRAM figure', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      expect(m.quantizations.length, m.id).toBeGreaterThan(0);
      for (const q of m.quantizations) {
        expect(q.vramGB, `${m.id}/${q.id}`).toBeGreaterThan(0);
        expect(q.quality, `${m.id}/${q.id}`).toBeGreaterThan(0);
        expect(q.quality, `${m.id}/${q.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('sizes VRAM in the right ballpark for the total parameter count', () => {
    // A 4-bit quant needs roughly 0.5 bytes per parameter. Anything below a
    // third of that is a units mistake, not a clever kernel. Guards against
    // sizing VRAM off the active param count on an MoE model.
    for (const m of OPEN_WEIGHTS_CATALOG) {
      const cheapest = Math.min(...m.quantizations.map(q => q.vramGB));
      expect(cheapest, `${m.id} cheapest quant`).toBeGreaterThan(m.totalParamsB * 0.5 * 0.33);
    }
  });

  it('marks weights pending only with an expected date', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      if (!m.weightsAvailable) {
        expect(m.weightsExpected, m.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('uses YYYY-MM release strings', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      expect(m.released, m.id).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('carries no em dashes or double hyphens in editorial copy', () => {
    for (const m of OPEN_WEIGHTS_CATALOG) {
      expect(m.notes, m.id).not.toMatch(/—|--/);
      for (const q of m.quantizations) {
        expect(q.notes, `${m.id}/${q.id}`).not.toMatch(/—|--/);
      }
    }
  });

  it('stamps a plausible lastUpdated date', () => {
    expect(OPEN_WEIGHTS_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
