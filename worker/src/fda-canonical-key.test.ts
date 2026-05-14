import { describe, expect, it } from 'vitest';
import {
  buildCanonicalIndex,
  canonicalKeyForQuery,
  canonicalKeyWithAliases,
  companyCanonicalKey,
  getFirmAliasMap,
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
    expect(companyCanonicalKey('Medline Industries, LP')).toBe('medline industries');
    expect(companyCanonicalKey('Medline Industries')).toBe('medline industries');
    expect(companyCanonicalKey('Medline Industries LP')).toBe('medline industries');
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
    expect(companyCanonicalKey('Incandescent Labs')).toBe('incandescent labs');
    expect(companyCanonicalKey('LP Industries')).toBe('lp industries');
  });

  it('preserves multi-word names that happen to contain whitespace inside', () => {
    expect(companyCanonicalKey('B. Braun Medical Inc.')).toBe('b braun medical');
    expect(companyCanonicalKey('B Braun Medical Inc')).toBe('b braun medical');
  });

  it('keeps genuinely distinct firms distinct', () => {
    expect(companyCanonicalKey('Apollo Group Inc.')).toBe('apollo group');
    expect(companyCanonicalKey('Apollo Hospitals Ltd')).toBe('apollo hospitals');
    expect(companyCanonicalKey('Apollo Group Inc.')).not.toBe(companyCanonicalKey('Apollo Hospitals Ltd'));
  });

  it('handles international entity types', () => {
    expect(companyCanonicalKey('Roche Holding AG')).toBe('roche holding');
    expect(companyCanonicalKey('Sanofi-Aventis SA')).toBe('sanofi-aventis');
    expect(companyCanonicalKey('Reckitt Benckiser plc')).toBe('reckitt benckiser');
  });

  // Trailing-"and" fix for "X and Company" patterns
  describe('trailing "and" / "&" stripping', () => {
    it('strips trailing "and" left by "and Company"', () => {
      expect(companyCanonicalKey('Becton, Dickinson and Company')).toBe('becton dickinson');
      expect(companyCanonicalKey('Johnson and Johnson Company')).toBe('johnson and johnson');
    });

    it('strips trailing "&" left by "& Co"', () => {
      expect(companyCanonicalKey('Smith & Co')).toBe('smith');
      expect(companyCanonicalKey('Acme & Company')).toBe('acme');
    });

    it('preserves internal "and"/"&" when not trailing', () => {
      expect(companyCanonicalKey('Procter and Gamble Inc.')).toBe('procter and gamble');
      expect(companyCanonicalKey('Black & Decker Corp.')).toBe('black & decker');
    });
  });
});

describe('canonicalKeyWithAliases', () => {
  it('passes through firms not in the alias map', () => {
    expect(canonicalKeyWithAliases('Medline Industries, LP')).toBe('medline industries');
    expect(canonicalKeyWithAliases('Pfizer Inc.')).toBe('pfizer');
    expect(canonicalKeyWithAliases('Apollo Group Inc.')).toBe('apollo group');
  });

  it('is idempotent on alias targets', () => {
    // Applying twice should equal applying once: target keys never source.
    const once = canonicalKeyWithAliases('Aizu Olympus Co., Ltd.');
    const twice = canonicalKeyWithAliases(once);
    expect(once).toBe(twice);
    expect(once).toBe('olympus');
  });

  it('returns empty string for empty input', () => {
    expect(canonicalKeyWithAliases(null)).toBe('');
    expect(canonicalKeyWithAliases('')).toBe('');
  });

  // Batch 2 audit (2026-05-13): 23 cross-batch drift pairs.
  // Each pair must collapse to a single canonical key.
  describe('batch 2 audit drift cases (23 pairs)', () => {
    function assertCollapse(label: string, variants: string[]) {
      it(`collapses ${label}`, () => {
        const keys = variants.map((v) => canonicalKeyWithAliases(v));
        const unique = new Set(keys);
        expect(unique.size).toBe(1);
        expect(keys[0]).not.toBe('');
      });
    }

    // Cases the base function already handles (re-verify with alias layer):
    assertCollapse('Medline Industries', [
      'Medline Industries',
      'Medline Industries Inc.',
      'Medline Industries LP',
      'Medline Industries, LP',
    ]);
    assertCollapse('Beckman Coulter', [
      'Beckman Coulter',
      'Beckman Coulter Inc.',
      'Beckman Coulter, Inc.',
    ]);
    assertCollapse('ICU Medical', ['ICU Medical', 'ICU Medical, Inc.']);
    assertCollapse('Cepheid', ['Cepheid', 'Cepheid Inc.']);
    assertCollapse('Greiner Bio-One', [
      'Greiner Bio-One North America Inc.',
      'Greiner Bio-One North America, Inc.',
    ]);
    assertCollapse('Covidien', ['Covidien', 'Covidien LP']);
    assertCollapse('ASP Global', ['ASP Global LLC', 'ASP Global, LLC.']);
    assertCollapse('AVID Medical', ['AVID Medical Inc.', 'AVID Medical, Inc.']);

    // Parent/subsidiary cases that need the alias map:
    assertCollapse('Olympus + Aizu Olympus', [
      'Aizu Olympus Co. Ltd.',
      'Aizu Olympus Co., Ltd.',
      'Olympus Corporation',
    ]);
    assertCollapse('Medtronic + MiniMed', [
      'Medtronic',
      'Medtronic Inc.',
      'Medtronic MiniMed',
      'Medtronic MiniMed, Inc.',
    ]);
    assertCollapse('Zimmer Biomet family', [
      'Zimmer Biomet',
      'Zimmer, Inc.',
      'Zimmer Inc.',
      'Zimmer Surgical Inc',
      'Zimmer Surgical Inc.',
    ]);
    assertCollapse('Becton Dickinson', [
      'Becton Dickinson',
      'Becton, Dickinson and Company',
    ]);
    assertCollapse('Philips family', [
      'Philips',
      'Philips Inc.',
      'Philips Medical Systems',
      'Philips Medical Systems Nederland B.V.',
      'Philips Medical Systems DMC GmbH',
      'Philips North America LLC',
    ]);
    assertCollapse('Alcon', ['Alcon Inc.', 'Alcon Research LLC']);
    assertCollapse('CareFusion', ['CareFusion', 'CareFusion 303, Inc.']);
    assertCollapse('Fresenius Kabi', ['Fresenius Kabi', 'Fresenius Kabi USA, LLC']);
    assertCollapse('Siemens Healthineers', [
      'Siemens Healthineers',
      'Siemens Medical Solutions USA, Inc.',
      'Siemens Medical Solutions USA Inc',
    ]);
    assertCollapse('Mindray family', [
      'Mindray Medical',
      'Mindray North America',
      'Mindray DS USA, Inc.',
    ]);
    assertCollapse('Cook Medical', ['Cook Incorporated', 'Cook Medical Incorporated']);
  });
});

describe('buildCanonicalIndex', () => {
  it('groups events by canonical key (alias-aware by default)', () => {
    const events = [
      { event_id: 'D-001', company_normalized: 'Medline Industries, LP' },
      { event_id: 'D-002', company_normalized: 'Medline Industries' },
      { event_id: 'D-003', company_normalized: 'Medline Industries LP' },
      { event_id: 'D-004', company_normalized: 'Philips North America' },
      { event_id: 'D-005', company_normalized: 'Philips Medical Systems' },
    ];
    const index = buildCanonicalIndex(events);
    expect(index.get('medline industries')).toEqual(['D-001', 'D-002', 'D-003']);
    // Both Philips variants roll up to the 'philips' parent via alias map.
    expect(index.get('philips')).toEqual(['D-004', 'D-005']);
  });

  it('supports opting out of aliases for audit views', () => {
    const events = [
      { event_id: 'D-001', company_normalized: 'Philips North America' },
      { event_id: 'D-002', company_normalized: 'Philips Medical Systems' },
    ];
    const index = buildCanonicalIndex(events, { useAliases: false });
    expect(index.get('philips north america')).toEqual(['D-001']);
    expect(index.get('philips medical systems')).toEqual(['D-002']);
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
  it('matches alias-aware behavior on user input', () => {
    expect(canonicalKeyForQuery('Medline Industries, LP')).toBe('medline industries');
    expect(canonicalKeyForQuery('medline industries')).toBe('medline industries');
    // A query for a subsidiary hits the parent's bucket.
    expect(canonicalKeyForQuery('Aizu Olympus Co., Ltd.')).toBe('olympus');
    expect(canonicalKeyForQuery('Philips Medical Systems')).toBe('philips');
  });
});

describe('getFirmAliasMap', () => {
  it('returns a non-empty alias snapshot', () => {
    const map = getFirmAliasMap();
    expect(Object.keys(map).length).toBeGreaterThan(10);
    expect(map['aizu olympus']).toBe('olympus');
  });

  it('alias targets are not themselves source keys (idempotency invariant)', () => {
    const map = getFirmAliasMap();
    const sources = new Set(Object.keys(map));
    const targets = new Set(Object.values(map));
    for (const t of targets) {
      expect(sources.has(t)).toBe(false);
    }
  });
});
