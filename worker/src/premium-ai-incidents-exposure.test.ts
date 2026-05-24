import { describe, it, expect } from 'vitest';
import {
  parseVendor,
  parseRiskDomain,
  parseWithinDays,
  recencyWeight,
  buildExposure,
  MIN_WITHIN_DAYS,
  MAX_WITHIN_DAYS,
} from './premium-ai-incidents-exposure';
import type { AvidEntry, AvidSnapshot } from './avid-fetcher';

// Shared reference clock. UTC midnight to keep day math exact.
const REFERENCE_NOW = new Date('2026-05-24T00:00:00Z');

/**
 * Build a synthetic AvidEntry. Defaults are filled with placeholder values
 * so callers only override what matters for the test.
 */
function makeEntry(partial: Partial<AvidEntry> & Pick<AvidEntry, 'report_id'>): AvidEntry {
  return {
    data_version: '0.3.3',
    reported_date: '',
    developers: [],
    deployers: [],
    artifacts: [],
    problem_class: '',
    problem_type: '',
    description: '',
    risk_domains: [],
    sep_view: [],
    lifecycle_view: [],
    taxonomy_version: '',
    metrics: [],
    references: [],
    credit: [],
    avid_url: `https://github.com/avidml/avid-db/blob/main/reports/2025/${partial.report_id}.json`,
    ...partial,
  };
}

function makeSnapshot(entries: AvidEntry[], capturedAt = '2026-05-24T00:00:00.000Z'): AvidSnapshot {
  return {
    capturedAt,
    source: 'avidml/avid-db',
    source_license: 'MIT',
    fetch_limit: 50,
    entries_count: entries.length,
    entries,
  };
}

// ── parseVendor ────────────────────────────────────────────────────

describe('parseVendor', () => {
  it('returns null on null input', () => {
    expect(parseVendor(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseVendor('')).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseVendor('   ')).toBeNull();
  });

  it('trims surrounding whitespace from valid input', () => {
    expect(parseVendor('  OpenAI  ')).toBe('OpenAI');
  });

  it('returns the value verbatim when already trimmed', () => {
    expect(parseVendor('Anthropic')).toBe('Anthropic');
  });
});

// ── parseRiskDomain ────────────────────────────────────────────────

describe('parseRiskDomain', () => {
  it('returns null on null input', () => {
    expect(parseRiskDomain(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseRiskDomain('')).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseRiskDomain('   ')).toBeNull();
  });

  it('trims surrounding whitespace from valid input', () => {
    expect(parseRiskDomain('  Security  ')).toBe('Security');
  });

  it('returns the value verbatim when already trimmed', () => {
    expect(parseRiskDomain('Ethics')).toBe('Ethics');
  });
});

// ── parseWithinDays ────────────────────────────────────────────────

describe('parseWithinDays', () => {
  it('returns null on null input', () => {
    expect(parseWithinDays(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseWithinDays('')).toBeNull();
  });

  it('returns null on non-numeric input', () => {
    expect(parseWithinDays('not-a-number')).toBeNull();
  });

  it('returns parsed integer within range', () => {
    expect(parseWithinDays('90')).toBe(90);
    expect(parseWithinDays('365')).toBe(365);
  });

  it('clamps below MIN_WITHIN_DAYS (7)', () => {
    expect(parseWithinDays('0')).toBe(MIN_WITHIN_DAYS);
    expect(parseWithinDays('3')).toBe(MIN_WITHIN_DAYS);
  });

  it('clamps above MAX_WITHIN_DAYS (730)', () => {
    expect(parseWithinDays('1000')).toBe(MAX_WITHIN_DAYS);
    expect(parseWithinDays('99999')).toBe(MAX_WITHIN_DAYS);
  });

  it('accepts boundary 7 verbatim', () => {
    expect(parseWithinDays('7')).toBe(7);
  });

  it('accepts boundary 730 verbatim', () => {
    expect(parseWithinDays('730')).toBe(730);
  });
});

// ── recencyWeight ──────────────────────────────────────────────────

describe('recencyWeight', () => {
  it('returns 1.0 for entries reported today', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '2026-05-24' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(1.0);
  });

  it('returns 1.0 for entries reported 30 days ago (boundary)', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '2026-04-24' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(1.0);
  });

  it('returns 0.5 for entries reported 31 days ago', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '2026-04-23' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.5);
  });

  it('returns 0.5 for entries reported 90 days ago (boundary)', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '2026-02-23' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.5);
  });

  it('returns 0.25 for entries reported 91 days ago', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '2026-02-22' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.25);
  });

  it('returns 0.25 for very old entries', () => {
    const e = makeEntry({ report_id: 'AVID-2022-R0001', reported_date: '2022-01-01' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.25);
  });

  it('returns 0.25 for undated entries', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: '' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.25);
  });

  it('returns 0.25 for unparseable reported_date', () => {
    const e = makeEntry({ report_id: 'AVID-2026-R0001', reported_date: 'not-a-date' });
    expect(recencyWeight(e, REFERENCE_NOW)).toBe(0.25);
  });
});

// ── buildExposure ──────────────────────────────────────────────────

describe('buildExposure', () => {
  it('empty snapshot: entries_count 0, empty rows, still ok=true', () => {
    const snapshot = makeSnapshot([]);
    const r = buildExposure(snapshot, { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    expect(r.entries_count).toBe(0);
    expect(r.developers).toEqual([]);
    expect(r.deployers).toEqual([]);
    expect(r.risk_domains).toEqual([]);
    expect(r.sep_view).toEqual([]);
    expect(r.top_artifacts).toEqual([]);
  });

  it('echoes filter back in the response', () => {
    const snapshot = makeSnapshot([]);
    const r = buildExposure(
      snapshot,
      { vendor: 'OpenAI', risk_domain: 'Security', within_days: 90 },
      REFERENCE_NOW,
    );
    expect(r.filter).toEqual({ vendor: 'OpenAI', risk_domain: 'Security', within_days: 90 });
  });

  it('preserves snapshot_captured_at from input snapshot', () => {
    const snapshot = makeSnapshot([], '2026-01-15T12:34:56.000Z');
    const r = buildExposure(snapshot, { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.snapshot_captured_at).toBe('2026-01-15T12:34:56.000Z');
  });

  it('capturedAt is the ISO string of now', () => {
    const snapshot = makeSnapshot([]);
    const r = buildExposure(snapshot, { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.capturedAt).toBe(REFERENCE_NOW.toISOString());
  });

  it('builds a developer row with correct incident_count and recent_count_30d', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['OpenAI'], reported_date: '2026-05-20' }), // 4d ago → recent
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['OpenAI'], reported_date: '2026-05-10' }), // 14d ago → recent
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['OpenAI'], reported_date: '2026-01-01' }), // ~143d → not recent
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const openai = r.developers.find((d) => d.vendor === 'OpenAI');
    expect(openai).toBeDefined();
    expect(openai!.incident_count).toBe(3);
    expect(openai!.recent_count_30d).toBe(2);
    expect(openai!.role).toBe('developer');
  });

  it('builds a deployer row separately from developer rows', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['OpenAI'],
        deployers: ['Microsoft'],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.developers.length).toBe(1);
    expect(r.developers[0].vendor).toBe('OpenAI');
    expect(r.deployers.length).toBe(1);
    expect(r.deployers[0].vendor).toBe('Microsoft');
    expect(r.deployers[0].role).toBe('deployer');
  });

  it('exposure_score is sum of recencyWeight per matching entry, rounded to 2dp', () => {
    const entries = [
      // 1.0 weight (10 days ago)
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '2026-05-14' }),
      // 0.5 weight (60 days ago)
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorA'], reported_date: '2026-03-25' }),
      // 0.25 weight (180 days ago)
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['VendorA'], reported_date: '2025-11-25' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const a = r.developers.find((d) => d.vendor === 'VendorA');
    expect(a!.exposure_score).toBe(1.75);
  });

  it('exposure_score rounds to 2 decimal places', () => {
    // 3 entries × 0.25 weight = 0.75 (already clean).
    // Use one entry with 0.25 weight, then nothing else → 0.25.
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorB'], reported_date: '' }), // 0.25 (undated)
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorB'], reported_date: '' }), // 0.25
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['VendorB'], reported_date: '' }), // 0.25
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const b = r.developers.find((d) => d.vendor === 'VendorB');
    expect(b!.exposure_score).toBe(0.75);
  });

  it('sorts developers by exposure_score desc, then incident_count desc, then vendor name asc', () => {
    const entries = [
      // VendorA: 1 entry × 1.0 = 1.0
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '2026-05-20' }),
      // VendorB: 2 entries × 0.25 = 0.5 (incident_count 2)
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorB'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['VendorB'], reported_date: '' }),
      // VendorC: 2 entries × 0.25 = 0.5 (incident_count 2)
      makeEntry({ report_id: 'AVID-2026-R0004', developers: ['VendorC'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0005', developers: ['VendorC'], reported_date: '' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    // VendorA first (1.0 score); then VendorB and VendorC tied on score+count, name asc.
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorA', 'VendorB', 'VendorC']);
  });

  it('tie-breaks by incident_count desc when exposure_score is equal', () => {
    const entries = [
      // VendorA: 1 entry × 1.0 = 1.0
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '2026-05-24' }),
      // VendorB: 4 entries × 0.25 = 1.0 (more incidents)
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorB'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['VendorB'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0004', developers: ['VendorB'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0005', developers: ['VendorB'], reported_date: '' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorB', 'VendorA']);
  });

  it('risk_domains per vendor: distinct set, sorted', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['VendorA'],
        risk_domains: ['Security', 'Ethics'],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['VendorA'],
        risk_domains: ['Ethics', 'Performance'],
        reported_date: '2026-05-10',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const a = r.developers.find((d) => d.vendor === 'VendorA');
    expect(a!.risk_domains).toEqual(['Ethics', 'Performance', 'Security']);
  });

  it('latest_report_id / latest_reported_date track the chronologically-latest entry', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '2026-03-01' }),
      makeEntry({ report_id: 'AVID-2026-R0050', developers: ['VendorA'], reported_date: '2026-05-15' }),
      makeEntry({ report_id: 'AVID-2026-R0010', developers: ['VendorA'], reported_date: '2026-01-10' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const a = r.developers.find((d) => d.vendor === 'VendorA');
    expect(a!.latest_report_id).toBe('AVID-2026-R0050');
    expect(a!.latest_reported_date).toBe('2026-05-15');
  });

  it('latest_report_id stays empty when all entries are undated', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorA'], reported_date: '' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const a = r.developers.find((d) => d.vendor === 'VendorA');
    expect(a!.latest_report_id).toBe('');
    expect(a!.latest_reported_date).toBe('');
  });

  it('vendor filter: case-insensitive substring match against developer', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['OpenAI'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['Anthropic'], reported_date: '2026-05-20' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: 'openai', risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.developers.map((d) => d.vendor)).toEqual(['OpenAI']);
  });

  it('vendor filter: case-insensitive substring match against deployer', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['OpenAI'],
        deployers: ['Microsoft'],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['Anthropic'],
        deployers: ['Amazon'],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: 'MICROSOFT', risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.deployers.map((d) => d.vendor)).toEqual(['Microsoft']);
  });

  it('vendor filter: case-insensitive substring match against artifact name', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['VendorA'],
        artifacts: [{ type: 'Model', name: 'gpt-4-turbo' }],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['VendorB'],
        artifacts: [{ type: 'Model', name: 'claude-3-opus' }],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: 'gpt-4', risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorA']);
  });

  it('risk_domain filter: matches across risk_domains array', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['VendorA'],
        risk_domains: ['Security', 'Ethics'],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['VendorB'],
        risk_domains: ['Performance'],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: 'ethics', within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorA']);
  });

  it('risk_domain filter: case-insensitive substring', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['VendorA'],
        risk_domains: ['Security'],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: 'SEC', within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
  });

  it('within_days filter: excludes entries older than cutoff', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '2026-05-20' }), // 4d ago
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorB'], reported_date: '2026-02-01' }), // ~112d ago
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: 30 }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorA']);
  });

  it('within_days filter: cutoff_date reflects the window', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: 30 }, REFERENCE_NOW);
    expect(r.window.window_days).toBe(30);
    // 2026-05-24 minus 30 days = 2026-04-24
    expect(r.window.cutoff_date).toBe('2026-04-24');
  });

  it('within_days null: window.cutoff_date is null', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.window.window_days).toBeNull();
    expect(r.window.cutoff_date).toBeNull();
  });

  it('within_days filter: undated entries pass through (cutoff only excludes entries with parseable dates older than cutoff)', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['VendorA'], reported_date: '' }),
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['VendorB'], reported_date: '2026-01-01' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: 30 }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
    expect(r.developers.map((d) => d.vendor)).toEqual(['VendorA']);
  });

  it('sep_view rows: counts by sep_view tag, sorted desc by count', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', sep_view: ['S0100', 'E0200'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0002', sep_view: ['S0100'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0003', sep_view: ['S0100'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0004', sep_view: ['E0200'], reported_date: '2026-05-20' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.sep_view).toEqual([
      { sep_view: 'S0100', incident_count: 3 },
      { sep_view: 'E0200', incident_count: 2 },
    ]);
  });

  it('risk_domains rollup: counts by risk_domain across entries', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        risk_domains: ['Security', 'Ethics'],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        risk_domains: ['Security'],
        reported_date: '2026-01-01',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const sec = r.risk_domains.find((d) => d.risk_domain === 'Security');
    expect(sec!.incident_count).toBe(2);
    expect(sec!.recent_count_30d).toBe(1);
    const eth = r.risk_domains.find((d) => d.risk_domain === 'Ethics');
    expect(eth!.incident_count).toBe(1);
    expect(eth!.recent_count_30d).toBe(1);
  });

  it('top_artifacts: capped at 25 results', () => {
    const entries: AvidEntry[] = [];
    for (let i = 0; i < 30; i++) {
      entries.push(makeEntry({
        report_id: `AVID-2026-R${String(i).padStart(4, '0')}`,
        developers: ['DevX'],
        artifacts: [{ type: 'Model', name: `model-${i}` }],
        reported_date: '2026-05-20',
      }));
    }
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.top_artifacts.length).toBe(25);
  });

  it('top_artifacts: sorted by incident_count desc', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        artifacts: [{ type: 'Model', name: 'low' }],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        artifacts: [{ type: 'Model', name: 'high' }],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0003',
        artifacts: [{ type: 'Model', name: 'high' }],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0004',
        artifacts: [{ type: 'Model', name: 'high' }],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.top_artifacts[0].name).toBe('high');
    expect(r.top_artifacts[0].incident_count).toBe(3);
    expect(r.top_artifacts[1].name).toBe('low');
    expect(r.top_artifacts[1].incident_count).toBe(1);
  });

  it('top_artifacts: developers per artifact deduped + sorted', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['DevB', 'DevA'],
        artifacts: [{ type: 'Model', name: 'shared' }],
        reported_date: '2026-05-20',
      }),
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['DevA', 'DevC'],
        artifacts: [{ type: 'Model', name: 'shared' }],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    const shared = r.top_artifacts.find((a) => a.name === 'shared');
    expect(shared!.developers).toEqual(['DevA', 'DevB', 'DevC']);
  });

  it('attribution.source mentions avidml', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.attribution.source.toLowerCase()).toContain('avidml');
  });

  it('attribution.license mentions MIT', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.attribution.license).toContain('MIT');
  });

  it('attribution.notes is a non-empty string', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(typeof r.attribution.notes).toBe('string');
    expect(r.attribution.notes.length).toBeGreaterThan(0);
  });

  it('source and source_license fields match avidml/avid-db + MIT', () => {
    const r = buildExposure(makeSnapshot([]), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.source).toBe('avidml/avid-db');
    expect(r.source_license).toBe('MIT');
  });

  it('combined vendor + risk_domain + within_days filters all apply', () => {
    const entries = [
      // Matches all: OpenAI, Security, in-window
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['OpenAI'],
        risk_domains: ['Security'],
        reported_date: '2026-05-10',
      }),
      // Right vendor, wrong risk_domain
      makeEntry({
        report_id: 'AVID-2026-R0002',
        developers: ['OpenAI'],
        risk_domains: ['Performance'],
        reported_date: '2026-05-10',
      }),
      // Right vendor, right risk, out of window
      makeEntry({
        report_id: 'AVID-2026-R0003',
        developers: ['OpenAI'],
        risk_domains: ['Security'],
        reported_date: '2025-01-01',
      }),
      // Wrong vendor
      makeEntry({
        report_id: 'AVID-2026-R0004',
        developers: ['Anthropic'],
        risk_domains: ['Security'],
        reported_date: '2026-05-10',
      }),
    ];
    const r = buildExposure(
      makeSnapshot(entries),
      { vendor: 'openai', risk_domain: 'security', within_days: 90 },
      REFERENCE_NOW,
    );
    expect(r.entries_count).toBe(1);
    expect(r.developers[0].vendor).toBe('OpenAI');
  });

  it('developers tied on score+count are sorted vendor name asc', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['Zeta'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['Alpha'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['Mid'], reported_date: '2026-05-20' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.developers.map((d) => d.vendor)).toEqual(['Alpha', 'Mid', 'Zeta']);
  });

  it('risk_domains rollup tie-breaks by risk_domain name asc when counts equal', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', risk_domains: ['Zeta'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0002', risk_domains: ['Alpha'], reported_date: '2026-05-20' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.risk_domains.map((d) => d.risk_domain)).toEqual(['Alpha', 'Zeta']);
  });

  it('entries_count matches the number of entries after filtering', () => {
    const entries = [
      makeEntry({ report_id: 'AVID-2026-R0001', developers: ['OpenAI'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0002', developers: ['Anthropic'], reported_date: '2026-05-20' }),
      makeEntry({ report_id: 'AVID-2026-R0003', developers: ['Google'], reported_date: '2026-05-20' }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: 'openai', risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.entries_count).toBe(1);
  });

  it('multi-vendor entry contributes to all listed developers', () => {
    const entries = [
      makeEntry({
        report_id: 'AVID-2026-R0001',
        developers: ['OpenAI', 'Anthropic', 'Google'],
        reported_date: '2026-05-20',
      }),
    ];
    const r = buildExposure(makeSnapshot(entries), { vendor: null, risk_domain: null, within_days: null }, REFERENCE_NOW);
    expect(r.developers.length).toBe(3);
    for (const d of r.developers) {
      expect(d.incident_count).toBe(1);
      expect(d.exposure_score).toBe(1.0);
    }
  });
});
