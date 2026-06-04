import { describe, it, expect } from 'vitest';
import { buildReliabilityVerdict } from './premium-provider-reliability-verdict';
import type { LatestSummary, ProviderAggregate } from './probe';

function agg(p: Partial<ProviderAggregate> & { provider: string }): ProviderAggregate {
  return {
    provider: p.provider,
    count: p.count ?? 96,
    success_count: p.success_count ?? 95,
    ok_pct: p.ok_pct ?? 0.99,
    ttfb: p.ttfb ?? { p50: 300, p95: 600, p99: 900 },
    total: p.total ?? { p50: 500, p95: 900, p99: 1400 },
    status_codes: p.status_codes ?? {},
    last_probe_at: p.last_probe_at ?? '2026-05-29T11:59:00.000Z',
    last_error: p.last_error ?? null,
    probe_signal: p.probe_signal ?? { signal: 'healthy', window_minutes: 60, window_count: 4, provider_fails: 0, our_fails: 0 },
  };
}

function summary(): LatestSummary {
  return {
    computed_at: '2026-05-29T12:00:00.000Z',
    window_label: 'last_24h',
    providers: [
      agg({ provider: 'anthropic', ok_pct: 0.99, total: { p50: 500, p95: 900, p99: 1400 } }),
      agg({ provider: 'openai', ok_pct: 0.98, total: { p50: 450, p95: 1200, p99: 2100 } }),
      agg({ provider: 'deepseek', ok_pct: 0.975, total: { p50: 300, p95: 2500, p99: 5000 } }),
    ],
  };
}

describe('buildReliabilityVerdict', () => {
  it('ranks providers by measured reliability (availability plus tail consistency) and names the most dependable and riskiest', () => {
    const r = buildReliabilityVerdict(summary(), new Date('2026-05-29T12:01:00.000Z'));
    expect(r.ok).toBe(true);
    expect(r.capturedAt).toBe('2026-05-29T12:00:00.000Z');
    expect(r.ranking.map((x) => x.provider)).toEqual(['anthropic', 'openai', 'deepseek']);
    expect(r.ranking[0].rank).toBe(1);
    expect(r.verdict.most_dependable).toBe('anthropic');
    expect(r.verdict.riskiest).toBe('deepseek');
    // spread ratio p95/p50 = 900/500 = 1.8
    expect(r.ranking[0].spread_ratio).toBe(1.8);
    // reliability = 0.5*ok_pct + 0.5*(p50/p95)
    expect(r.ranking[0].reliability_score).toBeCloseTo(0.5 * 0.99 + 0.5 * (500 / 900), 4);
    expect(r.coverage.providers_ranked).toBe(3);
    expect(r.coverage.fully_measured).toBe(3);
  });

  it('scores a provider with no measured latency on availability only and flags it', () => {
    const s = summary();
    s.providers.push(
      agg({ provider: 'cohere', count: 10, success_count: 3, ok_pct: 0.3, total: { p50: null, p95: null, p99: null } }),
    );
    const r = buildReliabilityVerdict(s, new Date('2026-05-29T12:01:00.000Z'));
    const cohere = r.ranking.find((x) => x.provider === 'cohere');
    expect(cohere).toBeDefined();
    expect(cohere!.spread_ratio).toBeNull();
    expect(cohere!.reliability_score).toBeCloseTo(0.3, 4);
    expect(cohere!.note.toLowerCase()).toContain('availability');
    expect(r.coverage.availability_only).toBe(1);
    // lowest score, so it becomes the riskiest pick
    expect(r.verdict.riskiest).toBe('cohere');
  });

  it('excludes providers with zero probes in the window', () => {
    const s = summary();
    s.providers.push(agg({ provider: 'mistral', count: 0, success_count: 0, ok_pct: 0, total: { p50: null, p95: null, p99: null } }));
    const r = buildReliabilityVerdict(s, new Date('2026-05-29T12:01:00.000Z'));
    expect(r.ranking.find((x) => x.provider === 'mistral')).toBeUndefined();
    expect(r.coverage.providers_ranked).toBe(3);
  });

  it('handles a null summary as no-data rather than a crash', () => {
    const r = buildReliabilityVerdict(null, new Date('2026-05-29T12:01:00.000Z'));
    expect(r.ok).toBe(true);
    expect(r.ranking).toEqual([]);
    expect(r.verdict.most_dependable).toBeNull();
    expect(r.verdict.riskiest).toBeNull();
    expect(r.capturedAt).toBeNull();
  });

  it('emits no em-dashes or double-hyphens in any output string', () => {
    const r = buildReliabilityVerdict(summary(), new Date('2026-05-29T12:01:00.000Z'));
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/—/);
    expect(json).not.toContain('--');
  });
});
