import { Metadata } from 'next';
import { DatasetJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import ProcurementView from './ProcurementView';

const TITLE = 'Federal AI Contracts and Opportunities | TensorFeed';
const DESCRIPTION =
  'Track US federal government AI spending: open AI solicitations agencies are soliciting now and recent AI contract awards, by agency, by vendor, and by set-aside. Sourced from SAM.gov and USAspending.gov, public domain, refreshed daily.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/procurement',
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

export default function ProcurementPage() {
  return (
    <>
      <DatasetJsonLd
        name="Federal AI Procurement"
        description="Open US federal AI contract opportunities and recent AI contract awards, by agency and set-aside."
        url="https://tensorfeed.ai/procurement"
        jsonUrl="/api/procurement/ai-contracts"
        keywords={['federal AI contracts', 'AI procurement', 'government AI spending', 'AI solicitations']}
        license="Public domain (US Government work)"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Procurement', url: 'https://tensorfeed.ai/procurement' },
        ]}
      />
      <ProcurementView />
    </>
  );
}
