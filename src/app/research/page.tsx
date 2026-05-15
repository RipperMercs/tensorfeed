import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import ResearchHubClient from './ResearchHubClient';

export const metadata: Metadata = {
  title: 'AI Research Hub: Milestone Papers, Citation Velocity, and Emerging Topics | TensorFeed',
  description:
    'Live AI research signal: milestone papers, top authors, citation velocity, emerging topics, and the daily arXiv firehose. Pulled from the TensorFeed extraction pipeline, refreshed continuously.',
  alternates: { canonical: 'https://tensorfeed.ai/research' },
  openGraph: {
    title: 'AI Research Hub | TensorFeed',
    description:
      'Live AI research signal: milestone papers, top AI authors leaderboard, citation velocity leaders, emerging keywords, latest arXiv.',
    url: 'https://tensorfeed.ai/research',
    type: 'website',
  },
};

export default function ResearchPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'AI Research Hub',
          url: 'https://tensorfeed.ai/research',
          description:
            'Milestone AI research papers, citation velocity, top authors, and emerging topics. Daily refresh from the TensorFeed extraction pipeline.',
          isPartOf: {
            '@type': 'WebSite',
            name: 'TensorFeed',
            url: 'https://tensorfeed.ai/',
          },
          about: [
            { '@type': 'Thing', name: 'Artificial Intelligence' },
            { '@type': 'Thing', name: 'Machine Learning Research' },
            { '@type': 'Thing', name: 'arXiv Papers' },
            { '@type': 'Thing', name: 'AI Citation Velocity' },
          ],
          mainEntity: {
            '@type': 'ItemList',
            name: 'AI Research Signal Sections',
            description:
              'Six live data feeds covering AI research output. The ItemList describes the hub sections; the underlying paper data is served via the /api/premium/research/* endpoints.',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Milestone Papers (Last 30 Days)',
                url: 'https://tensorfeed.ai/research/milestones',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Citation Velocity Leaders',
                url: 'https://tensorfeed.ai/research/citation-velocity',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Top AI Authors',
                url: 'https://tensorfeed.ai/research/authors',
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: 'Top AI Institutions',
                url: 'https://tensorfeed.ai/research/institutions',
              },
              {
                '@type': 'ListItem',
                position: 5,
                name: 'Emerging Keywords',
                url: 'https://tensorfeed.ai/research/topics',
              },
              {
                '@type': 'ListItem',
                position: 6,
                name: 'Latest arXiv (Last 24h)',
                url: 'https://tensorfeed.ai/research/papers',
              },
            ],
          },
        }}
      />
      <ResearchHubClient />
    </>
  );
}
