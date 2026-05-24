/**
 * News-to-action card generator.
 *
 * First production use of Claude Haiku 4.5 inside the worker. For each
 * recent TF news article, generates a structured "agent action card"
 * answering the question the article raises for an AI-powered agent
 * reading it:
 *
 *   - action_summary           1-2 agent-readable sentences on what to do
 *   - migration_recommendation when a deprecation / replacement applies
 *   - affected_capability      tags: pricing / model / safety / framework /
 *                              infrastructure / tooling / policy / ecosystem
 *   - cost_impact              none / low / medium / high
 *   - security_impact          none / low / medium / high
 *   - urgency                  immediate / this_week / fyi
 *
 * Why Haiku:
 *   - Haiku 4.5 is cheap enough that per-article generation is sustainable
 *     ($0.13/day projected for 50 articles, ~$4/month).
 *   - Per-article cards are cached by article_id for 7 days, so a re-run
 *     of the cron doesn't burn tokens regenerating identical cards (real
 *     marginal cost is closer to $1-2/month).
 *   - Structured JSON output via response_format reduces validation
 *     overhead.
 *
 * Cadence: daily at 08:00 UTC, after the morning news poll has completed
 * and well before the X/Twitter cron at 14:30 UTC needs the data.
 *
 * Powers:
 *   /api/news/action-cards                          (free, capped at 25)
 *   /api/premium/news/action-cards (1 credit)       (full + filters)
 *
 * Uses existing PROBE_ANTHROPIC_KEY secret (already wired for the LLM
 * probe in worker/src/probe.ts). Reusing keeps the worker secret surface
 * tight; separating into ANTHROPIC_API_KEY is a future refactor.
 */

import type { Env } from './types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';
const FETCH_TIMEOUT_MS = 15_000;
const PARALLEL_BATCH = 10;
const PROCESS_LIMIT = 50;

export const ACTION_CARDS_CURRENT_KEY = 'action-cards:current';
export const ACTION_CARDS_INDEX_KEY = 'action-cards:index';
export const ACTION_CARDS_DAILY_KEY_PREFIX = 'action-cards:daily:';
export const ACTION_CARD_BY_ARTICLE_PREFIX = 'action-card:';
const PER_ARTICLE_TTL_SECONDS = 7 * 24 * 60 * 60;

interface AnthropicEnvKey {
  PROBE_ANTHROPIC_KEY?: string;
}

// ── Card schema ────────────────────────────────────────────────────

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high';
export type UrgencyLevel = 'immediate' | 'this_week' | 'fyi';
export type CapabilityTag =
  | 'pricing'
  | 'model'
  | 'safety'
  | 'framework'
  | 'infrastructure'
  | 'tooling'
  | 'policy'
  | 'ecosystem';

const CAPABILITY_TAGS: ReadonlySet<CapabilityTag> = new Set([
  'pricing', 'model', 'safety', 'framework', 'infrastructure', 'tooling', 'policy', 'ecosystem',
]);
const IMPACT_LEVELS: ReadonlySet<ImpactLevel> = new Set(['none', 'low', 'medium', 'high']);
const URGENCY_LEVELS: ReadonlySet<UrgencyLevel> = new Set(['immediate', 'this_week', 'fyi']);

export interface ActionCard {
  article_id: string;
  article_title: string;
  article_url: string;
  article_source: string;
  article_published_at: string;
  action_summary: string;
  migration_recommendation: string | null;
  affected_capability: CapabilityTag;
  cost_impact: ImpactLevel;
  security_impact: ImpactLevel;
  urgency: UrgencyLevel;
  generated_at: string;
}

export interface ActionCardsSnapshot {
  capturedAt: string;
  source: 'tensorfeed.ai news + Claude Haiku 4.5';
  model: typeof ANTHROPIC_MODEL;
  articles_considered: number;
  articles_succeeded: number;
  articles_failed: number;
  cards: ActionCard[];
}

// ── Article shape (matches `rss.ts` output) ────────────────────────

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  publishedAt: string;
}

// ── Prompt + parsing ───────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You produce structured "agent action cards" for AI agents reading the TensorFeed AI news feed. ' +
  'Given one news article, output a single JSON object with these fields exactly:\n' +
  '  action_summary           : string, 1-2 sentences, plain text, no markdown. What an AI agent or agent-builder should DO in response to this news (e.g. "Migrate to gpt-5-mini" or "Audit fine-tuned models against this CVE"). When nothing actionable: "No action required, informational."\n' +
  '  migration_recommendation : string OR null. Concrete migration target when the article implies one (model deprecation, framework replacement, API change). null otherwise.\n' +
  '  affected_capability      : one of pricing | model | safety | framework | infrastructure | tooling | policy | ecosystem\n' +
  '  cost_impact              : one of none | low | medium | high (impact on running-cost for an agent operator)\n' +
  '  security_impact          : one of none | low | medium | high (impact on agent security posture)\n' +
  '  urgency                  : one of immediate | this_week | fyi\n\n' +
  'Rules:\n' +
  '- Output ONLY the JSON object. No prose, no markdown fences, no commentary.\n' +
  '- Use lowercase for all enum values exactly as listed.\n' +
  '- Keep action_summary terse and decision-ready.\n' +
  '- When the article is hype, marketing, or speculative without concrete impact, set cost_impact=none, security_impact=none, urgency=fyi.';

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
}

function buildUserPrompt(article: Article): string {
  const snippet = (article.snippet ?? '').slice(0, 1500);
  return [
    `TITLE: ${article.title}`,
    `SOURCE: ${article.source}`,
    `PUBLISHED: ${article.publishedAt}`,
    `URL: ${article.url}`,
    '',
    'SNIPPET:',
    snippet,
  ].join('\n');
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

interface RawCard {
  action_summary?: unknown;
  migration_recommendation?: unknown;
  affected_capability?: unknown;
  cost_impact?: unknown;
  security_impact?: unknown;
  urgency?: unknown;
}

/**
 * Validate + coerce the Haiku JSON response into a strict ActionCard.
 * Returns null on any validation failure (the orchestrator records the
 * failure and moves on). Exported for unit testing.
 */
export function parseCardJson(raw: string, article: Article, generated_at: string): ActionCard | null {
  // Tolerate leading/trailing whitespace + optional markdown fences.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  let parsed: RawCard;
  try {
    parsed = JSON.parse(cleaned) as RawCard;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const summary = typeof parsed.action_summary === 'string' ? parsed.action_summary.trim() : '';
  if (!summary) return null;

  const cap = typeof parsed.affected_capability === 'string' ? parsed.affected_capability.toLowerCase().trim() : '';
  if (!CAPABILITY_TAGS.has(cap as CapabilityTag)) return null;

  const cost = typeof parsed.cost_impact === 'string' ? parsed.cost_impact.toLowerCase().trim() : '';
  if (!IMPACT_LEVELS.has(cost as ImpactLevel)) return null;

  const sec = typeof parsed.security_impact === 'string' ? parsed.security_impact.toLowerCase().trim() : '';
  if (!IMPACT_LEVELS.has(sec as ImpactLevel)) return null;

  const urg = typeof parsed.urgency === 'string' ? parsed.urgency.toLowerCase().trim() : '';
  if (!URGENCY_LEVELS.has(urg as UrgencyLevel)) return null;

  const migration =
    typeof parsed.migration_recommendation === 'string'
      ? parsed.migration_recommendation.trim() || null
      : null;

  return {
    article_id: article.id,
    article_title: article.title,
    article_url: article.url,
    article_source: article.source,
    article_published_at: article.publishedAt,
    action_summary: summary,
    migration_recommendation: migration,
    affected_capability: cap as CapabilityTag,
    cost_impact: cost as ImpactLevel,
    security_impact: sec as ImpactLevel,
    urgency: urg as UrgencyLevel,
    generated_at,
  };
}

async function callHaikuForArticle(article: Article, apiKey: string, generated_at: string): Promise<ActionCard | null> {
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
        messages: [{ role: 'user', content: buildUserPrompt(article) }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AnthropicResponse;
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) return null;
    return parseCardJson(text, article, generated_at);
  } catch {
    return null;
  }
}

// ── Per-article cache ──────────────────────────────────────────────

async function readCachedCard(env: Env, articleId: string): Promise<ActionCard | null> {
  return (await env.TENSORFEED_CACHE.get(`${ACTION_CARD_BY_ARTICLE_PREFIX}${articleId}`, 'json')) as ActionCard | null;
}

async function writeCachedCard(env: Env, card: ActionCard): Promise<void> {
  await env.TENSORFEED_CACHE.put(
    `${ACTION_CARD_BY_ARTICLE_PREFIX}${card.article_id}`,
    JSON.stringify(card),
    { expirationTtl: PER_ARTICLE_TTL_SECONDS },
  );
}

// ── Top-level generator ────────────────────────────────────────────

export async function refreshActionCards(env: Env): Promise<ActionCardsSnapshot | null> {
  const apiKey = (env as Env & AnthropicEnvKey).PROBE_ANTHROPIC_KEY;
  if (!apiKey) {
    console.warn('refreshActionCards skipped: PROBE_ANTHROPIC_KEY not set');
    return null;
  }

  const articles = (await env.TENSORFEED_NEWS.get('articles:latest', 'json')) as Article[] | null;
  if (!articles || articles.length === 0) return null;

  const slice = articles.slice(0, PROCESS_LIMIT);
  const generated_at = new Date().toISOString();
  const cards: ActionCard[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < slice.length; i += PARALLEL_BATCH) {
    const batch = slice.slice(i, i + PARALLEL_BATCH);
    const results = await Promise.all(
      batch.map(async (article) => {
        // Per-article cache hit: return immediately without burning tokens.
        const cached = await readCachedCard(env, article.id);
        if (cached) return cached;
        const card = await callHaikuForArticle(article, apiKey, generated_at);
        if (card) await writeCachedCard(env, card);
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

  const snapshot: ActionCardsSnapshot = {
    capturedAt: generated_at,
    source: 'tensorfeed.ai news + Claude Haiku 4.5',
    model: ANTHROPIC_MODEL,
    articles_considered: slice.length,
    articles_succeeded: succeeded,
    articles_failed: failed,
    cards,
  };

  const dateKey = generated_at.slice(0, 10);
  await env.TENSORFEED_CACHE.put(ACTION_CARDS_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${ACTION_CARDS_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  const idxRaw = (await env.TENSORFEED_CACHE.get(ACTION_CARDS_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(ACTION_CARDS_INDEX_KEY, JSON.stringify(dates.slice(-90)));
  }

  return snapshot;
}

export async function getActionCardsSnapshot(env: Env): Promise<ActionCardsSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(ACTION_CARDS_CURRENT_KEY, 'json')) as ActionCardsSnapshot | null;
}
