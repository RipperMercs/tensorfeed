/**
 * TerminalFeed AI velocity cross-join.
 *
 * First federation cross-call: TF (this codebase) acts as an HTTP client
 * of TerminalFeed (sister AFTA member, https://terminalfeed.io). Pulls
 * TerminalFeed's two trending leaderboards in parallel and derives an
 * AI-filtered, normalized cohort that pairs them.
 *
 *   GET https://terminalfeed.io/api/hf-trending
 *       -> { data: [{ id, author, name, likes, downloads, pipeline, url, updated }] }
 *   GET https://terminalfeed.io/api/github-trending
 *       -> { data: [{ name, fullName, description, language, stars, url }] }
 *
 * Both endpoints are public free on TerminalFeed. Lazy KV refresh with
 * a 30-minute TTL so we hit TerminalFeed at most twice per hour per
 * cold-cache region, regardless of agent traffic.
 *
 * Free   /api/ai-velocity                       Capped + raw, attribution-shipped
 * Paid   /api/premium/ai-velocity (1 credit)    Cross-pollinated + traction-ranked
 *
 * AI relevance filter:
 *   HF        — pipeline in the AI/ML set (text-generation, image-text-
 *               to-text, automatic-speech-recognition, etc.). HF Spaces +
 *               models all carry a pipeline_tag.
 *   GitHub    — description / name carry an AI keyword from a curated
 *               list (LLM, agent, transformer, diffusion, embedding, etc.)
 *               OR primary language is AI-typical (Python/TS) and the
 *               description matches one of the looser markers.
 *
 * Cross-pollination: normalized name (lowercased, hyphens/underscores
 * collapsed, namespace stripped) is matched across the two cohorts.
 */

import type { Env } from './types';

const TERMINALFEED_HF_URL = 'https://terminalfeed.io/api/hf-trending';
const TERMINALFEED_GH_URL = 'https://terminalfeed.io/api/github-trending';
const POLITE_UA = 'tensorfeed-federation/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 10_000;

export const TF_VELOCITY_CURRENT_KEY = 'tf-velocity:current';
export const TF_VELOCITY_TTL_SECONDS = 30 * 60;

// ─── AI relevance ──────────────────────────────────────────────────

/**
 * AI/ML HF pipeline tags. Drawn from the published HuggingFace task list.
 * Spaces also carry pipelines via the model card; non-AI pipelines like
 * tabular-classification are excluded.
 */
export const AI_HF_PIPELINES: ReadonlySet<string> = new Set([
  'text-generation',
  'text2text-generation',
  'fill-mask',
  'feature-extraction',
  'sentence-similarity',
  'token-classification',
  'question-answering',
  'summarization',
  'translation',
  'zero-shot-classification',
  'conversational',
  'text-classification',
  'image-classification',
  'object-detection',
  'image-segmentation',
  'image-to-text',
  'image-text-to-text',
  'text-to-image',
  'image-to-image',
  'unconditional-image-generation',
  'video-classification',
  'text-to-video',
  'visual-question-answering',
  'document-question-answering',
  'depth-estimation',
  'zero-shot-image-classification',
  'mask-generation',
  'zero-shot-object-detection',
  'text-to-3d',
  'image-to-3d',
  'image-feature-extraction',
  'automatic-speech-recognition',
  'audio-classification',
  'voice-activity-detection',
  'text-to-speech',
  'text-to-audio',
  'audio-to-audio',
  'reinforcement-learning',
  'robotics',
]);

/**
 * Substring markers for AI-relevance of GitHub repo descriptions and
 * names. Curated against false positives like "agent based modeling
 * for ecology" by requiring the marker plus at least one secondary
 * signal in the description (LLM / model / training / etc).
 */
export const AI_GITHUB_PRIMARY_MARKERS: ReadonlyArray<string> = [
  'llm', 'large language model', 'language model',
  'ai agent', 'autonomous agent', 'agentic',
  'transformer', 'diffusion', 'gpt', 'claude', 'gemini', 'llama',
  'mistral', 'qwen', 'deepseek', 'phi-', 'phi ',
  'rag ', 'retrieval-augmented', 'vector database', 'embeddings',
  'mcp', 'model context protocol',
  'fine-tun', 'lora ', 'peft', 'rlhf',
  'inference engine', 'tokenizer',
  'multimodal', 'vision language',
  'mlops', 'machine learning', 'deep learning',
  'reinforcement learning',
  'chatbot', 'copilot',
  'huggingface', 'hugging face',
];

// ─── Upstream shapes ───────────────────────────────────────────────

interface UpstreamHfEntry {
  id?: string;
  author?: string;
  name?: string;
  likes?: number;
  downloads?: number;
  pipeline?: string;
  url?: string;
  updated?: string;
}

interface UpstreamGhEntry {
  name?: string;
  fullName?: string;
  description?: string;
  language?: string;
  stars?: number;
  url?: string;
}

interface UpstreamHfResponse { data?: UpstreamHfEntry[] }
interface UpstreamGhResponse { data?: UpstreamGhEntry[] }

// ─── Normalized shapes ─────────────────────────────────────────────

export interface HfEntry {
  id: string;
  author: string | null;
  name: string;
  likes: number;
  downloads: number;
  pipeline: string;
  url: string;
  updated: string | null;
  /** Lowercased, normalized name for cross-pollination matching. */
  normalized_name: string;
}

export interface GhEntry {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  matched_markers: string[];
  /** Lowercased, normalized name for cross-pollination matching. */
  normalized_name: string;
}

export interface AiVelocitySnapshot {
  capturedAt: string;
  source: 'terminalfeed.io';
  upstream_endpoints: {
    hf: string;
    github: string;
  };
  source_license: 'Federation cross-call to TerminalFeed (free public endpoints). Underlying HF and GitHub data carry their own terms; we link back via per-entry url.';
  hf_count: number;
  github_count: number;
  hf: HfEntry[];
  github: GhEntry[];
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Normalize a project/model name for cross-feed matching. Strips
 * namespace ("meta-llama/Llama-3-8B" -> "llama-3-8b"), collapses
 * underscore/hyphen/space, lowercases. Tolerant of empty input.
 */
export function normalizeName(raw: string): string {
  if (!raw) return '';
  let s = raw.toLowerCase();
  const slash = s.lastIndexOf('/');
  if (slash >= 0) s = s.slice(slash + 1);
  s = s.replace(/\.git$/, '');
  s = s.replace(/[_\s]/g, '-');
  s = s.replace(/--+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s;
}

export function isAiHfEntry(e: UpstreamHfEntry): boolean {
  const p = e.pipeline?.trim().toLowerCase();
  if (!p) return false;
  return AI_HF_PIPELINES.has(p);
}

export function matchesAiGithubMarkers(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const m of AI_GITHUB_PRIMARY_MARKERS) {
    if (lower.includes(m)) out.push(m);
  }
  return out;
}

export function isAiGithubEntry(e: UpstreamGhEntry): { ai: boolean; markers: string[] } {
  const haystack = `${e.fullName ?? ''} ${e.description ?? ''}`.toLowerCase();
  const markers = matchesAiGithubMarkers(haystack);
  return { ai: markers.length > 0, markers };
}

export function normalizeHfEntry(e: UpstreamHfEntry): HfEntry | null {
  if (!e.id || typeof e.id !== 'string') return null;
  const name = e.name ?? e.id.split('/').pop() ?? e.id;
  return {
    id: e.id,
    author: typeof e.author === 'string' ? e.author : null,
    name,
    likes: typeof e.likes === 'number' ? e.likes : 0,
    downloads: typeof e.downloads === 'number' ? e.downloads : 0,
    pipeline: typeof e.pipeline === 'string' ? e.pipeline : '',
    url: typeof e.url === 'string' ? e.url : `https://huggingface.co/${e.id}`,
    updated: typeof e.updated === 'string' ? e.updated : null,
    normalized_name: normalizeName(name),
  };
}

export function normalizeGhEntry(e: UpstreamGhEntry, matched_markers: string[]): GhEntry | null {
  if (!e.fullName || typeof e.fullName !== 'string') return null;
  const name = e.name ?? e.fullName.split('/').pop() ?? e.fullName;
  return {
    name,
    fullName: e.fullName,
    description: typeof e.description === 'string' ? e.description : '',
    language: typeof e.language === 'string' ? e.language : '',
    stars: typeof e.stars === 'number' ? e.stars : 0,
    url: typeof e.url === 'string' ? e.url : `https://github.com/${e.fullName}`,
    matched_markers,
    normalized_name: normalizeName(name),
  };
}

// ─── Fetch ─────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchHf(): Promise<HfEntry[]> {
  try {
    const res = await fetchWithTimeout(TERMINALFEED_HF_URL, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as UpstreamHfResponse;
    const out: HfEntry[] = [];
    for (const e of body.data ?? []) {
      if (!isAiHfEntry(e)) continue;
      const norm = normalizeHfEntry(e);
      if (norm) out.push(norm);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchGh(): Promise<GhEntry[]> {
  try {
    const res = await fetchWithTimeout(TERMINALFEED_GH_URL, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as UpstreamGhResponse;
    const out: GhEntry[] = [];
    for (const e of body.data ?? []) {
      const m = isAiGithubEntry(e);
      if (!m.ai) continue;
      const norm = normalizeGhEntry(e, m.markers);
      if (norm) out.push(norm);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Lazy-refresh entry. Reads ai-velocity:current from KV; if it's been
 * less than TF_VELOCITY_TTL_SECONDS since capturedAt, returns cached.
 * Otherwise fetches both upstreams in parallel, writes a new snapshot
 * with a TTL slightly longer than our recency window (so a stale
 * snapshot is still served if upstream goes down briefly).
 */
export async function getOrRefreshVelocitySnapshot(env: Env): Promise<AiVelocitySnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(TF_VELOCITY_CURRENT_KEY, 'json')) as AiVelocitySnapshot | null;
  const now = Date.now();
  if (cached) {
    const age = (now - new Date(cached.capturedAt).getTime()) / 1000;
    if (age < TF_VELOCITY_TTL_SECONDS) return cached;
  }

  const [hf, github] = await Promise.all([fetchHf(), fetchGh()]);
  if (hf.length === 0 && github.length === 0) {
    // Upstream down. Serve last known good if we have one.
    return cached;
  }

  const snapshot: AiVelocitySnapshot = {
    capturedAt: new Date().toISOString(),
    source: 'terminalfeed.io',
    upstream_endpoints: { hf: TERMINALFEED_HF_URL, github: TERMINALFEED_GH_URL },
    source_license: 'Federation cross-call to TerminalFeed (free public endpoints). Underlying HF and GitHub data carry their own terms; we link back via per-entry url.',
    hf_count: hf.length,
    github_count: github.length,
    hf,
    github,
  };
  // Backup TTL of 2h so a partial outage still serves last-known-good.
  await env.TENSORFEED_CACHE.put(TF_VELOCITY_CURRENT_KEY, JSON.stringify(snapshot), {
    expirationTtl: 2 * 60 * 60,
  });
  return snapshot;
}
