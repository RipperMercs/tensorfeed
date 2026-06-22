/**
 * Money-path regression: bill-on-empty no-charge guards (2026-06-22 audit).
 *
 * The grep-first premium audit found paid endpoints that returned kind:'ok'
 * (charged 1 credit) when the underlying result was structurally empty: a cold
 * probe/snapshot layer, an all-null per-day series, or a query-param filter that
 * matched no row. Each now passes the 'empty_result' no-charge so the deferred
 * debit never commits.
 *
 * This drives the REAL worker.fetch boundary over a fresh (empty-KV) Env, which
 * IS the cold-start empty state for every endpoint below, and asserts the money
 * invariant: a 200 response, credits_charged === 0, no_charge_reason ===
 * 'empty_result', and the seeded balance is held. Remove a guard and the
 * endpoint charges 1 credit, dropping the balance to 99 and failing the case.
 *
 * Two confirmed bill-on-empty endpoints are NOT covered here because their empty
 * path needs a seeded upstream snapshot plus a non-matching filter (an empty Env
 * short-circuits to the snapshot_not_ready no-charge before the new guard):
 * /api/premium/ai-safety/incidents/exposure (entries_count 0) and
 * /api/premium/packages/releases/velocity (packages_in_snapshot 0). Their empty
 * shape is covered by the builder unit tests; the route guard mirrors the eight
 * proven here.
 */
import { describe, it, expect } from 'vitest';
import { makeEnv, seedToken, balanceOf, call } from './test-harness';

// Unique per-call IP + token: the per-IP trial counters and per-token records
// are process-scoped, so uniqueness isolates each case (mirrors the sweep test).
let seq = 0;
function uniqueIp(): string {
  seq += 1;
  // 198.51.100.0/24 is TEST-NET-2 (RFC 5737), safe for synthetic IPs.
  return `198.51.100.${(seq % 250) + 1}`;
}
function uniqueToken(): string {
  seq += 1;
  return `tf_live_empty_${seq}`;
}

// Endpoints whose empty/cold path is reachable over a fresh empty-KV Env with
// just a paid token and the minimum params needed to route past validation.
const CASES: { path: string; note: string }[] = [
  { path: '/api/premium/provider-reliability-verdict', note: 'cold probe layer -> empty ranking' },
  { path: '/api/premium/attention/series?provider=anthropic', note: 'no captured days -> captured_days 0' },
  { path: '/api/premium/hf/velocity', note: 'no captured snapshots -> all has_data:false' },
  { path: '/api/premium/openrouter/series', note: 'no captured snapshots -> all has_data:false' },
  { path: '/api/premium/x402-registry/series', note: 'no captured snapshots -> all has_data:false' },
  { path: '/api/premium/mcp/registry/series', note: 'no captured snapshots -> all has_data:false' },
  {
    path: '/api/premium/inference-providers/arbitrage?family=zzz-no-such-family',
    note: 'family filter matches no row -> models_in_matrix 0',
  },
  { path: '/api/premium/hf-leaderboard/movers', note: 'fewer than two captured days -> has_data false' },
];

describe('bill-on-empty: an empty result no-charges and holds the balance', () => {
  for (const c of CASES) {
    it(`no-charges ${c.path} (${c.note})`, async () => {
      const env = await makeEnv();
      const token = uniqueToken();
      await seedToken(env, token, 100);

      const res = await call(env, c.path, { token, ip: uniqueIp() });

      // The guard returns a normal 200 with the empty payload; the no-charge is
      // reflected in billing, not the status.
      expect(res.status).toBe(200);
      const billing = res.json?.billing as Record<string, unknown> | undefined;
      expect(billing).toBeDefined();
      expect(billing?.credits_charged).toBe(0);
      expect(billing?.no_charge_reason).toBe('empty_result');
      // Hard money invariant: the deferred debit never committed.
      expect(await balanceOf(env, token)).toBe(100);
    });
  }
});
