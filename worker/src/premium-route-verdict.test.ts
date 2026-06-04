import { describe, it, expect } from 'vitest';
import {
  buildRouteVerdict,
  buildPreviewUpgrade,
  type RouteVerdictInputs,
  type RouteVerdictOptions,
  type RouteVerdictResult,
} from './premium-route-verdict';
import type { LatestSummary, ProviderAggregate } from './probe';
import type { IncidentTriageSnapshot, IncidentTriageCard } from './incident-triage-generator';
import type { UsageRanking } from './usage-rankings';
import type { BenchmarkMeta } from './benchmark-registry';
import type { ModelDeprecation } from './model-deprecations';

describe('buildPreviewUpgrade', () => {
  function mkResult(verdictScore: number | null, runnerScores: number[]): RouteVerdictResult {
    const cand = (composite_score: number) => ({ composite_score, model: { id: 'm', name: 'M' } });
    return {
      verdict: verdictScore === null ? null : cand(verdictScore),
      runners_up: runnerScores.map(cand),
    } as unknown as RouteVerdictResult;
  }

  it('flags a contested decision when rank1 beats rank2 by under 5 percent', () => {
    const u = buildPreviewUpgrade(mkResult(0.9, [0.88]));
    expect(u.you_are_missing.runners_up).toBe(1);
    expect(u.you_are_missing.contested).toBe(true);
    expect(u.you_are_missing.decision_margin).toMatch(/ahead of the hidden runner-up/);
    expect(u.you_are_missing.next_best).toEqual({
      rank: 2,
      model: '<locked>',
      composite_score: '<locked>',
      note: expect.any(String),
    });
  });

  it('is not contested for a wide margin', () => {
    const u = buildPreviewUpgrade(mkResult(0.9, [0.5]));
    expect(u.you_are_missing.contested).toBe(false);
    expect(u.you_are_missing.decision_margin).toContain('%');
  });

  it('handles a single candidate with no runner-up', () => {
    const u = buildPreviewUpgrade(mkResult(0.9, []));
    expect(u.you_are_missing.runners_up).toBe(0);
    expect(u.you_are_missing.decision_margin).toBeNull();
    expect(u.you_are_missing.next_best).toBeNull();
  });

  it('handles a null verdict', () => {
    const u = buildPreviewUpgrade(mkResult(null, []));
    expect(u.you_are_missing.runners_up).toBe(0);
    expect(u.you_are_missing.decision_margin).toBeNull();
  });

  it('uses the correct $0.02 price and always offers the signed receipt', () => {
    const u = buildPreviewUpgrade(mkResult(0.9, [0.88]));
    expect(u.price).toBe('1 credit ($0.02)');
    expect(u.you_are_missing.signed_receipt).toBe(true);
    expect(u.premium_endpoint).toBe('/api/premium/route-verdict');
  });

  it('emits no em dash anywhere in the upgrade block', () => {
    const s = JSON.stringify(buildPreviewUpgrade(mkResult(0.9, [0.88])));
    expect([...s].some((c) => c.codePointAt(0) === 0x2014)).toBe(false);
  });
});

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
    probe_signal: { signal: 'healthy', window_minutes: 60, window_count: 4, provider_fails: 0, our_fails: 0 },
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

  it('capability floor: a much weaker model never wins even when cheapest and fastest', () => {
    const inputs: RouteVerdictInputs = {
      pricing: {
        lastUpdated: '2026-05-28T08:00:00Z',
        providers: [
          { id: 'anthropic', name: 'anthropic', models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, contextWindow: 200000, openSource: false }] },
          { id: 'cheaplab', name: 'cheaplab', models: [{ id: 'cheap-weak', name: 'Cheap Weak', inputPrice: 0.05, outputPrice: 0.15, contextWindow: 32000, openSource: true }] },
        ],
      },
      benchmarks: {
        lastUpdated: '2026-05-28T08:00:00Z',
        models: [
          { model: 'Claude Sonnet 4.6', provider: 'anthropic', scores: { swe_bench: 75, human_eval: 97, mmlu_pro: 90 } },
          { model: 'Cheap Weak', provider: 'cheaplab', scores: { swe_bench: 30, human_eval: 40, mmlu_pro: 35 } },
        ],
      },
      services: [{ name: 'Anthropic API', provider: 'anthropic', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' }],
      // cheap-weak is the CHEAPEST and the FASTEST (200ms vs 1800ms).
      probe: latest([probeAgg('anthropic', 1800), probeAgg('cheaplab', 200)]),
      triage: triageSnap([]),
      usage: [],
      benchmarkRegistry: [bench('swe-bench-verified', 'medium', 'active'), bench('humaneval', 'high', 'saturated'), bench('mmlu-pro', 'medium', 'active')],
      deprecations: [],
    };
    const r = buildRouteVerdict(inputs, CODE, NOW);
    expect(r.verdict).not.toBeNull();
    expect(r.verdict!.model.id).toBe('claude-sonnet-4-6'); // capability leads
    const ids = [r.verdict!, ...r.runners_up].map((c) => c.model.id);
    expect(ids).not.toContain('cheap-weak'); // excluded by the capability floor
    expect(r.candidates_considered).toBe(2);
    expect(r.notes.some((n) => n.includes('capability floor'))).toBe(true);
  });

  it('budget gate: drops candidates over the budget, leaves them when generous', () => {
    // In baseInputs both Sonnet (blended 9) and DeepSeek (blended 0.3)
    // clear the capability floor; DeepSeek wins on price and Sonnet is the
    // runner-up. A budget of $5 drops Sonnet from the candidate set before
    // the capability floor recomputes, so Sonnet appears nowhere in the
    // result and a budget note is recorded.
    const baseline = buildRouteVerdict(baseInputs(), CODE, NOW);
    const baselineIds = [baseline.verdict!, ...baseline.runners_up].map((c) => c.model.id);
    expect(baselineIds).toContain('claude-sonnet-4-6');

    const tight = buildRouteVerdict(baseInputs(), { task: 'code', budget: 5 }, NOW);
    const tightIds = [tight.verdict, ...tight.runners_up].filter(Boolean).map((c) => c!.model.id);
    expect(tightIds).not.toContain('claude-sonnet-4-6'); // priced out at $5 budget
    expect(tight.filters_applied.budget).toBe(5);
    expect(tight.notes.some((n) => n.includes('budget'))).toBe(true);

    // A generous budget changes nothing versus no budget at all.
    const generous = buildRouteVerdict(baseInputs(), { task: 'code', budget: 1000 }, NOW);
    expect(generous.verdict!.model.id).toBe(baseline.verdict!.model.id);
    expect(generous.runners_up.map((c) => c.model.id)).toEqual(baseline.runners_up.map((c) => c.model.id));
    expect(generous.filters_applied.budget).toBe(1000);
  });

  it('min_quality gate: excludes low-quality candidates, verdict clears the floor', () => {
    // Two priced models: a strong one and a weak one. With a min_quality
    // floor between them, only the strong model survives even though the
    // capability floor would normally keep both relative to the top tier.
    const inputs: RouteVerdictInputs = {
      pricing: {
        lastUpdated: '2026-05-28T08:00:00Z',
        providers: [
          { id: 'anthropic', name: 'anthropic', models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, contextWindow: 200000, openSource: false }] },
          { id: 'weaklab', name: 'weaklab', models: [{ id: 'weak-one', name: 'Weak One', inputPrice: 0.1, outputPrice: 0.2, contextWindow: 32000, openSource: true }] },
        ],
      },
      benchmarks: {
        lastUpdated: '2026-05-28T08:00:00Z',
        models: [
          { model: 'Claude Sonnet 4.6', provider: 'anthropic', scores: { swe_bench: 75, human_eval: 97, mmlu_pro: 90 } },
          { model: 'Weak One', provider: 'weaklab', scores: { swe_bench: 40, human_eval: 45, mmlu_pro: 42 } },
        ],
      },
      services: [{ name: 'Anthropic API', provider: 'anthropic', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' }],
      probe: latest([probeAgg('anthropic', 1800), probeAgg('weaklab', 300)]),
      triage: triageSnap([]),
      usage: [],
      benchmarkRegistry: [bench('swe-bench-verified', 'low', 'active'), bench('humaneval', 'low', 'active'), bench('mmlu-pro', 'low', 'active')],
      deprecations: [],
    };
    // No floor: both considered (weak one still excluded by capability floor here,
    // but it scores around 0.42 vs sonnet ~0.87, so capability floor already cuts it).
    // Set a floor at 0.5 to make the user gate the active constraint.
    const r = buildRouteVerdict(inputs, { task: 'code', minQuality: 0.5 }, NOW);
    expect(r.verdict).not.toBeNull();
    expect(r.verdict!.model.id).toBe('claude-sonnet-4-6');
    expect(r.verdict!.quality.trust_discounted).toBeGreaterThanOrEqual(0.5);
    const ids = [r.verdict!, ...r.runners_up].map((c) => c.model.id);
    expect(ids).not.toContain('weak-one');
    expect(r.filters_applied.min_quality).toBe(0.5);
    expect(r.notes.some((n) => n.includes('min_quality'))).toBe(true);
  });

  it('min_quality is a HARD gate applied before the capability floor', () => {
    // If the user sets a min_quality above the TOP candidate's discounted
    // quality, EVERY candidate is dropped (the capability floor never
    // rescues anything), and the verdict is null with a note.
    const r = buildRouteVerdict(baseInputs(), { task: 'code', minQuality: 0.99 }, NOW);
    expect(r.verdict).toBeNull();
    expect(r.runners_up).toEqual([]);
    expect(r.notes.some((n) => n.includes('min_quality'))).toBe(true);
  });

  it('all-dropped: an impossibly low budget yields a null verdict with a note and never throws', () => {
    const r = buildRouteVerdict(baseInputs(), { task: 'code', budget: 0.0001 }, NOW);
    expect(r.ok).toBe(true);
    expect(r.verdict).toBeNull();
    expect(r.runners_up).toEqual([]);
    expect(r.notes.some((n) => n.includes('budget'))).toBe(true);
    // candidates_considered still reflects the scratch set, not the filtered one.
    expect(r.candidates_considered).toBe(2);
  });

  it('filters_applied reflects the passed budget and min_quality, else null', () => {
    const withFilters = buildRouteVerdict(baseInputs(), { task: 'code', budget: 50, minQuality: 0.3 }, NOW);
    expect(withFilters.filters_applied.budget).toBe(50);
    expect(withFilters.filters_applied.min_quality).toBe(0.3);

    const without = buildRouteVerdict(baseInputs(), CODE, NOW);
    expect(without.filters_applied.budget).toBeNull();
    expect(without.filters_applied.min_quality).toBeNull();

    // Non-positive / non-finite values resolve to null.
    const zeroed = buildRouteVerdict(baseInputs(), { task: 'code', budget: 0, minQuality: -1 }, NOW);
    expect(zeroed.filters_applied.budget).toBeNull();
    expect(zeroed.filters_applied.min_quality).toBeNull();
  });

  it('matches a provider whose status name differs from the catalog name (fuzzy join)', () => {
    const inputs = baseInputs({
      // Status feed spells it "Anthropic AI" while the catalog uses "anthropic".
      services: [{ name: 'Anthropic API', provider: 'Anthropic AI', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' }],
    });
    const r = buildRouteVerdict(inputs, CODE, NOW);
    const sonnet = [r.verdict!, ...r.runners_up].find((c) => c.model.id === 'claude-sonnet-4-6')!;
    expect(sonnet.operational.source).toBe('live_status');
    expect(sonnet.operational.ok).toBe(true);
  });
});
