'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, List } from 'lucide-react';
import { NewsArticle, FeedLayout } from '@/lib/types';
import CategoryFilter from './CategoryFilter';
import NewsCard from './NewsCard';
import { balanceSources } from '@/lib/article-feed';

type ViewMode = 'cards' | 'log' | 'hybrid';

interface NewsFeedProps {
  articles: NewsArticle[];
  /**
   * When provided, hides the internal CategoryFilter + layout toggle
   * and skips the internal live fetch (parent owns the data).
   */
  hideInternalControls?: boolean;
  /**
   * Cards / log / hybrid. Required when hideInternalControls is true.
   */
  viewMode?: ViewMode;
}

const SOURCE_ACCENT: Record<string, string> = {
  Anthropic: 'var(--src-anthropic)',
  OpenAI: 'var(--src-openai)',
  Google: 'var(--src-google)',
  Meta: 'var(--src-meta)',
  HuggingFace: 'var(--src-huggingface)',
  NVIDIA: 'var(--src-nvidia)',
  TechCrunch: 'var(--src-techcrunch)',
  'The Verge': 'var(--src-theverge)',
  'Ars Technica': 'var(--src-arstechnica)',
  'Hacker News': 'var(--src-hackernews)',
  arXiv: 'var(--src-arxiv)',
};

function sourceColor(source: string): string {
  for (const key of Object.keys(SOURCE_ACCENT)) {
    if (source.includes(key)) return SOURCE_ACCENT[key];
  }
  return 'var(--accent-primary)';
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NewsFeed({
  articles: initialArticles,
  hideInternalControls,
  viewMode,
}: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [layout, setLayout] = useState<FeedLayout>('full');

  // When externally controlled, parent passes pre-filtered articles. Sync on prop change.
  useEffect(() => {
    if (hideInternalControls) setArticles(initialArticles);
  }, [hideInternalControls, initialArticles]);

  // Live fetch only runs when uncontrolled (parent does its own fetch otherwise).
  useEffect(() => {
    if (hideInternalControls) return;
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
  }, [hideInternalControls]);

  const filteredArticles = useMemo(() => {
    if (hideInternalControls) return articles;
    if (selectedCategory === 'All') return articles;
    return articles.filter((article) =>
      article.categories.some(
        (cat) => cat.toLowerCase() === selectedCategory.toLowerCase()
      )
    );
  }, [articles, selectedCategory, hideInternalControls]);

  const effectiveView: ViewMode = viewMode ?? (layout === 'compact' ? 'hybrid' : 'cards');

  return (
    <div className="space-y-6">
      {!hideInternalControls && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
          </div>
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
      )}

      {filteredArticles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No articles found for this filter.</p>
        </div>
      ) : effectiveView === 'log' ? (
        <FeedLog articles={filteredArticles} />
      ) : effectiveView === 'hybrid' ? (
        <FeedHybrid articles={filteredArticles} />
      ) : (
        <div className="grid gap-4 grid-cols-1">
          {filteredArticles.map((article, index) => (
            <div key={article.id}>
              <NewsCard article={article} featured={index % 5 === 0} />
            </div>
          ))}
        </div>
      )}

      {filteredArticles.length > 0 && !hideInternalControls && (
        <div className="flex justify-center pt-4">
          <button className="rounded-lg border border-border bg-bg-secondary px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

function FeedLog({ articles }: { articles: NewsArticle[] }) {
  return (
    <div
      role="list"
      className="overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-secondary)',
      }}
    >
      {articles.map((a, i) => {
        const color = sourceColor(a.source);
        return (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            role="listitem"
            className="grid items-center font-mono transition-colors hover:bg-[var(--bg-tertiary)]"
            style={
              {
                gridTemplateColumns: '78px 110px 1fr 120px',
                gap: 16,
                padding: '11px 18px',
                fontSize: 12.5,
                borderBottom: i === articles.length - 1 ? 'none' : '1px solid var(--border)',
                position: 'relative',
                color: 'inherit',
                textDecoration: 'none',
                ['--src-color' as string]: color,
              } as React.CSSProperties
            }
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: color,
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {timeAgo(a.publishedAt)}
            </span>
            <span
              className="uppercase truncate"
              style={{
                color,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                fontWeight: 600,
              }}
            >
              {a.source}
            </span>
            <span
              className="truncate"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {a.title}
            </span>
            <span
              className="truncate text-right"
              style={{ color: 'var(--text-muted)', fontSize: 10.5 }}
            >
              {a.categories[0] ?? ''}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function FeedHybrid({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="flex flex-col">
      {articles.map((a, i) => {
        const color = sourceColor(a.source);
        return (
          <Link
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block transition-colors"
            style={{
              padding: '18px 4px 18px 14px',
              borderTop: i === 0 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div className="flex items-start gap-4">
              <span
                className="font-mono uppercase shrink-0"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color,
                  padding: '4px 7px',
                  border: `1px solid ${color}`,
                  borderRadius: 3,
                  opacity: 0.85,
                }}
              >
                {a.source}
              </span>
              <div className="flex-1 min-w-0">
                <h3
                  className="group-hover:text-[var(--accent-cyan)] transition-colors"
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {a.title}
                </h3>
                <p
                  className="line-clamp-2"
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-secondary)',
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {a.snippet}
                </p>
                <div
                  className="flex items-center font-mono flex-wrap"
                  style={{ gap: 12, fontSize: 11, color: 'var(--text-muted)' }}
                >
                  <span>{timeAgo(a.publishedAt)}</span>
                  <span style={{ opacity: 0.4 }}>&middot;</span>
                  <span>{a.sourceDomain}</span>
                  {a.categories[0] && (
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {a.categories[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
