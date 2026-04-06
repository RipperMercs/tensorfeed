'use client';

import { useState, useEffect } from 'react';
import { Headphones, Clock, ExternalLink } from 'lucide-react';
import PodcastPlayer from '@/components/podcasts/PodcastPlayer';
import type { PodcastEpisode } from '@/lib/types';
import JsonLd from '@/components/seo/JsonLd';

const PODCAST_COLORS: Record<string, { bg: string; border: string }> = {
  'AI Daily Brief': { bg: 'bg-blue-500/20', border: '#3b82f6' },
  'Practical AI': { bg: 'bg-emerald-500/20', border: '#10b981' },
  'Latent Space': { bg: 'bg-violet-500/20', border: '#8b5cf6' },
  'Last Week in AI': { bg: 'bg-amber-500/20', border: '#f59e0b' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5">
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-bg-tertiary rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-bg-tertiary rounded w-1/4 mb-2" />
              <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg-tertiary rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PodcastsPage() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCount, setShowCount] = useState(20);
  const [filterShow, setFilterShow] = useState<string>('All');

  useEffect(() => {
    async function fetchPodcasts() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/podcasts?limit=100');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.episodes?.length) {
            setEpisodes(data.episodes);
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchPodcasts();

    // Refresh every 10 minutes
    const interval = setInterval(fetchPodcasts, 600000);
    return () => clearInterval(interval);
  }, []);

  const podcastNames = ['All', ...Array.from(new Set(episodes.map(e => e.podcastName)))];

  const filtered = filterShow === 'All'
    ? episodes
    : episodes.filter(e => e.podcastName === filterShow);

  const visible = filtered.slice(0, showCount);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Podcasts: Listen to the Latest AI News and Analysis',
    description: 'Stream AI podcast episodes from top shows. Listen to AI Daily Brief, Practical AI, Latent Space, and Last Week in AI directly on TensorFeed.',
    url: 'https://tensorfeed.ai/podcasts',
    publisher: {
      '@type': 'Organization',
      name: 'TensorFeed.ai',
      url: 'https://tensorfeed.ai',
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <JsonLd data={schema} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Headphones className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">AI Podcasts</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Listen to the latest AI news and analysis from top podcasts, all in one place.
        </p>
      </div>

      {/* Show filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {podcastNames.map((name) => (
          <button
            key={name}
            onClick={() => { setFilterShow(name); setShowCount(20); }}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filterShow === name
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border hover:border-accent-primary/40'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Episode stats */}
      {!loading && episodes.length > 0 && (
        <div className="flex items-center gap-4 mb-6 text-sm text-text-muted">
          <span>{episodes.length} episodes</span>
          <span>·</span>
          <span>{new Set(episodes.map(e => e.podcastName)).size} shows</span>
          <span>·</span>
          <span>Updated hourly</span>
        </div>
      )}

      {/* Episodes list */}
      {loading ? (
        <LoadingSkeleton />
      ) : visible.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-lg p-8 text-center">
          <Headphones className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No podcast episodes available right now. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((ep) => {
            const colors = PODCAST_COLORS[ep.podcastName] || { bg: 'bg-accent-primary/20', border: '#6366f1' };

            return (
              <article
                key={ep.id}
                className="bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary/40 transition-colors"
                style={{ borderLeftWidth: '4px', borderLeftColor: colors.border }}
              >
                <div className="flex gap-4">
                  {/* Artwork */}
                  {ep.podcastImage ? (
                    <img
                      src={ep.podcastImage}
                      alt={ep.podcastName}
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-lg shrink-0 flex items-center justify-center ${colors.bg}`}>
                      <Headphones className="w-8 h-8 text-text-muted" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} text-text-primary`}>
                        {ep.podcastName}
                      </span>
                      {ep.duration && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock className="w-3 h-3" />
                          {ep.duration}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-semibold text-text-primary leading-snug mb-1 line-clamp-2">
                      <a
                        href={ep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-cyan transition-colors"
                      >
                        {ep.title}
                        <ExternalLink className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100" />
                      </a>
                    </h2>

                    <p className="text-xs text-text-muted mb-0.5">
                      {timeAgo(ep.publishedAt)}
                    </p>

                    {ep.description && (
                      <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mt-1">
                        {ep.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Player */}
                <PodcastPlayer audioUrl={ep.audioUrl} />
              </article>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {visible.length < filtered.length && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowCount(showCount + 20)}
            className="px-6 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:border-accent-primary/40 transition-colors text-sm"
          >
            Load more episodes ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
