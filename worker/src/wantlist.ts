/**
 * AI-agent wantlist (demand-signal collector).
 *
 * Lets agents (or their human operators) tell TF what data they
 * wished they had. Closes the loop on "what should TF build next"
 * by asking the agents themselves rather than reverse-engineering it
 * from observability.
 *
 * Posture:
 *  - Anonymous by default. No PII required.
 *  - Strict rate limit per IP (5 submissions per 24h). Spam mitigation
 *    that does not require captcha (which would defeat the whole
 *    point of an agent-callable endpoint).
 *  - Stored under KV with 30-day TTL. Wantlist is a rolling window,
 *    not a permanent archive. Patterns matter; individual posts age out.
 *  - Public read endpoint surfaces aggregated counts by topic plus
 *    the most-recent N items, so agents and operators can see what
 *    others are asking for.
 *  - At zero traffic this collects little; the value compounds with
 *    free-trial adoption. Build cheap now, iterate when signal arrives.
 *
 * KV layout (TENSORFEED_CACHE):
 *   wantlist:item:{id}        WantlistItem (TTL 30d)
 *   wantlist:index             string[] of recent ids (capped at 200)
 *   wantlist:topic:{slug}      number  (running counter per topic)
 *   wantlist:rl:{ip}:{date}    number  (per-IP submissions today)
 */

import type { Env } from './types';
import { sendEmail } from './alerts';

const KV_ITEM = (id: string) => `wantlist:item:${id}`;
const KV_INDEX = 'wantlist:index';
const KV_TOPIC = (slug: string) => `wantlist:topic:${slug}`;
const KV_RL = (ip: string, date: string) => `wantlist:rl:${ip}:${date}`;

const ITEM_TTL_SECONDS = 30 * 24 * 60 * 60;
const INDEX_CAP = 200;
const RL_PER_IP_PER_DAY = 5;
const TOPIC_MAX_LEN = 60;
const DESCRIPTION_MAX_LEN = 500;
const REQUEST_TYPE_VALUES = ['data_source', 'endpoint', 'tool', 'mcp', 'integration', 'other'] as const;
type RequestType = (typeof REQUEST_TYPE_VALUES)[number];

export interface WantlistItem {
  id: string;
  created_at: string;
  topic: string;
  topic_slug: string;
  request_type: RequestType;
  description: string;
  contact_optional: string | null;
}

export interface WantlistError {
  ok: false;
  error: string;
  hint?: string;
}

// === Slug helper (used for topic counter keying) ===

export function slugifyTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// === Submission body parser ===

interface SubmissionBody {
  topic?: unknown;
  request_type?: unknown;
  description?: unknown;
  contact_optional?: unknown;
}

export function parseSubmission(
  body: SubmissionBody,
): { ok: true; item: Omit<WantlistItem, 'id' | 'created_at' | 'topic_slug'> } | WantlistError {
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic) return { ok: false, error: 'missing_topic', hint: 'topic is required (a short label, e.g. "real estate records")' };
  if (topic.length > TOPIC_MAX_LEN) return { ok: false, error: 'topic_too_long', hint: `topic must be ${TOPIC_MAX_LEN} chars or fewer` };

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) return { ok: false, error: 'missing_description', hint: 'description is required (1-2 sentences explaining what data you want)' };
  if (description.length > DESCRIPTION_MAX_LEN) return { ok: false, error: 'description_too_long', hint: `description must be ${DESCRIPTION_MAX_LEN} chars or fewer` };

  const requestType = typeof body.request_type === 'string' ? body.request_type : 'other';
  if (!REQUEST_TYPE_VALUES.includes(requestType as RequestType)) {
    return {
      ok: false,
      error: 'invalid_request_type',
      hint: `request_type must be one of: ${REQUEST_TYPE_VALUES.join(', ')}`,
    };
  }

  let contact: string | null = null;
  if (body.contact_optional !== undefined && body.contact_optional !== null) {
    if (typeof body.contact_optional !== 'string') {
      return { ok: false, error: 'invalid_contact_optional', hint: 'contact_optional must be a string' };
    }
    const c = body.contact_optional.trim();
    if (c.length > 200) return { ok: false, error: 'contact_too_long', hint: 'contact_optional must be 200 chars or fewer' };
    contact = c || null;
  }

  return {
    ok: true,
    item: {
      topic,
      request_type: requestType as RequestType,
      description,
      contact_optional: contact,
    },
  };
}

// === Per-IP rate limit (KV-backed, 24h window) ===

function utcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function checkAndIncrementRateLimit(env: Env, ip: string): Promise<{ allowed: boolean; usedToday: number; limit: number }> {
  const date = utcDateString();
  const key = KV_RL(ip, date);
  const current = (await env.TENSORFEED_CACHE.get<number>(key, 'json')) ?? 0;
  if (current >= RL_PER_IP_PER_DAY) {
    return { allowed: false, usedToday: current, limit: RL_PER_IP_PER_DAY };
  }
  await env.TENSORFEED_CACHE.put(key, JSON.stringify(current + 1), {
    expirationTtl: 24 * 60 * 60 + 60,
  });
  return { allowed: true, usedToday: current + 1, limit: RL_PER_IP_PER_DAY };
}

// === Submission handler ===

function generateId(): string {
  // 12 chars of base36 randomness, prefixed by epoch seconds for
  // weak chronological order when scanning.
  const ts = Math.floor(Date.now() / 1000).toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

export interface SubmitOk {
  ok: true;
  id: string;
  created_at: string;
  rate_limit: {
    used_today: number;
    limit_per_day: number;
    remaining: number;
  };
  /** Email-notify side-effect promise; ctx.waitUntil() this from the
   * caller. Resolves to true when the email was actually sent.
   * Always present even when notification is going to no-op (so the
   * caller does not need to branch on its presence). */
  notify_promise?: Promise<boolean>;
}

/**
 * Plain-text + HTML email body for a single wantlist submission.
 * Pure function so it can be unit-tested without touching Resend.
 */
export function buildNotificationEmail(item: WantlistItem, ip: string): { subject: string; text: string; html: string } {
  const subject = `Wantlist: [${item.request_type}] ${item.topic}`.slice(0, 200);
  const lines = [
    `Topic: ${item.topic}`,
    `Type: ${item.request_type}`,
    `Description: ${item.description}`,
    `Contact: ${item.contact_optional ?? '(none)'}`,
    `Source IP: ${ip}`,
    `Submitted: ${item.created_at}`,
    `Item ID: ${item.id}`,
    `Topic slug: ${item.topic_slug}`,
    '',
    'View aggregated: https://tensorfeed.ai/api/wantlist',
  ];
  const text = lines.join('\n');
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:600px;color:#222;">
  <h2 style="color:#0a66c2;margin:0 0 12px;">New wantlist submission</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px;">
    <tr><td style="padding:6px 8px;color:#666;width:120px;">Topic</td><td style="padding:6px 8px;font-weight:600;">${escape(item.topic)}</td></tr>
    <tr><td style="padding:6px 8px;color:#666;">Type</td><td style="padding:6px 8px;"><code>${escape(item.request_type)}</code></td></tr>
    <tr><td style="padding:6px 8px;color:#666;vertical-align:top;">Description</td><td style="padding:6px 8px;white-space:pre-wrap;">${escape(item.description)}</td></tr>
    <tr><td style="padding:6px 8px;color:#666;">Contact</td><td style="padding:6px 8px;">${item.contact_optional ? escape(item.contact_optional) : '<em style="color:#999;">(none)</em>'}</td></tr>
    <tr><td style="padding:6px 8px;color:#666;">Source IP</td><td style="padding:6px 8px;font-family:monospace;font-size:12px;">${escape(ip)}</td></tr>
    <tr><td style="padding:6px 8px;color:#666;">Submitted</td><td style="padding:6px 8px;font-family:monospace;font-size:12px;">${escape(item.created_at)}</td></tr>
    <tr><td style="padding:6px 8px;color:#666;">Item ID</td><td style="padding:6px 8px;font-family:monospace;font-size:12px;">${escape(item.id)}</td></tr>
  </table>
  <p style="margin:18px 0 0;font-size:13px;color:#666;">
    <a href="https://tensorfeed.ai/api/wantlist" style="color:#0a66c2;">View the full aggregated wantlist</a>
  </p>
</div>`.trim();
  return { subject, text, html };
}

/**
 * Fire-and-forget notify. Wraps sendEmail with try/catch so any
 * failure (Resend down, env vars missing) never propagates back to
 * the caller. The intent is "best effort"; the wantlist write is
 * the source of truth.
 */
export async function notifyWantlistSubmission(env: Env, item: WantlistItem, ip: string): Promise<boolean> {
  try {
    const { subject, text, html } = buildNotificationEmail(item, ip);
    return await sendEmail(env, subject, html, text);
  } catch (err) {
    console.error('notifyWantlistSubmission error:', err);
    return false;
  }
}

export async function submitWantlistItem(
  env: Env,
  ip: string,
  body: SubmissionBody,
): Promise<SubmitOk | (WantlistError & { rate_limit?: { used_today: number; limit_per_day: number } })> {
  const parsed = parseSubmission(body);
  if (!parsed.ok) return parsed;

  const rl = await checkAndIncrementRateLimit(env, ip);
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'rate_limit_exceeded',
      hint: `This IP submitted ${rl.usedToday} wantlist items in the last 24h (cap is ${rl.limit}). Aggregate by topic before submitting more.`,
      rate_limit: { used_today: rl.usedToday, limit_per_day: rl.limit },
    };
  }

  const id = generateId();
  const created_at = new Date().toISOString();
  const topic_slug = slugifyTopic(parsed.item.topic);
  const item: WantlistItem = {
    id,
    created_at,
    topic: parsed.item.topic,
    topic_slug,
    request_type: parsed.item.request_type,
    description: parsed.item.description,
    contact_optional: parsed.item.contact_optional,
  };

  // Write the item, bump the per-topic counter, and prepend to the
  // recent-items index. Three independent writes; do them in parallel.
  const indexCurrent = (await env.TENSORFEED_CACHE.get<string[]>(KV_INDEX, 'json')) ?? [];
  const indexNext = [id, ...indexCurrent.filter((x) => x !== id)].slice(0, INDEX_CAP);
  const topicCurrent = (await env.TENSORFEED_CACHE.get<number>(KV_TOPIC(topic_slug), 'json')) ?? 0;

  await Promise.all([
    env.TENSORFEED_CACHE.put(KV_ITEM(id), JSON.stringify(item), { expirationTtl: ITEM_TTL_SECONDS }),
    env.TENSORFEED_CACHE.put(KV_INDEX, JSON.stringify(indexNext)),
    // Topic counter inherits the item TTL so unique-topic keys do
    // not accumulate forever as the corpus rotates. Each new submission
    // for an existing topic re-extends the counter's TTL by ITEM_TTL,
    // so popular topics stay live as long as anyone is asking.
    env.TENSORFEED_CACHE.put(KV_TOPIC(topic_slug), JSON.stringify(topicCurrent + 1), { expirationTtl: ITEM_TTL_SECONDS }),
  ]);

  // Fire-and-forget email notification. The caller (HTTP handler)
  // should ctx.waitUntil(result.notify_promise) so the response
  // returns to the agent immediately without blocking on Resend.
  // Resolves to false (no-op) when env is missing the email vars,
  // which is the dev / unconfigured case.
  const notify_promise = notifyWantlistSubmission(env, item, ip);

  return {
    ok: true,
    id,
    created_at,
    rate_limit: {
      used_today: rl.usedToday,
      limit_per_day: rl.limit,
      remaining: Math.max(0, rl.limit - rl.usedToday),
    },
    notify_promise,
  };
}

// === Read handler (aggregated + recent) ===

export interface WantlistSnapshot {
  generated_at: string;
  items_indexed: number;
  recent: WantlistItem[];
  top_topics: Array<{ topic_slug: string; count: number }>;
  request_type_counts: Record<RequestType, number>;
  ttl_days: number;
  rate_limit_per_ip_per_day: number;
  posture: string;
}

const RECENT_CAP_DEFAULT = 25;
const RECENT_CAP_MAX = 100;

export async function listWantlist(
  env: Env,
  recentLimit: number = RECENT_CAP_DEFAULT,
): Promise<WantlistSnapshot> {
  const limit = Math.min(Math.max(1, recentLimit), RECENT_CAP_MAX);
  const ids = (await env.TENSORFEED_CACHE.get<string[]>(KV_INDEX, 'json')) ?? [];
  const idsToHydrate = ids.slice(0, limit);
  const items = await Promise.all(
    idsToHydrate.map((id) => env.TENSORFEED_CACHE.get<WantlistItem>(KV_ITEM(id), 'json')),
  );
  const recent = items.filter((i): i is WantlistItem => i !== null);

  // Topic counts: derive from the recent in-memory set (cheap, bounded).
  // Long-tail counters live under wantlist:topic:* keys but we do not
  // do a full KV list scan here (would be ops-expensive). The top_topics
  // surfaced are over the recent window only; the wantlist:topic:* keys
  // hold the all-time-within-TTL counter for any caller that wants to
  // pivot deeper on a specific slug.
  const topicMap = new Map<string, number>();
  const requestTypeCounts: Record<RequestType, number> = {
    data_source: 0,
    endpoint: 0,
    tool: 0,
    mcp: 0,
    integration: 0,
    other: 0,
  };
  for (const it of recent) {
    topicMap.set(it.topic_slug, (topicMap.get(it.topic_slug) ?? 0) + 1);
    requestTypeCounts[it.request_type] = (requestTypeCounts[it.request_type] ?? 0) + 1;
  }
  const topTopics = Array.from(topicMap.entries())
    .map(([topic_slug, count]) => ({ topic_slug, count }))
    .sort((a, b) => b.count - a.count || (a.topic_slug < b.topic_slug ? -1 : 1))
    .slice(0, 20);

  return {
    generated_at: new Date().toISOString(),
    items_indexed: ids.length,
    recent,
    top_topics: topTopics,
    request_type_counts: requestTypeCounts,
    ttl_days: ITEM_TTL_SECONDS / 86_400,
    rate_limit_per_ip_per_day: RL_PER_IP_PER_DAY,
    posture:
      'TensorFeed AI-agent wantlist. Anonymous by default; aggregate over recent submissions. Use to express what data you wish TF served. Patterns inform pipeline priorities; individual posts expire after 30 days. No PII collection. The wantlist is a signal collector, not a contract; we do not promise to build any specific request.',
  };
}

// === Admin moderation: delete one item ===

/**
 * Remove a wantlist item by id. Pulls the id out of the rolling
 * index, deletes the per-item KV key, decrements (or removes) the
 * topic counter. Used by the admin moderation endpoint to scrub
 * spam without waiting for the 30-day TTL. Idempotent: calling on
 * a missing id just no-ops and reports not_found.
 */
export async function deleteWantlistItem(env: Env, id: string): Promise<{ ok: true; topic_slug: string } | { ok: false; error: string }> {
  const item = (await env.TENSORFEED_CACHE.get<WantlistItem>(KV_ITEM(id), 'json'));
  if (!item) return { ok: false, error: 'not_found' };

  // Read + write the index
  const indexCurrent = (await env.TENSORFEED_CACHE.get<string[]>(KV_INDEX, 'json')) ?? [];
  const indexNext = indexCurrent.filter((x) => x !== id);

  // Decrement topic counter (or delete if it would hit 0)
  const topicCurrent = (await env.TENSORFEED_CACHE.get<number>(KV_TOPIC(item.topic_slug), 'json')) ?? 0;
  const topicNext = topicCurrent - 1;
  const topicWriteOrDelete = topicNext > 0
    ? env.TENSORFEED_CACHE.put(KV_TOPIC(item.topic_slug), JSON.stringify(topicNext), { expirationTtl: ITEM_TTL_SECONDS })
    : env.TENSORFEED_CACHE.delete(KV_TOPIC(item.topic_slug));

  await Promise.all([
    env.TENSORFEED_CACHE.delete(KV_ITEM(id)),
    env.TENSORFEED_CACHE.put(KV_INDEX, JSON.stringify(indexNext)),
    topicWriteOrDelete,
  ]);

  return { ok: true, topic_slug: item.topic_slug };
}

/**
 * Admin-tier read: same as listWantlist but explicitly returns the
 * full WantlistItem records including contact_optional. The public
 * listWantlist already returns these fields; this alias exists so
 * the call site in the admin endpoint reads as intentional.
 */
export const listWantlistForAdmin = listWantlist;

export const WANTLIST_DEFAULTS = {
  ITEM_TTL_SECONDS,
  INDEX_CAP,
  RL_PER_IP_PER_DAY,
  TOPIC_MAX_LEN,
  DESCRIPTION_MAX_LEN,
  REQUEST_TYPE_VALUES,
};
