import { describe, it, expect } from 'vitest';
import { computeEarlyWarning, computeRecoveryObserved, PROBE_TO_STATUS } from './probe-early-warning';
import type { LatestSummary, ProbeRecoveryDetail, ProbeSignal } from './probe';

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

function summaryWithRecovery(
  provider: string,
  recovery: ProbeRecoveryDetail | undefined,
  signal: ProbeSignal = 'provider_degraded',
): LatestSummary {
  const base = summaryWith(provider, signal);
  base.providers[0].probe_recovery = recovery;
  return base;
}

const ALL_OK: ProbeRecoveryDetail = {
  all_ok: true,
  window_minutes: 20,
  window_count: 2,
  last_ok_at: '2026-06-03T11:58:00.000Z',
};

describe('computeRecoveryObserved', () => {
  it('fires when the vendor still says down but recent probes all succeeded', () => {
    const rec = computeRecoveryObserved(summaryWithRecovery('anthropic', ALL_OK), 'Anthropic', 'down');
    expect(rec).not.toBeNull();
    expect(rec?.source).toBe('tensorfeed_probe');
    expect(rec?.probe_signal).toBe('recovery_observed');
    expect(rec?.observed_at).toBe('2026-06-03T11:58:00.000Z');
    expect(rec?.window_minutes).toBe(20);
  });

  it('fires for a degraded vendor status too', () => {
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', ALL_OK), 'Anthropic', 'degraded')).not.toBeNull();
  });

  it('fires even while the 60-minute signal still reads provider_degraded', () => {
    // This is the whole point: right after a real outage the long window still
    // says degraded, and that is exactly when we need to report recovery.
    const rec = computeRecoveryObserved(
      summaryWithRecovery('anthropic', ALL_OK, 'provider_degraded'),
      'Anthropic',
      'down',
    );
    expect(rec).not.toBeNull();
  });

  it('does not fire when the vendor already says operational', () => {
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', ALL_OK), 'Anthropic', 'operational')).toBeNull();
  });

  it('does not fire on an unknown vendor status', () => {
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', ALL_OK), 'Anthropic', 'unknown')).toBeNull();
  });

  it('does not fire when a probe in the window failed', () => {
    const failed: ProbeRecoveryDetail = { ...ALL_OK, all_ok: false };
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', failed), 'Anthropic', 'down')).toBeNull();
  });

  it('does not fire on an empty window (no samples proves nothing)', () => {
    const empty: ProbeRecoveryDetail = { all_ok: false, window_minutes: 20, window_count: 0, last_ok_at: null };
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', empty), 'Anthropic', 'down')).toBeNull();
  });

  it('does not fire when probe_recovery is absent (pre-existing KV entries)', () => {
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', undefined), 'Anthropic', 'down')).toBeNull();
  });

  it('does not fire for a non-probed provider or a missing summary', () => {
    expect(computeRecoveryObserved(summaryWithRecovery('anthropic', ALL_OK), 'GitHub', 'down')).toBeNull();
    expect(computeRecoveryObserved(null, 'Anthropic', 'down')).toBeNull();
  });
});
