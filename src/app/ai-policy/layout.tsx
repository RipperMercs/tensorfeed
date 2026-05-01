import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Policy Tracker: EU AI Act, GUARD Act, China Measures',
  description:
    'Active and pending AI regulations across jurisdictions: EU AI Act, US GUARD Act, California AB 2013, China Generative AI Measures, Korea Basic Act on AI, UK AISI, NIST AI RMF, ISO 42001. Status, milestones, scope, penalties. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-policy' },
  openGraph: { type: 'website', url: 'https://tensorfeed.ai/ai-policy', title: 'AI Policy Tracker', description: 'AI regulations and frameworks across jurisdictions.', siteName: 'TensorFeed.ai', images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }] },
  twitter: { card: 'summary_large_image', title: 'AI Policy Tracker' },
};

export default function AIPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
