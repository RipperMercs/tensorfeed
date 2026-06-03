import { describe, it, expect } from 'vitest';
import { CISA_SSVC_TREE, cisaSsvcDecision, CISA_SSVC_TREE_VERSION, parseSsvcFromVulnrichment } from './ssvc-verdict';

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

// Minimal vulnrichment record fixtures (only the fields the parser reads).
function recordWithSsvc(opts: {
  adpIndex: 0 | 1;
  options: Record<string, string>[];
  timestamp?: string;
  role?: string;
  version?: string;
}) {
  const ssvcContainer = {
    title: 'CISA ADP Vulnrichment',
    metrics: [
      {
        other: {
          type: 'ssvc',
          content: {
            id: 'CVE-0000-0000',
            role: opts.role ?? 'CISA Coordinator',
            options: opts.options,
            version: opts.version ?? '2.0.3',
            timestamp: opts.timestamp ?? '2024-04-02T04:00:23.138684Z',
          },
        },
      },
    ],
  };
  const other = { title: 'CVE Program Container', metrics: [] };
  const adp = opts.adpIndex === 0 ? [ssvcContainer, other] : [other, ssvcContainer];
  return { containers: { adp } };
}

describe('parseSsvcFromVulnrichment', () => {
  it('parses points from an adp[1] record (xz shape)', () => {
    const rec = recordWithSsvc({
      adpIndex: 1,
      options: [{ Exploitation: 'none' }, { Automatable: 'yes' }, { 'Technical Impact': 'total' }],
    });
    expect(parseSsvcFromVulnrichment(rec)).toEqual({
      exploitation: 'none',
      automatable: 'yes',
      technical_impact: 'total',
      role: 'CISA Coordinator',
      version: '2.0.3',
      scored_at: '2024-04-02T04:00:23.138684Z',
    });
  });

  it('finds the ssvc block when it is in adp[0] (title-located, not index)', () => {
    const rec = recordWithSsvc({
      adpIndex: 0,
      options: [{ Exploitation: 'none' }, { Automatable: 'no' }, { 'Technical Impact': 'total' }],
    });
    expect(parseSsvcFromVulnrichment(rec)?.automatable).toBe('no');
  });

  it('normalizes value casing', () => {
    const rec = recordWithSsvc({
      adpIndex: 1,
      options: [{ Exploitation: 'Active' }, { Automatable: 'YES' }, { 'Technical Impact': 'Partial' }],
    });
    expect(parseSsvcFromVulnrichment(rec)).toMatchObject({
      exploitation: 'active',
      automatable: 'yes',
      technical_impact: 'partial',
    });
  });

  it('returns null when there is no ssvc block', () => {
    expect(parseSsvcFromVulnrichment({ containers: { adp: [{ title: 'CVE Program Container', metrics: [] }] } })).toBeNull();
  });

  it('returns null when a decision point is missing', () => {
    const rec = recordWithSsvc({ adpIndex: 1, options: [{ Exploitation: 'none' }, { Automatable: 'yes' }] });
    expect(parseSsvcFromVulnrichment(rec)).toBeNull();
  });

  it('returns null when a value is out of enum', () => {
    const rec = recordWithSsvc({
      adpIndex: 1,
      options: [{ Exploitation: 'maybe' }, { Automatable: 'yes' }, { 'Technical Impact': 'total' }],
    });
    expect(parseSsvcFromVulnrichment(rec)).toBeNull();
  });

  it('returns null on a malformed record', () => {
    expect(parseSsvcFromVulnrichment(null)).toBeNull();
    expect(parseSsvcFromVulnrichment({})).toBeNull();
    expect(parseSsvcFromVulnrichment({ containers: { adp: 'nope' } })).toBeNull();
  });
});
