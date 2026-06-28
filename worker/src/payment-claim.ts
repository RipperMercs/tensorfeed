/**
 * PaymentClaim Durable Object.
 *
 * One DO instance per payment-idempotency key (idFromName(idemKey), where
 * idemKey = sha256 of the raw X-PAYMENT header). Cloudflare serializes access
 * to a single DO instance, so the claim() check-and-set is atomic and exactly
 * one concurrent request can win the right to settle + mint a payment.
 *
 * This closes the concurrent double-mint window (TOCTOU) on every CDP-routed
 * payment: the legacy KV mint-dedup in payments.ts is last-write-wins and
 * cannot serialize two simultaneous requests for the same payment. It guards
 * BOTH the existing EVM-via-CDP (Bazaar pilot) path and the new Solana rail
 * (Solana is always CDP-routed).
 *
 * The Solana on-chain signature does not exist until AFTER settle (CDP co-signs
 * the fee-payer slot at settle time), so the pre-settle idemKey (a hash of the
 * inbound signed payload, identical on a retry, distinct across payments) is
 * the concurrency gate. The settled signature is recorded at commit() time.
 *
 * State machine (single 'claim' storage key):
 *   - absent / stale-pending -> claim() writes pending, returns 'won'
 *   - fresh pending          -> claim() returns 'in_flight' (another caller is settling)
 *   - committed              -> claim() returns 'done' with the original token
 *
 * Mirrors the CreditLedger DO conventions (constructor, this.state.storage,
 * a fetch() router for production, a get* helper that returns null when the
 * binding is absent so node-env tests and the legacy path are unaffected).
 */

import type { Env } from './types';

export type ClaimStatus = 'won' | 'in_flight' | 'done';

export interface ClaimResult {
  status: ClaimStatus;
  /** Present when status === 'done': the originally minted bearer token. */
  token?: string;
  /** Present when status === 'done': the settled on-chain signature/tx. */
  signature?: string;
  /** Present when status === 'done': the buyer/payer address. */
  payer?: string;
}

interface ClaimState {
  phase: 'pending' | 'committed';
  /** ms timestamp of the claim (pending) or the mint (committed). */
  at: number;
  token?: string;
  signature?: string;
  payer?: string;
}

// A won-but-unfinished claim older than this is treated as abandoned (the
// winner likely died mid-settle) and may be re-won, so a crash never strands a
// payment forever. Matches the legacy claim-intent TTL.
export const CLAIM_PENDING_TTL_MS = 60_000;

export class PaymentClaim {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Atomically attempt to claim the right to settle + mint for an idempotency
   * key. Exactly one concurrent caller can win (the DO serializes this).
   * `nowMs` is passed in (not read from Date.now) so the TTL logic is
   * deterministically testable; production passes Date.now().
   */
  async claim(idemKey: string, nowMs: number): Promise<ClaimResult> {
    const rec = await this.state.storage.get<ClaimState>('claim');
    if (rec && rec.phase === 'committed' && typeof rec.token === 'string') {
      return { status: 'done', token: rec.token, signature: rec.signature, payer: rec.payer };
    }
    if (rec && rec.phase === 'pending' && nowMs - rec.at < CLAIM_PENDING_TTL_MS) {
      return { status: 'in_flight' };
    }
    // No record, or a stale pending whose owner likely died mid-settle: take it.
    const pending: ClaimState = { phase: 'pending', at: nowMs };
    await this.state.storage.put('claim', pending);
    return { status: 'won' };
  }

  /**
   * Finalize a won claim after a successful settle + mint. Records the token
   * and settled signature so any later or concurrent caller gets
   * { status: 'done' } with the original token and never mints again.
   */
  async commit(
    idemKey: string,
    token: string,
    nowMs: number,
    signature?: string,
    payer?: string,
  ): Promise<void> {
    const committed: ClaimState = { phase: 'committed', at: nowMs, token, signature, payer };
    await this.state.storage.put('claim', committed);
  }

  /**
   * Release a won-but-failed claim (settle failed) so a genuine retry can win
   * again instead of waiting out the TTL. NEVER clears a committed claim, which
   * would reopen the double-mint window.
   */
  async release(idemKey: string): Promise<void> {
    const rec = await this.state.storage.get<ClaimState>('claim');
    if (rec && rec.phase === 'pending') {
      await this.state.storage.delete('claim');
    }
  }

  /**
   * Production callers reach the DO via stub.fetch(request). Tests call the
   * methods directly; this router is exercised only when the binding is live.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return jsonResp({ ok: false, error: 'invalid_json' }, 400);
      }
    }
    const idemKey = typeof body.idemKey === 'string' ? body.idemKey : '';
    const nowMs = typeof body.nowMs === 'number' ? body.nowMs : Date.now();
    try {
      if (url.pathname === '/claim' && request.method === 'POST') {
        return jsonResp(await this.claim(idemKey, nowMs));
      }
      if (url.pathname === '/commit' && request.method === 'POST') {
        const token = typeof body.token === 'string' ? body.token : '';
        const signature = typeof body.signature === 'string' ? body.signature : undefined;
        const payer = typeof body.payer === 'string' ? body.payer : undefined;
        await this.commit(idemKey, token, nowMs, signature, payer);
        return jsonResp({ ok: true });
      }
      if (url.pathname === '/release' && request.method === 'POST') {
        await this.release(idemKey);
        return jsonResp({ ok: true });
      }
    } catch (err) {
      return jsonResp({ ok: false, error: 'internal', detail: String(err).slice(0, 200) }, 500);
    }
    return jsonResp({ ok: false, error: 'not_found' }, 404);
  }
}

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Get the DO stub for an idempotency key. idFromName(idemKey) deterministically
 * maps each payment to one DO instance regardless of PoP, so all claims for a
 * payment serialize. Returns null when the binding is absent (node-env tests,
 * or a misconfig) so callers fail closed to the legacy KV-dedup path.
 */
export function getPaymentClaim(env: Env, idemKey: string): DurableObjectStub | null {
  if (!env.PAYMENT_CLAIM) return null;
  const id = env.PAYMENT_CLAIM.idFromName(idemKey);
  return env.PAYMENT_CLAIM.get(id);
}
