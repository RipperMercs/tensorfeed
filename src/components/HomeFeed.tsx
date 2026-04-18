'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Headphones } from 'lucide-react';
import { NewsArticle } from '@/lib/types';
import NewsFeed from '@/components/news/NewsFeed';
import PodcastPlayer from '@/components/podcasts/PodcastPlayer';

interface PodcastEpisode {
  id: string;
  podcastName: string;
  podcastImage?: string;
  title: string;
  description?: string;
  url?: string;
  audioUrl: string;
  duration?: string;
  publishedAt: string;
}

const PODCAST_COLORS: Record<string, string> = {
  'Latent Space': 'border-l-violet-500',
  'Practical AI': 'border-l-emerald-500',
  'Lex Fridman Podcast': 'border-l-blue-500',
  'TWIML': 'border-l-amber-500',
  'Gradient Dissent': 'border-l-rose-500',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface HomeFeedProps {
  articles: NewsArticle[];
  /**
   * When provided, the parent owns tab state and the internal tab switcher is hidden.
   * Used by the new FeedSection wrapper that renders FilterChipRow above this component.
   */
  externalTab?: 'news' | 'podcasts';
  /**
   * Forwarded to NewsFeed. When provided, NewsFeed uses this view mode and hides its own toggle.
   */
  viewMode?: 'cards' | 'log' | 'hybrid';
  /**
   * Forwarded to NewsFeed. When true, NewsFeed hides its internal CategoryFilter and layout toggle.
   */
  hideInternalNewsControls?: boolean;
}

export default function HomeFeed({
  articles,
  externalTab,
  viewMode,
  hideInternalNewsControls,
}: HomeFeedProps) {
  const [internalTab, setInternalTab] = useState<'news' | 'podcasts'>('news');
  const tab = externalTab ?? internalTab;
  const setTab = setInternalTab;
  const hideInternalTabs = externalTab !== undefined;
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);

  useEffect(() => {
    if (tab !== 'podcasts' || episodes.length > 0) return;
    setLoadingPodcasts(true);
    async function fetchPodcasts() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/podcasts?limit=30');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.episodes) {
            setEpisodes(data.episodes);
          }
        }
      } catch {}
      setLoadingPodcasts(false);
    }
    fetchPodcasts();
  }, [tab, episodes.length]);

  return (
    <div className="space-y-4">
      {!hideInternalTabs && (
        <div className="flex items-center gap-1 bg-bg-secondary rounded-lg border border-border p-1">
          <button
            onClick={() => setTab('news')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'news'
                ? 'bg-bg-tertiary text-accent-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            aria-label="News feed"
          >
            <Newspaper className="w-4 h-4" />
            News
          </button>
          <button
            onClick={() => setTab('podcasts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'podcasts'
                ? 'bg-bg-tertiary text-accent-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            aria-label="AI Podcasts"
          >
            <Headphones className="w-4 h-4" />
            Podcasts
          </button>
        </div>
      )}

      {tab === 'news' && (
        <NewsFeed
          articles={articles}
          viewMode={viewMode}
          hideInternalControls={hideInternalNewsControls}
        />
      )}

      {tab === 'podcasts' && (
        <div className="space-y-3">
          {loadingPodcasts && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-bg-secondary rounded-lg border border-border p-4 animate-pulse">
                  <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                  <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-3" />
                  <div className="h-8 bg-bg-tertiary rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {!loadingPodcasts && episodes.length === 0 && (
            <div className="text-center py-16">
              <Headphones className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No podcast episodes available right now.</p>
            </div>
          )}

          {episodes.map((ep) => (
            <div
              key={ep.id}
              className={`bg-bg-secondary rounded-lg border border-border border-l-4 ${
                PODCAST_COLORS[ep.podcastName] || 'border-l-accent-primary'
              } p-4 hover:border-border-hover transition-colors`}
            >
              <div className="flex items-start gap-3">
                {ep.podcastImage && (
                  <img
                    src={ep.podcastImage}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover shrink-0 hidden sm:block"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 mb-1">
                    {ep.url ? (
                      <a
                        href={ep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-primary transition-colors"
                      >
                        {ep.title}
                      </a>
                    ) : (
                      ep.title
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                    <span className="font-medium text-text-secondary">{ep.podcastName}</span>
                    {ep.duration && (
                      <>
                        <span>·</span>
                        <span>{ep.duration}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(ep.publishedAt)}</span>
                  </div>
                  {ep.description && (
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-2">
                      {ep.description}
                    </p>
                  )}
                  {ep.audioUrl && <PodcastPlayer audioUrl={ep.audioUrl} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
