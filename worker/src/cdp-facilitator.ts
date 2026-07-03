/**
 * Coinbase Developer Platform x402 facilitator client.
 *
 * Routes payment verify/settle through CDP's hosted facilitator at
 * https://api.cdp.coinbase.com/platform/v2/x402. First successful settle
 * triggers automatic Bazaar cataloging of the endpoint resource.
 *
 * Sister module to worker/src/x402-facilitator.ts (the self-broadcast
 * implementation). Both can coexist; routing decision happens upstream
 * per endpoint.
 *
 * SECURITY CONSTRAINTS (see memory feedback_cdp_key_constraints):
 *   1. CDP_BASE_URL is hardcoded. Do NOT make it env-configurable.
 *   2. authHeaders() refuses to sign JWTs for any path outside
 *      /platform/v2/x402, preventing accidental use against Trading,
 *      Wallet, Onramp, or other CDP API surfaces.
 *   3. Only this module imports CDP_API_KEY_ID / CDP_API_KEY_SECRET.
 *   4. Key material is never logged, returned, or included in errors.
 *   5. The key is tied to Evan's personal Coinbase account; treat
 *      with extreme care.
 *
 * JWT spec captured 2026-05-14 from @coinbase/cdp-sdk@1.49.2 auth/utils/jwt.ts.
 * Header: { alg: "EdDSA", kid: apiKeyId, typ: "JWT", nonce }
 * Payload: { sub: apiKeyId, iss: "cdp", uris: [`${method} ${host}${path}`],
 *            iat, nbf, exp (now + 120s) }
 * Secret format: 64-byte base64 (32-byte seed + 32-byte public key).
 */

import { SignJWT, importJWK } from 'jose';
import type { Env } from './types';
import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyResult,
  SettleResult,
  FacilitatorErrorCode,
} from './x402-facilitator';

// Hardcoded. The ONE base URL this module ever fetches. Any change here
// would broaden the blast radius of the CDP key; require explicit memory
// update + Evan sign-off before touching.
const CDP_BASE_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';
const CDP_HOST = 'api.cdp.coinbase.com';
const CDP_BASE_PATH = '/platform/v2/x402';

// Identifies us in CDP's correlation logs (optional, follows their SDK pattern).
const TF_X402_VERSION = '1.0.0';

// JWT expiry. CDP SDK default is 120s; matching that.
const JWT_EXPIRY_SECONDS = 120;

// Bound length for clipped response excerpts in error messages.
const RESPONSE_EXCERPT_LIMIT = 200;

// Per-request upstream timeouts. CDP is the only worker fetch on the PAID hot
// path; without a bound, a stalled CDP request (TCP open, no response) hangs the
// agent's paid invocation. verify and the read calls move no funds so they fail
// fast at 15s. settle broadcasts on-chain, so it gets the same 30s bound as the
// self-broadcast receipt wait (x402-facilitator.ts:608) to avoid aborting a
// settle CDP would have completed. An AbortError lands in each function's
// existing try/catch and surfaces as a clean verify/settle failure, not a hang.
const CDP_TIMEOUT_MS = 15_000;
const CDP_SETTLE_TIMEOUT_MS = 30_000;

// ---------- public response types ----------

export interface CdpDiscoveryResource {
  resource: string;
  type: string;
  x402Version: number;
  accepts: PaymentRequirements[];
  lastUpdated: string;
  metadata?: Record<string, unknown>;
}

export interface CdpDiscoveryResourcesResponse {
  x402Version: number;
  items: CdpDiscoveryResource[];
  pagination: { limit: number; offset: number; total: number };
}

export interface CdpSupportedResponse {
  kinds: Array<{
    x402Version: number;
    scheme: string;
    network: string;
    extra?: Record<string, unknown>;
  }>;
  extensions: string[];
  signers: Record<string, string[]>;
}

/**
 * Extends SettleResult with the EXTENSION-RESPONSES header, which CDP
 * uses to indicate Bazaar metadata acceptance vs rejection. Surface this
 * on the settle response so the route handler can log + alert on
 * rejection without re-querying the catalog.
 *
 *   - extensionResponses: the raw header value, exactly as CDP sent it.
 *     Kept verbatim for debugging (the wire format is not stable; see
 *     decodeBazaarStatus).
 *   - bazaarStatus: the normalized status token ("processing" |
 *     "indexed" | "rejected" | ...), tolerant-decoded from whatever
 *     format the header arrived in. This is the value to branch/alert on.
 */
export interface CdpSettleResult extends SettleResult {
  extensionResponses?: string;
  bazaarStatus?: string;
}

// ---------- base64 / base64url helpers (Workers-safe; no Node Buffer) ----------

function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBase64Url(b64: string): string {
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function randomNonceHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function base64ToUtf8(b64: string): string {
  // decodeBase64ToBytes uses atob and throws on non-base64 input; callers
  // wrap this in try/catch and fall back to literal handling.
  return new TextDecoder().decode(decodeBase64ToBytes(b64));
}

function extractBazaarStatus(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const obj = json as Record<string, unknown>;
  const bazaar = obj.bazaar;
  if (typeof bazaar === 'string') return bazaar;
  if (bazaar && typeof bazaar === 'object') {
    const status = (bazaar as Record<string, unknown>).status;
    if (typeof status === 'string') return status;
  }
  if (typeof obj.status === 'string') return obj.status;
  return undefined;
}

/**
 * Normalizes CDP's EXTENSION-RESPONSES header to a status token. Two wire
 * formats have been observed on this header:
 *
 *   - Bare literal token: "processing" | "indexed" | "rejected"
 *     (documented 2026-05-14 against GitHub x402-foundation/x402#2207).
 *   - Base64-encoded JSON: { bazaar: { status: "processing", ... } }
 *     (verified 2026-05-18 on hyperD, described in the same thread as the
 *     "post-fix" wire format).
 *
 * The format is not stable across facilitator deployments / over time, so
 * this decodes tolerantly rather than betting on one shape: try
 * base64 -> JSON -> bazaar.status, then un-encoded JSON, then fall back to
 * the trimmed literal. NEVER throws and never returns '' (maps to
 * undefined) so callers can branch on a clean optional string.
 */
export function decodeBazaarStatus(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // base64(JSON), the post-fix format verified on hyperD.
  try {
    const status = extractBazaarStatus(JSON.parse(base64ToUtf8(trimmed)));
    if (status) return status;
  } catch {
    /* not base64 JSON; fall through */
  }

  // Some deployments may send the JSON object un-encoded.
  try {
    const status = extractBazaarStatus(JSON.parse(trimmed));
    if (status) return status;
  } catch {
    /* not raw JSON either */
  }

  // Bare literal token ("processing" | "indexed" | "rejected" | ...).
  return trimmed;
}

// ---------- JWT construction ----------

/**
 * Constructs a per-request Ed25519 JWT bound to (method, path) at CDP_HOST.
 *
 * @throws if the secret is not a 64-byte base64 blob, or if jose signing fails.
 * Errors do NOT include the secret material.
 */
async function buildJwt(
  apiKeyId: string,
  apiKeySecret: string,
  method: string,
  path: string,
): Promise<string> {
  let raw: Uint8Array;
  try {
    raw = decodeBase64ToBytes(apiKeySecret.trim());
  } catch {
    throw new Error('cdp-facilitator: malformed API key secret (not base64)');
  }
  if (raw.length !== 64) {
    throw new Error(
      `cdp-facilitator: Ed25519 secret must decode to 64 bytes, got ${raw.length}`,
    );
  }
  const seed = raw.subarray(0, 32);
  const publicKey = raw.subarray(32);

  const jwk = {
    kty: 'OKP' as const,
    crv: 'Ed25519' as const,
    d: base64ToBase64Url(bytesToBase64(seed)),
    x: base64ToBase64Url(bytesToBase64(publicKey)),
  };

  const key = await importJWK(jwk, 'EdDSA');
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    sub: apiKeyId,
    iss: 'cdp',
    uris: [`${method} ${CDP_HOST}${path}`],
  })
    .setProtectedHeader({
      alg: 'EdDSA',
      kid: apiKeyId,
      typ: 'JWT',
      nonce: randomNonceHex(),
    })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + JWT_EXPIRY_SECONDS)
    .sign(key);
}

function correlationContextHeader(): string {
  return [
    `sdk_version=${TF_X402_VERSION}`,
    'sdk_language=typescript-workers',
    'source=tensorfeed-x402',
    `source_version=${TF_X402_VERSION}`,
  ].join(',');
}

/**
 * Builds auth + correlation headers for a CDP x402 request.
 *
 * Path constraint: refuses to sign JWTs for paths outside /platform/v2/x402.
 * This is the load-bearing guard that prevents future code changes from
 * accidentally pointing this module at a Trading / Wallet / Onramp endpoint.
 *
 * @throws if env credentials are missing or path is outside the x402 base.
 */
async function authHeaders(
  env: Pick<Env, 'CDP_API_KEY_ID' | 'CDP_API_KEY_SECRET'>,
  method: string,
  path: string,
): Promise<Record<string, string>> {
  if (!env.CDP_API_KEY_ID || !env.CDP_API_KEY_SECRET) {
    throw new Error(
      'cdp-facilitator: CDP_API_KEY_ID and CDP_API_KEY_SECRET must both be set',
    );
  }
  if (!path.startsWith(CDP_BASE_PATH)) {
    throw new Error(
      `cdp-facilitator: refusing to sign JWT for non-x402 path: ${path}`,
    );
  }
  const jwt = await buildJwt(env.CDP_API_KEY_ID, env.CDP_API_KEY_SECRET, method, path);
  return {
    Authorization: `Bearer ${jwt}`,
    'Correlation-Context': correlationContextHeader(),
    'Content-Type': 'application/json',
  };
}

// ---------- helpers ----------

function isFacilitatorErrorCode(value: unknown): value is FacilitatorErrorCode {
  return typeof value === 'string';
}

function clipResponseText(text: string, limit = RESPONSE_EXCERPT_LIMIT): string {
  const compact = text.trim().replace(/\s+/g, ' ');
  if (compact.length === 0) return '<empty response>';
  if (compact.length <= limit) return compact;
  return compact.slice(0, limit - 3) + '...';
}

async function readBody(resp: Response): Promise<{ text: string; json: unknown }> {
  let text = '';
  try {
    text = await resp.text();
  } catch {
    /* empty */
  }
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
  }
  return { text, json };
}

// ---------- verify ----------

// CDP's PaymentPayloadV2Schema validates resource.description; some values trip
// "'paymentPayload' is invalid: must match one of [x402V2Pay...]" and the call is
// rejected. The counterparty trust-verdict (a long description with embedded
// double quotes) was rejected on verify while every short plain description
// settled. The CDP wire never needs the client's or pilot's description verbatim,
// so normalize it: replace double quotes and cap to the proven-safe length band.
const CDP_DESCRIPTION_MAX = 256;

export function sanitizeCdpDescription(desc: unknown): string | undefined {
  if (typeof desc !== 'string' || desc.length === 0) return undefined;
  const dequoted = desc.replace(/"/g, "'");
  return dequoted.length > CDP_DESCRIPTION_MAX ? dequoted.slice(0, CDP_DESCRIPTION_MAX) : dequoted;
}

// Normalize a payload's `resource` into a CDP-safe object. CDP requires resource
// to be { url, description?, mimeType } (a bare string is rejected per the
// PaymentPayloadV2Schema). Sanitizes the description; drops a resource that has
// no usable url.
function cdpSafeResource(
  resource: unknown,
): { url: string; description?: string; mimeType: string } | undefined {
  if (!resource) return undefined;
  if (typeof resource === 'string') {
    return { url: resource, mimeType: 'application/json' };
  }
  if (typeof resource === 'object') {
    const r = resource as { url?: unknown; description?: unknown; mimeType?: unknown };
    if (typeof r.url !== 'string' || r.url.length === 0) return undefined;
    const description = sanitizeCdpDescription(r.description);
    return {
      url: r.url,
      ...(description ? { description } : {}),
      mimeType: typeof r.mimeType === 'string' ? r.mimeType : 'application/json',
    };
  }
  return undefined;
}

// Copy of the payload with a CDP-safe `resource`. A payload carrying no resource
// is returned untouched (resource is optional in the schema).
function cdpSafePayload(payload: PaymentPayload): PaymentPayload {
  const p = payload as PaymentPayload & { resource?: unknown };
  if (p.resource === undefined) return payload;
  return { ...p, resource: cdpSafeResource(p.resource) } as PaymentPayload;
}

/**
 * Calls CDP /verify. Validates the signed authorization without broadcast.
 * Returns a TF-shaped VerifyResult for compatibility with the existing
 * self-broadcast facilitator surface in worker/src/x402-facilitator.ts.
 */
export async function cdpVerify(
  env: Env,
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<VerifyResult> {
  const path = `${CDP_BASE_PATH}/verify`;
  const headers = await authHeaders(env, 'POST', path);
  const url = `${CDP_BASE_URL}/verify`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(CDP_TIMEOUT_MS),
      body: JSON.stringify({
        x402Version: payload.x402Version,
        paymentPayload: cdpSafePayload(payload),
        paymentRequirements: requirements,
      }),
    });
  } catch (err) {
    return {
      isValid: false,
      invalidReason: 'unexpected_verify_error',
      message: `cdp verify network error: ${
        err instanceof Error ? err.message : 'unknown'
      }`,
    };
  }

  const { text, json } = await readBody(resp);
  const body = json as Record<string, unknown>;

  if (!resp.ok) {
    const invalidReason = isFacilitatorErrorCode(body?.invalidReason)
      ? (body.invalidReason as FacilitatorErrorCode)
      : 'unexpected_verify_error';
    return {
      isValid: false,
      invalidReason,
      message: `cdp verify HTTP ${resp.status}: ${clipResponseText(text)}`,
    };
  }

  return {
    isValid: body.isValid === true,
    invalidReason: isFacilitatorErrorCode(body.invalidReason)
      ? (body.invalidReason as FacilitatorErrorCode)
      : undefined,
    payer: typeof body.payer === 'string' ? body.payer : undefined,
    message: typeof body.invalidMessage === 'string' ? body.invalidMessage : undefined,
  };
}

// ---------- settle ----------

/**
 * Calls CDP /settle. CDP performs the on-chain broadcast (paying gas);
 * the agent's EIP-3009 signature authorizes USDC movement from their
 * wallet to our payTo. First successful settle for a route triggers
 * automatic Bazaar cataloging using the extensions.bazaar metadata that
 * we included in the PaymentRequired response.
 *
 * The EXTENSION-RESPONSES header indicates whether CDP accepted our
 * Bazaar metadata ("processing") or rejected it ("rejected"). We surface
 * this so the route handler can log when validation fails.
 *
 * @param resourceDescription Optional human-readable description threaded
 *   into paymentPayload.resource.description. CDP catalogs the resource
 *   object from the settle body, so without this the cataloged row is
 *   metadata-blank and capability search never surfaces the endpoint. The
 *   402 challenge already carries top-level resource.{url, description,
 *   mimeType}; passing the same description here makes the settle resource
 *   object spec-complete ({ url, description, mimeType } per x402 v2).
 *   OPTIONAL and backward compatible: omitting it keeps the exact prior
 *   { url, mimeType } shape.
 */
export async function cdpSettle(
  env: Env,
  payload: PaymentPayload,
  requirements: PaymentRequirements,
  resourceDescription?: string,
): Promise<CdpSettleResult> {
  const path = `${CDP_BASE_PATH}/settle`;
  const headers = await authHeaders(env, 'POST', path);
  const url = `${CDP_BASE_URL}/settle`;

  // CDP catalog opt-in. Two server-side enrichments per x402-foundation/
  // x402#2207 (AsaiShota + 0xdespot, validated by Ethan Oroshiba CDP):
  //   1. paymentPayload.resource: an OPTIONAL TOP-LEVEL { url, description?,
  //      mimeType? } OBJECT in PaymentPayloadV2Schema (@x402/core@2.11.0
  //      schemas/index.d.mts:315-389). Buyer SDKs frequently omit it.
  //      (An earlier attempt set this to a plain URL string and CDP
  //      responded 400 `'paymentPayload' is invalid: must match one of
  //      [x402V2Pay...]`, so the field MUST be an object.) CDP catalogs the
  //      Bazaar row FROM this object, so when a resourceDescription is
  //      supplied we make it spec-complete ({ url, description, mimeType }):
  //      without the description the cataloged row is metadata-blank and
  //      capability search never surfaces the endpoint.
  //   2. paymentPayload.extensions: the bazaar extension CDP reads to
  //      catalog. CDP interprets missing paymentPayload.extensions as "no
  //      bazaar opt-in" and skips bazaar processing entirely (the
  //      EXTENSION-RESPONSES=e30= symptom). Discovery extensions are SELLER
  //      data: standard buyers (@x402/fetch) echo whatever the 402 HEADER
  //      carried, and the header ships a size-compacted input-only bazaar
  //      block (no schema) under the 16KB budget, which CDP's validator
  //      rejects as "invalid discovery configuration". First observed live
  //      2026-07-03 on the first real Solana settle; the EVM seed script
  //      masked it by echoing the full BODY extension. So the server's
  //      canonical requirements.extensions win per key; buyer-only extension
  //      keys pass through untouched.
  // Non-destructive for resource: keep any value the buyer already supplied.
  type EnrichablePayload = PaymentPayload & {
    resource?: { url: string; description?: string; mimeType?: string };
    extensions?: Record<string, unknown>;
  };
  const buyerPayload = payload as EnrichablePayload;
  const reqExtensions =
    (requirements as PaymentRequirements & { extensions?: Record<string, unknown> })
      .extensions;
  // Build the spec-complete resource object when we have a URL. The
  // description is included only when provided (optional + backward
  // compatible: omitting resourceDescription reproduces the exact prior
  // { url, mimeType } shape). PaymentRequirements.resource is optional
  // (x402-facilitator.ts:185); when it's missing we skip enriching the
  // payload's resource field rather than assign `url: undefined`, which
  // would have type-failed at the EnrichablePayload shape and at the
  // runtime contract some catalog validators check. In practice every TF
  // call path builds requirements with a defined resource URL, so the
  // undefined branch is defensive.
  // Sanitize both description sources before they reach the CDP wire (see
  // sanitizeCdpDescription): the pilot-supplied resourceDescription used to enrich
  // the resource, and any description on a buyer-supplied resource.
  const safeWorkerDescription = sanitizeCdpDescription(resourceDescription);
  const enrichedResource: { url: string; description?: string; mimeType?: string } | undefined =
    requirements.resource
      ? {
          url: requirements.resource,
          ...(safeWorkerDescription ? { description: safeWorkerDescription } : {}),
          mimeType: 'application/json',
        }
      : undefined;
  const mergedExtensions: Record<string, unknown> = {
    ...(buyerPayload.extensions ?? {}),
    ...(reqExtensions ?? {}),
  };
  const enrichedPayload: EnrichablePayload = {
    ...buyerPayload,
    resource: cdpSafeResource(buyerPayload.resource) ?? enrichedResource,
    ...(Object.keys(mergedExtensions).length > 0 ? { extensions: mergedExtensions } : {}),
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(CDP_SETTLE_TIMEOUT_MS),
      body: JSON.stringify({
        x402Version: payload.x402Version,
        paymentPayload: enrichedPayload,
        paymentRequirements: requirements,
      }),
    });
  } catch (err) {
    return {
      success: false,
      errorReason: 'unexpected_settle_error',
      message: `cdp settle network error: ${
        err instanceof Error ? err.message : 'unknown'
      }`,
    };
  }

  const extensionResponses = resp.headers.get('EXTENSION-RESPONSES') ?? undefined;
  const bazaarStatus = decodeBazaarStatus(extensionResponses);
  const { text, json } = await readBody(resp);
  const body = json as Record<string, unknown>;

  if (!resp.ok) {
    const errorReason = isFacilitatorErrorCode(body?.errorReason)
      ? (body.errorReason as FacilitatorErrorCode)
      : 'unexpected_settle_error';
    return {
      success: false,
      errorReason,
      message: `cdp settle HTTP ${resp.status}: ${clipResponseText(text)}`,
      extensionResponses,
      bazaarStatus,
    };
  }

  return {
    success: body.success === true,
    errorReason: isFacilitatorErrorCode(body.errorReason)
      ? (body.errorReason as FacilitatorErrorCode)
      : undefined,
    payer: typeof body.payer === 'string' ? body.payer : undefined,
    transaction: typeof body.transaction === 'string' ? body.transaction : undefined,
    network: typeof body.network === 'string' ? body.network : undefined,
    amount: typeof body.amount === 'string' ? body.amount : undefined,
    message: typeof body.errorMessage === 'string' ? body.errorMessage : undefined,
    extensionResponses,
    bazaarStatus,
  };
}

// ---------- getSupported ----------

/**
 * Queries CDP's /supported endpoint. Returns the kinds (scheme + network)
 * the facilitator accepts and the extension keys it supports. Use as a
 * sanity check on connectivity + scope; not called in the hot payment path.
 */
export async function cdpGetSupported(env: Env): Promise<CdpSupportedResponse> {
  const path = `${CDP_BASE_PATH}/supported`;
  const headers = await authHeaders(env, 'GET', path);
  const resp = await fetch(`${CDP_BASE_URL}/supported`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(CDP_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`cdp getSupported HTTP ${resp.status}: ${clipResponseText(text)}`);
  }
  return (await resp.json()) as CdpSupportedResponse;
}

// ---------- listDiscoveryResources ----------

export interface ListDiscoveryParams {
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Queries CDP's /discovery/resources endpoint (Bazaar catalog). Use after
 * a successful settle to confirm our endpoint has been cataloged.
 * Indexing fires ~10 minutes after first settle; expect zero results
 * immediately after the call.
 */
export async function cdpListDiscoveryResources(
  env: Env,
  params?: ListDiscoveryParams,
): Promise<CdpDiscoveryResourcesResponse> {
  const path = `${CDP_BASE_PATH}/discovery/resources`;
  const headers = await authHeaders(env, 'GET', path);
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const url = `${CDP_BASE_URL}/discovery/resources${
    qs.toString() ? '?' + qs.toString() : ''
  }`;
  const resp = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(CDP_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(
      `cdp discovery list HTTP ${resp.status}: ${clipResponseText(text)}`,
    );
  }
  return (await resp.json()) as CdpDiscoveryResourcesResponse;
}

// ---------- exported constants (for tests + sanity checks) ----------

export const CDP_FACILITATOR_CONSTANTS = {
  CDP_BASE_URL,
  CDP_HOST,
  CDP_BASE_PATH,
  JWT_EXPIRY_SECONDS,
} as const;
