/**
 * Generic premium wrapper (swarm audit #19). A migrated handler returns a
 * typed ComputeResult, never a Response, so a raw post-payment 4xx/5xx, a
 * skipped signed no-charge receipt, and billing-on-throw all become
 * un-writable. The payment gate, usage logging, and the map to the signed
 * settle helpers live here; the settle helpers are injected (PremiumDeps) to
 * avoid a circular import with index.ts and to keep this unit-testable.
 */
import type { Env } from './types';
import type { PaymentResult } from './payments';
import { requirePayment, TIER_COSTS } from './payments';
import type { NoChargeReason } from './receipts';

export type ComputeResult =
  | { kind: 'ok'; body: object; dataCapturedAt: string | null }
  | { kind: 'no_charge'; body: object; reason: NoChargeReason; dataCapturedAt?: string | null }
  | { kind: 'validation_failure'; error: Record<string, unknown>; status?: number; reason?: NoChargeReason }
  | { kind: 'upstream_failure'; error: Record<string, unknown>; status: number; reason?: NoChargeReason };

export type PremiumCompute = (payment: PaymentResult) => Promise<ComputeResult>;

export interface PremiumDescriptor {
  tier: 1 | 2 | 3 | 4 | 5;
  endpoint: string;
}

export interface PremiumDeps {
  premiumResponse: (
    result: object, payment: PaymentResult, creditsRequested: number, request: Request, env: Env,
    forcedNoChargeReason?: NoChargeReason, dataCapturedAt?: string | null,
  ) => Promise<Response>;
  premiumValidationFailure: (
    errorBody: Record<string, unknown>, payment: PaymentResult, request: Request, env: Env,
    noChargeReason?: NoChargeReason, status?: number,
  ) => Promise<Response>;
  logPremiumUsage: (env: Env, endpoint: string, ua: string, credits: number, token?: string, payerWallet?: string) => Promise<void>;
}

export async function handlePremium(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  descriptor: PremiumDescriptor,
  compute: PremiumCompute,
  deps: PremiumDeps,
): Promise<Response> {
  const payment = await requirePayment(request, env, descriptor.tier);
  if (!payment.paid) return payment.response!;

  const cost = TIER_COSTS[descriptor.tier];

  let result: ComputeResult;
  try {
    result = await compute(payment);
  } catch {
    result = { kind: 'upstream_failure', error: { ok: false, error: 'internal_error' }, status: 500, reason: '5xx' };
  }

  switch (result.kind) {
    case 'ok': {
      const ua = request.headers.get('User-Agent') || 'unknown';
      ctx.waitUntil(deps.logPremiumUsage(env, descriptor.endpoint, ua, cost, payment.token, payment.payerWallet));
      return deps.premiumResponse(result.body, payment, cost, request, env, null, result.dataCapturedAt);
    }
    case 'no_charge':
      return deps.premiumResponse(result.body, payment, cost, request, env, result.reason, result.dataCapturedAt ?? null);
    case 'validation_failure':
      return deps.premiumValidationFailure(result.error, payment, request, env, result.reason ?? 'schema_validation_failure', result.status ?? 400);
    case 'upstream_failure':
      return deps.premiumValidationFailure(result.error, payment, request, env, result.reason ?? 'upstream_failure', result.status);
  }
}
