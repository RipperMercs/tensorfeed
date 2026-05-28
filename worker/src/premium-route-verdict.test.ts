import { describe, it, expect } from 'vitest';
import {
  buildRouteVerdict,
  type RouteVerdictInputs,
  type RouteVerdictOptions,
} from './premium-route-verdict';
import type { LatestSummary, ProviderAggregate } from './probe';
import type { IncidentTriageSnapshot, IncidentTriageCard } from './incident-triage-generator';
import type { UsageRanking } from './usage-rankings';
import type { BenchmarkMeta } from './benchmark-registry';
import type { ModelDeprecation } from './model-deprecations';

const NOW = new Date('2026-05-28T12:00:00Z');

// ─── Builders ──────────────────────────────────────────────────────

function probeAgg(provider: string, p95: number): ProviderAggregate {
  return {
    provider,
    count: 96,
    success_count: 96,
    ok_pct: 1,
    ttfb: { p50: p95 / 3, p95: p95 / 2, p99: p95 / 2 },
    total: { p50: p95 * 0.6, p95, p99: p95 * 1.2 },
    status_codes: { '200': 96 },
    last_probe_at: '2026-05-28T11:55:00Z',
    last_error: null,
  };
}

function latest(providers: ProviderAggregate[], computedAt = '2026-05-28T11:55:00Z'): LatestSummary {
  return { computed_at: computedAt, window_label: 'last_24h', providers };
}

function failoverCard(provider: string): IncidentTriageCard {
  return {
    incident_id: `${provider}-1`,
    provider,
    service: `${provider} API`,
    title: 'Major outage',
    severity: 'critical',
    started_at: '2026-05-28T11:00:00Z',
    resolved_at: null,
    ongoing: true,
    triage_summary: 'Full API outage affecting agent traffic.',
    impact_classification: 'critical',
    affected_capabilities: ['inference'],
    recommended_action: 'failover_now',
    generated_at: '2026-05-28T11:30:00Z',
  };
}

function triageSnap(cards: IncidentTriageCard[]): IncidentTriageSnapshot {
  return {
    capturedAt: '2026-05-28T11:30:00Z',
    source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
    model: 'claude-haiku-4-5-20251001',
    incidents_considered: cards.length,
    incidents_succeeded: cards.length,
    incidents_failed: 0,
    ongoing_count: cards.filter((c) => c.ongoing).length,
    resolved_count: cards.filter((c) => !c.ongoing).length,
    cards,
  };
}

function usage(model: string, provider: string, rank: number, sharePct: number): UsageRanking {
  return {
    rank,
    model,
    provider,
    openrouterId: `${provider.toLowerCase()}/${model.toLowerCase().replace(/\s+/g, '-')}`,
    tokensB7d: 100,
    trend: 'up',
    sharePct,
    notes: 'test',
    url: 'https://example.com',
  };
}

function bench(id: string, contamination: BenchmarkMeta['contaminationRisk'], status: BenchmarkMeta['status']): BenchmarkMeta {
  return {
    id,
    name: id.toUpperCase(),
    category: 'code',
    description: 'test',
    released: '2024',
    size: '100',
    scoreRange: '0-100',
    frontierScore: '90',
    frontierModel: null,
    frontierDate: null,
    frontierSource: null,
    status,
    contaminationRisk: contamination,
    maintainer: 'test',
    paperUrl: null,
    repoUrl: null,
    leaderboardUrl: null,
    whoCares: 'test',
  };
}

// Two clean candidates for the common case: a premium first-party model
// (anthropic, probed, operational, used) and a cheap open-weight model
// (deepseek, not probed, no status).
function baseInputs(overrides: Partial<RouteVerdictInputs> = {}): RouteVerdictInputs {
  const inputs: RouteVerdictInputs = {
    pricing: {
      lastUpdated: '2026-05-28T08:00:00Z',
      providers: [
        {
          id: 'anthropic',
          name: 'anthropic',
          models: [
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, contextWindow: 200000, openSource: false },
          ],
        },
        {
          id: 'deepseek',
          name: 'deepseek',
          models: [
            { id: 'deepseek-chat', name: 'DeepSeek V4 Pro', inputPrice: 0.2, outputPrice: 0.4, contextWindow: 128000, openSource: true },
          ],
        },
      ],
    },
    benchmarks: {
      lastUpdated: '2026-05-28T08:00:00Z',
      models: [
        { model: 'Claude Sonnet 4.6', provider: 'anthropic', scores: { swe_bench: 75, human_eval: 97, mmlu_pro: 90 } },
        { model: 'DeepSeek V4 Pro', provider: 'deepseek', scores: { swe_bench: 65, human_eval: 90, mmlu_pro: 85 } },
      ],
    },
    services: [{ name: 'Anthropic API', provider: 'anthropic', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' }],
    probe: latest([probeAgg('anthropic', 1800)]),
    triage: triageSnap([]),
    usage: [usage('Claude Sonnet 4.6', 'Anthropic', 1, 18.4)],
    benchmarkRegistry: [
      bench('swe-bench-verified', 'medium', 'active'),
      bench('humaneval', 'high', 'saturated'),
      bench('mmlu-pro', 'medium', 'active'),
    ],
    deprecations: [],
  };
  return { ...inputs, ...overrides };
}

const CODE: RouteVerdictOptions = { task: 'code' };

// ─── Tests ─────────────────────────────────────────────────────────

describe('buildRouteVerdict', () => {
  it('returns a single ranked verdict plus runners-up for a task', () => {
    const r = buildRouteVerdict(baseInputs(), CODE, NOW);
    expect(r.ok).toBe(true);
    expect(r.verdict).not.toBeNull();
    expect(r.verdict!.rank).toBe(1);
    expect(r.runners_up.length).toBe(1);
    expect(r.candidates_considered).toBe(2);
    // Blended price computed as (input + output) / 2.
    const sonnet = [r.verdict!, ...r.runners_up].find((c) => c.model.id === 'claude-sonnet-4-6')!;
    expect(sonnet.pricing.blended).toBe(9);
  });

  it('uses measured probe latency for probed providers and flags unknown otherwise', () => {
    const r = buildRouteVerdict(baseInputs(), CODE, NOW);
    const all = [r.verdict!, ...r.runners_up];
    const sonnet = all.find((c) => c.model.id === 'claude-sonnet-4-6')!;
    const deepseek = all.find((c) => c.model.id === 'deepseek-chat')!;
    expect(sonnet.latency.source).toBe('measured_probe');
    expect(sonnet.latency.measured_p95_ms).toBe(1800);
    expect(deepseek.latency.source).toBe('unknown');
    expect(deepseek.latency.measured_p95_ms).toBeNull();
    expect(r.trust.latency_layer).toBe('partial');
  });

  it('discounts quality by benchmark contamination and saturation', () => {
    // Single model scored ONLY on humaneval (high contamination, saturated).
    const inputs = baseInputs({
      pricing: {
        lastUpdated: '2026-05-28T08:00:00Z',
        providers: [{ id: 'x', name: 'x', models: [{ id: 'm1', name: 'Model One', inputPrice: 1, outputPrice: 1, contextWindow: 1000, openSource: false }] }],
      },
      benchmarks: { lastUpdated: '2026-05-28T08:00:00Z', models: [{ model: 'Model One', provider: 'x', scores: { human_eval: 90 } }] },
      benchmarkRegistry: [bench('humaneval', 'high', 'saturated')],
      probe: null,
      services: [],
      triage: null,
      usage: [],
    });
    const r = buildRouteVerdict(inputs, CODE, NOW);
    const v = r.verdict!;
    // base = 0.90; trust = 0.78 (high) * 0.85 (saturated) = 0.663
    expect(v.quality.task_score).toBeCloseTo(0.9, 4);
    expect(v.quality.trust_discounted).toBeCloseTo(0.9 * 0.78 * 0.85, 3);
    expect(v.quality.contamination_note).toContain('HUMANEVAL');
  });

  it('drops a provider in failover when require_operational is on, keeps it when off', () => {
    const withFailover = baseInputs({
      pricing: {
        lastUpdated: '2026-05-28T08:00:00Z',
        providers: [{ id: 'openai', name: 'openai', models: [{ id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 5, outputPrice: 15, contextWindow: 400000, openSource: false }] }],
      },
      benchmarks: { lastUpdated: '2026-05-28T08:00:00Z', models: [{ model: 'GPT-5.5', provider: 'openai', scores: { swe_bench: 70, human_eval: 95, mmlu_pro: 92 } }] },
      services: [{ name: 'OpenAI API', provider: 'openai', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' }],
      triage: triageSnap([failoverCard('openai')]),
      probe: latest([probeAgg('openai', 1200)]),
      usage: [],
    });
    const gated = buildRouteVerdict(withFailover, CODE, NOW);
    expect(gated.verdict).toBeNull(); // only candidate is in failover, dropped

    const ungated = buildRouteVerdict(withFailover, { task: 'code', requireOperational: false }, NOW);
    expect(ungated.verdict).not.toBeNull();
    expect(ungated.verdict!.operational.status).toBe('failover_now');
    expect(ungated.verdict!.operational.ok).toBe(false);
  });

  it('excludes deprecated models by default and surfaces the flag when included', () => {
    const deprecations: ModelDeprecation[] = [
      { id: 'ds-old', provider: 'deepseek', model: 'deepseek-chat', status: 'deprecated', sunsetDate: '2026-06-01', sourceUrl: 'https://example.com' },
    ];
    const excluded = buildRouteVerdict(baseInputs({ deprecations }), CODE, NOW);
    expect([excluded.verdict!, ...excluded.runners_up].some((c) => c.model.id === 'deepseek-chat')).toBe(false);

    const included = buildRouteVerdict(baseInputs({ deprecations }), { task: 'code', excludeDeprecated: false }, NOW);
    const ds = [included.verdict!, ...included.runners_up].find((c) => c.model.id === 'deepseek-chat')!;
    expect(ds.deprecation.flagged).toBe(true);
    expect(ds.deprecation.status).toBe('deprecated');
  });

  it('corroborates usage by model name', () => {
    const r = buildRouteVerdict(baseInputs(), CODE, NOW);
    const all = [r.verdict!, ...r.runners_up];
    const sonnet = all.find((c) => c.model.id === 'claude-sonnet-4-6')!;
    const deepseek = all.find((c) => c.model.id === 'deepseek-chat')!;
    expect(sonnet.usage.corroborated).toBe(true);
    expect(sonnet.usage.rank).toBe(1);
    expect(deepseek.usage.corroborated).toBe(false);
  });

  it('filters by max measured p95 latency', () => {
    const inputs = baseInputs({
      probe: latest([probeAgg('anthropic', 5000), probeAgg('deepseek', 900)]),
    });
    const r = buildRouteVerdict(inputs, { task: 'code', maxLatencyP95Ms: 2000 }, NOW);
    const ids = [r.verdict, ...r.runners_up].filter(Boolean).map((c) => c!.model.id);
    expect(ids).toContain('deepseek-chat');
    expect(ids).not.toContain('claude-sonnet-4-6'); // 5000ms exceeds the 2000 floor
  });

  it('narrows to a single model with the model option', () => {
    const r = buildRouteVerdict(baseInputs(), { model: 'DeepSeek V4 Pro' }, NOW);
    expect(r.candidates_considered).toBe(1);
    expect(r.verdict!.model.id).toBe('deepseek-chat');
  });

  it('sets capturedAt to the probe anchor, then status, then null', () => {
    expect(buildRouteVerdict(baseInputs(), CODE, NOW).capturedAt).toBe('2026-05-28T11:55:00Z');
    const noProbe = buildRouteVerdict(baseInputs({ probe: null }), CODE, NOW);
    expect(noProbe.capturedAt).toBe('2026-05-28T11:50:00Z'); // oldest service lastChecked
    const neither = buildRouteVerdict(baseInputs({ probe: null, services: [] }), CODE, NOW);
    expect(neither.capturedAt).toBeNull();
  });

  it('degrades gracefully on empty inputs', () => {
    const r = buildRouteVerdict(
      { pricing: null, benchmarks: null, services: null, probe: null, triage: null, usage: [], benchmarkRegistry: [], deprecations: [] },
      CODE,
      NOW,
    );
    expect(r.ok).toBe(true);
    expect(r.verdict).toBeNull();
    expect(r.runners_up).toEqual([]);
    expect(r.candidates_considered).toBe(0);
    expect(r.trust.latency_layer).toBe('unavailable');
    expect(r.trust.operational_layer).toBe('unavailable');
  });

  it('emits zero em dashes and zero double hyphens in the serialized response', () => {
    const r = buildRouteVerdict(baseInputs(), CODE, NOW);
    const json = JSON.stringify(r);
    expect(json).not.toContain('—'); // em dash
    expect(json.includes('--')).toBe(false); // double hyphen
  });
});
