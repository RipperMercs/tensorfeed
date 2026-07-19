/**
 * Data attestations: durable, third-party-checkable citations for
 * premium responses (specs/moat-wave-20.md Feature A).
 *
 * A signed receipt already proves to the AGENT what it paid for and
 * what bytes it received. An attestation upgrades that private proof
 * into a public one: the agent opts in with `?attest=store` (or header
 * `X-Attest: store`) on any premium call, pays a 1-credit surcharge,
 * and TF persists the signed receipt under an `att_` id served at
 * GET /api/attest/{id} (free) plus the human page /attest?id={id}.
 * The agent's principal verifies the citation against TF directly,
 * without trusting the agent's copy of the bytes. Signature checking
 * itself rides the existing POST /api/receipt/verify.
 *
 * Storage: attest:{id} in TENSORFEED_CACHE, 90-day TTL. One write per
 * attested call; attested calls are a paid subset of premium calls, so
 * the KV budget impact is a rounding error. Reads are free-tier cached
 * (Cache-Control on the route) because attestations are immutable.
 *
 * Charging model (v1, deliberately simple):
 *   - Only calls that actually debited credits can be attested. A
 *     free-trial call or an AFTA no-charge outcome has no debit to
 *     attest; the response says why instead of storing.
 *   - The +1 surcharge is a second, separate debit committed through
 *     the same commitPayment machinery (DO ledger when enabled, legacy
 *     KV otherwise) under the synthetic endpoint '/api/attest/store',
 *     so it appears in the daily rollup and per-token usage like any
 *     other paid product. The receipt embedded in the attestation
 *     covers the DATA call; the surcharge is documented in the
 *     attestation block, not inside the signed core.
 */

import type { Env } from './types';
import type { SignedReceipt } from './receipts';

export const ATTEST_TTL_SECONDS = 90 * 24 * 60 * 60;
export const ATTEST_SURCHARGE_CREDITS = 1;

const ATTEST_KEY = (id: string) => `attest:${id}`;
const ATTEST_ID_RE = /^att_[0-9a-f]{16}$/;

export interface StoredAttestation {
  id: string;
  stored_at: string;
  expires_at: string;
  receipt: SignedReceipt;
}

export function generateAttestationId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `att_${hex}`;
}

export function isValidAttestationId(id: string): boolean {
  return ATTEST_ID_RE.test(id);
}

/**
 * Whether this request opted into attestation storage. Checked from the
 * URL or header so premiumResponse can decide without route plumbing.
 */
export function attestRequested(request: Request, url: URL): boolean {
  return (
    url.searchParams.get('attest') === 'store' ||
    request.headers.get('X-Attest') === 'store'
  );
}

export async function storeAttestation(
  env: Env,
  receipt: SignedReceipt,
  now: Date = new Date(),
): Promise<StoredAttestation> {
  const id = generateAttestationId();
  const record: StoredAttestation = {
    id,
    stored_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ATTEST_TTL_SECONDS * 1000).toISOString(),
    receipt,
  };
  await env.TENSORFEED_CACHE.put(ATTEST_KEY(id), JSON.stringify(record), {
    expirationTtl: ATTEST_TTL_SECONDS,
  });
  return record;
}

export async function getAttestation(env: Env, id: string): Promise<StoredAttestation | null> {
  if (!isValidAttestationId(id)) return null;
  return env.TENSORFEED_CACHE.get<StoredAttestation>(ATTEST_KEY(id), 'json');
}

/** Best-effort cleanup when the surcharge debit loses a balance race. */
export async function deleteAttestation(env: Env, id: string): Promise<void> {
  if (!isValidAttestationId(id)) return;
  try {
    await env.TENSORFEED_CACHE.delete(ATTEST_KEY(id));
  } catch (e) {
    console.error('attestation cleanup failed:', e);
  }
}

/** The public block attached to an attested premium response body. */
export function attestationBlock(record: StoredAttestation, siteUrl: string) {
  return {
    id: record.id,
    url: `${siteUrl}/attest?id=${record.id}`,
    api_url: `${siteUrl}/api/attest/${record.id}`,
    surcharge_credits: ATTEST_SURCHARGE_CREDITS,
    expires_at: record.expires_at,
    verify: `${siteUrl}/api/receipt/verify`,
  };
}
