/**
 * OpenAlex polite-pool fetch with retry + exponential backoff + full
 * jitter. Cloudflare's shared egress IPs are throttled by OpenAlex's
 * per-IP rate limiter regardless of polite-pool headers (mailto in UA),
 * so a single 429 can wedge the daily cron for the whole day. Three
 * attempts, cap 8s backoff, fresh 15s timeout per attempt.
 *
 * Notably does NOT set cf.cacheTtl: Cloudflare caches the response by
 * URL and would serve the cached 429 to subsequent retries, defeating
 * the backoff. The KV write that follows is the real cache; the
 * upstream call only happens daily.
 */

const RETRY_TIMEOUT_MS = 15_000;
const MAX_BACKOFF_MS = 8_000;

export async function fetchOpenAlexWithRetry(
  url: string,
  headers: Record<string, string>,
  attempts = 3,
): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const init: RequestInit = {
      headers,
      signal: AbortSignal.timeout(RETRY_TIMEOUT_MS),
    };
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (i === attempts - 1) throw err;
      await sleepWithJitter(i);
      continue;
    }
    if (res.ok) return res;
    last = res;
    // Non-retryable client error (400/401/403/404 etc.): fail fast.
    if (res.status !== 429 && res.status < 500) return res;
    if (i === attempts - 1) break;
    try { await res.body?.cancel(); } catch {}
    await sleepWithJitter(i);
  }
  return last!;
}

function sleepWithJitter(attempt: number): Promise<void> {
  const cap = Math.min(MAX_BACKOFF_MS, 2000 * Math.pow(2, attempt));
  const delay = Math.floor(Math.random() * cap);
  return new Promise(r => setTimeout(r, delay));
}
