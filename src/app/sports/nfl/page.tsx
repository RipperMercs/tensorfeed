import { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ArrowLeft } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import { NFL_TEAMS, NFLTeam } from '@/lib/nfl-teams';
import NFLNewsWidget from '@/components/sports/NFLNewsWidget';

export const metadata: Metadata = {
  title: 'NFL Teams, News, and API | TensorFeed Sports',
  description:
    'NFL data for AI agents. Full 32-team catalog (id, city, conference, division) plus aggregated news from ESPN, NFL.com, CBS Sports, and Yahoo Sports. Free JSON API at /api/sports/nfl.',
  alternates: { canonical: 'https://tensorfeed.ai/sports/nfl' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/sports/nfl',
    title: 'TensorFeed NFL Data',
    description:
      '32-team factual catalog plus hourly aggregated news from ESPN, NFL.com, CBS, Yahoo. Free JSON.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed NFL Data',
    description: '32 teams, aggregated news, free JSON API for agents.',
  },
};

const FAQS = [
  {
    question: 'Where does the NFL data come from?',
    answer:
      'Teams are a hand-curated factual catalog (public-domain data). News is aggregated hourly from ESPN, NFL.com, CBS Sports, and Yahoo Sports under the standard RSS fair-use pattern (titles plus 200-character snippets plus mandatory link to the original). Players, schedule, weekly stats, and injuries land in V2 from nflverse-data, which is CC-BY-4.0 and explicitly permits commercial redistribution.',
  },
  {
    question: 'How often is the data refreshed?',
    answer:
      'Teams: not refreshed (factual data, hand-edited on roster/relocation events). News: hourly during all seasons.',
  },
  {
    question: 'Can I use this commercially?',
    answer:
      'Yes. The teams catalog is factual data and not copyrightable per Feist. News is syndicated under the publisher RSS license and links back to the canonical source. Future nflverse-derived endpoints will require a one-line attribution per the CC-BY-4.0 license. Vendor scraping is not in our pipeline anywhere.',
  },
  {
    question: 'Why no players or stats yet?',
    answer:
      'Because doing it right takes care. The plan is nflverse-data (CC-BY-4.0) for rosters, schedule, weekly stats, snap counts, and injuries. Pulling parquet/CSV in a Cloudflare Worker has constraints we want to test before shipping. V2 is on the roadmap.',
  },
];

function teamsByDivision(): Record<string, NFLTeam[]> {
  const out: Record<string, NFLTeam[]> = {};
  for (const t of NFL_TEAMS) {
    const key = `${t.conference} ${t.division}`;
    if (!out[key]) out[key] = [];
    out[key].push(t);
  }
  return out;
}

const DIVISION_ORDER = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
];

export default function NFLPage() {
  const grouped = teamsByDivision();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed NFL Data"
        description="NFL teams catalog and aggregated news for AI agents. Free JSON API."
        url="https://tensorfeed.ai/sports/nfl"
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
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">NFL</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Teams and news for the National Football League. Built for agents first; humans get the
          same data on this page.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 mb-10">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-text-primary mb-4">All 32 teams</h2>
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
            <NFLNewsWidget />
          </div>
          <div className="text-xs text-text-tertiary mt-2">
            Aggregated hourly from ESPN, NFL.com, CBS Sports, Yahoo Sports.
          </div>
        </aside>
      </div>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/teams</code>
            <span className="text-text-secondary ml-2">All 32 teams (filter by conference / division)</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/teams/{'{id}'}</code>
            <span className="text-text-secondary ml-2">One team by id (e.g. sf, kc, nyj) or abbreviation</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/sports/nfl/news</code>
            <span className="text-text-secondary ml-2 block mt-1">
              RSS-aggregated NFL headlines. Optional <code className="bg-bg-tertiary px-1 rounded">?limit=&team=</code>{' '}
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
