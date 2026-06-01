import { describe, expect, it } from 'vitest';
import { newestFlagship, datasetFreshness } from './data-freshness';

const PRICING = {
  lastUpdated: '2026-06-01',
  providers: [
    { models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', released: '2026-05', tier: 'flagship' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', released: '2026-04', tier: 'flagship' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', released: '2026-03', tier: 'mid' },
    ] },
  ],
};

describe('newestFlagship', () => {
  it('returns the latest-released flagship', () => {
    expect(newestFlagship(PRICING)?.name).toBe('Claude Opus 4.8');
  });
  it('returns null for empty catalog', () => {
    expect(newestFlagship({ providers: [] })).toBeNull();
  });
});

describe('datasetFreshness', () => {
  it('flags a dataset that predates the newest flagship', () => {
    const r = datasetFreshness({
      dataset: 'harnesses',
      lastUpdated: '2026-04-30',
      coveredModelNames: ['Claude Opus 4.7', 'GPT-5.5'],
      pricing: PRICING,
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.reason).toContain('Claude Opus 4.8');
    expect(r.newest_catalog_flagship).toBe('Claude Opus 4.8');
  });

  it('is fresh when it covers the newest flagship and is within SLA', () => {
    const r = datasetFreshness({
      dataset: 'models',
      lastUpdated: '2026-06-01',
      coveredModelNames: ['Claude Opus 4.8', 'Claude Opus 4.7'],
      pricing: PRICING,
      slaDays: 7,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(false);
    expect(r.stale).toBe(false);
    expect(r.reason).toBeNull();
  });

  it('flags age-based staleness even when flagship is covered', () => {
    const r = datasetFreshness({
      dataset: 'benchmarks',
      lastUpdated: '2026-01-01',
      coveredModelNames: ['Claude Opus 4.8'],
      pricing: PRICING,
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(false);
    expect(r.stale).toBe(true);
    expect(r.reason).toContain('days old');
    expect(r.age_days).toBeGreaterThan(14);
  });

  it('matches model names case-insensitively', () => {
    const r = datasetFreshness({
      dataset: 'harnesses',
      lastUpdated: '2026-06-01',
      coveredModelNames: ['claude opus 4.8'],
      pricing: PRICING,
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(false);
  });

  it('covers a slug-form flagship from a display-form board name (cross-format)', () => {
    // The live catalog can carry an id-style flagship name while the
    // federation board uses the display form with a reasoning-effort suffix.
    const r = datasetFreshness({
      dataset: 'harnesses',
      lastUpdated: '2026-06-01',
      coveredModelNames: ['Claude Opus 4.8 Thinking', 'Claude Sonnet 4.6'],
      pricing: { providers: [{ models: [{ id: 'claude-opus-4-8', name: 'claude-opus-4-8', released: '2026-05', tier: 'flagship' }] }] },
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.newest_catalog_flagship).toBe('claude-opus-4-8');
    expect(r.predates_flagship).toBe(false);
    expect(r.stale).toBe(false);
  });

  it('treats a reasoning-effort suffix variant as covering the flagship', () => {
    const r = datasetFreshness({
      dataset: 'harnesses',
      lastUpdated: '2026-06-01',
      coveredModelNames: ['Claude Opus 4.8 Thinking'],
      pricing: PRICING,
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(false);
  });

  it('does not false-match a different model that merely shares a prefix', () => {
    const r = datasetFreshness({
      dataset: 'harnesses',
      lastUpdated: '2026-06-01',
      coveredModelNames: ['Claude Opus 4.7 Thinking'],
      pricing: PRICING,
      slaDays: 14,
      now: '2026-06-01T07:00:00.000Z',
    });
    expect(r.predates_flagship).toBe(true);
  });
});
