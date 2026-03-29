'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { NewsArticle, FeedLayout } from '@/lib/types';
import CategoryFilter from './CategoryFilter';
import NewsCard from './NewsCard';

interface NewsFeedProps {
  articles: NewsArticle[];
}

function AdPlaceholder({ index }: { index: number }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-secondary/50 px-5 py-4 flex items-center justify-center">
      <span className="text-xs text-text-muted font-mono">Ad Space Reserved for Google AdSense</span>
    </div>
  );
}

export default function NewsFeed({ articles: initialArticles }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [layout, setLayout] = useState<FeedLayout>('full');

  // Fetch live articles from Worker API (replaces stale build-time data)
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/news?limit=100');
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.articles?.length) {
          setArticles(data.articles);
        }
      } catch {}
    }
    fetchLive();
    // Refresh every 5 minutes
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
              {(index + 1) % 10 === 0 && index < filteredArticles.length - 1 && (
                <div className="mt-4">
                  <AdPlaceholder index={index} />
                </div>
              )}
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
