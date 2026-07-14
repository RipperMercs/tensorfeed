/**
 * Money-path regression: validate BEFORE settle (2026-07-13 incident).
 *
 * One agent wallet settled 30 x $0.02 USDC on Base against param-required
 * premium endpoints while sending no query params. requirePayment settled and
 * minted a bearer token, and only then did the handler reject the call with a
 * 400 schema_validation_failure. No credit was debited (deferred debit), but
 * the on-chain USDC was spent and the agent threw the token away and re-paid
 * on the next call. It ran the identical 10-endpoint sweep three times.
 *
 * The invariant this file pins, driven over the REAL worker.fetch boundary:
 *
 *   1. A premium call missing its required params returns 400 and NEVER the
 *      402 payment challenge. No 402 means no x402 client will ever settle.
 *   2. The same endpoint WITH its required params still returns 402 when
 *      unpaid, so the guard cannot accidentally make premium data free.
 *   3. A paid, well-formed call still succeeds and still charges.
 *
 * Invert the ordering in index.ts (payment gate ahead of the input guard) and
 * case 1 flips from 400 to 402, failing here.
 */
import { describe, it, expect } from 'vitest';
import { makeEnv, seedToken, balanceOf, call } from './test-harness';

let seq = 0;
function uniqueIp(): string {
  seq += 1;
  return `198.51.100.${(seq % 250) + 1}`;
}

// The exact sweep the paying agent ran, with the params each endpoint requires.
const SWEPT: { path: string; valid: string }[] = [
  { path: '/api/premium/cost/projection', valid: 'model=gpt-5-5&input_tokens_per_day=1000000&output_tokens_per_day=200000' },
  { path: '/api/premium/compare/models', valid: 'ids=opus-4-7,gpt-5-5' },
  { path: '/api/premium/history/pricing/series', valid: 'model=claude-opus-4-7' },
  { path: '/api/premium/history/benchmarks/series', valid: 'model=claude-opus-4-7&benchmark=swe_bench' },
  { path: '/api/premium/history/status/uptime', valid: 'provider=openai' },
  { path: '/api/premium/security/cve/range', valid: 'from=2026-05-01&to=2026-05-07' },
  { path: '/api/premium/security/kev/series', valid: 'from=2026-03-01&to=2026-03-31' },
  { path: '/api/premium/security/epss/series', valid: 'cve_id=CVE-2024-3094' },
  { path: '/api/premium/history/news/clusters/full', valid: 'date=2026-07-01' },
  { path: '/api/premium/history/news/verified', valid: 'date=2026-07-01' },
];

describe('premium input guard runs before the payment gate', () => {
  it.each(SWEPT)('$path rejects a bare call with 400, never a 402 challenge', async ({ path }) => {
    const env = await makeEnv();
    const res = await call(env, path, { ip: uniqueIp() });

    // The whole point: an x402 client only settles after it is handed a 402
    // with an accepts block. A 400 here means the sweep costs the agent $0.
    expect(res.status).not.toBe(402);
    expect(res.status).toBe(400);

    const body = res.json as Record<string, unknown>;
    expect(body.error).toBe('missing_required_params');
    expect(Array.isArray(body.missing)).toBe(true);
    expect((body.missing as string[]).length).toBeGreaterThan(0);
    expect(typeof body.hint).toBe('string');
  });

  it.each(SWEPT)('$path still demands payment (402) once the params are valid', async ({ path, valid }) => {
    const env = await makeEnv();
    const res = await call(env, `${path}?${valid}`, { ip: uniqueIp() });

    // Guard must not turn a premium endpoint into a free one. Unpaid + valid
    // params is exactly the case that SHOULD get the 402 challenge.
    expect(res.status).toBe(402);
  });

  it('a bare call does not mint a token or touch a seeded balance', async () => {
    const env = await makeEnv();
    const token = 'tf_live_guard_balance';
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/history/status/uptime', {
      token,
      ip: uniqueIp(),
    });

    expect(res.status).toBe(400);
    // Rejected before the payment gate, so the credit balance is untouched.
    expect(await balanceOf(env, token)).toBe(100);
  });

  it('a paid, well-formed call still succeeds and still charges', async () => {
    // Seed the pricing payload compare/models reads, so this exercises the real
    // 200-and-charge path rather than the empty-KV no_models_matched branch.
    const env = await makeEnv({
      cache: {
        models: {
          // Fresh, or the freshness SLA fires and the call no-charges before
          // we get to observe the debit this case exists to prove.
          lastUpdated: new Date().toISOString(),
          providers: [
            {
              id: 'anthropic',
              name: 'Anthropic',
              models: [{ id: 'opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75 }],
            },
            {
              id: 'openai',
              name: 'OpenAI',
              models: [{ id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30 }],
            },
          ],
        },
      },
    });
    const token = 'tf_live_guard_happy';
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/compare/models?ids=opus-4-7,gpt-5-5', {
      token,
      ip: uniqueIp(),
    });

    // The guard is transparent to a correct call: it passes and bills as before.
    expect(res.status).toBe(200);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();
    expect(await balanceOf(env, token)).toBe(99);
  });
});
