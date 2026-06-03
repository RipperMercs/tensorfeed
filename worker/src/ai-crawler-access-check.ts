// worker/src/ai-crawler-access-check.ts
// On-demand crawler-access check: a pure SSRF-guarded domain validator plus a
// thin live-crawl helper that reuses the shared crawlSite() engine. Used by the
// guarded GET /api/ai-crawler-access/check route for domains not in the tracked
// seed set. No KV writes, no billing; the route memoizes per domain for 1h.
import type { Env } from './types';
import type { DomainRecord } from './ai-crawler-access-feed';
import { crawlSite } from './ai-crawler-access-feed';

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const BAD_SUFFIX = ['.local', '.internal', '.localhost'];

export function validateCheckDomain(input: string): { ok: true; domain: string } | { ok: false; error: string } {
  if (!input) return { ok: false, error: 'empty' };
  const d = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!d || d.length > 253) return { ok: false, error: 'invalid_length' };
  if (d.includes('_')) return { ok: false, error: 'invalid_char' };
  if (d.indexOf('.') === -1) return { ok: false, error: 'no_tld' };
  if (d === 'localhost' || BAD_SUFFIX.some((s) => d.endsWith(s))) return { ok: false, error: 'internal_host' };
  if (IPV4_RE.test(d) || d.includes(':') || d.includes('[')) return { ok: false, error: 'ip_literal' };
  if (!HOST_RE.test(d)) return { ok: false, error: 'invalid_host' };
  const tld = d.slice(d.lastIndexOf('.') + 1);
  if (tld.length < 2) return { ok: false, error: 'invalid_tld' };
  return { ok: true, domain: d };
}

export async function checkDomainLive(env: Env, domain: string): Promise<DomainRecord> {
  return crawlSite(domain, 'on-demand', new Date().toISOString());
}
