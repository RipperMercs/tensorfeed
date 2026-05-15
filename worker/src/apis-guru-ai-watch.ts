import type { Env } from './types';

/**
 * APIs.guru AI-relevant API watch.
 *
 * APIs.guru (https://apis.guru) maintains an open-source directory of
 * 2400+ public APIs in OpenAPI/Swagger format. We pull their canonical
 * list, filter to AI-relevant entries via curated keyword matching on
 * provider + title + description, and republish a compact agent-readable
 * snapshot at /api/premium/apis-guru/ai-feed.
 *
 * The defensible angle is the diff: when an AI-relevant API first
 * appears in APIs.guru, we record `first_seen_at` against our daily
 * snapshot history. Agents asking "what new AI APIs appeared in the
 * last 7 days" can't get that from APIs.guru's static list directly,
 * only from a service that has been polling it. That's the moat.
 *
 * Per-entry fields:
 *   - provider           (e.g. "openai.com")
 *   - title              (e.g. "OpenAI API")
 *   - description        (truncated to 280 chars)
 *   - openapi_url        (URL to the OpenAPI spec)
 *   - service_url        (the API base URL when present)
 *   - logo_url           (when present in the entry)
 *   - first_seen_at      (when this api_id first appeared in our snapshots)
 *   - latest_updated_at  (upstream `updated` field)
 *   - matched_keywords
 *   - newly_added_last_7d (boolean)
 *
 * Snapshot also includes by_provider counts + a separate
 * `newly_added_last_7d` array for agents that only want the diff.
 *
 * License: CC-BY-SA 4.0 (APIs.guru). Attribution preserved on every
 * response.
 *
 * Refresh cadence: daily. Two KV reads + 1 KV write per refresh
 * (read current snapshot to preserve first_seen_at history, read
 * the upstream list, write the new snapshot).
 */

import { AI_RELEVANCE_KEYWORDS } from './ai-supply-chain-iocs';

const APIS_GURU_LIST_URL = 'https://api.apis.guru/v2/list.json';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 30_000;

const CURRENT_KEY = 'apis-guru-ai:current';

// API-specific keyword extensions on top of the shared AI list.
// Provider-domain heuristics catch entries where the package-name
// match doesn't fire but the domain or category clearly does.
const API_KEYWORD_EXTENSIONS: ReadonlyArray<string> = [
  // model provider domains
  'replicate',
  'together.ai',
  'fireworks.ai',
  'groq',
  'perplexity',
  'deepseek',
  'inflection',
  'ai21',
  'aleph alpha',
  'stability.ai',
  // service categories
  'speech-to-text',
  'text-to-speech',
  'image generation',
  'machine learning',
  'natural language',
  'sentiment analysis',
  'computer vision',
  // generic but specific enough to keep noise low
  'gpt',
  'transformer',
  'inference',
];

// Combined keyword list used by this watch only. The shared
// AI_RELEVANCE_KEYWORDS list stays untouched so the GHSA + IOC feeds
// keep their package-name-tuned matching.
const COMBINED_KEYWORDS: ReadonlyArray<string> = [
  ...AI_RELEVANCE_KEYWORDS,
  ...API_KEYWORD_EXTENSIONS,
];

// ── APIs.guru API shape ────────────────────────────────────────────

interface ApisGuruVersion {
  added?: string;
  updated?: string;
  swaggerUrl?: string;
  swaggerYamlUrl?: string;
  openapiVer?: string;
  info?: {
    title?: string;
    description?: string;
    'x-providerName'?: string;
    'x-serviceName'?: string;
    'x-logo'?: { url?: string };
    contact?: { email?: string; url?: string; name?: string };
    license?: { name?: string };
  };
  externalDocs?: { url?: string };
}

interface ApisGuruEntry {
  added?: string;
  preferred?: string;
  versions?: Record<string, ApisGuruVersion>;
}

type ApisGuruList = Record<string, ApisGuruEntry>;

// ── Public types ───────────────────────────────────────────────────

export interface AIApiEntry {
  api_id: string;                  // APIs.guru key, e.g. "openai.com" or "amazonaws.com:bedrock"
  provider: string;
  title: string;
  description: string;
  preferred_version: string | null;
  openapi_url: string | null;
  service_url: string | null;
  logo_url: string | null;
  first_seen_at: string;          // From our snapshot history
  latest_added_at: string | null; // APIs.guru `added`
  latest_updated_at: string | null; // APIs.guru `updated`
  matched_keywords: string[];
  newly_added_last_7d: boolean;
}

export interface AIApiWatchSnapshot {
  generated_at: string;
  total: number;
  by_provider: Record<string, number>;
  newly_added_last_7d: AIApiEntry[];
  entries: AIApiEntry[];
  source: {
    name: string;
    url: string;
    license: string;
  };
  posture: string;
}

// ── Matcher ────────────────────────────────────────────────────────

function matchAiApi(
  apiId: string,
  title: string,
  description: string,
  provider: string,
): string[] {
  const haystack = `${apiId} ${provider} ${title} ${description}`.toLowerCase();
  const hits: string[] = [];
  for (const keyword of COMBINED_KEYWORDS) {
    if (haystack.includes(keyword)) hits.push(keyword.trim());
  }
  return hits;
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

function withinDaysOf(iso: string | null, days: number, now: number = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= days * 86400_000;
}

// ── Fetch + build snapshot ─────────────────────────────────────────

async function fetchApisGuruList(): Promise<ApisGuruList> {
  const res = await fetch(APIS_GURU_LIST_URL, {
    headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`apis.guru list fetch failed: HTTP ${res.status}`);
  }
  return (await res.json()) as ApisGuruList;
}

export function buildAIApiSnapshot(
  list: ApisGuruList,
  firstSeenHistory: Map<string, string>,
  now: Date = new Date(),
): AIApiWatchSnapshot {
  const entries: AIApiEntry[] = [];
  const byProvider: Record<string, number> = {};
  const nowMs = now.getTime();

  for (const [apiId, entry] of Object.entries(list)) {
    if (!entry?.versions) continue;
    const preferredKey = entry.preferred && entry.versions[entry.preferred]
      ? entry.preferred
      : Object.keys(entry.versions)[0];
    if (!preferredKey) continue;
    const ver = entry.versions[preferredKey];
    if (!ver?.info) continue;

    const provider = ver.info['x-providerName'] ?? apiId.split(':')[0] ?? apiId;
    const title = ver.info.title ?? apiId;
    const description = ver.info.description ?? '';
    const matched = matchAiApi(apiId, title, description, provider);
    if (matched.length === 0) continue;

    // first_seen_at: preserve from prior snapshot, else use the upstream
    // `added` field for this entry, else fall back to now (first time
    // we ever ingested apis.guru).
    const firstSeenAt = firstSeenHistory.get(apiId)
      ?? entry.added
      ?? ver.added
      ?? now.toISOString();

    const newlyAdded = withinDaysOf(firstSeenAt, 7, nowMs);

    entries.push({
      api_id: apiId,
      provider,
      title: truncate(title, 200),
      description: truncate(description, 280),
      preferred_version: preferredKey ?? null,
      openapi_url: ver.swaggerUrl ?? null,
      service_url: ver.externalDocs?.url ?? null,
      logo_url: ver.info['x-logo']?.url ?? null,
      first_seen_at: firstSeenAt,
      latest_added_at: ver.added ?? entry.added ?? null,
      latest_updated_at: ver.updated ?? null,
      matched_keywords: matched,
      newly_added_last_7d: newlyAdded,
    });

    byProvider[provider] = (byProvider[provider] ?? 0) + 1;
  }

  // Newest first by first_seen_at.
  entries.sort((a, b) =>
    (a.first_seen_at < b.first_seen_at ? 1 : -1),
  );

  return {
    generated_at: now.toISOString(),
    total: entries.length,
    by_provider: byProvider,
    newly_added_last_7d: entries.filter(e => e.newly_added_last_7d),
    entries,
    source: {
      name: 'APIs.guru',
      url: 'https://apis.guru',
      license: 'CC-BY-SA 4.0. Attribution preserved on every response. TF filters and re-shapes the upstream list; the primary source is authoritative.',
    },
    posture:
      'TensorFeed filters the open APIs.guru directory for AI-relevant entries using a curated keyword list and records first_seen_at against our daily snapshot history. We do not host the OpenAPI specs themselves; openapi_url points to the primary source.',
  };
}

// ── Refresh + read API ─────────────────────────────────────────────

export async function refreshApisGuruAIWatch(env: Env): Promise<AIApiWatchSnapshot> {
  // Read prior snapshot first so we can preserve first_seen_at history.
  // If there is no prior snapshot, every entry's first_seen_at falls
  // back to its upstream `added` field, which still gives us reasonable
  // history for diffing.
  const prior = await getApisGuruAIWatch(env);
  const firstSeenHistory = new Map<string, string>();
  if (prior) {
    for (const e of prior.entries) {
      firstSeenHistory.set(e.api_id, e.first_seen_at);
    }
  }

  const list = await fetchApisGuruList();
  const snapshot = buildAIApiSnapshot(list, firstSeenHistory);

  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot), {
    expirationTtl: 60 * 60 * 24 * 14,
  });
  return snapshot;
}

export async function getApisGuruAIWatch(env: Env): Promise<AIApiWatchSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIApiWatchSnapshot;
  } catch {
    return null;
  }
}
