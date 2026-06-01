/**
 * Breaking-alert banner backend.
 *
 * One global alert at a time, raised only by POST /api/admin/breaking and
 * read by GET /api/breaking. All validation, expiry, and the KV/Cache writes
 * live here so index.ts route handlers stay thin. Mirrors kill-switch.ts:
 * the admin write goes DIRECTLY to KV (not safePut) so a takedown works even
 * during a cost kill switch, and it purges the Cache API entry on every write.
 *
 * SECURITY: headline renders site-wide as escaped text only (never
 * dangerouslySetInnerHTML, enforced in the component) and is length-capped and
 * em-dash-rejected here (the only enforcement point, since a runtime KV value
 * never passes the build-time scan). href is allowlisted to same-origin
 * relative paths here AND gated again at render.
 */

import type { Env } from './types';

export interface BreakingAlert {
  id: string;
  headline: string;
  href: string;
  published_at: string;
  expires_at: string;
}

export interface BreakingAuditEntry {
  at: string;
  action: 'set' | 'clear';
  id?: string;
  headline?: string;
}

export const KV_KEY = 'breaking:current';
export const AUDIT_KEY = 'breaking:audit';
export const AUDIT_CAP = 100;
export const HEADLINE_MAX = 90;
export const TTL_MIN_HOURS = 1;
export const TTL_MAX_HOURS = 168;
export const TTL_DEFAULT_HOURS = 24;
export const CACHE_TTL_SECONDS = 15;

type Validated = { ok: true; value: string } | { ok: false; error: string };

// charCodeAt checks instead of regex literals so this source file holds no
// literal control char or em dash.
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

function hasEmOrEnDash(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x2014 || c === 0x2013) return true;
  }
  return false;
}

export function validateHeadline(raw: unknown): Validated {
  if (typeof raw !== 'string') return { ok: false, error: 'headline_required' };
  const value = raw.trim();
  if (!value) return { ok: false, error: 'headline_required' };
  if (value.length > HEADLINE_MAX) return { ok: false, error: 'headline_too_long' };
  if (hasControlChar(value)) return { ok: false, error: 'headline_control_chars' };
  // Strict content rule: no em dash, en dash, or double hyphen as punctuation.
  if (hasEmOrEnDash(value) || /\s--\s/.test(value)) return { ok: false, error: 'headline_em_dash' };
  return { ok: true, value };
}

export function validateHref(raw: unknown): Validated {
  if (typeof raw !== 'string') return { ok: false, error: 'href_required' };
  const value = raw.trim();
  // Same-origin relative only: exactly one leading slash, not '//' (protocol
  // relative). This also rejects http:, https:, javascript:, data:, vbscript:
  // because none of them start with a single '/'.
  if (!/^\/[^/]/.test(value)) return { ok: false, error: 'href_must_be_same_origin_path' };
  if (value.includes('\\')) return { ok: false, error: 'href_backslash' };
  if (hasControlChar(value)) return { ok: false, error: 'href_control_chars' };
  return { ok: true, value };
}

export function buildAlert(headline: string, href: string, ttlHours: number, now: Date, rand: string): BreakingAlert {
  return {
    id: `brk_${now.getTime()}_${rand}`,
    headline,
    href,
    published_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlHours * 3_600_000).toISOString(),
  };
}

function looksLikeAlert(v: unknown): v is BreakingAlert {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.headline === 'string' &&
    typeof a.href === 'string' &&
    typeof a.expires_at === 'string'
  );
}

/** Pure: returns the alert only if it is well-formed and not expired; else null. Never writes. */
export function filterActiveAlert(raw: unknown, now: Date): BreakingAlert | null {
  if (!looksLikeAlert(raw)) return null;
  const exp = Date.parse(raw.expires_at);
  if (!Number.isFinite(exp) || now.getTime() > exp) return null;
  return raw;
}

// KV + Cache API (direct writes, mirrors kill-switch.ts)

function breakingCacheRequest(): Request {
  // Must match the synthetic key cachedKVGet builds for KV key 'breaking:current'.
  return new Request(`https://tensorfeed-kv-cache.internal/__kv_cache/${encodeURIComponent(KV_KEY)}`);
}

async function purgeBreakingCache(): Promise<void> {
  try {
    const cache = caches.default;
    await cache.delete(breakingCacheRequest());
  } catch {
    /* cache unavailable in some contexts */
  }
}

async function appendAudit(env: Env, entry: BreakingAuditEntry): Promise<void> {
  try {
    const raw = await env.TENSORFEED_CACHE.get(AUDIT_KEY);
    const history: BreakingAuditEntry[] = raw ? JSON.parse(raw) : [];
    history.push(entry);
    if (history.length > AUDIT_CAP) history.splice(0, history.length - AUDIT_CAP);
    await env.TENSORFEED_CACHE.put(AUDIT_KEY, JSON.stringify(history));
  } catch {
    /* audit is non-blocking */
  }
}

/** Raw stored alert (including expired). Used by the admin observability GET. */
export async function readRawBreaking(env: Env): Promise<BreakingAlert | null> {
  const raw = (await env.TENSORFEED_CACHE.get(KV_KEY, 'json')) as unknown;
  return looksLikeAlert(raw) ? raw : null;
}

/** Set the alert. DIRECT KV write (not safePut) so it is controllable during a kill switch. */
export async function setBreaking(env: Env, alert: BreakingAlert): Promise<void> {
  await env.TENSORFEED_CACHE.put(KV_KEY, JSON.stringify(alert));
  await appendAudit(env, { at: new Date().toISOString(), action: 'set', id: alert.id, headline: alert.headline });
  await purgeBreakingCache();
}

/** Clear the alert. DIRECT delete (bypasses safePut) so a takedown always works. */
export async function clearBreaking(env: Env): Promise<void> {
  await env.TENSORFEED_CACHE.delete(KV_KEY);
  await appendAudit(env, { at: new Date().toISOString(), action: 'clear' });
  await purgeBreakingCache();
}

export async function getBreakingAudit(env: Env): Promise<BreakingAuditEntry[]> {
  try {
    const raw = await env.TENSORFEED_CACHE.get(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as BreakingAuditEntry[]) : [];
  } catch {
    return [];
  }
}
