import { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import { DatasetJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Sports Data API for Agents | TensorFeed',
  description:
    'Free agent-facing sports data: leagues, teams, news, and more. NFL is live; NBA, MLB, and NHL are on the roadmap. Open JSON API at /api/sports.',
  alternates: { canonical: 'https://tensorfeed.ai/sports' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/sports',
    title: 'TensorFeed Sports Data API',
    description:
      'Agent-facing sports data: NFL teams and aggregated news today, additional leagues planned. Free JSON API.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Sports Data API',
    description: 'Agent-facing sports data: NFL today, more leagues planned. Free JSON.',
  },
};

interface LeagueCard {
  id: string;
  name: string;
  short: string;
  status: 'live' | 'planned';
  href: string;
  description: string;
  source: string;
}

const LEAGUES: LeagueCard[] = [
  {
    id: 'nfl',
    name: 'National Football League',
    short: 'NFL',
    status: 'live',
    href: '/sports/nfl',
    description:
      '32-team factual catalog plus hourly aggregated news from ESPN, NFL.com, CBS Sports, and Yahoo Sports. Players, schedule, and stats land in V2 from nflverse-data.',
    source: 'nflverse-data (CC-BY-4.0) + RSS aggregation',
  },
  {
    id: 'nba',
    name: 'National Basketball Association',
    short: 'NBA',
    status: 'planned',
    href: '/sports',
    description:
      'Roadmapped. Source TBD pending ToS review (NBA Stats API redistribution unclear; community open datasets likely).',
    source: 'TBD',
  },
  {
    id: 'mlb',
    name: 'Major League Baseball',
    short: 'MLB',
    status: 'live',
    href: '/sports/mlb',
    description:
      '30-team factual catalog plus hourly aggregated news from ESPN, MLB.com, CBS Sports, and Yahoo Sports. Lahman seasonal data and Retrosheet game logs are V2 candidates.',
    source: 'Editorial catalog + RSS aggregation (Lahman / Retrosheet for V2)',
  },
  {
    id: 'nhl',
    name: 'National Hockey League',
    short: 'NHL',
    status: 'planned',
    href: '/sports',
    description: 'Roadmapped. Source TBD pending ToS review.',
    source: 'TBD',
  },
];

export default function SportsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed Sports Data"
        description="Free agent-facing sports data API. NFL teams and aggregated news live today, additional leagues planned."
        url="https://tensorfeed.ai/sports"
      />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Trophy className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Sports Data API</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Free agent-facing sports data. NFL is live today; NBA, MLB, and NHL are on the roadmap.
        </p>
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            Sports data is the second open vertical on TensorFeed, after the AI ecosystem. Agents
            asking &ldquo;who plays this week&rdquo; or &ldquo;what is the latest news on the Chiefs&rdquo; can call a clean
            JSON endpoint without scraping ESPN or stitching together five different feeds.
          </p>
          <p>
            Architecture is multi-league from day one (
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
              /api/sports/{'{league}'}/...
            </code>
            ) so additional leagues land without breaking URLs. Each upstream source is reviewed for
            commercial-redistribution rights before integration.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-10">
        {LEAGUES.map(league => (
          <div
            key={league.id}
            className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-text-primary">{league.short}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${
                  league.status === 'live'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'bg-bg-tertiary text-text-tertiary'
                }`}
              >
                {league.status}
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-1">{league.name}</div>
            <p className="text-sm text-text-secondary leading-relaxed mt-2 flex-1">
              {league.description}
            </p>
            <div className="text-xs text-text-tertiary mt-3">Source: {league.source}</div>
            {league.status === 'live' && league.href !== '/sports' && (
              <Link
                href={league.href}
                className="mt-4 inline-flex items-center gap-1 text-accent-primary text-sm hover:underline"
              >
                Open {league.short} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {league.status === 'live' && league.href === '/sports' && (
              <div className="mt-4 text-xs text-text-tertiary">
                API live; dedicated page coming soon.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports</code>
            <span className="text-text-secondary ml-2">League directory (live + roadmapped)</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/teams</code>
            <span className="text-text-secondary ml-2">32 NFL teams, filterable by conference and division</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/teams/{'{id}'}</code>
            <span className="text-text-secondary ml-2">One team by id (e.g. sf, kc, nyj) or abbreviation</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/news</code>
            <span className="text-text-secondary ml-2">RSS-aggregated NFL headlines, optional ?team= filter</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
