import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AGI and ASI: The Race to Artificial General and Superintelligence | TensorFeed.ai',
  description:
    'Track the research, predictions, and milestones on the path to artificial general intelligence and artificial superintelligence. Live news, research papers, and a prediction tracker for AGI timelines from Anthropic, OpenAI, DeepMind, xAI, and Meta.',
  openGraph: {
    title: 'AGI and ASI: The Race to Artificial General and Superintelligence',
    description:
      'The road to AGI and ASI, tracked in real time. Predictions from Dario Amodei, Sam Altman, Demis Hassabis, and more.',
    url: 'https://tensorfeed.ai/agi-asi',
    type: 'article',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/agi-asi',
  },
};

export default function AgiAsiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
