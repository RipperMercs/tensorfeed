/**
 * Early-warning join between the TensorFeed probe signal and the
 * vendor-authoritative status. When our probes detect provider-side
 * degradation (probe_signal provider_degraded) but the vendor status page
 * still says operational, we surface an additive early_warning. We NEVER
 * change the vendor condition, and our_probe_limited (our key/quota) never
 * raises anything. Pure; never throws.
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

const EARLY_WARNING_NOTE =
  'TensorFeed probes detect provider-side degradation; vendor status not yet confirming.';

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
