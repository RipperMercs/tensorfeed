/**
 * Agent claim + directory content moderation via Cloudflare Workers AI
 * Llama Guard 3 (8B). Pre-flight classifier for any operator-supplied
 * free-text field (display_name, expanded_description) that lands on
 * a public surface.
 *
 * Bureau Week 3 step 13b. Also serves the directory + future bounty
 * surfaces. See spec at
 * `C:\Users\rippe\Desktop\tensorfeed-bounty-board-v0-spec.md` for
 * the moderation framework rationale.
 *
 * Action taxonomy (mapped from Llama Guard category output):
 *
 *   pass         -> content is safe; auto-accept
 *   hard_block   -> content matched a category we never publish under any
 *                   circumstances (S1 violent crimes, S3 sex crimes, S4
 *                   CSAM, S9 indiscriminate weapons / CBRN, S11 self-harm)
 *   soft_review  -> content matched a judgment-call category; route to
 *                   admin pending queue (S2 non-violent crimes, S5 defamation,
 *                   S6 specialized advice, S7 privacy, S8 IP infringement,
 *                   S10 hate, S12 sexual content, S13 election influence,
 *                   S14 code-interpreter abuse / agent misuse)
 *   fail_closed  -> Llama Guard unreachable, malformed response, or unknown
 *                   category; queue for review (NEVER auto-publish on
 *                   uncertainty)
 *
 * The classifier is intentionally conservative on unknown signals:
 * any deviation from a clean "safe" output routes content to admin
 * review, never bypasses it.
 */

import { Env } from './types';

export type LlamaGuardCategory =
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
  | 'S7'
  | 'S8'
  | 'S9'
  | 'S10'
  | 'S11'
  | 'S12'
  | 'S13'
  | 'S14';

const HARD_BLOCK_CATEGORIES: ReadonlySet<LlamaGuardCategory> = new Set([
  'S1', // Violent Crimes
  'S3', // Sex Crimes
  'S4', // Child Exploitation
  'S9', // Indiscriminate Weapons (CBRN)
  'S11', // Self-Harm
]);

const SOFT_REVIEW_CATEGORIES: ReadonlySet<LlamaGuardCategory> = new Set([
  'S2', // Non-Violent Crimes
  'S5', // Defamation
  'S6', // Specialized Advice
  'S7', // Privacy
  'S8', // IP Infringement
  'S10', // Hate
  'S12', // Sexual Content
  'S13', // Elections
  'S14', // Code Interpreter Abuse
]);

export type ModerationVerdict =
  | { action: 'pass' }
  | { action: 'hard_block'; category: LlamaGuardCategory }
  | { action: 'soft_review'; category: LlamaGuardCategory }
  | { action: 'fail_closed'; error: string };

/**
 * Parse a Llama Guard raw output string into a ModerationVerdict.
 * Pure function; no I/O. Exposed so tests don't have to call the AI
 * binding to exercise the classification logic.
 *
 * Llama Guard 3 output shape:
 *   "safe"                              -> pass
 *   "unsafe\nS3"                        -> single category
 *   "unsafe\nS3,S4"                     -> multiple categories
 *   anything else                       -> fail_closed
 *
 * When multiple categories are present, hard_block trumps soft_review;
 * the FIRST hard_block category encountered wins for the verdict's
 * `category` field (deterministic given the input ordering).
 */
export function classifyLlamaGuardResponse(raw: string): ModerationVerdict {
  if (typeof raw !== 'string') {
    return { action: 'fail_closed', error: 'non_string_response' };
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { action: 'fail_closed', error: 'empty_response' };
  }
  if (trimmed === 'safe' || trimmed.startsWith('safe\n') || trimmed.startsWith('safe ')) {
    return { action: 'pass' };
  }
  if (!trimmed.startsWith('unsafe')) {
    return { action: 'fail_closed', error: 'unexpected_response_prefix' };
  }
  const categories: LlamaGuardCategory[] = [];
  // Llama Guard emits categories like "S3" or "S3,S4". Tolerate
  // whitespace + commas + line breaks between them.
  const matches = raw.matchAll(/S(\d{1,2})\b/g);
  for (const m of matches) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 14) categories.push(`S${n}` as LlamaGuardCategory);
  }
  if (categories.length === 0) {
    return { action: 'fail_closed', error: 'unsafe_without_category' };
  }
  for (const cat of categories) {
    if (HARD_BLOCK_CATEGORIES.has(cat)) {
      return { action: 'hard_block', category: cat };
    }
  }
  for (const cat of categories) {
    if (SOFT_REVIEW_CATEGORIES.has(cat)) {
      return { action: 'soft_review', category: cat };
    }
  }
  return { action: 'fail_closed', error: 'unknown_category' };
}

/**
 * Run Llama Guard 3 over a piece of operator-supplied free text and
 * return a structured ModerationVerdict.
 *
 * Empty / blank text is a pass (no operator-supplied content to
 * moderate). The AI binding being unavailable is a fail_closed (treat
 * as needing review, never as a pass). Any network or runtime error
 * is a fail_closed.
 */
export async function moderateText(env: Env, text: string): Promise<ModerationVerdict> {
  if (typeof text !== 'string') {
    return { action: 'fail_closed', error: 'non_string_input' };
  }
  if (text.trim().length === 0) {
    return { action: 'pass' };
  }
  if (!env.AI) {
    return { action: 'fail_closed', error: 'ai_binding_unavailable' };
  }
  // The Env type was originally narrowed to the embedding signature.
  // Llama Guard uses the chat-completion signature. Use the broader
  // `Ai.run` shape from @cloudflare/workers-types via a runtime cast;
  // the underlying binding object is the same Cloudflare-provided
  // service either way.
  const aiBinding = env.AI as unknown as {
    run: (
      model: string,
      input: { messages: Array<{ role: string; content: string }> },
    ) => Promise<unknown>;
  };
  try {
    const response = await aiBinding.run('@cf/meta/llama-guard-3-8b', {
      messages: [{ role: 'user', content: text }],
    });
    const raw = (response as { response?: unknown }).response;
    if (typeof raw !== 'string') {
      return { action: 'fail_closed', error: 'malformed_response' };
    }
    return classifyLlamaGuardResponse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { action: 'fail_closed', error: 'ai_call_failed: ' + msg.slice(0, 200) };
  }
}

/**
 * Convenience: moderate multiple free-text fields in parallel and
 * collapse to the single strictest verdict. Used by the claim-flow
 * route to check display_name + expanded_description in one go.
 *
 * Strictness order: hard_block > soft_review > fail_closed > pass.
 * (fail_closed is more permissive than soft_review at the route
 * level: soft_review explicitly says "human should look at this",
 * fail_closed says "we couldn't classify, default to caution but
 * don't refuse the request outright"; the route handler chooses
 * the policy.)
 */
export async function moderateFields(
  env: Env,
  fields: Array<{ name: string; text: string | null | undefined }>,
): Promise<{ verdict: ModerationVerdict; per_field: Record<string, ModerationVerdict> }> {
  const per_field: Record<string, ModerationVerdict> = {};
  for (const f of fields) {
    if (f.text === null || f.text === undefined) continue;
    per_field[f.name] = await moderateText(env, f.text);
  }
  let strictest: ModerationVerdict = { action: 'pass' };
  for (const v of Object.values(per_field)) {
    if (rank(v) > rank(strictest)) strictest = v;
  }
  return { verdict: strictest, per_field };
}

function rank(v: ModerationVerdict): number {
  switch (v.action) {
    case 'hard_block':
      return 3;
    case 'soft_review':
      return 2;
    case 'fail_closed':
      return 1;
    case 'pass':
      return 0;
  }
}
