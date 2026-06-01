/**
 * Catalog cleanup helpers for the LiteLLM merge.
 *
 * The merge auto-adds models from tracked providers; left raw, the catalog
 * fills with date-pinned snapshots, deprecated variants, non-chat modalities
 * (tts/audio/image/embedding), and slug-form display names. These helpers
 * classify the noise to prune and humanize the slug names that survive.
 *
 * Pure (no I/O). Applied in mergePricing AFTER the tracked + new-model loops,
 * and only to untracked entries (a model whose name still equals its id);
 * tracked + curated baseline models carry hand-written names and are never
 * pruned or renamed by these.
 */

// Dated snapshot suffixes: ISO (2024-05-13), 8-digit (20240229), MM-YYYY
// (08-2024), MM-DD (06-17), and bare 4-digit MMDD/MMYY (2405, 1114, 0314),
// each optionally followed by -preview. Model versions are X or X.Y, never a
// bare 4-digit run, so these do not collide with version numbers.
const DATE_SUFFIX = /-(?:\d{4}-\d{2}-\d{2}|\d{8}|\d{2}-\d{4}|\d{2}-\d{2}|\d{4})(?:-preview)?$/;

// Whole-token markers for non-chat modalities (not chat LLMs).
const NON_CHAT_TOKENS = new Set([
  'tts', 'audio', 'image', 'realtime', 'transcribe', 'diarize',
  'embedding', 'embed', 'lyria', 'learnlm', 'robotics', 'customtools',
]);

// Multi-token non-chat markers (substring match).
const NON_CHAT_SUBSTRINGS = ['computer-use', 'native-audio', 'deep-research', 'flash-image'];

export function isDatedSnapshot(id: string): boolean {
  return DATE_SUFFIX.test(id);
}

export function isNonChatModality(id: string): boolean {
  const lower = id.toLowerCase();
  if (lower.split('-').some(t => NON_CHAT_TOKENS.has(t))) return true;
  return NON_CHAT_SUBSTRINGS.some(s => lower.includes(s));
}

/** True if an untracked catalog entry is noise that should be pruned. */
export function isCatalogNoise(id: string): boolean {
  return isDatedSnapshot(id) || isNonChatModality(id);
}

// Tokens that uppercase wholesale (acronyms / brand casing).
const UPPER = new Set(['gpt', 'ai', 'tts', 'hd', 'api', 'llm', 'ocr', 'sdk', 'glm', 'vl', 'moe', 'rag', 'tpu', 'gpu', 'er', 'it']);
// Tokens with bespoke casing.
const SPECIAL: Record<string, string> = {
  deepseek: 'DeepSeek', openai: 'OpenAI', mixtral: 'Mixtral', mistral: 'Mistral',
  codestral: 'Codestral', devstral: 'Devstral', magistral: 'Magistral',
  ministral: 'Ministral', pixtral: 'Pixtral', learnlm: 'LearnLM',
};

/**
 * Turn a slug id into a readable display name.
 *   gpt-5.5            -> GPT-5.5
 *   gemini-3-pro-preview -> Gemini 3 Pro Preview
 *   o3-mini            -> o3 Mini
 *   command-r-plus     -> Command R Plus
 * Anthropic hyphen-decimal ids (claude-opus-4-1) are NOT handled here; those
 * current models are carried in TRACKED_MODELS with hand-written names.
 */
export function humanizeModelName(id: string): string {
  const tokens = id.split('-');
  const out = tokens.map((t) => {
    if (/\d/.test(t)) return t; // version / param tokens kept verbatim (5.5, 4o, 27b)
    const low = t.toLowerCase();
    if (SPECIAL[low]) return SPECIAL[low];
    if (UPPER.has(low)) return low.toUpperCase();
    if (/^o\d?$/.test(t)) return t; // o-series keeps its lowercase o
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  // Re-hyphenate GPT to its version: "GPT 5.5" -> "GPT-5.5", "GPT 4o" -> "GPT-4o".
  return out.join(' ').replace(/\bGPT (\d)/g, 'GPT-$1');
}
