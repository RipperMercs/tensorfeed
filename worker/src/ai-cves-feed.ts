/**
 * ai-cves: ingest, KV layout, raw reads, AI-stack categorization.
 *
 * Sister module to premium-ai-cves.ts (derivations). This file owns the
 * ingest endpoint validation, the KV schema, and the curated
 * AI_STACK_VENDORS list. The premium module imports from here and never
 * touches KV writes directly (two-file split per the premium-derivation
 * pattern, so the free contract stays edge-cacheable and the premium
 * paths can recompute on every request without invalidating the cache).
 *
 * DP CC's Qwen-on-5090 pipeline POSTs JSON batches to
 * /api/admin/ai-cves/ingest. The handler delegates all validation +
 * KV writes here. See For_DP_CC_ai-cves-ingest-contract.md for the
 * client-side handoff spec.
 *
 * Source licensing: 99.8% of papers in the inaugural batch come from
 * GitHub Security Advisories (CC BY 4.0). Attribution is shipped on
 * every public response via the constants below.
 */

import type { Env } from './types';

// ─── KV schema ──────────────────────────────────────────────────────

export const KEY_LATEST = 'ai-cves:latest';
export const KEY_BATCH_PREFIX = 'ai-cves:batch:';
export const KEY_CVE_INDEX = 'ai-cves:cve-index';
export const KEY_AI_FLAGGED = 'ai-cves:ai-flagged';

/** 90 days. Rolling history without unbounded growth. */
export const BATCH_TTL_S = 90 * 24 * 60 * 60;

// ─── Attribution (CC BY 4.0 requirement) ────────────────────────────

export const SOURCE_LICENSE = 'CC BY 4.0';
export const SOURCE_ATTRIBUTION =
  'GitHub Advisory Database (github.com/advisories) + vendor advisories';

// ─── Paper + batch shapes ───────────────────────────────────────────

export type ExploitedInWild = 'stated_yes' | 'stated_no' | 'unstated';

export interface AiCvesPaper {
  cve_ids: string[];
  affected_products: string[];
  affected_version_ranges: string[];
  fixed_versions: string[];
  exploited_in_wild: ExploitedInWild;
  severity_label: string;
  source_url: string;
  /** Provenance metadata. Stored but currently omitted from public reads
   * (pending DP CC's normalize.py span-cleaning patch in job #78). */
  quote_spans: { exploited_in_wild: string; severity_label: string };
}

export interface AiCvesBatch {
  batch_id: string;
  extracted_at: string;
  window_start: string;
  window_end: string;
  model: string;
  papers: AiCvesPaper[];
}

// ─── Validation ─────────────────────────────────────────────────────

export const MAX_PAPERS_PER_BATCH = 5000;

const VALID_EXPLOITED = new Set<string>(['stated_yes', 'stated_no', 'unstated']);
const EM_DASH = '—';

export interface ValidationOk {
  ok: true;
  batch: AiCvesBatch;
}
export interface ValidationErr {
  ok: false;
  error: string;
  detail: string;
}
export type ValidationResult = ValidationOk | ValidationErr;

function failV(error: string, detail: string): ValidationErr {
  return { ok: false, error, detail };
}

/**
 * Validate an ingest payload. Returns ValidationOk with a typed batch
 * or ValidationErr with a precise message. No exceptions thrown.
 */
export function validateBatch(input: unknown): ValidationResult {
  if (input === null || typeof input !== 'object') {
    return failV('validation_failed', 'Body must be a JSON object.');
  }
  const b = input as Record<string, unknown>;

  for (const k of ['batch_id', 'extracted_at', 'window_start', 'window_end', 'model']) {
    if (typeof b[k] !== 'string' || (b[k] as string).length === 0) {
      return failV('validation_failed', `Field "${k}" must be a non-empty string.`);
    }
  }

  if (!Array.isArray(b.papers)) {
    return failV('validation_failed', 'Field "papers" must be an array.');
  }
  const papers = b.papers as unknown[];
  if (papers.length === 0) {
    return failV('validation_failed', 'Field "papers" must be non-empty.');
  }
  if (papers.length > MAX_PAPERS_PER_BATCH) {
    return failV(
      'validation_failed',
      `papers length ${papers.length} exceeds max ${MAX_PAPERS_PER_BATCH}. Split into multiple POSTs with batch_id suffixes (-part01, -part02, ...).`,
    );
  }

  const validated: AiCvesPaper[] = [];
  for (let i = 0; i < papers.length; i++) {
    const r = validatePaper(papers[i], i);
    if (!r.ok) return r;
    validated.push(r.paper);
  }

  return {
    ok: true,
    batch: {
      batch_id: b.batch_id as string,
      extracted_at: b.extracted_at as string,
      window_start: b.window_start as string,
      window_end: b.window_end as string,
      model: b.model as string,
      papers: validated,
    },
  };
}

interface PaperOk {
  ok: true;
  paper: AiCvesPaper;
}
function validatePaper(p: unknown, idx: number): PaperOk | ValidationErr {
  if (p === null || typeof p !== 'object') {
    return failV('validation_failed', `papers[${idx}] must be an object.`);
  }
  const r = p as Record<string, unknown>;

  for (const k of ['cve_ids', 'affected_products', 'affected_version_ranges', 'fixed_versions']) {
    if (!Array.isArray(r[k])) {
      return failV('validation_failed', `papers[${idx}].${k} must be an array.`);
    }
    for (let j = 0; j < (r[k] as unknown[]).length; j++) {
      const el = (r[k] as unknown[])[j];
      if (typeof el !== 'string') {
        return failV(
          'validation_failed',
          `papers[${idx}].${k}[${j}] must be a string.`,
        );
      }
      if (el.includes(EM_DASH) || el.includes('--')) {
        return failV(
          'validation_failed',
          `papers[${idx}].${k}[${j}] contains em-dash or double-hyphen (post-processor should strip these).`,
        );
      }
    }
  }

  if (typeof r.exploited_in_wild !== 'string' || !VALID_EXPLOITED.has(r.exploited_in_wild)) {
    return failV(
      'validation_failed',
      `papers[${idx}].exploited_in_wild must be one of stated_yes|stated_no|unstated, got ${JSON.stringify(r.exploited_in_wild)}.`,
    );
  }

  if (typeof r.severity_label !== 'string') {
    return failV('validation_failed', `papers[${idx}].severity_label must be a string.`);
  }
  if (r.severity_label.includes(EM_DASH) || r.severity_label.includes('--')) {
    return failV(
      'validation_failed',
      `papers[${idx}].severity_label contains em-dash or double-hyphen (post-processor should strip these).`,
    );
  }

  if (typeof r.source_url !== 'string' || !r.source_url.startsWith('https://')) {
    return failV(
      'validation_failed',
      `papers[${idx}].source_url must be an https:// URL.`,
    );
  }
  try {
    new URL(r.source_url);
  } catch {
    return failV('validation_failed', `papers[${idx}].source_url is not a parseable URL.`);
  }

  const qs = r.quote_spans;
  if (
    qs === null ||
    typeof qs !== 'object' ||
    typeof (qs as Record<string, unknown>).exploited_in_wild !== 'string' ||
    typeof (qs as Record<string, unknown>).severity_label !== 'string'
  ) {
    return failV(
      'validation_failed',
      `papers[${idx}].quote_spans must be { exploited_in_wild: string, severity_label: string }.`,
    );
  }

  return {
    ok: true,
    paper: {
      cve_ids: r.cve_ids as string[],
      affected_products: r.affected_products as string[],
      affected_version_ranges: r.affected_version_ranges as string[],
      fixed_versions: r.fixed_versions as string[],
      exploited_in_wild: r.exploited_in_wild as ExploitedInWild,
      severity_label: r.severity_label as string,
      source_url: r.source_url as string,
      quote_spans: {
        exploited_in_wild: (qs as Record<string, string>).exploited_in_wild,
        severity_label: (qs as Record<string, string>).severity_label,
      },
    },
  };
}

// ─── AI_STACK_VENDORS curated list ──────────────────────────────────

export type AiCategory =
  | 'inference-stack'
  | 'agent-framework'
  | 'training-stack'
  | 'vector-db'
  | 'model-gateway'
  | 'mcp-tool'
  | 'other-ai';

interface VendorMatcher {
  needle: string;
  category: AiCategory;
}

/**
 * Curated AI-stack vendor list. Match logic: case-insensitive substring
 * on `affected_products[]`. First match wins (so order matters where a
 * single product might fall in two categories). Governance: future
 * additions via PR with citation showing AI-stack relevance.
 */
export const AI_STACK_VENDORS: ReadonlyArray<VendorMatcher> = [
  // inference-stack
  { needle: 'vllm', category: 'inference-stack' },
  { needle: 'llama.cpp', category: 'inference-stack' },
  { needle: 'ggml', category: 'inference-stack' },
  { needle: 'ollama', category: 'inference-stack' },
  { needle: 'mlc-llm', category: 'inference-stack' },
  { needle: 'mlc llm', category: 'inference-stack' },
  { needle: 'tensorrt', category: 'inference-stack' },
  { needle: 'triton inference', category: 'inference-stack' },

  // agent-framework
  { needle: 'langchain', category: 'agent-framework' },
  { needle: 'langgraph', category: 'agent-framework' },
  { needle: 'llamaindex', category: 'agent-framework' },
  { needle: 'llama-index', category: 'agent-framework' },
  { needle: 'autogen', category: 'agent-framework' },
  { needle: 'crewai', category: 'agent-framework' },
  { needle: 'haystack', category: 'agent-framework' },
  { needle: 'semantic kernel', category: 'agent-framework' },
  { needle: 'model context protocol', category: 'agent-framework' },
  { needle: 'mcp server', category: 'agent-framework' },

  // training-stack
  { needle: 'pytorch', category: 'training-stack' },
  { needle: 'tensorflow', category: 'training-stack' },
  { needle: 'jax', category: 'training-stack' },
  { needle: 'transformers', category: 'training-stack' },
  { needle: 'deepspeed', category: 'training-stack' },
  { needle: 'megatron', category: 'training-stack' },
  { needle: 'flashattention', category: 'training-stack' },
  { needle: 'lightning', category: 'training-stack' },
  { needle: 'axolotl', category: 'training-stack' },

  // vector-db
  { needle: 'pinecone', category: 'vector-db' },
  { needle: 'weaviate', category: 'vector-db' },
  { needle: 'chroma', category: 'vector-db' },
  { needle: 'qdrant', category: 'vector-db' },
  { needle: 'milvus', category: 'vector-db' },
  { needle: 'pgvector', category: 'vector-db' },
  { needle: 'lancedb', category: 'vector-db' },
  { needle: 'vespa', category: 'vector-db' },

  // model-gateway
  { needle: 'anthropic', category: 'model-gateway' },
  { needle: 'openai', category: 'model-gateway' },
  { needle: 'cohere', category: 'model-gateway' },
  { needle: 'mistral', category: 'model-gateway' },
  { needle: 'vertex ai', category: 'model-gateway' },
  { needle: 'bedrock', category: 'model-gateway' },
  { needle: 'azure openai', category: 'model-gateway' },
  { needle: 'hugging face', category: 'model-gateway' },
  { needle: 'huggingface', category: 'model-gateway' },
  { needle: 'together ai', category: 'model-gateway' },
  { needle: 'groq', category: 'model-gateway' },
  { needle: 'openrouter', category: 'model-gateway' },
  { needle: 'fireworks', category: 'model-gateway' },
  { needle: 'replicate', category: 'model-gateway' },

  // mcp-tool
  { needle: 'claude desktop', category: 'mcp-tool' },
  { needle: 'cline', category: 'mcp-tool' },
  { needle: 'continue.dev', category: 'mcp-tool' },
  { needle: 'cursor', category: 'mcp-tool' },
  { needle: 'windsurf', category: 'mcp-tool' },
  { needle: 'zed ai', category: 'mcp-tool' },
];

/**
 * Returns the first matching AI category for a product string, or null
 * if no curated vendor matches. Case-insensitive.
 */
export function classifyProduct(product: string): AiCategory | null {
  const p = product.toLowerCase();
  for (const v of AI_STACK_VENDORS) {
    if (p.includes(v.needle)) return v.category;
  }
  return null;
}

/**
 * A paper is AI-flagged if ANY of its affected_products classifies into
 * a curated category. Returns the first matched category (so callers
 * can use the value as the paper's primary tag).
 */
export function classifyPaper(paper: AiCvesPaper): AiCategory | null {
  for (const product of paper.affected_products) {
    const c = classifyProduct(product);
    if (c) return c;
  }
  return null;
}

// ─── KV writes (called by ingest handler) ───────────────────────────

export interface IngestResult {
  batch_id: string;
  papers_ingested: number;
  ai_flagged_count: number;
  indexed_cves: number;
}

/**
 * Write a validated batch to KV. Writes 4 keys atomically-ish (KV is
 * eventual; we accept a tiny window where latest points at a batch that
 * hasn't fully propagated). Idempotent on batch_id: re-POSTing the same
 * batch_id overwrites.
 */
export async function writeBatch(env: Env, batch: AiCvesBatch): Promise<IngestResult> {
  // 1. Full batch.
  await env.TENSORFEED_NEWS.put(
    `${KEY_BATCH_PREFIX}${batch.batch_id}`,
    JSON.stringify(batch),
    { expirationTtl: BATCH_TTL_S },
  );

  // 2. CVE index. Map CVE id -> { batch_id, paper_index }. Multiple
  //    papers can mention the same CVE; we keep the LAST one seen in
  //    this batch (rare in practice).
  const cveIndex: Record<string, { batch_id: string; paper_index: number }> = {};
  for (let i = 0; i < batch.papers.length; i++) {
    for (const cve of batch.papers[i].cve_ids) {
      cveIndex[cve] = { batch_id: batch.batch_id, paper_index: i };
    }
  }

  // Read existing index and merge (so older batches' CVEs stay
  // resolvable until their batch TTLs expire).
  const existingRaw = await env.TENSORFEED_NEWS.get(KEY_CVE_INDEX);
  const merged: Record<string, { batch_id: string; paper_index: number }> = existingRaw
    ? { ...(JSON.parse(existingRaw) as Record<string, { batch_id: string; paper_index: number }>), ...cveIndex }
    : cveIndex;
  await env.TENSORFEED_NEWS.put(KEY_CVE_INDEX, JSON.stringify(merged), {
    expirationTtl: BATCH_TTL_S,
  });

  // 3. AI-flagged subset. Per-paper attach the matched category so the
  //    premium endpoint can ship the categorization without re-running
  //    the matcher on every read.
  const aiFlagged: Array<AiCvesPaper & { tf_ai_category: AiCategory }> = [];
  for (const paper of batch.papers) {
    const cat = classifyPaper(paper);
    if (cat) aiFlagged.push({ ...paper, tf_ai_category: cat });
  }
  await env.TENSORFEED_NEWS.put(
    KEY_AI_FLAGGED,
    JSON.stringify({ batch_id: batch.batch_id, extracted_at: batch.extracted_at, papers: aiFlagged }),
    { expirationTtl: BATCH_TTL_S },
  );

  // 4. Latest pointer. No TTL (always overwritten by next ingest).
  await env.TENSORFEED_NEWS.put(KEY_LATEST, batch.batch_id);

  return {
    batch_id: batch.batch_id,
    papers_ingested: batch.papers.length,
    ai_flagged_count: aiFlagged.length,
    indexed_cves: Object.keys(cveIndex).length,
  };
}

// ─── KV reads (called by free + premium endpoints) ──────────────────

export async function getLatestBatch(env: Env): Promise<AiCvesBatch | null> {
  const id = await env.TENSORFEED_NEWS.get(KEY_LATEST);
  if (!id) return null;
  const raw = await env.TENSORFEED_NEWS.get(`${KEY_BATCH_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as AiCvesBatch;
}

export async function getBatch(env: Env, batchId: string): Promise<AiCvesBatch | null> {
  const raw = await env.TENSORFEED_NEWS.get(`${KEY_BATCH_PREFIX}${batchId}`);
  if (!raw) return null;
  return JSON.parse(raw) as AiCvesBatch;
}

export async function getCveIndex(
  env: Env,
): Promise<Record<string, { batch_id: string; paper_index: number }> | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_CVE_INDEX);
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, { batch_id: string; paper_index: number }>;
}

export async function getAiFlagged(env: Env): Promise<{
  batch_id: string;
  extracted_at: string;
  papers: Array<AiCvesPaper & { tf_ai_category: AiCategory }>;
} | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_AI_FLAGGED);
  if (!raw) return null;
  return JSON.parse(raw) as {
    batch_id: string;
    extracted_at: string;
    papers: Array<AiCvesPaper & { tf_ai_category: AiCategory }>;
  };
}

// ─── Public-shape helpers (omit quote_spans pending DP CC patch) ────

export type PublicPaper = Omit<AiCvesPaper, 'quote_spans'>;

export function toPublicPaper(p: AiCvesPaper): PublicPaper {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { quote_spans: _qs, ...rest } = p;
  return rest;
}

export function publicAttribution(): { source_license: string; source_attribution: string } {
  return { source_license: SOURCE_LICENSE, source_attribution: SOURCE_ATTRIBUTION };
}
