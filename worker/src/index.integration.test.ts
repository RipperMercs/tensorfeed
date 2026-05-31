/**
 * Integration tests for the index.ts fetch router money path (audit #7).
 *
 * These drive the REAL exported worker.fetch via the test-harness, so they
 * exercise the actual wiring: requirePayment gate, the strict-premium vs
 * free-trial split, deferred-debit commit (commitPayment), and the AFTA
 * no-charge guarantees. They lock in the bug classes fixed across the
 * 2026-05-28..31 audit (the param-required-strict no-charge, the
 * strict/free routing split, and the stale-data no-charge).
 *
 * Each test uses a UNIQUE token and a UNIQUE client IP so the module-level
 * per-token circuit breaker and per-IP free-trial / rate-limit counters do
 * not bleed across cases.
 */

import { describe, it, expect } from 'vitest';
import { makeEnv, seedToken, balanceOf, call } from './test-harness';

// Unique-ish suffixes so token and IP state never collide across tests.
let seq = 0;
function uniqueToken(): string {
  seq += 1;
  return `tf_live_inttest_${seq}_${Math.random().toString(36).slice(2, 10)}`;
}
function uniqueIp(): string {
  seq += 1;
  // 198.51.100.0/24 is TEST-NET-2 (RFC 5737), safe for synthetic IPs.
  return `198.51.100.${(seq % 250) + 1}`;
}

describe('index.ts router money path (integration)', () => {
  // GATE 1: strict-premium path, no token, expect the canonical 402 challenge.
  it('returns the canonical x402 402 challenge on a no-token strict-premium call', async () => {
    const env = await makeEnv();
    // /api/premium/routing is strict-premium (no free trial) and tier 1.
    const res = await call(env, '/api/premium/routing?task=code', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json).not.toBeNull();
    // Canonical x402 V2 PaymentRequired body.
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    expect(Array.isArray(res.json?.accepts)).toBe(true);
    // Strict-premium endpoints advertise no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // GATE 2: non-strict premium path, no token, expect the free-trial 200.
  it('serves a free-trial 200 on a no-token non-strict premium call', async () => {
    // /api/premium/funding/federal/momentum is NOT on the strict list, so a
    // no-token call inside the per-IP trial quota should return 200 (free
    // trial), proving the strict/free split actually routes. Seed a FRESH
    // federal snapshot so the handler returns data (not the not-ready 503)
    // and the 36h freshness SLA does not fire.
    const captured = new Date().toISOString();
    const env = await makeEnv({
      cache: {
        'fedspend:snapshot': {
          ok: true,
          captured_at: captured,
          source: 'test',
          license: 'public domain',
          window_days: 365,
          cohort_size: 2,
          total_usd: 1_000_000,
          total_awards: 2,
          vendors: [
            {
              slug: 'palantir',
              name: 'Palantir',
              category: 'ai-native',
              total_usd: 700_000,
              award_count: 1,
              last_award_date: captured.slice(0, 10),
              top_agencies: [{ agency: 'DoD', agency_slug: 'dod', usd: 700_000 }],
            },
            {
              slug: 'anthropic',
              name: 'Anthropic',
              category: 'frontier-lab',
              total_usd: 300_000,
              award_count: 1,
              last_award_date: captured.slice(0, 10),
              top_agencies: [{ agency: 'DoD', agency_slug: 'dod', usd: 300_000 }],
            },
          ],
          agencies: [{ agency: 'DoD', agency_slug: 'dod', usd: 1_000_000 }],
          recent: [],
        },
      },
    });

    const res = await call(env, '/api/premium/funding/federal/momentum', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    // The billing block marks this as a free-trial, no-charge call.
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.tier).toBe('free_trial');
    expect(billing?.credits_charged).toBe(0);
    // The free-trial marker header is set on trial-served calls.
    expect(res.headers.get('X-TF-Free-Trial')).toBe('1');
  });

  // NO-CHARGE on bad params (#15/#20 class): valid token, missing required param.
  it('no-charges a valid-token strict-premium call that is missing the required param', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // /api/premium/route-verdict is strict-premium and param-required:
    // without ?task= or ?model= the handler returns premiumValidationFailure,
    // which is a no-charge event. The balance MUST be unchanged.
    const res = await call(env, '/api/premium/route-verdict', { token, ip: uniqueIp() });

    // AFTA no-charge shape, not a raw 4xx with no receipt.
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('missing_params');
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('schema_validation_failure');
    expect(billing?.afta_doc).toBe('https://tensorfeed.ai/agent-fair-trade');

    // Balance is unchanged: the deferred debit never committed.
    expect(await balanceOf(env, token)).toBe(100);
  });

  // DEBIT happy path: valid token, 200 response, balance drops by the cost.
  it('debits exactly the endpoint cost on a successful valid-token premium call', async () => {
    // Seed pricing + benchmarks so computeRouting has real candidates and
    // returns a populated (but still ok:true regardless) recommendation set.
    const env = await makeEnv({
      cache: {
        models: {
          providers: [
            {
              id: 'anthropic',
              name: 'Anthropic',
              models: [
                {
                  id: 'claude-x',
                  name: 'Claude X',
                  inputPrice: 3,
                  outputPrice: 15,
                  contextWindow: 200000,
                  capabilities: ['code', 'reasoning'],
                  openSource: false,
                },
              ],
            },
          ],
        },
        benchmarks: {
          models: [
            {
              model: 'Claude X',
              scores: { coding: 0.9, reasoning: 0.92, general: 0.9, creative: 0.85 },
            },
          ],
        },
      },
      status: {
        services: [
          {
            name: 'Anthropic API',
            provider: 'Anthropic',
            status: 'operational',
            statusPageUrl: 'https://status.anthropic.com',
            components: [],
            lastChecked: new Date().toISOString(),
          },
        ],
      },
    });
    const token = uniqueToken();
    await seedToken(env, token, 50);

    // /api/premium/routing is strict-premium tier 1 (cost 1), NULL freshness
    // SLA (pure compute, never stale), and computeRouting always returns
    // ok:true. So this is a clean charge of exactly 1 credit.
    const res = await call(env, '/api/premium/routing?task=code', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.credits_remaining).toBe(49);
    // No no-charge reason on a real charge.
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // Balance actually decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(49);
  });

  // NO-CHARGE on stale data: freshness SLA fires, no-charge, balance unchanged.
  it('no-charges and leaves the balance unchanged when the data is past its freshness SLA', async () => {
    // /api/premium/funding/exposure is strict-premium tier 3 (cost 5) with a
    // 7-day freshness SLA. Its capturedAt is the in-code registry timestamp
    // FUNDING_REGISTRY_LAST_UPDATED (2026-05-10), which is well past 7 days
    // old as of the audit, so the staleness check fires a no-charge with no
    // seeding required. computeFundingExposure returns ok:true deterministically.
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/funding/exposure', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.stale).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('stale_data');

    // Balance unchanged: stale data is free.
    expect(await balanceOf(env, token)).toBe(100);
  });
});
