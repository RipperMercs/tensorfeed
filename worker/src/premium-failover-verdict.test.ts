import { describe, it, expect } from 'vitest';
import { buildFailoverVerdict } from './premium-failover-verdict';
import type { RouteVerdictInputs } from './premium-route-verdict';
import type { IncidentTriageSnapshot, IncidentTriageCard } from './incident-triage-generator';
import type { BenchmarkMeta } from './benchmark-registry';
import type { ProviderAggregate } from './probe';

const NOW = new Date('2026-05-28T12:00:00Z');

function card(
  provider: string,
  action: IncidentTriageCard['recommended_action'],
  impact: IncidentTriageCard['impact_classification'] = 'critical',
): IncidentTriageCard {
  return {
    incident_id: `${provider}-1`,
    provider,
    service: `${provider} API`,
    title: `${provider} major outage`,
    severity: 'critical',
    started_at: '2026-05-28T11:00:00Z',
    resolved_at: null,
    ongoing: true,
    triage_summary: `${provider} API is degraded.`,
    impact_classification: impact,
    affected_capabilities: ['inference'],
    recommended_action: action,
    generated_at: '2026-05-28T11:30:00Z',
  };
}

function triage(cards: IncidentTriageCard[]): IncidentTriageSnapshot {
  return {
    capturedAt: '2026-05-28T11:30:00Z',
    source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
    model: 'claude-haiku-4-5-20251001',
    incidents_considered: cards.length,
    incidents_succeeded: cards.length,
    incidents_failed: 0,
    ongoing_count: cards.filter((c) => c.ongoing).length,
    resolved_count: 0,
    cards,
  };
}

function bench(id: string): BenchmarkMeta {
  return {
    id,
    name: id,
    category: 'code',
    description: '',
    released: '2024',
    size: '',
    scoreRange: '0-100',
    frontierScore: '90',
    frontierModel: null,
    frontierDate: null,
    frontierSource: null,
    status: 'active',
    contaminationRisk: 'low',
    maintainer: '',
    paperUrl: null,
    repoUrl: null,
    leaderboardUrl: null,
    whoCares: '',
  };
}

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

function inputs(over: Partial<RouteVerdictInputs> = {}): RouteVerdictInputs {
  return {
    pricing: {
      lastUpdated: '2026-05-28T08:00:00Z',
      providers: [
        { id: 'anthropic', name: 'anthropic', models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, contextWindow: 200000, openSource: false }] },
        { id: 'openai', name: 'openai', models: [{ id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 5, outputPrice: 15, contextWindow: 400000, openSource: false }] },
        { id: 'google', name: 'google', models: [{ id: 'gemini-3-pro', name: 'Gemini 3 Pro', inputPrice: 2, outputPrice: 10, contextWindow: 1000000, openSource: false }] },
      ],
    },
    benchmarks: {
      lastUpdated: '2026-05-28T08:00:00Z',
      models: [
        { model: 'Claude Sonnet 4.6', provider: 'anthropic', scores: { swe_bench: 75, human_eval: 97, mmlu_pro: 90 } },
        { model: 'GPT-5.5', provider: 'openai', scores: { swe_bench: 73, human_eval: 96, mmlu_pro: 92 } },
        { model: 'Gemini 3 Pro', provider: 'google', scores: { swe_bench: 70, human_eval: 94, mmlu_pro: 89 } },
      ],
    },
    services: [
      { name: 'Anthropic API', provider: 'anthropic', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' },
      { name: 'OpenAI API', provider: 'openai', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' },
      { name: 'Google AI', provider: 'google', status: 'operational', lastChecked: '2026-05-28T11:50:00Z' },
    ],
    probe: { computed_at: '2026-05-28T11:55:00Z', window_label: 'last_24h', providers: [probeAgg('anthropic', 1800), probeAgg('openai', 1200), probeAgg('google', 900)] },
    triage: triage([]),
    usage: [],
    benchmarkRegistry: [bench('swe-bench-verified'), bench('humaneval'), bench('mmlu-pro')],
    deprecations: [],
    ...over,
  };
}

const CODE = { from: 'anthropic', task: 'code' as const };

describe('buildFailoverVerdict', () => {
  it('detects the from incident and fails over to a different operational provider', () => {
    const r = buildFailoverVerdict(inputs({ triage: triage([card('anthropic', 'failover_now')]) }), CODE, NOW);
    expect(r.from.in_incident).toBe(true);
    expect(r.from.incident!.recommended_action).toBe('failover_now');
    expect(r.failover_to).not.toBeNull();
    expect(r.failover_to!.model.provider).not.toBe('anthropic');
    expect(r.excluded_providers).toContain('anthropic');
    expect(r.why).toContain('anthropic');
    expect(r.why.toLowerCase()).toContain('incident');
  });

  it('still recommends an alternative when from has no active incident', () => {
    const r = buildFailoverVerdict(inputs(), CODE, NOW);
    expect(r.from.in_incident).toBe(false);
    expect(r.from.incident).toBeNull();
    expect(r.failover_to).not.toBeNull();
    expect(r.failover_to!.model.provider).not.toBe('anthropic');
    expect(r.why).toContain('No ongoing incident');
  });

  it('excludes every provider currently flagged failover_now, not just from', () => {
    const r = buildFailoverVerdict(
      inputs({ triage: triage([card('anthropic', 'failover_now'), card('google', 'failover_now')]) }),
      CODE,
      NOW,
    );
    expect(r.excluded_providers).toContain('anthropic');
    expect(r.excluded_providers).toContain('google');
    // Only OpenAI is left operational and not excluded.
    expect(r.failover_to!.model.provider).toBe('openai');
  });

  it('returns no failover_to when every alternative is excluded or down', () => {
    const r = buildFailoverVerdict(
      inputs({ triage: triage([card('anthropic', 'failover_now'), card('google', 'failover_now'), card('openai', 'failover_now')]) }),
      CODE,
      NOW,
    );
    expect(r.failover_to).toBeNull();
    expect(r.why.toLowerCase()).toContain('no operational alternative');
  });

  it('emits zero em dashes and zero double hyphens', () => {
    const r = buildFailoverVerdict(inputs({ triage: triage([card('anthropic', 'failover_now')]) }), CODE, NOW);
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json.includes('--')).toBe(false);
  });
});
