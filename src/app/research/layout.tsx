import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Research Papers & Benchmarks',
  description: 'Latest AI research papers, benchmark scores, and academic developments from arXiv, MIT Technology Review, and more.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/research',
    title: 'AI Research Papers & Benchmarks',
    description: 'Latest AI research papers, benchmark scores, and academic developments from arXiv, MIT Technology Review, and more.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Research Papers & Benchmarks',
    description: 'Latest AI research papers, benchmark scores, and academic developments from arXiv, MIT Technology Review, and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
