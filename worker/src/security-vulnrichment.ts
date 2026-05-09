/**
 * CISA Vulnrichment ingest.
 *
 * Vulnrichment is CISA's authorized-data-publisher enrichment layer
 * on top of the MITRE CVE Records. For CVEs CISA has reviewed, the
 * enrichment adds CWE mappings, CVSS v3.1 scoring (where MITRE has
 * none), exploitation evidence references, KEV cross-reference flags,
 * and additional vendor-specific advisories. This is the data that
 * makes a raw MITRE CVE Record actually actionable for security
 * agents.
 *
 * Repo: https://github.com/cisagov/vulnrichment (branch: develop)
 * License: US Government public domain (17 USC §105). Commercial
 * redistribution explicitly permitted with no attribution requirement.
 *
 * Architecture: pure lazy-proxy with KV cache, same pattern as the
 * CVE module. Each CVE has a deterministic path:
 *   {year}/{bucket}xxx/CVE-YYYY-NNNNN.json
 * where bucket = floor(N / 1000) (e.g. CVE-2024-3094 lives at
 * 2024/3xxx/CVE-2024-3094.json).
 */

import type { Env } from './types';

const VULNRICHMENT_BASE =
  'https://raw.githubusercontent.com/cisagov/vulnrichment/develop';

const TTL_RECORD = 7 * 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'CISA Vulnrichment',
  source_url: 'https://github.com/cisagov/vulnrichment',
  publisher: 'Cybersecurity and Infrastructure Security Agency (US Government)',
  license: 'US Government public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'CISA Vulnrichment is a US Government work in the public domain. The enrichment lives in the standard CVE Record v5.2 shape under containers.adp[] (Authorized Data Publisher container). Pair with /api/security/cve/{id} for the MITRE-side record; the two together give an agent the most complete view of a vulnerability available in the public domain.',
};

const CVE_ID_RE = /^CVE-(\d{4})-(\d{4,7})$/i;

export function normalizeCVEId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();
  return CVE_ID_RE.test(trimmed) ? trimmed : null;
}

export function vulnrichmentPath(cveId: string): string | null {
  const m = cveId.toUpperCase().match(CVE_ID_RE);
  if (!m) return null;
  const year = m[1];
  const num = parseInt(m[2], 10);
  if (!Number.isFinite(num)) return null;
  const bucket = `${Math.floor(num / 1000)}xxx`;
  return `${year}/${bucket}/${cveId.toUpperCase()}.json`;
}

export interface VulnrichmentResult {
  ok: boolean;
  cveId: string;
  source: 'cache' | 'live' | 'not_found';
  fetched_at: string;
  record: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export async function fetchVulnrichment(env: Env, cveIdInput: string): Promise<VulnrichmentResult> {
  const fetched_at = new Date().toISOString();
  const cveId = normalizeCVEId(cveIdInput);
  if (!cveId) {
    return {
      ok: false,
      cveId: cveIdInput,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: 'invalid_cve_id',
    };
  }

  const cacheKey = `vulnrichment:${cveId}`;
  const cached = await env.TENSORFEED_CACHE.get<unknown>(cacheKey, 'json');
  if (cached) {
    return {
      ok: true,
      cveId,
      source: 'cache',
      fetched_at,
      record: cached,
      attribution: ATTRIBUTION,
    };
  }

  const path = vulnrichmentPath(cveId);
  if (!path) {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: 'invalid_cve_id',
    };
  }

  let resp: Response;
  try {
    resp = await fetch(`${VULNRICHMENT_BASE}/${path}`, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: `vulnrichment_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 404) {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: 'cve_not_in_vulnrichment',
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: `vulnrichment_http_${resp.status}`,
    };
  }

  let record: unknown;
  try {
    record = await resp.json();
  } catch {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      fetched_at,
      record: null,
      attribution: ATTRIBUTION,
      error: 'vulnrichment_invalid_json',
    };
  }

  await env.TENSORFEED_CACHE.put(cacheKey, JSON.stringify(record), { expirationTtl: TTL_RECORD });

  return { ok: true, cveId, source: 'live', fetched_at, record, attribution: ATTRIBUTION };
}

export const VULNRICHMENT_ATTRIBUTION = ATTRIBUTION;
