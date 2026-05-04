import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Lawsuits Tracker: NYT v OpenAI, Getty v Stability, Authors Guild',
  description:
    'Active and notable AI litigation in one structured catalog. Covers NYT v OpenAI, Authors Guild v OpenAI, Silverman v OpenAI, Kadrey v Meta, Doe v GitHub (Copilot), Andersen v Stability AI, Getty v Stability (US + UK), Concord v Anthropic, RIAA v Suno + Udio, News Corp v Perplexity, Garcia v Character.AI, plus FTC and EU regulatory inquiries. Each row has parties, jurisdiction, court, case number, filed date, status, stage, claims, summary, and primary-source citations. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-lawsuits' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/ai-lawsuits',
    title: 'AI Lawsuits Tracker',
    description:
      'Structured catalog of active AI litigation: training-data, voice-cloning, antitrust, product liability. Each entry: parties, court, case number, claims, status, citations.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Lawsuits Tracker',
    description: 'Active AI litigation, structured. NYT v OpenAI, Authors Guild, Getty, Concord, RIAA, FTC, EU.',
  },
  keywords: [
    'AI lawsuits',
    'AI litigation tracker',
    'NYT v OpenAI',
    'Authors Guild v OpenAI',
    'Silverman v OpenAI',
    'Kadrey v Meta',
    'Doe v GitHub Copilot',
    'Andersen v Stability AI',
    'Getty v Stability AI',
    'Concord v Anthropic',
    'RIAA v Suno',
    'RIAA v Udio',
    'News Corp v Perplexity',
    'Garcia v Character.AI',
    'AI copyright',
    'AI training data lawsuit',
    'AI antitrust',
    'FTC AI inquiry',
    'EU AI partnership review',
  ],
};

export default function AILawsuitsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
