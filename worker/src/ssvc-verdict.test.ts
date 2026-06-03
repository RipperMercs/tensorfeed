import { describe, it, expect } from 'vitest';
import { CISA_SSVC_TREE, cisaSsvcDecision, CISA_SSVC_TREE_VERSION } from './ssvc-verdict';

// The authoritative 36-row CISA SSVC Coordinator v2.0.3 table. Verified three
// independent ways and adversarially audited (2026-06-03). This fixture pins
// the tree; any drift fails CI.
const EXPECTED_TREE: Record<string, string> = {
  'none|no|partial|low': 'Track',
  'none|no|partial|medium': 'Track',
  'none|no|partial|high': 'Track',
  'none|no|total|low': 'Track',
  'none|no|total|medium': 'Track',
  'none|no|total|high': 'Track*',
  'none|yes|partial|low': 'Track',
  'none|yes|partial|medium': 'Track',
  'none|yes|partial|high': 'Attend',
  'none|yes|total|low': 'Track',
  'none|yes|total|medium': 'Track',
  'none|yes|total|high': 'Attend',
  'poc|no|partial|low': 'Track',
  'poc|no|partial|medium': 'Track',
  'poc|no|partial|high': 'Track*',
  'poc|no|total|low': 'Track',
  'poc|no|total|medium': 'Track*',
  'poc|no|total|high': 'Attend',
  'poc|yes|partial|low': 'Track',
  'poc|yes|partial|medium': 'Track',
  'poc|yes|partial|high': 'Attend',
  'poc|yes|total|low': 'Track',
  'poc|yes|total|medium': 'Track*',
  'poc|yes|total|high': 'Attend',
  'active|no|partial|low': 'Track',
  'active|no|partial|medium': 'Track',
  'active|no|partial|high': 'Attend',
  'active|no|total|low': 'Track',
  'active|no|total|medium': 'Attend',
  'active|no|total|high': 'Act',
  'active|yes|partial|low': 'Attend',
  'active|yes|partial|medium': 'Attend',
  'active|yes|partial|high': 'Act',
  'active|yes|total|low': 'Attend',
  'active|yes|total|medium': 'Act',
  'active|yes|total|high': 'Act',
};

describe('CISA SSVC tree', () => {
  it('has exactly 36 entries matching the verified table', () => {
    expect(Object.keys(CISA_SSVC_TREE).length).toBe(36);
    expect({ ...CISA_SSVC_TREE }).toEqual(EXPECTED_TREE);
  });

  it('pins the tree version', () => {
    expect(CISA_SSVC_TREE_VERSION).toBe('2.0.3');
  });

  it('looks up the right cell', () => {
    expect(cisaSsvcDecision({ exploitation: 'none', automatable: 'yes', technical_impact: 'total' }, 'high')).toBe('Attend');
    expect(cisaSsvcDecision({ exploitation: 'active', automatable: 'yes', technical_impact: 'total' }, 'low')).toBe('Attend');
    expect(cisaSsvcDecision({ exploitation: 'active', automatable: 'yes', technical_impact: 'total' }, 'high')).toBe('Act');
  });

  it('is monotonic: urgency never decreases as Mission and Well-being rises', () => {
    const rank: Record<string, number> = { Track: 0, 'Track*': 1, Attend: 2, Act: 3 };
    const exps = ['none', 'poc', 'active'] as const;
    const autos = ['no', 'yes'] as const;
    const tis = ['partial', 'total'] as const;
    for (const e of exps)
      for (const a of autos)
        for (const t of tis) {
          const low = rank[cisaSsvcDecision({ exploitation: e, automatable: a, technical_impact: t }, 'low')];
          const med = rank[cisaSsvcDecision({ exploitation: e, automatable: a, technical_impact: t }, 'medium')];
          const high = rank[cisaSsvcDecision({ exploitation: e, automatable: a, technical_impact: t }, 'high')];
          expect(med).toBeGreaterThanOrEqual(low);
          expect(high).toBeGreaterThanOrEqual(med);
        }
  });
});
