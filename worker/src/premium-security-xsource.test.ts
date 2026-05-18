import { describe, it, expect } from 'vitest';
import {
  resolvePackage,
  computeSecurityXsource,
} from './premium-security-xsource';
import { getSecurityXsource } from './data-security-xsource';

// ── resolvePackage (pure, data-independent) ────────────────────────

describe('resolvePackage', () => {
  const keys = [
    'apachecommonstext',
    'lodash',
    'lodashes',
    'springframework',
    'log4jcore',
  ];

  it('exact normalized match wins', () => {
    expect(resolvePackage('lodash', keys)).toBe('lodash');
    expect(resolvePackage('LoDash', keys)).toBe('lodash');
  });

  it('loose match resolves punctuation and spacing', () => {
    expect(resolvePackage('Apache Commons Text', keys)).toBe('apachecommonstext');
    expect(resolvePackage('commons-text', keys)).toBe('apachecommonstext');
    expect(resolvePackage('log4j-core', keys)).toBe('log4jcore');
  });

  it('is conservative: an over-qualified query longer than the key does NOT match (mirrors resolveVendor; the error path then returns available_package_sample to guide the agent)', () => {
    expect(resolvePackage('org.apache.commons:commons-text', keys)).toBeNull();
  });

  it('returns null on no match and on empty input', () => {
    expect(resolvePackage('not-a-real-package', keys)).toBeNull();
    expect(resolvePackage('', keys)).toBeNull();
    expect(resolvePackage('   ', keys)).toBeNull();
  });

  it('is deterministic: shortest canonical key wins, ties alphabetical', () => {
    // "lodash" is a prefix of both "lodash" and "lodashes"; exact wins.
    expect(resolvePackage('lodash', keys)).toBe('lodash');
    const amb = ['foo', 'foobar', 'foobaz'];
    expect(resolvePackage('foo', amb)).toBe('foo');
    expect(resolvePackage('foo', amb)).toBe('foo'); // stable across calls
  });
});

// ── computeSecurityXsource ─────────────────────────────────────────

describe('computeSecurityXsource', () => {
  it('returns missing_package when no query', () => {
    const r = computeSecurityXsource(null);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('missing_package');
      expect(r.hint).toBeTruthy();
    }
  });

  it('returns missing_package on blank query', () => {
    const r = computeSecurityXsource('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('missing_package');
  });

  it('returns package_not_found with a hint for an unknown package', () => {
    const r = computeSecurityXsource('definitely-not-in-the-dataset-xyz');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('package_not_found');
      expect(r.hint).toContain('security-xsource');
    }
  });

  // Data-bearing happy-path assertions run once a real backfill is
  // bundled (the committed dataset module is regenerated from the
  // bridge-delivered corroboration.jsonl). This walks whatever IS
  // bundled and enforces the honesty/provenance contract on it, so it
  // is meaningful for both the empty skeleton and the real payload.
  it('bundled dataset honors the provenance + honesty contract', () => {
    const data = getSecurityXsource();
    expect(data.meta.dataset).toBe('security-xsource');
    expect(data.meta.tier).toBe('premium');
    // The honest claim must never imply we verify exploitation/severity.
    expect(data.meta.claim).toMatch(/do NOT verify/i);
    expect(data.meta.claim.toLowerCase()).not.toContain(
      'we verify the advisory',
    );
    for (const key of Object.keys(data.packages)) {
      for (const adv of data.packages[key].advisories) {
        expect(['corroborated', 'novel', 'unverifiable']).toContain(
          adv.overall, // excluded/extraction_suspect are never bundled
        );
        expect(adv).toHaveProperty('corroborated_claim');
        expect(adv).toHaveProperty('deterministic_enrichment');
        expect(adv).toHaveProperty('verbatim_context');
      }
    }
  });

  it('a resolved package returns its advisory set with the claim surfaced', () => {
    const data = getSecurityXsource();
    const keys = Object.keys(data.packages);
    if (keys.length === 0) return; // empty skeleton: nothing to resolve yet
    const display = data.packages[keys[0]].package_display;
    const r = computeSecurityXsource(display);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.advisory_count).toBe(r.advisories.length);
      expect(r.claim).toMatch(/do NOT verify/i);
      expect(r.matched_package).toBe(display);
    }
  });
});
