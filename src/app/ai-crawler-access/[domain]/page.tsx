import { Metadata } from 'next';
import Link from 'next/link';
import { CRAWLER_DOMAINS } from '@/data/ai-crawler-access/domains';
import { DatasetJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import SiteVerdictClient from './SiteVerdictClient';

export function generateStaticParams() {
  return CRAWLER_DOMAINS.map((d) => ({ domain: d.domain }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { domain: string } }): Metadata {
  const domain = params.domain;
  const title = `Does ${domain} allow AI crawlers? GPTBot, ClaudeBot, llms.txt | TensorFeed`;
  const description = `Live robots.txt verdict for ${domain}: which AI bots (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended) it allows or blocks, plus llms.txt and ai.txt status. Updated daily.`;
  const url = `https://tensorfeed.ai/ai-crawler-access/${domain}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: { card: 'summary', title, description },
  };
}

export default function DomainPage({ params }: { params: { domain: string } }) {
  const domain = params.domain;
  const faqs = [
    {
      question: `Does ${domain} block GPTBot?`,
      answer: `The verdict above reads ${domain}'s live robots.txt for OpenAI's GPTBot. We report the stated policy in robots.txt, not whether the bot honors it. Compliance is voluntary.`,
    },
    {
      question: 'What does "partial" mean?',
      answer: `Partial means ${domain} disallows the bot from some paths but not the site root. Blocked means the root is disallowed. Unknown means the robots.txt could not be read.`,
    },
    {
      question: 'How fresh is this?',
      answer:
        'TensorFeed re-crawls each tracked domain on a weekly rolling cadence. The last-checked time is shown with the verdict.',
    },
  ];
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name={`AI crawler access for ${domain}`}
        description={`robots.txt, llms.txt and ai.txt verdict for ${domain}.`}
        url={`https://tensorfeed.ai/ai-crawler-access/${domain}`}
        jsonUrl={`/api/ai-crawler-access/site?domain=${domain}`}
        keywords={[`${domain} gptbot`, `${domain} robots.txt`, `does ${domain} block ai`]}
      />
      <FAQPageJsonLd faqs={faqs} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Crawler Access', url: 'https://tensorfeed.ai/ai-crawler-access' },
          { name: domain, url: `https://tensorfeed.ai/ai-crawler-access/${domain}` },
        ]}
      />
      <nav className="text-xs text-text-muted mb-4">
        <Link href="/ai-crawler-access" className="hover:text-accent-primary">
          AI Crawler Access
        </Link>{' '}
        / {domain}
      </nav>
      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
        Does {domain} allow AI crawlers?
      </h1>
      <p className="text-text-secondary mb-4">
        Live robots.txt, llms.txt, and ai.txt verdict for{' '}
        <span className="font-mono">{domain}</span>. We report stated policy, not enforcement.
      </p>
      <MachineReadableLink endpoint={`/api/ai-crawler-access/site?domain=${domain}`} className="mb-6" />
      <SiteVerdictClient domain={domain} />
      <section className="border-t border-bg-tertiary mt-10 pt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">FAQ</h2>
        <dl className="space-y-4 text-sm">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="font-semibold text-text-primary mb-1">{f.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
