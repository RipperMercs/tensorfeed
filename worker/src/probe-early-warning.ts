/**
 * Two-way join between the TensorFeed probe signal and the
 * vendor-authoritative status. We NEVER change the vendor condition; both
 * directions are additive annotations. Pure; never throws.
 *
 *   early_warning     vendor says operational, our probes say degraded.
 *   recovery_observed vendor still says down/degraded, our probes are
 *                     succeeding again.
 *
 * The recovery direction exists because vendors resolve Statuspage components
 * by hand and sometimes leave a row red long after the API is healthy, which
 * left TensorFeed reporting a stale outage with no way to say otherwise. Note
 * the honest limit: probes run every 15 minutes, so recovery_observed is not a
 * fast path. The cache and poll cadences carry the sub-minute case; this covers
 * the long tail where a vendor's row stays red for tens of minutes or hours.
 *
 * our_probe_limited (our key/quota) never raises anything in either direction.
 */

import type { LatestSummary } from './probe';

/** Probe provider key -> the `provider` slug used in the status summary
 * (from worker/src/sources.ts STATUS_PAGES). Only the 5 probed providers. */
export const PROBE_TO_STATUS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
};

const STATUS_TO_PROBE: Record<string, string> = Object.fromEntries(
  Object.entries(PROBE_TO_STATUS).map(([probeKey, statusSlug]) => [statusSlug, probeKey]),
);

export interface EarlyWarning {
  source: 'tensorfeed_probe';
  note: string;
  detected_at: string | null;
  probe_signal: 'provider_degraded';
}

export interface RecoveryObserved {
  source: 'tensorfeed_probe';
  note: string;
  /** Timestamp of the most recent successful probe in the window. */
  observed_at: string | null;
  window_minutes: number;
  probe_signal: 'recovery_observed';
}

const EARLY_WARNING_NOTE =
  'TensorFeed probes detect provider-side degradation; vendor status not yet confirming.';

const RECOVERY_OBSERVED_NOTE =
  'Vendor status still reports an incident; TensorFeed probes are completing normally again.';

/**
 * Returns an early_warning for one status service, or null. Fires only when the
 * service is one of the 5 probed providers, the vendor status is operational,
 * and the probe signal for that provider is provider_degraded.
 */
export function computeEarlyWarning(
  probeSummary: LatestSummary | null,
  vendorProviderSlug: string,
  vendorStatus: string,
): EarlyWarning | null {
  if (!probeSummary) return null;
  if (vendorStatus !== 'operational') return null;
  const probeKey = STATUS_TO_PROBE[vendorProviderSlug];
  if (!probeKey) return null;
  const agg = probeSummary.providers.find((p) => p.provider === probeKey);
  if (!agg || agg.probe_signal?.signal !== 'provider_degraded') return null;
  return {
    source: 'tensorfeed_probe',
    note: EARLY_WARNING_NOTE,
    detected_at: agg.last_probe_at,
    probe_signal: 'provider_degraded',
  };
}

/**
 * Mirror image of computeEarlyWarning. Returns a recovery_observed for one
 * status service, or null. Fires only when the service is one of the 5 probed
 * providers, the vendor status is down or degraded, and every probe in the
 * short recovery window succeeded.
 *
 * Intentionally does NOT gate on probe_signal being 'healthy': that signal uses
 * a 60-minute window and so still reads provider_degraded for up to an hour
 * after a genuine outage ends, which is exactly the period this is meant to
 * cover. The claim made here is narrow and factual (recent probes succeeded),
 * which is why it is safe to surface without overriding the vendor.
 */
export function computeRecoveryObserved(
  probeSummary: LatestSummary | null,
  vendorProviderSlug: string,
  vendorStatus: string,
): RecoveryObserved | null {
  if (!probeSummary) return null;
  if (vendorStatus !== 'down' && vendorStatus !== 'degraded') return null;
  const probeKey = STATUS_TO_PROBE[vendorProviderSlug];
  if (!probeKey) return null;
  const agg = probeSummary.providers.find((p) => p.provider === probeKey);
  if (!agg) return null;
  const rec = agg.probe_recovery;
  if (!rec || !rec.all_ok || rec.window_count < 1) return null;
  return {
    source: 'tensorfeed_probe',
    note: RECOVERY_OBSERVED_NOTE,
    observed_at: rec.last_ok_at,
    window_minutes: rec.window_minutes,
    probe_signal: 'recovery_observed',
  };
}
