/**
 * Kill switch for non-critical KV writes.
 *
 * Why this exists
 * ---------------
 * Cloudflare's Workers Paid plan has a 1M KV writes/month bundle and
 * meters overage at $5/M. Cloudflare does NOT offer a hard billing cap.
 * If a misbehaving cron or hot endpoint accidentally writes thousands of
 * keys per minute, the bill accumulates. This module gives the operator
 * a single switch that, when flipped, no-ops every non-critical KV write
 * until manually unflipped. Application degrades gracefully (snapshots
 * go stale, ring buffers stop accumulating, rate-limit counters reset)
 * but no money bleeds.
 *
 * Two control surfaces
 * --------------------
 * 1. Env secret `KILL_SWITCH_KV_WRITES`: set at deploy time via
 *    `wrangler secret put KILL_SWITCH_KV_WRITES`. Persistent across
 *    requests, requires deploy to flip.
 * 2. KV flag at `admin:kill-switch:kv-writes`: flipped at runtime via
 *    /api/admin/kill-switch?key=<ADMIN_KEY>&action=on|off. No deploy.
 *    For travel + emergency use: a single curl from any machine.
 *
 * If EITHER is set, the kill switch is active. Logical OR by design so
 * "wrangler secret put" remains the bulletproof override even if the KV
 * read fails for some reason.
 *
 * Critical writes bypass
 * ----------------------
 * Payment debits (pay:credits:*), replay protection (pay:tx:*), quote
 * lifecycle (pay:quote:*), and receipt-key storage MUST NOT be wrapped.
 * Skipping them would either leak credits (free agent calls), break
 * replay protection (security hole), or break credit-purchase flow.
 * The bleed risk on those paths is bounded by agent traffic and we
 * accept that.
 *
 * Hot-read posture
 * ----------------
 * safePut is called from per-request paths. Adding a KV.get per write
 * would double-count the bill, defeating the purpose. We cache the kill-
 * switch state in Cloudflare Cache API (free) for 30 seconds. Up to 30s
 * delay between flipping the switch and it taking effect, which is fine
 * for emergency response and great for cost.
 */

import { Env } from './types';

const KV_FLAG_KEY = 'admin:kill-switch:kv-writes';
const CACHE_KEY_URL = 'https://tf-killswitch-state.internal/v1/kv-writes';
const CACHE_TTL_SECONDS = 30;

interface KillSwitchState {
  active: boolean;
  source: 'env' | 'kv' | 'none';
  checked_at: string;
}

// In-isolate fast-path memo: avoid even Cache API lookup if checked recently.
let isolateMemo: { state: KillSwitchState; expiresAt: number } | null = null;
const ISOLATE_MEMO_MS = 5_000;

function getCache(): Cache | null {
  try {
    if (typeof caches === 'undefined') return null;
    return caches.default ?? null;
  } catch {
    return null;
  }
}

function buildCacheRequest(): Request {
  return new Request(CACHE_KEY_URL, { method: 'GET' });
}

/**
 * Check if the kill switch is currently active. Cheap on hot paths: the
 * result is memoized in-isolate for 5s, and falls back to a 30s Cache
 * API entry. Worst case is a single KV read per 30 seconds per data
 * center, so the wrapper itself doesn't contribute meaningfully to KV
 * read bills.
 */
export async function getKillSwitchState(env: Env): Promise<KillSwitchState> {
  const now = Date.now();
  if (isolateMemo && now < isolateMemo.expiresAt) {
    return isolateMemo.state;
  }

  // Env secret check (fastest, no network)
  const envFlag = (env.KILL_SWITCH_KV_WRITES ?? '').toString().trim().toLowerCase();
  if (envFlag === 'true' || envFlag === '1' || envFlag === 'yes') {
    const state: KillSwitchState = { active: true, source: 'env', checked_at: new Date().toISOString() };
    isolateMemo = { state, expiresAt: now + ISOLATE_MEMO_MS };
    return state;
  }

  // KV flag (via Cache API)
  const cache = getCache();
  const cacheReq = buildCacheRequest();
  if (cache) {
    const hit = await cache.match(cacheReq);
    if (hit) {
      try {
        const cached = (await hit.json()) as KillSwitchState;
        isolateMemo = { state: cached, expiresAt: now + ISOLATE_MEMO_MS };
        return cached;
      } catch {
        // Fall through to KV read
      }
    }
  }

  let kvFlag: string | null = null;
  try {
    kvFlag = await env.TENSORFEED_CACHE.get(KV_FLAG_KEY);
  } catch {
    kvFlag = null;
  }
  const kvActive = !!kvFlag && ['true', '1', 'yes'].includes(kvFlag.toString().trim().toLowerCase());

  const state: KillSwitchState = {
    active: kvActive,
    source: kvActive ? 'kv' : 'none',
    checked_at: new Date().toISOString(),
  };

  if (cache) {
    const res = new Response(JSON.stringify(state), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `s-maxage=${CACHE_TTL_SECONDS}`,
      },
    });
    await cache.put(cacheReq, res);
  }
  isolateMemo = { state, expiresAt: now + ISOLATE_MEMO_MS };
  return state;
}

/**
 * Flip the KV-flag side of the kill switch. The env-secret side is
 * controlled separately via `wrangler secret put`. After this call,
 * the new state may take up to 30s to propagate (Cache API TTL).
 *
 * `on` boolean. `actor` is logged in the audit trail; typically a short
 * description like "manual via admin endpoint" or "alert handler".
 */
export async function setKillSwitch(env: Env, on: boolean, actor: string): Promise<KillSwitchState> {
  // This write bypasses the kill switch by definition: we read/write
  // env.TENSORFEED_CACHE directly, not safePut.
  if (on) {
    await env.TENSORFEED_CACHE.put(KV_FLAG_KEY, 'true');
  } else {
    await env.TENSORFEED_CACHE.delete(KV_FLAG_KEY);
  }

  // Audit log (ring buffer, capped)
  try {
    const auditKey = 'admin:kill-switch:audit';
    const raw = await env.TENSORFEED_CACHE.get(auditKey);
    const history: Array<{ at: string; on: boolean; actor: string }> = raw ? JSON.parse(raw) : [];
    history.push({ at: new Date().toISOString(), on, actor });
    if (history.length > 200) history.splice(0, history.length - 200);
    await env.TENSORFEED_CACHE.put(auditKey, JSON.stringify(history));
  } catch {
    // Audit write failure is non-blocking
  }

  // Invalidate cache + isolate memo so the new state takes effect immediately
  // in this isolate, and within ~30s globally.
  const cache = getCache();
  if (cache) {
    try {
      await cache.delete(buildCacheRequest());
    } catch {
      /* ignore */
    }
  }
  isolateMemo = null;

  return await getKillSwitchState(env);
}

/**
 * Wrapped KV put. If the kill switch is active and the write is not
 * marked critical, the write is a no-op (returns false). Otherwise the
 * write is performed (returns true).
 *
 * Use this for every non-critical write: daily snapshots, ring buffers,
 * rate-limit counters, activity tracking, anomaly events, spend-cap
 * accumulators, probe results. Do NOT use this for payment debits,
 * replay protection, or quote lifecycle.
 *
 * Type matches KVNamespace.put: any value type, any options.
 */
export async function safePut(
  env: Env,
  kv: KVNamespace,
  key: string,
  value: string | ArrayBuffer | ReadableStream,
  options?: KVNamespacePutOptions,
): Promise<boolean> {
  const state = await getKillSwitchState(env);
  if (state.active) {
    return false;
  }
  await kv.put(key, value, options);
  return true;
}

/**
 * Read the audit log of kill-switch flips. Used by the admin status
 * endpoint to surface "who flipped it when".
 */
export async function getKillSwitchAuditLog(env: Env): Promise<Array<{ at: string; on: boolean; actor: string }>> {
  try {
    const raw = await env.TENSORFEED_CACHE.get('admin:kill-switch:audit');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Test-only hook to clear the in-isolate memo. Production code does not
 * need this; the memo expires naturally every 5s.
 */
export function _resetIsolateMemoForTests(): void {
  isolateMemo = null;
}
