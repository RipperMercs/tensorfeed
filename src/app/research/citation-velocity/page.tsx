import type { Metadata } from 'next';
import VelocityClient from './VelocityClient';

export const metadata: Metadata = {
  title: 'AI Citation Velocity Leaders | TensorFeed',
  description:
    'AI papers from the last 2 years ranked by the share of their total citations that arrived in the most recent calendar year. Answers "what is being cited fastest right now" rather than "what has been cited the most overall."',
  alternates: { canonical: 'https://tensorfeed.ai/research/citation-velocity' },
  openGraph: {
    title: 'AI Citation Velocity Leaders | TensorFeed',
    description:
      'AI papers ranked by share of citations gained in the most recent calendar year.',
    url: 'https://tensorfeed.ai/research/citation-velocity',
    type: 'website',
  },
};

export default function VelocityPage() {
  return <VelocityClient />;
}
