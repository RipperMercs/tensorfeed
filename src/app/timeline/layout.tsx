import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Timeline | Major Milestones & Model Releases',
  description:
    'Chronological timeline of AI model releases, industry milestones, and major events from 2024 to present.',
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
