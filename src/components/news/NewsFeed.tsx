'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { NewsArticle, FeedLayout } from '@/lib/types';
import CategoryFilter from './CategoryFilter';
import NewsCard from './NewsCard';

interface NewsFeedProps {
  articles: NewsArticle[];
}

// Limit any single source to ~35% of displayed articles
function balanceSources(articles: NewsArticle[]): NewsArticle[] {
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

  // Backfill with overflow if we need more articles
  const target = Math.min(articles.length, 100);
  if (balanced.length < target) {
    balanced.push(...overflow.slice(0, target - balanced.length));
  }

  // Re-sort by date
  balanced.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return balanced;
}


export default function NewsFeed({ articles: initialArticles }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [layout, setLayout] = useState<FeedLayout>('full');

  // Fetch live articles from Worker API (replaces stale build-time data)
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/news?limit=200');
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.articles?.length) {
          setArticles(balanceSources(data.articles));
        }
      } catch {}
    }
    fetchLive();
    const interval = setInterval(fetchLive, 300000);
    return () => clearInterval(interval);
  }, []);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'All') return articles;
    return articles.filter((article) =>
      article.categories.some(
        (cat) => cat.toLowerCase() === selectedCategory.toLowerCase()
      )
    );
  }, [articles, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Layout toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setLayout('full')}
            className={`p-2 rounded transition-colors ${
              layout === 'full'
                ? 'text-accent-cyan bg-bg-tertiary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            aria-label="Full layout"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLayout('compact')}
            className={`p-2 rounded transition-colors ${
              layout === 'compact'
                ? 'text-accent-cyan bg-bg-tertiary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            aria-label="Compact layout"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Articles with ad slots every 10 articles */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No articles found for this category.</p>
        </div>
      ) : (
        <div className={layout === 'full' ? 'grid gap-4 grid-cols-1' : 'grid gap-3 grid-cols-1'}>
          {filteredArticles.map((article, index) => (
            <div key={article.id}>
              <NewsCard article={article} featured={index % 5 === 0} />
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredArticles.length > 0 && (
        <div className="flex justify-center pt-4">
          <button className="rounded-lg border border-border bg-bg-secondary px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
