import type { Metadata } from 'next';
import MilestonesClient from './MilestonesClient';

export const metadata: Metadata = {
  title: 'AI Milestone Papers (Last 30 Days) | TensorFeed',
  description:
    'AI research papers flagged as milestone candidates by the TensorFeed offline extraction pipeline. Each paper carries the named benchmark plus quantified delta, model release, or novel architecture that triggered the flag.',
  alternates: { canonical: 'https://tensorfeed.ai/research/milestones' },
  openGraph: {
    title: 'AI Milestone Papers (Last 30 Days) | TensorFeed',
    description:
      'Research papers flagged as milestone candidates by the TensorFeed extraction pipeline.',
    url: 'https://tensorfeed.ai/research/milestones',
    type: 'website',
  },
};

export default function MilestonesPage() {
  return <MilestonesClient />;
}
