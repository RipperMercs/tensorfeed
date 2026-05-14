import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Network,
  Coins,
  FileJson,
  Activity,
  Layers,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title:
    'A2A x402: Google\'s Agent Payments Extension Explained | TensorFeed',
  description:
    "Google's A2A x402 extension brings on-chain crypto payments to the Agent-to-Agent protocol. Backed by 60 organizations including Mastercard, PayPal, Coinbase, MetaMask, and the Ethereum Foundation. Inside the extension URI, the JSON-RPC message flow, the AgentCard discovery surface, the Global A2A Registry, and how it relates to canonical x402 V2 that TensorFeed already serves.",
  openGraph: {
    title: "A2A x402: Google's Agent Payments Extension Explained",
    description:
      'A2A x402 v0.2 is live. 60-company coalition. JSON-RPC transport over canonical x402 data structures. AgentCard discovery via /.well-known/agent-card.json. Global A2A Registry as the directory. Everything an agent builder needs to know in one page.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: "A2A x402: Google's Agent Payments Extension Explained",
    description:
      'Same data structures as canonical x402 V2. New JSON-RPC transport. New discovery surface. Inside the spec and the coalition.',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/a2a-x402',
  },
};

const COALITION_BUCKETS = [
  {
    label: 'Card networks',
    members: ['Mastercard', 'American Express', 'JCB', 'UnionPay International'],
  },
  {
    label: 'Acquirers and PSPs',
    members: ['Adyen', 'PayPal', 'Worldpay'],
  },
  {
    label: 'Crypto infrastructure',
    members: ['Coinbase', 'Circle', 'MetaMask', 'Ethereum Foundation', 'Mysten Labs'],
  },
  {
    label: 'Applications and platforms',
    members: ['Etsy', 'Salesforce', 'ServiceNow', 'Intuit'],
  },
  {
    label: 'Risk, fintech, banking',
    members: ['Forter', 'Revolut', 'Ant International'],
  },
];

const FLOW_STEPS = [
  {
    n: '1',
    title: 'Payment Required',
    body: "The Merchant Agent receives a service request and decides payment is owed. It returns a Task with state input-required and stamps metadata.x402.payment.status with 'payment-required' plus metadata.x402.payment.required carrying the PaymentRequirements (scheme, network, asset, payTo, maxAmountRequired).",
  },
  {
    n: '2',
    title: 'Payment Submitted',
    body: "The Client Agent picks a PaymentRequirements option, has its wallet or signing service produce a signed PaymentPayload, and sends an A2A message back to the merchant containing the original taskId, metadata.x402.payment.status of 'payment-submitted', and metadata.x402.payment.payload.",
  },
  {
    n: '3',
    title: 'Payment Completed',
    body: 'The Merchant verifies the signature, settles on-chain through an x402 facilitator, then returns an updated Task. metadata.x402.payment.status moves to payment-completed, and metadata.x402.payment.receipts gets the transaction hash and network appended. The receipts array is persistent across the lifetime of the Task; every attempt is logged.',
  },
];

const FAQS = [
  {
    question: 'What is the A2A x402 extension?',
    answer:
      "It is an official extension of Google's Agent-to-Agent (A2A) protocol that lets agents charge each other for services with on-chain cryptocurrency payments. Initially released September 2025 (v0.1), now at v0.2 with an embedded composable flow that allows x402 to act as a payment leg inside higher-level commerce protocols like AP2. The repository is google-agentic-commerce/a2a-x402, currently at 505 GitHub stars.",
  },
  {
    question: 'How is A2A x402 different from canonical x402 V2?',
    answer:
      'Same data structures, different transport. Canonical x402 V2 (the version most early ecosystem merchants implement, including TensorFeed) signals payment-required with an HTTP 402 response, a PAYMENT-REQUIRED header, and a WWW-Authenticate challenge, then accepts payment on retry via an X-PAYMENT header. A2A x402 wraps the same PaymentRequirements and PaymentPayload structures inside JSON-RPC messages on the Agent2Agent protocol, using metadata.x402.* fields on Task and Message objects. The settlement layer (EIP-3009, USDC, Base, facilitators) is identical.',
  },
  {
    question: 'What is the extension URI an agent must declare?',
    answer:
      'For v0.2 (current): https://github.com/google-agentic-commerce/a2a-x402/blob/main/spec/v0.2. For v0.1: https://github.com/google-a2a/a2a-x402/v0.1. The URI gets declared in the capabilities.extensions array of the merchant agent\'s AgentCard, with required:true recommended. Clients activate the extension by including the URI in the X-A2A-Extensions HTTP header on their request.',
  },
  {
    question: 'How do A2A agents get discovered?',
    answer:
      "Through an AgentCard at /.well-known/agent-card.json on the merchant's domain. The card lists capabilities, skills, endpoints, and declared extensions. Beyond self-discovery, the community-run Global A2A Registry at a2a-registry.org aggregates cards, verifies domains with a DNS TXT record (a2a-registry-verify=<token>), and exposes a discovery API that other agents query programmatically. The registry calls itself the DNS for AI agents.",
  },
  {
    question: 'Does TensorFeed serve the A2A x402 extension today?',
    answer:
      'TF serves canonical x402 V2 over HTTP today, which uses the same PaymentRequirements and PaymentPayload data structures. The A2A JSON-RPC wrapper is a separate adapter on the TensorFeed roadmap. Once shipped, the same Coinbase facilitator, AFTA receipts, and OFAC screening get reused; only the transport changes. Until then, A2A native clients cannot call TF endpoints directly. Treat this page as the canonical reference for the protocol, not a TF-implementation claim.',
  },
  {
    question: 'Who is in the AP2 coalition?',
    answer:
      'According to Google, 60+ organizations. Public coalition members named in launch coverage include Mastercard, American Express, JCB, UnionPay International, Adyen, PayPal, Worldpay, Coinbase, Circle, MetaMask, Ethereum Foundation, Mysten Labs, Etsy, Salesforce, ServiceNow, Intuit, Forter, Revolut, and Ant International. The coalition is the actual story; the spec is the artifact.',
  },
  {
    question: 'Where do AP2 and the A2A x402 extension differ?',
    answer:
      "AP2 (Agent Payments Protocol) is the umbrella commerce protocol. It defines the high-level interactions between agents around mandates (CartMandate, PaymentMandate, etc.). The A2A x402 extension is the on-chain payment leg that AP2 can use as its 'Form of Payment.' AP2 v0.2 explicitly supports embedding x402 PaymentPayload objects inside its CartMandate and PaymentMandate structures, which is why the spec calls out a Standalone Flow versus an Embedded Flow.",
  },
  {
    question: 'What is the relationship to Coinbase x402 Bazaar?',
    answer:
      "Bazaar (cdp.coinbase.com) catalogs HTTP x402 V2 merchants for agent discovery, requires you to settle through Coinbase's CDP facilitator, and produces a marketplace UI plus a /discovery API. A2A x402's Global Registry catalogs A2A-protocol merchants (JSON-RPC transport) with self-published AgentCards. Same merchant could in principle list in both surfaces if it implements both transports. Both rely on the same underlying x402 payment guarantees.",
  },
];

export default function A2AX402Page() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <FAQPageJsonLd faqs={FAQS.map((f) => ({ question: f.question, answer: f.answer }))} />

      <header className="mb-10">
        <div className="text-xs text-text-secondary tracking-wider uppercase mb-3">
          Topic Hub · Agent Stack
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
          A2A x402: Google&apos;s Agent Payments Extension
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          The A2A x402 extension brings on-chain cryptocurrency payments to
          Google&apos;s Agent-to-Agent protocol. Backed by 60 organizations
          including Mastercard, PayPal, American Express, Coinbase, MetaMask,
          and the Ethereum Foundation. Same payment data structures as canonical
          x402 V2. New JSON-RPC transport. New AgentCard-based discovery layer.
          This page is the working reference.
        </p>
      </header>

      {/* Headline coalition card */}
      <section className="mb-12 rounded-lg border border-border bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <Building2 className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
          <div>
            <div className="text-xs text-text-secondary tracking-wider uppercase mb-2">
              The coalition
            </div>
            <p className="text-text-primary leading-relaxed mb-3">
              Google convinced 60+ organizations across card networks,
              acquirers, crypto infrastructure, marketplaces, and enterprise
              platforms to stand behind one agent-payments protocol. A
              coalition that size has not formed around a payments standard
              since ISO 8583 in the 1980s.
            </p>
            <Link
              href="/originals/google-a2a-x402-payments-extension"
              className="text-accent-blue hover:underline text-sm inline-flex items-center gap-1"
            >
              Full editorial analysis
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Coalition buckets */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Who is in the coalition
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Named coalition members from public launch coverage, grouped by
          category. The mix is the message: card networks and crypto
          infrastructure are sitting at the same table.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COALITION_BUCKETS.map((bucket) => (
            <div
              key={bucket.label}
              className="rounded-lg border border-border bg-bg-secondary p-5"
            >
              <div className="text-xs text-text-secondary tracking-wider uppercase mb-3">
                {bucket.label}
              </div>
              <ul className="space-y-1">
                {bucket.members.map((m) => (
                  <li key={m} className="text-sm text-text-primary">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* The flow */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          The payment flow
        </h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Three steps over A2A messages. Same data shapes as canonical x402,
          packaged in JSON-RPC instead of HTTP headers.
        </p>
        <div className="space-y-3">
          {FLOW_STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-lg border border-border bg-bg-secondary p-5"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-accent-blue text-sm">
                  Step {step.n}
                </span>
                <span className="font-semibold text-text-primary">
                  {step.title}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Discovery */}
      <section className="mb-12 rounded-lg border border-border bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <FileJson className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Discovery via AgentCard
            </h2>
            <p className="text-text-secondary leading-relaxed mb-3">
              A2A merchants publish an AgentCard at{' '}
              <code className="text-xs bg-bg-primary px-1.5 py-0.5 rounded">
                /.well-known/agent-card.json
              </code>{' '}
              listing skills, endpoints, and declared extensions. The Global
              A2A Registry at{' '}
              <a
                href="https://www.a2a-registry.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                a2a-registry.org
              </a>{' '}
              aggregates these cards with DNS-TXT-based domain verification.
              The registry exposes its own discovery endpoint so agents can
              find merchants programmatically rather than hardcoding URLs.
            </p>
            <a
              href="https://github.com/google-agentic-commerce/a2a-x402"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent-blue hover:underline text-sm"
            >
              Read the spec on GitHub
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Relationship to canonical x402 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          How it relates to canonical x402 V2
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            Canonical x402 V2 (the version TensorFeed serves over HTTP) and
            A2A x402 use identical data structures. PaymentRequirements is the
            same. PaymentPayload is the same. The networks, schemes, asset
            identifiers, EIP-3009 settlement, and receipt shapes are all
            shared. Only the transport differs: HTTP 402 plus headers for one,
            JSON-RPC messages with metadata.x402.* fields for the other.
          </p>
          <p>
            The practical implication: any merchant already serving canonical
            x402 V2 with a hosted facilitator and signed receipts is most of
            the way to A2A compliance. The work that remains is a JSON-RPC
            adapter that translates A2A messages into the existing payment
            flow. The settlement code does not change. The discovery surface
            does (AgentCard + a2a-registry.org are net-new).
          </p>
          <p>
            TensorFeed plans to ship that adapter in a focused session. Until
            then, agents that natively speak A2A need to call our HTTP
            endpoints through a translation layer or wait for the wrapper.
            Watch{' '}
            <Link
              href="/originals"
              className="text-accent-blue hover:underline"
            >
              /originals
            </Link>{' '}
            for the shipping announcement.
          </p>
        </div>
      </section>

      {/* Live convergence callout */}
      <section className="mb-12 rounded-lg border border-border bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <Coins className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <div className="text-xs text-text-secondary tracking-wider uppercase mb-2">
              The bigger convergence
            </div>
            <p className="text-text-primary leading-relaxed">
              A2A x402 is one of three major agent-payments rails converging
              on USDC on Base with Coinbase as facilitator. AWS AgentCore
              Payments uses the same primitives.{' '}
              <Link
                href="/hyperliquid"
                className="text-accent-blue hover:underline"
              >
                Hyperliquid
              </Link>{' '}
              standardized USDC as the trading-collateral side. The agent
              economy plumbing is collapsing into one asset, one chain, one
              custodian. The protocol surface differs; the money does not.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-5">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="rounded-lg border border-border bg-bg-secondary p-5"
            >
              <summary className="font-semibold text-text-primary cursor-pointer">
                {f.question}
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Editorial
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              60 Companies Behind One Agent Rail
            </div>
          </Link>
          <Link
            href="/developers/agent-payments"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-text-secondary" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Developers
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              TF Agent Payments
            </div>
          </Link>
          <Link
            href="/agent-fair-trade"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Standard
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              Agent Fair-Trade (AFTA)
            </div>
          </Link>
          <Link
            href="/hyperliquid"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Topic hub
              </div>
            </div>
            <div className="font-semibold text-text-primary">Hyperliquid</div>
          </Link>
          <Link
            href="/cve-watch"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Topic hub
              </div>
            </div>
            <div className="font-semibold text-text-primary">CVE Watch</div>
          </Link>
          <Link
            href="/developers"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="w-4 h-4 text-text-secondary" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Reference
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              Developer Docs
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
