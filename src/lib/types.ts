export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceIcon: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
  fetchedAt: string;
}

export interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  uptime7d: number;
  lastIncident: string | null;
  components: ServiceComponent[];
  statusPageUrl: string;
}

export interface ServiceComponent {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
}

export interface AIModel {
  name: string;
  provider: string;
  released: string;
  parameters: string;
  contextWindow: number;
  pricing: { inputPer1M: number; outputPer1M: number } | null;
  capabilities: string[];
  modelCardUrl: string;
}

export interface PricingProvider {
  name: string;
  models: PricingModel[];
}

export interface PricingModel {
  model: string;
  inputPer1M: string;
  outputPer1M: string;
  context: string;
}

export interface AgentEntry {
  name: string;
  provider: string;
  category: string;
  description: string;
  url: string;
  pricing: string;
  launched: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  icon: string;
  categories: string[];
  active: boolean;
}

export type FeedLayout = 'full' | 'compact';
export type StatusType = 'operational' | 'degraded' | 'down' | 'unknown';
