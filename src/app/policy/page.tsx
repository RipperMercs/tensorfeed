import { Metadata } from 'next';
import { Scale } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import PolicyRegistryWidget from '@/components/policy/PolicyRegistryWidget';

export const metadata: Metadata = {
  title: 'AI Policy Registry: EOs, Statutes, Regulations | TensorFeed Policy',
  description:
    "Editorial registry of significant AI policy actions across US Federal, US State, EU, UK, China, and international declarations. Free JSON API at /api/policy/ai/registry.",
  alternates: { canonical: 'https://tensorfeed.ai/policy' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/policy',
    title: 'TensorFeed AI Policy Registry',
    description:
      'Significant AI executive orders, statutes, regulations across six jurisdictions. Free JSON API.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed AI Policy Registry',
    description: 'AI policy across US, EU, UK, China, international. Free JSON.',
  },
};

const FAQS = [
  {
    question: 'What does this catalog cover?',
    answer:
      "Significant AI policy actions across six jurisdictions: US Federal (executive orders, BIS export controls), US State (Colorado SB 24-205, Utah HB 333, California AB 2013 / SB 942 / SB 1047, etc.), EU (AI Act 2024/1689 phased rollout), UK (pro-innovation paper, AI Safety Institute), China (CAC GenAI and Deep Synthesis Provisions), and international declarations (Bletchley, Seoul). Each entry carries jurisdiction, type, status, enacted date, effective date, scope tags, and a link to the canonical source.",
  },
  {
    question: 'Who curates the registry?',
    answer:
      "TensorFeed editorial. The underlying acts, orders, and regulations are government publications (US federal works are public domain; EU and UK government works are reproduced under their open-government terms with citation; China CAC publications are official rulemaking texts). Summaries are our own; we link directly to the canonical government publication for each entry so you can verify the source yourself.",
  },
  {
    question: 'How fresh is it?',
    answer:
      "Editorial. Updates land on redeploy when significant new policy is enacted or when status changes (active to rescinded, pending to active, etc). The registry is small enough to maintain accurately by hand; we'd rather ship 16 well-curated entries than 100 with stale status fields.",
  },
  {
    question: 'Can I use this commercially?',
    answer:
      'Yes. Underlying government publications are free to redistribute under their respective public-records terms. The TensorFeed registry shape (titles, summaries, scope tags) is editorial work product and we encourage agents and analysts to consume it via the JSON API. Each entry preserves the canonical source URL so end-users can verify.',
  },
];

export default function PolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Policy Registry"
        description="Editorial catalog of significant AI policy actions across six jurisdictions: US Federal, US State, EU, UK, China, and International."
        url="https://tensorfeed.ai/policy"
        jsonUrl="/api/policy/ai/registry"
        keywords={[
          'ai policy registry',
          'ai executive orders',
          'eu ai act',
          'ai regulation tracker',
          'us state ai law',
          'ai export controls',
          'ai safety declarations',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Scale className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Policy Registry</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Significant AI policy actions across the US, EU, UK, China, and international forums.
          Editorial, structured, source-linked.
        </p>
        <MachineReadableLink endpoint="/api/policy/ai/registry" className="mt-2" />
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            The other &ldquo;AI policy tracker&rdquo; resources online tend to be either expert paywalls or
            wikis that go stale. This is the third option: a structured editorial registry,
            published as a free JSON API for agents, with each entry linking to the canonical
            government source.
          </p>
          <p>
            Status semantics are explicit: <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs">active</code> /
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs ml-1">phased</code> /
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs ml-1">pending</code> /
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs ml-1">rescinded</code> /
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs ml-1">vetoed</code>. Scope tags
            (transparency, safety, high-risk, deepfakes, export-controls, etc.) make filtering
            obvious.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <PolicyRegistryWidget />
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoint</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/policy/ai/registry</code>
            <span className="text-text-secondary ml-2 block mt-1">
              Full registry. Filters:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?jurisdiction=&type=&status=&scope=</code>.
              Each entry returns id, title, jurisdiction, type, status, enacted_date,
              effective_date, summary, source_url, citations, scope[].
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
