import { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ArrowLeft } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import { MLB_TEAMS, MLBTeam } from '@/lib/mlb-teams';
import MLBNewsWidget from '@/components/sports/MLBNewsWidget';

export const metadata: Metadata = {
  title: 'MLB Teams, News, and API | TensorFeed Sports',
  description:
    'MLB data for AI agents. Full 30-team catalog (id, city, league, division) plus aggregated news from ESPN, MLB.com, CBS Sports, and Yahoo Sports. Free JSON API at /api/sports/mlb.',
  alternates: { canonical: 'https://tensorfeed.ai/sports/mlb' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/sports/mlb',
    title: 'TensorFeed MLB Data',
    description:
      '30-team factual catalog plus hourly aggregated news from ESPN, MLB.com, CBS, Yahoo. Free JSON.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed MLB Data',
    description: '30 teams, aggregated news, free JSON API for agents.',
  },
};

const FAQS = [
  {
    question: 'Where does the MLB data come from?',
    answer:
      'Teams are a hand-curated factual catalog (public-domain data). News is aggregated hourly from ESPN MLB, MLB.com, CBS Sports MLB, and Yahoo Sports MLB under the standard RSS fair-use pattern (titles plus 200-character snippets plus mandatory link to the original). Lahman seasonal stats (CC-BY-SA) and Retrosheet game logs (free with attribution) are V2 candidates; both are distributed as zipped CSVs that need a streaming zip parser the Worker does not ship today.',
  },
  {
    question: 'How often is the data refreshed?',
    answer:
      'Teams: not refreshed (factual data, hand-edited on roster/relocation events). News: hourly during all seasons (offseason moves, spring training, regular season, playoffs).',
  },
  {
    question: 'Can I use this commercially?',
    answer:
      'Yes. The teams catalog is factual data and not copyrightable per Feist. News is syndicated under the publisher RSS license and links back to the canonical source. Future Lahman-derived endpoints will require a one-line attribution per the CC-BY-SA license. No vendor scraping is in our pipeline anywhere.',
  },
  {
    question: 'Why no players or stats yet?',
    answer:
      'Lahman + Retrosheet are zipped CSV archives. The Cloudflare Worker stack we run doesn\'t bundle a streaming zip parser today; once it does, the V2 ingest is straightforward. Until then we ship V1 (teams + news) and validate the multi-league namespace.',
  },
];

function teamsByDivision(): Record<string, MLBTeam[]> {
  const out: Record<string, MLBTeam[]> = {};
  for (const t of MLB_TEAMS) {
    const key = `${t.league} ${t.division}`;
    if (!out[key]) out[key] = [];
    out[key].push(t);
  }
  return out;
}

const DIVISION_ORDER = [
  'AL East', 'AL Central', 'AL West',
  'NL East', 'NL Central', 'NL West',
];

export default function MLBPage() {
  const grouped = teamsByDivision();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed MLB Data"
        description="MLB teams catalog and aggregated news for AI agents. Free JSON API."
        url="https://tensorfeed.ai/sports/mlb"
      />
      <FAQPageJsonLd faqs={FAQS} />

      <Link
        href="/sports"
        className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-accent-primary mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All sports
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Trophy className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">MLB</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Teams and news for Major League Baseball. Built for agents first; humans get the same
          data on this page.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 mb-10">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-text-primary mb-4">All 30 teams</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {DIVISION_ORDER.map(div => {
              const teams = grouped[div] ?? [];
              return (
                <div key={div} className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
                  <div className="text-xs font-mono text-text-tertiary uppercase mb-2">{div}</div>
                  <ul className="space-y-1.5">
                    {teams.map(t => (
                      <li key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-text-primary">{t.name}</span>
                        <span className="text-text-tertiary font-mono text-xs">{t.abbreviation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <h2 className="text-xl font-bold text-text-primary mb-4">Latest news</h2>
          <div className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
            <MLBNewsWidget />
          </div>
          <div className="text-xs text-text-tertiary mt-2">
            Aggregated hourly from ESPN, MLB.com, CBS Sports, Yahoo Sports.
          </div>
        </aside>
      </div>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/mlb/teams</code>
            <span className="text-text-secondary ml-2">All 30 teams (filter by league / division)</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/mlb/teams/{'{id}'}</code>
            <span className="text-text-secondary ml-2">One team by id (e.g. nyy, lad, sf) or abbreviation</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/mlb/news</code>
            <span className="text-text-secondary ml-2 block mt-1">
              RSS-aggregated MLB headlines. Optional <code className="bg-bg-tertiary px-1 rounded">?limit=&team=</code>{' '}
              to filter to articles mentioning a team. Title plus 200-char snippet plus mandatory link.
            </span>
          </li>
        </ul>
      </div>

      <div className="border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map(faq => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
