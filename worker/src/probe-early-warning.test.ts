import { describe, it, expect } from 'vitest';
import { computeEarlyWarning, PROBE_TO_STATUS } from './probe-early-warning';
import type { LatestSummary, ProbeSignal } from './probe';

function summaryWith(provider: string, signal: ProbeSignal, lastProbeAt = '2026-06-03T12:00:00.000Z'): LatestSummary {
  return {
    computed_at: '2026-06-03T12:00:30.000Z',
    window_label: 'last_24h',
    providers: [
      {
        provider,
        count: 4,
        success_count: 2,
        ok_pct: 0.5,
        ttfb: { p50: null, p95: null, p99: null },
        total: { p50: null, p95: null, p99: null },
        status_codes: {},
        last_probe_at: lastProbeAt,
        last_error: null,
        probe_signal: { signal, window_minutes: 60, window_count: 4, provider_fails: 2, our_fails: 0 },
      },
    ],
  };
}

describe('computeEarlyWarning', () => {
  it('warns when probe is provider_degraded and vendor is operational', () => {
    const ew = computeEarlyWarning(summaryWith('openai', 'provider_degraded'), 'OpenAI', 'operational');
    expect(ew).not.toBeNull();
    expect(ew?.source).toBe('tensorfeed_probe');
    expect(ew?.probe_signal).toBe('provider_degraded');
    expect(ew?.detected_at).toBe('2026-06-03T12:00:00.000Z');
  });

  it('does not warn when probe says our_probe_limited (our quota, not a provider outage)', () => {
    expect(computeEarlyWarning(summaryWith('openai', 'our_probe_limited'), 'OpenAI', 'operational')).toBeNull();
  });

  it('does not warn when the vendor already reports down or degraded', () => {
    expect(computeEarlyWarning(summaryWith('openai', 'provider_degraded'), 'OpenAI', 'down')).toBeNull();
    expect(computeEarlyWarning(summaryWith('openai', 'provider_degraded'), 'OpenAI', 'degraded')).toBeNull();
  });

  it('does not warn for a non-probed provider', () => {
    expect(computeEarlyWarning(summaryWith('openai', 'provider_degraded'), 'GitHub', 'operational')).toBeNull();
  });

  it('does not warn when there is no probe summary', () => {
    expect(computeEarlyWarning(null, 'OpenAI', 'operational')).toBeNull();
  });

  it('does not warn when the probe summary lacks that provider', () => {
    expect(computeEarlyWarning(summaryWith('anthropic', 'provider_degraded'), 'OpenAI', 'operational')).toBeNull();
  });

  it('maps all five probed providers to their status slug', () => {
    expect(PROBE_TO_STATUS).toEqual({ anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', mistral: 'Mistral AI', cohere: 'Cohere' });
  });
});
