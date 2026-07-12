/**
 * Private Signal console API: /api/signal/*. Self-contained and session-gated.
 *
 * Routes:
 *   GET  /api/signal/session   -> { authed, email? }         (no auth required; reports state)
 *   POST /api/signal/login     -> sets the session cookie on valid credentials
 *   POST /api/signal/logout    -> clears the session cookie
 *   GET  /api/signal/stats     -> regular traffic (session required)
 *   GET  /api/signal/ai-stats  -> AI intent split (session required)
 *
 * Fails closed: with CONSOLE_USERS / CONSOLE_SESSION_SECRET unset, login rejects
 * everyone and the gated reads 401. Responses are private and never edge-shared
 * to clients (Cache-Control: private, no-store); the two read endpoints keep a
 * 60s server-side cache (keyed by a synthetic internal URL, never the cookie) so
 * a refresh loop cannot hammer the Cloudflare analytics backends.
 */

import type { Env } from './types';
import {
  COOKIE_NAME,
  buildSessionCookie,
  clearSessionCookie,
  createSession,
  readCookie,
  verifyCredentials,
  verifySession,
} from './signal-auth';
import { buildSignalStats } from './signal-stats';
import { buildSignalAiStats } from './signal-ai-stats';
import { buildSignalApiAgents, clampApiAgentsDays } from './signal-api-agents';

function jsonPrivate(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Private data: never store in shared caches, never in the browser cache.
      // No Access-Control-Allow-Origin, so other origins cannot read it.
      'Cache-Control': 'private, no-store',
      ...extraHeaders,
    },
  });
}

async function authedEmail(request: Request, env: Env): Promise<string | null> {
  const token = readCookie(request.headers.get('cookie'), COOKIE_NAME);
  return verifySession(env.CONSOLE_SESSION_SECRET || '', token);
}

// 60s server-side cache for the two read endpoints, keyed on a synthetic internal
// URL (never the cookie), so a single authed user's refresh spam does not hammer
// the Cloudflare Analytics APIs. Auth is always checked BEFORE this runs, so the
// cache is never a bypass. Returns the JSON string to serialize to the client.
async function cached60(
  ctx: ExecutionContext,
  cacheKeyPath: string,
  build: () => Promise<unknown>,
): Promise<string> {
  const cacheReq = new Request(`https://signal-cache.tensorfeed.ai${cacheKeyPath}`);
  const cache = caches.default;
  const hit = await cache.match(cacheReq);
  if (hit) return hit.text();
  const data = await build();
  const bodyText = JSON.stringify(data);
  const toCache = new Response(bodyText, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
  ctx.waitUntil(cache.put(cacheReq, toCache));
  return bodyText;
}

function clampTrend(raw: string | null): number {
  if (raw === null) return 0;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 0;
  return n > 14 ? 14 : n;
}

export async function handleSignalRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
  path: string,
): Promise<Response> {
  const method = request.method.toUpperCase();

  // Session state probe. Safe to call unauthenticated; reports authed:false.
  if (path === '/api/signal/session') {
    if (method !== 'GET') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    const email = await authedEmail(request, env);
    return jsonPrivate({ ok: true, authed: !!email, email: email || undefined });
  }

  if (path === '/api/signal/login') {
    if (method !== 'POST') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    // Fail closed if the console is not provisioned.
    if (!env.CONSOLE_USERS || !env.CONSOLE_SESSION_SECRET) {
      return jsonPrivate({ ok: false, error: 'auth_unavailable' }, 401);
    }
    let body: { email?: unknown; password?: unknown };
    try {
      body = (await request.json()) as { email?: unknown; password?: unknown };
    } catch {
      return jsonPrivate({ ok: false, error: 'bad_request' }, 400);
    }
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return jsonPrivate({ ok: false, error: 'bad_request' }, 400);

    const ok = await verifyCredentials(env.CONSOLE_USERS, email, password);
    if (!ok) return jsonPrivate({ ok: false, error: 'invalid_credentials' }, 401);

    const token = await createSession(env.CONSOLE_SESSION_SECRET, email);
    if (!token) return jsonPrivate({ ok: false, error: 'auth_unavailable' }, 500);
    return jsonPrivate({ ok: true }, 200, { 'Set-Cookie': buildSessionCookie(token) });
  }

  if (path === '/api/signal/logout') {
    if (method !== 'POST') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    return jsonPrivate({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  if (path === '/api/signal/stats') {
    if (method !== 'GET') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    if (!(await authedEmail(request, env))) return jsonPrivate({ ok: false, error: 'unauthorized' }, 401);
    const bodyText = await cached60(ctx, '/stats', () => buildSignalStats(env));
    return new Response(bodyText, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }

  if (path === '/api/signal/ai-stats') {
    if (method !== 'GET') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    if (!(await authedEmail(request, env))) return jsonPrivate({ ok: false, error: 'unauthorized' }, 401);
    const trend = clampTrend(url.searchParams.get('trend'));
    const bodyText = await cached60(ctx, `/ai-stats?trend=${trend}`, () => buildSignalAiStats(env, trend));
    return new Response(bodyText, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }

  if (path === '/api/signal/api-agents') {
    if (method !== 'GET') return jsonPrivate({ ok: false, error: 'method_not_allowed' }, 405);
    if (!(await authedEmail(request, env))) return jsonPrivate({ ok: false, error: 'unauthorized' }, 401);
    const days = clampApiAgentsDays(url.searchParams.get('days'));
    const bodyText = await cached60(ctx, `/api-agents?days=${days}`, () => buildSignalApiAgents(env, days));
    return new Response(bodyText, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }

  return jsonPrivate({ ok: false, error: 'not_found' }, 404);
}
