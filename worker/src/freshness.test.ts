import { describe, it, expect } from 'vitest';
import { resolveSLA, checkStaleness, describeSLAs, ENDPOINT_FRESHNESS } from './freshness';

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
