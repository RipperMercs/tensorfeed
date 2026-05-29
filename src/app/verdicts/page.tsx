import { Metadata } from 'next';
import Link from 'next/link';
import { Gavel, ArrowRight } from 'lucide-react';
import { VERDICTS } from '@/lib/verdicts-directory';

export const metadata: Metadata = {
  title: 'TF Verdicts | Signed, Data-Grounded Rulings on the AI Ecosystem',
  description:
    "TensorFeed's verdicts: opinionated, signed rulings on specific AI-ecosystem questions, reasoned from cited public data points. We publish the evidence and the sources so you can check the call.",
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/verdicts',
    title: 'TF Verdicts | Signed, Data-Grounded Rulings on the AI Ecosystem',
    description:
      "TensorFeed's verdicts: opinionated, signed rulings on specific AI-ecosystem questions, reasoned from cited public data points, with the evidence shown.",
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TF Verdicts | Signed, Data-Grounded Rulings on the AI Ecosystem',
    description:
      "TensorFeed's signed, data-grounded rulings on specific AI-ecosystem questions, with the evidence shown.",
  },
};

const confidenceLabel: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export default function VerdictsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Gavel className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">TF Verdicts</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Signed, opinionated rulings on specific AI-ecosystem questions, reasoned from cited data. We
          show the evidence so you can check the call.
        </p>
      </div>

      {VERDICTS.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-text-secondary">
          The first batch of verdicts is in final review. Check back shortly.
        </div>
      ) : (
        <div className="grid gap-6">
          {VERDICTS.map((v) => (
            <Link
              key={v.slug}
              href={`/verdicts/${v.slug}`}
              className="group block bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-start gap-4">
                <Gavel className="w-5 h-5 text-accent-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap text-xs font-mono uppercase tracking-wider text-text-muted">
                    <span className="text-accent-primary">{v.category}</span>
                    <span>&middot;</span>
                    <span>{v.date}</span>
                    <span>&middot;</span>
                    <span>{confidenceLabel[v.confidence] ?? v.confidence}</span>
                  </div>
                  <p className="text-sm text-text-muted mb-1">{v.question}</p>
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-3">
                    {v.ruling}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-sm text-accent-primary font-medium group-hover:gap-2 transition-all">
                    Read the verdict
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
