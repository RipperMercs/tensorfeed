import { describe, expect, it } from 'vitest';
import {
  buildCanonicalIndex,
  canonicalKeyForQuery,
  companyCanonicalKey,
} from './fda-canonical-key';

describe('companyCanonicalKey', () => {
  it('returns empty string for null/undefined/non-string', () => {
    expect(companyCanonicalKey(null)).toBe('');
    expect(companyCanonicalKey(undefined)).toBe('');
    expect(companyCanonicalKey('')).toBe('');
    expect(companyCanonicalKey('   ')).toBe('');
  });

  it('lowercases', () => {
    expect(companyCanonicalKey('PHILIPS NORTH AMERICA')).toBe('philips north america');
  });

  it('strips trailing comma + period variants together', () => {
    expect(companyCanonicalKey('Foundation Medicine, Inc.')).toBe('foundation medicine');
    expect(companyCanonicalKey('Foundation Medicine Inc.')).toBe('foundation medicine');
    expect(companyCanonicalKey('Foundation Medicine Inc')).toBe('foundation medicine');
    expect(companyCanonicalKey('Foundation Medicine, Inc')).toBe('foundation medicine');
  });

  it('collapses the Medline drift case to a single key', () => {
    const key = companyCanonicalKey('Medline Industries, LP');
    expect(key).toBe('medline industries');
    expect(companyCanonicalKey('Medline Industries')).toBe('medline industries');
    expect(companyCanonicalKey('Medline Industries LP')).toBe('medline industries');
    expect(companyCanonicalKey('Medline Industries, LP')).toBe('medline industries');
    expect(companyCanonicalKey('MEDLINE INDUSTRIES, LP')).toBe('medline industries');
  });

  it('collapses the Arrow International drift case', () => {
    expect(companyCanonicalKey('Arrow International, LLC')).toBe('arrow international');
    expect(companyCanonicalKey('Arrow International LLC')).toBe('arrow international');
    expect(companyCanonicalKey('ARROW INTERNATIONAL, LLC')).toBe('arrow international');
  });

  it('handles iterated suffix stripping (e.g. Foo Inc Ltd)', () => {
    expect(companyCanonicalKey('Foo Inc Ltd')).toBe('foo');
    expect(companyCanonicalKey('Bar Corporation Inc.')).toBe('bar');
  });

  it('does NOT strip suffix-like substrings inside the name', () => {
    // "incandescent" contains "inc" but is not the trailing whole word.
    expect(companyCanonicalKey('Incandescent Labs')).toBe('incandescent labs');
    expect(companyCanonicalKey('LP Industries')).toBe('lp industries');
  });

  it('preserves multi-word names that happen to contain whitespace inside', () => {
    expect(companyCanonicalKey('B. Braun Medical Inc.')).toBe('b braun medical');
    expect(companyCanonicalKey('B Braun Medical Inc')).toBe('b braun medical');
  });

  it('keeps genuinely distinct firms distinct', () => {
    // Two different firms that share a single token should NOT collapse
    expect(companyCanonicalKey('Apollo Group Inc.')).toBe('apollo group');
    expect(companyCanonicalKey('Apollo Hospitals Ltd')).toBe('apollo hospitals');
    expect(companyCanonicalKey('Apollo Group Inc.')).not.toBe(companyCanonicalKey('Apollo Hospitals Ltd'));
  });

  it('handles international entity types', () => {
    expect(companyCanonicalKey('Roche Holding AG')).toBe('roche holding');
    expect(companyCanonicalKey('Sanofi-Aventis SA')).toBe('sanofi-aventis');
    expect(companyCanonicalKey('Reckitt Benckiser plc')).toBe('reckitt benckiser');
  });
});

describe('buildCanonicalIndex', () => {
  it('groups events by canonical key', () => {
    const events = [
      { event_id: 'D-001', company_normalized: 'Medline Industries, LP' },
      { event_id: 'D-002', company_normalized: 'Medline Industries' },
      { event_id: 'D-003', company_normalized: 'Medline Industries LP' },
      { event_id: 'D-004', company_normalized: 'Philips North America' },
    ];
    const index = buildCanonicalIndex(events);
    expect(index.get('medline industries')).toEqual(['D-001', 'D-002', 'D-003']);
    expect(index.get('philips north america')).toEqual(['D-004']);
  });

  it('buckets events with no company_normalized under __unknown__', () => {
    const events = [
      { event_id: 'X-001', company_normalized: null as string | null },
      { event_id: 'X-002', company_normalized: '' },
      { event_id: 'D-001', company_normalized: 'Pfizer Inc.' },
    ];
    const index = buildCanonicalIndex(events);
    expect(index.get('__unknown__')).toEqual(['X-001', 'X-002']);
    expect(index.get('pfizer')).toEqual(['D-001']);
  });
});

describe('canonicalKeyForQuery', () => {
  it('matches companyCanonicalKey behavior on user input', () => {
    expect(canonicalKeyForQuery('Medline Industries, LP')).toBe('medline industries');
    expect(canonicalKeyForQuery('medline industries')).toBe('medline industries');
    // User typing variants for the same firm all hit the same bucket
    expect(canonicalKeyForQuery('MEDLINE')).toBe('medline');
    // (MEDLINE alone is a different bucket from "medline industries"
    // by design; we do not do substring matching, only exact canonical
    // key match. The timeline endpoint should pick that trade-off.)
  });
});
