import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TensorFeed Catalogs Index: 33 Free Agent-Shaped Data Surfaces',
  description:
    'Complete index of TensorFeed catalogs: AI hardware, GPU pricing, models, embeddings, multimodal, vector DBs, frameworks, harnesses, benchmarks, leaderboards, marketplaces, MCP servers, fine-tuning, training datasets, funding, policy, conferences, and more. All free, all machine-readable.',
  alternates: { canonical: 'https://tensorfeed.ai/catalogs' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/catalogs',
    title: 'TensorFeed Catalogs Index',
    description: 'All 33 TensorFeed agent-shaped data surfaces in one place.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'TensorFeed Catalogs Index', description: 'All 33 TensorFeed catalogs in one place.' },
};

export default function CatalogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
