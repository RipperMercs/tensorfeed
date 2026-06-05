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
