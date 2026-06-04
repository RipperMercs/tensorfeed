import { describe, it, expect } from 'vitest';
import { CISA_SSVC_TREE, cisaSsvcDecision, CISA_SSVC_TREE_VERSION, parseSsvcFromVulnrichment, buildSsvcVerdict, redactSsvcVerdictForPreview, checkSsvcVerdictPreviewRateLimit, kevCrossCheck } from './ssvc-verdict';
import { makeEnv, call, seedToken, balanceOf } from './test-harness';

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

const XZ_POINTS = {
  exploitation: 'none' as const,
  automatable: 'yes' as const,
  technical_impact: 'total' as const,
  role: 'CISA Coordinator',
  version: '2.0.3',
  scored_at: '2024-04-02T04:00:23.138684Z',
};

describe('buildSsvcVerdict', () => {
  it('builds the envelope and a medium primary for the xz points', () => {
    const v = buildSsvcVerdict('CVE-2024-3094', XZ_POINTS);
    expect(v.decision_envelope).toEqual({ low: 'Track', medium: 'Track', high: 'Attend' });
    expect(v.decision_primary).toBe('Track');
    expect(v.decision_points).toEqual({ exploitation: 'none', automatable: 'yes', technical_impact: 'total' });
    expect(v.scored_at).toBe('2024-04-02T04:00:23.138684Z');
    expect(v.tree.version).toBe('2.0.3');
    expect(v.reasoning).toHaveLength(3);
    expect(v.reasoning[2]).toMatchObject({ mission_wellbeing: 'high', decision: 'Attend' });
    expect(v.source.record).toBe('/api/security/vulnrichment/CVE-2024-3094');
  });

  it('reaches Act at the worst case', () => {
    const v = buildSsvcVerdict('CVE-0000-0001', {
      ...XZ_POINTS,
      exploitation: 'active',
      automatable: 'yes',
      technical_impact: 'total',
    });
    expect(v.decision_envelope).toEqual({ low: 'Attend', medium: 'Act', high: 'Act' });
    expect(v.decision_primary).toBe('Act');
  });
});

describe('redactSsvcVerdictForPreview', () => {
  it('keeps the points but drops the computed decision', () => {
    const preview = redactSsvcVerdictForPreview(buildSsvcVerdict('CVE-2024-3094', XZ_POINTS)) as unknown as Record<string, unknown>;
    expect(preview.decision_points).toEqual({ exploitation: 'none', automatable: 'yes', technical_impact: 'total' });
    expect(preview.scored_at).toBe('2024-04-02T04:00:23.138684Z');
    expect(preview.preview).toBe(true);
    expect(preview.decision_primary).toBeUndefined();
    expect(preview.decision_envelope).toBeUndefined();
    expect(preview.reasoning).toBeUndefined();
  });
});

describe('checkSsvcVerdictPreviewRateLimit', () => {
  it('allows up to max then blocks, on its own KV key', async () => {
    const env = await makeEnv();
    const ip = '198.51.100.42';
    let last = { allowed: true, remaining: 0, limit: 0 };
    for (let i = 0; i < 3; i++) last = await checkSsvcVerdictPreviewRateLimit(env, ip, 3);
    expect(last).toMatchObject({ allowed: true, remaining: 0, limit: 3 });
    const blocked = await checkSsvcVerdictPreviewRateLimit(env, ip, 3);
    expect(blocked.allowed).toBe(false);
    // A different IP is unaffected.
    const other = await checkSsvcVerdictPreviewRateLimit(env, '198.51.100.43', 3);
    expect(other.allowed).toBe(true);
  });
});

// A minimal vulnrichment record the worker cache returns for CVE-2024-3094,
// so fetchVulnrichment serves it from cache with no network.
const XZ_RECORD = {
  containers: {
    adp: [
      { title: 'CVE Program Container', metrics: [] },
      {
        title: 'CISA ADP Vulnrichment',
        metrics: [
          {
            other: {
              type: 'ssvc',
              content: {
                id: 'CVE-2024-3094',
                role: 'CISA Coordinator',
                options: [{ Exploitation: 'none' }, { Automatable: 'yes' }, { 'Technical Impact': 'total' }],
                version: '2.0.3',
                timestamp: '2024-04-02T04:00:23.138684Z',
              },
            },
          },
        ],
      },
    ],
  },
};

describe('ssvc-verdict preview route', () => {
  it('returns the redacted preview with upgrade + rate_limit, no computed decision', async () => {
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD } });
    const res = await call(env, '/api/preview/security/ssvc-verdict?cve=CVE-2024-3094', { ip: '198.51.100.60' });
    expect(res.status).toBe(200);
    expect(res.json?.decision_points).toEqual({ exploitation: 'none', automatable: 'yes', technical_impact: 'total' });
    expect(res.json?.preview).toBe(true);
    expect(res.json?.decision_primary).toBeUndefined();
    expect((res.json?.upgrade as Record<string, unknown>)?.premium_endpoint).toBe('/api/premium/security/ssvc-verdict');
    expect(res.json?.rate_limit).toBeTruthy();
  });

  it('rejects a bad cve with 400 invalid_cve_id', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/preview/security/ssvc-verdict?cve=notacve', { ip: '198.51.100.61' });
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('invalid_cve_id');
  });

  it('429s past the daily limit', async () => {
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD } });
    const ip = '198.51.100.62';
    let res = await call(env, '/api/preview/security/ssvc-verdict?cve=CVE-2024-3094', { ip });
    for (let i = 0; i < 10; i++) res = await call(env, '/api/preview/security/ssvc-verdict?cve=CVE-2024-3094', { ip });
    expect(res.status).toBe(429);
    expect(res.json?.error).toBe('rate_limit_exceeded');
  });
});

const RECORD_NO_SSVC = {
  containers: { adp: [{ title: 'CISA ADP Vulnrichment', metrics: [{ other: { type: 'cvssV3_1', content: {} } }] }] },
};

describe('ssvc-verdict premium route', () => {
  it('returns the canonical 402 with no token (strict-premium)', async () => {
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD } });
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-3094', { ip: '198.51.100.70' });
    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  it('charges 1 credit and returns the signed verdict on a valid call', async () => {
    const token = 'tf_live_ssvctest_ok';
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD } });
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-3094', { token, ip: '198.51.100.71', settle: true });
    expect(res.status).toBe(200);
    expect(res.json?.decision_primary).toBe('Track');
    expect(res.json?.decision_envelope).toEqual({ low: 'Track', medium: 'Track', high: 'Attend' });
    expect((res.json?.billing as Record<string, unknown>)?.credits_charged).toBe(1);
    expect(res.json?.receipt).toBeTruthy();
    expect(await balanceOf(env, token)).toBe(4);
  });

  it('no-charges invalid_cve_id (400, credit preserved)', async () => {
    const token = 'tf_live_ssvctest_badid';
    const env = await makeEnv();
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=notacve', { token, ip: '198.51.100.72', settle: true });
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('invalid_cve_id');
    expect((res.json?.billing as Record<string, unknown>)?.credits_charged).toBe(0);
    expect(await balanceOf(env, token)).toBe(5);
  });

  it('no-charges no_ssvc_data (404, credit preserved)', async () => {
    const token = 'tf_live_ssvctest_nossvc';
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-9999': RECORD_NO_SSVC } });
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-9999', { token, ip: '198.51.100.73', settle: true });
    expect(res.status).toBe(404);
    expect(res.json?.error).toBe('no_ssvc_data');
    expect(await balanceOf(env, token)).toBe(5);
  });
});

const POINTS_NONE = {
  exploitation: 'none' as const,
  automatable: 'yes' as const,
  technical_impact: 'total' as const,
  role: 'CISA Coordinator',
  version: '2.0.3',
  scored_at: '2024-04-02T04:00:23.138684Z',
};

describe('kevCrossCheck', () => {
  it('reports not-checked when the KEV snapshot is unavailable', () => {
    expect(kevCrossCheck(POINTS_NONE, { available: false, entry: null, catalog_date: null })).toEqual({
      checked: false,
      reason: 'kev_snapshot_unavailable',
    });
  });

  it('reports clean when the CVE is not on KEV', () => {
    expect(kevCrossCheck(POINTS_NONE, { available: true, entry: null, catalog_date: '2026-06-03' })).toEqual({
      checked: true,
      kev_listed: false,
      flag: 'none',
      kev_catalog_date: '2026-06-03',
    });
  });

  it('reports no understatement when recorded Exploitation is already active', () => {
    const r = kevCrossCheck(
      { ...POINTS_NONE, exploitation: 'active' },
      { available: true, entry: { dateAdded: '2024-03-29' }, catalog_date: '2026-06-03' },
    );
    expect(r).toMatchObject({ checked: true, kev_listed: true, flag: 'none', recorded_exploitation: 'active', kev_date_added: '2024-03-29' });
    expect(r.adjusted_primary).toBeUndefined();
  });

  it('flags understatement and recomputes at active for the xz case (none/yes/total)', () => {
    const r = kevCrossCheck(POINTS_NONE, { available: true, entry: { dateAdded: '2024-03-29' }, catalog_date: '2026-06-03' });
    expect(r.checked).toBe(true);
    expect(r.kev_listed).toBe(true);
    expect(r.flag).toBe('exploitation_understated');
    expect(r.recorded_exploitation).toBe('none');
    expect(r.implied_exploitation).toBe('active');
    expect(r.kev_date_added).toBe('2024-03-29');
    expect(r.adjusted_envelope).toEqual({ low: 'Attend', medium: 'Act', high: 'Act' });
    expect(r.adjusted_primary).toBe('Act');
  });

  it('flags understatement when recorded Exploitation is poc', () => {
    const r = kevCrossCheck(
      { ...POINTS_NONE, exploitation: 'poc' },
      { available: true, entry: { dateAdded: '2025-01-28' }, catalog_date: '2026-06-03' },
    );
    expect(r.flag).toBe('exploitation_understated');
    expect(r.recorded_exploitation).toBe('poc');
    expect(r.adjusted_primary).toBe('Act');
  });
});

// Minimal KEV catalog the worker reads from kev:current. Only the fields the
// handler reads are needed: cveID (match), dateAdded (surfaced), dateReleased.
const KEV_CATALOG_WITH_XZ = {
  title: 'CISA Known Exploited Vulnerabilities Catalog',
  catalogVersion: '2026.06.03',
  dateReleased: '2026-06-03',
  count: 1,
  vulnerabilities: [
    { cveID: 'CVE-2024-3094', vendorProject: 'test', product: 'test', vulnerabilityName: 'xz', dateAdded: '2024-03-29', shortDescription: '', requiredAction: '', dueDate: '2024-04-19', knownRansomwareCampaignUse: 'Unknown', notes: '' },
  ],
};
const KEV_CATALOG_EMPTY = { title: 'KEV', catalogVersion: '2026.06.03', dateReleased: '2026-06-03', count: 0, vulnerabilities: [] };

describe('ssvc-verdict premium route: KEV overlay', () => {
  it('flags understatement and recomputes at active when the CVE is on KEV', async () => {
    const token = 'tf_live_ssvctest_kev';
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD, 'kev:current': KEV_CATALOG_WITH_XZ } });
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-3094', { token, ip: '198.51.100.80', settle: true });
    expect(res.status).toBe(200);
    // CISA decision is UNCHANGED.
    expect(res.json?.decision_primary).toBe('Track');
    const x = res.json?.kev_cross_check as Record<string, unknown>;
    expect(x?.checked).toBe(true);
    expect(x?.kev_listed).toBe(true);
    expect(x?.flag).toBe('exploitation_understated');
    expect(x?.adjusted_primary).toBe('Act');
    expect(x?.adjusted_envelope).toEqual({ low: 'Attend', medium: 'Act', high: 'Act' });
    expect(x?.kev_date_added).toBe('2024-03-29');
    expect((res.json?.billing as Record<string, unknown>)?.credits_charged).toBe(1);
  });

  it('reports kev_listed false when the snapshot exists but lacks the CVE', async () => {
    const token = 'tf_live_ssvctest_kevclean';
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD, 'kev:current': KEV_CATALOG_EMPTY } });
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-3094', { token, ip: '198.51.100.81', settle: true });
    expect(res.status).toBe(200);
    const x = res.json?.kev_cross_check as Record<string, unknown>;
    expect(x?.checked).toBe(true);
    expect(x?.kev_listed).toBe(false);
    expect(x?.flag).toBe('none');
  });

  it('degrades gracefully (still 200, still charges) when no KEV snapshot is seeded', async () => {
    const token = 'tf_live_ssvctest_kevmissing';
    const env = await makeEnv({ cache: { 'vulnrichment:CVE-2024-3094': XZ_RECORD } });
    await seedToken(env, token, 5);
    const res = await call(env, '/api/premium/security/ssvc-verdict?cve=CVE-2024-3094', { token, ip: '198.51.100.82', settle: true });
    expect(res.status).toBe(200);
    expect((res.json?.kev_cross_check as Record<string, unknown>)?.checked).toBe(false);
    expect((res.json?.billing as Record<string, unknown>)?.credits_charged).toBe(1);
  });
});
