import { Env } from './types';

/**
 * Cryptographically signed receipts for premium API responses.
 *
 * Every paid call returns a receipt that an agent can verify against
 * our published Ed25519 public key with no shared secret. Agents store
 * receipts and audit them later. Combined with the on-chain USDC
 * payment trail, every dollar that flows through TensorFeed has two
 * independent attestations: the Base RPC tx record (immutable, public)
 * and our signed receipt (verifiable, non-forgeable).
 *
 * Bootstrap: Evan generates a fresh keypair offline with
 * `worker/scripts/generate-receipt-key.mjs`, pastes the private JWK
 * into `wrangler secret put RECEIPT_PRIVATE_KEY_JWK`, and replaces
 * `public/.well-known/tensorfeed-receipt-key.json` with the public JWK.
 *
 * If the secret is unset, this module degrades gracefully: receipts
 * are not emitted (rather than emitting unsigned receipts that imply
 * a trust signal we cannot back up). /api/meta surfaces the bootstrap
 * status so agents can detect the difference.
 */

// === Receipt structure ===

export type NoChargeReason =
  | '5xx'
  | 'circuit_breaker'
  | 'schema_validation_failure'
  | 'stale_data'
  | null;

/**
 * Receipt schema version. v2 adds the agent_nonce field so an agent
 * can prove a receipt was signed for ITS specific request, not a
 * server-side replay of an earlier identical call. v1 receipts (pre
 * 2026-05-03) did not include this field and verify under the v1
 * canonical form. New receipts are always v2 even when the agent
 * supplies no nonce; the field is then null.
 */
export type ReceiptVersion = 1 | 2;
export const RECEIPT_VERSION_CURRENT: ReceiptVersion = 2;

export interface ReceiptCore {
  v: ReceiptVersion;
  id: string;                     // rcpt_<16hex>
  endpoint: string;               // path
  method: string;                 // HTTP method
  token_short: string;            // tf_live_<first8>...<last8> for non-PII reference
  credits_charged: number;        // 0 if no_charge_reason set
  credits_remaining: number;
  request_hash: string;           // sha256 hex of "METHOD url?canonical_query"
  response_hash: string;          // sha256 hex of canonical-JSON result body (without receipt)
  captured_at: string | null;     // ISO 8601 when the underlying data was captured, if applicable
  server_time: string;            // ISO 8601 when the receipt was issued
  no_charge_reason: NoChargeReason;
  freshness_sla_seconds: number | null;  // SLA at time of issuance, null if endpoint is immutable / compute-only
  // v2+: agent-supplied nonce echoed verbatim into the signed payload.
  // When the agent submits X-Agent-Nonce: <value>, that value lands
  // here and is covered by the Ed25519 signature, so the agent has
  // cryptographic proof the response corresponds to ITS request and
  // not a server-cached prior call. null when the agent supplied no
  // nonce or when the receipt is v1 (pre 2026-05-03).
  agent_nonce: string | null;
}

export interface SignedReceipt extends ReceiptCore {
  signature: string;              // base64url Ed25519 signature over canonical-JSON of the core fields
  key_id: string;                 // JWK kid for rotation support
  signing_alg: 'EdDSA';
  signing_curve: 'Ed25519';
  canonical_form: 'tensorfeed-canonical-json-v1';
  verify_doc: string;
}

// === Canonical JSON (deterministic serialization) ===

/**
 * Serialize a JS value to a canonical JSON string with deterministic
 * key ordering. Required so signatures over a receipt are reproducible
 * by any verifier, regardless of how their JSON library happens to
 * serialize. Sort object keys lexicographically; arrays preserve order;
 * no whitespace; standard JSON escaping.
 *
 * NaN, Infinity, undefined, and functions throw. Receipts must never
 * contain non-finite numbers anyway, so failing fast is correct.
 */
export function canonicalJSON(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('canonicalJSON: non-finite number not allowed');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJSON).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(obj[k]));
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`canonicalJSON: unsupported value type ${typeof value}`);
}

// === Hashing helpers ===

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a request to a stable key. We use METHOD + path + sorted query
 * params (no body, since premium endpoints are GET today). This means
 * two requests with the same observable shape produce the same hash,
 * which is fine for receipt-level traceability. Per-request uniqueness
 * (and replay protection) is handled by the agent_nonce field on the
 * signed receipt rather than by mixing the nonce into request_hash, so
 * verifiers can match request shape and nonce independently.
 */
export async function hashRequest(method: string, url: URL): Promise<string> {
  const params = Array.from(url.searchParams.entries()).sort(
    (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const canonicalQuery = params.map(([k, v]) => `${k}=${v}`).join('&');
  const stringForm = `${method.toUpperCase()} ${url.pathname}?${canonicalQuery}`;
  return 'sha256:' + (await sha256Hex(stringForm));
}

// === Agent nonce validation ===

const AGENT_NONCE_PATTERN = /^[A-Za-z0-9._-]+$/;
const AGENT_NONCE_MIN = 8;
const AGENT_NONCE_MAX = 128;

/**
 * Validate an X-Agent-Nonce header value. Returns the trimmed nonce on
 * success or null if the value is missing, empty, the wrong length, or
 * contains characters outside [A-Za-z0-9._-]. The nonce travels into
 * the signed receipt verbatim, so character allowlisting matters: it
 * keeps verifiers safe against newline/quote injection when they show
 * the nonce alongside the receipt body.
 *
 * Length floor of 8 prevents trivial brute-force collision; ceiling of
 * 128 keeps receipt JSON bounded. Agents that need more entropy can
 * use a UUIDv4 (32 chars sans dashes) or a base64url-encoded random
 * 32-byte value (43 chars).
 */
export function validateAgentNonce(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < AGENT_NONCE_MIN || trimmed.length > AGENT_NONCE_MAX) return null;
  if (!AGENT_NONCE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export const AGENT_NONCE_LIMITS = {
  MIN: AGENT_NONCE_MIN,
  MAX: AGENT_NONCE_MAX,
  PATTERN_DESCRIPTION: '[A-Za-z0-9._-]+',
};

/**
 * Hash the response body (the result object the handler computed,
 * BEFORE the receipt and billing wrapper are added). Canonical JSON
 * so the hash is reproducible by a verifier.
 */
export async function hashResponse(result: unknown): Promise<string> {
  return 'sha256:' + (await sha256Hex(canonicalJSON(result)));
}

// === Token short reference ===

/**
 * Produce a non-PII short reference of a bearer token. tf_live_ tokens
 * are 8 + 64 hex chars (prefix + body); we keep the prefix and the last
 * 8 hex chars. Sufficient for log correlation, insufficient for forgery.
 */
export function tokenShort(token: string): string {
  if (!token || token.length < 16) return token;
  if (!token.startsWith('tf_live_')) return token.slice(0, 8) + '...' + token.slice(-4);
  const body = token.slice(8);
  return `tf_live_${body.slice(0, 8)}...${body.slice(-8)}`;
}

// === Random IDs ===

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateReceiptId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `rcpt_${bytesToHex(bytes)}`;
}

// === Key loading ===

interface PrivateJWK {
  kty: 'OKP';
  crv: 'Ed25519';
  d: string;
  x: string;
  kid?: string;
  use?: string;
}

/**
 * Load the Ed25519 signing key from the RECEIPT_PRIVATE_KEY_JWK secret.
 * Returns null if the secret is unset or unparseable. The first cold-
 * start call imports the key; subsequent calls in the same isolate
 * reuse the cached CryptoKey.
 */
let cachedKey: { key: CryptoKey; kid: string } | null = null;
let cachedKeyEnv: string | undefined = undefined;

export async function loadSigningKey(env: Env): Promise<{ key: CryptoKey; kid: string } | null> {
  const secret = env.RECEIPT_PRIVATE_KEY_JWK;
  if (!secret) {
    cachedKey = null;
    cachedKeyEnv = undefined;
    return null;
  }
  if (cachedKey && cachedKeyEnv === secret) return cachedKey;

  let parsed: PrivateJWK;
  try {
    parsed = JSON.parse(secret) as PrivateJWK;
  } catch (err) {
    console.error('receipts: RECEIPT_PRIVATE_KEY_JWK is not valid JSON', err);
    return null;
  }
  if (parsed.kty !== 'OKP' || parsed.crv !== 'Ed25519' || !parsed.d || !parsed.x) {
    console.error('receipts: RECEIPT_PRIVATE_KEY_JWK is missing required Ed25519 fields');
    return null;
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'jwk',
      parsed as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
  } catch (err) {
    console.error('receipts: Ed25519 importKey failed (Workers compatibility?)', err);
    return null;
  }
  const kid = parsed.kid || (await sha256Hex(parsed.x)).slice(0, 16);
  cachedKey = { key, kid };
  cachedKeyEnv = secret;
  return cachedKey;
}

// === Sign + verify ===

function bytesToBase64Url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Build a signed receipt. Returns null if the signing key is not yet
 * configured (graceful unsigned mode is intentionally NOT supported;
 * an unsigned receipt would imply trust we cannot back up).
 */
export async function signReceipt(env: Env, core: ReceiptCore): Promise<SignedReceipt | null> {
  const loaded = await loadSigningKey(env);
  if (!loaded) return null;
  const message = enc.encode(canonicalJSON(core));
  let sig: ArrayBuffer;
  try {
    sig = await crypto.subtle.sign({ name: 'Ed25519' }, loaded.key, message);
  } catch (err) {
    console.error('receipts: sign failed', err);
    return null;
  }
  return {
    ...core,
    signature: bytesToBase64Url(new Uint8Array(sig)),
    key_id: loaded.kid,
    signing_alg: 'EdDSA',
    signing_curve: 'Ed25519',
    canonical_form: 'tensorfeed-canonical-json-v1',
    verify_doc: 'https://tensorfeed.ai/agent-fair-trade#receipts',
  };
}

interface PublicJWK {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  kid?: string;
}

/**
 * Verify a signed receipt against a public JWK. Used by /api/receipt/verify.
 * Returns true iff the signature matches the canonical form of the core
 * receipt fields. A failed verification is just a boolean; verification
 * doesn't expose why it failed.
 */
export async function verifyReceiptSignature(
  signed: SignedReceipt,
  publicJwk: PublicJWK,
): Promise<boolean> {
  // Strip signing-related fields back down to ReceiptCore. v2+ adds
  // agent_nonce; v1 receipts (pre 2026-05-03) do not include it and
  // we omit it from the canonical form so old signatures still verify.
  const core: Record<string, unknown> = {
    v: signed.v,
    id: signed.id,
    endpoint: signed.endpoint,
    method: signed.method,
    token_short: signed.token_short,
    credits_charged: signed.credits_charged,
    credits_remaining: signed.credits_remaining,
    request_hash: signed.request_hash,
    response_hash: signed.response_hash,
    captured_at: signed.captured_at,
    server_time: signed.server_time,
    no_charge_reason: signed.no_charge_reason,
    freshness_sla_seconds: signed.freshness_sla_seconds,
  };
  if (signed.v >= 2) {
    core.agent_nonce = signed.agent_nonce;
  }
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'jwk',
      publicJwk as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  } catch {
    return false;
  }
  const sigBytes = base64UrlToBytes(signed.signature);
  const message = enc.encode(canonicalJSON(core));
  try {
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, message);
  } catch {
    return false;
  }
}

// === Status helper for /api/meta ===

export function receiptStatus(env: Env): { configured: boolean; algorithm: string; public_key_url: string } {
  return {
    configured: Boolean(env.RECEIPT_PRIVATE_KEY_JWK),
    algorithm: 'EdDSA / Ed25519',
    public_key_url: 'https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json',
  };
}
