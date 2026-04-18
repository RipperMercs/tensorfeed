import type { NewsArticle } from './types';

export type ChipKey =
  | 'all'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'research'
  | 'hardware'
  | 'hackernews';

export interface ChipDef {
  key: ChipKey;
  label: string;
  color?: string;
}

export const CHIPS: ChipDef[] = [
  { key: 'all', label: 'All' },
  { key: 'anthropic', label: 'Anthropic', color: 'var(--src-anthropic)' },
  { key: 'openai', label: 'OpenAI', color: 'var(--src-openai)' },
  { key: 'google', label: 'Google', color: 'var(--src-google)' },
  { key: 'meta', label: 'Meta / Llama', color: 'var(--src-meta)' },
  { key: 'research', label: 'Research', color: 'var(--src-arxiv)' },
  { key: 'hardware', label: 'Hardware', color: 'var(--src-nvidia)' },
  { key: 'hackernews', label: 'Hacker News', color: 'var(--src-hackernews)' },
];

const MATCHERS: Record<ChipKey, (a: NewsArticle) => boolean> = {
  all: () => true,
  anthropic: (a) =>
    /anthropic|claude/i.test(a.source) ||
    a.categories.some((c) => /anthropic|claude/i.test(c)),
  openai: (a) =>
    /openai|chatgpt/i.test(a.source) ||
    a.categories.some((c) => /openai/i.test(c)),
  google: (a) =>
    /google|gemini|deepmind/i.test(a.source) ||
    a.categories.some((c) => /google\/gemini/i.test(c)),
  meta: (a) =>
    /(^|\b)meta(\b|$)|facebook|llama/i.test(a.source) ||
    a.categories.some((c) => /meta\/llama/i.test(c)),
  research: (a) =>
    /arxiv|mit/i.test(a.source) ||
    a.categories.some((c) => /research/i.test(c)),
  hardware: (a) =>
    /nvidia|amd|intel|tsmc/i.test(a.source) ||
    a.categories.some((c) => /hardware/i.test(c)),
  hackernews: (a) => /hacker news|ycombinator/i.test(a.source),
};

export function filterByChip(articles: NewsArticle[], chip: ChipKey): NewsArticle[] {
  if (chip === 'all') return articles;
  return articles.filter(MATCHERS[chip]);
}

export function chipCounts(articles: NewsArticle[]): Record<ChipKey, number> {
  const out = {
    all: articles.length,
    anthropic: 0,
    openai: 0,
    google: 0,
    meta: 0,
    research: 0,
    hardware: 0,
    hackernews: 0,
  } as Record<ChipKey, number>;
  for (const def of CHIPS) {
    if (def.key === 'all') continue;
    out[def.key] = articles.filter(MATCHERS[def.key]).length;
  }
  return out;
}
