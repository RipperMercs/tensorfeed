import { describe, it, expect, vi } from 'vitest';
import { makeEnv, makeCtx, seedToken } from './test-harness';
import { handlePremium, type PremiumDeps, type ComputeResult } from './premium-handler';

interface SpyDeps extends PremiumDeps {
  calls: { premiumResponse: unknown[][]; premiumValidationFailure: unknown[][]; logPremiumUsage: unknown[][] };
}
function spyDeps(): SpyDeps {
  const calls = { premiumResponse: [] as unknown[][], premiumValidationFailure: [] as unknown[][], logPremiumUsage: [] as unknown[][] };
  return {
    calls,
    premiumResponse: vi.fn(async (...a: unknown[]) => { calls.premiumResponse.push(a); return new Response('ok', { status: 200 }); }) as unknown as PremiumDeps['premiumResponse'],
    premiumValidationFailure: vi.fn(async (...a: unknown[]) => { calls.premiumValidationFailure.push(a); return new Response('vf', { status: 400 }); }) as unknown as PremiumDeps['premiumValidationFailure'],
    logPremiumUsage: vi.fn(async (...a: unknown[]) => { calls.logPremiumUsage.push(a); }) as unknown as PremiumDeps['logPremiumUsage'],
  };
}
let n = 0;
const ip = () => `198.51.100.${(n++ % 250) + 1}`;
function paidReq(token: string, path = '/api/premium/routing'): Request {
  return new Request(`https://tensorfeed.ai${path}`, { headers: { 'CF-Connecting-IP': ip(), 'User-Agent': 'unit/1', Authorization: `Bearer ${token}` } });
}

describe('handlePremium', () => {
  it('ok -> premiumResponse(cost, dataCapturedAt) + logPremiumUsage', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    const token = `tf_live_u${n++}`; await seedToken(env, token, 50);
    const compute: ComputeResult = { kind: 'ok', body: { ok: true }, dataCapturedAt: '2026-06-10T00:00:00Z' };
    const res = await handlePremium(paidReq(token), env, ctx, { tier: 1, endpoint: '/api/premium/routing' }, async () => compute, deps);
    expect(res.status).toBe(200);
    expect(deps.calls.premiumResponse.length).toBe(1);
    expect(deps.calls.logPremiumUsage.length).toBe(1);
    // (result.body, payment, cost=1, request, env, forcedNoChargeReason=null, dataCapturedAt)
    expect(deps.calls.premiumResponse[0][2]).toBe(1);
    expect(deps.calls.premiumResponse[0][5]).toBeNull();
    expect(deps.calls.premiumResponse[0][6]).toBe('2026-06-10T00:00:00Z');
  });

  it('no_charge -> premiumResponse(reason) and NO logPremiumUsage', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    const token = `tf_live_u${n++}`; await seedToken(env, token, 50);
    const res = await handlePremium(paidReq(token), env, ctx, { tier: 1, endpoint: '/api/premium/routing' },
      async () => ({ kind: 'no_charge', body: { ok: true }, reason: 'empty_result' }), deps);
    expect(res.status).toBe(200);
    expect(deps.calls.premiumResponse.length).toBe(1);
    expect(deps.calls.premiumResponse[0][5]).toBe('empty_result');
    expect(deps.calls.logPremiumUsage.length).toBe(0);
  });

  it('validation_failure -> premiumValidationFailure(reason, status)', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    const token = `tf_live_u${n++}`; await seedToken(env, token, 50);
    await handlePremium(paidReq(token), env, ctx, { tier: 1, endpoint: '/api/premium/routing' },
      async () => ({ kind: 'validation_failure', error: { ok: false, error: 'missing_params' } }), deps);
    expect(deps.calls.premiumValidationFailure.length).toBe(1);
    expect(deps.calls.premiumValidationFailure[0][4]).toBe('schema_validation_failure');
    expect(deps.calls.premiumValidationFailure[0][5]).toBe(400);
  });

  it('upstream_failure -> premiumValidationFailure(upstream_failure, 5xx status)', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    const token = `tf_live_u${n++}`; await seedToken(env, token, 50);
    await handlePremium(paidReq(token), env, ctx, { tier: 1, endpoint: '/api/premium/routing' },
      async () => ({ kind: 'upstream_failure', error: { ok: false, error: 'mitre_unavailable' }, status: 502 }), deps);
    expect(deps.calls.premiumValidationFailure.length).toBe(1);
    expect(deps.calls.premiumValidationFailure[0][4]).toBe('upstream_failure');
    expect(deps.calls.premiumValidationFailure[0][5]).toBe(502);
  });

  it('a thrown compute maps to a no-charge upstream_failure 500 (never bills)', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    const token = `tf_live_u${n++}`; await seedToken(env, token, 50);
    await handlePremium(paidReq(token), env, ctx, { tier: 1, endpoint: '/api/premium/routing' },
      async () => { throw new Error('boom'); }, deps);
    expect(deps.calls.premiumValidationFailure.length).toBe(1);
    expect(deps.calls.premiumValidationFailure[0][4]).toBe('5xx');
    expect(deps.calls.premiumValidationFailure[0][5]).toBe(500);
    expect(deps.calls.premiumResponse.length).toBe(0);
    expect(deps.calls.logPremiumUsage.length).toBe(0);
  });

  it('unpaid -> returns the 402 challenge, compute never runs', async () => {
    const env = await makeEnv(); const ctx = makeCtx(); const deps = spyDeps();
    let computed = false;
    // No token, strict path: requirePayment returns paid=false with the 402.
    const noTokenReq = new Request('https://tensorfeed.ai/api/premium/routing', { headers: { 'CF-Connecting-IP': ip(), 'User-Agent': 'unit/1' } });
    const res = await handlePremium(noTokenReq, env, ctx, { tier: 1, endpoint: '/api/premium/routing' },
      async () => { computed = true; return { kind: 'ok', body: {}, dataCapturedAt: null }; }, deps);
    expect(res.status).toBe(402);
    expect(computed).toBe(false);
    expect(deps.calls.premiumResponse.length).toBe(0);
    expect(deps.calls.premiumValidationFailure.length).toBe(0);
  });
});
