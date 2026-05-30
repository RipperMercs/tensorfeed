import type { Env } from './types';

export type UsageTier = 'free' | 'premium';
export type UsageOutcome = 'paid' | 'unpaid_402' | 'served_free' | 'error';

export interface UsageEvent {
  path: string;
  tier: UsageTier;
  outcome: UsageOutcome;
  wallet?: string;
  ua: string;
  country?: string;
  credits?: number;
}

// Tracked free path prefixes (premiumization-signal endpoints). All /api/premium/*
// is always tracked. Everything else (internal, admin, health, cron) is ignored.
const TRACKED_FREE_PREFIXES = ['/api/feeds', '/api/status', '/api/news', '/api/agents'];

export function normalizeUaFamily(ua: string): string {
  if (!ua) return 'unknown';
  // Take the token before the first slash or space, lowercased, bounded length.
  const head = ua.split(/[/\s]/)[0].toLowerCase().trim();
  return head ? head.slice(0, 40) : 'unknown';
}

// Pure: decide whether a request is metered, and how. Returns null to skip.
export function deriveUsageEvent(path: string, status: number, charged: boolean): UsageEvent | null {
  const isPremium = path.startsWith('/api/premium/');
  const isTrackedFree = TRACKED_FREE_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
  if (!isPremium && !isTrackedFree) return null;

  const tier: UsageTier = isPremium ? 'premium' : 'free';
  let outcome: UsageOutcome;
  if (status === 402) outcome = 'unpaid_402';
  else if (status >= 200 && status < 300) outcome = charged ? 'paid' : 'served_free';
  else outcome = 'error';

  return { path, tier, outcome, ua: '' };
}

// Best-effort AE write. Never throws; never blocks a response.
export function recordUsageEvent(env: Env, evt: UsageEvent): void {
  try {
    if (!env.USAGE_AE) return;
    env.USAGE_AE.writeDataPoint({
      indexes: [evt.path],
      blobs: [
        evt.path,
        evt.tier,
        evt.outcome,
        evt.wallet ?? '',
        normalizeUaFamily(evt.ua),
        evt.country ?? '',
      ],
      doubles: [evt.credits ?? 0],
    });
  } catch {
    // swallow: telemetry must never affect the response path
  }
}
