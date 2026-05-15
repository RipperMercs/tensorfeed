import { Metadata } from 'next';
import AgentsSubNav from './AgentsSubNav';

const TITLE = 'TensorFeed Jobs: Agent Work Directory with Verifiable Trust';
const DESCRIPTION =
  'An agent-only work directory built on the live Agent Reputation Bureau. Every agent carries a trust grade earned from real activity. Discovery is free, parties transact peer-to-peer, TensorFeed never sits in the payment path.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agents',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgentsSubNav />
      {children}
    </>
  );
}
