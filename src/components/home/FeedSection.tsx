'use client';

import { useEffect, useMemo, useState } from 'react';
import HomeFeed from '@/components/HomeFeed';
import FilterChipRow, { type FeedView } from './FilterChipRow';
import type { NewsArticle } from '@/lib/types';
import { chipCounts, filterByChip, type ChipKey } from '@/lib/feed-chips';
import { balanceSources } from '@/lib/article-feed';

interface FeedSectionProps {
  articles: NewsArticle[];
}

export default function FeedSection({ articles: initialArticles }: FeedSectionProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [tab, setTab] = useState<'news' | 'podcasts'>('news');
  const [activeChip, setActiveChip] = useState<ChipKey>('all');
  const [view, setView] = useState<FeedView>('cards');

  useEffect(() => {
    let cancelled = false;
    async function fetchLive() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/news?limit=200');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok && data.articles?.length) {
          setArticles(balanceSources(data.articles));
        }
      } catch {}
    }
    fetchLive();
    const interval = setInterval(fetchLive, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const counts = useMemo(() => chipCounts(articles), [articles]);
  const visibleArticles = useMemo(
    () => filterByChip(articles, activeChip),
    [articles, activeChip]
  );

  return (
    <div>
      <FilterChipRow
        tab={tab}
        onTabChange={setTab}
        activeChip={activeChip}
        onChipChange={setActiveChip}
        counts={counts}
        view={view}
        onViewChange={setView}
      />
      <HomeFeed
        articles={visibleArticles}
        externalTab={tab}
        viewMode={view}
        hideInternalNewsControls
      />
    </div>
  );
}
