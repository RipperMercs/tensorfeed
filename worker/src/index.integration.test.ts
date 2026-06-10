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
import { isInternalTraffic } from './usage-meter';

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
    // /api/premium/news/search is NOT on the strict list, so a no-token call
    // inside the per-IP trial quota returns 200 (free trial), proving the
    // strict/free split actually routes. searchNews returns ok:true with an
    // empty corpus, so no data seeding is needed for a valid free-trial 200.
    // (Repointed 2026-06-06: funding/federal/momentum was moved onto the strict
    // list by the 5aab69d free-trial-leak fix, so it now correctly 402s here.)
    const env = await makeEnv();
    const res = await call(env, '/api/premium/news/search', { ip: uniqueIp() });

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

  // INTERNAL TAG: a premium request carrying X-TF-Internal: <key> is TF's own
  // automated caller. The tag only affects AE telemetry (the request is excluded
  // from the external-demand funnel); it must NOT change the HTTP outcome. So an
  // internal-tagged strict-premium call returns the same canonical 402 challenge
  // as the un-tagged equivalent.
  it('handles an internal-tagged premium request identically to the un-tagged one', async () => {
    const env = await makeEnv();

    const plain = await call(env, '/api/premium/routing?task=code', { ip: uniqueIp() });
    const tagged = await call(env, '/api/premium/routing?task=code', { ip: uniqueIp(), internal: true });

    // Same status, same x402 challenge shape: the tag is telemetry-only.
    expect(tagged.status).toBe(plain.status);
    expect(tagged.status).toBe(402);
    expect(tagged.json?.x402Version).toBe(2);
    expect(tagged.json?.error).toBe('payment_required');

    // The header the harness sends equals the env secret, so the pure helper
    // the metering hook calls would classify it as internal.
    expect(isInternalTraffic(env.INTERNAL_TRAFFIC_KEY ?? null, env.INTERNAL_TRAFFIC_KEY)).toBe(true);
  });

  // FREE SURFACE: the premium catalog is itself free, not gated. A no-token
  // GET must return 200 with ok:true and a non-empty count, so an agent can
  // discover what to buy before it has paid for anything.
  it('serves /api/meta/premium free (no token) with ok:true and count > 0', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/meta/premium', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(typeof res.json?.count).toBe('number');
    expect(res.json?.count as number).toBeGreaterThan(0);
    expect(Array.isArray(res.json?.endpoints)).toBe(true);
  });

  // PUBLIC STATS: /api/stats must surface the real-money figures
  // (usd_received, paid_settlements) and an honest served-call alias
  // (premium_responses_served), and the note must no longer claim the
  // served-call count is credit-debited premium calls only.
  it('serves /api/stats with the real-money keys and an honest note', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/stats', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json).toHaveProperty('usd_received');
    expect(res.json).toHaveProperty('paid_settlements');
    expect(res.json).toHaveProperty('premium_responses_served');
    // Backward-compatible keys remain.
    expect(res.json).toHaveProperty('premium_calls_served');
    expect(res.json).toHaveProperty('total_credits_charged');
    // The misleading legacy note text must be gone.
    expect(typeof res.json?.note).toBe('string');
    expect(res.json?.note as string).not.toContain('credit-debited premium API calls only');
  });
});

// The x402 publisher trust-verdict endpoint is strict-premium and param-
// required (?domain=). These lock its gating + signing wiring at the HTTP
// boundary: the no-token 402 challenge, the missing-param no-charge, the
// not-in-registry no-charge (empty_result), the in-registry real charge with
// an AFTA-signed receipt, and the free redacted preview. They mirror the
// settlement-verdict integration posture exactly: same harness, same
// receipt.signature field-path for the AFTA signature, same balance asserts.
describe('x402 publisher-verdict', () => {
  // GATE: strict-premium, no token. The endpoint is on the strict list, so a
  // no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/x402-publisher-verdict?domain=x402.tavily.com', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    // Strict-premium advertises no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // NO-CHARGE on missing param: valid token, no ?domain=. premiumValidationFailure
  // returns 400 with the schema_validation_failure no-charge receipt; balance held.
  it('no-charges a valid-token call that is missing the domain param', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/x402-publisher-verdict', { token, ip: uniqueIp() });

    expect(res.status).toBe(400);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('schema_validation_failure');

    // Balance unchanged: the deferred debit never committed.
    expect(await balanceOf(env, token)).toBe(100);
  });

  // NO-CHARGE on not_indexed: valid token, a domain TF does not index. The agent
  // still gets the signed not_indexed ruling, billed at zero (empty_result rule).
  it('no-charges a not_indexed verdict for a domain absent from the registry', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/x402-publisher-verdict?domain=nonexistent-xyz.example', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.verdict).toBe('not_indexed');
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);

    // Balance unchanged: an empty result is free.
    expect(await balanceOf(env, token)).toBe(100);
  });

  // DEBIT happy path: valid token, a domain that IS in the verified directory.
  // Seed the directory blob so the domain resolves to a real verdict, then assert
  // exactly 1 credit is charged and the AFTA receipt is signed.
  it('charges 1 credit and signs an AFTA receipt for a domain in the verified directory', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // Seed the precomputed verified-directory blob the verdict reads
    // (TENSORFEED_CACHE key x402-idx:verified). A verified-settling + active
    // entry resolves to actively_settling (NOT not_indexed), so the call charges.
    // captured_at MUST be inside the 10-minute freshness SLA, or premiumResponse
    // correctly no-charges the read as stale. Seed it one minute ago so the test
    // is deterministic at any wall-clock time (a fixed timestamp goes stale and flakes).
    const freshCapturedAt = new Date(Date.now() - 60_000).toISOString();
    await env.TENSORFEED_CACHE.put('x402-idx:verified', JSON.stringify({
      captured_at: freshCapturedAt,
      publishers: [{ domain: 'seeded-pub.example', status: 'verified-settling', activity: 'active', settlement_count: 10, volume_usdc: '5.000000', first_settled: '2026-05-30', last_settled: '2026-06-03', pay_to_wallets: ['0xabc'], manifest_url: 'https://seeded-pub.example/.well-known/x402', source: 'manual', note: null, first_seen: '2026-05-30' }],
    }));

    const res = await call(env, '/api/premium/x402-publisher-verdict?domain=seeded-pub.example', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    // A directory hit yields a real verdict, never the not_indexed no-charge.
    expect(res.json?.verdict).not.toBe('not_indexed');
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness
    // Ed25519 key, so the response carries a top-level receipt with a base64url
    // signature. This is the same field-path a settlement-verdict success asserts.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });

  // FREE PREVIEW: no token, with a domain. Returns the redacted taste: ok, the
  // verdict and claim, but NOT the premium-only evidence or trust blocks.
  it('serves the free preview with the verdict but redacts evidence and trust', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/preview/x402-publisher-verdict?domain=x402.tavily.com', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.preview).toBe(true);
    expect(res.json).toHaveProperty('verdict');
    // The premium-only blocks must not leak into the free preview.
    expect(res.json).not.toHaveProperty('evidence');
    expect(res.json).not.toHaveProperty('trust');
  });
});

// The substrate-changelog family is a forward-only log of model lifecycle
// events and agent-protocol spec versions. FREE recent reads the
// `substrate-changelog:recent` ring plus the `substrate-changelog:specs:snapshot`
// and the `substrate-changelog:cursor` (for captured_at). PREMIUM history is
// strict-premium, param-required (from AND to), range-walks the
// `substrate-changelog:day:{date}` rollups, and is NULL_SLA (an immutable
// historical log never no-charges on staleness). These mirror the x402
// publisher-verdict posture exactly: same harness, same direct-KV seeding via
// env.TENSORFEED_CACHE.put, same receipt.signature field-path for the AFTA
// signature, same balance asserts.
describe('substrate-changelog', () => {
  // A minimal valid SubstrateEvent, ASCII-only (no em dashes, no double hyphens).
  function evt(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
      id: 'model_added:anthropic/claude-x:3/15',
      type: 'model_added',
      at: '2026-06-03',
      subject: 'anthropic/claude-x',
      provider: 'Anthropic',
      detail: 'Added Claude X at 3 in, 15 out.',
      version: null,
      source_url: null,
      ...over,
    };
  }

  // The current spec versions block the free recent feed surfaces. Stored at
  // KV_SPECS_SNAP as the full SpecSnapshot { mcp, x402, a2a, sources }.
  const specsSnapshot = {
    mcp: '2026-06-01',
    x402: 'v2',
    a2a: 'v1.0.0',
    sources: {
      mcp: 'https://github.com/modelcontextprotocol/modelcontextprotocol/releases',
      x402: 'https://github.com/coinbase/x402/tags',
      a2a: 'https://github.com/a2aproject/A2A/releases',
    },
  };

  // FREE: seeded recent ring (2 events) + specs snapshot + cursor -> 200, ok,
  // events present (length 2), and the current spec versions surfaced.
  it('serves recent with seeded events, clamps limit, and tolerates a garbage limit', async () => {
    const env = await makeEnv();
    const events = [
      evt({ id: 'spec_version:mcp:2026-06-01', type: 'spec_version', subject: 'mcp', provider: null, detail: 'MCP spec bumped to 2026-06-01.', version: '2026-06-01' }),
      evt(),
    ];
    await env.TENSORFEED_CACHE.put('substrate-changelog:recent', JSON.stringify(events));
    await env.TENSORFEED_CACHE.put('substrate-changelog:specs:snapshot', JSON.stringify(specsSnapshot));
    await env.TENSORFEED_CACHE.put('substrate-changelog:cursor', JSON.stringify({ last_run_at: new Date().toISOString() }));

    const res = await call(env, '/api/substrate-changelog/recent', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const recentEvents = res.json?.events as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(recentEvents)).toBe(true);
    expect(recentEvents?.length).toBe(2);
    // The current spec versions ride the response under current_specs.
    const currentSpecs = res.json?.current_specs as Record<string, unknown> | undefined;
    expect(currentSpecs).toBeDefined();
    expect(currentSpecs?.mcp).toBe('2026-06-01');
    expect(currentSpecs?.x402).toBe('v2');
    expect(currentSpecs?.a2a).toBe('v1.0.0');

    // limit=1 returns exactly one event (clamped slice).
    const one = await call(env, '/api/substrate-changelog/recent?limit=1', { ip: uniqueIp() });
    expect(one.status).toBe(200);
    expect((one.json?.events as unknown[] | undefined)?.length).toBe(1);

    // A garbage limit falls back to the default (20) and does not error.
    const garbage = await call(env, '/api/substrate-changelog/recent?limit=abc', { ip: uniqueIp() });
    expect(garbage.status).toBe(200);
    expect(garbage.json?.ok).toBe(true);
    // 2 seeded events, default-20 cap leaves them both present.
    expect((garbage.json?.events as unknown[] | undefined)?.length).toBe(2);
  });

  // GATE: strict-premium history, no token. The endpoint is on the strict list,
  // so a no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token history call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/substrate-changelog/history?from=2026-06-01&to=2026-06-04', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    // Strict-premium advertises no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // NO-CHARGE on missing param: valid token, no from/to. premiumValidationFailure
  // returns 400 with the schema_validation_failure no-charge receipt; balance held.
  it('no-charges a valid-token history call that is missing from/to', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/substrate-changelog/history', { token, ip: uniqueIp() });

    expect(res.status).toBe(400);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('schema_validation_failure');

    // Balance unchanged: the deferred debit never committed.
    expect(await balanceOf(env, token)).toBe(100);
  });

  // DEBIT happy path: valid token, a range with a seeded day rollup inside it +
  // a fresh cursor. NULL_SLA means staleness never no-charges, but the cursor is
  // seeded fresh anyway for realism. Asserts exactly 1 credit and a signed AFTA
  // receipt at the same receipt.signature field-path.
  it('charges 1 credit and signs an AFTA receipt when the range has events', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // A day rollup inside the window. Shape: { date, events: SubstrateEvent[] }.
    await env.TENSORFEED_CACHE.put('substrate-changelog:day:2026-06-03', JSON.stringify({
      date: '2026-06-03',
      events: [
        evt(),
        evt({ id: 'model_repriced:openai/gpt:2/8', type: 'model_repriced', subject: 'openai/gpt', provider: 'OpenAI', detail: 'Repriced GPT to 2 in, 8 out.' }),
      ],
    }));
    // Fresh cursor (last_run_at one minute ago). NULL_SLA means staleness will
    // not no-charge regardless, but seed it fresh for realism.
    await env.TENSORFEED_CACHE.put('substrate-changelog:cursor', JSON.stringify({
      last_run_at: new Date(Date.now() - 60_000).toISOString(),
    }));

    const res = await call(env, '/api/premium/substrate-changelog/history?from=2026-06-01&to=2026-06-04', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const histEvents = res.json?.events as unknown[] | undefined;
    expect(Array.isArray(histEvents)).toBe(true);
    expect((histEvents as unknown[]).length).toBeGreaterThan(0);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness
    // Ed25519 key, so the response carries a top-level receipt with a base64url
    // signature. Same field-path the publisher-verdict success asserts.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });

  // FILTER: event_type=framework_release must actually narrow the result to
  // framework releases (regression guard: the handler whitelist must include
  // framework_release, or the filter is silently dropped and the full window
  // is returned).
  it('filters premium history to framework_release events when event_type is set', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    await env.TENSORFEED_CACHE.put('substrate-changelog:day:2026-06-03', JSON.stringify({
      date: '2026-06-03',
      events: [
        evt(),
        evt({ id: 'framework_release:langchain:v0.3.99', type: 'framework_release', subject: 'langchain', provider: null, detail: 'langchain released v0.3.99', version: 'v0.3.99', source_url: 'https://github.com/langchain-ai/langchain/releases/tag/v0.3.99' }),
      ],
    }));
    await env.TENSORFEED_CACHE.put('substrate-changelog:cursor', JSON.stringify({
      last_run_at: new Date(Date.now() - 60_000).toISOString(),
    }));

    const res = await call(env, '/api/premium/substrate-changelog/history?from=2026-06-01&to=2026-06-04&event_type=framework_release', { token, ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const events = res.json?.events as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(events)).toBe(true);
    // Only the framework_release event survives the filter (NOT the model_added one).
    expect(events?.length).toBe(1);
    expect(events?.[0]?.type).toBe('framework_release');
    expect((res.json?.billing as Record<string, unknown> | undefined)?.credits_charged).toBe(1);
  });

  // NO-CHARGE on empty range: valid token, a range with no day rollups. The agent
  // gets the ok empty result, billed at zero (empty_result rule). Balance held.
  it('no-charges an empty range with no day rollups', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/substrate-changelog/history?from=2026-06-01&to=2026-06-04', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);

    // Balance unchanged: an empty result is free.
    expect(await balanceOf(env, token)).toBe(100);
  });
});

// The export-controls family is a forward-only log of US BIS AI and advanced-
// computing export-control actions classified from the Federal Register. FREE
// /api/export-controls/ai reads the `export-controls:ai:events` snapshot and
// rolls it up into by_category + recent + total (and returns a 200 total:0
// shape pre-first-cron, never a 503). PREMIUM /api/premium/export-controls/ai/
// history is strict-premium, param-reading (from/to/category, all optional),
// reads the same snapshot, filters it, and is NULL_SLA (an immutable historical
// log never no-charges on staleness; only the empty_result no-charge applies).
// These mirror the substrate-changelog / ai-contracts posture: same harness,
// same direct-KV seeding via env.TENSORFEED_CACHE.put, same receipt.signature
// field-path for the AFTA signature, same balance asserts.
describe('export-controls', () => {
  // A minimal valid ExportControlEvent, ASCII-only (no em dashes, no double
  // hyphens). `over` lets a case vary the category or date.
  function evt(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
      id: '2026-09999',
      title: 'Additions to the Entity List',
      doc_type: 'Rule',
      category: 'entity-list',
      abstract: 'BIS adds parties to the Entity List for advanced-computing diversion risk.',
      publication_date: '2026-06-03',
      source_url: 'https://www.federalregister.gov/documents/2026/06/03/2026-09999',
      agency: 'BIS',
      ...over,
    };
  }

  // A seeded snapshot with two events in distinct categories and a recent
  // captured_at (well within any SLA, though the premium path is NULL_SLA).
  function snapshot(): Record<string, unknown> {
    const events = [
      evt(),
      evt({
        id: '2026-09998',
        title: 'Advanced Computing and Semiconductor Manufacturing Items',
        doc_type: 'Rule',
        category: 'compute-threshold',
        abstract: 'BIS revises the advanced-computing performance thresholds and license requirements.',
        publication_date: '2026-06-02',
        source_url: 'https://www.federalregister.gov/documents/2026/06/02/2026-09998',
      }),
    ];
    return {
      ok: true,
      captured_at: new Date(Date.now() - 60_000).toISOString(),
      source: 'US Federal Register (federalregister.gov), Bureau of Industry and Security',
      license: 'Public domain (US Government work). TensorFeed editorial classification.',
      total: events.length,
      events,
    };
  }

  // FREE: seeded snapshot -> 200, ok, by_category + recent + total present.
  it('serves the free feed with by_category, recent, and total from the seeded snapshot', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_CACHE.put('export-controls:ai:events', JSON.stringify(snapshot()));

    const res = await call(env, '/api/export-controls/ai', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.total).toBe(2);
    const byCategory = res.json?.by_category as Record<string, number> | undefined;
    expect(byCategory).toBeDefined();
    expect(byCategory?.['entity-list']).toBe(1);
    expect(byCategory?.['compute-threshold']).toBe(1);
    const recent = res.json?.recent as unknown[] | undefined;
    expect(Array.isArray(recent)).toBe(true);
    expect(recent?.length).toBe(2);
  });

  // FREE COLD: no KV snapshot -> 200 with total:0 (the parseable not-ready
  // shape), NOT a 503. An agent always gets a valid answer pre-first-cron.
  it('serves a 200 total:0 cold shape when no snapshot exists, not a 503', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/export-controls/ai', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.total).toBe(0);
    expect(res.json?.by_category).toEqual({});
    expect((res.json?.recent as unknown[] | undefined)?.length).toBe(0);
  });

  // GATE: strict-premium history, no token. The endpoint is on the strict list,
  // so a no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token history call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/export-controls/ai/history', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    // Explicitly assert this is NOT a free-trial 200.
    expect(res.status).not.toBe(200);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // DEBIT happy path: valid token, seeded snapshot, no filter (returns all). The
  // snapshot has events, so it charges exactly 1 credit and signs an AFTA receipt
  // at the same receipt.signature field-path the substrate/ai-contracts tests use.
  it('charges 1 credit and signs an AFTA receipt when the snapshot has events', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    await env.TENSORFEED_CACHE.put('export-controls:ai:events', JSON.stringify(snapshot()));

    const res = await call(env, '/api/premium/export-controls/ai/history', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const events = res.json?.events as unknown[] | undefined;
    expect(Array.isArray(events)).toBe(true);
    expect((events as unknown[]).length).toBe(2);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness
    // Ed25519 key. Same field-path the substrate-changelog success asserts.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });

  // NO-CHARGE on empty filter: valid token, seeded snapshot, a category that
  // matches no event. The agent gets the ok empty result billed at zero
  // (empty_result rule). Balance held.
  it('no-charges a valid-token history call whose category filter matches nothing', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    await env.TENSORFEED_CACHE.put('export-controls:ai:events', JSON.stringify(snapshot()));

    const res = await call(env, '/api/premium/export-controls/ai/history?category=nonexistent-category', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.total).toBe(0);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('empty_result');

    // Balance unchanged: an empty result is free.
    expect(await balanceOf(env, token)).toBe(100);
  });
});

// The ai-datacenters family is a curated, bundled registry (23 verified AI
// datacenter projects) plus a premium buildout aggregate. There is no KV seeding
// here: the registry ships in the worker module, so the free endpoint always has
// data and the premium aggregate is always non-empty (it always charges). The
// premium path is strict-premium, no-param, NULL_SLA (a curated registry never
// no-charges on staleness). These mirror the substrate-changelog / publisher-verdict
// posture: same harness, same receipt.signature field-path for the AFTA signature,
// same balance asserts. The only difference is the premium call needs no params
// and no seeding, so the happy-path debit is the simplest of the family.
describe('ai-datacenters', () => {
  // FREE: no token. The bundled registry always has data, so the unfiltered feed
  // returns 200 with all 23 entries and the last-updated date.
  it('serves the free registry with all entries and a last_updated date', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/ai-datacenters', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(typeof res.json?.count).toBe('number');
    expect(res.json?.count as number).toBeGreaterThan(0);
    expect(res.json?.count).toBe(23);
    const datacenters = res.json?.datacenters as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(datacenters)).toBe(true);
    expect((datacenters as unknown[]).length).toBeGreaterThan(0);
    expect((datacenters as unknown[]).length).toBe(res.json?.count);
    // The registry last-updated date rides the response.
    expect(typeof res.json?.last_updated).toBe('string');
    expect((res.json?.last_updated as string).length).toBeGreaterThan(0);
  });

  // FREE with an operator filter. operator is a case-insensitive SUBSTRING match,
  // so ?operator=meta narrows the feed and every returned entry's operator
  // contains 'meta' (case-insensitive). The narrowed count is strictly smaller
  // than the unfiltered count.
  it('narrows the free feed by operator and every entry matches the substring', async () => {
    const env = await makeEnv();
    const all = await call(env, '/api/ai-datacenters', { ip: uniqueIp() });
    expect(all.status).toBe(200);
    const unfilteredCount = all.json?.count as number;

    const res = await call(env, '/api/ai-datacenters?operator=meta', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const filteredCount = res.json?.count as number;
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(unfilteredCount);

    const datacenters = res.json?.datacenters as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(datacenters)).toBe(true);
    for (const dc of datacenters as Array<Record<string, unknown>>) {
      expect((dc.operator as string).toLowerCase()).toContain('meta');
    }
  });

  // FREE with a status filter. status is a case-insensitive EXACT match, so every
  // returned entry has status 'operational'.
  it('filters the free feed by status and every entry has that status', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/ai-datacenters?status=operational', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const datacenters = res.json?.datacenters as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(datacenters)).toBe(true);
    expect((datacenters as unknown[]).length).toBeGreaterThan(0);
    for (const dc of datacenters as Array<Record<string, unknown>>) {
      expect(dc.status).toBe('operational');
    }
  });

  // GATE: strict-premium buildout, no token. The endpoint is on the strict list,
  // so a no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token buildout call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/ai-datacenters/buildout', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    // Strict-premium advertises no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // DEBIT happy path: valid token, no params, no seeding. The bundled registry is
  // always non-empty, NULL_SLA means staleness never no-charges, so the call
  // charges exactly 1 credit and returns the buildout aggregate with a signed AFTA
  // receipt at the same receipt.signature field-path.
  it('charges 1 credit and signs an AFTA receipt for the buildout aggregate', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/ai-datacenters/buildout', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    // The aggregate totals ride the response with projects and disclosed power.
    const totals = res.json?.totals as Record<string, unknown> | undefined;
    expect(totals).toBeDefined();
    expect(typeof totals?.projects).toBe('number');
    expect(totals?.projects as number).toBeGreaterThan(0);
    expect(typeof totals?.disclosed_power_mw).toBe('number');

    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness Ed25519
    // key, so the response carries a top-level receipt with a base64url signature.
    // Same field-path the substrate-changelog and publisher-verdict successes assert.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });
});

// The ai-procurement family is a daily keyword-filtered AI procurement snapshot
// over USAspending.gov (every vendor, rolled up by buying-agency demand plus an
// emerging-vendor flag). FREE /api/procurement/ai-contracts reads the
// `ai-procurement:snapshot` KV blob (cold-start safe: an empty 200 shape with a
// note pre-first-cron, never a 503). PREMIUM /api/premium/procurement/ai-contracts/demand
// is strict-premium, no-param, derives agency concentration + emerging vendors +
// top buying agencies, and no-charges (empty_result) when the snapshot is absent.
// These mirror the substrate-changelog / ai-datacenters posture: same harness,
// same direct-KV seeding via env.TENSORFEED_CACHE.put, same receipt.signature
// field-path for the AFTA signature, same balance asserts.
describe('ai-procurement', () => {
  // The KV key the 16:23 UTC cron writes and both routes read. Mirrors
  // AI_PROCUREMENT_SNAPSHOT_KEY exported from ai-procurement.ts.
  const SNAPSHOT_KEY = 'ai-procurement:snapshot';

  // A realistic ProcurementSnapshot: two agencies (so HHI and top-agency share
  // are meaningful), one cohort vendor (Palantir, emerging false) and one
  // outside-cohort vendor (emerging true), and one recent dated award. ASCII
  // only (no em dashes, no double hyphens).
  function snapshot(capturedAt: string): Record<string, unknown> {
    return {
      ok: true,
      captured_at: capturedAt,
      source: 'USAspending.gov (test)',
      license: 'Public domain (US Government work).',
      window_days: 180,
      keywords: ['artificial intelligence', 'machine learning'],
      total_usd: 1_000_000,
      total_awards: 3,
      unique_recipients: 2,
      unique_agencies: 2,
      by_agency: [
        { agency: 'Department of Defense', agency_slug: 'dod', usd: 700_000, award_count: 2 },
        { agency: 'Department of Health and Human Services', agency_slug: 'hhs', usd: 300_000, award_count: 1 },
      ],
      by_vendor: [
        { recipient: 'Palantir Technologies', usd: 700_000, award_count: 2, emerging: false },
        { recipient: 'Aperture Robotics LLC', usd: 300_000, award_count: 1, emerging: true },
      ],
      recent: [
        {
          award_id: 'CONT_AWD_TEST_0001',
          recipient: 'Palantir Technologies',
          amount: 400_000,
          agency: 'Department of Defense',
          agency_slug: 'dod',
          description: 'Artificial intelligence advisory services.',
          award_type: 'contract',
          internal_id: 'TEST_INTERNAL_1',
          date: '2026-05-30',
        },
      ],
    };
  }

  // FREE with a seeded snapshot: 200, ok, the spread snapshot surfaces with a
  // positive total_awards and the by_agency demand rollup, no note (note is the
  // cold-start marker only).
  it('serves the free snapshot with totals and the agency rollup when seeded', async () => {
    const env = await makeEnv();
    const captured = new Date().toISOString();
    await env.TENSORFEED_CACHE.put(SNAPSHOT_KEY, JSON.stringify(snapshot(captured)));

    const res = await call(env, '/api/procurement/ai-contracts', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(typeof res.json?.total_awards).toBe('number');
    expect(res.json?.total_awards as number).toBeGreaterThan(0);
    const byAgency = res.json?.by_agency as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(byAgency)).toBe(true);
    expect((byAgency as unknown[]).length).toBeGreaterThan(0);
    // The seeded snapshot has no note; note only appears on the cold-start shape.
    expect(res.json?.note ?? null).toBeNull();
  });

  // FREE cold (no seed): 200, ok, total_awards 0, with the cold-start note. The
  // contract is an empty parseable answer, NEVER a 503.
  it('serves a cold-start empty 200 with a note when no snapshot is seeded', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/procurement/ai-contracts', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.total_awards).toBe(0);
    expect(typeof res.json?.note).toBe('string');
    expect((res.json?.note as string).length).toBeGreaterThan(0);
  });

  // GATE: strict-premium demand, no token. The endpoint is on the strict list,
  // so a no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token demand call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/procurement/ai-contracts/demand', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    // Strict-premium advertises no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // DEBIT happy path: valid token + a seeded fresh snapshot. The demand read
  // derives agency_concentration, charges exactly 1 credit, and signs an AFTA
  // receipt at the same receipt.signature field-path.
  it('charges 1 credit and signs an AFTA receipt for the demand read', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    // Fresh snapshot so the 36h freshness SLA does not fire.
    await env.TENSORFEED_CACHE.put(SNAPSHOT_KEY, JSON.stringify(snapshot(new Date().toISOString())));

    const res = await call(env, '/api/premium/procurement/ai-contracts/demand', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    // The demand verdict carries the agency concentration block.
    const concentration = res.json?.agency_concentration as Record<string, unknown> | undefined;
    expect(concentration).toBeDefined();
    expect(typeof concentration?.top_agency_share_pct).toBe('number');
    expect(typeof concentration?.hhi).toBe('number');

    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness Ed25519
    // key, so the response carries a top-level receipt with a base64url signature.
    // Same field-path the substrate-changelog and ai-datacenters successes assert.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });

  // NO-CHARGE cold: valid token, no snapshot. The handler no-charges
  // (empty_result), returns the ok empty shape, and the balance is held.
  it('no-charges a valid-token demand call when no snapshot is seeded', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/procurement/ai-contracts/demand', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);

    // Balance unchanged: an empty result is free.
    expect(await balanceOf(env, token)).toBe(100);
  });
});

// The ai-opportunities family is the open-solicitation sibling of ai-procurement:
// a daily title-keyword SAM.gov search for AI terms across every agency, rolled up
// by agency and set-aside with a closing-soon preview. FREE
// /api/procurement/ai-opportunities reads the `ai-opportunities:snapshot` KV blob
// with the full `open` pipeline stripped (cold-start safe: an empty 200 shape with
// a note pre-first-cron, never a 503). PREMIUM
// /api/premium/procurement/ai-opportunities/deadlines is strict-premium, no-param,
// ranks the full open pipeline by response deadline with days_remaining on each,
// and no-charges (empty_result) when the snapshot is absent. Same harness, same
// direct-KV seeding via env.TENSORFEED_CACHE.put, same receipt.signature field-path
// for the AFTA signature, same balance asserts as the ai-procurement block above.
describe('ai-opportunities', () => {
  // The KV key the 01:37 UTC cron writes and both routes read. Mirrors
  // OPP_SNAPSHOT_KEY exported from ai-opportunities.ts.
  const SNAPSHOT_KEY = 'ai-opportunities:snapshot';

  // A realistic OpportunitySnapshot: one open opportunity with a FUTURE
  // response_deadline (so it survives isOpen and yields a positive
  // days_remaining in the premium ranking), plus the rollups and previews the
  // free view surfaces. ASCII only (no em dashes, no double hyphens).
  function snapshot(capturedAt: string): Record<string, unknown> {
    const deadline = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const opp = {
      notice_id: 'TEST_NOTICE_0001',
      title: 'Artificial Intelligence Advisory Services',
      solicitation_number: 'TEST-SOL-0001',
      agency: 'Department of Defense',
      agency_path: 'Department of Defense.Defense Information Systems Agency',
      notice_type: 'Solicitation',
      posted_date: '2026-05-30',
      response_deadline: deadline,
      naics_code: '541512',
      set_aside: 'Total Small Business Set-Aside',
      active: true,
      ui_link: 'https://sam.gov/opp/TEST_NOTICE_0001/view',
      matched_keyword: 'artificial intelligence',
    };
    return {
      ok: true,
      captured_at: capturedAt,
      source: 'SAM.gov Get Opportunities API (test)',
      license: 'Public domain (US Government work).',
      window_days: 90,
      keywords: ['artificial intelligence', 'machine learning'],
      total_open: 1,
      unique_agencies: 1,
      by_agency: [{ agency: 'Department of Defense', open_count: 1 }],
      by_set_aside: [{ set_aside: 'Total Small Business Set-Aside', count: 1 }],
      closing_soon: [opp],
      recent: [opp],
      open: [opp],
    };
  }

  // FREE with a seeded snapshot: 200, ok, the rollups and closing_soon preview
  // surface, and the full `open` pipeline is stripped (that ranked list is the
  // premium read, not the free view).
  it('serves the free snapshot with totals and closing_soon but strips the open pipeline when seeded', async () => {
    const env = await makeEnv();
    const captured = new Date().toISOString();
    await env.TENSORFEED_CACHE.put(SNAPSHOT_KEY, JSON.stringify(snapshot(captured)));

    const res = await call(env, '/api/procurement/ai-opportunities', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(typeof res.json?.total_open).toBe('number');
    const closingSoon = res.json?.closing_soon as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(closingSoon)).toBe(true);
    // The full `open` pipeline is the premium read; the free view must not leak it.
    expect('open' in (res.json as Record<string, unknown>)).toBe(false);
  });

  // FREE cold (no seed): 200, ok, total_open 0, with the cold-start note. The
  // contract is an empty parseable answer, NEVER a 503.
  it('serves a cold-start empty 200 with total_open 0 when no snapshot is seeded', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/procurement/ai-opportunities', { ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.total_open).toBe(0);
    expect(typeof res.json?.note).toBe('string');
    expect((res.json?.note as string).length).toBeGreaterThan(0);
  });

  // GATE: strict-premium deadlines, no token. The endpoint is on the strict list,
  // so a no-token call returns the canonical x402 402 challenge, NOT a free trial.
  it('returns the canonical 402 challenge on a no-token deadlines call (no free trial)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/procurement/ai-opportunities/deadlines', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    // Strict-premium advertises no free trial.
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  // DEBIT happy path: valid token + a seeded fresh snapshot. The deadlines read
  // ranks the open pipeline, charges exactly 1 credit, and signs an AFTA receipt
  // at the same receipt.signature field-path.
  it('charges 1 credit and signs an AFTA receipt for the deadlines read', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    // Fresh snapshot (captured_at recent) so the 36h freshness SLA does not fire
    // and the charge actually happens.
    await env.TENSORFEED_CACHE.put(
      SNAPSHOT_KEY,
      JSON.stringify(snapshot(new Date(Date.now() - 60_000).toISOString())),
    );

    const res = await call(env, '/api/premium/procurement/ai-opportunities/deadlines', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    // The ranked pipeline: deadlines is an array, first item carries a numeric
    // days_remaining.
    const deadlines = res.json?.deadlines as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(deadlines)).toBe(true);
    expect((deadlines as unknown[]).length).toBeGreaterThan(0);
    expect(typeof (deadlines as Array<Record<string, unknown>>)[0].days_remaining).toBe('number');

    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();

    // AFTA signature: premiumResponse signs the receipt with the harness Ed25519
    // key, so the response carries a top-level receipt with a base64url signature.
    // Same field-path the ai-procurement demand success asserts.
    const receipt = res.json?.receipt as Record<string, unknown> | undefined;
    expect(receipt).toBeDefined();
    expect(typeof receipt?.signature).toBe('string');
    expect((receipt?.signature as string).length).toBeGreaterThan(0);

    // Balance decremented by exactly the cost.
    expect(await balanceOf(env, token)).toBe(99);
  });

  // NO-CHARGE cold: valid token, no snapshot. The handler no-charges
  // (empty_result), returns the ok empty shape, and the balance is held.
  it('no-charges a valid-token deadlines call when no snapshot is seeded', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/procurement/ai-opportunities/deadlines', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing).toBeDefined();
    expect(billing?.credits_charged).toBe(0);

    // Balance unchanged: an empty result is free.
    expect(await balanceOf(env, token)).toBe(100);
  });
});

// Canonical accepts[].outputSchema so x402scan and spec-compliant x402
// indexers find the input schema at the standard location (the coinbase
// x402 DiscoveryInfo shape: outputSchema = { input, output? }). Long-
// standing x402scan rejection was "parseResponse: Missing input schema"
// because TF only carried the schema under the non-standard
// extensions.bazaar.info key. These tests lock in the canonical surface
// on BOTH the 402 body (full input + output) and the size-bounded headers
// (input-only, well under the 16KB overflow guard).
describe('canonical accepts[].outputSchema (x402scan registration)', () => {
  // Decode the base64 PAYMENT-REQUIRED header into the canonical object.
  function decodeHeader(b64: string | null): Record<string, unknown> {
    if (!b64) throw new Error('missing PAYMENT-REQUIRED header');
    return JSON.parse(
      Buffer.from(b64, 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
  }

  it('BODY: accepts[0].outputSchema carries the full DiscoveryInfo (input + output)', async () => {
    const env = await makeEnv();
    // /api/premium/routing is strict-premium AND a Bazaar pilot with both
    // info.input and info.output, so its 402 body must surface the full
    // DiscoveryInfo at accepts[0].outputSchema.
    const res = await call(env, '/api/premium/routing?task=code', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    const accepts = res.json?.accepts as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(accepts)).toBe(true);
    const outputSchema = accepts?.[0]?.outputSchema as Record<string, unknown> | undefined;
    expect(outputSchema).toBeDefined();

    const input = outputSchema?.input as Record<string, unknown> | undefined;
    expect(input).toBeDefined();
    expect(input?.type).toBe('http');
    expect(typeof input?.method).toBe('string');
    expect(input?.queryParams).toBeDefined();
    expect(typeof input?.queryParams).toBe('object');

    // Canonical-only QueryInput: the body outputSchema.input must carry ONLY
    // the coinbase x402 fields { type, method, queryParams, pathParams?,
    // headers? }. The CDP/Bazaar typing extra queryFields and the
    // CDP-normalization extras discoverable + url must NOT leak into the
    // canonical discovery surface a strict x402scan indexer reads.
    expect(input).not.toHaveProperty('queryFields');
    expect(input).not.toHaveProperty('discoverable');
    expect(input).not.toHaveProperty('url');

    // The full body form also carries output.
    expect(outputSchema?.output).toBeDefined();
    expect((outputSchema?.output as Record<string, unknown>)?.type).toBe('json');
  });

  it('HEADER: PAYMENT-REQUIRED accepts[0].outputSchema is input-only and stays under 16KB', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/routing?task=code', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    const b64 = res.headers.get('PAYMENT-REQUIRED');
    expect(b64).not.toBeNull();
    // The same base64 rides BOTH PAYMENT-REQUIRED and WWW-Authenticate, so
    // the per-header budget is what matters; assert it well under the guard.
    expect((b64 as string).length).toBeLessThan(16000);

    const decoded = decodeHeader(b64);
    const accepts = decoded.accepts as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(accepts)).toBe(true);
    const outputSchema = accepts?.[0]?.outputSchema as Record<string, unknown> | undefined;
    expect(outputSchema).toBeDefined();

    // Input present (the schema x402scan reads from the header).
    const input = outputSchema?.input as Record<string, unknown> | undefined;
    expect(input).toBeDefined();
    expect(input?.type).toBe('http');

    // Canonical-only QueryInput in the header form too. The header input is
    // derived from the body's outputSchema.input, so the queryFields/CDP
    // extras must already be gone here.
    expect(input).not.toHaveProperty('queryFields');
    expect(input).not.toHaveProperty('discoverable');
    expect(input).not.toHaveProperty('url');

    // Output ABSENT in the header form: the heavy example stays body-only.
    expect(outputSchema?.output).toBeUndefined();

    // WWW-Authenticate carries the identical base64 challenge.
    const wwwAuth = res.headers.get('WWW-Authenticate');
    expect(wwwAuth).toContain(b64 as string);
  });

  it('a strict-premium path with NO bazaar config yields a valid 402 with no outputSchema and does not throw', async () => {
    const env = await makeEnv();
    // /api/premium/history/news/full is strict-premium but NOT a Bazaar
    // pilot, so bazaarExtensionsFor returns {} and there is no info to
    // derive an outputSchema from. The 402 must still be well-formed.
    const res = await call(env, '/api/premium/history/news/full', { ip: uniqueIp() });

    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.error).toBe('payment_required');
    const accepts = res.json?.accepts as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(accepts)).toBe(true);
    // No bazaar config means no outputSchema is attached.
    expect(accepts?.[0]?.outputSchema).toBeUndefined();

    // The header still encodes (no throw) and decodes to a valid challenge.
    const b64 = res.headers.get('PAYMENT-REQUIRED');
    expect(b64).not.toBeNull();
    const decoded = decodeHeader(b64);
    const decodedAccepts = decoded.accepts as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(decodedAccepts)).toBe(true);
    expect(decodedAccepts?.[0]?.outputSchema).toBeUndefined();
  });
});

const EM_DASH_HEADLINE = 'A ' + String.fromCharCode(0x2014) + ' B';

describe('breaking alert endpoints', () => {
  it('GET /api/breaking returns null alert when none set', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/breaking', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.alert ?? null).toBeNull();
  });

  it('POST /api/admin/breaking requires ADMIN_KEY, rejects INGEST_KEY', async () => {
    const env = await makeEnv();
    const denied = await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-ingest-key', body: { headline: 'x', href: '/x' }, ip: uniqueIp(),
    });
    expect([401, 404]).toContain(denied.status);
    const ok = await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-admin-key', body: { headline: 'Anthropic filed an S-1', href: '/originals/x' }, ip: uniqueIp(),
    });
    expect(ok.status).toBe(200);
    expect(ok.json?.ok).toBe(true);
  });

  it('rejects a bad href and an em-dash headline with 400', async () => {
    const env = await makeEnv();
    const badHref = await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-admin-key', body: { headline: 'ok', href: 'https://evil.example' }, ip: uniqueIp(),
    });
    expect(badHref.status).toBe(400);
    const emDash = await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-admin-key', body: { headline: EM_DASH_HEADLINE, href: '/x' }, ip: uniqueIp(),
    });
    expect(emDash.status).toBe(400);
  });

  it('set then GET returns the active alert; clear removes it', async () => {
    const env = await makeEnv();
    await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-admin-key', body: { headline: 'Live now', href: '/originals/x' }, ip: uniqueIp(), settle: true,
    });
    const live = await call(env, '/api/breaking', { ip: uniqueIp() });
    expect((live.json?.alert as Record<string, unknown> | undefined)?.headline).toBe('Live now');
    await call(env, '/api/admin/breaking', { method: 'POST', token: 'test-admin-key', body: { clear: true }, ip: uniqueIp(), settle: true });
    const raw = await env.TENSORFEED_CACHE.get('breaking:current');
    expect(raw).toBeNull();
  });

  it('admin GET shows raw + is_live + audit', async () => {
    const env = await makeEnv();
    await call(env, '/api/admin/breaking', {
      method: 'POST', token: 'test-admin-key', body: { headline: 'h', href: '/x' }, ip: uniqueIp(), settle: true,
    });
    const admin = await call(env, '/api/admin/breaking', { token: 'test-admin-key', ip: uniqueIp() });
    expect(admin.json?.is_live).toBe(true);
    expect((admin.json?.raw as Record<string, unknown> | undefined)?.headline).toBe('h');
    expect(Array.isArray(admin.json?.audit)).toBe(true);
  });
});

describe('admin request-health view', () => {
  it('rejects without the admin key', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/admin/request-health', { ip: uniqueIp() });
    expect(res.status === 401 || res.status === 404).toBe(true);
  });

  it('returns the shaped report with the admin key (AE unavailable in tests, degrades gracefully)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/admin/request-health?key=test-admin-key', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.slow_ms).toBe(5000);
    expect(res.json?.status).toBe('unavailable');
    expect(res.json?.top_5xx_by_path ?? null).toBeNull();
    // Diagnostic UA breakdown ships in the report shape even when AE is
    // unavailable, so consumers can rely on the key existing.
    expect('slow_by_ua' in (res.json ?? {})).toBe(true);
    expect(res.json?.slow_by_ua ?? null).toBeNull();
  });
});

// === SLA capturedAt no-charge fix (fix-sla-capturedat) ===============
// These lock in the billing-correctness fix: 7 SLA-bearing premium
// endpoints surfaced their real data-capture time under a field that
// premiumResponse's precedence walk did not read, so a stalled cron
// billed stale data as fresh (the staleness no-charge was silently
// inert). Each fix plumbs the REAL underlying capture time as the
// explicit 7th dataCapturedAt arg (or a precedence field). The two
// representative HIGH endpoints below prove the SLA now fires: a recent
// capture still charges, a capture past the SLA no-charges.
describe('SLA capturedAt no-charge (research/velocity, kev/full)', () => {
  // Seed a minimal but valid velocity baseline + recent window so
  // computeResearchVelocity runs fully offline (the recent snapshot's
  // windowDays/realizedWindowDays match the constants, so the OpenAlex
  // 30-day fetch is short-circuited). capturedAt drives the baseline age.
  function velocitySeed(baselineCapturedAt: string): Record<string, unknown> {
    return {
      'openalex-ai-institutions:current': {
        capturedAt: baselineCapturedAt,
        institutions: [
          {
            rank: 1,
            openalex_id: 'I100',
            display_name: 'Test University',
            country_code: 'US',
            type: 'education',
            ai_works_last_year: 1200,
            total_works_count: 50000,
          },
        ],
      },
      // realizedWindowDays must equal REALIZED_WINDOW_DAYS (30 - 14 = 16) and
      // windowDays must equal RECENT_WINDOW_DAYS (30), or getRecent30dCached
      // discards this and hits the network. fromDate/toDate are descriptive.
      'openalex-ai-institutions:recent-30d': {
        fetchedAt: '2026-06-01T00:00:00Z',
        windowDays: 30,
        realizedWindowDays: 16,
        lagBufferDays: 14,
        fromDate: '2026-05-05',
        toDate: '2026-05-19',
        countsById: { I100: 60 },
      },
    };
  }

  it('research/velocity: a RECENT baseline still charges 1 credit', async () => {
    // Baseline captured 1h ago: well inside the 24h SLA, so the call is a
    // normal charge of exactly 1 credit. Proves the fix did not introduce a
    // no-charge on fresh data.
    const captured = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const env = await makeEnv({ cache: velocitySeed(captured) });
    const token = uniqueToken();
    await seedToken(env, token, 50);

    const res = await call(env, '/api/premium/research/velocity', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.stale ?? false).toBe(false);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();
    expect(await balanceOf(env, token)).toBe(49);
  });

  it('research/velocity: a STALE baseline (past the 24h SLA) no-charges', async () => {
    // Baseline captured 3 days ago: past the 24h SLA. Under the OLD inert
    // behavior baseline_captured_at was not a precedence field, so the call
    // wrongly charged. The fix plumbs it as the 7th arg, so the SLA now fires
    // a stale_data no-charge and the balance is untouched.
    const captured = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const env = await makeEnv({ cache: velocitySeed(captured) });
    const token = uniqueToken();
    await seedToken(env, token, 50);

    const res = await call(env, '/api/premium/research/velocity', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.stale).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('stale_data');
    // Balance unchanged: stale data is free.
    expect(await balanceOf(env, token)).toBe(50);
  });

  // kev/full reads the catalog from kev:current and the capture time from
  // kev:meta.last_run (NOT catalog.dateReleased, which can sit past the SLA
  // while our daily cron is healthy). Seed both.
  function kevSeed(lastRun: string): Record<string, unknown> {
    return {
      'kev:current': {
        title: 'CISA KEV',
        catalogVersion: '2026.06.01',
        dateReleased: '2026-06-01T00:00:00.000Z',
        count: 1,
        vulnerabilities: [
          {
            cveID: 'CVE-2026-0001',
            vendorProject: 'TestVendor',
            product: 'TestProduct',
            vulnerabilityName: 'Test vuln',
            dateAdded: '2026-01-15',
            shortDescription: 'A test vulnerability.',
            requiredAction: 'Patch it.',
            dueDate: '2026-02-15',
            knownRansomwareCampaignUse: 'Unknown',
            notes: '',
          },
        ],
      },
      'kev:meta': {
        last_run: lastRun,
        catalog_version: '2026.06.01',
        catalog_date_released: '2026-06-01T00:00:00.000Z',
        total_entries: 1,
        newly_added_today: 0,
      },
    };
  }

  it('security/kev/full: a RECENT cron run still charges 1 credit', async () => {
    // last_run 1h ago: inside the 36h SLA, normal charge.
    const lastRun = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const env = await makeEnv({ cache: kevSeed(lastRun) });
    const token = uniqueToken();
    await seedToken(env, token, 50);

    const res = await call(env, '/api/premium/security/kev/full', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.stale ?? false).toBe(false);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(1);
    expect(billing?.no_charge_reason ?? null).toBeNull();
    expect(await balanceOf(env, token)).toBe(49);
  });

  it('security/kev/full: a STALE cron run (past the 36h SLA) no-charges', async () => {
    // last_run 4 days ago: past the 36h SLA. The fix plumbs kev:meta.last_run
    // as the 7th arg, so a stalled capture cron no-charges instead of billing
    // stale catalog data as fresh.
    const lastRun = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const env = await makeEnv({ cache: kevSeed(lastRun) });
    const token = uniqueToken();
    await seedToken(env, token, 50);

    const res = await call(env, '/api/premium/security/kev/full', { token, ip: uniqueIp() });

    expect(res.status).toBe(200);
    expect(res.json?.ok).toBe(true);
    expect(res.json?.stale).toBe(true);
    const billing = res.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('stale_data');
    expect(await balanceOf(env, token)).toBe(50);
  });
});

// clean/cve migrated onto handlePremium. Two network-free assertions: the
// no-token gate, and the intentional behavior change, an upstream MITRE 5xx is
// now a SIGNED no-charge receipt (was a raw jsonResponse 502 with no receipt).
// The MITRE upstream is forced to 5xx by stubbing global fetch on a cache miss;
// nothing else on the request path uses global fetch.
describe('clean/cve (migrated)', () => {
  it('no-token strict call returns the canonical 402', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/clean/cve/CVE-2026-0001', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    expect(res.json?.x402Version).toBe(2);
    expect(res.json?.free_trial ?? null).toBeNull();
  });

  it('signs the upstream-5xx no-charge instead of a raw 502, balance held', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
    try {
      const res = await call(env, '/api/premium/clean/cve/CVE-2030-0001', { token, ip: uniqueIp() });
      expect(res.status).toBe(502);
      const billing = res.json?.billing as Record<string, unknown> | undefined;
      expect(billing).toBeDefined();
      expect(billing?.credits_charged).toBe(0);
      // The point of this migration: a signed receipt now rides the 5xx no-charge.
      const receipt = res.json?.receipt as Record<string, unknown> | undefined;
      expect(receipt).toBeDefined();
      expect(typeof receipt?.signature).toBe('string');
      expect((receipt?.signature as string).length).toBeGreaterThan(0);
      // Balance untouched: an upstream failure never charges.
      expect(await balanceOf(env, token)).toBe(100);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
