/**
 * Honeypot endpoints.
 *
 * Paths in the HONEYPOT_PATHS list have no legitimate use on TensorFeed
 * but are heavily probed by scanners, malware, and exploit kits. We route
 * them through this module which:
 *   1. Logs the probe with structured fields (ip, ua, path, asn) so it
 *      lands in Logpush + Cloudflare Workers Observability
 *   2. Counts hits per IP in an in-isolate map, decaying every 5 minutes
 *   3. Returns 404 with a body that is identical to legitimate 404s
 *      (so the prober cannot distinguish "real 404" from "trap hit"
 *      and adjust their tooling)
 *
 * Suspicious-IP scoring fed from this module is used by abuse-tracker.ts
 * to inform IOC exports. We deliberately do NOT block honeypot hits at
 * the application layer here. Cloudflare's edge layer is the right tier
 * for blocking. Application is for evidence collection.
 *
 * False positives: a small number of these paths can be hit by buggy
 * crawlers or stale third-party links. We accept the noise; the value
 * is the ratio of (probes : legitimate hits), which is overwhelmingly
 * the former.
 */

import type { Env } from './types';
import { getClientIP } from './rate-limit';

/**
 * Path prefixes and exact paths considered traps. Match is exact OR
 * startsWith for paths ending in `/`. Case-insensitive on extension.
 */
const HONEYPOT_PATHS: ReadonlyArray<string> = [
  // WordPress and common CMS attack surfaces (we are not WordPress)
  '/wp-login.php',
  '/wp-admin/',
  '/wp-content/',
  '/wp-includes/',
  '/wp-json/',
  '/xmlrpc.php',
  '/wordpress/',
  // Generic admin probes
  '/admin/',
  '/administrator/',
  '/phpmyadmin/',
  '/pma/',
  '/myadmin/',
  // Config and secret exfiltration
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.git/config',
  '/.git/HEAD',
  '/.aws/credentials',
  '/.ssh/id_rsa',
  '/config.php',
  '/configuration.php',
  '/wp-config.php',
  '/database.yml',
  // Common framework/dev leaks
  '/server-status',
  '/server-info',
  '/.well-known/security.txt', // we ship a real one, but if absent, log probes
  // Common backdoor file probes
  '/shell.php',
  '/backdoor.php',
  '/c99.php',
  '/r57.php',
  // PHP CVE probes
  '/cgi-bin/',
  '/_ignition/execute-solution',
  // ColdFusion / Java / Tomcat
  '/CFIDE/administrator/',
  '/manager/html',
  '/host-manager/html',
  // S3-style probes against the apex
  '/index.php',
  '/index.asp',
  '/index.aspx',
  // Generic user dump probes that look like API endpoints
  '/api/v1/users',
  '/api/users',
  '/api/admin',
  '/users.json',
  '/dump.sql',
  '/db.sql',
  '/backup.zip',
  '/backup.sql',
  '/site.tar.gz',
];

const TRAILING_SLASH_PREFIXES: ReadonlyArray<string> = HONEYPOT_PATHS.filter((p) => p.endsWith('/'));
const EXACT_PATHS: ReadonlySet<string> = new Set(HONEYPOT_PATHS.filter((p) => !p.endsWith('/')));

export interface HoneypotHit {
  detected_at: string;
  ip: string;
  path: string;
  method: string;
  user_agent: string;
  cf_ray: string;
  asn: number | null;
  country: string | null;
}

// Legacy KV layout (drained, kept for the IOC reader's transitional
// fallback until AE SQL API is wired up). Records under sec:honeypot:hits:*
// will TTL out naturally over 30 days.
const HITS_PREFIX = 'sec:honeypot:hits:';
const HITS_INDEX_KEY = 'sec:honeypot:index';
const HITS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Return true if `path` is a honeypot trap path.
 */
export function isHoneypotPath(path: string): boolean {
  if (EXACT_PATHS.has(path)) return true;
  const lower = path.toLowerCase();
  for (const prefix of TRAILING_SLASH_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase())) return true;
  }
  return false;
}

/**
 * Build a structured hit record from the incoming request. Pure; no
 * side effects. Use logHoneypotHit() to actually persist + emit.
 */
export function makeHit(request: Request): HoneypotHit {
  const url = new URL(request.url);
  const cf = (request as Request & { cf?: { asn?: number; country?: string } }).cf;
  return {
    detected_at: new Date().toISOString(),
    ip: getClientIP(request),
    path: url.pathname,
    method: request.method,
    user_agent: (request.headers.get('user-agent') || '').slice(0, 256),
    cf_ray: request.headers.get('cf-ray') || '',
    asn: typeof cf?.asn === 'number' ? cf.asn : null,
    country: typeof cf?.country === 'string' ? cf.country : null,
  };
}

/**
 * Persist a hit and emit a structured log line. Async; do not block
 * the response on this. Use ctx.waitUntil() at the call site.
 *
 * Storage (2026-05-12 onward): Workers Analytics Engine. Migrated off
 * KV because the prior pattern wrote 2 KV ops per hit (record + index
 * update), which is a time bomb under any sustained bot scan. AE is
 * free with Workers Paid (25M datapoints/mo) and purpose-built for
 * high-frequency event logging.
 *
 * The console.log line is preserved so Workers Observability still has
 * full per-hit forensic detail for ad-hoc investigation.
 */
export async function logHoneypotHit(env: Env, hit: HoneypotHit): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('honeypot_hit', JSON.stringify(hit));
  if (env.HONEYPOT_AE) {
    try {
      env.HONEYPOT_AE.writeDataPoint({
        // index1 is the sampling key (max 1, max 96 bytes). IP gives
        // good per-attacker dedupe for the SQL aggregation that powers
        // the IOC export.
        indexes: [hit.ip.slice(0, 96)],
        blobs: [
          hit.path.slice(0, 256),
          hit.method.slice(0, 16),
          hit.user_agent.slice(0, 256),
          hit.country ?? '',
          hit.cf_ray.slice(0, 64),
        ],
        doubles: [
          hit.asn ?? 0,
          // Epoch ms for time bucketing in SQL queries.
          Date.parse(hit.detected_at),
        ],
      });
    } catch (err) {
      // AE writes are best-effort; never break the response on telemetry.
      console.warn('honeypot AE write failed:', err);
    }
  }
}

/**
 * Build the standardized 404 response returned for honeypot hits. The
 * shape matches the Worker's other 404s so a prober cannot distinguish
 * traps from real missing paths.
 */
export function honeypotResponse(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/**
 * Convenience all-in-one: returns the 404 response if `path` is a trap,
 * scheduling the log write via ctx.waitUntil(). Returns null if `path`
 * is not a trap (the caller should continue normal routing).
 */
export function maybeHandleHoneypot(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Response | null {
  const url = new URL(request.url);
  if (!isHoneypotPath(url.pathname)) return null;
  const hit = makeHit(request);
  ctx.waitUntil(logHoneypotHit(env, hit));
  return honeypotResponse();
}
