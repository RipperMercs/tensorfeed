'use client';

import { useEffect, useState } from 'react';

// Endpoints the hub consumes. All anonymous reads either fall through
// the per-IP free-trial pool (premium endpoints, 100/day) or hit free
// surfaces directly. Each visitor's browser has its own trial budget,
// so the hub scales linearly with visitors.

const API = 'https://tensorfeed.ai';

export interface ArxivPaper {
  arxivId: string;
  title: string;
  abstract: string | null;
  authors: string[];
  primaryCategory: string | null;
  publishedAt: string;
  htmlUrl: string;
  pdfUrl: string;
}

export interface MilestonePaper {
  arxiv_id: string;
  date: string;
  subfield_tag: string;
  methodology_bucket: string;
  title: string;
  affiliations: string[];
  milestone_reasoning: string;
  summary: string;
}

export interface AuthorRow {
  rank: number;
  openalex_id: string;
  display_name: string;
  orcid: string | null;
  primary_affiliation: {
    openalex_id: string | null;
    display_name: string | null;
    country_code: string | null;
  };
  ai_works_last_year: number;
  total_works_count: number | null;
  cited_by_count: number | null;
  h_index: number | null;
  ai_share_pct: number | null;
}

export interface VelocityPaper {
  rank: number;
  openalex_id: string;
  title: string;
  publication_year: number;
  cited_by_count: number;
  citations_latest_year: number;
  citations_latest_year_share: number;
  doi: string | null;
  venue: string | null;
  landing_page_url: string | null;
  first_three_authors: Array<{ openalex_id: string | null; display_name: string }>;
  primary_affiliation: { openalex_id: string | null; display_name: string | null };
}

export interface EmergingKeyword {
  keyword: string;
  recent_count: number;
  baseline_count: number;
  lift: number;
  example_arxiv_ids: string[];
}

export interface InstitutionRow {
  rank: number;
  openalex_id: string;
  display_name: string;
  country_code: string | null;
  type: string | null;
  ai_works_last_year: number;
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Card accent palette ────────────────────────────────────────────
// Pastel "digital library" palette. Each research card gets a 2px top
// accent + matching 4% bg tint on hover, picked deterministically from
// a string seed (subfield tag, primary category, openalex id, etc.) so
// the same paper always renders the same color across reloads.

const ACCENT_PALETTE: { name: string; color: string; bgTint: string }[] = [
  { name: 'light-blue', color: '#93c5fd', bgTint: 'rgba(147, 197, 253, 0.06)' },
  { name: 'gold',       color: '#fcd34d', bgTint: 'rgba(252, 211, 77, 0.06)' },
  { name: 'pale-yellow',color: '#fde68a', bgTint: 'rgba(253, 230, 138, 0.06)' },
  { name: 'mint',       color: '#a7f3d0', bgTint: 'rgba(167, 243, 208, 0.06)' },
  { name: 'lavender',   color: '#c4b5fd', bgTint: 'rgba(196, 181, 253, 0.06)' },
  { name: 'rose',       color: '#fda4af', bgTint: 'rgba(253, 164, 175, 0.06)' },
  { name: 'teal',       color: '#67e8f9', bgTint: 'rgba(103, 232, 249, 0.06)' },
  { name: 'coral',      color: '#fdba74', bgTint: 'rgba(253, 186, 116, 0.06)' },
];

export interface PaperAccent {
  color: string;
  bgTint: string;
}

/** Deterministic accent color for a research card. Same seed = same color. */
export function paperAccent(seed: string): PaperAccent {
  if (!seed) return ACCENT_PALETTE[0];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
  return ACCENT_PALETTE[(h >>> 0) % ACCENT_PALETTE.length];
}

// === Hooks ===

export function useArxivLatest(limit = 12) {
  const [papers, setPapers] = useState<ArxivPaper[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; snapshot?: { papers?: ArxivPaper[] } }>(
        `${API}/api/papers/arxiv-recent`,
      );
      if (cancelled) return;
      setPapers(data?.snapshot?.papers?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return papers;
}

export function useMilestones(limit = 12) {
  const [papers, setPapers] = useState<MilestonePaper[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; papers?: MilestonePaper[] }>(
        `${API}/api/research/milestones`,
      );
      if (cancelled) return;
      setPapers(data?.papers?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return papers;
}

// Snapshot variant: returns the milestone rows plus the snapshot capturedAt
// date so the page can show how fresh the data actually is. The array-only
// useMilestones hook above stays untouched for the /research hub.
export function useMilestonesSnapshot(limit = 100) {
  const [state, setState] = useState<{ papers: MilestonePaper[] | null; capturedAt: string | null }>(
    { papers: null, capturedAt: null },
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; capturedAt?: string; papers?: MilestonePaper[] }>(
        `${API}/api/research/milestones`,
      );
      if (cancelled) return;
      setState({
        papers: data?.papers?.slice(0, limit) ?? [],
        capturedAt: data?.capturedAt ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return state;
}

export function useAuthors(limit = 15) {
  const [rows, setRows] = useState<AuthorRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; authors?: AuthorRow[] }>(
        `${API}/api/research/authors`,
      );
      if (cancelled) return;
      setRows(data?.authors?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return rows;
}

export function useCitationVelocity(limit = 15) {
  const [papers, setPapers] = useState<VelocityPaper[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; papers?: VelocityPaper[] }>(
        `${API}/api/research/citation-velocity`,
      );
      if (cancelled) return;
      setPapers(data?.papers?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return papers;
}

export function useEmergingKeywords(limit = 30) {
  const [keywords, setKeywords] = useState<EmergingKeyword[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; keywords?: EmergingKeyword[] }>(
        `${API}/api/research/emerging-keywords`,
      );
      if (cancelled) return;
      setKeywords(data?.keywords?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return keywords;
}

// Snapshot variant: returns the keyword rows plus the snapshot capturedAt
// date so the page can show how fresh the data actually is. The array-only
// useEmergingKeywords hook above stays untouched for the /research hub.
export function useEmergingKeywordsSnapshot(limit = 100) {
  const [state, setState] = useState<{ keywords: EmergingKeyword[] | null; capturedAt: string | null }>(
    { keywords: null, capturedAt: null },
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; capturedAt?: string; keywords?: EmergingKeyword[] }>(
        `${API}/api/research/emerging-keywords`,
      );
      if (cancelled) return;
      setState({
        keywords: data?.keywords?.slice(0, limit) ?? [],
        capturedAt: data?.capturedAt ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return state;
}

export function useInstitutions(limit = 10) {
  const [rows, setRows] = useState<InstitutionRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; institutions?: InstitutionRow[] }>(
        `${API}/api/research/institutions/ai`,
      );
      if (cancelled) return;
      setRows(data?.institutions?.slice(0, limit) ?? []);
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return rows;
}

export interface ConferencePaper {
  title: string;
  authors: string[];
  venue_group: string;
  tier: string;
  primary_area: string | null;
  keywords: string[];
  abstract_snippet: string;
  forum_url: string;
  pdf_url: string | null;
  accepted_at: string | null;
}

// OpenReview notable-tier acceptances. Returns the rows plus the snapshot
// venues and capturedAt so the page can offer a venue filter and a freshness
// line. Source: /api/research/conference-acceptances (free).
export function useConferenceAcceptances() {
  const [state, setState] = useState<{ papers: ConferencePaper[] | null; venues: string[]; capturedAt: string | null }>(
    { papers: null, venues: [], capturedAt: null },
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; capturedAt?: string; venues?: string[]; papers?: ConferencePaper[] }>(
        `${API}/api/research/conference-acceptances`,
      );
      if (cancelled) return;
      setState({ papers: data?.papers ?? [], venues: data?.venues ?? [], capturedAt: data?.capturedAt ?? null });
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}

export interface NlpPaper {
  title: string;
  authors: string[];
  venue_group: string;
  abstract_snippet: string;
  url: string;
  doi: string | null;
}

// ACL Anthology recent NLP/CL proceedings (ACL, EMNLP, NAACL). Source:
// /api/research/nlp-proceedings (free).
export function useNlpProceedings() {
  const [state, setState] = useState<{ papers: NlpPaper[] | null; venues: string[]; capturedAt: string | null }>(
    { papers: null, venues: [], capturedAt: null },
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; capturedAt?: string; venues?: string[]; papers?: NlpPaper[] }>(
        `${API}/api/research/nlp-proceedings`,
      );
      if (cancelled) return;
      setState({ papers: data?.papers ?? [], venues: data?.venues ?? [], capturedAt: data?.capturedAt ?? null });
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}

export interface BlogPost {
  title: string;
  url: string;
  source: string;
  snippet: string;
  published_at: string | null;
}

// AI lab + academic research blogs, aggregated. Source:
// /api/research/lab-blogs (free).
export function useResearchBlogs() {
  const [state, setState] = useState<{ posts: BlogPost[] | null; sources: string[]; capturedAt: string | null }>(
    { posts: null, sources: [], capturedAt: null },
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await safeFetch<{ ok: boolean; capturedAt?: string; sources?: string[]; posts?: BlogPost[] }>(
        `${API}/api/research/lab-blogs`,
      );
      if (cancelled) return;
      setState({ posts: data?.posts ?? [], sources: data?.sources ?? [], capturedAt: data?.capturedAt ?? null });
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}
