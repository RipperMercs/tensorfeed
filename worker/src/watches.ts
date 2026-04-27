import { Env } from './types';

/**
 * Premium webhook watches.
 *
 * Agents register watches that fire on price changes or service status
 * changes. Each fire delivers a signed POST to the agent's callback URL.
 *
 * Pricing model (v1): 1 credit to register, watch lives 90 days, fires
 * are free up to a per-watch cap (default 100). Spam is naturally limited
 * by the registration cost and a per-token cap.
 *
 * Storage layout (TENSORFEED_CACHE):
 *   watch:{id}              -> full Watch record (90-day TTL)
 *   watch:index:price       -> string[] of watch IDs subscribed to price events
 *   watch:index:status      -> string[] of watch IDs subscribed to status events
 *   watch:byToken:{token}   -> string[] of watch IDs owned by this token (read-only listing)
 *   watch:prev:pricing      -> last pricing payload seen by dispatchPriceWatches
 *
 * Status diffs use the existing `previous-status` key from status.ts so we
 * fire on the same transition the incident detector reacts to. Price diffs
 * keep a dedicated `watch:prev:pricing` because catalog.ts mutates `pricing`
 * in place during merges and we want a deterministic before/after pair.
 */

// === Constants ===

const WATCH_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const DEFAULT_FIRE_CAP = 100;
const PER_TOKEN_WATCH_CAP = 25;
const GLOBAL_INDEX_SOFT_CAP = 1000;
const DELIVERY_TIMEOUT_MS = 8000;

// === Public types ===

export interface PriceWatchSpec {
  type: 'price';
  /** Model id or display name. Case-insensitive. */
  model: string;
  field: 'inputPrice' | 'outputPrice' | 'blended';
  op: 'lt' | 'gt' | 'changes';
  /** Required when op is lt or gt. Ignored for changes. */
  threshold?: number;
}

export interface StatusWatchSpec {
  type: 'status';
  /** Provider name. Case-insensitive. */
  provider: string;
  op: 'becomes' | 'changes';
  /** Required when op is becomes. Ignored for changes. */
  value?: 'operational' | 'degraded' | 'down';
}

export type WatchSpec = PriceWatchSpec | StatusWatchSpec;

export interface Watch {
  id: string;
  spec: WatchSpec;
  callback_url: string;
  /** Optional shared secret used to HMAC-sign delivery bodies. */
  secret?: string;
  /** Owning bearer token (for listing/deletion auth). */
  token: string;
  created: string;
  expires_at: string;
  fire_count: number;
  fire_cap: number;
  last_fired_at: string | null;
  last_delivery_status: number | null;
  status: 'active' | 'expired' | 'cap_reached' | 'deleted';
}

// === Helpers ===

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateWatchId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `wat_${toHex(bytes)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function expiresIso(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

// === SSRF guard ===

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./, /^10\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i, /^fd[0-9a-f]{2}:/i, /^fe80:/i,
];

export interface UrlValidation {
  ok: boolean;
  error?: string;
}

export function validateCallbackUrl(input: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: 'invalid_url' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'callback_url_must_be_https' };
  }
  const host = url.hostname;
  for (const pat of PRIVATE_HOST_PATTERNS) {
    if (pat.test(host)) {
      return { ok: false, error: 'callback_url_resolves_to_private_host' };
    }
  }
  return { ok: true };
}

// === Spec validation ===

export interface SpecValidation {
  ok: boolean;
  error?: string;
}

export function validateSpec(spec: unknown): SpecValidation {
  if (!spec || typeof spec !== 'object') return { ok: false, error: 'spec_required' };
  const s = spec as Record<string, unknown>;
  if (s.type === 'price') {
    if (typeof s.model !== 'string' || !s.model.trim()) {
      return { ok: false, error: 'price_watch_model_required' };
    }
    if (s.field !== 'inputPrice' && s.field !== 'outputPrice' && s.field !== 'blended') {
      return { ok: false, error: 'price_watch_field_invalid' };
    }
    if (s.op !== 'lt' && s.op !== 'gt' && s.op !== 'changes') {
      return { ok: false, error: 'price_watch_op_invalid' };
    }
    if ((s.op === 'lt' || s.op === 'gt') && typeof s.threshold !== 'number') {
      return { ok: false, error: 'price_watch_threshold_required' };
    }
    return { ok: true };
  }
  if (s.type === 'status') {
    if (typeof s.provider !== 'string' || !s.provider.trim()) {
      return { ok: false, error: 'status_watch_provider_required' };
    }
    if (s.op !== 'becomes' && s.op !== 'changes') {
      return { ok: false, error: 'status_watch_op_invalid' };
    }
    if (s.op === 'becomes' && s.value !== 'operational' && s.value !== 'degraded' && s.value !== 'down') {
      return { ok: false, error: 'status_watch_value_required_when_becomes' };
    }
    return { ok: true };
  }
  return { ok: false, error: 'unsupported_watch_type' };
}

// === Predicate evaluation ===

export interface PriceTransition {
  model: string;
  provider: string;
  field: 'inputPrice' | 'outputPrice' | 'blended';
  from: number;
  to: number;
}

/**
 * Returns true if the transition newly satisfies the watch (debounced:
 * fires only on edge transitions, not while continuously satisfying).
 */
export function priceWatchFires(spec: PriceWatchSpec, t: PriceTransition): boolean {
  if (t.field !== spec.field) return false;
  if (t.model.toLowerCase() !== spec.model.toLowerCase()) return false;
  if (spec.op === 'changes') return t.from !== t.to;
  if (spec.op === 'lt') {
    if (typeof spec.threshold !== 'number') return false;
    return t.from >= spec.threshold && t.to < spec.threshold;
  }
  if (spec.op === 'gt') {
    if (typeof spec.threshold !== 'number') return false;
    return t.from <= spec.threshold && t.to > spec.threshold;
  }
  return false;
}

export interface StatusTransition {
  provider: string;
  name: string;
  from: 'operational' | 'degraded' | 'down' | 'unknown';
  to: 'operational' | 'degraded' | 'down' | 'unknown';
}

export function statusWatchFires(spec: StatusWatchSpec, t: StatusTransition): boolean {
  const providerKey = spec.provider.toLowerCase();
  const matchesProvider =
    t.provider.toLowerCase() === providerKey ||
    t.name.toLowerCase() === providerKey ||
    t.provider.toLowerCase().includes(providerKey) ||
    providerKey.includes(t.provider.toLowerCase());
  if (!matchesProvider) return false;
  if (t.from === t.to) return false;
  if (t.from === 'unknown' || t.to === 'unknown') return false;
  if (spec.op === 'changes') return true;
  if (spec.op === 'becomes') return t.to === spec.value;
  return false;
}

// === HMAC signing ===

export async function signBody(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return `sha256=${toHex(new Uint8Array(sig))}`;
}

// === Storage ===

async function readIndex(env: Env, type: 'price' | 'status'): Promise<string[]> {
  const raw = (await env.TENSORFEED_CACHE.get(`watch:index:${type}`, 'json')) as string[] | null;
  return raw ?? [];
}

async function writeIndex(env: Env, type: 'price' | 'status', ids: string[]): Promise<void> {
  await env.TENSORFEED_CACHE.put(`watch:index:${type}`, JSON.stringify(ids));
}

async function readTokenIndex(env: Env, token: string): Promise<string[]> {
  const raw = (await env.TENSORFEED_CACHE.get(`watch:byToken:${token}`, 'json')) as string[] | null;
  return raw ?? [];
}

async function writeTokenIndex(env: Env, token: string, ids: string[]): Promise<void> {
  await env.TENSORFEED_CACHE.put(`watch:byToken:${token}`, JSON.stringify(ids));
}

// === CRUD ===

export interface CreateWatchInput {
  spec: WatchSpec;
  callback_url: string;
  secret?: string;
  fire_cap?: number;
}

export interface CreateWatchResult {
  ok: true;
  watch: Watch;
}

export interface CreateWatchError {
  ok: false;
  error: string;
  reason?: string;
}

export async function createWatch(
  env: Env,
  token: string,
  input: CreateWatchInput,
): Promise<CreateWatchResult | CreateWatchError> {
  const specCheck = validateSpec(input.spec);
  if (!specCheck.ok) return { ok: false, error: 'invalid_spec', reason: specCheck.error };

  const urlCheck = validateCallbackUrl(input.callback_url);
  if (!urlCheck.ok) return { ok: false, error: 'invalid_callback_url', reason: urlCheck.error };

  const tokenWatches = await readTokenIndex(env, token);
  if (tokenWatches.length >= PER_TOKEN_WATCH_CAP) {
    return {
      ok: false,
      error: 'per_token_watch_cap_reached',
      reason: `Each token can register at most ${PER_TOKEN_WATCH_CAP} watches; delete one first.`,
    };
  }

  const indexType = input.spec.type;
  const typeIndex = await readIndex(env, indexType);
  if (typeIndex.length >= GLOBAL_INDEX_SOFT_CAP) {
    return {
      ok: false,
      error: 'global_watch_cap_reached',
      reason: 'Watch system temporarily at capacity. Please try again later.',
    };
  }

  const id = generateWatchId();
  const fire_cap =
    typeof input.fire_cap === 'number' && input.fire_cap > 0 && input.fire_cap <= 1000
      ? Math.floor(input.fire_cap)
      : DEFAULT_FIRE_CAP;

  const watch: Watch = {
    id,
    spec: input.spec,
    callback_url: input.callback_url,
    ...(input.secret ? { secret: input.secret } : {}),
    token,
    created: nowIso(),
    expires_at: expiresIso(WATCH_TTL_SECONDS),
    fire_count: 0,
    fire_cap,
    last_fired_at: null,
    last_delivery_status: null,
    status: 'active',
  };

  await Promise.all([
    env.TENSORFEED_CACHE.put(`watch:${id}`, JSON.stringify(watch), {
      expirationTtl: WATCH_TTL_SECONDS,
    }),
    writeIndex(env, indexType, [...typeIndex, id]),
    writeTokenIndex(env, token, [...tokenWatches, id]),
  ]);

  return { ok: true, watch };
}

export async function getWatch(env: Env, id: string): Promise<Watch | null> {
  return (await env.TENSORFEED_CACHE.get(`watch:${id}`, 'json')) as Watch | null;
}

export async function listWatchesForToken(env: Env, token: string): Promise<Watch[]> {
  const ids = await readTokenIndex(env, token);
  if (ids.length === 0) return [];
  const watches = await Promise.all(ids.map(id => getWatch(env, id)));
  return watches.filter((w): w is Watch => w !== null && w.status !== 'deleted');
}

export async function deleteWatch(env: Env, id: string, token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const watch = await getWatch(env, id);
  if (!watch) return { ok: false, error: 'watch_not_found' };
  if (watch.token !== token) return { ok: false, error: 'forbidden' };

  watch.status = 'deleted';
  const indexType = watch.spec.type;
  const [typeIndex, tokenIndex] = await Promise.all([
    readIndex(env, indexType),
    readTokenIndex(env, token),
  ]);

  await Promise.all([
    env.TENSORFEED_CACHE.delete(`watch:${id}`),
    writeIndex(env, indexType, typeIndex.filter(x => x !== id)),
    writeTokenIndex(env, token, tokenIndex.filter(x => x !== id)),
  ]);
  return { ok: true };
}

// === Delivery ===

interface FirePayload {
  event: 'watch.fire';
  watch_id: string;
  fired_at: string;
  spec: WatchSpec;
  match: Record<string, unknown>;
}

async function deliver(watch: Watch, payload: FirePayload): Promise<number | null> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'TensorFeed-Webhook/1',
    'X-TensorFeed-Event': payload.event,
    'X-TensorFeed-Watch-Id': watch.id,
  };
  if (watch.secret) {
    headers['X-TensorFeed-Signature'] = await signBody(body, watch.secret);
  }
  try {
    const res = await fetch(watch.callback_url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    return res.status;
  } catch (e) {
    console.warn(`watch delivery failed for ${watch.id}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function recordFire(env: Env, watch: Watch, deliveryStatus: number | null): Promise<void> {
  watch.fire_count += 1;
  watch.last_fired_at = nowIso();
  watch.last_delivery_status = deliveryStatus;
  if (watch.fire_count >= watch.fire_cap) {
    watch.status = 'cap_reached';
  }
  // Preserve TTL relative to the original creation date by computing remaining seconds
  const remaining = Math.max(
    60,
    Math.floor((new Date(watch.expires_at).getTime() - Date.now()) / 1000),
  );
  await env.TENSORFEED_CACHE.put(`watch:${watch.id}`, JSON.stringify(watch), {
    expirationTtl: remaining,
  });
}

// === Dispatch: price ===

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
}

interface ProviderPricing {
  id: string;
  name: string;
  models: ModelPricing[];
}

interface PricingPayload {
  providers: ProviderPricing[];
}

function flattenPricing(p: PricingPayload | null):
  Map<string, { providerName: string; model: ModelPricing }> {
  const out = new Map<string, { providerName: string; model: ModelPricing }>();
  if (!p?.providers) return out;
  for (const prov of p.providers) {
    for (const m of prov.models) {
      out.set(m.name.toLowerCase(), { providerName: prov.name, model: m });
    }
  }
  return out;
}

export function computePriceTransitions(
  before: PricingPayload | null,
  after: PricingPayload | null,
): PriceTransition[] {
  const beforeMap = flattenPricing(before);
  const afterMap = flattenPricing(after);
  const transitions: PriceTransition[] = [];

  for (const [key, post] of afterMap) {
    const pre = beforeMap.get(key);
    if (!pre) continue; // newly-added models don't have a "from" price; skip
    const fields: ('inputPrice' | 'outputPrice')[] = ['inputPrice', 'outputPrice'];
    for (const field of fields) {
      const fromV = pre.model[field];
      const toV = post.model[field];
      if (typeof fromV !== 'number' || typeof toV !== 'number') continue;
      if (fromV !== toV) {
        transitions.push({
          model: post.model.name,
          provider: post.providerName,
          field,
          from: fromV,
          to: toV,
        });
      }
    }
    const beforeBlended = (pre.model.inputPrice + pre.model.outputPrice) / 2;
    const afterBlended = (post.model.inputPrice + post.model.outputPrice) / 2;
    if (beforeBlended !== afterBlended) {
      transitions.push({
        model: post.model.name,
        provider: post.providerName,
        field: 'blended',
        from: beforeBlended,
        to: afterBlended,
      });
    }
  }
  return transitions;
}

interface DispatchSummary {
  watches_evaluated: number;
  watches_fired: number;
  delivery_failures: number;
}

export async function dispatchPriceWatches(
  env: Env,
  before: PricingPayload | null,
  after: PricingPayload | null,
): Promise<DispatchSummary> {
  const transitions = computePriceTransitions(before, after);
  if (transitions.length === 0) {
    return { watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 };
  }

  const ids = await readIndex(env, 'price');
  if (ids.length === 0) {
    return { watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 };
  }

  const watches = (await Promise.all(ids.map(id => getWatch(env, id)))).filter(
    (w): w is Watch => w !== null && w.spec.type === 'price' && w.status === 'active',
  );

  let fired = 0;
  let failures = 0;
  for (const watch of watches) {
    const spec = watch.spec as PriceWatchSpec;
    for (const t of transitions) {
      if (!priceWatchFires(spec, t)) continue;
      const payload: FirePayload = {
        event: 'watch.fire',
        watch_id: watch.id,
        fired_at: nowIso(),
        spec,
        match: {
          type: 'price',
          model: t.model,
          provider: t.provider,
          field: t.field,
          op: spec.op,
          ...(typeof spec.threshold === 'number' ? { threshold: spec.threshold } : {}),
          from: t.from,
          to: t.to,
          delta_pct:
            t.from === 0 ? null : parseFloat((((t.to - t.from) / t.from) * 100).toFixed(4)),
        },
      };
      const deliveryStatus = await deliver(watch, payload);
      if (deliveryStatus === null || deliveryStatus >= 400) failures += 1;
      await recordFire(env, watch, deliveryStatus);
      fired += 1;
      break; // one fire per watch per dispatch run
    }
  }

  return { watches_evaluated: watches.length, watches_fired: fired, delivery_failures: failures };
}

// === Dispatch: status ===

export async function dispatchStatusWatches(
  env: Env,
  transitions: StatusTransition[],
): Promise<DispatchSummary> {
  if (transitions.length === 0) {
    return { watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 };
  }

  const ids = await readIndex(env, 'status');
  if (ids.length === 0) {
    return { watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 };
  }

  const watches = (await Promise.all(ids.map(id => getWatch(env, id)))).filter(
    (w): w is Watch => w !== null && w.spec.type === 'status' && w.status === 'active',
  );

  let fired = 0;
  let failures = 0;
  for (const watch of watches) {
    const spec = watch.spec as StatusWatchSpec;
    for (const t of transitions) {
      if (!statusWatchFires(spec, t)) continue;
      const payload: FirePayload = {
        event: 'watch.fire',
        watch_id: watch.id,
        fired_at: nowIso(),
        spec,
        match: {
          type: 'status',
          provider: t.provider,
          name: t.name,
          op: spec.op,
          ...(spec.value ? { value: spec.value } : {}),
          from: t.from,
          to: t.to,
        },
      };
      const deliveryStatus = await deliver(watch, payload);
      if (deliveryStatus === null || deliveryStatus >= 400) failures += 1;
      await recordFire(env, watch, deliveryStatus);
      fired += 1;
      break;
    }
  }

  return { watches_evaluated: watches.length, watches_fired: fired, delivery_failures: failures };
}

// === Dispatch entry-points used by scheduled() ===

/**
 * Read the previous pricing snapshot saved by this module, compare with
 * the current `models` KV payload, fire matching watches, and persist the
 * new payload as the next "previous" baseline.
 */
export async function runPriceWatchCycle(env: Env): Promise<DispatchSummary> {
  const ids = await readIndex(env, 'price');
  if (ids.length === 0) {
    // Even with no watches, keep prev:pricing fresh so the first registered
    // watch doesn't fire on the entire historic delta when it's created.
    const current = (await env.TENSORFEED_CACHE.get('models', 'json')) as PricingPayload | null;
    if (current) {
      await env.TENSORFEED_CACHE.put('watch:prev:pricing', JSON.stringify(current));
    }
    return { watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 };
  }

  const [prev, current] = await Promise.all([
    env.TENSORFEED_CACHE.get('watch:prev:pricing', 'json') as Promise<PricingPayload | null>,
    env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingPayload | null>,
  ]);

  const summary = await dispatchPriceWatches(env, prev, current);
  if (current) {
    await env.TENSORFEED_CACHE.put('watch:prev:pricing', JSON.stringify(current));
  }
  return summary;
}
