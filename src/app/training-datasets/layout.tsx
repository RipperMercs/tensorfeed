import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Training Datasets Registry: FineWeb, RedPajama, The Stack',
  description:
    'Catalog of AI pretraining corpora, instruction-tuning, and DPO datasets. FineWeb, FineWeb-Edu, RedPajama v2, Common Crawl, The Pile, Dolma, The Stack v2, Tulu 3, OpenHermes, AgentInstruct, UltraFeedback, LAION-5B. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/training-datasets' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/training-datasets',
    title: 'AI Training Datasets Registry',
    description: 'Pretraining corpora, instruction tuning, and DPO datasets with size, license, source.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Training Datasets Registry', description: 'Pretraining corpora and instruction-tuning datasets.' },
};

export default function TrainingDatasetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
