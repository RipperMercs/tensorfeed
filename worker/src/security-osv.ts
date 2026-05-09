/**
 * OSV.dev (Open Source Vulnerabilities) ingest.
 *
 * OSV.dev is the canonical cross-ecosystem vulnerability database
 * maintained by Google. Aggregates advisories across PyPI, npm, Go,
 * Rust, Maven, NuGet, RubyGems, Packagist, Linux distributions, and
 * more. Pairs with our existing CVE List + KEV + EPSS to complete
 * the security data trio's "given this package, what advisories
 * affect it" lookup the others can't easily answer.
 *
 * License: OSV.dev's published terms place the API and data under
 * Apache License 2.0. Commercial redistribution permitted with
 * standard Apache-2.0 attribution. We attach the attribution block
 * to every response.
 *
 * Architecture: pure lazy-proxy with KV cache, same pattern as EPSS
 * and NASA POWER. Two read modes:
 *   1. fetchOSVById(id)        single advisory by GHSA/CVE/PYSEC id
 *   2. fetchOSVForPackage(...)  POST query for all advisories
 *                                affecting one package version
 * Cache TTL 24h for both; advisory metadata mostly stable but the
 * affected-version ranges do update as new patches land.
 */

import type { Env } from './types';
import { sha256CacheKey } from './cache-key';

const OSV_API = 'https://api.osv.dev/v1';

const TTL_QUERY = 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'OSV.dev (Open Source Vulnerabilities)',
  source_url: 'https://osv.dev/',
  publisher: 'Google / OSV.dev community',
  license: 'Apache License 2.0',
  redistribution: 'commercial-permitted',
  notice:
    'OSV.dev advisory data is licensed under Apache License 2.0. Per the license, redistribution must include attribution and a copy of the license. The TensorFeed response includes this attribution block on every payload to satisfy that requirement on the consuming agent\'s behalf.',
};

// OSV advisory IDs use mixed case in practice. The prefix portion is
// uppercase by convention (GHSA, CVE, PYSEC, RUSTSEC, GO, OSV, DSA,
// ALPINE, DEBIAN, UBUNTU) but the hash/serial portion can be lowercase
// (e.g. GHSA-r75f-5x8p-qvmc). We validate structurally and preserve
// the caller's case so OSV.dev's case-sensitive lookup hits the right
// advisory.
const ID_PREFIX_RE = /^[A-Z][A-Z0-9]{1,15}-/;
const ID_FULL_RE = /^[A-Z][A-Z0-9]{1,15}-[A-Za-z0-9-]{2,80}$/;
const ECOSYSTEM_RE = /^[A-Za-z][A-Za-z0-9.\-:]{1,40}$/;
const PKG_NAME_RE = /^[@A-Za-z0-9_./\-]{1,200}$/;
const VERSION_RE = /^[A-Za-z0-9_+.\-:~^>=<*]{1,100}$/;

const SUPPORTED_ECOSYSTEMS = [
  'PyPI',
  'npm',
  'Go',
  'crates.io',
  'Maven',
  'NuGet',
  'RubyGems',
  'Packagist',
  'Hex',
  'Pub',
  'Hackage',
  'Linux',
  'Debian',
  'Ubuntu',
  'Alpine',
  'OSS-Fuzz',
  'Android',
];

export function normalizeOsvId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Uppercase only the prefix portion (everything up to the first dash);
  // preserve the case of the hash/serial portion since OSV.dev lookup is
  // case-sensitive on the suffix (GHSA-r75f-5x8p-qvmc != GHSA-R75F-5X8P-QVMC).
  const dashIdx = trimmed.indexOf('-');
  if (dashIdx < 0) return null;
  const prefix = trimmed.slice(0, dashIdx).toUpperCase();
  const suffix = trimmed.slice(dashIdx);
  const normalized = `${prefix}${suffix}`;
  return ID_FULL_RE.test(normalized) ? normalized : null;
}

export interface OsvSingleResult {
  ok: boolean;
  id: string;
  source: 'cache' | 'live' | 'not_found';
  fetched_at: string;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export async function fetchOSVById(env: Env, idInput: string): Promise<OsvSingleResult> {
  const fetched_at = new Date().toISOString();
  const id = normalizeOsvId(idInput);
  if (!id) {
    return {
      ok: false,
      id: idInput,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'invalid_osv_id',
    };
  }

  const cacheKey = `osv:id:${id}`;
  const cached = await env.TENSORFEED_CACHE.get<unknown>(cacheKey, 'json');
  if (cached) {
    return { ok: true, id, source: 'cache', fetched_at, data: cached, attribution: ATTRIBUTION };
  }

  let resp: Response;
  try {
    resp = await fetch(`${OSV_API}/vulns/${encodeURIComponent(id)}`, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: `osv_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 404) {
    return {
      ok: false,
      id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'osv_not_found',
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: `osv_http_${resp.status}`,
    };
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    return {
      ok: false,
      id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'osv_invalid_json',
    };
  }

  await env.TENSORFEED_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: TTL_QUERY });

  return { ok: true, id, source: 'live', fetched_at, data, attribution: ATTRIBUTION };
}

export interface OsvPackageQuery {
  ecosystem: string;
  name: string;
  version: string | null;
}

export interface OsvPackageResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: OsvPackageQuery;
  vulns_count: number;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export interface ParseOk {
  ok: true;
  query: OsvPackageQuery;
}
export interface ParseErr {
  ok: false;
  error: string;
  hint: string;
}

export function parseOsvPackageQuery(url: URL): ParseOk | ParseErr {
  const ecosystem = url.searchParams.get('ecosystem');
  const name = url.searchParams.get('name') ?? url.searchParams.get('package');
  const version = url.searchParams.get('version');

  if (!ecosystem) {
    return {
      ok: false,
      error: 'ecosystem_required',
      hint: `pass ?ecosystem=<one of: ${SUPPORTED_ECOSYSTEMS.slice(0, 8).join(', ')}, ...>`,
    };
  }
  if (!ECOSYSTEM_RE.test(ecosystem)) {
    return { ok: false, error: 'invalid_ecosystem', hint: 'ecosystem must match [A-Za-z][A-Za-z0-9.:-]+' };
  }
  if (!name) {
    return { ok: false, error: 'name_required', hint: 'pass ?name=<package-name>' };
  }
  if (!PKG_NAME_RE.test(name)) {
    return { ok: false, error: 'invalid_name', hint: 'name contains disallowed characters' };
  }
  if (version && !VERSION_RE.test(version)) {
    return { ok: false, error: 'invalid_version', hint: 'version contains disallowed characters' };
  }
  return { ok: true, query: { ecosystem, name, version } };
}

export async function fetchOSVForPackage(
  env: Env,
  q: OsvPackageQuery,
): Promise<OsvPackageResult> {
  const fetched_at = new Date().toISOString();
  const cacheKey = `osv:pkg:${await sha256CacheKey([q.ecosystem, q.name, q.version ?? ''].join('|'))}`;

  const cached = await env.TENSORFEED_CACHE.get<{ vulns?: unknown[] }>(cacheKey, 'json');
  if (cached) {
    const vulns = Array.isArray(cached.vulns) ? cached.vulns : [];
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      vulns_count: vulns.length,
      data: cached,
      attribution: ATTRIBUTION,
    };
  }

  const body: Record<string, unknown> = {
    package: { name: q.name, ecosystem: q.ecosystem },
  };
  if (q.version) body.version = q.version;

  let resp: Response;
  try {
    resp = await fetch(`${OSV_API}/query`, {
      method: 'POST',
      headers: {
        'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      vulns_count: 0,
      data: null,
      attribution: ATTRIBUTION,
      error: `osv_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      vulns_count: 0,
      data: null,
      attribution: ATTRIBUTION,
      error: `osv_http_${resp.status}`,
    };
  }

  let payload: { vulns?: unknown[] };
  try {
    payload = (await resp.json()) as { vulns?: unknown[] };
  } catch {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      vulns_count: 0,
      data: null,
      attribution: ATTRIBUTION,
      error: 'osv_invalid_json',
    };
  }

  const vulns = Array.isArray(payload.vulns) ? payload.vulns : [];
  await env.TENSORFEED_CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: TTL_QUERY });

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    vulns_count: vulns.length,
    data: payload,
    attribution: ATTRIBUTION,
  };
}

export const OSV_ATTRIBUTION = ATTRIBUTION;
export const OSV_SUPPORTED_ECOSYSTEMS = SUPPORTED_ECOSYSTEMS;
