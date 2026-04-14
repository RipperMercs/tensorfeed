import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare AI Models Side by Side | TensorFeed.ai',
  description:
    'Compare Claude vs ChatGPT, GPT-4o vs Gemini, and more. Side-by-side pricing, context windows, and capabilities for all major AI models.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/compare',
    title: 'Compare AI Models Side by Side | TensorFeed.ai',
    description:
      'Compare Claude vs ChatGPT, GPT-4o vs Gemini, and more. Side-by-side pricing, context windows, and capabilities for all major AI models.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Compare AI Models Side by Side | TensorFeed.ai',
    description:
      'Compare Claude vs ChatGPT, GPT-4o vs Gemini, and more. Side-by-side pricing, context windows, and capabilities for all major AI models.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
