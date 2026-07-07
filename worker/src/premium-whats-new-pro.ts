/**
 * Pro-tier whats-new derivation.
 *
 * Layers Haiku 4.5 generated analyst synthesis on top of the existing
 * computeWhatsNew base payload. The differentiator vs base whats-new is
 * verifiable per-field citations: every claim in the analyst summary,
 * key takeaways, and recommended actions cites back to a stable ID
 * assigned server-side BEFORE Haiku sees the data. Citations that don't
 * resolve are rejected at validation, so the agent never sees a
 * hallucinated reference.
 *
 * Pricing: 10 credits ($0.20) vs base whats-new at 1 credit ($0.02).
 * Margin economics:
 *   - Haiku cost per uncached call ~$0.0105 (3K input + 1.5K output)
 *   - Cache hit rate target: 85%+ (cache key includes base-data hash)
 *   - Cached call cost ~$0.0000005 KV read
 *
 * Pattern: Parallel.ai-style tier ladder. Same product, deeper output,
 * higher price. The Pro tier moat is structural verifiability, not vibes.
 *
 * Engine-fit per [[feedback_engine_fit_extract_verbatim]] is not directly
 * applicable here (this is synthesis, not extraction), but the same
 * principle that protects against model drift applies: strict structural
 * validation on every Haiku output before serving.
 *
 * Uses existing PROBE_ANTHROPIC_KEY secret (same as incident-triage and
 * news-action-cards generators).
 */

import type { Env } from './types';
import { computeWhatsNew, type WhatsNewResult, type WhatsNewError, type WhatsNewOptions } from './whats-new';

// ─── Configuration ──────────────────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';
const FETCH_TIMEOUT_MS = 20_000;
const HAIKU_MAX_TOKENS = 2000;

/** Cache key prefix for Pro layer responses. */
export const PRO_CACHE_KEY_PREFIX = 'whats-new-pro:';
/** Cache TTL: 6 hours. Base whats-new refreshes intra-day; including the
 * base-data hash in the cache key means a fresh base auto-invalidates. */
const PRO_CACHE_TTL_S = 6 * 60 * 60;

// ─── Enum types ─────────────────────────────────────────────────────

export type AgentClass =
  | 'inference-bound'
  | 'training-bound'
  | 'security-watchful'
  | 'cost-bound'
  | 'compliance-watchful';

export type Priority = 'no_action' | 'monitor' | 'act_now' | 'escalate';

const VALID_AGENT_CLASSES: ReadonlySet<string> = new Set([
  'inference-bound', 'training-bound', 'security-watchful', 'cost-bound', 'compliance-watchful',
]);
const VALID_PRIORITIES: ReadonlySet<string> = new Set([
  'no_action', 'monitor', 'act_now', 'escalate',
]);

// ─── Shape types ────────────────────────────────────────────────────

export interface KeyTakeaway {
  claim: string;
  basis: string[];      // every entry must match an ID in data_ids
  confidence: number;   // [0, 1]
}

export interface RecommendedAction {
  for: AgentClass;
  action: string;
  priority: Priority;
  basis: string[];
}

export interface DataIds {
  pricing_changes: Record<string, string>;     // c1 -> "model_name|field"
  new_models: Record<string, string>;          // m1 -> "model_name"
  removed_models: Record<string, string>;      // r1 -> "model_name"
  incidents: Record<string, string>;           // i1 -> "incident_summary"
  news: Record<string, string>;                // n1 -> "news_url"
}

export interface ProBlock {
  generated_by: string;
  generated_at: string;
  analyst_summary: string;
  key_takeaways: KeyTakeaway[];
  recommended_actions: RecommendedAction[];
}

export interface WhatsNewProResult extends WhatsNewResult {
  tier: 'pro';
  data_ids: DataIds;
  pro: ProBlock;
}

export interface WhatsNewProError {
  ok: false;
  error: string;
  hint?: string;
}

// ─── Em-dash / double-hyphen guard (TF rule) ────────────────────────

const EM_DASH = '—';

function hasForbiddenChars(s: string): boolean {
  return s.includes(EM_DASH) || s.includes('--');
}

// ─── Data-ID assignment ─────────────────────────────────────────────

/**
 * Assign stable short IDs to every data row in the base payload. IDs are
 * derived by position so the same base data always gets the same IDs
 * (deterministic for caching). Exported for unit testing.
 */
export function assignDataIds(base: WhatsNewResult): DataIds {
  const ids: DataIds = {
    pricing_changes: {},
    new_models: {},
    removed_models: {},
    incidents: {},
    news: {},
  };
  base.pricing.changes.forEach((c, i) => {
    ids.pricing_changes[`c${i + 1}`] = `${c.model}|${c.provider}|${c.field}`;
  });
  base.pricing.new_models.forEach((m, i) => {
    ids.new_models[`m${i + 1}`] = `${m.model}|${m.provider}`;
  });
  base.pricing.removed_models.forEach((m, i) => {
    ids.removed_models[`r${i + 1}`] = `${m.model}|${m.provider}`;
  });
  base.status.incidents.forEach((inc, i) => {
    ids.incidents[`i${i + 1}`] = `${inc.provider}|${inc.title}|${inc.started_at}`;
  });
  base.news.forEach((n, i) => {
    ids.news[`n${i + 1}`] = n.url;
  });
  return ids;
}

/** Flat set of all valid IDs in a DataIds. Used in validation. */
function allIds(dataIds: DataIds): Set<string> {
  const s = new Set<string>();
  Object.keys(dataIds.pricing_changes).forEach((k) => s.add(k));
  Object.keys(dataIds.new_models).forEach((k) => s.add(k));
  Object.keys(dataIds.removed_models).forEach((k) => s.add(k));
  Object.keys(dataIds.incidents).forEach((k) => s.add(k));
  Object.keys(dataIds.news).forEach((k) => s.add(k));
  return s;
}

// ─── Cache key derivation ───────────────────────────────────────────

/**
 * Derive a deterministic cache key from window + base data. Exported
 * for unit testing. Uses Web Crypto SHA-256 (available in Workers).
 */
export async function deriveCacheKey(
  window: { from: string; to: string; minutes?: number },
  newsLimit: number,
  base: WhatsNewResult,
): Promise<string> {
  // Window hash: from + to + minutes + newsLimit
  const windowStr = `${window.from}|${window.to}|${window.minutes ?? ''}|${newsLimit}`;
  // Base hash: stable serialization of the data-bearing fields
  const baseStr = JSON.stringify({
    pricing: base.pricing,
    status_incidents: base.status.incidents,
    news_urls: base.news.map((n) => n.url),
  });
  const combined = `${windowStr}::${baseStr}`;
  const buf = new TextEncoder().encode(combined);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${PRO_CACHE_KEY_PREFIX}${hex.slice(0, 32)}`;
}

// ─── Prompt construction ────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You produce structured analyst synthesis over TensorFeed\'s 24-hour AI ecosystem brief for AI agents. ' +
  'Given a base payload of pricing changes, new and removed models, status incidents, and news headlines, ' +
  'plus a data_ids block mapping short IDs (c1, c2, m1, i1, n1, ...) to specific rows, output a single JSON object with these fields exactly:\n' +
  '  analyst_summary       : string, 200-1500 chars, plain text. 1-3 paragraph narrative covering the most consequential events in the window.\n' +
  '  key_takeaways         : array of 2-5 objects. Each object: { claim, basis, confidence }.\n' +
  '    claim       : string, 10-300 chars, a specific assertion (not a question).\n' +
  '    basis       : array of 1-5 strings. Each MUST be one of the IDs in data_ids.\n' +
  '    confidence  : number in [0, 1]. Use >=0.9 for direct factual claims, 0.7-0.9 for synthesis, <0.7 for trend extrapolation.\n' +
  '  recommended_actions   : array of 1-3 objects. Each object: { for, action, priority, basis }.\n' +
  '    for         : exactly one of: inference-bound | training-bound | security-watchful | cost-bound | compliance-watchful\n' +
  '    action      : string, 10-300 chars, an actionable directive.\n' +
  '    priority    : one of: no_action | monitor | act_now | escalate\n' +
  '    basis       : array of 0-5 strings (may be empty for no_action items). Each must be one of the IDs in data_ids.\n\n' +
  'CRITICAL RULES:\n' +
  '- Output ONLY the JSON object. No prose, no markdown fences, no commentary.\n' +
  '- DO NOT use em dashes (the U+2014 character). DO NOT use double hyphens (--). Use commas, colons, periods, or rewrite the sentence. This is a hard rule and your output will be rejected if violated.\n' +
  '- Every basis entry MUST be one of the IDs in data_ids. Never cite by URL, source name, or description. If you cannot cite a specific ID for a claim, do NOT make the claim.\n' +
  '- Be specific. "Pricing changed" is bad; "Anthropic cut Claude Opus 4.7 input pricing by 7%" is good.\n' +
  '- If the window is quiet (few or no events), produce a shorter analyst_summary and fewer takeaways. Do not pad.';

/** Build the user prompt by inlining the base payload + data_ids map. */
export function buildUserPrompt(base: WhatsNewResult, dataIds: DataIds): string {
  const parts: string[] = [];
  parts.push(`WINDOW: ${base.window.from} to ${base.window.to} (${base.window.days} days)`);
  parts.push(`COMPUTED_AT: ${base.computed_at}`);
  parts.push('');

  if (base.pricing.changes.length > 0) {
    parts.push('PRICING_CHANGES:');
    base.pricing.changes.forEach((c, i) => {
      const id = `c${i + 1}`;
      parts.push(`  ${id}: ${c.model} (${c.provider}) ${c.field} ${c.from} -> ${c.to} (${c.delta_pct ?? 'n/a'}%)`);
    });
    parts.push('');
  }
  if (base.pricing.new_models.length > 0) {
    parts.push('NEW_MODELS:');
    base.pricing.new_models.forEach((m, i) => {
      const id = `m${i + 1}`;
      parts.push(`  ${id}: ${m.model} (${m.provider}) input=${m.input_per_1m} output=${m.output_per_1m} tier=${m.tier ?? 'n/a'}`);
    });
    parts.push('');
  }
  if (base.pricing.removed_models.length > 0) {
    parts.push('REMOVED_MODELS:');
    base.pricing.removed_models.forEach((m, i) => {
      const id = `r${i + 1}`;
      parts.push(`  ${id}: ${m.model} (${m.provider})`);
    });
    parts.push('');
  }
  if (base.status.incidents.length > 0) {
    parts.push('STATUS_INCIDENTS:');
    base.status.incidents.forEach((inc, i) => {
      const id = `i${i + 1}`;
      const resolved = inc.resolved_at ? `resolved ${inc.resolved_at}` : 'ongoing';
      parts.push(`  ${id}: ${inc.provider} ${inc.service} severity=${inc.severity} ${resolved} | ${inc.title}`);
    });
    parts.push('');
  }
  if (base.news.length > 0) {
    parts.push('NEWS:');
    base.news.forEach((n, i) => {
      const id = `n${i + 1}`;
      parts.push(`  ${id}: ${n.source} | ${n.title}`);
    });
    parts.push('');
  }

  parts.push(`STATUS_SUMMARY: operational=${base.status.currently_operational} degraded=${base.status.currently_degraded} down=${base.status.currently_down} unknown=${base.status.currently_unknown}`);
  parts.push('');
  parts.push('Produce the JSON object now.');
  return parts.join('\n');
}

// ─── Validation ─────────────────────────────────────────────────────

interface RawProBlock {
  analyst_summary?: unknown;
  key_takeaways?: unknown;
  recommended_actions?: unknown;
}

export interface ProValidationOk {
  ok: true;
  block: ProBlock;
}
export interface ProValidationErr {
  ok: false;
  error: string;
  detail: string;
}
export type ProValidationResult = ProValidationOk | ProValidationErr;

function failPV(error: string, detail: string): ProValidationErr {
  return { ok: false, error, detail };
}

/**
 * Strict validator for the Haiku-emitted Pro block. Exported for testing.
 * The dataIds set comes from assignDataIds(base); every basis entry
 * must match one of those IDs.
 */
export function validateProBlock(raw: unknown, dataIds: DataIds): ProValidationResult {
  const validIds = allIds(dataIds);

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return failPV('bad_shape', 'pro block must be an object');
  }
  const r = raw as RawProBlock;

  // analyst_summary
  if (typeof r.analyst_summary !== 'string') return failPV('bad_summary', 'analyst_summary must be a string');
  const summary = r.analyst_summary.trim();
  if (summary.length < 100 || summary.length > 2000) {
    return failPV('bad_summary_length', `analyst_summary must be 100-2000 chars, got ${summary.length}`);
  }
  if (hasForbiddenChars(summary)) {
    return failPV('forbidden_chars', 'analyst_summary contains em dash or double hyphen');
  }

  // key_takeaways
  if (!Array.isArray(r.key_takeaways)) return failPV('bad_takeaways', 'key_takeaways must be an array');
  if (r.key_takeaways.length < 1 || r.key_takeaways.length > 5) {
    return failPV('bad_takeaways_count', `key_takeaways must have 1-5 entries, got ${r.key_takeaways.length}`);
  }
  const takeaways: KeyTakeaway[] = [];
  for (let i = 0; i < r.key_takeaways.length; i++) {
    const t = r.key_takeaways[i];
    if (!t || typeof t !== 'object') return failPV('bad_takeaway', `key_takeaways[${i}] must be an object`);
    const tt = t as { claim?: unknown; basis?: unknown; confidence?: unknown };
    if (typeof tt.claim !== 'string') return failPV('bad_takeaway', `key_takeaways[${i}].claim must be a string`);
    const claim = tt.claim.trim();
    if (claim.length < 10 || claim.length > 300) {
      return failPV('bad_takeaway', `key_takeaways[${i}].claim must be 10-300 chars`);
    }
    if (hasForbiddenChars(claim)) {
      return failPV('forbidden_chars', `key_takeaways[${i}].claim contains em dash or double hyphen`);
    }
    if (!Array.isArray(tt.basis)) return failPV('bad_takeaway', `key_takeaways[${i}].basis must be an array`);
    if (tt.basis.length < 1 || tt.basis.length > 5) {
      return failPV('bad_takeaway', `key_takeaways[${i}].basis must have 1-5 IDs`);
    }
    const basis: string[] = [];
    for (let j = 0; j < tt.basis.length; j++) {
      const id = tt.basis[j];
      if (typeof id !== 'string') return failPV('bad_takeaway', `key_takeaways[${i}].basis[${j}] must be a string`);
      if (!validIds.has(id)) {
        return failPV('unresolved_basis_id', `key_takeaways[${i}].basis[${j}]='${id}' is not in data_ids`);
      }
      basis.push(id);
    }
    if (typeof tt.confidence !== 'number' || !Number.isFinite(tt.confidence)) {
      return failPV('bad_takeaway', `key_takeaways[${i}].confidence must be a finite number`);
    }
    if (tt.confidence < 0 || tt.confidence > 1) {
      return failPV('bad_takeaway', `key_takeaways[${i}].confidence must be in [0, 1]`);
    }
    takeaways.push({ claim, basis, confidence: tt.confidence });
  }

  // recommended_actions
  if (!Array.isArray(r.recommended_actions)) return failPV('bad_actions', 'recommended_actions must be an array');
  if (r.recommended_actions.length < 1 || r.recommended_actions.length > 3) {
    return failPV('bad_actions_count', `recommended_actions must have 1-3 entries, got ${r.recommended_actions.length}`);
  }
  const actions: RecommendedAction[] = [];
  for (let i = 0; i < r.recommended_actions.length; i++) {
    const a = r.recommended_actions[i];
    if (!a || typeof a !== 'object') return failPV('bad_action', `recommended_actions[${i}] must be an object`);
    const aa = a as { for?: unknown; action?: unknown; priority?: unknown; basis?: unknown };
    if (typeof aa.for !== 'string' || !VALID_AGENT_CLASSES.has(aa.for)) {
      return failPV('bad_action', `recommended_actions[${i}].for must be one of: ${[...VALID_AGENT_CLASSES].join(', ')}`);
    }
    if (typeof aa.action !== 'string') return failPV('bad_action', `recommended_actions[${i}].action must be a string`);
    const action = aa.action.trim();
    if (action.length < 10 || action.length > 300) {
      return failPV('bad_action', `recommended_actions[${i}].action must be 10-300 chars`);
    }
    if (hasForbiddenChars(action)) {
      return failPV('forbidden_chars', `recommended_actions[${i}].action contains em dash or double hyphen`);
    }
    if (typeof aa.priority !== 'string' || !VALID_PRIORITIES.has(aa.priority)) {
      return failPV('bad_action', `recommended_actions[${i}].priority must be one of: ${[...VALID_PRIORITIES].join(', ')}`);
    }
    if (!Array.isArray(aa.basis)) return failPV('bad_action', `recommended_actions[${i}].basis must be an array`);
    if (aa.basis.length > 5) {
      return failPV('bad_action', `recommended_actions[${i}].basis must have at most 5 IDs`);
    }
    const basis: string[] = [];
    for (let j = 0; j < aa.basis.length; j++) {
      const id = aa.basis[j];
      if (typeof id !== 'string') return failPV('bad_action', `recommended_actions[${i}].basis[${j}] must be a string`);
      if (!validIds.has(id)) {
        return failPV('unresolved_basis_id', `recommended_actions[${i}].basis[${j}]='${id}' is not in data_ids`);
      }
      basis.push(id);
    }
    actions.push({ for: aa.for as AgentClass, action, priority: aa.priority as Priority, basis });
  }

  return {
    ok: true,
    block: {
      generated_by: ANTHROPIC_MODEL,
      generated_at: new Date().toISOString(),
      analyst_summary: summary,
      key_takeaways: takeaways,
      recommended_actions: actions,
    },
  };
}

// ─── Haiku call ──────────────────────────────────────────────────────

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
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

async function callHaiku(apiKey: string, userPrompt: string, strictRetry: boolean): Promise<string | null> {
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
        max_tokens: HAIKU_MAX_TOKENS,
        system: strictRetry
          ? SYSTEM_PROMPT + '\n\nYour previous response failed validation. Re-read the rules. Output ONLY the JSON object. Cite by exact IDs only. No em dashes. No double hyphens.'
          : SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AnthropicResponse;
    return body.content?.find((c) => c.type === 'text')?.text ?? null;
  } catch {
    return null;
  }
}

function stripFence(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
}

// ─── Orchestrator ───────────────────────────────────────────────────

interface AnthropicEnvKey {
  PROBE_ANTHROPIC_KEY?: string;
}

/**
 * Enrich a successful base whats-new result with the Haiku analyst layer.
 * Split out of computeWhatsNewPro so a caller that has already computed the
 * base (and, for the delta cursor loop, already decided the data is
 * unchanged) can skip the base recompute, and so an unchanged poll never
 * reaches this function at all. Returns WhatsNewProError on any failure mode
 * that should NOT charge the agent (synthesis failure, validation failure
 * twice, missing key).
 */
export async function enrichWhatsNewProFromBase(
  env: Env,
  base: WhatsNewResult,
  options: WhatsNewOptions = {},
): Promise<WhatsNewProResult | WhatsNewProError> {
  // 1. Assign data IDs
  const dataIds = assignDataIds(base);

  // 2. Cache check
  const cacheKey = await deriveCacheKey(base.window, options.newsLimit ?? 10, base);
  const cached = await env.TENSORFEED_CACHE.get(cacheKey, 'json') as ProBlock | null;
  if (cached) {
    return mergeProResponse(base, dataIds, cached);
  }

  // 3. Anthropic key check
  const apiKey = (env as AnthropicEnvKey).PROBE_ANTHROPIC_KEY;
  if (!apiKey) {
    return { ok: false, error: 'synthesis_unavailable', hint: 'PROBE_ANTHROPIC_KEY not configured' };
  }

  // 4. Haiku call + validation, with one retry on validation failure
  const userPrompt = buildUserPrompt(base, dataIds);
  let raw = await callHaiku(apiKey, userPrompt, false);
  if (!raw) {
    return { ok: false, error: 'synthesis_unavailable', hint: 'Haiku request failed' };
  }
  let v = validateProBlock(safeParseJson(stripFence(raw)), dataIds);
  if (!v.ok) {
    // Retry once with stricter system prompt
    raw = await callHaiku(apiKey, userPrompt, true);
    if (!raw) {
      return { ok: false, error: 'synthesis_failed', hint: `validation: ${v.error}; retry call failed` };
    }
    v = validateProBlock(safeParseJson(stripFence(raw)), dataIds);
    if (!v.ok) {
      return { ok: false, error: 'synthesis_failed', hint: `validation failed twice: ${v.error} - ${v.detail}` };
    }
  }

  // 5. Write to cache
  await env.TENSORFEED_CACHE.put(cacheKey, JSON.stringify(v.block), { expirationTtl: PRO_CACHE_TTL_S });

  return mergeProResponse(base, dataIds, v.block);
}

/**
 * Top-level entry: compute the Pro response for the given window. Thin
 * wrapper over computeWhatsNew + enrichWhatsNewProFromBase, preserved so the
 * free-preview handler (/api/preview/whats-new/pro) is unchanged.
 */
export async function computeWhatsNewPro(
  env: Env,
  options: WhatsNewOptions = {},
): Promise<WhatsNewProResult | WhatsNewProError> {
  const base = await computeWhatsNew(env, options);
  if (!base.ok) {
    return { ok: false, error: 'base_whats_new_failed', hint: (base as WhatsNewError).error };
  }
  return enrichWhatsNewProFromBase(env, base, options);
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function mergeProResponse(base: WhatsNewResult, dataIds: DataIds, block: ProBlock): WhatsNewProResult {
  return {
    ...base,
    tier: 'pro',
    data_ids: dataIds,
    pro: block,
  };
}

// ─── Free pro taste (leak-guarded preview) ──────────────────────────
//
// The discovery sibling of /api/premium/whats-new/pro. Shows ONE sample
// takeaway (the highest-confidence one), the agent classes the paid brief
// tailors actions for, and the analyst-summary length as a depth signal, while
// withholding the full summary text, every other takeaway, and every
// recommended action. The single sample is enough for an agent to judge the
// synthesis quality and see that claims are cited; the rest stays paid. Pure:
// no I/O.

export interface WhatsNewProPreview {
  ok: true;
  preview: true;
  tier: 'pro';
  window: WhatsNewResult['window'];
  computed_at: string;
  capturedAt: WhatsNewResult['capturedAt'];
  summary: WhatsNewResult['summary'];
  sample_takeaway: { claim: string; confidence: number; basis_count: number } | null;
  takeaways_total: number;
  takeaways_withheld: number;
  action_classes: AgentClass[];
  recommended_actions_total: number;
  analyst_summary_chars: number;
  unlock: {
    pro_brief: string;
    full_brief: string;
    note: string;
    withheld: string[];
  };
}

export function previewWhatsNewPro(result: WhatsNewProResult): WhatsNewProPreview {
  const takeaways = result.pro.key_takeaways;
  let sample: WhatsNewProPreview['sample_takeaway'] = null;
  if (takeaways.length > 0) {
    const top = takeaways.reduce((best, t) => (t.confidence > best.confidence ? t : best), takeaways[0]);
    sample = { claim: top.claim, confidence: top.confidence, basis_count: top.basis.length };
  }
  const action_classes: AgentClass[] = [];
  for (const a of result.pro.recommended_actions) {
    if (!action_classes.includes(a.for)) action_classes.push(a.for);
  }
  return {
    ok: true,
    preview: true,
    tier: 'pro',
    window: result.window,
    computed_at: result.computed_at,
    capturedAt: result.capturedAt,
    summary: result.summary,
    sample_takeaway: sample,
    takeaways_total: takeaways.length,
    takeaways_withheld: Math.max(0, takeaways.length - (sample ? 1 : 0)),
    action_classes,
    recommended_actions_total: result.pro.recommended_actions.length,
    analyst_summary_chars: result.pro.analyst_summary.length,
    unlock: {
      pro_brief: '/api/premium/whats-new/pro',
      full_brief: '/api/premium/whats-new',
      note: 'Free preview: one sample takeaway and the agent classes the brief tailors actions for. The paid pro brief (10 credits, $0.20) returns the full cited analyst summary, all key takeaways with confidence scores and source citations, and recommended actions per agent class. The 1-credit base brief at full_brief carries the raw pricing, incident, and headline data without the analyst layer.',
      withheld: [
        'the full analyst summary text',
        'every key takeaway beyond the single sample, with its citations and confidence',
        'every recommended action, its priority, and its citations',
        'the data_ids citation map',
      ],
    },
  };
}
