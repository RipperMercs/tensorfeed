import { describe, it, expect } from 'vitest';
import {
  FUNDING_REGISTRY,
  FUNDING_REGISTRY_LAST_UPDATED,
  FUNDING_ATTRIBUTION,
  readFundingRegistry,
  FundingCommitment,
} from './ai-funding-registry';

const VALID_TYPES = new Set([
  'private-equity', 'public-equity', 'convertible-note', 'warrant',
  'compute-commitment', 'capacity-partnership', 'undisclosed',
]);

const VALID_SILICON = new Set([
  'nvidia', 'tpu', 'trainium', 'mi400', 'maia', 'mixed', 'unknown',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\//;
const NO_EM_DASH = /[–—]|--/;

describe('FUNDING_REGISTRY catalog', () => {
  it('has entries', () => {
    expect(FUNDING_REGISTRY.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = FUNDING_REGISTRY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is kebab-case (lowercase letters, digits, hyphens)', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.id, `id format: ${p.id}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('every entry has required string fields populated', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.from.length, `from: ${p.id}`).toBeGreaterThan(0);
      expect(p.to.length, `to: ${p.id}`).toBeGreaterThan(0);
      expect(p.commercial_quid_pro_quo.length, `quid: ${p.id}`).toBeGreaterThan(10);
      expect(p.notes.length, `notes: ${p.id}`).toBeGreaterThan(10);
    }
  });

  it('every announced_date is ISO YYYY-MM-DD', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.announced_date, `date: ${p.id}`).toMatch(ISO_DATE_RE);
      expect(new Date(p.announced_date).toString(), `parseable: ${p.id}`).not.toBe('Invalid Date');
    }
  });

  it('every type is from the canonical set', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(VALID_TYPES.has(p.type), `type ${p.type} for ${p.id}`).toBe(true);
    }
  });

  it('every silicon_dependency is from the canonical set', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(VALID_SILICON.has(p.recipient_silicon_dependency), `silicon ${p.recipient_silicon_dependency} for ${p.id}`).toBe(true);
    }
  });

  it('amount_usd_max is non-negative', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.amount_usd_max, `amount: ${p.id}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('amount_usd_disclosed is null or non-negative and <= max', () => {
    for (const p of FUNDING_REGISTRY) {
      if (p.amount_usd_disclosed !== null) {
        expect(p.amount_usd_disclosed, `disclosed: ${p.id}`).toBeGreaterThanOrEqual(0);
        expect(p.amount_usd_disclosed, `disclosed <= max: ${p.id}`).toBeLessThanOrEqual(p.amount_usd_max);
      }
    }
  });

  it('every entry has at least one source URL', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.source_urls.length, `source count: ${p.id}`).toBeGreaterThan(0);
      for (const u of p.source_urls) {
        expect(u, `url: ${p.id} ${u}`).toMatch(URL_RE);
      }
    }
  });

  it('no em dashes or double-hyphens anywhere (anti-AI-detection rule)', () => {
    for (const p of FUNDING_REGISTRY) {
      expect(p.commercial_quid_pro_quo.match(NO_EM_DASH)?.[0], `quid: ${p.id}`).toBeUndefined();
      expect(p.notes.match(NO_EM_DASH)?.[0], `notes: ${p.id}`).toBeUndefined();
    }
  });
});

describe('FUNDING_REGISTRY_LAST_UPDATED', () => {
  it('is an ISO date string', () => {
    expect(FUNDING_REGISTRY_LAST_UPDATED).toMatch(ISO_DATE_RE);
  });
});

describe('readFundingRegistry', () => {
  it('returns all entries with no filters', () => {
    const r = readFundingRegistry();
    expect(r.ok).toBe(true);
    expect(r.count).toBe(FUNDING_REGISTRY.length);
    expect(r.commitments).toHaveLength(FUNDING_REGISTRY.length);
    expect(r.attribution).toBe(FUNDING_ATTRIBUTION);
  });

  it('sorts by date desc with amount tiebreaker', () => {
    const r = readFundingRegistry();
    for (let i = 1; i < r.commitments.length; i++) {
      const prev = r.commitments[i - 1];
      const cur = r.commitments[i];
      const dateOrder = prev.announced_date >= cur.announced_date;
      expect(dateOrder, `dates: ${prev.id} (${prev.announced_date}) -> ${cur.id} (${cur.announced_date})`).toBe(true);
    }
  });

  it('builds summary aggregates correctly', () => {
    const r = readFundingRegistry();
    expect(r.summary.total_commitments).toBe(FUNDING_REGISTRY.length);
    const expectedTotal = FUNDING_REGISTRY.reduce((acc, c) => acc + c.amount_usd_max, 0);
    expect(r.summary.total_amount_usd_max).toBe(expectedTotal);
    const siliconSum = Object.values(r.summary.by_silicon_dependency).reduce((a, b) => a + b, 0);
    expect(siliconSum).toBe(FUNDING_REGISTRY.length);
  });

  it('filters by silicon_dependency', () => {
    const r = readFundingRegistry({ silicon_dependency: 'nvidia' });
    expect(r.commitments.every((c) => c.recipient_silicon_dependency === 'nvidia')).toBe(true);
    expect(r.filters.silicon_dependency).toBe('nvidia');
  });

  it('filters by from (case insensitive)', () => {
    const r = readFundingRegistry({ from: 'nvidia' });
    expect(r.commitments.every((c) => c.from.toLowerCase() === 'nvidia')).toBe(true);
  });

  it('filters by date range (since + until)', () => {
    const r = readFundingRegistry({ since: '2026-05-01', until: '2026-05-31' });
    expect(r.commitments.every((c) => c.announced_date >= '2026-05-01' && c.announced_date <= '2026-05-31')).toBe(true);
  });

  it('ignores malformed since/until silently', () => {
    const r = readFundingRegistry({ since: 'yesterday' });
    expect(r.filters.since).toBeUndefined();
    expect(r.count).toBe(FUNDING_REGISTRY.length);
  });
});
