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
  });
});
