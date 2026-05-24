import { describe, it, expect } from 'vitest';
import {
  daysFromNow,
  classifyUrgency,
  resolveMigrationChain,
  buildTimelineEntry,
  parseWithinDays,
  parseProvider,
  buildTimeline,
  type UrgencyBand,
} from './premium-model-deprecations';
import { MODEL_DEPRECATIONS, type ModelDeprecation } from './model-deprecations';

// Shared reference clock. UTC midnight to keep daysFromNow math exact.
const REFERENCE_NOW = new Date('2026-05-24T00:00:00Z');

/**
 * Build a synthetic deprecation entry. Defaults are filled with placeholder
 * values so callers only override what matters for the test.
 */
function makeEntry(overrides: Partial<ModelDeprecation> & Pick<ModelDeprecation, 'id' | 'model'>): ModelDeprecation {
  return {
    provider: 'TestProvider',
    status: 'announced',
    sourceUrl: 'https://example.test/deprecations',
    ...overrides,
  };
}

// ── daysFromNow ────────────────────────────────────────────────────

describe('daysFromNow', () => {
  it('returns null when iso is undefined', () => {
    expect(daysFromNow(undefined, REFERENCE_NOW)).toBeNull();
  });

  it('returns null on unparseable iso input', () => {
    expect(daysFromNow('not-a-date', REFERENCE_NOW)).toBeNull();
  });

  it('returns 0 when iso equals now at UTC midnight', () => {
    expect(daysFromNow('2026-05-24', REFERENCE_NOW)).toBe(0);
  });

  it('returns exact positive day count for future ISO dates', () => {
    expect(daysFromNow('2026-05-31', REFERENCE_NOW)).toBe(7);
  });

  it('returns exact negative day count for past ISO dates', () => {
    expect(daysFromNow('2026-05-17', REFERENCE_NOW)).toBe(-7);
  });

  it('treats iso input as UTC midnight regardless of now hour', () => {
    // now is mid-day; target parsed as 00:00:00Z. Diff is 6.5 days → floor 6.
    const noonNow = new Date('2026-05-24T12:00:00Z');
    expect(daysFromNow('2026-05-31', noonNow)).toBe(6);
  });

  it('floors toward negative for sub-day past offsets', () => {
    const noonNow = new Date('2026-05-24T12:00:00Z');
    // target 2026-05-24T00:00:00Z is 12h before now → -0.5 → floor -1.
    expect(daysFromNow('2026-05-24', noonNow)).toBe(-1);
  });
});

// ── classifyUrgency ────────────────────────────────────────────────

describe('classifyUrgency', () => {
  it('returns no_date when sunsetDate is missing', () => {
    const e = makeEntry({ id: 'x', model: 'x' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('no_date');
  });

  it('returns past for sunsetDate before now', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-05-23' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('past');
  });

  it('returns within_7d when days_until_sunset is 0', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-05-24' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_7d');
  });

  it('returns within_7d on the day-7 boundary', () => {
    // 2026-05-31 = exactly 7 days from REFERENCE_NOW at UTC midnight.
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-05-31' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_7d');
  });

  it('returns within_30d on the day-8 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-06-01' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_30d');
  });

  it('returns within_30d on the day-30 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-06-23' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_30d');
  });

  it('returns within_60d on the day-31 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-06-24' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_60d');
  });

  it('returns within_60d on the day-60 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-07-23' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_60d');
  });

  it('returns within_90d on the day-61 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-07-24' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_90d');
  });

  it('returns within_90d on the day-90 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-08-22' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_90d');
  });

  it('returns within_180d on the day-91 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-08-23' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_180d');
  });

  it('returns within_180d on the day-180 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-11-20' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_180d');
  });

  it('returns within_365d on the day-181 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2026-11-21' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_365d');
  });

  it('returns within_365d on the day-365 boundary', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2027-05-24' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('within_365d');
  });

  it('returns future beyond 365 days', () => {
    const e = makeEntry({ id: 'x', model: 'x', sunsetDate: '2027-05-25' });
    expect(classifyUrgency(e, REFERENCE_NOW)).toBe('future');
  });
});

// ── resolveMigrationChain ──────────────────────────────────────────

describe('resolveMigrationChain', () => {
  it('returns just [startId] when start is not in the registry', () => {
    const chain = resolveMigrationChain('totally-fake-model-id-xyz');
    expect(chain).toEqual(['totally-fake-model-id-xyz']);
  });

  it('returns a 2-element chain when replacement is not itself deprecated', () => {
    // claude-2.0 → claude-3-5-sonnet-20240620 (not in registry as a model row).
    const chain = resolveMigrationChain('claude-2.0');
    expect(chain).toEqual(['claude-2.0', 'claude-3-5-sonnet-20240620']);
  });

  it('resolves text-davinci-003 to its single hop replacement', () => {
    const chain = resolveMigrationChain('text-davinci-003');
    expect(chain).toEqual(['text-davinci-003', 'gpt-3.5-turbo-instruct']);
  });

  it('produces a non-empty chain for every registry entry', () => {
    for (const entry of MODEL_DEPRECATIONS) {
      const chain = resolveMigrationChain(entry.model);
      expect(chain.length).toBeGreaterThanOrEqual(1);
      expect(chain[0]).toBe(entry.model);
    }
  });

  it('always includes the start id as the first element', () => {
    expect(resolveMigrationChain('some-unknown-id')[0]).toBe('some-unknown-id');
    expect(resolveMigrationChain('claude-instant-1.2')[0]).toBe('claude-instant-1.2');
  });
});

// ── buildTimelineEntry ─────────────────────────────────────────────

describe('buildTimelineEntry', () => {
  it('enriches a future-sunset entry with positive days_until_sunset and null days_since_sunset', () => {
    const e = makeEntry({
      id: 'fut',
      model: 'fut',
      deprecationDate: '2026-05-31',
      sunsetDate: '2026-06-30',
    });
    const t = buildTimelineEntry(e, REFERENCE_NOW);
    expect(t.days_until_deprecation).toBe(7);
    expect(t.days_until_sunset).toBe(37);
    expect(t.days_since_sunset).toBeNull();
    expect(t.urgency_band).toBe('within_60d');
  });

  it('enriches a past-sunset entry with positive days_since_sunset', () => {
    const e = makeEntry({ id: 'past', model: 'past', sunsetDate: '2026-05-14' });
    const t = buildTimelineEntry(e, REFERENCE_NOW);
    expect(t.days_until_sunset).toBe(-10);
    expect(t.days_since_sunset).toBe(10);
    expect(t.urgency_band).toBe('past');
  });

  it('leaves all derived fields null-shaped when sunsetDate is absent', () => {
    const e = makeEntry({ id: 'nd', model: 'nd' });
    const t = buildTimelineEntry(e, REFERENCE_NOW);
    expect(t.days_until_sunset).toBeNull();
    expect(t.days_since_sunset).toBeNull();
    expect(t.urgency_band).toBe('no_date');
  });

  it('preserves all original fields via spread', () => {
    const e = makeEntry({
      id: 'orig',
      model: 'orig-model',
      provider: 'TestCo',
      status: 'deprecated',
      announcedDate: '2025-01-01',
      deprecationDate: '2026-01-01',
      sunsetDate: '2026-06-01',
      replacement: 'orig-model-v2',
      notes: 'keep me',
      sourceUrl: 'https://example.test/orig',
      modelDisplay: 'Orig Display',
    });
    const t = buildTimelineEntry(e, REFERENCE_NOW);
    expect(t.id).toBe('orig');
    expect(t.model).toBe('orig-model');
    expect(t.provider).toBe('TestCo');
    expect(t.status).toBe('deprecated');
    expect(t.announcedDate).toBe('2025-01-01');
    expect(t.deprecationDate).toBe('2026-01-01');
    expect(t.sunsetDate).toBe('2026-06-01');
    expect(t.replacement).toBe('orig-model-v2');
    expect(t.notes).toBe('keep me');
    expect(t.sourceUrl).toBe('https://example.test/orig');
    expect(t.modelDisplay).toBe('Orig Display');
  });

  it('attaches a migration_chain for every entry', () => {
    const e = makeEntry({ id: 'mc', model: 'mc-model' });
    const t = buildTimelineEntry(e, REFERENCE_NOW);
    expect(Array.isArray(t.migration_chain)).toBe(true);
    expect(t.migration_chain[0]).toBe('mc-model');
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
    expect(parseWithinDays('abc')).toBeNull();
  });

  it('returns parsed integer within the allowed range', () => {
    expect(parseWithinDays('90')).toBe(90);
    expect(parseWithinDays('365')).toBe(365);
  });

  it('clamps below MIN_WITHIN_DAYS (7)', () => {
    expect(parseWithinDays('0')).toBe(7);
    expect(parseWithinDays('3')).toBe(7);
  });

  it('clamps above MAX_WITHIN_DAYS (730)', () => {
    expect(parseWithinDays('1000')).toBe(730);
    expect(parseWithinDays('99999')).toBe(730);
  });
});

// ── parseProvider ──────────────────────────────────────────────────

describe('parseProvider', () => {
  it('returns null on null input', () => {
    expect(parseProvider(null)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseProvider('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseProvider('  OpenAI  ')).toBe('OpenAI');
  });

  it('returns the value verbatim when already trimmed', () => {
    expect(parseProvider('Anthropic')).toBe('Anthropic');
  });
});

// ── buildTimeline ──────────────────────────────────────────────────

describe('buildTimeline', () => {
  it('returns ok=true and echoes capturedAt as ISO string of now', () => {
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    expect(r.capturedAt).toBe(REFERENCE_NOW.toISOString());
  });

  it('returns all registry entries when no filter is applied', () => {
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW);
    expect(r.total_in_registry).toBe(MODEL_DEPRECATIONS.length);
    expect(r.returned_count).toBe(MODEL_DEPRECATIONS.length);
    expect(r.entries.length).toBe(MODEL_DEPRECATIONS.length);
  });

  it('echoes the filter back in the response', () => {
    const r = buildTimeline({ within_days: 90, provider: 'OpenAI' }, REFERENCE_NOW);
    expect(r.filter).toEqual({ within_days: 90, provider: 'OpenAI' });
  });

  it('provider filter matches case-insensitively as substring', () => {
    const r = buildTimeline({ within_days: null, provider: 'openai' }, REFERENCE_NOW);
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries.every((e) => e.provider === 'OpenAI')).toBe(true);
  });

  it('provider filter that matches nothing returns empty entries but full total_in_registry', () => {
    const r = buildTimeline({ within_days: null, provider: 'nonexistent-provider' }, REFERENCE_NOW);
    expect(r.returned_count).toBe(0);
    expect(r.entries).toEqual([]);
    expect(r.total_in_registry).toBe(MODEL_DEPRECATIONS.length);
  });

  it('within_days filter includes entries within window in either direction', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'past-5', model: 'past-5', sunsetDate: '2026-05-19' }),   // -5 days
      makeEntry({ id: 'fut-10', model: 'fut-10', sunsetDate: '2026-06-03' }),   // +10 days
      makeEntry({ id: 'past-50', model: 'past-50', sunsetDate: '2026-04-04' }), // -50 days
      makeEntry({ id: 'fut-50', model: 'fut-50', sunsetDate: '2026-07-13' }),   // +50 days
    ];
    const r = buildTimeline({ within_days: 30, provider: null }, REFERENCE_NOW, synth);
    const ids = r.entries.map((e) => e.id);
    expect(ids).toContain('past-5');
    expect(ids).toContain('fut-10');
    expect(ids).not.toContain('past-50');
    expect(ids).not.toContain('fut-50');
  });

  it('within_days filter excludes entries with null sunsetDate', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'has-date', model: 'has-date', sunsetDate: '2026-06-01' }),
      makeEntry({ id: 'no-date', model: 'no-date' }),
    ];
    const r = buildTimeline({ within_days: 90, provider: null }, REFERENCE_NOW, synth);
    const ids = r.entries.map((e) => e.id);
    expect(ids).toContain('has-date');
    expect(ids).not.toContain('no-date');
  });

  it('within_days filter excludes entries outside the window in both directions', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'in', model: 'in', sunsetDate: '2026-06-01' }),    // +8 days
      makeEntry({ id: 'far-past', model: 'far-past', sunsetDate: '2024-01-01' }),
      makeEntry({ id: 'far-future', model: 'far-future', sunsetDate: '2030-01-01' }),
    ];
    const r = buildTimeline({ within_days: 60, provider: null }, REFERENCE_NOW, synth);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].id).toBe('in');
  });

  it('combined provider + within_days filters both apply', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'a', model: 'a', provider: 'OpenAI', sunsetDate: '2026-06-01' }),
      makeEntry({ id: 'b', model: 'b', provider: 'OpenAI', sunsetDate: '2030-01-01' }),
      makeEntry({ id: 'c', model: 'c', provider: 'Anthropic', sunsetDate: '2026-06-01' }),
    ];
    const r = buildTimeline({ within_days: 60, provider: 'openai' }, REFERENCE_NOW, synth);
    const ids = r.entries.map((e) => e.id);
    expect(ids).toEqual(['a']);
  });

  it('sorts future entries ascending by days_until_sunset (soonest first)', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'f-30', model: 'f-30', sunsetDate: '2026-06-23' }),
      makeEntry({ id: 'f-5', model: 'f-5', sunsetDate: '2026-05-29' }),
      makeEntry({ id: 'f-90', model: 'f-90', sunsetDate: '2026-08-22' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    expect(r.entries.map((e) => e.id)).toEqual(['f-5', 'f-30', 'f-90']);
  });

  it('places past entries after future entries, sorted most-recent first', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'p-30', model: 'p-30', sunsetDate: '2026-04-24' }),
      makeEntry({ id: 'p-5', model: 'p-5', sunsetDate: '2026-05-19' }),
      makeEntry({ id: 'f-10', model: 'f-10', sunsetDate: '2026-06-03' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    expect(r.entries.map((e) => e.id)).toEqual(['f-10', 'p-5', 'p-30']);
  });

  it('places no_date entries at the bottom of the ordering', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'nd', model: 'nd' }),
      makeEntry({ id: 'fut', model: 'fut', sunsetDate: '2026-06-01' }),
      makeEntry({ id: 'past', model: 'past', sunsetDate: '2026-05-01' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    const ids = r.entries.map((e) => e.id);
    expect(ids[ids.length - 1]).toBe('nd');
    expect(ids).toEqual(['fut', 'past', 'nd']);
  });

  it('summary.by_provider counts match the entries returned', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'a', model: 'a', provider: 'OpenAI', sunsetDate: '2026-06-01' }),
      makeEntry({ id: 'b', model: 'b', provider: 'OpenAI', sunsetDate: '2026-07-01' }),
      makeEntry({ id: 'c', model: 'c', provider: 'Anthropic', sunsetDate: '2026-06-01' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    expect(r.summary.by_provider).toEqual({ OpenAI: 2, Anthropic: 1 });
  });

  it('summary.by_urgency_band has all 9 keys present even when zero', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'a', model: 'a', sunsetDate: '2026-05-30' }), // within_7d only
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    const expectedKeys: UrgencyBand[] = [
      'past',
      'within_7d',
      'within_30d',
      'within_60d',
      'within_90d',
      'within_180d',
      'within_365d',
      'future',
      'no_date',
    ];
    for (const k of expectedKeys) {
      expect(r.summary.by_urgency_band[k]).toBeDefined();
    }
    expect(r.summary.by_urgency_band.within_7d).toBe(1);
    expect(r.summary.by_urgency_band.past).toBe(0);
    expect(r.summary.by_urgency_band.future).toBe(0);
    expect(r.summary.by_urgency_band.no_date).toBe(0);
  });

  it('summary.by_urgency_band counts sum to returned_count', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'a', model: 'a', sunsetDate: '2026-05-30' }),
      makeEntry({ id: 'b', model: 'b', sunsetDate: '2026-07-01' }),
      makeEntry({ id: 'c', model: 'c', sunsetDate: '2026-04-01' }),
      makeEntry({ id: 'd', model: 'd' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    const sum = Object.values(r.summary.by_urgency_band).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.returned_count);
  });

  it('attribution.sources is a non-empty array of URLs', () => {
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW);
    expect(Array.isArray(r.attribution.sources)).toBe(true);
    expect(r.attribution.sources.length).toBeGreaterThan(0);
    for (const url of r.attribution.sources) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('attribution carries license and notes strings', () => {
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW);
    expect(typeof r.attribution.license).toBe('string');
    expect(r.attribution.license.length).toBeGreaterThan(0);
    expect(typeof r.attribution.notes).toBe('string');
    expect(r.attribution.notes.length).toBeGreaterThan(0);
  });

  it('total_in_registry reflects the supplied registry, not the global', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'only', model: 'only', sunsetDate: '2026-06-01' }),
    ];
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW, synth);
    expect(r.total_in_registry).toBe(1);
  });

  it('returned_count can be smaller than total_in_registry when filtering', () => {
    const synth: ModelDeprecation[] = [
      makeEntry({ id: 'a', model: 'a', sunsetDate: '2026-06-01' }),
      makeEntry({ id: 'b', model: 'b', sunsetDate: '2030-01-01' }),
    ];
    const r = buildTimeline({ within_days: 60, provider: null }, REFERENCE_NOW, synth);
    expect(r.total_in_registry).toBe(2);
    expect(r.returned_count).toBe(1);
  });

  it('real-registry smoke check: at least one OpenAI entry surfaces', () => {
    const r = buildTimeline({ within_days: null, provider: 'OpenAI' }, REFERENCE_NOW);
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries.every((e) => e.provider === 'OpenAI')).toBe(true);
  });

  it('real-registry smoke check: every enriched entry has migration_chain of length >= 1', () => {
    const r = buildTimeline({ within_days: null, provider: null }, REFERENCE_NOW);
    for (const e of r.entries) {
      expect(e.migration_chain.length).toBeGreaterThanOrEqual(1);
      expect(e.migration_chain[0]).toBe(e.model);
    }
  });
});
