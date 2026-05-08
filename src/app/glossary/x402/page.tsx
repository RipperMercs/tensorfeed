import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'What is x402? Payment Required HTTP for AI Agents | TensorFeed',
  description:
    'x402 is the open HTTP standard for machine-payable APIs. Servers return HTTP 402 Payment Required with payment instructions; clients retry with proof of payment. The internet-native payment rail for AI agents, built on USDC on Base.',
  alternates: { canonical: 'https://tensorfeed.ai/glossary/x402' },
  openGraph: {
    title: 'What is x402? Payment Required HTTP for AI Agents',
    description: 'x402 is the open HTTP standard for machine-payable APIs. Built on HTTP 402 Payment Required and USDC on Base.',
    url: 'https://tensorfeed.ai/glossary/x402',
  },
  keywords: ['x402', 'x402 protocol', 'HTTP 402', 'machine payable API', 'agent payments', 'USDC on Base', 'AI agent payment'],
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is x402?',
      acceptedAnswer: { '@type': 'Answer', text: 'x402 is an open HTTP-native payment protocol developed by Coinbase Developer Platform. Built on the HTTP 402 Payment Required status code, it lets servers gate API responses on cryptocurrency payments and lets clients retry with proof of payment. Designed primarily for AI agents and machine-to-machine commerce.' },
    },
    {
      '@type': 'Question',
      name: 'How does x402 work in practice?',
      acceptedAnswer: { '@type': 'Answer', text: 'A client requests a paid endpoint. The server responds 402 Payment Required with a JSON body that includes a payTo wallet address, an asset (typically USDC), a network (typically Base), and an amount. The client sends the on-chain payment, then retries the request with an X-Payment-Tx header containing the transaction hash. The server verifies the transaction on-chain and serves the data.' },
    },
    {
      '@type': 'Question',
      name: 'What is the .well-known/x402 manifest?',
      acceptedAnswer: { '@type': 'Answer', text: 'In x402 V2, services that support the protocol publish a discovery manifest at /.well-known/x402 (or any URL announced via DNS). The manifest lists every paid endpoint with its accepts block (asset, network, amount, payTo), input/output schemas, and metadata. Facilitators like CDP Bazaar auto-index this manifest so x402-compatible agents can discover services without manual directory submission.' },
    },
    {
      '@type': 'Question',
      name: 'Why x402 instead of Stripe or traditional payment APIs?',
      acceptedAnswer: { '@type': 'Answer', text: 'x402 is designed for callers without humans in their loop. Traditional payment APIs assume a human filling out a signup form, attaching a credit card, and copying an API key. x402 has none of those primitives. Settlement is on-chain in seconds with no chargebacks, no merchant-account termination risk, and microtransactions are economically viable (sub-cent gas on L2s like Base).' },
    },
  ],
};

export default function X402GlossaryPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Link
        href="/for-ai-agents"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AI agents
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">x402</h1>
        <p className="text-lg text-text-secondary">
          The open HTTP standard for machine-payable APIs. Servers return <code className="text-accent-primary font-mono">HTTP 402 Payment Required</code>{' '}
          with payment instructions; clients retry with proof of payment. Built for AI agents
          paying on-chain in seconds.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">Origin</h2>
        <p>
          x402 was developed by the Coinbase Developer Platform team and published as an open
          specification at <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">x402.org</a>.
          It builds on the rarely-used HTTP 402 status code, which was reserved in HTTP/1.1 for
          &quot;future use&quot; and has finally found its actual purpose: machine-readable payment
          requirements.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">How it works</h2>
        <ol className="space-y-2 list-decimal list-inside ml-4">
          <li><strong className="text-text-primary">Request:</strong> client GET <code className="text-accent-primary font-mono">/api/paid-endpoint</code></li>
          <li><strong className="text-text-primary">402 response:</strong> server returns <code className="text-accent-primary font-mono">{'{ accepts: [{ asset, network, amount, payTo }] }'}</code></li>
          <li><strong className="text-text-primary">Payment:</strong> client sends on-chain payment to <code className="text-accent-primary font-mono">payTo</code></li>
          <li><strong className="text-text-primary">Retry:</strong> client GETs again with <code className="text-accent-primary font-mono">X-Payment-Tx: 0x...</code></li>
          <li><strong className="text-text-primary">Verification:</strong> server reads the on-chain receipt, confirms the recipient and amount, serves the data</li>
        </ol>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Discovery in x402 V2</h2>
        <p>
          V2 added a discovery extension. Services publish a JSON manifest at{' '}
          <code className="text-accent-primary font-mono">/.well-known/x402</code> that lists
          every paid endpoint with its accepts block, input schema, and metadata. Facilitators
          like CDP Bazaar crawl this manifest to auto-index services. TensorFeed&apos;s manifest
          is at{' '}
          <Link href="/.well-known/x402" className="text-accent-primary hover:underline font-mono text-sm">
            /.well-known/x402
          </Link>
          .
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Why it matters for AI agents</h2>
        <p>
          AI agents do not have credit cards, signup forms, or copy-paste API keys. The whole
          stack of traditional payment infrastructure assumes a human at a keyboard. x402 lets
          agents act on their own spending decisions without a human in the loop, which is the
          actual unlock for autonomous commerce.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">TensorFeed&apos;s implementation</h2>
        <p>
          TensorFeed supports x402 as a fallback flow on every premium endpoint. Call any{' '}
          <code className="text-accent-primary font-mono">/api/premium/*</code> URL without auth, get a
          402 with payment instructions, retry with <code className="text-accent-primary font-mono">X-Payment-Tx: 0x...</code>{' '}
          and receive both the data and a bearer token for future calls. The{' '}
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
            agent payments docs
          </Link>{' '}
          walk through it end-to-end.
        </p>

        <p>
          For repeat use we recommend the credits-first flow over per-call x402: settlement is
          50ms instead of 3-5 seconds. But x402 stays available for one-shot discovery calls
          where the agent doesn&apos;t want to pre-commit to credits.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Further reading</h2>
        <ul className="space-y-1 list-disc list-inside ml-4">
          <li><Link href="/x402" className="text-accent-primary hover:underline">/x402 hub</Link> (canonical landing page: live adopters, integration recipe, FAQ)</li>
          <li><a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">x402.org</a> (official spec and whitepaper)</li>
          <li><a href="https://github.com/coinbase/x402" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">github.com/coinbase/x402</a> (reference implementations)</li>
          <li><Link href="/originals/why-usdc-over-stripe" className="text-accent-primary hover:underline">Why we picked USDC on Base over Stripe</Link> (TensorFeed&apos;s rationale for adopting x402)</li>
          <li><Link href="/glossary/agent-payments" className="text-accent-primary hover:underline">Agent payments</Link> (the broader pattern x402 enables)</li>
        </ul>
      </div>
    </article>
  );
}
