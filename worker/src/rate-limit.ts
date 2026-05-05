/**
 * IP-based rate limiter for the free public API.
 *
 * Goals
 * -----
 *   - Soft cap on accidental DoS from naive agents stuck in retry loops.
 *   - Broadcast standard `RateLimit-*` headers so well-behaved agents can
 *     back off programmatically without trial-and-error.
 *   - Zero KV ops. Counter lives in isolate memory and resets every minute.
 *
 * Trade-offs
 * ----------
 *   Distributed across isolates: a coordinated burst across multiple
 *   Cloudflare PoPs can exceed the per-IP limit on any one isolate but
 *   each isolate enforces its own cap. Acceptable: this layer is a
 *   developer-experience guardrail, not a security boundary. Real DDoS
 *   protection is Cloudflare's edge layer.
 *
 *   Premium endpoints are exempt: the per-token circuit breaker and
 *   per-call credit charge already prevent runaway loops there, and
 *   premium agents legitimately make bursts of calls.
 *
 *   Internal/admin paths exempt: server-to-server traffic from sister
 *   sites and Pages middleware should never be rate-limited.
 *
 * Headers
 * -------
 *   Uses the IETF draft (`RateLimit-Limit`, `RateLimit-Remaining`,
 *   `RateLimit-Reset`) plus the legacy `X-RateLimit-*` aliases for
 *   compatibility. `Retry-After` is also set on 429s.
 */

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT_PER_MIN = 120;
const MAX_TRACKED_IPS = 50_000;

interface IPState {
  count: number;
  windowStart: number;
}

const buckets: Map<string, IPState> = new Map();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * True if the request path is exempt from IP rate limiting. Premium
 * endpoints, payment endpoints (their own validation gates them),
 * internal/admin server-to-server endpoints, and the chaos test path
 * are exempt.
 */
export function isRateLimitExempt(path: string): boolean {
  if (path.startsWith('/api/premium/')) return true;
  if (path.startsWith('/api/payment/')) return true;
  if (path.startsWith('/api/internal/')) return true;
  if (path.startsWith('/api/admin/')) return true;
  if (path === '/api/refresh') return true;
  return false;
}

/**
 * Best-effort client IP. Cloudflare always sets CF-Connecting-IP at
 * the edge. Fallback to anonymous so a missing header does not let
 * the limiter be bypassed by stripping headers.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anonymous'
  );
}

/**
 * Check and increment the per-IP counter. Returns the current state
 * regardless of allow/deny so the caller can attach headers to every
 * response. The window resets every WINDOW_MS.
 */
export function checkIPRateLimit(
  ip: string,
  limit: number = DEFAULT_LIMIT_PER_MIN,
): RateLimitResult {
  const now = Date.now();

  // Soft GC to keep memory bounded if the isolate sees a flood of unique IPs.
  if (buckets.size > MAX_TRACKED_IPS) {
    for (const [key, state] of buckets) {
      if (now - state.windowStart > WINDOW_MS * 2) buckets.delete(key);
      if (buckets.size <= MAX_TRACKED_IPS / 2) break;
    }
  }

  let state = buckets.get(ip);
  if (!state || now - state.windowStart >= WINDOW_MS) {
    state = { count: 0, windowStart: now };
    buckets.set(ip, state);
  }

  state.count += 1;
  const remaining = Math.max(0, limit - state.count);
  const resetSeconds = Math.max(1, Math.ceil((state.windowStart + WINDOW_MS - now) / 1000));

  return {
    allowed: state.count <= limit,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Mutate a Response's headers in-place to add the standard rate-limit
 * headers. Use on every response from a non-exempt path so good agents
 * can pace themselves.
 */
export function applyRateLimitHeaders(response: Response, info: RateLimitResult): Response {
  // Response headers may be immutable on certain Cloudflare-cached
  // responses. Fall back to cloning when set() throws.
  try {
    response.headers.set('RateLimit-Limit', String(info.limit));
    response.headers.set('RateLimit-Remaining', String(info.remaining));
    response.headers.set('RateLimit-Reset', String(info.resetSeconds));
    response.headers.set('X-RateLimit-Limit', String(info.limit));
    response.headers.set('X-RateLimit-Remaining', String(info.remaining));
    response.headers.set('X-RateLimit-Reset', String(info.resetSeconds));
    return response;
  } catch {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('RateLimit-Limit', String(info.limit));
    newHeaders.set('RateLimit-Remaining', String(info.remaining));
    newHeaders.set('RateLimit-Reset', String(info.resetSeconds));
    newHeaders.set('X-RateLimit-Limit', String(info.limit));
    newHeaders.set('X-RateLimit-Remaining', String(info.remaining));
    newHeaders.set('X-RateLimit-Reset', String(info.resetSeconds));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
}

export function rateLimitedResponse(info: RateLimitResult): Response {
  const body = {
    ok: false,
    error: 'rate_limit_exceeded',
    limit: info.limit,
    remaining: 0,
    reset_seconds: info.resetSeconds,
    scope: 'per IP per minute',
    message:
      'You are sending requests faster than the free public API allows. Back off using the RateLimit-Reset header. Premium bearer tokens skip this limit entirely.',
    upgrade: '/developers/agent-payments',
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Retry-After': String(info.resetSeconds),
    'RateLimit-Limit': String(info.limit),
    'RateLimit-Remaining': '0',
    'RateLimit-Reset': String(info.resetSeconds),
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(info.resetSeconds),
  };
  return new Response(JSON.stringify(body), { status: 429, headers });
}

export const RATE_LIMIT_DEFAULTS = {
  WINDOW_MS,
  DEFAULT_LIMIT_PER_MIN,
};

// Test-only: clear the in-memory state between unit tests.
export function _resetRateLimitState(): void {
  buckets.clear();
  noChargeBuckets.clear();
}

// === Per-token no-charge abuse limiter ============================
//
// Closes the asymmetric resource exhaustion vector identified in the
// 2026-05-05 Gemini security audit. An attacker with a valid bearer
// token could spam premium endpoints with requests that intentionally
// fail schema validation (or trip the circuit breaker) to force the
// worker to perform expensive Ed25519 receipt signing N times per
// minute, with zero credit cost.
//
// Mitigation: track per-token no-charge events in an in-memory bucket
// (same primitive as the IP rate limiter). When a token exceeds the
// threshold, refuse to sign further no-charge receipts and short-
// circuit with a cheap 429. Legitimate users will not hit this:
// 20 no-charge events per minute is well above any honest agent's
// error rate.
//
// Memory: bounded by MAX_TRACKED_TOKENS via the same soft-GC pattern.

const NO_CHARGE_WINDOW_MS = 60_000;
const NO_CHARGE_LIMIT_PER_MIN = 20;
const MAX_TRACKED_TOKENS = 50_000;

interface NoChargeState {
  count: number;
  windowStart: number;
}

const noChargeBuckets: Map<string, NoChargeState> = new Map();

export interface NoChargeAbuseResult {
  abusive: boolean;
  count: number;
  limit: number;
  resetSeconds: number;
}

/**
 * Check and increment the per-token no-charge counter. Returns
 * `abusive: true` once the token exceeds NO_CHARGE_LIMIT_PER_MIN no-
 * charge events in a single window. Callers should skip signReceipt
 * (and the AFTA ledger write) when abusive=true to deny attackers
 * the cryptographic-signing CPU spend.
 *
 * The token argument should be the full bearer token; we hash it
 * implicitly via Map keying. No-op for empty strings.
 */
export function checkNoChargeAbuse(token: string): NoChargeAbuseResult {
  if (!token) {
    return {
      abusive: false,
      count: 0,
      limit: NO_CHARGE_LIMIT_PER_MIN,
      resetSeconds: NO_CHARGE_WINDOW_MS / 1000,
    };
  }
  const now = Date.now();

  if (noChargeBuckets.size > MAX_TRACKED_TOKENS) {
    for (const [key, state] of noChargeBuckets) {
      if (now - state.windowStart > NO_CHARGE_WINDOW_MS * 2) noChargeBuckets.delete(key);
      if (noChargeBuckets.size <= MAX_TRACKED_TOKENS / 2) break;
    }
  }

  let state = noChargeBuckets.get(token);
  if (!state || now - state.windowStart >= NO_CHARGE_WINDOW_MS) {
    state = { count: 0, windowStart: now };
    noChargeBuckets.set(token, state);
  }
  state.count += 1;
  const resetSeconds = Math.max(
    1,
    Math.ceil((state.windowStart + NO_CHARGE_WINDOW_MS - now) / 1000),
  );
  return {
    abusive: state.count > NO_CHARGE_LIMIT_PER_MIN,
    count: state.count,
    limit: NO_CHARGE_LIMIT_PER_MIN,
    resetSeconds,
  };
}

export const NO_CHARGE_ABUSE_DEFAULTS = {
  WINDOW_MS: NO_CHARGE_WINDOW_MS,
  LIMIT_PER_MIN: NO_CHARGE_LIMIT_PER_MIN,
};
