import { describe, it, expect } from 'vitest';
import {
  POLICY_REGISTRY,
  POLICY_REGISTRY_LAST_UPDATED,
  POLICY_ATTRIBUTION,
  readPolicyRegistry,
  validateOptions,
  VALID_JURISDICTIONS,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_SCOPES,
} from './ai-policy-registry';

describe('POLICY_REGISTRY catalog', () => {
  it('holds the full curated set of 28 entries', () => {
    expect(POLICY_REGISTRY.length).toBe(28);
  });

  it('exposes frontier-models as a valid scope', () => {
    expect(VALID_SCOPES).toContain('frontier-models');
  });

  it('uses unique ids', () => {
    const ids = POLICY_REGISTRY.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only valid jurisdictions', () => {
    for (const p of POLICY_REGISTRY) {
      expect(VALID_JURISDICTIONS).toContain(p.jurisdiction);
    }
  });

  it('uses only valid types', () => {
    for (const p of POLICY_REGISTRY) {
      expect(VALID_TYPES).toContain(p.type);
    }
  });

  it('uses only valid statuses', () => {
    for (const p of POLICY_REGISTRY) {
      expect(VALID_STATUSES).toContain(p.status);
    }
  });

  it('uses only valid scopes', () => {
    for (const p of POLICY_REGISTRY) {
      for (const s of p.scope) {
        expect(VALID_SCOPES).toContain(s);
      }
    }
  });

  it('every entry has a source_url', () => {
    for (const p of POLICY_REGISTRY) {
      expect(p.source_url.length).toBeGreaterThan(0);
      expect(p.source_url).toMatch(/^https?:\/\//);
    }
  });

  it('vetoed entries have null effective_date', () => {
    const vetoed = POLICY_REGISTRY.filter(p => p.status === 'vetoed');
    for (const v of vetoed) {
      expect(v.effective_date).toBeNull();
    }
  });

  it('covers at least every major jurisdiction', () => {
    const found = new Set(POLICY_REGISTRY.map(p => p.jurisdiction));
    for (const j of ['US-Federal', 'US-State', 'EU', 'UK', 'China', 'International']) {
      expect(found.has(j as never)).toBe(true);
    }
  });

  it('LAST_UPDATED is an ISO date', () => {
    expect(POLICY_REGISTRY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('validateOptions', () => {
  it('accepts valid filter values', () => {
    const v = validateOptions({ jurisdiction: 'EU', type: 'regulation', status: 'phased', scope: 'high-risk' });
    expect(v.jurisdiction).toBe('EU');
    expect(v.type).toBe('regulation');
    expect(v.status).toBe('phased');
    expect(v.scope).toBe('high-risk');
    expect(v.invalid).toBeUndefined();
  });

  it('reports invalid filter values', () => {
    const v = validateOptions({ jurisdiction: 'Mars', type: 'song' });
    expect(v.jurisdiction).toBeUndefined();
    expect(v.type).toBeUndefined();
    expect(v.invalid).toEqual(expect.arrayContaining(['jurisdiction=Mars', 'type=song']));
  });
});

describe('readPolicyRegistry', () => {
  it('returns the full catalog when no filters', () => {
    const r = readPolicyRegistry();
    expect(r.count).toBe(POLICY_REGISTRY.length);
  });

  it('filters by jurisdiction', () => {
    const r = readPolicyRegistry({ jurisdiction: 'EU' });
    expect(r.policies.every(p => p.jurisdiction === 'EU')).toBe(true);
    expect(r.count).toBeGreaterThan(0);
  });

  it('filters by type', () => {
    const r = readPolicyRegistry({ type: 'executive-order' });
    expect(r.policies.every(p => p.type === 'executive-order')).toBe(true);
  });

  it('filters by status', () => {
    const r = readPolicyRegistry({ status: 'vetoed' });
    expect(r.policies.every(p => p.status === 'vetoed')).toBe(true);
  });

  it('filters by scope', () => {
    const r = readPolicyRegistry({ scope: 'transparency' });
    expect(r.policies.every(p => p.scope.includes('transparency'))).toBe(true);
  });

  it('combines filters', () => {
    const r = readPolicyRegistry({ jurisdiction: 'US-State', status: 'pending' });
    expect(r.policies.every(p => p.jurisdiction === 'US-State' && p.status === 'pending')).toBe(true);
  });

  it('sorts active before rescinded', () => {
    const r = readPolicyRegistry();
    const firstRescinded = r.policies.findIndex(p => p.status === 'rescinded');
    const lastActive = r.policies.map(p => p.status).lastIndexOf('active');
    if (firstRescinded !== -1 && lastActive !== -1) {
      expect(firstRescinded).toBeGreaterThan(lastActive);
    }
  });

  it('attaches attribution', () => {
    const r = readPolicyRegistry();
    expect(r.attribution).toEqual(POLICY_ATTRIBUTION);
  });

  it('silently drops invalid filters but returns no broken state', () => {
    const r = readPolicyRegistry({ jurisdiction: 'Atlantis' });
    expect(r.count).toBe(POLICY_REGISTRY.length);
    expect(r.filters.jurisdiction).toBeUndefined();
  });
});
