import { Metadata } from 'next';
import { DatasetJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import SubstrateView from './SubstrateView';

const TITLE = 'AI Substrate Changelog: Model, Protocol, and Framework Changes | TensorFeed';
const DESCRIPTION =
  'Track changes to the substrate AI agents depend on: AI model deprecations and lifecycle events, agent-protocol spec versions (MCP, x402, A2A), and AI framework releases. A forward-only timeline, refreshed daily, free for humans and agents.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/substrate',
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

export default function SubstratePage() {
  return (
    <>
      <DatasetJsonLd
        name="AI Substrate Changelog"
        description="A forward-only timeline of changes to the substrate AI agents depend on: model lifecycle, agent-protocol spec versions, and agent-framework releases."
        url="https://tensorfeed.ai/substrate"
        jsonUrl="/api/substrate-changelog/recent"
        keywords={['AI model deprecations', 'MCP spec version', 'x402 version', 'A2A protocol', 'AI framework releases']}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Substrate Changelog', url: 'https://tensorfeed.ai/substrate' },
        ]}
      />
      <SubstrateView />
    </>
  );
}
