/**
 * IOC export endpoint.
 *
 * Public, free, agent-readable export of indicators-of-compromise observed
 * against TensorFeed. Data is sourced from honeypot hits captured in
 * sec:honeypot:hits:* keys. Downstream consumers (TerminalFeed, AFTA
 * federation members, community defenders) can ingest this feed and
 * pre-block known-bad IPs at their own edge.
 *
 * Scope deliberately narrow: we publish what we directly observed. No
 * third-party threat-intel re-export. No personal info beyond what the
 * attacker chose to send us. Cached for 5 minutes so a runaway poller
 * cannot DoS the export.
 *
 * Endpoint: GET /api/security/iocs.json
 * Cache: edge cache 300s, no KV writes on the read path.
 */

import type { Env } from './types';

const HITS_PREFIX = 'sec:honeypot:hits:';
const HITS_INDEX_KEY = 'sec:honeypot:index';
const MAX_IOCS_PER_RESPONSE = 1000;
const RECENT_WINDOW_HOURS = 24 * 30; // 30 days

interface HoneypotHitRecord {
  detected_at: string;
  ip: string;
  path: string;
  method: string;
  user_agent: string;
  cf_ray: string;
  asn: number | null;
  country: string | null;
}

interface IOCEntry {
  type: 'ip';
  value: string;
  asn: number | null;
  country: string | null;
  first_seen: string;
  last_seen: string;
  hits: number;
  paths: string[];
  tags: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface IOCExport {
  version: number;
  generated_at: string;
  source: string;
  window_hours: number;
  total_iocs: number;
  iocs: IOCEntry[];
  policy: {
    description: string;
    license: string;
    contact: string;
  };
}

/**
 * Aggregate raw honeypot hit records into IOC entries keyed by IP.
 * Pure transform; testable.
 */
export function aggregateIocs(hits: HoneypotHitRecord[], windowHours: number): IOCEntry[] {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  const grouped = new Map<string, HoneypotHitRecord[]>();

  for (const hit of hits) {
    const ts = Date.parse(hit.detected_at);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    if (!hit.ip || hit.ip === 'anonymous') continue;
    const existing = grouped.get(hit.ip);
    if (existing) existing.push(hit);
    else grouped.set(hit.ip, [hit]);
  }

  const iocs: IOCEntry[] = [];
  for (const [ip, group] of grouped) {
    const sorted = group.slice().sort((a, b) => a.detected_at.localeCompare(b.detected_at));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const paths = Array.from(new Set(group.map((h) => h.path))).slice(0, 10);
    const tags: string[] = ['honeypot'];
    for (const p of paths) {
      if (p.includes('wp-')) tags.push('scanner:wordpress');
      if (p === '/.env' || p.startsWith('/.env')) tags.push('scanner:env-leak');
      if (p.includes('/admin') || p.includes('/phpmyadmin')) tags.push('scanner:admin-brute');
      if (p.includes('/.git') || p.includes('/.aws') || p.includes('/.ssh')) tags.push('scanner:secrets');
      if (p.includes('.php') || p.includes('cgi-bin')) tags.push('scanner:legacy-php');
    }
    // Confidence: more hits + more distinct paths = higher confidence.
    let confidence: IOCEntry['confidence'] = 'low';
    if (group.length >= 5 || paths.length >= 3) confidence = 'medium';
    if (group.length >= 20 || paths.length >= 5) confidence = 'high';
    iocs.push({
      type: 'ip',
      value: ip,
      asn: first.asn,
      country: first.country,
      first_seen: first.detected_at,
      last_seen: last.detected_at,
      hits: group.length,
      paths,
      tags: Array.from(new Set(tags)),
      confidence,
    });
  }
  // Sort by recency (last_seen desc) then by hits desc.
  iocs.sort((a, b) => {
    const dt = b.last_seen.localeCompare(a.last_seen);
    return dt !== 0 ? dt : b.hits - a.hits;
  });
  return iocs.slice(0, MAX_IOCS_PER_RESPONSE);
}

/**
 * Load honeypot hits from KV by walking the index. We bound to the most
 * recent 2000 entries so an attacker spamming the trap cannot blow up
 * read cost.
 */
async function loadRecentHits(env: Env): Promise<HoneypotHitRecord[]> {
  let index: string[] = [];
  try {
    const raw = await env.TENSORFEED_CACHE.get(HITS_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) index = parsed.filter((v) => typeof v === 'string');
    }
  } catch {
    return [];
  }
  const recent = index.slice(-2000);
  const hits: HoneypotHitRecord[] = [];
  // Cap parallelism to avoid hammering KV.
  const batchSize = 25;
  for (let i = 0; i < recent.length; i += batchSize) {
    const batch = recent.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const raw = await env.TENSORFEED_CACHE.get(`${HITS_PREFIX}${id}`);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed as HoneypotHitRecord;
        } catch {
          // ignore individual failures
        }
        return null;
      }),
    );
    for (const r of results) {
      if (r) hits.push(r);
    }
  }
  return hits;
}

/**
 * GET /api/security/iocs.json handler. Returns a structured IOC export
 * suitable for ingestion by any downstream defender. Cached at the
 * Cloudflare edge for 5 minutes.
 */
export async function handleIocExport(env: Env): Promise<Response> {
  const hits = await loadRecentHits(env);
  const iocs = aggregateIocs(hits, RECENT_WINDOW_HOURS);

  const payload: IOCExport = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: 'https://tensorfeed.ai/api/security/iocs.json',
    window_hours: RECENT_WINDOW_HOURS,
    total_iocs: iocs.length,
    iocs,
    policy: {
      description:
        'Indicators of compromise observed by TensorFeed honeypot endpoints over the last 30 days. Free, public, machine-readable. Downstream defenders may ingest and pre-block at their own edge. Not a threat-intel re-export; only what we directly observed against our own perimeter.',
      license: 'CC0',
      contact: 'security@tensorfeed.ai',
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
      'access-control-allow-origin': '*',
      'x-tensorfeed-iocs-version': '1',
    },
  });
}
