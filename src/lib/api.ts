import { NewsArticle, ServiceStatus, AIModel } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchNews(category?: string): Promise<NewsArticle[]> {
  const params = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`${API_BASE}/news${params}`, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.articles || [];
}

export async function fetchStatus(): Promise<ServiceStatus[]> {
  const res = await fetch(`${API_BASE}/status`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.services || [];
}

export async function fetchModels(): Promise<AIModel[]> {
  const res = await fetch(`${API_BASE}/models`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.models || [];
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
