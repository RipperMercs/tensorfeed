import { Metadata } from 'next';
import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'TensorFeed Intelligence Index (TFII): composite AI model scores',
  description:
    'TFII is a versioned composite score (0 to 100) for AI models, derived from public benchmarks and discounted for contamination and saturation. Free headline scores, signed premium breakdown and history. Machine-readable at /api/intelligence.',
  alternates: { canonical: 'https://tensorfeed.ai/intelligence' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/intelligence',
    title: 'TensorFeed Intelligence Index (TFII)',
    description: 'Composite AI model intelligence scores derived from public benchmarks. Free headline, signed premium depth.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Intelligence Index (TFII)',
    description: 'Composite AI model intelligence scores from public benchmarks.',
  },
};

const FAQS = [
  {
    question: 'What is the TensorFeed Intelligence Index?',
    answer:
      'TFII is a composite score from 0 to 100 that summarizes a model\'s capability across public benchmarks (MMLU-Pro, HumanEval, GPQA-Diamond, MATH, SWE-bench). Raw scores are discounted for contamination risk and benchmark saturation, then combined by category weight.',
  },
  {
    question: 'Is the methodology public?',
    answer:
      'The inputs, categories, the discount approach, and the version are public. The exact category weights and discount multipliers are proprietary. The score is an editorial derivation over public inputs, not a guarantee.',
  },
  {
    question: 'How fresh is it?',
    answer:
      'The index recomputes daily. The free headline is at /api/intelligence; the signed per-benchmark breakdown and the historical series are premium at /api/premium/model-intelligence.',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Intelligence Index', url: 'https://tensorfeed.ai/intelligence' },
];

export default function IntelligencePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed Intelligence Index (TFII)"
        description="Composite AI model intelligence scores derived from public benchmarks, discounted for contamination and saturation."
        url="https://tensorfeed.ai/intelligence"
        keywords={[
          'ai model intelligence index',
          'composite benchmark score',
          'mmlu-pro',
          'humaneval',
          'gpqa diamond',
          'swe-bench',
          'model capability ranking',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Gauge className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">TensorFeed Intelligence Index</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          TFII is a versioned composite score from 0 to 100 that summarizes how capable a model is across public
          benchmarks. It is the same quality signal that powers our{' '}
          <Link href="/compare" className="text-accent-primary hover:underline">model comparisons</Link> and the Route
          Verdict routing decision. Free headline scores live on{' '}
          <Link href="/models" className="text-accent-primary hover:underline">/models</Link>.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">How we compute it</h2>
        <ul className="space-y-2 text-text-secondary text-sm leading-relaxed list-disc pl-5 max-w-3xl">
          <li>Inputs: MMLU-Pro (knowledge), HumanEval and SWE-bench (code), GPQA-Diamond (science reasoning), MATH (math).</li>
          <li>Each raw score is discounted for contamination risk and benchmark saturation, so a saturated or gameable benchmark counts for less.</li>
          <li>The discounted scores are combined by category weight into the headline composite. Per-task subscores (code, reasoning, creative, general) are available in the premium breakdown.</li>
          <li>Models scored on too few benchmarks are flagged low coverage and held out of the ranking.</li>
          <li>The exact weights and discount multipliers are proprietary; the index is an editorial derivation over public inputs.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">For agents</h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-3xl mb-3">
          The free ranked table is at{' '}
          <a href="/api/intelligence" className="text-accent-primary hover:underline font-mono">/api/intelligence</a>.
          The signed per-benchmark breakdown is at{' '}
          <span className="font-mono">/api/premium/model-intelligence</span> (optional{' '}
          <code className="font-mono">?model=</code>), and the historical series at{' '}
          <span className="font-mono">/api/premium/model-intelligence/history?model=</span>. Premium responses carry an
          AFTA-signed receipt and are no-charge when the data is stale.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map(f => (
            <details key={f.question} className="rounded-lg border border-border bg-bg-secondary/50 p-4">
              <summary className="text-text-primary font-medium cursor-pointer">{f.question}</summary>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
