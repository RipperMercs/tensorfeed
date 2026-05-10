import { Env } from './types';

/**
 * Premium arXiv research feeds (TF Qwen-extracted).
 *
 * Three endpoints share this module. They all read from the same family
 * of KV-stored rollup snapshots produced by an offline pipeline:
 *   1. fetch.py pulls AI/ML preprints from arXiv into a TXT corpus
 *   2. extract.py runs a local Qwen 3.6 27B per-paper structured pass
 *      that produces YAML chunks (subfield_tag, methodology_bucket,
 *      milestone flag, normalized affiliations, keywords, summary)
 *   3. rollup.py deterministically rolls chunks into JSON snapshots
 *   4. Upload script writes those snapshots to KV (separate cron / one-shot)
 *
 * Snapshots stored in TENSORFEED_CACHE under flat keys:
 *   - arxiv-research:rollup_milestones
 *   - arxiv-research:rollup_keywords
 *   - arxiv-research:rollup_topic_search_index
 *
 * Compute that justifies the gate:
 *   - Per-paper subfield + methodology classification (more granular than
 *     OpenAlex topic tags, with a methodology dimension that doesn't
 *     exist anywhere else)
 *   - Conservative milestone detection with structured reasoning
 *   - Emerging-keyword detection by recent-vs-baseline lift over
 *     abstract-derived multi-word keyphrases
 *   - Structured topic search by subfield x methodology x date
 *
 * Cost: 1 credit per call.
 */

// ── KV keys ────────────────────────────────────────────────────────

const KV_KEY_MILESTONES = 'arxiv-research:rollup_milestones';
const KV_KEY_KEYWORDS = 'arxiv-research:rollup_keywords';
const KV_KEY_TOPIC_INDEX = 'arxiv-research:rollup_topic_search_index';

// ── Attribution (shared across all 3 endpoints) ─────────────────────

export interface ArxivResearchAttribution {
  source: string;
  source_url: string;
  license: string;
  derivation: string;
}

export const ARXIV_RESEARCH_ATTRIBUTION: ArxivResearchAttribution = {
  source: 'arXiv (preprint metadata) + TensorFeed Qwen-extracted analytical fields',
  source_url: 'https://arxiv.org',
  license:
    'arXiv title, abstract, authors, and categories are freely usable for research and derived works. Per-paper subfield_tag, methodology_bucket, milestone flag, keyword list, and one-sentence summary are TF derivations from the abstract.',
  derivation:
    'A local Qwen 3.6 27B reads each paper abstract and emits structured YAML following a schema enforced in the extraction prompt. Per-chunk YAMLs are deterministically rolled up into snapshot JSONs (milestones, keywords lift, topic-search index) and stored in KV. No upstream commercial API is touched; the underlying corpus is fetched once via the public arXiv API and processed entirely on TF infrastructure.',
};

// ── Snapshot shapes (mirrors rollup.py output) ─────────────────────

interface MilestonePaperSnapshot {
  arxiv_id: string;
  date: string;
  subfield_tag: string;
  methodology_bucket: string;
  title: string;
  affiliations: string[];
  milestone_reasoning: string;
  summary: string;
}

interface MilestonesSnapshot {
  window_days: number;
  as_of: string;
  papers: MilestonePaperSnapshot[];
}

interface EmergingKeywordEntry {
  keyword: string;
  recent_count: number;
  baseline_count: number;
  lift: number;
  example_arxiv_ids: string[];
}

interface KeywordsSnapshot {
  recent_window_days: number;
  baseline_window_days: number;
  as_of: string;
  keywords: EmergingKeywordEntry[];
}

interface TopicSearchPaper {
  arxiv_id: string;
  date: string;
  title: string;
  subfield_tag: string;
  methodology_bucket: string;
  is_milestone_candidate: boolean;
  affiliations: string[];
  summary: string;
}

interface TopicSearchIndexSnapshot {
  as_of: string;
  papers: TopicSearchPaper[];
  subfield_tags: string[];
  methodology_buckets: string[];
}

// ── Public result types ─────────────────────────────────────────────

export interface MilestonesResult {
  ok: true;
  capturedAt: string;
  window_days: number;
  total: number;
  papers: MilestonePaperSnapshot[];
  attribution: ArxivResearchAttribution;
}

export interface EmergingKeywordsResult {
  ok: true;
  capturedAt: string;
  recent_window_days: number;
  baseline_window_days: number;
  total: number;
  keywords: EmergingKeywordEntry[];
  attribution: ArxivResearchAttribution;
}

export interface TopicSearchResult {
  ok: true;
  capturedAt: string;
  query: TopicSearchQuery;
  total_matches: number;
  returned: number;
  papers: TopicSearchPaper[];
  attribution: ArxivResearchAttribution;
}

export interface TopicSearchQuery {
  subfield_tag: string | null;
  methodology_bucket: string | null;
  since: string | null;
  until: string | null;
  milestone_only: boolean;
  limit: number;
  offset: number;
}

export interface ResearchArxivError {
  ok: false;
  error: string;
  hint?: string;
  valid?: string[];
}

// ── Snapshot loading ─────────────────────────────────────────────────

async function loadSnapshot<T>(env: Env, key: string): Promise<T | null> {
  return (await env.TENSORFEED_CACHE.get(key, 'json')) as T | null;
}

// ── computeMilestones ────────────────────────────────────────────────

export async function computeMilestones(env: Env): Promise<MilestonesResult | ResearchArxivError> {
  const snap = await loadSnapshot<MilestonesSnapshot>(env, KV_KEY_MILESTONES);
  if (!snap) {
    return {
      ok: false,
      error: 'no_snapshot_yet',
      hint: 'arXiv research rollups have not been uploaded yet. After the next Qwen extraction round wraps and the upload script runs, this endpoint will populate.',
    };
  }
  return {
    ok: true,
    capturedAt: snap.as_of,
    window_days: snap.window_days,
    total: snap.papers.length,
    papers: snap.papers,
    attribution: ARXIV_RESEARCH_ATTRIBUTION,
  };
}

// ── computeEmergingKeywords ─────────────────────────────────────────

export async function computeEmergingKeywords(env: Env): Promise<EmergingKeywordsResult | ResearchArxivError> {
  const snap = await loadSnapshot<KeywordsSnapshot>(env, KV_KEY_KEYWORDS);
  if (!snap) {
    return {
      ok: false,
      error: 'no_snapshot_yet',
      hint: 'arXiv research rollups have not been uploaded yet. After the next Qwen extraction round wraps and the upload script runs, this endpoint will populate.',
    };
  }
  return {
    ok: true,
    capturedAt: snap.as_of,
    recent_window_days: snap.recent_window_days,
    baseline_window_days: snap.baseline_window_days,
    total: snap.keywords.length,
    keywords: snap.keywords,
    attribution: ARXIV_RESEARCH_ATTRIBUTION,
  };
}

// ── computeTopicSearch ──────────────────────────────────────────────

export interface TopicSearchInput {
  subfield_tag?: string;
  methodology_bucket?: string;
  since?: string;
  until?: string;
  milestone_only?: boolean;
  limit?: number;
  offset?: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface TopicSearchValidationFailure {
  ok: false;
  error: string;
  hint?: string;
  valid?: string[];
}

/**
 * Validate the search params synchronously. Returns null if all params are
 * shaped correctly, or a failure descriptor if not. Caller wires the
 * descriptor into premiumValidationFailure.
 */
export function validateTopicSearchInput(input: TopicSearchInput, indexSubfields: string[] | null, indexMethodologies: string[] | null): TopicSearchValidationFailure | null {
  if (input.subfield_tag != null && indexSubfields && !indexSubfields.includes(input.subfield_tag)) {
    return {
      ok: false,
      error: 'invalid_subfield_tag',
      valid: indexSubfields,
    };
  }
  if (input.methodology_bucket != null && indexMethodologies && !indexMethodologies.includes(input.methodology_bucket)) {
    return {
      ok: false,
      error: 'invalid_methodology_bucket',
      valid: indexMethodologies,
    };
  }
  if (input.since != null && !ISO_DATE_RE.test(input.since)) {
    return { ok: false, error: 'invalid_since', hint: 'since must be YYYY-MM-DD' };
  }
  if (input.until != null && !ISO_DATE_RE.test(input.until)) {
    return { ok: false, error: 'invalid_until', hint: 'until must be YYYY-MM-DD' };
  }
  if (input.since != null && input.until != null && input.since > input.until) {
    return { ok: false, error: 'invalid_date_range', hint: 'since must be <= until' };
  }
  if (input.limit != null && (!Number.isFinite(input.limit) || input.limit < 1 || input.limit > MAX_LIMIT)) {
    return { ok: false, error: 'invalid_limit', hint: `limit must be an integer between 1 and ${MAX_LIMIT}` };
  }
  if (input.offset != null && (!Number.isFinite(input.offset) || input.offset < 0)) {
    return { ok: false, error: 'invalid_offset', hint: 'offset must be a non-negative integer' };
  }
  return null;
}

export async function computeTopicSearch(
  env: Env,
  input: TopicSearchInput,
): Promise<TopicSearchResult | ResearchArxivError> {
  const snap = await loadSnapshot<TopicSearchIndexSnapshot>(env, KV_KEY_TOPIC_INDEX);
  if (!snap) {
    return {
      ok: false,
      error: 'no_snapshot_yet',
      hint: 'arXiv research rollups have not been uploaded yet. After the next Qwen extraction round wraps and the upload script runs, this endpoint will populate.',
    };
  }

  const subfields = snap.subfield_tags || [];
  const methodologies = snap.methodology_buckets || [];

  const since = input.since ?? null;
  const until = input.until ?? null;
  const subfield = input.subfield_tag ?? null;
  const methodology = input.methodology_bucket ?? null;
  const milestoneOnly = !!input.milestone_only;
  const limit = input.limit ?? DEFAULT_LIMIT;
  const offset = input.offset ?? 0;

  const filtered: TopicSearchPaper[] = [];
  for (const p of snap.papers) {
    if (subfield && p.subfield_tag !== subfield) continue;
    if (methodology && p.methodology_bucket !== methodology) continue;
    if (milestoneOnly && !p.is_milestone_candidate) continue;
    if (since && p.date < since) continue;
    if (until && p.date > until) continue;
    filtered.push(p);
  }

  // Sort by date descending so most-recent matches lead.
  filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const page = filtered.slice(offset, offset + limit);

  return {
    ok: true,
    capturedAt: snap.as_of,
    query: {
      subfield_tag: subfield,
      methodology_bucket: methodology,
      since,
      until,
      milestone_only: milestoneOnly,
      limit,
      offset,
    },
    total_matches: filtered.length,
    returned: page.length,
    papers: page,
    attribution: ARXIV_RESEARCH_ATTRIBUTION,
  };
}

// Exposed for the route handler to validate before calling computeTopicSearch.
export async function loadTopicSearchTaxonomies(env: Env): Promise<{ subfields: string[]; methodologies: string[] } | null> {
  const snap = await loadSnapshot<TopicSearchIndexSnapshot>(env, KV_KEY_TOPIC_INDEX);
  if (!snap) return null;
  return {
    subfields: snap.subfield_tags || [],
    methodologies: snap.methodology_buckets || [],
  };
}
