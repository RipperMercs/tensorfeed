// Shared helper for TensorFeed's own automated caller scripts.
//
// Returns the `X-TF-Internal` header so the usage funnel (/api/admin/usage)
// excludes this request from external-demand metrics. The worker compares the
// header value to its INTERNAL_TRAFFIC_KEY secret; a match tags the Analytics
// Engine datapoint internal (blob7 = '1') and the funnel SQL drops it.
//
// Two guards keep it safe:
//   1. Sends nothing unless INTERNAL_TRAFFIC_KEY is set in this process env, so
//      a fresh checkout with no key configured behaves exactly as before.
//   2. Sends the key ONLY to tensorfeed.ai hosts. The cross-host smoke test
//      points at sister sites; the key must never leave TF's own origin.
const KEY = process.env.INTERNAL_TRAFFIC_KEY || '';

export function internalHeaders(targetUrl) {
  if (!KEY) return {};
  try {
    if (new URL(targetUrl).hostname.endsWith('tensorfeed.ai')) {
      return { 'X-TF-Internal': KEY };
    }
  } catch {
    // Not a parseable absolute URL: send nothing rather than guess.
  }
  return {};
}
