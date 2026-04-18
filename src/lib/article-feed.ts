import type { NewsArticle } from './types';

/**
 * Limit any single source to ~35% of displayed articles so one busy source
 * (e.g. Hacker News) does not crowd out the rest.
 */
export function balanceSources(articles: NewsArticle[]): NewsArticle[] {
  const maxPerSource = Math.max(Math.floor(articles.length * 0.35), 10);
  const sourceCounts: Record<string, number> = {};
  const balanced: NewsArticle[] = [];
  const overflow: NewsArticle[] = [];

  for (const article of articles) {
    const count = sourceCounts[article.source] || 0;
    if (count < maxPerSource) {
      balanced.push(article);
      sourceCounts[article.source] = count + 1;
    } else {
      overflow.push(article);
    }
  }

  const target = Math.min(articles.length, 100);
  if (balanced.length < target) {
    balanced.push(...overflow.slice(0, target - balanced.length));
  }

  balanced.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return balanced;
}
