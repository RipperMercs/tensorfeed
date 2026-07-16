import { describe, it, expect } from 'vitest';
import {
  resolveSLA,
  checkStaleness,
  describeSLAs,
  ENDPOINT_FRESHNESS,
  formatMaxAge,
  describe402Freshness,
  responseFreshnessBlock,
} from './freshness';

describe('resolveSLA', () => {
  it('returns null for compute-only endpoints', () => {
    expect(resolveSLA('/api/premium/routing')).toBeNull();
    expect(resolveSLA('/api/premium/cost/projection')).toBeNull();
  });

  it('returns null for historical immutable endpoints', () => {
    expect(resolveSLA('/api/premium/history/pricing/series')).toBeNull();
    expect(resolveSLA('/api/premium/probe/series')).toBeNull();
    expect(resolveSLA('/api/gpu/pricing/series')).toBeNull();
    expect(resolveSLA('/api/premium/mcp/registry/series')).toBeNull();
  });

  it('returns a numeric SLA for live snapshot endpoints', () => {
    expect(resolveSLA('/api/premium/news/search')?.maxAgeSeconds).toBe(30 * 60);
    expect(resolveSLA('/api/premium/whats-new')?.maxAgeSeconds).toBe(60 * 60);
    expect(resolveSLA('/api/premium/agents/directory')?.maxAgeSeconds).toBe(24 * 60 * 60);
  });

  it('matches templated paths via prefix fallback', () => {
    // /api/premium/providers/{name} should resolve via /api/premium/providers
    expect(resolveSLA('/api/premium/providers/anthropic')?.maxAgeSeconds).toBe(24 * 60 * 60);
    expect(resolveSLA('/api/premium/providers/openai')?.maxAgeSeconds).toBe(24 * 60 * 60);
  });

  it('cve-check carries the same 10-day SLA as its stack-safety sibling', () => {
    // Regression guard (2026-07-09 hardening): the paid $1 cve-check had no
    // SLA entry, so a stale CVE batch never triggered the stale no-charge.
    expect(resolveSLA('/api/premium/cve-check')?.maxAgeSeconds).toBe(10 * 24 * 60 * 60);
    expect(resolveSLA('/api/premium/stack-safety-verdict')?.maxAgeSeconds).toBe(10 * 24 * 60 * 60);
  });

  it('returns null for unknown paths', () => {
    expect(resolveSLA('/totally/unknown/path')).toBeNull();
  });
});

describe('checkStaleness', () => {
  it('returns applies=false when SLA is null', () => {
    const r = checkStaleness('/api/premium/routing', '2026-04-01T00:00:00Z');
    expect(r.applies).toBe(false);
    expect(r.stale).toBe(false);
    expect(r.slaSeconds).toBeNull();
  });

  it('returns stale=false when capturedAt is within SLA', () => {
    const now = new Date('2026-04-30T12:00:00Z');
    const captured = '2026-04-30T11:30:00Z';   // 30min ago
    const r = checkStaleness('/api/premium/whats-new', captured, now);   // 1h SLA
    expect(r.applies).toBe(true);
    expect(r.stale).toBe(false);
    expect(r.ageSeconds).toBe(30 * 60);
    expect(r.slaSeconds).toBe(60 * 60);
  });

  it('returns stale=true when capturedAt is past SLA', () => {
    const now = new Date('2026-04-30T12:00:00Z');
    const captured = '2026-04-30T08:00:00Z';   // 4h ago
    const r = checkStaleness('/api/premium/whats-new', captured, now);   // 1h SLA
    expect(r.applies).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.ageSeconds).toBe(4 * 60 * 60);
  });

  it('treats missing capturedAt as fresh (defensive default)', () => {
    const r = checkStaleness('/api/premium/whats-new', null);
    expect(r.applies).toBe(true);
    expect(r.stale).toBe(false);
    expect(r.ageSeconds).toBeNull();
  });

  it('treats unparseable capturedAt as fresh, not stale', () => {
    const r = checkStaleness('/api/premium/whats-new', 'not-a-date');
    expect(r.applies).toBe(true);
    expect(r.stale).toBe(false);
    expect(r.ageSeconds).toBeNull();
  });

  it('clamps negative ages to zero (clock skew defense)', () => {
    const now = new Date('2026-04-30T12:00:00Z');
    const captured = '2026-04-30T13:00:00Z';   // 1h in the future (clock skew)
    const r = checkStaleness('/api/premium/whats-new', captured, now);
    expect(r.ageSeconds).toBe(0);
    expect(r.stale).toBe(false);
  });
});

describe('describeSLAs', () => {
  it('emits a row for every registered endpoint with a human reason', () => {
    const rows = describeSLAs();
    expect(rows.length).toBe(Object.keys(ENDPOINT_FRESHNESS).length);
    for (const row of rows) {
      expect(row).toHaveProperty('endpoint');
      expect(row).toHaveProperty('max_age_seconds');
      expect(row).toHaveProperty('reason');
      expect(typeof row.reason).toBe('string');
    }
  });

  it('reports null max_age for null SLA endpoints', () => {
    const rows = describeSLAs();
    const routing = rows.find(r => r.endpoint === '/api/premium/routing');
    expect(routing?.max_age_seconds).toBeNull();
  });

  it('reports concrete max_age for live-snapshot endpoints', () => {
    const rows = describeSLAs();
    const search = rows.find(r => r.endpoint === '/api/premium/news/search');
    expect(search?.max_age_seconds).toBe(30 * 60);
  });
});

describe('formatMaxAge', () => {
  it('formats sub-hour SLAs in minutes', () => {
    expect(formatMaxAge(30 * 60)).toBe('30 minutes');
    expect(formatMaxAge(10 * 60)).toBe('10 minutes');
  });

  it('uses the singular for exactly one unit', () => {
    expect(formatMaxAge(60)).toBe('1 minute');
    expect(formatMaxAge(60 * 60)).toBe('1 hour');
    expect(formatMaxAge(24 * 60 * 60)).toBe('1 day');
  });

  it('formats SLAs under 48h in hours', () => {
    expect(formatMaxAge(6 * 60 * 60)).toBe('6 hours');
    expect(formatMaxAge(36 * 60 * 60)).toBe('36 hours');
  });

  it('formats SLAs of 48h and up in days', () => {
    expect(formatMaxAge(48 * 60 * 60)).toBe('2 days');
    expect(formatMaxAge(10 * 24 * 60 * 60)).toBe('10 days');
    expect(formatMaxAge(8 * 24 * 60 * 60)).toBe('8 days');
  });
});

describe('describe402Freshness', () => {
  const NO_EM_DASH = /[—–]|--/;

  it('describes an SLA endpoint with the promise, max age, verify, and manifest', () => {
    const f = describe402Freshness('/api/premium/whats-new'); // 1h SLA
    expect(f.max_age_seconds).toBe(60 * 60);
    expect(f.manifest).toBe('/api/freshness');
    expect(typeof f.promise).toBe('string');
    expect(f.promise as string).toContain('1 hour');
    expect(f.promise as string).toContain('not charged');
    expect(f).toHaveProperty('verify');
  });

  it('renders the human duration for a 30-minute SLA endpoint', () => {
    const f = describe402Freshness('/api/premium/news/search'); // 30min SLA
    expect(f.max_age_seconds).toBe(30 * 60);
    expect(f.promise as string).toContain('30 minutes');
  });

  it('describes a null-SLA endpoint honestly with no verify key', () => {
    const f = describe402Freshness('/api/premium/routing'); // compute-only, null SLA
    expect(f.max_age_seconds).toBeNull();
    expect(f.manifest).toBe('/api/freshness');
    expect(f.promise as string).toContain('no wall-clock');
    expect(f).not.toHaveProperty('verify');
  });

  it('resolves templated paths via the same prefix fallback', () => {
    const f = describe402Freshness('/api/premium/providers/anthropic'); // 24h via /providers
    expect(f.max_age_seconds).toBe(24 * 60 * 60);
  });

  it('never emits an em dash or double hyphen (content rule)', () => {
    for (const path of ['/api/premium/whats-new', '/api/premium/routing', '/api/premium/cve-check']) {
      const f = describe402Freshness(path);
      expect(f.promise as string).not.toMatch(NO_EM_DASH);
      if (typeof f.verify === 'string') expect(f.verify).not.toMatch(NO_EM_DASH);
    }
  });
});

describe('responseFreshnessBlock', () => {
  const now = new Date('2026-04-30T12:00:00Z');

  it('fresh SLA response: fresh true, ages populated, sla applies', () => {
    const s = checkStaleness('/api/premium/whats-new', '2026-04-30T11:30:00Z', now); // 30m ago, 1h SLA
    expect(responseFreshnessBlock(s)).toEqual({
      as_of: '2026-04-30T11:30:00Z',
      data_age_seconds: 30 * 60,
      max_age_seconds: 60 * 60,
      fresh: true,
      sla_applies: true,
    });
  });

  it('stale SLA response: fresh false, ages populated', () => {
    const s = checkStaleness('/api/premium/whats-new', '2026-04-30T08:00:00Z', now); // 4h ago, 1h SLA
    const b = responseFreshnessBlock(s);
    expect(b.fresh).toBe(false);
    expect(b.sla_applies).toBe(true);
    expect(b.data_age_seconds).toBe(4 * 60 * 60);
    expect(b.max_age_seconds).toBe(60 * 60);
  });

  it('SLA applies but no capturedAt: fresh true, ages null', () => {
    const s = checkStaleness('/api/premium/whats-new', null, now);
    const b = responseFreshnessBlock(s);
    expect(b.as_of).toBeNull();
    expect(b.data_age_seconds).toBeNull();
    expect(b.max_age_seconds).toBe(60 * 60);
    expect(b.fresh).toBe(true);
    expect(b.sla_applies).toBe(true);
  });

  it('null-SLA endpoint: sla_applies false, fresh null, max age null', () => {
    const s = checkStaleness('/api/premium/routing', '2026-04-01T00:00:00Z', now);
    const b = responseFreshnessBlock(s);
    expect(b.sla_applies).toBe(false);
    expect(b.fresh).toBeNull();
    expect(b.max_age_seconds).toBeNull();
  });
});

describe('paid daily-snapshot endpoints have a billing-freshness SLA', () => {
  it('research/authors and citation-velocity resolve to a finite SLA (no stale-bill gap)', () => {
    expect(resolveSLA('/api/premium/research/authors')?.maxAgeSeconds).toBe(36 * 60 * 60);
    expect(resolveSLA('/api/premium/research/citation-velocity')?.maxAgeSeconds).toBe(36 * 60 * 60);
  });

  it('the generated_at-stamped ai-feeds resolve to a finite SLA (no stale-bill gap)', () => {
    // Both feeds surface their capture time as generated_at and pass it as
    // dataCapturedAt; without a finite SLA the stale no-charge can never fire.
    expect(resolveSLA('/api/premium/security/ghsa/ai-feed')?.maxAgeSeconds).toBe(9 * 60 * 60);
    expect(resolveSLA('/api/premium/apis-guru/ai-feed')?.maxAgeSeconds).toBe(36 * 60 * 60);
  });

  it('merchant legitimacy resolves to a 36h SLA (no stale-bill gap on list snapshots)', () => {
    expect(resolveSLA('/api/premium/merchant/legitimacy')?.maxAgeSeconds).toBe(36 * 60 * 60);
  });
});
