import { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import InstitutionsWidget from '@/components/research/InstitutionsWidget';

export const metadata: Metadata = {
  title: 'AI Research Institutions Leaderboard | TensorFeed',
  description:
    'Top universities, labs, and companies ranked by AI-tagged publications in the last 365 days. Source: OpenAlex (CC0 public domain). Free JSON API at /api/research/institutions/ai.',
  alternates: { canonical: 'https://tensorfeed.ai/research/institutions' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/research/institutions',
    title: 'AI Research Institutions Leaderboard',
    description:
      'Where AI research is happening: universities, labs, companies ranked by AI publications. CC0 data, free JSON.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Research Institutions',
    description: 'Top institutions by AI-tagged publications. CC0 public domain. Free JSON.',
  },
};

const FAQS = [
  {
    question: 'What counts as an "AI-tagged" publication?',
    answer:
      "OpenAlex assigns a concept hierarchy to every work. Our query filters on concept C154945302 (Artificial intelligence), which is OpenAlex's broad parent for the AI body of work. That captures machine learning, NLP, computer vision, robotics, and the rest of the canonical AI subfields.",
  },
  {
    question: 'Where does the data come from?',
    answer:
      'OpenAlex (openalex.org). Their full dataset is released under CC0 (public domain dedication), free for commercial use and redistribution without restriction. We use their group_by API to aggregate works by institution, then enrich the top 100 with display name + country + type via a second API call. Two requests per cron tick.',
  },
  {
    question: 'How often is the leaderboard refreshed?',
    answer:
      "Daily at 04:00 UTC. The window is rolling: each refresh aggregates publications from the trailing 365 days. So a given institution’s number drops over time as papers age out of the window unless they keep publishing.",
  },
  {
    question: 'Why is my favorite lab missing?',
    answer:
      "Two likely reasons: (1) it's outside the top-100 captured per refresh; or (2) OpenAlex doesn't have an institution record for it (most major universities and corporate labs are present, but smaller research groups may not be). The full ranked list is available via the API; the page caps display at 50 entries, but `?limit=200` returns the full snapshot.",
  },
];

export default function ResearchInstitutionsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Research Institutions"
        description="Top institutions worldwide ranked by AI-tagged publications in the last 365 days, sourced from OpenAlex (CC0 public domain)."
        url="https://tensorfeed.ai/research/institutions"
        jsonUrl="/api/research/institutions/ai"
        keywords={[
          'ai research institutions',
          'openalex',
          'ai publications leaderboard',
          'university ai research',
          'corporate ai labs',
          'ai publication counts',
          'institution rankings',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <Link
        href="/research"
        className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-accent-cyan mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Research
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <GraduationCap className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Research Institutions</h1>
        </div>
        <MachineReadableLink endpoint="/api/research/institutions/ai" className="mt-2" />
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Where AI research is actually happening. Top universities, labs, and companies ranked
          by AI-tagged publications in the last 365 days.
        </p>
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            The /api/papers/* endpoints we already publish cover paper-level data (Semantic Scholar
            + arXiv). What was missing until today: an institution-level view. Agents asking
            &ldquo;who&apos;s leading AI research at academic plus industrial labs&rdquo; now have a clean answer.
          </p>
          <p>
            Source is OpenAlex, the open scholarly index covering 250M+ works and 100k+ institutions.
            Their dataset is released under CC0 (public domain) so we can redistribute the aggregate
            freely. Each row links to the institution&apos;s OpenAlex page for verification.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Top institutions by AI publications</h2>
          <span className="text-xs text-text-tertiary font-mono">refreshed 04:00 UTC</span>
        </div>
        <InstitutionsWidget />
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/research/institutions/ai</code>
            <span className="text-text-secondary ml-2 block mt-1">
              Top institutions by AI publications (last 365 days). Filters:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?country=US|CN|GB|...&type=education|company|government&limit=</code>.
              Top 100 captured daily; default response returns the full set.
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
