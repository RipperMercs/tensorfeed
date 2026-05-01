import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Conferences Calendar 2026: NeurIPS, ICLR, ICML, COLM',
  description:
    'Calendar of major AI research and industry conferences in 2026. NeurIPS, ICLR, ICML, COLM, AAAI, ACL, EMNLP, CVPR, plus Google I/O, Microsoft Build, AWS re:Invent, GTC, OpenAI DevDay, Anthropic Builder Day. Dates, locations, paper deadlines. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/conferences' },
  openGraph: { type: 'website', url: 'https://tensorfeed.ai/conferences', title: 'AI Conferences Calendar', description: 'AI research and industry events with dates, locations, deadlines.', siteName: 'TensorFeed.ai', images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }] },
  twitter: { card: 'summary_large_image', title: 'AI Conferences Calendar' },
};

export default function ConferencesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
