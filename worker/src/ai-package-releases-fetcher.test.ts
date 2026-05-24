import { describe, it, expect } from 'vitest';
import { parseSemver, classifyBump } from './ai-package-releases-fetcher';

// ── parseSemver ────────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses canonical "1.2.3"', () => {
    const r = parseSemver('1.2.3');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(3);
    expect(r.prerelease).toBeNull();
  });

  it('handles leading v prefix: "v1.2.3"', () => {
    const r = parseSemver('v1.2.3');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(3);
    expect(r.prerelease).toBeNull();
  });

  it('defaults patch to 0 when only "1.2" given', () => {
    const r = parseSemver('1.2');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(0);
    expect(r.prerelease).toBeNull();
  });

  it('captures dash-prefixed prerelease: "1.2.3-rc1"', () => {
    const r = parseSemver('1.2.3-rc1');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(3);
    expect(r.prerelease).toBe('-rc1');
  });

  it('captures dot-prefixed postfix: "0.27.0.post1"', () => {
    const r = parseSemver('0.27.0.post1');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(0);
    expect(r.minor).toBe(27);
    expect(r.patch).toBe(0);
    expect(r.prerelease).toBe('.post1');
  });

  it('returns valid=false on completely unparseable "garbage"', () => {
    const r = parseSemver('garbage');
    expect(r.valid).toBe(false);
  });

  it('returns valid=false on empty string', () => {
    const r = parseSemver('');
    expect(r.valid).toBe(false);
  });

  it('returns valid=false on "1" alone (regex requires major + minor)', () => {
    const r = parseSemver('1');
    expect(r.valid).toBe(false);
  });

  it('trims leading + trailing whitespace before parsing', () => {
    const r = parseSemver('  1.2.3  ');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(3);
  });

  it('captures plus-prefixed build metadata: "1.2.3+build5"', () => {
    const r = parseSemver('1.2.3+build5');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(2);
    expect(r.patch).toBe(3);
    expect(r.prerelease).toBe('+build5');
  });

  it('handles multi-digit numeric parts: "10.20.30"', () => {
    const r = parseSemver('10.20.30');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(10);
    expect(r.minor).toBe(20);
    expect(r.patch).toBe(30);
  });

  it('returns invalid defaults (zeros) when unparseable', () => {
    const r = parseSemver('not-a-version');
    expect(r.valid).toBe(false);
    expect(r.major).toBe(0);
    expect(r.minor).toBe(0);
    expect(r.patch).toBe(0);
    expect(r.prerelease).toBeNull();
  });

  it('parses "0.0.0" as valid (all zeros)', () => {
    const r = parseSemver('0.0.0');
    expect(r.valid).toBe(true);
    expect(r.major).toBe(0);
    expect(r.minor).toBe(0);
    expect(r.patch).toBe(0);
  });
});

// ── classifyBump ───────────────────────────────────────────────────

describe('classifyBump', () => {
  it('major bump: 1.2.3 -> 2.0.0', () => {
    expect(classifyBump('1.2.3', '2.0.0')).toBe('major');
  });

  it('minor bump: 1.2.3 -> 1.3.0', () => {
    expect(classifyBump('1.2.3', '1.3.0')).toBe('minor');
  });

  it('patch bump: 1.2.3 -> 1.2.4', () => {
    expect(classifyBump('1.2.3', '1.2.4')).toBe('patch');
  });

  it('prerelease bump: same x.y.z + different prerelease tag', () => {
    expect(classifyBump('1.2.3', '1.2.3-rc1')).toBe('prerelease');
  });

  it('sideways: major downgrade 2.0.0 -> 1.5.0', () => {
    expect(classifyBump('2.0.0', '1.5.0')).toBe('sideways');
  });

  it('unknown when "from" is garbage', () => {
    expect(classifyBump('garbage', '1.0.0')).toBe('unknown');
  });

  it('unknown when "to" is garbage', () => {
    expect(classifyBump('1.0.0', 'garbage')).toBe('unknown');
  });

  it('pre-1.0 minor bump treated as major: 0.1.0 -> 0.2.0', () => {
    expect(classifyBump('0.1.0', '0.2.0')).toBe('major');
  });

  it('pre-1.0 patch bump treated as patch: 0.1.0 -> 0.1.1', () => {
    expect(classifyBump('0.1.0', '0.1.1')).toBe('patch');
  });

  it('crossing the 1.0 boundary is a major bump: 0.5.0 -> 1.0.0', () => {
    expect(classifyBump('0.5.0', '1.0.0')).toBe('major');
  });

  it('identical versions fall to prerelease branch: 2.5.0 -> 2.5.0', () => {
    expect(classifyBump('2.5.0', '2.5.0')).toBe('prerelease');
  });

  it('sideways when minor decreases at same major: 1.5.0 -> 1.2.0', () => {
    expect(classifyBump('1.5.0', '1.2.0')).toBe('sideways');
  });

  it('sideways when patch decreases at same major+minor: 1.2.5 -> 1.2.3', () => {
    expect(classifyBump('1.2.5', '1.2.3')).toBe('sideways');
  });

  it('unknown when both sides are garbage', () => {
    expect(classifyBump('garbage', 'rubbish')).toBe('unknown');
  });

  it('major bump 0.5.0 -> 2.0.0 (cross-major in pre-1.0 range)', () => {
    expect(classifyBump('0.5.0', '2.0.0')).toBe('major');
  });

  it('handles v-prefixed inputs: v1.2.3 -> v1.3.0 is minor', () => {
    expect(classifyBump('v1.2.3', 'v1.3.0')).toBe('minor');
  });

  it('handles postfix prerelease: 0.27.0 -> 0.27.0.post1 is prerelease', () => {
    expect(classifyBump('0.27.0', '0.27.0.post1')).toBe('prerelease');
  });
});
