import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, Trophy, ArrowRight, Info, AlertCircle } from 'lucide-react';
import {
  WebApplicationJsonLd,
  FAQPageJsonLd,
  BreadcrumbListJsonLd,
} from '@/components/seo/JsonLd';
import LeaderboardClient from './LeaderboardClient';

export interface LeaderboardEntry {
  provider: string;
  rank: number;
  uptime_pct: number;
  polls: number;
  operational_polls: number;
  degraded_polls: number;
  down_polls: number;
  unknown_polls: number;
  downtime_minutes: number;
  hard_down_minutes: number;
}

export interface LeaderboardOk {
  ok: true;
  range: { from: string; to: string; days: number };
  generated_at: string;
  entry_count: number;
  poll_interval_minutes: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardErr {
  ok: false;
  error: string;
  message: string;
  range?: { from: string; to: string; days: number };
}

async function fetchLeaderboard(): Promise<LeaderboardOk | LeaderboardErr | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status/leaderboard?days=7', {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardOk | LeaderboardErr;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: 'AI Provider Uptime Leaderboard - Live 7-Day Rankings',
  description:
    'Live uptime ranking of every major AI provider including Claude, OpenAI, Gemini, AWS Bedrock, Azure OpenAI, Perplexity, Groq, and more. Computed from minute-resolution monitoring (one sample every 2 minutes per provider). See who is most reliable right now.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/leaderboard',
    title: 'AI Provider Uptime Leaderboard - Live 7-Day Rankings',
    description:
      'Live uptime ranking of every major AI provider over the last 7 days. Computed from minute-resolution monitoring.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Provider Uptime Leaderboard - Live 7-Day Rankings',
    description:
      'Live uptime ranking of every major AI provider. See who is most reliable right now.',
  },
  alternates: { canonical: 'https://tensorfeed.ai/leaderboard' },
};

export default async function LeaderboardPage() {
  const initialData = await fetchLeaderboard();

  const faqs = [
    {
      question: 'How is uptime calculated?',
      answer:
        'For every monitored provider we capture a status sample every 2 minutes (about 720 samples per day, 5040 over a 7-day window). Uptime % is (operational_samples + 0.5 * degraded_samples) / decisive_samples * 100. Decisive_samples excludes unknown polls so a brief outage on our side does not penalize the provider. Tie-breaker for equal uptime is lower hard_down_minutes (a clean degraded period beats actual downs at the same headline %).',
    },
    {
      question: 'Why does degraded count as half?',
      answer:
        'Degraded service is not the same as unavailable. Most degraded periods (elevated latency, rate-limit pressure, partial-region issues) still let some traffic succeed. Counting degraded as half operational gives a fair single-number ranking instead of treating all non-perfect time as equally bad.',
    },
    {
      question: 'Is this real-time?',
      answer:
        'Refreshes every 2 minutes on the worker side and every 5 minutes on this page. The status data underlying each rank is captured from each provider\'s public status feed (Atlassian Statuspage, Instatus, Google Cloud incidents.json, AWS Health, Azure RSS) at the same 2-minute cadence. So the leaderboard reflects actual minute-resolution uptime, not a once-a-day snapshot.',
    },
    {
      question: 'Why is the data only 7 days?',
      answer:
        'The free leaderboard caps at 7 days. The premium API endpoint /api/premium/status/leaderboard extends to the full 90-day retention horizon and adds incident_count and mttr_minutes (mean time to recover) per provider. See tensorfeed.ai/developers/agent-payments for the paid tier.',
    },
    {
      question: 'What if a provider just got added?',
      answer:
        'New providers start with zero historical samples and accumulate from their addition date. Their uptime % is computed against the polls they were monitored for, not penalized for the days before they were added. So a provider added 3 days ago will rank against 3 days of data while one monitored for the full 7 ranks against 7.',
    },
    {
      question: 'Where do I get the raw data?',
      answer:
        'GET https://tensorfeed.ai/api/status/leaderboard?days=7 returns the same data this page renders, free, no auth required. Cached 5 minutes at the edge.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="AI Provider Uptime Leaderboard"
        description="Live uptime ranking of major AI providers computed from minute-resolution monitoring."
        url="https://tensorfeed.ai/leaderboard"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Service Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Uptime Leaderboard', url: 'https://tensorfeed.ai/leaderboard' },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">AI Provider Uptime Leaderboard</h1>
        </div>
        <p className="text-text-secondary text-base">
          Live ranking of every major AI provider by uptime over the last 7 days. Computed from
          minute-resolution monitoring at 2-minute polling.
        </p>
      </div>

      {/* Leaderboard (client-rendered for live updates) */}
      <LeaderboardClient initialData={initialData} />

      {/* Methodology */}
      <section className="mt-12 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">How we measure</h2>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-6 space-y-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            Every 2 minutes a Cloudflare Worker fetches the status feed of each monitored provider:
            Atlassian Statuspage v2 JSON for most vendors (Anthropic, OpenAI, GitHub, Replicate,
            Cohere, Groq), Instatus for Perplexity, Google Cloud incidents.json filtered by Vertex
            product IDs for Gemini, AWS Health currentevents.json filtered by service substring for
            Bedrock, and Microsoft's Azure status RSS filtered by keyword for Azure OpenAI. HTML
            parsing fallback for Hugging Face and Mistral.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Each poll's per-provider status (operational, degraded, down, unknown) is incremented in
            a per-day counter. Uptime % is{' '}
            <span className="font-mono text-text-primary">
              (operational + 0.5 * degraded) / decisive * 100
            </span>
            , where <span className="font-mono">decisive</span> excludes unknown so a worker outage
            on our side doesn't penalize the provider. Tie-breaker is lower{' '}
            <span className="font-mono">hard_down_minutes</span> (down samples * 2 min), so a clean
            degraded period beats actual downs at the same headline %.
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            Each provider links to its dedicated{' '}
            <span className="font-mono text-text-primary">/is-X-down</span> page with FAQ, real-time
            status, and per-component or per-region detail.
          </p>
        </div>
      </section>

      {/* Premium upsell */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/5 border border-accent-primary/30 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                Want 90 days of history plus MTTR?
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                The free leaderboard above is capped at 7 days. The premium API endpoint extends to
                the full 90-day retention horizon and adds{' '}
                <span className="font-mono text-text-primary">incident_count</span> and{' '}
                <span className="font-mono text-text-primary">mttr_minutes</span> (mean time to
                recover from resolved incidents) per provider. Aimed at SRE/ops/procurement teams
                comparing AI vendor reliability for vendor selection or post-incident reviews.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href="/developers/agent-payments"
                  className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
                >
                  <span>Premium endpoint docs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-text-muted">|</span>
                <code className="text-xs text-text-muted">
                  GET /api/premium/status/leaderboard?from=&amp;to= (1 credit)
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-link to status dashboard */}
      <div className="mb-10">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <Activity className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            See live status for every monitored provider
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-primary font-semibold mb-2">{faq.question}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
