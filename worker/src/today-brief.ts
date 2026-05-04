import { Env, Article } from './types';
import { HFDailyPapersSnapshot, HFDailyPaper } from './hf-daily-papers';
import { ArxivSnapshot, ArxivPaper } from './arxiv';
import { PapersSnapshot, Paper } from './papers';
import { HFSnapshot } from './hf-trending';
import { HotIssuesSnapshot, HotIssue } from './hot-issues';
import { RedditSnapshot, RedditPost } from './reddit-trending';
import { ORSnapshot } from './openrouter-catalog';
import { ServiceStatus } from './types';

/**
 * Composite "AI ecosystem today" brief.
 *
 * Reads from each free daily feed's KV-backed `getLatestSnapshot` and
 * returns a single structured response covering news, papers, HF
 * top assets, community discussion, the OpenRouter catalog summary,
 * and provider status. Backs `/api/today`.
 *
 * Free, no auth, edge-cached so a thousand agents calling
 * `/api/today` per minute hit the worker once. The MCP server's
 * `get_ai_ecosystem_today` tool calls this endpoint instead of
 * fanning out 9 separate fetches client-side.
 *
 * Pure builder: this module has zero KV access. The handler in
 * index.ts reads the snapshots, then passes them in. That keeps the
 * synthesis testable without mocking KV and lets future callers
 * (sister sites, batch jobs) reuse the function.
 */

export type TodaySection = 'news' | 'papers' | 'hf' | 'community' | 'inference' | 'status';

const ALL_SECTIONS: TodaySection[] = ['news', 'papers', 'hf', 'community', 'inference', 'status'];

export interface TodayInputs {
  // Optional because cold-start tokens / failed fetches yield null.
  // Each section gracefully drops to available=false when its source is null.
  news: Article[] | null;
  papersAITrending: PapersSnapshot | null;
  papersArxivRecent: ArxivSnapshot | null;
  papersHFDaily: HFDailyPapersSnapshot | null;
  hfTrending: HFSnapshot | null;
  hotIssues: HotIssuesSnapshot | null;
  redditTrending: RedditSnapshot | null;
  openrouter: ORSnapshot | null;
  status: ServiceStatus[] | null;
}

export interface TodayBriefSection<T> {
  available: boolean;
  captured_at?: string;
  data: T | null;
}

export interface TodayBriefNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface TodayBriefPapers {
  ai_trending: TodayBriefSection<{ items: Pick<Paper, 'title' | 'authors' | 'year' | 'venue' | 'citationCount' | 'arxivId' | 'url'>[] }>;
  arxiv_recent: TodayBriefSection<{ items: Pick<ArxivPaper, 'arxivId' | 'title' | 'authors' | 'primaryCategory' | 'publishedAt' | 'htmlUrl'>[] }>;
  hf_daily: TodayBriefSection<{ items: Pick<HFDailyPaper, 'paperId' | 'title' | 'upvotes' | 'num_comments' | 'hf_url' | 'arxiv_url' | 'ai_keywords'>[] }>;
}

export interface TodayBriefHF {
  models: { id: string; downloads: number; likes: number; pipeline_tag: string | null }[];
  datasets: { id: string; downloads: number; likes: number }[];
  spaces: { id: string; sdk: string | null; likes: number; runtime_stage: string | null }[];
}

export interface TodayBriefCommunity {
  github_issues: Pick<HotIssue, 'title' | 'repo' | 'comments' | 'reactions_total' | 'url' | 'matched_topic'>[];
  reddit: Pick<RedditPost, 'subreddit' | 'title' | 'score' | 'num_comments' | 'permalink' | 'flair'>[];
}

export interface TodayBriefInference {
  total_models: number;
  cheapest_input: { id: string; usd_per_million: number } | null;
  cheapest_output: { id: string; usd_per_million: number } | null;
  largest_context: { id: string; tokens: number } | null;
  free_tier_count: number;
  top_namespaces: { namespace: string; count: number }[];
}

export interface TodayBriefStatus {
  all_operational: boolean;
  service_count: number;
  issues: { name: string; provider: string; status: string }[];
}

export interface TodayBrief {
  ok: true;
  generated_at: string;
  sections_included: TodaySection[];
  limit_per_section: number;
  // Each top-level section follows the same { available, captured_at, data } pattern
  // so a client can iterate uniformly.
  news: TodayBriefSection<{ items: TodayBriefNewsItem[] }>;
  papers: TodayBriefSection<TodayBriefPapers>;
  hf: TodayBriefSection<TodayBriefHF>;
  community: TodayBriefSection<TodayBriefCommunity>;
  inference: TodayBriefSection<TodayBriefInference>;
  status: TodayBriefSection<TodayBriefStatus>;
}

export interface BuildOptions {
  sections?: TodaySection[];
  limit_per_section?: number;
}

const MAX_LIMIT = 10;
const DEFAULT_LIMIT = 3;

export function resolveSections(input: string | string[] | undefined): TodaySection[] {
  if (input === undefined) return [...ALL_SECTIONS];
  const list = Array.isArray(input)
    ? input
    : String(input).split(',').map(s => s.trim()).filter(Boolean);
  const valid = list.filter((s): s is TodaySection => (ALL_SECTIONS as string[]).includes(s));
  return valid.length > 0 ? valid : [...ALL_SECTIONS];
}

export function resolveLimit(input: string | number | undefined): number {
  if (input === undefined) return DEFAULT_LIMIT;
  const n = typeof input === 'number' ? input : parseInt(String(input), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function emptySection<T>(): TodayBriefSection<T> {
  return { available: false, data: null };
}

export function buildTodayBrief(inputs: TodayInputs, opts: BuildOptions = {}): TodayBrief {
  const sections = opts.sections && opts.sections.length > 0 ? opts.sections : [...ALL_SECTIONS];
  const N = Math.min(opts.limit_per_section ?? DEFAULT_LIMIT, MAX_LIMIT);
  const generatedAt = new Date().toISOString();

  // News
  let news: TodayBrief['news'] = emptySection();
  if (sections.includes('news')) {
    const articles = inputs.news;
    if (Array.isArray(articles) && articles.length > 0) {
      news = {
        available: true,
        captured_at: articles[0]?.fetchedAt,
        data: {
          items: articles.slice(0, N).map(a => ({
            title: a.title,
            source: a.source,
            url: a.url,
            publishedAt: a.publishedAt,
          })),
        },
      };
    }
  }

  // Papers - composite of three feeds
  let papers: TodayBrief['papers'] = emptySection();
  if (sections.includes('papers')) {
    const ai = inputs.papersAITrending;
    const arxiv = inputs.papersArxivRecent;
    const hfd = inputs.papersHFDaily;
    const anyAvailable = !!(ai || arxiv || hfd);
    if (anyAvailable) {
      papers = {
        available: true,
        captured_at: ai?.capturedAt ?? arxiv?.capturedAt ?? hfd?.capturedAt,
        data: {
          ai_trending: ai && ai.papers.length > 0 ? {
            available: true,
            captured_at: ai.capturedAt,
            data: {
              items: ai.papers.slice(0, N).map(p => ({
                title: p.title,
                authors: p.authors,
                year: p.year,
                venue: p.venue,
                citationCount: p.citationCount,
                arxivId: p.arxivId,
                url: p.url,
              })),
            },
          } : emptySection(),
          arxiv_recent: arxiv && arxiv.papers.length > 0 ? {
            available: true,
            captured_at: arxiv.capturedAt,
            data: {
              items: arxiv.papers.slice(0, N).map(p => ({
                arxivId: p.arxivId,
                title: p.title,
                authors: p.authors,
                primaryCategory: p.primaryCategory,
                publishedAt: p.publishedAt,
                htmlUrl: p.htmlUrl,
              })),
            },
          } : emptySection(),
          hf_daily: hfd && hfd.papers.length > 0 ? {
            available: true,
            captured_at: hfd.capturedAt,
            data: {
              items: hfd.papers.slice(0, N).map(p => ({
                paperId: p.paperId,
                title: p.title,
                upvotes: p.upvotes,
                num_comments: p.num_comments,
                hf_url: p.hf_url,
                arxiv_url: p.arxiv_url,
                ai_keywords: p.ai_keywords,
              })),
            },
          } : emptySection(),
        },
      };
    }
  }

  // Hugging Face
  let hf: TodayBrief['hf'] = emptySection();
  if (sections.includes('hf')) {
    const snap = inputs.hfTrending;
    if (snap) {
      hf = {
        available: true,
        captured_at: snap.capturedAt,
        data: {
          models: snap.models.items.slice(0, N).map(m => ({
            id: m.id, downloads: m.downloads, likes: m.likes, pipeline_tag: m.pipeline_tag,
          })),
          datasets: snap.datasets.items.slice(0, N).map(d => ({
            id: d.id, downloads: d.downloads, likes: d.likes,
          })),
          spaces: snap.spaces.items.slice(0, N).map(s => ({
            id: s.id, sdk: s.sdk, likes: s.likes, runtime_stage: s.runtime_stage,
          })),
        },
      };
    }
  }

  // Community
  let community: TodayBrief['community'] = emptySection();
  if (sections.includes('community')) {
    const issues = inputs.hotIssues;
    const reddit = inputs.redditTrending;
    const anyAvailable = !!(issues || reddit);
    if (anyAvailable) {
      community = {
        available: true,
        captured_at: issues?.capturedAt ?? reddit?.capturedAt,
        data: {
          github_issues: issues
            ? issues.issues.slice(0, N).map(i => ({
                title: i.title, repo: i.repo, comments: i.comments,
                reactions_total: i.reactions_total, url: i.url, matched_topic: i.matched_topic,
              }))
            : [],
          reddit: reddit
            ? reddit.posts.slice(0, N).map(p => ({
                subreddit: p.subreddit, title: p.title, score: p.score,
                num_comments: p.num_comments, permalink: p.permalink, flair: p.flair,
              }))
            : [],
        },
      };
    }
  }

  // Inference catalog
  let inference: TodayBrief['inference'] = emptySection();
  if (sections.includes('inference')) {
    const snap = inputs.openrouter;
    if (snap) {
      inference = {
        available: true,
        captured_at: snap.capturedAt,
        data: {
          total_models: snap.total_models,
          cheapest_input: snap.summary.cheapest_input,
          cheapest_output: snap.summary.cheapest_output,
          largest_context: snap.summary.largest_context,
          free_tier_count: snap.summary.free_tier_count,
          top_namespaces: snap.summary.by_namespace.slice(0, 5),
        },
      };
    }
  }

  // Status
  let status: TodayBrief['status'] = emptySection();
  if (sections.includes('status')) {
    const services = inputs.status;
    if (Array.isArray(services)) {
      const issues = services.filter(s => s.status !== 'operational');
      status = {
        available: true,
        data: {
          all_operational: issues.length === 0,
          service_count: services.length,
          issues: issues.map(s => ({ name: s.name, provider: s.provider, status: s.status })),
        },
      };
    }
  }

  return {
    ok: true,
    generated_at: generatedAt,
    sections_included: sections,
    limit_per_section: N,
    news,
    papers,
    hf,
    community,
    inference,
    status,
  };
}
