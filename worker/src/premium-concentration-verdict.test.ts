import { describe, it, expect } from 'vitest';
import {
  buildConcentrationVerdict,
  parseProviders,
  normalizeProvider,
} from './premium-concentration-verdict';
import type {
  ReliabilityVerdictResult,
  ReliabilityRankEntry,
} from './premium-provider-reliability-verdict';
import type { ServiceStatus } from './types';

const NOW = new Date('2026-06-06T12:00:00Z');

function rankEntry(provider: string, rank: number, score: number): ReliabilityRankEntry {
  return {
    rank,
    provider,
    ok_pct: 0.99,
    total_p50_ms: 100,
    total_p95_ms: 200,
    total_p99_ms: 300,
    spread_ratio: 2,
    reliability_score: score,
    measured: true,
    note: 'measured',
  };
}

function rel(entries: ReliabilityRankEntry[]): ReliabilityVerdictResult {
  return {
    ok: true,
    capturedAt: '2026-06-06T11:50:00Z',
    window_label: '24h',
    verdict: {
      most_dependable: entries[0]?.provider ?? null,
      riskiest: entries.length >= 2 ? entries[entries.length - 1].provider : null,
    },
    ranking: entries,
    coverage: { providers_ranked: entries.length, fully_measured: entries.length, availability_only: 0 },
    claim: 'claim',
    notes: [],
    attribution: { sources: [], license: 'measured' },
  };
}

function svc(provider: string, status: ServiceStatus['status']): ServiceStatus {
  return {
    name: provider,
    provider,
    status,
    statusPageUrl: 'https://status.example.com',
    components: [],
    lastChecked: '2026-06-06T11:55:00Z',
  };
}

const RANKING = rel([
  rankEntry('OpenAI', 1, 0.98),
  rankEntry('Anthropic', 2, 0.97),
  rankEntry('Google', 3, 0.95),
  rankEntry('AWS', 4, 0.94),
]);

const ALL_OK: ServiceStatus[] = [
  svc('OpenAI', 'operational'),
  svc('Anthropic', 'operational'),
  svc('Google', 'operational'),
  svc('AWS', 'operational'),
];

describe('parseProviders', () => {
  it('splits, trims, and dedupes a comma list', () => {
    expect(parseProviders('openai, anthropic ,openai,,google')).toEqual(['openai', 'anthropic', 'google']);
  });
  it('returns empty for null or blank', () => {
    expect(parseProviders(null)).toEqual([]);
    expect(parseProviders('  ,  ')).toEqual([]);
  });
});

describe('normalizeProvider', () => {
  it('strips case and non-alphanumerics', () => {
    expect(normalizeProvider('Microsoft Azure')).toBe('microsoftazure');
    expect(normalizeProvider('OpenAI')).toBe('openai');
  });
});

describe('/api/premium/resilience/concentration-verdict', () => {
  it('rules CRITICAL on a single-provider dependency (SPOF)', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['openai'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('CRITICAL');
    expect(r.single_point_of_failure).toBe(true);
    expect(r.provider_count).toBe(1);
  });

  it('rules CRITICAL when every listed provider is impaired right now', () => {
    const status = [svc('OpenAI', 'down'), svc('Anthropic', 'degraded'), svc('Google', 'operational'), svc('AWS', 'operational')];
    const r = buildConcentrationVerdict(RANKING, status, ['openai', 'anthropic'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('CRITICAL');
    expect(r.currently_impaired.sort()).toEqual(['Anthropic', 'OpenAI']);
  });

  it('rules EXPOSED when one of several providers is impaired', () => {
    const status = [svc('OpenAI', 'operational'), svc('Anthropic', 'degraded'), svc('Google', 'operational'), svc('AWS', 'operational')];
    const r = buildConcentrationVerdict(RANKING, status, ['openai', 'anthropic', 'google'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('EXPOSED');
    expect(r.weakest_link?.provider).toBe('Anthropic');
  });

  it('rules EXPOSED on exactly two healthy providers (thin redundancy)', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['openai', 'anthropic'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('EXPOSED');
  });

  it('rules RESILIENT on three healthy providers', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['openai', 'anthropic', 'google'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('RESILIENT');
    expect(r.currently_impaired).toEqual([]);
  });

  it('resolves common aliases (claude to Anthropic)', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['claude', 'gpt', 'gemini'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.providers.map((p) => p.provider).sort()).toEqual(['Anthropic', 'Google', 'OpenAI']);
  });

  it('suggests the top-ranked provider not already in the set', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['openai'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.diversification.suggested[0]?.provider).toBe('Anthropic');
  });

  it('no-charges (no_recognized_providers) when nothing resolves, returning the vocabulary', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['some-random-vendor'], NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('no_recognized_providers');
    expect(r.tracked_providers.length).toBeGreaterThan(0);
  });

  it('threads a null captured_at when the probe layer is cold (never request time)', () => {
    // Dead-SLA regression (2026-06-22 audit): a cold or empty probe layer yields
    // capturedAt null and an empty ranking, but a listed provider still resolves
    // from the live status feed so the verdict bills. captured_at must be null,
    // NEVER now.toISOString(); a request-time stamp reads as fresh and defeats
    // the 30-minute stale-probe no-charge keyed to this field.
    const coldRel: ReliabilityVerdictResult = {
      ok: true,
      capturedAt: null,
      window_label: null,
      verdict: { most_dependable: null, riskiest: null },
      ranking: [],
      coverage: { providers_ranked: 0, fully_measured: 0, availability_only: 0 },
      claim: 'claim',
      notes: [],
      attribution: { sources: [], license: 'measured' },
    };
    const r = buildConcentrationVerdict(coldRel, ALL_OK, ['openai', 'anthropic'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.captured_at).toBeNull();
    expect(r.captured_at).not.toBe(NOW.toISOString());
  });

  it('threads the real probe computed_at when the probe layer is present', () => {
    const r = buildConcentrationVerdict(RANKING, ALL_OK, ['openai', 'anthropic'], NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.captured_at).toBe('2026-06-06T11:50:00Z');
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const ok = buildConcentrationVerdict(RANKING, [svc('OpenAI', 'down')], ['openai'], NOW);
    const empty = buildConcentrationVerdict(RANKING, ALL_OK, ['nope'], NOW);
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
