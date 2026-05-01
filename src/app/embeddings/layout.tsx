import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Embedding Models Compared: Pricing, Dimensions, MTEB',
  description:
    'Live comparison of every production embedding and reranker model: OpenAI, Voyage, Cohere, Google, Mistral, Jina, Nomic, Mixedbread, BAAI. Pricing, dimensions, max input tokens, MTEB score. Free, no auth.',
  alternates: { canonical: 'https://tensorfeed.ai/embeddings' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/embeddings',
    title: 'AI Embedding Models Compared',
    description:
      'Pricing, dimensions, max input tokens, MTEB score for every production embedding and reranker model. Free, no auth.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Embedding Models Compared',
    description: 'Embeddings + rerankers across every major provider with pricing, dimensions, MTEB.',
  },
};

export default function EmbeddingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
