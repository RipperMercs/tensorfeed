import { Metadata } from 'next';
import { DatasetJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import ExportControlsView from './ExportControlsView';

const TITLE = 'AI Export Controls: BIS Entity List and Compute Rules | TensorFeed';
const DESCRIPTION =
  'Track US AI export controls in structured form: BIS Entity List changes, advanced-computing chip restrictions, semiconductor export rules, license and threshold policy, and due-diligence measures from the Federal Register. A forward-only timeline, refreshed daily, free for humans and agents.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/export-controls',
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

export default function ExportControlsPage() {
  return (
    <>
      <DatasetJsonLd
        name="AI Export Controls"
        description="Classified US BIS AI and advanced-computing export-control actions (Entity List changes, license and threshold rules, due-diligence measures) from the Federal Register."
        url="https://tensorfeed.ai/export-controls"
        jsonUrl="/api/export-controls/ai"
        keywords={['AI export controls', 'BIS Entity List', 'advanced computing export rules', 'semiconductor export controls', 'AI chip restrictions']}
        license="Public domain (US Government work)"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Export Controls', url: 'https://tensorfeed.ai/export-controls' },
        ]}
      />
      <ExportControlsView />
    </>
  );
}
