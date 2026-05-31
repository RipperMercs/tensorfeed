/**
 * Integration test harness for the index.ts fetch router (audit #7).
 *
 * The 12k-line `worker/src/index.ts` fetch router had ZERO integration
 * tests: every unit test exercised a single module in isolation, but the
 * wiring that actually decides whether an agent gets charged (requirePayment
 * gate, strict-premium split, deferred-debit commit, AFTA no-charge) lived
 * only in the router and was never driven end to end. This module builds a
 * full in-memory `Env` and a `call()` helper that drives the REAL exported
 * `worker.fetch`, so the money path can be asserted at the HTTP boundary.
 *
 * It is intentionally a plain `.ts` (not a `.test.ts`) so the integration
 * test file can import it. It contains no tests of its own. vitest only
 * collects `src/**\/*.test.ts`, so this file is never run as a suite.
 *
 * Design notes:
 *  - In-memory KV mirrors the JSON-aware get/put/delete/list shape the
 *    existing unit tests use (see faucet.test.ts mockEnv), but adds a
 *    real `list` with prefix support and honors the `{ expirationTtl }`
 *    put option signature the worker passes (the value is stored; the TTL
 *    is ignored, which is correct for a single test invocation).
 *  - A real Ed25519 signing key is generated once via WebCrypto and wired
 *    into `RECEIPT_PRIVATE_KEY_JWK`, so premiumResponse's signReceipt path
 *    runs for real (the signature only needs to not throw; the balance and
 *    no-charge behavior are the priority). Node 18+ / Workers both expose
 *    Ed25519 in crypto.subtle.
 */

import type { Env } from './types';

// === In-memory KV ===

/**
 * Minimal KVNamespace stand-in backed by a Map. Values are stored as
 * strings (the worker serializes with JSON.stringify before put). The
 * `type: 'json'` read path parses; everything else returns the raw string.
 * `list` supports the `{ prefix }` option the worker uses for ledger and
 * index scans.
 */
export interface MemKV {
  store: Map<string, string>;
  get(key: string, type?: 'text' | 'json' | unknown): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cacheStatus: null;
  }>;
}

export function makeMemKV(seed?: Record<string, unknown>): MemKV {
  const store = new Map<string, string>();
  if (seed) {
    for (const [k, v] of Object.entries(seed)) {
      store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  const kv: MemKV = {
    store,
    async get(key: string, type?: 'text' | 'json' | unknown) {
      const v = store.get(key);
      if (v === undefined) return null;
      // The worker calls get(key, 'json') in the vast majority of cases.
      // Mirror that: parse on 'json', otherwise return the raw string.
      if (type === 'json') {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      return v;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number }) {
      const prefix = options?.prefix ?? '';
      const names = [...store.keys()].filter((k) => k.startsWith(prefix));
      const limited = typeof options?.limit === 'number' ? names.slice(0, options.limit) : names;
      return {
        keys: limited.map((name) => ({ name })),
        list_complete: true,
        cacheStatus: null,
      };
    },
  };
  return kv;
}

// === Ed25519 receipt signing key (real, generated once) ===

let receiptJwkPromise: Promise<string> | null = null;

async function getReceiptPrivateKeyJwk(): Promise<string> {
  if (!receiptJwkPromise) {
    receiptJwkPromise = (async () => {
      const pair = (await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify'],
      )) as CryptoKeyPair;
      const exported = await crypto.subtle.exportKey('jwk', pair.privateKey);
      const jwk = exported as unknown as Record<string, unknown>;
      jwk.kid = 'test-harness-ed25519';
      return JSON.stringify(jwk);
    })();
  }
  return receiptJwkPromise;
}

// === Mock Env ===

export interface MakeEnvOptions {
  /** Extra seed values for TENSORFEED_CACHE (string or JSON-serializable). */
  cache?: Record<string, unknown>;
  /** Extra seed values for TENSORFEED_NEWS. */
  news?: Record<string, unknown>;
  /** Extra seed values for TENSORFEED_STATUS. */
  status?: Record<string, unknown>;
  /** Override env vars/secrets. */
  vars?: Partial<Env>;
}

/**
 * Build a full mock Env with in-memory KV for all three namespaces and
 * every secret/var the fetch handler reads on startup or on the tested
 * money paths. PAYMENT_ENABLED defaults to 'true' so premium endpoints
 * are live; RECEIPT_PRIVATE_KEY_JWK carries a real Ed25519 key so the
 * receipt-signing branch in premiumResponse runs for real.
 *
 * The receipt key is wired asynchronously (WebCrypto generateKey), so this
 * is async. Tests await it once in beforeEach.
 */
export async function makeEnv(opts: MakeEnvOptions = {}): Promise<Env> {
  const cache = makeMemKV(opts.cache);
  const news = makeMemKV(opts.news);
  const status = makeMemKV(opts.status);
  const receiptJwk = await getReceiptPrivateKeyJwk();

  const env: Env = {
    // KV namespaces. Cast through unknown: MemKV implements the subset of
    // KVNamespace the worker exercises (get/put/delete/list); the full CF
    // type carries getWithMetadata + overloads we do not need at runtime.
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: status as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,

    // Core vars read at the top of fetch / in shared helpers.
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: 'test-indexnow-key',

    // X / social (read by twitter.ts; never hit on the tested paths).
    X_API_KEY: 'test-x-api-key',
    X_API_SECRET: 'test-x-api-secret',
    X_ACCESS_TOKEN: 'test-x-access-token',
    X_ACCESS_SECRET: 'test-x-access-secret',

    // GitHub + email (trending / alerts; never hit on the tested paths).
    GITHUB_TOKEN: 'test-github-token',
    RESEND_API_KEY: 'test-resend-key',
    ALERT_EMAIL_TO: 'alerts-to@tensorfeed.ai',
    ALERT_EMAIL_FROM: 'alerts@tensorfeed.ai',

    // Agent payments. PAYMENT_ENABLED must be 'true' or requirePayment
    // short-circuits every premium call with a 503.
    PAYMENT_WALLET: '0x0000000000000000000000000000000000000001',
    PAYMENT_ENABLED: 'true',

    // Admin. Set so /api/admin/* and /api/refresh can be auth-checked in
    // future tests; not required for the money-path tests in this batch.
    ADMIN_KEY: 'test-admin-key',
    INGEST_KEY: 'test-ingest-key',

    // Real Ed25519 receipt-signing key so signReceipt() runs (not just
    // pending_key_bootstrap). The signature only needs to not throw.
    RECEIPT_PRIVATE_KEY_JWK: receiptJwk,

    // CreditLedger DO path stays OFF: commitPayment uses the legacy KV
    // read-modify-write debit, which our in-memory KV supports. Leaving
    // CREDIT_LEDGER unbound + the flag unset is the default-off posture.
    CREDIT_LEDGER_ENABLED: 'false',

    ...opts.vars,
  };

  return env;
}

// === ExecutionContext ===

/**
 * Minimal ExecutionContext that COLLECTS waitUntil promises so a test can
 * optionally await them (e.g. activity tracking, usage logging) without
 * unhandled-rejection noise. waitUntil swallows rejection so a best-effort
 * background task cannot fail the request, matching production semantics.
 */
export interface CollectingCtx extends ExecutionContext {
  /** Promises passed to waitUntil during the request. */
  readonly pending: Promise<unknown>[];
  /** Await all collected background promises (rejections swallowed). */
  settle(): Promise<void>;
}

export function makeCtx(): CollectingCtx {
  const pending: Promise<unknown>[] = [];
  const ctx: CollectingCtx = {
    pending,
    // The CF ExecutionContext type carries a `props` field (per-invocation
    // metadata for the new entrypoints API). The router never reads it, so
    // an empty object satisfies the type without affecting behavior.
    props: {},
    waitUntil(promise: Promise<unknown>): void {
      // Swallow rejection so a background task cannot surface as an
      // unhandled rejection in the test process.
      pending.push(Promise.resolve(promise).catch(() => undefined));
    },
    passThroughOnException(): void {
      // no-op
    },
    async settle(): Promise<void> {
      await Promise.all(pending.splice(0, pending.length));
    },
  };
  return ctx;
}

// === Token seeding ===

/**
 * Shape of the per-token credit record the worker stores at
 * `pay:credits:{token}`. Mirrors CreditsRecord in payments.ts.
 */
export interface SeedCreditRecord {
  balance: number;
  created: string;
  last_used: string;
  agent_ua: string;
  total_purchased: number;
  daily_cap?: number | null;
}

/**
 * Write a valid paying-token record into TENSORFEED_CACHE. Tokens MUST
 * start with `tf_live_` or requirePayment rejects the format with a 401.
 */
export async function seedToken(
  env: Env,
  token: string,
  balance: number,
  extra: Partial<SeedCreditRecord> = {},
): Promise<void> {
  const now = new Date().toISOString();
  const record: SeedCreditRecord = {
    balance,
    created: now,
    last_used: now,
    agent_ua: 'tensorfeed-integration-test/1.0',
    total_purchased: balance,
    ...extra,
  };
  await env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(record));
}

/** Read back the current balance for a seeded token, or null if absent. */
export async function balanceOf(env: Env, token: string): Promise<number | null> {
  const raw = (await env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as
    | SeedCreditRecord
    | null;
  return raw ? raw.balance : null;
}

// === HTTP call ===

const ORIGIN = 'https://tensorfeed.ai';

export interface CallOptions {
  method?: string;
  /** Bearer token; sent as `Authorization: Bearer <token>`. */
  token?: string;
  /** Request body (object is JSON-serialized; string is sent verbatim). */
  body?: unknown;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /**
   * Client IP for the request (CF-Connecting-IP). The per-IP free-trial
   * and rate-limit counters are module-level and persist across calls in
   * the same process, so passing a UNIQUE ip per test isolates trial/limit
   * state. Defaults to a fixed test IP.
   */
  ip?: string;
  /** Await ctx.waitUntil promises before returning. Default false. */
  settle?: boolean;
}

export interface CallResult {
  status: number;
  /** Parsed JSON body, or null if the body was not JSON. */
  json: Record<string, unknown> | null;
  /** Raw response text. */
  text: string;
  headers: Headers;
}

/**
 * Drive the REAL worker.fetch for a path on https://tensorfeed.ai. Returns
 * the status, parsed JSON, raw text, and response headers.
 */
export async function call(env: Env, path: string, opts: CallOptions = {}): Promise<CallResult> {
  // Import lazily so a test can construct the harness without eagerly
  // pulling the 12k-line router at module-eval time (and so the import
  // happens after vitest has set up the environment).
  const worker = (await import('./index')).default;

  const headers = new Headers(opts.headers ?? {});
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  headers.set('CF-Connecting-IP', opts.ip ?? '203.0.113.7');
  if (!headers.has('User-Agent')) headers.set('User-Agent', 'tensorfeed-integration-test/1.0');

  let body: BodyInit | undefined;
  const method = opts.method ?? 'GET';
  if (opts.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    if (typeof opts.body === 'string') {
      body = opts.body;
    } else {
      body = JSON.stringify(opts.body);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
  }

  const request = new Request(`${ORIGIN}${path}`, { method, headers, body });
  const ctx = makeCtx();
  const response = await worker.fetch(request, env, ctx);
  if (opts.settle) await ctx.settle();

  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(text);
    json = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  return { status: response.status, json, text, headers: response.headers };
}
