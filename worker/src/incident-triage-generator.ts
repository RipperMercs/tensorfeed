/**
 * Status-incident Haiku triage generator.
 *
 * Second Haiku 4.5 integration in the worker (after action-cards-
 * generator.ts). For each currently-open or recently-resolved AI
 * provider status incident, produces a structured agent-action card:
 *
 *   - triage_summary           1-2 sentences for an agent operator
 *   - impact_classification    informational / minor / major / critical
 *   - affected_capabilities    string[] from a curated set
 *   - recommended_action       no_action / monitor / retry_later /
 *                              failover_now / escalate
 *
 * Why this matters: when Anthropic or OpenAI degrades, the most
 * valuable response is "is this affecting MY workload and what should
 * I do." Raw status-page text doesn't answer that. Haiku does.
 *
 * Cadence: every 2 hours at :15 UTC. Per-incident cache (24h TTL) keyed
 * by incident_id so the same incident isn't re-triaged across runs.
 * Steady-state Haiku cost is near-zero (most calls cache hit).
 *
 * Powers:
 *   /api/status/incidents/triage                   (free, capped 25)
 *   /api/premium/status/incidents/triage (1 credit) (full + filters)
 *
 * Uses existing PROBE_ANTHROPIC_KEY secret (same as action-cards).
 */

import type { Env } from './types';
import type { Incident } from './status';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';
const FETCH_TIMEOUT_MS = 15_000;
const PARALLEL_BATCH = 10;
/** Include resolved incidents up to this many hours back (post-mortem value). */
const RESOLVED_LOOKBACK_HOURS = 24;
const PROCESS_LIMIT = 30;

export const INCIDENT_TRIAGE_CURRENT_KEY = 'incident-triage:current';
export const INCIDENT_TRIAGE_INDEX_KEY = 'incident-triage:index';
export const INCIDENT_TRIAGE_DAILY_KEY_PREFIX = 'incident-triage:daily:';
export const INCIDENT_TRIAGE_BY_ID_PREFIX = 'incident-triage:by-id:';
const PER_INCIDENT_TTL_SECONDS = 24 * 60 * 60;

interface AnthropicEnvKey {
  PROBE_ANTHROPIC_KEY?: string;
}

// ── Card schema ────────────────────────────────────────────────────

export type ImpactClassification = 'informational' | 'minor' | 'major' | 'critical';
export type RecommendedAction = 'no_action' | 'monitor' | 'retry_later' | 'failover_now' | 'escalate';
export type AffectedCapability =
  | 'inference'
  | 'training'
  | 'embeddings'
  | 'console'
  | 'billing'
  | 'fine-tuning'
  | 'api-keys'
  | 'tooling';

const IMPACT_LEVELS: ReadonlySet<ImpactClassification> = new Set(['informational', 'minor', 'major', 'critical']);
const RECOMMENDED_ACTIONS: ReadonlySet<RecommendedAction> = new Set(['no_action', 'monitor', 'retry_later', 'failover_now', 'escalate']);
const AFFECTED_CAPABILITIES: ReadonlySet<AffectedCapability> = new Set([
  'inference', 'training', 'embeddings', 'console', 'billing', 'fine-tuning', 'api-keys', 'tooling',
]);

export interface IncidentTriageCard {
  incident_id: string;
  provider: string;
  service: string;
  title: string;
  severity: string;
  started_at: string;
  resolved_at: string | null;
  ongoing: boolean;
  triage_summary: string;
  impact_classification: ImpactClassification;
  affected_capabilities: AffectedCapability[];
  recommended_action: RecommendedAction;
  generated_at: string;
}

export interface IncidentTriageSnapshot {
  capturedAt: string;
  source: 'tensorfeed.ai status incidents + Claude Haiku 4.5';
  model: typeof ANTHROPIC_MODEL;
  incidents_considered: number;
  incidents_succeeded: number;
  incidents_failed: number;
  ongoing_count: number;
  resolved_count: number;
  cards: IncidentTriageCard[];
}

// ── Prompt + parsing ───────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You produce structured "incident triage cards" for AI agents reading TensorFeed\'s AI provider status feed. ' +
  'Given one provider incident, output a single JSON object with these fields exactly:\n' +
  '  triage_summary           : string, 1-2 sentences, plain text. What an AI agent or operator should KNOW about this incident (e.g. "OpenAI API experiencing 5% elevated latency for ChatGPT and GPT-4 Turbo; no current impact on Assistants API").\n' +
  '  impact_classification    : one of informational | minor | major | critical\n' +
  '  affected_capabilities    : array of strings from the set: inference | training | embeddings | console | billing | fine-tuning | api-keys | tooling. If unclear from the incident text, return ["inference"] as a conservative default.\n' +
  '  recommended_action       : one of no_action | monitor | retry_later | failover_now | escalate\n\n' +
  'Classification guidance:\n' +
  '- informational: scheduled maintenance, marketing/feature posts, resolved-not-affecting events. → no_action\n' +
  '- minor: degraded performance on a single capability, narrow region. → monitor\n' +
  '- major: full outage on one capability OR partial outage across many. → retry_later or failover_now\n' +
  '- critical: complete API outage affecting agent traffic. → failover_now or escalate\n\n' +
  'Rules:\n' +
  '- Output ONLY the JSON object. No prose, no markdown fences.\n' +
  '- Use lowercase exactly as listed.\n' +
  '- affected_capabilities must be a JSON array even if 1 element.\n' +
  '- Be conservative: when in doubt, prefer the lower-severity classification.';

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

function buildUserPrompt(incident: Incident): string {
  return [
    `PROVIDER: ${incident.provider}`,
    `SERVICE: ${incident.service}`,
    `TITLE: ${incident.title}`,
    `SEVERITY: ${incident.severity}`,
    `STARTED: ${incident.startedAt}`,
    `RESOLVED: ${incident.resolvedAt ?? '(ongoing)'}`,
    incident.durationMinutes !== null ? `DURATION_MINUTES: ${incident.durationMinutes}` : '',
  ].filter(Boolean).join('\n');
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

interface RawTriage {
  triage_summary?: unknown;
  impact_classification?: unknown;
  affected_capabilities?: unknown;
  recommended_action?: unknown;
}

/**
 * Validate + coerce the Haiku JSON response into a strict
 * IncidentTriageCard. Returns null on any validation failure.
 * Exported for unit testing.
 */
export function parseTriageJson(raw: string, incident: Incident, generated_at: string): IncidentTriageCard | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  let parsed: RawTriage;
  try {
    parsed = JSON.parse(cleaned) as RawTriage;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const summary = typeof parsed.triage_summary === 'string' ? parsed.triage_summary.trim() : '';
  if (!summary) return null;

  const impact = typeof parsed.impact_classification === 'string' ? parsed.impact_classification.toLowerCase().trim() : '';
  if (!IMPACT_LEVELS.has(impact as ImpactClassification)) return null;

  const action = typeof parsed.recommended_action === 'string' ? parsed.recommended_action.toLowerCase().trim() : '';
  if (!RECOMMENDED_ACTIONS.has(action as RecommendedAction)) return null;

  let capabilities: AffectedCapability[] = [];
  if (Array.isArray(parsed.affected_capabilities)) {
    capabilities = parsed.affected_capabilities
      .filter((c): c is string => typeof c === 'string')
      .map((c) => c.toLowerCase().trim())
      .filter((c): c is AffectedCapability => AFFECTED_CAPABILITIES.has(c as AffectedCapability));
  }
  // Per system-prompt: default to ['inference'] when unparseable. Strict-
  // enum filtering above means we never invent capabilities Haiku didn't
  // emit, but we do recover from a malformed array.
  if (capabilities.length === 0) capabilities = ['inference'];

  return {
    incident_id: incident.id,
    provider: incident.provider,
    service: incident.service,
    title: incident.title,
    severity: incident.severity,
    started_at: incident.startedAt,
    resolved_at: incident.resolvedAt,
    ongoing: incident.resolvedAt === null,
    triage_summary: summary,
    impact_classification: impact as ImpactClassification,
    affected_capabilities: capabilities,
    recommended_action: action as RecommendedAction,
    generated_at,
  };
}

async function callHaikuForIncident(incident: Incident, apiKey: string, generated_at: string): Promise<IncidentTriageCard | null> {
  try {
    const res = await fetchWithTimeout(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 350,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(incident) }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AnthropicResponse;
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) return null;
    return parseTriageJson(text, incident, generated_at);
  } catch {
    return null;
  }
}

// ── Per-incident cache ─────────────────────────────────────────────

async function readCachedTriage(env: Env, incidentId: string): Promise<IncidentTriageCard | null> {
  return (await env.TENSORFEED_CACHE.get(`${INCIDENT_TRIAGE_BY_ID_PREFIX}${incidentId}`, 'json')) as IncidentTriageCard | null;
}

async function writeCachedTriage(env: Env, card: IncidentTriageCard): Promise<void> {
  await env.TENSORFEED_CACHE.put(
    `${INCIDENT_TRIAGE_BY_ID_PREFIX}${card.incident_id}`,
    JSON.stringify(card),
    { expirationTtl: PER_INCIDENT_TTL_SECONDS },
  );
}

// ── Selection: incidents worth triaging ────────────────────────────

/**
 * Pick incidents currently worth Haiku-triaging: ongoing OR resolved
 * within the lookback window. Exported for unit testing.
 */
export function selectTriageableIncidents(
  incidents: ReadonlyArray<Incident>,
  now: Date,
  lookbackHours = RESOLVED_LOOKBACK_HOURS,
  limit = PROCESS_LIMIT,
): Incident[] {
  const cutoffMs = now.getTime() - lookbackHours * 60 * 60 * 1000;
  const candidates = incidents.filter((inc) => {
    if (inc.resolvedAt === null) return true;
    const resolvedMs = new Date(inc.resolvedAt).getTime();
    return Number.isFinite(resolvedMs) && resolvedMs >= cutoffMs;
  });
  // Sort: ongoing first, then most-recent-started among resolved.
  candidates.sort((a, b) => {
    if (a.resolvedAt === null && b.resolvedAt !== null) return -1;
    if (a.resolvedAt !== null && b.resolvedAt === null) return 1;
    return (b.startedAt || '').localeCompare(a.startedAt || '');
  });
  return candidates.slice(0, limit);
}

// ── Top-level generator ────────────────────────────────────────────

export async function refreshIncidentTriage(env: Env): Promise<IncidentTriageSnapshot | null> {
  const apiKey = (env as Env & AnthropicEnvKey).PROBE_ANTHROPIC_KEY;
  if (!apiKey) {
    console.warn('refreshIncidentTriage skipped: PROBE_ANTHROPIC_KEY not set');
    return null;
  }

  const incidents = (await env.TENSORFEED_STATUS.get('incidents', 'json')) as Incident[] | null;
  if (!incidents || incidents.length === 0) {
    // No incidents to triage — write an empty snapshot so the endpoint
    // returns a successful "all clear" rather than 503.
    const snapshot: IncidentTriageSnapshot = {
      capturedAt: new Date().toISOString(),
      source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
      model: ANTHROPIC_MODEL,
      incidents_considered: 0,
      incidents_succeeded: 0,
      incidents_failed: 0,
      ongoing_count: 0,
      resolved_count: 0,
      cards: [],
    };
    await env.TENSORFEED_CACHE.put(INCIDENT_TRIAGE_CURRENT_KEY, JSON.stringify(snapshot));
    return snapshot;
  }

  const now = new Date();
  const slice = selectTriageableIncidents(incidents, now);
  const generated_at = now.toISOString();
  const cards: IncidentTriageCard[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < slice.length; i += PARALLEL_BATCH) {
    const batch = slice.slice(i, i + PARALLEL_BATCH);
    const results = await Promise.all(
      batch.map(async (incident) => {
        const cached = await readCachedTriage(env, incident.id);
        if (cached) {
          // Refresh the resolved_at / ongoing flag in case the incident
          // resolved since we last cached. Other Haiku-derived fields
          // remain stable.
          return {
            ...cached,
            resolved_at: incident.resolvedAt,
            ongoing: incident.resolvedAt === null,
            severity: incident.severity,
          };
        }
        const card = await callHaikuForIncident(incident, apiKey, generated_at);
        if (card) await writeCachedTriage(env, card);
        return card;
      }),
    );
    for (const c of results) {
      if (c) {
        cards.push(c);
        succeeded++;
      } else {
        failed++;
      }
    }
  }

  const ongoing_count = cards.filter((c) => c.ongoing).length;
  const resolved_count = cards.length - ongoing_count;

  const snapshot: IncidentTriageSnapshot = {
    capturedAt: generated_at,
    source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
    model: ANTHROPIC_MODEL,
    incidents_considered: slice.length,
    incidents_succeeded: succeeded,
    incidents_failed: failed,
    ongoing_count,
    resolved_count,
    cards,
  };

  const dateKey = generated_at.slice(0, 10);
  await env.TENSORFEED_CACHE.put(INCIDENT_TRIAGE_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${INCIDENT_TRIAGE_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  const idxRaw = (await env.TENSORFEED_CACHE.get(INCIDENT_TRIAGE_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(INCIDENT_TRIAGE_INDEX_KEY, JSON.stringify(dates.slice(-90)));
  }

  return snapshot;
}

export async function getIncidentTriageSnapshot(env: Env): Promise<IncidentTriageSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(INCIDENT_TRIAGE_CURRENT_KEY, 'json')) as IncidentTriageSnapshot | null;
}
