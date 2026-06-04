import { describe, it, expect } from 'vitest';
import {
  AI_DATACENTERS,
  AI_DATACENTERS_LAST_UPDATED,
  DATACENTERS_ATTRIBUTION,
  filterDatacenters,
  buildBuildoutAggregate,
  DatacenterStatus,
  DatacenterPurpose,
  PowerBasis,
  DatacenterConfidence,
} from './ai-datacenters';

const VALID_STATUS = new Set<DatacenterStatus>([
  'announced', 'under_construction', 'operational', 'expansion', 'paused',
]);
const VALID_PURPOSE = new Set<DatacenterPurpose>([
  'training', 'inference', 'mixed', 'unknown',
]);
const VALID_POWER_BASIS = new Set<PowerBasis>([
  'planned', 'operational', 'phase',
]);
const VALID_CONFIDENCE = new Set<DatacenterConfidence>([
  'high', 'medium', 'low',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NO_DASH = /[–—]|--/;

describe('AI_DATACENTERS registry well-formedness', () => {
  it('has entries', () => {
    expect(AI_DATACENTERS.length).toBeGreaterThan(0);
  });

  it('every entry has non-empty required string fields', () => {
    for (const d of AI_DATACENTERS) {
      expect(d.id.length, `id: ${d.id}`).toBeGreaterThan(0);
      expect(d.operator.length, `operator: ${d.id}`).toBeGreaterThan(0);
      expect(d.project_name.length, `project_name: ${d.id}`).toBeGreaterThan(0);
      expect(d.country.length, `country: ${d.id}`).toBeGreaterThan(0);
      expect(d.status.length, `status: ${d.id}`).toBeGreaterThan(0);
      expect(d.source_url.length, `source_url: ${d.id}`).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = AI_DATACENTERS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is kebab-case (lowercase letters, digits, hyphens)', () => {
    for (const d of AI_DATACENTERS) {
      expect(d.id, `id format: ${d.id}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('power_mw is null or > 0', () => {
    for (const d of AI_DATACENTERS) {
      if (d.power_mw !== null) {
        expect(d.power_mw, `power_mw: ${d.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('capex_usd_b is null or > 0', () => {
    for (const d of AI_DATACENTERS) {
      if (d.capex_usd_b !== null) {
        expect(d.capex_usd_b, `capex_usd_b: ${d.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('status is from the enum', () => {
    for (const d of AI_DATACENTERS) {
      expect(VALID_STATUS.has(d.status), `status ${d.status} for ${d.id}`).toBe(true);
    }
  });

  it('purpose is from the enum', () => {
    for (const d of AI_DATACENTERS) {
      expect(VALID_PURPOSE.has(d.purpose), `purpose ${d.purpose} for ${d.id}`).toBe(true);
    }
  });

  it('power_basis is from the enum', () => {
    for (const d of AI_DATACENTERS) {
      expect(VALID_POWER_BASIS.has(d.power_basis), `power_basis ${d.power_basis} for ${d.id}`).toBe(true);
    }
  });

  it('confidence is from the enum', () => {
    for (const d of AI_DATACENTERS) {
      expect(VALID_CONFIDENCE.has(d.confidence), `confidence ${d.confidence} for ${d.id}`).toBe(true);
    }
  });

  it('every source_url starts with https://', () => {
    for (const d of AI_DATACENTERS) {
      expect(d.source_url.startsWith('https://'), `source_url: ${d.id} ${d.source_url}`).toBe(true);
    }
  });

  it('last_checked matches ISO YYYY-MM-DD', () => {
    for (const d of AI_DATACENTERS) {
      expect(d.last_checked, `last_checked: ${d.id}`).toMatch(ISO_DATE_RE);
    }
  });

  it('partners is an array', () => {
    for (const d of AI_DATACENTERS) {
      expect(Array.isArray(d.partners), `partners: ${d.id}`).toBe(true);
    }
  });

  it('has zero em dashes, en dashes, or double-hyphens anywhere (anti-AI-detection rule)', () => {
    const serialized = JSON.stringify(AI_DATACENTERS);
    expect(serialized.match(NO_DASH)?.[0]).toBeUndefined();
  });
});

describe('AI_DATACENTERS_LAST_UPDATED and attribution', () => {
  it('last_updated is an ISO date', () => {
    expect(AI_DATACENTERS_LAST_UPDATED).toMatch(ISO_DATE_RE);
  });

  it('attribution has source and policy strings', () => {
    expect(DATACENTERS_ATTRIBUTION.source.length).toBeGreaterThan(0);
    expect(DATACENTERS_ATTRIBUTION.policy.length).toBeGreaterThan(0);
  });

  it('attribution has no em dashes or double-hyphens', () => {
    expect(JSON.stringify(DATACENTERS_ATTRIBUTION).match(NO_DASH)?.[0]).toBeUndefined();
  });
});

describe('filterDatacenters', () => {
  it('returns every entry with no filter', () => {
    const r = filterDatacenters(AI_DATACENTERS, {});
    expect(r).toHaveLength(AI_DATACENTERS.length);
  });

  it('filters by operator (case-insensitive substring)', () => {
    const r = filterDatacenters(AI_DATACENTERS, { operator: 'meta' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.operator.toLowerCase().includes('meta'))).toBe(true);
  });

  it('filters by status (case-insensitive exact)', () => {
    const r = filterDatacenters(AI_DATACENTERS, { status: 'OPERATIONAL' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.status === 'operational')).toBe(true);
  });

  it('filters by country (case-insensitive exact)', () => {
    const r = filterDatacenters(AI_DATACENTERS, { country: 'us' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.country.toLowerCase() === 'us')).toBe(true);
  });

  it('filters by region (case-insensitive exact)', () => {
    const r = filterDatacenters(AI_DATACENTERS, { region: 'Texas' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.region.toLowerCase() === 'texas')).toBe(true);
  });

  it('filters by purpose (case-insensitive exact)', () => {
    const r = filterDatacenters(AI_DATACENTERS, { purpose: 'training' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.purpose === 'training')).toBe(true);
  });

  it('combines multiple filters', () => {
    const r = filterDatacenters(AI_DATACENTERS, { operator: 'openai', country: 'US' });
    expect(r.every((d) => d.operator.toLowerCase().includes('openai') && d.country.toLowerCase() === 'us')).toBe(true);
  });

  it('sorts operational-first by status priority', () => {
    const r = filterDatacenters(AI_DATACENTERS, {});
    const rank: Record<DatacenterStatus, number> = {
      operational: 0,
      under_construction: 1,
      expansion: 2,
      announced: 3,
      paused: 4,
    };
    for (let i = 1; i < r.length; i++) {
      expect(rank[r[i].status]).toBeGreaterThanOrEqual(rank[r[i - 1].status]);
    }
  });

  it('within a status group sorts by power_mw desc with nulls last', () => {
    const r = filterDatacenters(AI_DATACENTERS, { status: 'under_construction' });
    let seenNull = false;
    let lastPower = Infinity;
    for (const d of r) {
      if (d.power_mw === null) {
        seenNull = true;
      } else {
        expect(seenNull, `non-null power after a null: ${d.id}`).toBe(false);
        expect(d.power_mw).toBeLessThanOrEqual(lastPower);
        lastPower = d.power_mw;
      }
    }
  });

  it('does not mutate the input array', () => {
    const before = AI_DATACENTERS.map((d) => d.id);
    filterDatacenters(AI_DATACENTERS, { status: 'operational' });
    const after = AI_DATACENTERS.map((d) => d.id);
    expect(after).toEqual(before);
  });
});

describe('buildBuildoutAggregate', () => {
  it('reports generated_from as the provided today value', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    expect(agg.generated_from).toBe(AI_DATACENTERS_LAST_UPDATED);
  });

  it('totals.projects equals the entry count', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    expect(agg.totals.projects).toBe(AI_DATACENTERS.length);
  });

  it('sums only disclosed (non-null) power_mw', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const expectedPower = AI_DATACENTERS.reduce((acc, d) => acc + (d.power_mw ?? 0), 0);
    expect(agg.totals.disclosed_power_mw).toBe(expectedPower);
  });

  it('sums only disclosed (non-null) capex_usd_b', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const expectedCapex = AI_DATACENTERS.reduce((acc, d) => acc + (d.capex_usd_b ?? 0), 0);
    expect(agg.totals.disclosed_capex_usd_b).toBe(expectedCapex);
  });

  it('with_power_disclosed counts entries with a non-null power_mw', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const expected = AI_DATACENTERS.filter((d) => d.power_mw !== null).length;
    expect(agg.totals.with_power_disclosed).toBe(expected);
  });

  it('by_status counts add up to the total project count', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const sum = Object.values(agg.by_status).reduce((a, b) => a + b, 0);
    expect(sum).toBe(AI_DATACENTERS.length);
  });

  it('by_purpose counts add up to the total project count', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const sum = Object.values(agg.by_purpose).reduce((a, b) => a + b, 0);
    expect(sum).toBe(AI_DATACENTERS.length);
  });

  it('by_operator project counts add up to the total', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const sum = agg.by_operator.reduce((a, o) => a + o.projects, 0);
    expect(sum).toBe(AI_DATACENTERS.length);
  });

  it('by_region project counts add up to the total', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    const sum = agg.by_region.reduce((a, r) => a + r.projects, 0);
    expect(sum).toBe(AI_DATACENTERS.length);
  });

  it('upcoming excludes operational entries and only includes entries with a first_power', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    for (const u of agg.upcoming) {
      const entry = AI_DATACENTERS.find((d) => d.id === u.id);
      expect(entry, `upcoming id exists: ${u.id}`).toBeDefined();
      expect(entry!.status).not.toBe('operational');
      expect(entry!.first_power).not.toBeNull();
    }
  });

  it('upcoming is sorted by first_power ascending', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    for (let i = 1; i < agg.upcoming.length; i++) {
      expect(agg.upcoming[i].first_power >= agg.upcoming[i - 1].first_power).toBe(true);
    }
  });

  it('carries the attribution reference', () => {
    const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
    expect(agg.attribution).toBe(DATACENTERS_ATTRIBUTION);
  });
});
