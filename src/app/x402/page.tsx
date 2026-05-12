import { Metadata } from 'next';
import Link from 'next/link';
import {
  CreditCard,
  Zap,
  ShieldCheck,
  Eye,
  Coins,
  ArrowRight,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import AdoptersPreview from './AdoptersPreview';

export const metadata: Metadata = {
  title: 'x402: The Open HTTP Standard for AI Agent Payments',
  description:
    'x402 is the open HTTP-native payment protocol revived from the long-dormant 402 status code. Servers gate APIs on USDC payment; agents pay on-chain in seconds. Amazon Bedrock AgentCore Payments, Coinbase x402 Bazaar, Stripe Link for agents, TensorFeed, and TerminalFeed all speak it. Live adopter directory, the four-property test for agent rails, integration recipe, and the latest x402 news in one place.',
  alternates: { canonical: 'https://tensorfeed.ai/x402' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/x402',
    title: 'x402: The Open HTTP Standard for AI Agent Payments',
    description:
      'Amazon Bedrock AgentCore Payments, Coinbase, Stripe, TensorFeed all speak x402. Live adopters, integration recipe, and the latest news on the agent payment protocol.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402: The Open HTTP Standard for AI Agent Payments',
    description:
      'Amazon Bedrock AgentCore Payments, Coinbase, Stripe, TensorFeed speak x402. Live adopters, integration recipe, latest news.',
  },
  keywords: [
    'x402',
    'x402 protocol',
    'x402 standard',
    'HTTP 402',
    'payment required',
    'agent payments',
    'AI agent payments',
    'machine payable API',
    'USDC on Base',
    'Coinbase x402',
    'AWS x402',
    'Amazon Bedrock AgentCore Payments',
    'AgentCore Payments',
    'Stripe Link agents',
    'AFTA',
    'TensorFeed x402',
  ],
};

const FAQS = [
  {
    question: 'What is x402?',
    answer:
      'x402 is an open HTTP-native payment protocol that revives the long-dormant HTTP 402 Payment Required status code as a machine-payable handshake. Servers gate API responses on payment; clients retry with proof of payment. Designed for AI agents, machine-to-machine commerce, and any caller without a human in the loop. Reference spec at x402.org, maintained by Coinbase Developer Platform with broad community participation.',
  },
  {
    question: 'How does x402 work in one round trip?',
    answer:
      'Client requests a paid endpoint. Server responds 402 Payment Required with a JSON body containing x402Version, resource, and an accepts array (scheme, network, amount, asset, payTo, maxTimeoutSeconds). For the Coinbase reference exact scheme on EVM networks like Base, the client signs an EIP-3009 transferWithAuthorization (gasless from the agent’s side), wraps it as a PaymentPayload (signature plus authorization fields from, to, value, validAfter, validBefore, nonce), and base64-encodes the result. The client retries with header X-PAYMENT set to that base64 string. The server’s facilitator broadcasts the authorization, verifies on-chain settlement, and returns 200 with the data plus a PAYMENT-RESPONSE header containing the settlement receipt. No accounts, no API keys for billing, no signup form, no invoice cycle.',
  },
  {
    question: 'Who actually uses x402 today?',
    answer:
      'As of May 2026, the live adopter set includes Coinbase (reference SDK and the spec itself), Amazon Bedrock AgentCore Payments (Preview, launched May 7 2026, with native x402 execution and a Coinbase x402 Bazaar MCP server exposing 10,000+ pay-per-use endpoints), Stripe (Link for agents using the stripe x402 method variant), TensorFeed (14 paid premium endpoints, AFTA-certified, end-to-end USDC loop verified on Base mainnet April 27 2026), TerminalFeed (federated with TensorFeed via the AFTA cross-Worker rail), the @coinbase/x402 SDK, the tensorfeed Python and JavaScript SDKs, the afta-gateway Cloudflare Worker template, the @tensorfeed/mcp-server data MCP, and the @tensorfeed/x402-base-mcp chain-verifier MCP (read-only Base reader that lets any agent independently verify an x402 payment receipt on-chain). Live adopter directory at tensorfeed.ai/x402-adopters.',
  },
  {
    question: 'Why x402 instead of Stripe or a traditional payment API?',
    answer:
      'Traditional payment APIs assume a human at a keyboard filling out a signup form, attaching a credit card, and copying an API key. AI agents have none of those primitives. x402 lets agents act on their own spending decisions in a single round trip, settling on-chain in seconds with no chargebacks, no merchant-account termination risk, and microtransactions that are economically viable (sub-cent gas on L2s like Base). Stripe Link for agents reuses the x402 envelope with a stripe method variant, so the protocol is cooperative not adversarial.',
  },
  {
    question: 'What is the .well-known/x402 manifest?',
    answer:
      'In x402 V2, services that support the protocol publish a discovery manifest at /.well-known/x402 listing every paid endpoint with its accepts block (asset, network, amount, payTo), input/output schemas, and metadata. Facilitators like CDP Bazaar and x402scan crawl this manifest to auto-index services so x402-compatible agents can discover them without manual directory submission. TensorFeed publishes its manifest at /.well-known/x402.json.',
  },
  {
    question: 'What about V1 vs V2?',
    answer:
      'Two coexisting formats are in the wild as the protocol matures. V1 is the original Coinbase reference (network and asset declared as separate fields). V2 added the discovery manifest and the eip155-style network identifier (e.g. eip155:8453 for Base mainnet). x402scan currently lists V2 publishers; x402.org documents both. The cleanest path for new publishers is V2 with the well-known manifest plus an x-payment-info extension on each paid OpenAPI operation.',
  },
  {
    question: 'How do I add x402 to my own API?',
    answer:
      'Three options ranked by effort. Drop-in: fork github.com/RipperMercs/afta-gateway, set 3 secrets (Worker secret, USDC payTo wallet, Ed25519 receipt signing key), deploy. Library: install @coinbase/x402 and add its middleware to your Express, Fastify, or Hono app. Hand-rolled: implement the 402 handshake yourself in ~50 lines, verify the X-Payment-Tx receipt against an RPC node. The afta-gateway template is the recommended path for any publisher who also wants AFTA primitives (signed receipts, code-enforced no-charge ledger).',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'x402', url: 'https://tensorfeed.ai/x402' },
];

const RECENT_ARTICLES = [
  {
    slug: 'aws-x402-coinbase-agent-payments',
    title: 'AWS Just Plugged x402 In. Agent USDC Payments Are Now Cloud-Default.',
    blurb:
      "Coinbase announced AWS now accepts USDC over x402 for agent payments. The largest cloud just made the open standard a default option.",
    date: 'May 7, 2026',
  },
  {
    slug: 'we-chose-usdc-on-base-for-afta',
    title: 'We Could Have Built AFTA on Anything. We Chose USDC on Base.',
    blurb:
      "The four-property test for agent payment rails and why USDC on Base passes all four where the alternatives compromise on at least one.",
    date: 'May 6, 2026',
  },
  {
    slug: 'stripe-link-vs-usdc-agent-payments',
    title: 'Stripe Just Validated Agent Payments. We Already Shipped Ours Without Them.',
    blurb:
      "Stripe Link for agents and the stripe x402 method, compared to direct USDC after real production use.",
    date: 'May 1, 2026',
  },
  {
    slug: 'why-usdc-over-stripe',
    title: 'Why We Picked USDC on Base Over Stripe for Agent Payments',
    blurb:
      'A first-person breakdown of the architectural choice, what we gave up, and what we got: simpler architecture, lower fees, no platform risk.',
    date: 'Apr 27, 2026',
  },
  {
    slug: '15-paid-endpoints-24-hours',
    title: '15 Paid AI Agent API Endpoints in 24 Hours',
    blurb:
      'A retrospective on shipping 15 pay-per-call premium endpoints, full SDKs, MCP server expansion, and a human dashboard in a single 24-hour build.',
    date: 'Apr 27, 2026',
  },
  {
    slug: 'validating-agent-payments-mainnet',
    title: 'We Validated Agent Payments End-to-End on Base Mainnet',
    blurb:
      'The five-step USDC payment loop that took TensorFeed agent payments from designed to operational. Real tx hash, real credits.',
    date: 'Apr 27, 2026',
  },
];

export default function X402HubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FAQPageJsonLd faqs={FAQS} />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <CreditCard className="w-7 h-7 text-accent-primary" />
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">x402</h1>
            <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
              the open HTTP standard for agent payments
            </span>
          </div>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          x402 revives the long-dormant HTTP 402 &quot;Payment Required&quot; status code as a
          machine-payable handshake. Servers gate APIs on USDC payment; agents pay on-chain in
          seconds. As of May 2026, the protocol is live infrastructure: Amazon Bedrock AgentCore
          Payments (Preview), the Coinbase x402 Bazaar, Stripe Link for agents, TensorFeed, and
          TerminalFeed all speak it. This page is the canonical hub. What x402 is, who uses it
          today, how to integrate, and the latest news, all in one place.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <a
            href="https://x402.org"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            x402.org <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://tensorfeed.ai/.well-known/x402.json"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /.well-known/x402.json
          </a>
          <Link
            href="/x402-adopters"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            full adopter directory
          </Link>
          <Link
            href="/glossary/x402"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            glossary entry
          </Link>
        </div>
      </header>

      {/* TF is x402-native CTA */}
      <section className="mb-12 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-accent-primary/20 shrink-0">
            <Zap className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              TensorFeed is x402-native
            </h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              14 paid premium endpoints. End-to-end USDC loop verified on Base mainnet on April 27,
              2026. AFTA-certified: code-enforced no-charge guarantees plus Ed25519-signed receipts
              on every paid call. Free tier remains free; pay only when you hit a premium endpoint.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href="/developers/agent-payments"
                className="px-3 py-1.5 rounded bg-accent-primary text-white hover:bg-accent-primary/90 inline-flex items-center gap-1 font-medium"
              >
                Agent payments docs <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/api-reference"
                className="px-3 py-1.5 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary"
              >
                API reference
              </Link>
              <Link
                href="/agent-fair-trade"
                className="px-3 py-1.5 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary"
              >
                AFTA standard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live adopters */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Live: who speaks x402</h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          The set is intentionally small. Live production publishers, canonical SDKs, deployable
          gateway templates, and the reference spec itself. Pulled live from{' '}
          <a
            href="https://tensorfeed.ai/api/x402-adopters"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline font-mono"
          >
            /api/x402-adopters
          </a>
          .
        </p>
        <AdoptersPreview />
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          How it works in one round trip
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          Canonical Coinbase x402 V2 handshake on the{' '}
          <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">exact</code>{' '}
          scheme over an EVM network like Base. This is the wire format AgentCore Payments and the
          @coinbase/x402 SDK speak.
        </p>
        <ol className="space-y-3 max-w-3xl">
          <li className="flex gap-3 text-text-secondary leading-relaxed">
            <span className="font-mono text-accent-primary shrink-0">1.</span>
            <span>
              Client requests a paid resource:{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                GET /something
              </code>
            </span>
          </li>
          <li className="flex gap-3 text-text-secondary leading-relaxed">
            <span className="font-mono text-accent-primary shrink-0">2.</span>
            <span>
              Server responds{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                402 Payment Required
              </code>{' '}
              with body{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                {'{ x402Version, resource, accepts: [...] }'}
              </code>
              . Each accepts entry lists scheme, network (e.g.{' '}
              <code className="font-mono text-xs bg-bg-tertiary px-1 py-0.5 rounded">
                eip155:8453
              </code>
              ), amount, asset, payTo, maxTimeoutSeconds.
            </span>
          </li>
          <li className="flex gap-3 text-text-secondary leading-relaxed">
            <span className="font-mono text-accent-primary shrink-0">3.</span>
            <span>
              Client signs an EIP-3009{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                transferWithAuthorization
              </code>{' '}
              for the requested amount of USDC. Gasless on the agent side: the agent only signs;
              the server broadcasts.
            </span>
          </li>
          <li className="flex gap-3 text-text-secondary leading-relaxed">
            <span className="font-mono text-accent-primary shrink-0">4.</span>
            <span>
              Client retries with header{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                X-PAYMENT
              </code>{' '}
              set to base64 of{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                {'{ signature, authorization: { from, to, value, validAfter, validBefore, nonce } }'}
              </code>
              .
            </span>
          </li>
          <li className="flex gap-3 text-text-secondary leading-relaxed">
            <span className="font-mono text-accent-primary shrink-0">5.</span>
            <span>
              Server&apos;s facilitator broadcasts the authorization to the network, verifies
              settlement, returns 200 with the data plus a{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                PAYMENT-RESPONSE
              </code>{' '}
              header containing the settlement receipt.
            </span>
          </li>
        </ol>
      </section>

      {/* Four-property test */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Why x402 wins: the four-property test
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          When TensorFeed picked an agent payment rail, we ran every credible option against four
          properties. x402 over USDC on Base is the only stack that hits all four. The full
          bake-off is in the AFTA companion piece on rail selection.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: BookOpen,
              title: 'Open',
              body: 'Public spec, public reference implementations, no vendor approval gate. Anyone can read, fork, ship.',
            },
            {
              icon: Eye,
              title: 'Transparent',
              body: 'Every payment is visible on a public block explorer. Server and client agree on the same on-chain truth.',
            },
            {
              icon: Zap,
              title: 'Instantly final',
              body: 'On-chain confirm in ~2 seconds on Base. No reversals, no chargebacks, no 30-day settlement window.',
            },
            {
              icon: Coins,
              title: 'Sub-cent',
              body: 'L2 gas plus stablecoin transfer is fractions of a cent. Microtransactions are economically viable.',
            },
          ].map(prop => (
            <div
              key={prop.title}
              className="bg-bg-secondary border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <prop.icon className="w-5 h-5 text-accent-primary" />
                <h3 className="font-semibold text-text-primary">{prop.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{prop.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/originals/we-chose-usdc-on-base-for-afta"
          className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline mt-4 group"
        >
          Read the full bake-off
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* Try it */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          The x402 handshake on the wire
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4 max-w-3xl">
          Conceptual example of the Coinbase x402 V2 exact scheme on Base. Field names match the
          spec at github.com/coinbase/x402.
        </p>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-bg-tertiary text-xs font-mono uppercase tracking-wide text-text-muted">
              1. Server responds 402 with the price
            </div>
            <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto">
{`HTTP/1.1 402 Payment Required
content-type: application/json

{
  "x402Version": 2,
  "resource":    { "url": "https://example.com/article/42" },
  "accepts": [{
    "scheme":            "exact",
    "network":           "eip155:8453",
    "amount":            "20000",
    "asset":             "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "payTo":             "0x...",
    "maxTimeoutSeconds": 60
  }]
}`}
            </pre>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-bg-tertiary text-xs font-mono uppercase tracking-wide text-text-muted">
              2. Client signs EIP-3009 and retries with X-PAYMENT
            </div>
            <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto">
{`X-PAYMENT: <base64 of>
{
  "signature": "0x...",
  "authorization": {
    "from":        "0x<agent wallet>",
    "to":          "0x<payTo>",
    "value":       "20000",
    "validAfter":  "1714780000",
    "validBefore": "1714780600",
    "nonce":       "0x<32 bytes>"
  }
}`}
            </pre>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-bg-tertiary text-xs font-mono uppercase tracking-wide text-text-muted">
              3. Facilitator settles, server returns 200
            </div>
            <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto">
{`HTTP/1.1 200 OK
content-type:     application/json
PAYMENT-RESPONSE: <base64 settlement receipt>

{ ...the resource the agent paid for... }`}
            </pre>
          </div>
        </div>
        <div className="mt-4 text-sm text-text-muted leading-relaxed">
          To pay TensorFeed specifically, see{' '}
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
            /developers/agent-payments
          </Link>{' '}
          for the credits flow (recommended for repeat use) and SDK snippets for{' '}
          <a
            href="https://pypi.org/project/tensorfeed/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Python
          </a>{' '}
          and{' '}
          <a
            href="https://www.npmjs.com/package/tensorfeed"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            JavaScript
          </a>
          .
        </div>
      </section>

      {/* Recent news */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Recent x402 coverage on TensorFeed
        </h2>
        <div className="grid gap-3">
          {RECENT_ARTICLES.map(a => (
            <Link
              key={a.slug}
              href={`/originals/${a.slug}`}
              className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {a.title}
                </h3>
                <span className="text-xs text-text-muted font-mono shrink-0">{a.date}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{a.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* V1 vs V2 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          V1 and V2: the format split
        </h2>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          x402 has two coexisting formats in the wild as the protocol matures. V1 was the original
          Coinbase reference (network and asset declared as separate fields). V2 added the
          discovery manifest at <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">/.well-known/x402</code> and
          the eip155-style network identifier (e.g.{' '}
          <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">eip155:8453</code>{' '}
          for Base mainnet). x402scan currently lists V2 publishers; x402.org documents both. The
          cleanest path for new publishers is V2 with the well-known manifest, plus an{' '}
          <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">x-payment-info</code>{' '}
          extension on each paid OpenAPI operation. The{' '}
          <a
            href="https://github.com/RipperMercs/afta-gateway"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            afta-gateway template
          </a>{' '}
          ships with both formats wired correctly out of the box.
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <details
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-lg p-4 group"
            >
              <summary className="font-semibold text-text-primary cursor-pointer marker:text-accent-primary">
                {faq.question}
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed text-sm">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* For agents footer */}
      <section className="mb-12 bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">For agents:</strong> machine-readable directory at{' '}
            <a
              href="https://tensorfeed.ai/api/x402-adopters"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /api/x402-adopters
            </a>
            . Filter with{' '}
            <code className="font-mono">?category=publisher|sdk|gateway|reference|spec</code> or{' '}
            <code className="font-mono">?status=live|announced</code>. Free, no auth, cached 10 min.
            TensorFeed&apos;s own x402 manifest lives at{' '}
            <a
              href="https://tensorfeed.ai/.well-known/x402.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /.well-known/x402.json
            </a>
            .
          </div>
        </div>
      </section>

      {/* Further reading */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Further reading</h2>
        <ul className="space-y-1.5 text-sm text-text-secondary list-disc list-inside ml-2">
          <li>
            <a
              href="https://x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              x402.org
            </a>{' '}
            (official spec)
          </li>
          <li>
            <a
              href="https://github.com/coinbase/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              github.com/coinbase/x402
            </a>{' '}
            (reference implementations)
          </li>
          <li>
            <Link href="/glossary/x402" className="text-accent-primary hover:underline">
              /glossary/x402
            </Link>{' '}
            (definition entry)
          </li>
          <li>
            <Link href="/x402-adopters" className="text-accent-primary hover:underline">
              /x402-adopters
            </Link>{' '}
            (full filterable directory)
          </li>
          <li>
            <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">
              /agent-fair-trade
            </Link>{' '}
            (the AFTA standard built on top of x402)
          </li>
          <li>
            <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
              /developers/agent-payments
            </Link>{' '}
            (TensorFeed integration docs)
          </li>
        </ul>
      </section>
    </div>
  );
}
