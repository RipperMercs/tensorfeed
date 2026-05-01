import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Model Cards & Safety Evaluations Aggregator',
  description:
    'Published system cards, model cards, safety evaluations, and red-team reports for frontier AI models. Anthropic ASL, OpenAI Preparedness Framework, Google Frontier Safety Framework, METR autonomy evals, AISI, Apollo Research. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/model-cards' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/model-cards',
    title: 'AI Model Cards & Safety Evaluations',
    description: 'Aggregator of system cards, safety evals, and red-team reports for frontier AI.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Model Cards & Safety Evaluations' },
};

export default function ModelCardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
