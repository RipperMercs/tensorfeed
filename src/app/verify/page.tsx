import { Metadata } from 'next';
import { BreadcrumbListJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import VerifyClient from './VerifyClient';

export const metadata: Metadata = {
  title: 'Verify an x402 Publisher — Live AFTA Scorecard',
  description:
    "Paste any domain to instantly check its x402 + AFTA compliance. Live scorecard of canonical Coinbase x402 V2 manifest, EIP-712 domain hints, AFTA fair-trade declarations, signed-receipt key publication, federation status, and the published payTo wallet on Base. Powers TensorFeed's federation. Free, no auth, agent-friendly.",
  alternates: { canonical: 'https://tensorfeed.ai/verify' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/verify',
    title: 'Verify an x402 Publisher — Live AFTA Scorecard',
    description:
      'Paste a domain. Get a live x402 + AFTA scorecard with the published payTo wallet and on-chain settlement check. Free, no auth.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verify an x402 Publisher',
    description: 'Live AFTA + x402 scorecard for any domain. Free, no auth.',
  },
  keywords: [
    'x402 verifier',
    'AFTA scorecard',
    'verify x402 publisher',
    'agent fair-trade',
    'x402 manifest',
    'agent payments verification',
    'USDC on Base verification',
    'TensorFeed AFTA',
  ],
};

const FAQS = [
  {
    question: 'What does this page actually do?',
    answer:
      "It calls TensorFeed's AFTA certification endpoint against the domain you enter. The endpoint fetches that domain's /.well-known/x402.json and /.well-known/agent-fair-trade.json over HTTPS, parses them, and scores six concrete compliance criteria: canonical x402 V2 manifest shape, paid items with valid accepts[] entries, per-network EIP-712 domain hints, AFTA fair-trade declaration with no-charge guarantees, signed-receipt declaration, and a published receipt-signing public key. Each check is deterministic and idempotent.",
  },
  {
    question: 'Is this trustless?',
    answer:
      "The HTTP checks run on TensorFeed servers; you trust us not to lie about what we saw. The on-chain Base mainnet verification is fully trustless if you want to re-run it yourself — install @tensorfeed/x402-base-mcp and call verify_x402_settlement or parse_x402_manifest directly from your own machine. Same logic, different trust anchor.",
  },
  {
    question: "What if a domain scores 6/6?",
    answer:
      'It is AFTA-eligible. The publisher can email contact@tensorfeed.ai and pay the $100 USDC annual fee to be listed on tensorfeed.ai/x402-adopters with the AFTA-Certified badge. See /afta-certified for the listing details.',
  },
  {
    question: 'What if a domain scores below 6/6?',
    answer:
      "Each failing check carries a specific fix hint. Typical low scores: missing /.well-known/x402.json (publisher hasn't shipped an x402 manifest yet); manifest is v1 shape (Coinbase moved on to v2); missing extra.name / extra.version (the EIP-712 domain hint that prevents the FiatTokenV2 signature footgun); no AFTA manifest (publisher does not yet commit to no-charge guarantees + signed receipts).",
  },
  {
    question: "Can my agent call this directly?",
    answer:
      "Yes. The check endpoint is at GET /api/afta-certify/check?domain=X.com and returns JSON. Or run the verifier as an MCP server on your own machine: npx -y @tensorfeed/x402-base-mcp.",
  },
  {
    question: "Are you going to publish a list of every checked domain?",
    answer:
      "No. The check is on-demand. We do not log requests to this endpoint with PII or domain attribution. The /api/x402-registry/snapshot endpoint is a separate, opt-in crawl of x402 publishers TF tracks editorially.",
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Verify x402 Publisher', url: 'https://tensorfeed.ai/verify' },
];

export default function VerifyPage() {
  return (
    <>
      <FAQPageJsonLd questions={FAQS} />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
            Verify an x402 Publisher
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            Paste any domain. Get a live AFTA + x402 scorecard. Six concrete checks: canonical
            Coinbase x402 V2 manifest, per-network EIP-712 domain hints, AFTA fair-trade
            declaration with no-charge guarantees, signed-receipt key publication, and the on-chain
            payTo wallet. Free, no auth, agent-friendly.
          </p>
        </header>

        <VerifyClient />

        <section className="mt-14 space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Frequently asked</h2>
          {FAQS.map((faq) => (
            <details key={faq.question} className="bg-bg-secondary border border-border-primary rounded p-4">
              <summary className="font-medium text-text-primary cursor-pointer">{faq.question}</summary>
              <p className="mt-3 text-text-secondary leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </section>

        <section className="mt-14 border-t border-border-primary pt-8 space-y-4 text-sm text-text-muted">
          <p>
            Want to run this check on your own machine instead of trusting us? Install the
            read-only MCP server:
          </p>
          <pre className="bg-bg-secondary border border-border-primary rounded p-4 overflow-x-auto text-xs text-text-primary"><code>npx -y @tensorfeed/x402-base-mcp</code></pre>
          <p>
            Source on GitHub:{' '}
            <a
              href="https://github.com/RipperMercs/tensorfeed-x402-base-mcp"
              className="text-accent-primary hover:underline"
            >
              RipperMercs/tensorfeed-x402-base-mcp
            </a>{' '}
            · Listed in the canonical MCP registry as{' '}
            <code className="text-text-primary">ai.tensorfeed/x402-base-mcp</code>
          </p>
        </section>
      </main>
    </>
  );
}
