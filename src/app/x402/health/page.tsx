import { Metadata } from 'next';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import HealthClient from './HealthClient';

export const metadata: Metadata = {
  title: 'x402 Publisher Status: Live Manifest + Uptime Monitor',
  description:
    "Live status of every known x402 publisher's /.well-known/x402.json manifest, monitored hourly by TensorFeed. Manifest validity, fetch latency, 24h and 7d uptime. Agent-friendly JSON at /api/x402/status. Free, no auth. The neutral, citation-ready source of truth for x402 publisher reliability.",
  alternates: { canonical: 'https://tensorfeed.ai/x402/health' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/x402/health',
    title: 'x402 Publisher Status: Live Manifest + Uptime Monitor',
    description:
      'Hourly checks on every known x402 publisher manifest. Uptime, latency, validity. Free, no auth.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402 Publisher Status',
    description: 'Live x402 manifest + uptime monitor across the ecosystem.',
  },
  keywords: [
    'x402 status',
    'x402 uptime',
    'x402 publisher health',
    'x402 manifest validator',
    'agent payments reliability',
  ],
};

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'x402 Hub', url: 'https://tensorfeed.ai/x402' },
  { name: 'Publisher Status', url: 'https://tensorfeed.ai/x402/health' },
];

export default function X402HealthPage() {
  return (
    <>
      <BreadcrumbListJsonLd items={BREADCRUMBS} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
            x402 Publisher Status
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
            Live status of every known x402 publisher&apos;s{' '}
            <code>/.well-known/x402.json</code> manifest, probed hourly by TensorFeed. Manifest
            validity, fetch latency, 24-hour and 7-day uptime. Free, no auth, agent-friendly JSON at{' '}
            <a
              href="/api/x402/status"
              className="text-accent-primary hover:underline font-mono text-sm"
            >
              /api/x402/status
            </a>
            .
          </p>
        </header>

        <HealthClient />

        <section className="mt-14 border-t border-border-primary pt-8 space-y-4 text-sm text-text-secondary">
          <h2 className="text-xl font-semibold text-text-primary">How this works</h2>
          <p>
            An hourly cron on the TensorFeed Worker walks the editorial x402 adopters catalog
            (the same data behind <code>/api/x402-adopters</code>) plus the AFTA federation
            members, and fetches each publisher&apos;s <code>/.well-known/x402.json</code> over
            HTTPS. Each check records: HTTP status, fetch latency, whether the JSON parses, and
            whether it conforms to the canonical Coinbase x402 V2 shape (x402Version: 2 plus a
            non-empty <code>accepts[]</code> array).
          </p>
          <p>
            Uptime percentages are computed over the rolling window. A publisher counts as
            &quot;up&quot; for a given hourly check if and only if all three pass: reachable,
            valid JSON, and canonical V2 shape. Anything else (manifest 404, timeout, malformed,
            v1 shape, plain text status response) is a failure for that hour.
          </p>
          <p>
            <strong>Inclusion is editorial, not endorsement.</strong> A green status here only
            means the publisher&apos;s manifest is currently reachable and parseable. It does
            not certify that they honor receipts, deliver real data, or settle payments
            correctly. For that depth, run the AFTA self-check at{' '}
            <a href="/verify" className="text-accent-primary hover:underline">
              /verify
            </a>{' '}
            or audit on-chain with the verifier MCP{' '}
            <code>@tensorfeed/x402-base-mcp</code>.
          </p>
        </section>

        <section className="mt-8 text-sm text-text-muted">
          Want your publisher monitored here? Email{' '}
          <a
            href="mailto:contact@tensorfeed.ai?subject=Add%20our%20x402%20publisher%20to%20status%20monitoring"
            className="text-accent-primary hover:underline"
          >
            contact@tensorfeed.ai
          </a>{' '}
          with your domain. AFTA federation members are added automatically.
        </section>
      </main>
    </>
  );
}
