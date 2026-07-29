// Pure, React-free display helpers for the /is-X-down live status pages.
// Kept here (not in the client component) so they can be unit-tested in the
// node test environment and reused by any status surface.

export interface ServiceStatusData {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
  // Present when the vendor still reports an incident but TensorFeed's own
  // probes are completing again. Additive: `status` stays vendor-authoritative.
  recovery_observed?: {
    note?: string;
    observed_at?: string | null;
    window_minutes?: number;
  };
}

/**
 * Split a service's components into affected and healthy, but ONLY when the two
 * genuinely disagree. Returns null when every component agrees, so callers can
 * stay silent rather than restating the headline.
 *
 * This is the answer to "the API is up but the app is down". A single
 * worst-of-core headline necessarily collapses that distinction, and the
 * collapse is the actual defect: during the 2026-07-29 Anthropic incident the
 * inference API, the consumer app, and Claude Code were each in different
 * states behind one word. Rather than track every surface as its own service
 * row (which multiplies uptime history, leaderboard entries, and routes for
 * every provider), we keep one vendor-authoritative verdict and name the split
 * underneath it. Provider-agnostic on purpose: it reads whatever components the
 * vendor publishes and needs no per-provider configuration.
 *
 * 'unknown' and 'maintenance' are treated as neither affected nor healthy: they
 * are not evidence of an outage and not evidence of health.
 */
export function surfaceSplit(
  service: ServiceStatusData | null,
): { affected: string[]; healthy: string[] } | null {
  const components = service?.components;
  if (!Array.isArray(components) || components.length < 2) return null;
  const affected: string[] = [];
  const healthy: string[] = [];
  for (const c of components) {
    const v = (c?.status || '').toLowerCase();
    if (v === 'down' || v === 'degraded') affected.push(c.name);
    else if (v === 'operational') healthy.push(c.name);
  }
  if (affected.length === 0 || healthy.length === 0) return null;
  return { affected, healthy };
}

/** Join names for prose: "A", "A and B", "A, B and C". */
function joinNames(names: string[], max = 3): string {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  let text: string;
  if (shown.length === 1) text = shown[0];
  else text = `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  return extra > 0 ? `${text} and ${extra} more` : text;
}

/**
 * One-line "not everything is affected" sentence, or null when the vendor's
 * components all agree. Pure so the wording stays testable and consistent.
 */
export function surfaceSplitNote(service: ServiceStatusData | null): string | null {
  const split = surfaceSplit(service);
  if (!split) return null;
  return `Not every surface is affected. ${joinNames(split.affected)} ${
    split.affected.length === 1 ? 'is' : 'are'
  } reporting problems, while ${joinNames(split.healthy)} ${
    split.healthy.length === 1 ? 'is' : 'are'
  } operational.`;
}

/**
 * Human sentence for a recovery_observed annotation, or null when there is
 * nothing to say. Kept pure so the wording is unit-testable and identical
 * across surfaces.
 */
export function recoveryNote(service: ServiceStatusData | null): string | null {
  const rec = service?.recovery_observed;
  if (!rec) return null;
  const mins = typeof rec.window_minutes === 'number' ? rec.window_minutes : null;
  const window = mins ? `the last ${mins} minutes` : 'recent checks';
  return `${service?.provider ?? 'This provider'} still reports an incident on its own status page, but TensorFeed's direct API probes have completed normally for ${window}.`;
}

// Big-indicator heading, e.g. "Claude is Operational".
export function statusHeading(provider: string, status: string): string {
  switch (status) {
    case 'operational':
      return `${provider} is Operational`;
    case 'degraded':
      return `${provider} is Degraded`;
    case 'down':
      return `${provider} is Down`;
    default:
      return `${provider} Status Unknown`;
  }
}

// One-line human summary under the heading.
export function statusMessage(provider: string, status: string): string {
  switch (status) {
    case 'operational':
      return `${provider} is up and running normally. All systems are operational.`;
    case 'degraded':
      return `${provider} is experiencing degraded performance. Some features may be slower or intermittently unavailable.`;
    case 'down':
      return `${provider} is currently down. Its provider is likely aware and working on a fix.`;
    default:
      return `Unable to determine ${provider} status at this time. Check back shortly.`;
  }
}

// Tailwind gradient + border classes for the big indicator card.
export function statusBg(status: string): string {
  switch (status) {
    case 'operational':
      return 'from-accent-green/20 to-accent-green/5 border-accent-green/40';
    case 'degraded':
      return 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/40';
    case 'down':
      return 'from-accent-red/20 to-accent-red/5 border-accent-red/40';
    default:
      return 'from-bg-tertiary to-bg-secondary border-border';
  }
}

// Pull the tracked service matching `name` from an /api/status payload.
// Returns null when the payload is missing, not ok, or the service is absent,
// so a failed or shape-shifted response degrades to "unknown" rather than
// throwing in the client poll loop.
export function pickService(payload: unknown, name: string): ServiceStatusData | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { ok?: boolean; services?: unknown };
  if (!data.ok || !Array.isArray(data.services)) return null;
  return (data.services as ServiceStatusData[]).find((s) => s && s.name === name) ?? null;
}
