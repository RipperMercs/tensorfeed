// Soft per-request deadline for the Worker fetch handler.
//
// A true gateway-timeout 504 happens when a handler hangs (usually an upstream
// subrequest with no timeout) and never returns. The edge eventually serves an
// opaque HTML 504, and because the worker never reached its own telemetry hook,
// recordRequestHealth cannot see it: the hang is invisible by path. This module
// converts that hang into a fast, structured 504 that the worker returns itself,
// which means the normal post-route telemetry DOES record it (status 504 +
// elapsed ~deadline), finally making "which path is hanging" visible.
//
// The deadline is deliberately generous (default 20s, ~4x SLOW_MS and far above
// any healthy handler) so it only ever fires on genuine hangs, never on normal
// slow-but-completing work.

export const DEFAULT_REQUEST_DEADLINE_MS = 20000;

// Parse the REQUEST_DEADLINE_MS env override. Falls back to the default when the
// value is absent, non-numeric, or not a positive finite number. Lets us retune
// the threshold via `wrangler secret`/var without a code change.
export function resolveDeadlineMs(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_REQUEST_DEADLINE_MS;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REQUEST_DEADLINE_MS;
}

// Admin and refresh endpoints are server-to-server, low volume, and may
// legitimately run long (RSS refetch, Analytics Engine SQL). Shedding them would
// break real work for no benefit, so they opt out of the soft deadline.
export function isDeadlineExempt(path: string): boolean {
  return path.startsWith('/api/admin/') || path === '/api/refresh';
}

// Build the fast structured 504 served when the soft deadline fires. Agent-
// parseable JSON naming the path and the deadline it crossed, a short
// Retry-After (the hang is usually a transient upstream slowdown), and an
// explicit no-store so this shed is never cached. extraHeaders carries the
// worker's CORS headers so an agent can read the body cross-origin.
export function buildDeadlineResponse(
  path: string,
  deadlineMs: number,
  extraHeaders: Record<string, string>,
): Response {
  const body = {
    ok: false,
    error: 'request_deadline_exceeded',
    status: 504,
    message:
      'This request crossed the server soft deadline and was shed before completing. This is usually a transient upstream slowdown. Retry shortly.',
    path,
    deadline_ms: deadlineMs,
    retry_after_seconds: 5,
  };
  return new Response(JSON.stringify(body), {
    status: 504,
    headers: {
      ...extraHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': '5',
    },
  });
}

// Race the route handler against the soft deadline. If the handler resolves
// first, its Response is returned and the pending timer is cleared. If the
// deadline fires first, build504() is returned so the request never rides to an
// opaque edge gateway-timeout. The losing handler promise is abandoned; callers
// MUST pass a `work` promise that cannot reject (the route dispatch is wrapped in
// its own catch-all that always resolves to a Response).
export async function raceDeadline(
  work: Promise<Response>,
  deadlineMs: number,
  build504: () => Response,
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<Response>((resolve) => {
    timer = setTimeout(() => resolve(build504()), deadlineMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
