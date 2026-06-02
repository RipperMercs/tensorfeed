import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Banknote, ArrowLeft } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import FundingRegistryWidget from '@/components/funding/FundingRegistryWidget';

export const metadata: Metadata = {
  title: 'AI Funding Portfolio: Equity Stakes Tagged by Silicon | TensorFeed',
  description:
    'Hand-curated registry of disclosed AI corporate equity stakes, compute commitments, and capacity partnerships. Each entry tagged with the recipient silicon dependency. Free JSON API at /api/funding/portfolio.',
  alternates: { canonical: 'https://tensorfeed.ai/funding/portfolio' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/funding/portfolio',
    title: 'TensorFeed AI Funding Portfolio Tracker',
    description:
      'Disclosed AI capital commitments tagged by recipient silicon dependency. The customer-investor loop, structured.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed AI Funding Portfolio Tracker',
    description: 'Disclosed AI capital commitments tagged by silicon dependency. Free JSON.',
  },
};

const FAQS = [
  {
    question: 'What does this registry cover?',
    answer:
      "Disclosed AI capital commitments where the source is a SEC filing, hyperscaler press release, or reputable trade reporting. Equity stakes, compute purchase commitments, and capacity partnerships all qualify. Each entry is tagged with the recipient's primary silicon dependency at announcement (Nvidia, TPU, Trainium, MI400, Maia, or mixed) so an agent can analyze the customer-investor loop directly.",
  },
  {
    question: 'How is this different from /funding (the rounds tracker)?',
    answer:
      "/funding tracks AI startup financing rounds (seed, Series A through E, growth) with stage and post-money valuation. /funding/portfolio tracks corporate AI equity stakes BETWEEN existing players (Nvidia investing in OpenAI, Google in Anthropic, etc.) plus compute commitments and capacity partnerships, tagged by recipient silicon dependency. Different lens, complementary registry.",
  },
  {
    question: 'Why the silicon-dependency tag?',
    answer:
      "The customer-investor loop only makes sense when you can see the silicon side. A $30B equity stake from a chip vendor in a frontier lab pencils very differently when the lab runs primarily on that vendor's silicon (defense) versus on a competitor's (a hedge). Tagging the silicon dependency explicitly lets the registry serve as input to that analysis rather than just a deal log.",
  },
  {
    question: 'Who curates the registry?',
    answer:
      "TensorFeed editorial. The underlying public-record sources retain their original license; the TF curation, tagging, and commercial_quid_pro_quo summaries are CC-BY 4.0. Each entry preserves the canonical source URL so end-users can verify.",
  },
  {
    question: 'How fresh is it?',
    answer:
      "Editorial cadence. An entry is added when a related original article goes out, or when reporting picks up something we have not covered. Smaller and more carefully curated than automated CB scraping; we would rather ship 10 well-sourced entries than 100 with stale tags.",
  },
];

export default function FundingPortfolioPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Funding Portfolio Tracker"
        description="Hand-curated registry of disclosed AI capital commitments tagged with recipient silicon dependency."
        url="https://tensorfeed.ai/funding/portfolio"
        jsonUrl="/api/funding/portfolio"
        keywords={[
          'ai funding portfolio',
          'corporate equity stakes',
          'compute commitments',
          'capacity partnerships',
          'silicon dependency',
          'customer investor loop',
          'nvidia openai stake',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <Link
        href="/funding"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AI funding rounds
      </Link>

      {/*
        Hero with photo background. Aerial desert plain at dusk with
        light filaments flowing toward an industrial cluster on the
        horizon. The filaments suggest capital flowing into
        infrastructure (the page's exact thesis). 2400px WebP, ~195KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-20">
        <Image
          src="/funding-portfolio-hero.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1024px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.60) 0%, rgba(2,6,23,0.78) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
          }}
        />

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
            <Banknote className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">AI Funding Portfolio</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl drop-shadow">
          Disclosed AI corporate equity stakes, compute commitments, and capacity partnerships, each
          tagged with the recipient silicon dependency.
        </p>
        <MachineReadableLink endpoint="/api/funding/portfolio" className="mt-2" />
      </section>

      <div className="mb-10">
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            Generic funding trackers (including our own{' '}
            <Link href="/funding" className="text-accent-primary hover:underline">/funding rounds tracker</Link>)
            list deal size and date. This registry adds the silicon side: every entry pairs the financial
            flow with the AI hardware the recipient actually runs on. That is the lens we used in the{' '}
            <Link href="/originals/nvidia-40b-equity-customer-investor-loop" className="text-accent-primary hover:underline">
              Nvidia $40B equity book article
            </Link>{' '}
            to argue that the 2026 Nvidia portfolio is best read as defense, not growth: a $30B option on
            OpenAI staying primarily on Nvidia, $3.2B on Corning supplying optical interconnect for the next
            two Nvidia generations, $2.1B on IREN deploying 5 GW of Nvidia DSX-branded racks.
          </p>
          <p>
            The most useful single number for tracking whether the loop is working is the share of frontier
            training compute (in FLOPs) that runs on Nvidia in any given quarter. We will start publishing
            that derived metric once enough quarters of disclosure have rolled in.
          </p>
          <p>
            For the physical-buildout layer underneath these capital flows (the campuses, the nuclear PPAs,
            the gigawatt deals that turn equity dollars into actual silicon), see{' '}
            <Link href="/ai-infrastructure" className="text-accent-primary hover:underline">
              /ai-infrastructure
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="mb-12">
        <FundingRegistryWidget />
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoint</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/funding/portfolio</code>
            <span className="text-text-secondary ml-2 block mt-1">
              Full registry plus summary aggregates by silicon dependency, deal type, and investor. Filters:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?silicon_dependency=&type=&from=&to=&since=&until=</code>.
              Each entry returns id, from, to, amount_usd_max, amount_usd_disclosed, announced_date, type,
              recipient_silicon_dependency, commercial_quid_pro_quo, source_urls, notes.
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
