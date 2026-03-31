export interface Env {
  TENSORFEED_NEWS: KVNamespace;
  TENSORFEED_STATUS: KVNamespace;
  TENSORFEED_CACHE: KVNamespace;
  ENVIRONMENT: string;
  SITE_URL: string;
  INDEXNOW_KEY: string;
  X_API_KEY: string;
  X_API_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_SECRET: string;
  GITHUB_TOKEN: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
  fetchedAt: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  categories: string[];
  active: boolean;
}

export interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  statusPageUrl: string;
  components: { name: string; status: string }[];
  lastChecked: string;
}

export interface StatusPageResponse {
  page: { name: string };
  status: { indicator: string; description: string };
  components?: { name: string; status: string }[];
}

export interface PodcastEpisode {
  id: string;
  podcastName: string;
  podcastImage: string;
  title: string;
  description: string;
  url: string;
  audioUrl: string;
  duration: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface PodcastSource {
  id: string;
  name: string;
  feedUrl: string;
  active: boolean;
}

export interface TrendingRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  todayStars: number;
  url: string;
  topics: string[];
  createdAt: string;
  fetchedAt: string;
}
