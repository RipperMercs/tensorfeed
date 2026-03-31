import { Env, TrendingRepo } from './types';

/**
 * Trending AI repos: fetches from GitHub Search API daily,
 * deduplicates, and stores top 20 in KV.
 *
 * Rotates through 7 queries, one per day, to stay within rate limits.
 */

function getSevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function getFifteenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 15);
  return d.toISOString().slice(0, 10);
}

function getTenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 10);
  return d.toISOString().slice(0, 10);
}

function buildQueries(): string[] {
  const week = getSevenDaysAgo();
  const fifteen = getFifteenDaysAgo();
  const ten = getTenDaysAgo();

  return [
    `topic:llm+created:>${week}&sort=stars&order=desc&per_page=15`,
    `topic:ai-agents+created:>${week}&sort=stars&order=desc&per_page=15`,
    `topic:claude+created:>${week}&sort=stars&order=desc&per_page=15`,
    `topic:machine-learning+created:>${week}&sort=stars&order=desc&per_page=15`,
    `topic:gpt+created:>${week}&sort=stars&order=desc&per_page=15`,
    `claude+language:python+stars:>10+created:>${fifteen}&sort=stars&per_page=15`,
    `llm+tool+stars:>50+pushed:>${ten}&sort=stars&per_page=15`,
  ];
}

interface GitHubSearchResult {
  items?: {
    full_name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    html_url: string;
    topics: string[];
    created_at: string;
  }[];
}

async function fetchQuery(query: string, token: string): Promise<TrendingRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${query}`;
  const headers: Record<string, string> = {
    'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
    'Accept': 'application/vnd.github+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.warn(`GitHub search failed: ${response.status} for query: ${query.slice(0, 60)}`);
    return [];
  }

  const data: GitHubSearchResult = await response.json();
  const now = new Date().toISOString();

  return (data.items || []).map(item => ({
    name: item.full_name,
    description: (item.description || '').slice(0, 150),
    language: item.language || '',
    stars: item.stargazers_count,
    forks: item.forks_count,
    todayStars: 0,
    url: item.html_url,
    topics: item.topics || [],
    createdAt: item.created_at,
    fetchedAt: now,
  }));
}

export async function pollTrendingRepos(env: Env): Promise<void> {
  const queries = buildQueries();
  const token = env.GITHUB_TOKEN || '';

  // Rotate: run 2-3 queries per day based on day-of-year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const startIdx = (dayOfYear * 2) % queries.length;
  const todayQueries = [
    queries[startIdx % queries.length],
    queries[(startIdx + 1) % queries.length],
    queries[(startIdx + 2) % queries.length],
  ];

  console.log(`Trending repos poll: running ${todayQueries.length} queries`);

  const results = await Promise.allSettled(
    todayQueries.map(q => fetchQuery(q, token))
  );

  // Merge with existing data so we accumulate across days
  let existing: TrendingRepo[] = [];
  try {
    const raw = await env.TENSORFEED_CACHE.get('trending-repos', 'json') as TrendingRepo[] | null;
    if (raw) existing = raw;
  } catch {}

  const allRepos: TrendingRepo[] = [...existing];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allRepos.push(...result.value);
    }
  }

  // Deduplicate by repo name, keep the freshest entry
  const seen = new Map<string, TrendingRepo>();
  for (const repo of allRepos) {
    const existing = seen.get(repo.name);
    if (!existing || repo.fetchedAt > existing.fetchedAt) {
      seen.set(repo.name, repo);
    }
  }

  // Sort by stars descending, keep top 20
  const deduped = Array.from(seen.values())
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 20);

  await env.TENSORFEED_CACHE.put('trending-repos', JSON.stringify(deduped), {
    metadata: { count: deduped.length, updatedAt: new Date().toISOString() },
  });

  console.log(`Trending repos poll complete: ${deduped.length} repos stored`);
}
