import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Funding Rounds Tracker: OpenAI, Anthropic, Cursor, Cognition',
  description:
    'Notable AI startup funding rounds with structured fields: date, stage, amount, valuation, lead investors. OpenAI, Anthropic, Cursor, Cognition, Mistral, Sierra, Glean, Perplexity, Cohere, Groq, Together, Crusoe, ElevenLabs, Cartesia. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/funding' },
  openGraph: { type: 'website', url: 'https://tensorfeed.ai/funding', title: 'AI Funding Rounds Tracker', description: 'Structured AI startup financing data.', siteName: 'TensorFeed.ai', images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }] },
  twitter: { card: 'summary_large_image', title: 'AI Funding Rounds Tracker' },
};

export default function FundingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
