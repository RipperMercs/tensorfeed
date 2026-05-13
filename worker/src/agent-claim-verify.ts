/**
 * Operator claim verification primitives.
 *
 * Pure functions. No env access, no fetch, no KV. The I/O layer (route
 * handler in index.ts, KV write via agent-reputation-store) consumes
 * these to validate, parse, and verify operator-signed claim messages
 * before they touch storage.
 *
 * Spec: bureau Week 3 step 13. Same primitives also serve as the
 * signup verification for the agent self-directory (see
 * `[[project_agent_directory_v0_spec]]` memory) so the directory's
 * additional optional fields are parsed here too.
 *
 * Security posture (per `[[feedback_slow_down_for_security]]`):
 *   1. Reject every malformed input shape BEFORE attempting ECDSA
 *      recovery. ECDSA is the most expensive step; cheap rejects up
 *      front limit DoS surface.
 *   2. Replay protection: timestamp + nonce; reject signatures older
 *      than CLAIM_MAX_AGE_MS.
 *   3. Brand allowlist check is case-insensitive, normalizes the
 *      candidate by stripping non-alphanumerics before comparison.
 *   4. EIP-55 checksum validation is enforced AT THIS LAYER, not
 *      lazily; downstream code can rely on the wallet field being
 *      well-formed.
 *   5. All free-text fields have length caps. AI moderation runs
 *      separately in agent-moderation.ts.
 *   6. ECDSA verification is delegated to viem's `verifyMessage`;
 *      we do NOT roll our own ECDSA recovery.
 */

import { verifyMessage, isAddress, getAddress, type Address } from 'viem';

// === Constants ===

/** Maximum age of a signed claim message before it's considered replayed. */
export const CLAIM_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/** Maximum length of display_name. Trade-off: short enough to render in a badge, long enough for reasonable agent names. */
export const MAX_DISPLAY_NAME_LEN = 60;

/** Maximum length of expanded_description (directory field). */
export const MAX_EXPANDED_DESCRIPTION_LEN = 1000;

/** Maximum length of contact_method (free-text email/handle/etc). */
export const MAX_CONTACT_LEN = 120;

/** Maximum length of operator_url. */
export const MAX_OPERATOR_URL_LEN = 200;

/** Hard caps on directory tag arrays. */
export const MAX_SKILLS_TAGS = 8;
export const MAX_SERVICE_AREAS = 5;
export const MAX_LANGUAGES = 5;

/** Hard cap on rate ranges to keep the directory shape sane. */
export const MAX_HOURLY_RATE_USD = 10000;

/** Hard cap on years_experience. */
export const MAX_YEARS_EXPERIENCE = 50;

/**
 * Controlled vocabulary for skills_tags. Adding a new tag is a
 * deliberate decision and a public schema change.
 */
export const SKILLS_TAG_VOCAB: ReadonlySet<string> = new Set([
  'research',
  'data-analysis',
  'web-scraping',
  'coding',
  'code-review',
  'devops',
  'content-writing',
  'copywriting',
  'technical-writing',
  'voice-acting',
  'voice-dubbing',
  'image-generation',
  'image-editing',
  'video-editing',
  'audio-editing',
  'translation',
  'transcription',
  'market-research',
  'sentiment-analysis',
  'agent-orchestration',
  'prompt-engineering',
  'eval',
  'fine-tuning',
  'infrastructure',
  'trading-research',
  'compliance-research',
  'legal-research',
]);

/** Controlled vocabulary for service_areas. Closed set. */
export const SERVICE_AREA_VOCAB: ReadonlySet<string> = new Set([
  'research',
  'data',
  'coding',
  'writing',
  'voice',
  'image',
  'video',
  'other',
]);

/**
 * Protected brand allowlist. Display names that match or contain any
 * of these (case-insensitive, normalized to alphanumerics-only) get
 * queued for admin review instead of auto-approved. Brand owners
 * still get protection if they claim their own wallets and admin
 * verifies; this just stops trivial impersonation.
 *
 * Includes:
 *   - Major AI labs and their products
 *   - Frontier model names and primary research orgs
 *   - Generic operational labels that should never be unilaterally
 *     claimed (admin, support, official, root, tensorfeed itself)
 */
export const PROTECTED_BRANDS: ReadonlyArray<string> = [
  // AI labs
  'openai',
  'anthropic',
  'google',
  'deepmind',
  'meta',
  'microsoft',
  'cohere',
  'mistral',
  'perplexity',
  'xai',
  'nvidia',
  'huggingface',
  'replicate',
  'midjourney',
  'runway',
  'stability',
  'elevenlabs',
  'suno',
  'amazon',
  'aws',
  'apple',
  // Frontier products
  'claude',
  'gpt',
  'chatgpt',
  'gemini',
  'llama',
  'grok',
  'copilot',
  'devin',
  'cursor',
  'windsurf',
  'aider',
  'cline',
  // TF + generic
  'tensorfeed',
  'admin',
  'support',
  'official',
  'help',
  'root',
  'staff',
  'moderator',
  'system',
];

// === Parsed message shape ===

/**
 * The structured form of a signed operator claim. Result of parsing
 * the human-readable message body. The signature has NOT been verified
 * at this point; that's a separate step.
 */
export interface ParsedClaim {
  /** EIP-55 checksummed wallet from the message body. */
  wallet: Address;
  /** ISO 8601 timestamp inside the signed message. */
  timestamp: string;
  /** Random nonce inside the signed message (replay protection). */
  nonce: string;
  /** Display name. Required; subject to brand allowlist. */
  display_name: string;
  /** Optional fields, validated when present. */
  operator_url: string | null;
  contact: string | null;
  // Directory fields (all optional)
  available_for_hire: boolean | null;
  hourly_rate_min_usd: number | null;
  hourly_rate_max_usd: number | null;
  expanded_description: string | null;
  skills_tags: string[];
  service_areas: string[];
  languages: string[];
  years_experience: number | null;
}

/** Validation error categories surfaced to the caller. */
export type ClaimValidationError =
  | 'invalid_message_shape'
  | 'invalid_wallet'
  | 'invalid_timestamp'
  | 'invalid_nonce'
  | 'missing_display_name'
  | 'display_name_too_long'
  | 'display_name_invalid_chars'
  | 'operator_url_invalid'
  | 'contact_too_long'
  | 'expanded_description_too_long'
  | 'expanded_description_invalid_chars'
  | 'skills_tags_too_many'
  | 'skills_tag_unknown'
  | 'service_areas_too_many'
  | 'service_area_unknown'
  | 'languages_too_many'
  | 'language_invalid'
  | 'rate_out_of_range'
  | 'rate_min_gt_max'
  | 'years_experience_out_of_range'
  | 'replay_protection_failed'
  | 'signature_verification_failed';

export type ClaimValidationResult =
  | { ok: true; claim: ParsedClaim }
  | { ok: false; error: ClaimValidationError; detail?: string };

// === Field-level validators ===

/** Display-name content allowlist: ASCII letters, digits, spaces, and a small punctuation set. */
const DISPLAY_NAME_ALLOWED_RE = /^[A-Za-z0-9 ._\-']+$/;

/** Expanded-description content allowlist: alphanumerics + standard punctuation + whitespace. */
const EXPANDED_DESCRIPTION_ALLOWED_RE = /^[A-Za-z0-9 \t\n\r.,!?;:()[\]{}'"@&%#/$+\-=_]+$/;

/** BCP 47 language code shape: 2-3 letter primary, optional subtags. */
const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Hex nonce shape: 16-64 hex chars (8-32 bytes). */
const NONCE_RE = /^[0-9a-fA-F]{16,64}$/;

/** URL shape: http/https only. */
const HTTPS_URL_RE = /^https?:\/\/[^\s<>"]+$/;

function normalizeForBrandCheck(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check whether a display name matches any protected brand.
 * Returns the matching brand name or null. Case-insensitive,
 * non-alphanumerics stripped so "Open AI" and "Open-AI" both match
 * "openai".
 */
export function findBrandAllowlistHit(display_name: string): string | null {
  const normalized = normalizeForBrandCheck(display_name);
  if (normalized.length === 0) return null;
  for (const brand of PROTECTED_BRANDS) {
    if (normalized === brand || normalized.includes(brand)) return brand;
  }
  return null;
}

/** Parse a key: value line. Returns null if shape doesn't match. */
function parseKeyValue(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx === -1) return null;
  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();
  if (!key) return null;
  return { key, value };
}

/**
 * Parse the signed claim message into a structured shape. Performs
 * shape, length, and content checks but does NOT verify the
 * signature (that's verifyClaimSignature).
 *
 * Message format (one key: value per line):
 *
 *   I claim ownership of this wallet operating an agent on TensorFeed.ai.
 *
 *   wallet: 0x...
 *   timestamp: 2026-05-13T20:00:00Z
 *   nonce: deadbeef0123456789abcdef01234567
 *   display_name: Agent X
 *   operator_url: https://example.com
 *   contact: hello@example.com
 *
 *   # Optional directory fields:
 *   available_for_hire: true
 *   hourly_rate_min_usd: 50
 *   hourly_rate_max_usd: 200
 *   expanded_description: I do data analysis and research.
 *   skills_tags: research, data-analysis
 *   service_areas: research, data
 *   languages: en, ja
 *   years_experience: 3
 *
 * The header text is fixed and informational; we don't enforce it
 * exactly so future TF rewordings don't invalidate prior claims.
 * The key: value lines are what's parsed.
 */
export function parseClaimMessage(message: string): ClaimValidationResult {
  if (typeof message !== 'string' || message.length === 0 || message.length > 4096) {
    return { ok: false, error: 'invalid_message_shape', detail: 'message empty or too long' };
  }
  const map = new Map<string, string>();
  for (const rawLine of message.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const kv = parseKeyValue(line);
    if (!kv) continue; // non-kv lines (header text) are ignored
    map.set(kv.key, kv.value);
  }

  // Required: wallet
  const walletRaw = map.get('wallet');
  if (!walletRaw || !isAddress(walletRaw)) {
    return { ok: false, error: 'invalid_wallet' };
  }
  let walletChecksummed: Address;
  try {
    walletChecksummed = getAddress(walletRaw);
  } catch {
    return { ok: false, error: 'invalid_wallet' };
  }

  // Required: timestamp
  const timestamp = map.get('timestamp');
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
    return { ok: false, error: 'invalid_timestamp' };
  }

  // Required: nonce
  const nonce = map.get('nonce');
  if (!nonce || !NONCE_RE.test(nonce)) {
    return { ok: false, error: 'invalid_nonce' };
  }

  // Required: display_name
  const display_name = map.get('display_name');
  if (!display_name) {
    return { ok: false, error: 'missing_display_name' };
  }
  if (display_name.length > MAX_DISPLAY_NAME_LEN) {
    return { ok: false, error: 'display_name_too_long' };
  }
  if (!DISPLAY_NAME_ALLOWED_RE.test(display_name)) {
    return { ok: false, error: 'display_name_invalid_chars' };
  }

  // Optional: operator_url
  const operator_url_raw = map.get('operator_url');
  let operator_url: string | null = null;
  if (operator_url_raw && operator_url_raw !== '' && operator_url_raw !== 'null') {
    if (operator_url_raw.length > MAX_OPERATOR_URL_LEN || !HTTPS_URL_RE.test(operator_url_raw)) {
      return { ok: false, error: 'operator_url_invalid' };
    }
    operator_url = operator_url_raw;
  }

  // Optional: contact
  const contact_raw = map.get('contact');
  let contact: string | null = null;
  if (contact_raw && contact_raw !== '' && contact_raw !== 'null') {
    if (contact_raw.length > MAX_CONTACT_LEN) {
      return { ok: false, error: 'contact_too_long' };
    }
    contact = contact_raw;
  }

  // Directory fields (all optional)
  const available_for_hire = parseBooleanField(map.get('available_for_hire'));

  const hourly_rate_min_usd = parseNumberField(map.get('hourly_rate_min_usd'));
  const hourly_rate_max_usd = parseNumberField(map.get('hourly_rate_max_usd'));
  if (hourly_rate_min_usd !== null && (hourly_rate_min_usd < 0 || hourly_rate_min_usd > MAX_HOURLY_RATE_USD)) {
    return { ok: false, error: 'rate_out_of_range' };
  }
  if (hourly_rate_max_usd !== null && (hourly_rate_max_usd < 0 || hourly_rate_max_usd > MAX_HOURLY_RATE_USD)) {
    return { ok: false, error: 'rate_out_of_range' };
  }
  if (
    hourly_rate_min_usd !== null &&
    hourly_rate_max_usd !== null &&
    hourly_rate_min_usd > hourly_rate_max_usd
  ) {
    return { ok: false, error: 'rate_min_gt_max' };
  }

  const expanded_description_raw = map.get('expanded_description');
  let expanded_description: string | null = null;
  if (expanded_description_raw && expanded_description_raw !== '' && expanded_description_raw !== 'null') {
    if (expanded_description_raw.length > MAX_EXPANDED_DESCRIPTION_LEN) {
      return { ok: false, error: 'expanded_description_too_long' };
    }
    if (!EXPANDED_DESCRIPTION_ALLOWED_RE.test(expanded_description_raw)) {
      return { ok: false, error: 'expanded_description_invalid_chars' };
    }
    expanded_description = expanded_description_raw;
  }

  const skills_tags_raw = map.get('skills_tags') ?? '';
  const skills_tags = splitAndLowercaseTags(skills_tags_raw);
  if (skills_tags.length > MAX_SKILLS_TAGS) {
    return { ok: false, error: 'skills_tags_too_many' };
  }
  for (const tag of skills_tags) {
    if (!SKILLS_TAG_VOCAB.has(tag)) {
      return { ok: false, error: 'skills_tag_unknown', detail: tag };
    }
  }

  const service_areas_raw = map.get('service_areas') ?? '';
  const service_areas = splitAndLowercaseTags(service_areas_raw);
  if (service_areas.length > MAX_SERVICE_AREAS) {
    return { ok: false, error: 'service_areas_too_many' };
  }
  for (const area of service_areas) {
    if (!SERVICE_AREA_VOCAB.has(area)) {
      return { ok: false, error: 'service_area_unknown', detail: area };
    }
  }

  const languages_raw = map.get('languages') ?? '';
  const languages = splitAndLowercaseTags(languages_raw);
  if (languages.length > MAX_LANGUAGES) {
    return { ok: false, error: 'languages_too_many' };
  }
  for (const lang of languages) {
    if (!BCP47_RE.test(lang)) {
      return { ok: false, error: 'language_invalid', detail: lang };
    }
  }

  const years_experience = parseNumberField(map.get('years_experience'));
  if (
    years_experience !== null &&
    (years_experience < 0 || years_experience > MAX_YEARS_EXPERIENCE)
  ) {
    return { ok: false, error: 'years_experience_out_of_range' };
  }

  return {
    ok: true,
    claim: {
      wallet: walletChecksummed,
      timestamp,
      nonce,
      display_name,
      operator_url,
      contact,
      available_for_hire,
      hourly_rate_min_usd,
      hourly_rate_max_usd,
      expanded_description,
      skills_tags,
      service_areas,
      languages,
      years_experience,
    },
  };
}

function parseBooleanField(raw: string | undefined): boolean | null {
  if (!raw || raw === '') return null;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  return null;
}

function parseNumberField(raw: string | undefined): number | null {
  if (!raw || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function splitAndLowercaseTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

// === Replay protection ===

/**
 * Reject signatures whose timestamp is more than CLAIM_MAX_AGE_MS in
 * the past (replayed) OR more than 60s in the future (clock skew).
 * Nonce uniqueness is enforced at the KV layer; this function only
 * checks the timestamp window.
 */
export function checkClaimTimestamp(timestamp: string, now: number): boolean {
  const t = Date.parse(timestamp);
  if (!Number.isFinite(t)) return false;
  if (now - t > CLAIM_MAX_AGE_MS) return false;
  if (t - now > 60_000) return false; // tolerate 60s clock skew
  return true;
}

// === Signature verification ===

/**
 * Verify an EIP-191 personal_sign signature. Delegates to viem's
 * `verifyMessage`. Returns true if the signature was produced by the
 * private key controlling `claim.wallet` over the EXACT message
 * string we parsed.
 *
 * Caller is responsible for ensuring `message` is the canonical
 * pre-parse string (not a re-serialized version of the parsed claim).
 */
export async function verifyClaimSignature(
  claim: ParsedClaim,
  message: string,
  signature: `0x${string}`,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: claim.wallet,
      message,
      signature,
    });
  } catch {
    return false;
  }
}
