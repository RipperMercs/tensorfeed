export interface Env {
  TENSORFEED_NEWS: KVNamespace;
  TENSORFEED_STATUS: KVNamespace;
  TENSORFEED_CACHE: KVNamespace;
  ENVIRONMENT: string;
  SITE_URL: string;
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
