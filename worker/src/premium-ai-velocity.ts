/**
 * Premium AI velocity (TerminalFeed federation derivation).
 *
 * Derives an agent-decision-ready ranking + cross-pollinated cohort over
 * the TerminalFeed-sourced HF + GitHub trending snapshot
 * (worker/src/terminalfeed-ai-velocity-fetcher.ts).
 *
 * Free /api/ai-velocity returns the raw snapshot (capped). This endpoint
 * answers "what AI projects have the strongest combined traction signal
 * right now" by:
 *   - Unified traction_score per HF entry (likes * 3 + log10(downloads+1) * 10)
 *   - Unified traction_score per GH entry (log10(stars+1) * 30)
 *   - Cross-pollinated set: names appearing in both leaderboards by
 *     normalized-name match (HF model + GitHub repo for the same project)
 *   - Top cohorts by traction_score within each surface
 *   - By-language breakdown for GitHub (which langs dominate AI right now)
 *
 * Cost: 1 credit. Bazaar Wave 8 pilot.
 */

import type {
  AiVelocitySnapshot,
  HfEntry,
  GhEntry,
} from './terminalfeed-ai-velocity-fetcher';

// ─── Filter ────────────────────────────────────────────────────────

export interface VelocityFilter {
  /** Substring (case-insensitive) match against HF pipeline. */
  pipeline: string | null;
  /** Substring match against GitHub primary language. */
  language: string | null;
  /** Minimum traction_score to include in headline rows. Default 0. */
  min_traction: number;
  /** When true, only return items in the cross-pollinated set. */
  cross_only: boolean;
}

export const DEFAULT_MIN_TRACTION = 0;

export function parsePipeline(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseLanguage(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseMinTraction(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_MIN_TRACTION;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return DEFAULT_MIN_TRACTION;
  if (n < 0) return 0;
  if (n > 10000) return 10000;
  return n;
}

export function parseCrossOnly(raw: string | null): boolean {
  if (raw === null) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// ─── Traction scoring ──────────────────────────────────────────────

export interface ScoredHf extends HfEntry {
  traction_score: number;
  on_both: boolean;
}

export interface ScoredGh extends GhEntry {
  traction_score: number;
  on_both: boolean;
}

/**
 * HF traction: likes weighted higher than downloads because likes are
 * scarcer + intentional. The log dampens download outliers (a 100M-
 * download model otherwise drowns out everything).
 */
export function scoreHf(e: HfEntry): number {
  return Math.round((e.likes * 3 + Math.log10(e.downloads + 1) * 10) * 10) / 10;
}

/**
 * GitHub traction: stars are the canonical signal. Log dampens outliers
 * the same way. The 30-coefficient calibrates GH stars roughly in line
 * with HF likes (1 GH star ~ 1 HF like in score terms for top of cohort).
 */
export function scoreGh(e: GhEntry): number {
  return Math.round(Math.log10(e.stars + 1) * 30 * 10) / 10;
}

// ─── Cross-pollination ─────────────────────────────────────────────

export interface CrossPollinatedItem {
  normalized_name: string;
  hf: { id: string; name: string; likes: number; downloads: number; url: string };
  github: { fullName: string; stars: number; language: string; url: string };
  combined_traction: number;
}

export function buildCrossPollinated(hf: ScoredHf[], gh: ScoredGh[]): CrossPollinatedItem[] {
  const ghByName = new Map<string, ScoredGh>();
  for (const g of gh) {
    if (!g.normalized_name) continue;
    if (!ghByName.has(g.normalized_name)) ghByName.set(g.normalized_name, g);
  }
  const out: CrossPollinatedItem[] = [];
  for (const h of hf) {
    if (!h.normalized_name) continue;
    const g = ghByName.get(h.normalized_name);
    if (!g) continue;
    out.push({
      normalized_name: h.normalized_name,
      hf: { id: h.id, name: h.name, likes: h.likes, downloads: h.downloads, url: h.url },
      github: { fullName: g.fullName, stars: g.stars, language: g.language, url: g.url },
      combined_traction: Math.round((h.traction_score + g.traction_score) * 10) / 10,
    });
  }
  out.sort((a, b) => b.combined_traction - a.combined_traction);
  return out;
}

// ─── Response ──────────────────────────────────────────────────────

export interface VelocityResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'terminalfeed.io federation cross-call';
  filter: { pipeline: string | null; language: string | null; min_traction: number; cross_only: boolean };
  cohort_size: { hf: number; github: number; cross_pollinated: number };
  hf_top: ScoredHf[];                          // top 15 by traction_score
  github_top: ScoredGh[];                      // top 15 by traction_score
  cross_pollinated: CrossPollinatedItem[];     // all matches, sorted by combined_traction
  summary: {
    hf_by_pipeline: Record<string, number>;
    github_by_language: Record<string, number>;
    total_hf_likes: number;
    total_github_stars: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

const TOP_N = 15;

export function buildVelocity(
  snapshot: AiVelocitySnapshot,
  filter: VelocityFilter,
): VelocityResponse {
  const pipelineNeedle = filter.pipeline?.toLowerCase();
  const languageNeedle = filter.language?.toLowerCase();

  const hf: ScoredHf[] = snapshot.hf
    .filter((e) => !pipelineNeedle || e.pipeline.toLowerCase().includes(pipelineNeedle))
    .map((e) => ({ ...e, traction_score: scoreHf(e), on_both: false }));

  const gh: ScoredGh[] = snapshot.github
    .filter((e) => !languageNeedle || (e.language ?? '').toLowerCase().includes(languageNeedle))
    .map((e) => ({ ...e, traction_score: scoreGh(e), on_both: false }));

  // Tag on_both via the normalized-name intersection.
  const ghNames = new Set(gh.map((g) => g.normalized_name).filter(Boolean));
  const hfNames = new Set(hf.map((h) => h.normalized_name).filter(Boolean));
  for (const h of hf) h.on_both = ghNames.has(h.normalized_name);
  for (const g of gh) g.on_both = hfNames.has(g.normalized_name);

  const crossPollinated = buildCrossPollinated(hf, gh);

  // Apply min_traction + cross_only AFTER cross-pollination is computed
  // (so cross-only doesn't lose its match pool).
  const passes = (s: { traction_score: number; on_both: boolean }) =>
    s.traction_score >= filter.min_traction && (!filter.cross_only || s.on_both);

  const hfSorted = hf
    .filter(passes)
    .sort((a, b) => b.traction_score - a.traction_score)
    .slice(0, TOP_N);

  const ghSorted = gh
    .filter(passes)
    .sort((a, b) => b.traction_score - a.traction_score)
    .slice(0, TOP_N);

  // Summary rollups computed over the filter-passed sets.
  const hf_by_pipeline: Record<string, number> = {};
  let total_hf_likes = 0;
  for (const h of hf.filter(passes)) {
    hf_by_pipeline[h.pipeline] = (hf_by_pipeline[h.pipeline] ?? 0) + 1;
    total_hf_likes += h.likes;
  }
  const github_by_language: Record<string, number> = {};
  let total_github_stars = 0;
  for (const g of gh.filter(passes)) {
    const lang = g.language || 'Unknown';
    github_by_language[lang] = (github_by_language[lang] ?? 0) + 1;
    total_github_stars += g.stars;
  }

  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    snapshot_captured_at: snapshot.capturedAt,
    source: 'terminalfeed.io federation cross-call',
    filter: { pipeline: filter.pipeline, language: filter.language, min_traction: filter.min_traction, cross_only: filter.cross_only },
    cohort_size: { hf: hfSorted.length, github: ghSorted.length, cross_pollinated: crossPollinated.length },
    hf_top: hfSorted,
    github_top: ghSorted,
    cross_pollinated: crossPollinated,
    summary: { hf_by_pipeline, github_by_language, total_hf_likes, total_github_stars },
    attribution: {
      source: 'TerminalFeed.io (AFTA federation member, sister site). Upstream data: HuggingFace + GitHub trending leaderboards, public.',
      license: 'Federation cross-call to TerminalFeed free endpoints; underlying HF and GitHub data carry their own terms. Each row has a direct url back to the upstream entry.',
      notes: 'Traction score: HF = likes * 3 + log10(downloads+1) * 10; GitHub = log10(stars+1) * 30. Calibrated so a single point of HF likes is roughly equivalent to a single GitHub star at the top of the cohort. Cross-pollination matches normalized names (lowercased, namespace-stripped, hyphens collapsed).',
    },
  };
}
