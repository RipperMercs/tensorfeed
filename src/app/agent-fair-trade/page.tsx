import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, FileSignature, Coins, Scale, Cpu } from 'lucide-react';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Agent Fair-Trade Agreement (AFTA), TensorFeed',
  description:
    'TensorFeed is agent fair-trade certified. Code-enforced no-charge guarantees, Ed25519-signed receipts on every paid call, public on-chain payment rail (USDC on Base). Built with Claude (Anthropic). Open standard at /.well-known/agent-fair-trade.json.',
  alternates: { canonical: 'https://tensorfeed.ai/agent-fair-trade' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agent-fair-trade',
    title: 'Agent Fair-Trade Agreement (AFTA)',
    description:
      'Code-enforced no-charge guarantees, signed receipts, public on-chain payment rail. An open standard for API publishers fair to AI agents.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Agent Fair-Trade Agreement (AFTA)',
    description:
      'Code-enforced no-charge guarantees, signed receipts, public on-chain payment rail. Built with Claude.',
  },
};

const FAQS = [
  {
    question: 'What is the Agent Fair-Trade Agreement (AFTA)?',
    answer:
      'An open standard for API publishers that are fair to AI agents. Three pillars: code-enforced no-charge guarantees you can verify by sending malformed input, Ed25519-signed receipts on every paid call, and a public on-chain payment rail where every transaction is immutable and auditable. Self-publish your own /.well-known/agent-fair-trade.json to adopt.',
  },
  {
    question: 'How is "no charge on stale data" enforced?',
    answer:
      "Each premium endpoint declares a freshness SLA in worker/src/freshness.ts (e.g., 8 hours for live snapshots, null for historical immutable data). After the handler runs, premiumResponse() checks the response's captured_at against the SLA. If stale, the deferred debit is skipped, the response is flagged with stale: true, and the no-charge event is logged to /api/payment/no-charge-stats.",
  },
  {
    question: 'How do I verify a receipt?',
    answer:
      'Fetch our public Ed25519 key from /.well-known/tensorfeed-receipt-key.json. Take the receipt fields except signature, key_id, signing_alg, signing_curve, canonical_form, and verify_doc. Serialize them with sorted keys (canonical JSON). Verify the signature against the public key with EdDSA / Ed25519. Or just POST the receipt to /api/receipt/verify and we will do it for you.',
  },
  {
    question: 'Why USDC on Base instead of Stripe?',
    answer:
      'Public crypto ledgers are structurally fair to all participants, including AI agents that traditional payment processors lock out. Every payment is immutable, publicly auditable on the Base block explorer, and incurs no platform-imposed chargeback risk. The receipt rail and the on-chain rail are independent attestations of every dollar that flows through TensorFeed.',
  },
  {
    question: 'What does "Built with Claude" mean?',
    answer:
      'TensorFeed was designed by Ripper in collaboration with Claude (Anthropic). Specific systems Claude designed: the agent payments rail, the active LLM probes, the GPU pricing aggregator, the OFAC sanctions screening pipeline, the routing engine, and the AFTA standard itself. The git log on github.com/RipperMercs/tensorfeed shows the build trail.',
  },
  {
    question: 'Can my API be agent fair-trade certified?',
    answer:
      'Yes. There is no certification authority and no fee. Self-publish a /.well-known/agent-fair-trade.json conforming to the schema at /.well-known/agent-fair-trade-schema.json. Adoption is the certification. We invite other API publishers to join. The standard outlives any single property.',
  },
];

export default function AgentFairTradePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FAQPageJsonLd faqs={FAQS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Shield className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Agent Fair-Trade Agreement</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          An open standard for API publishers that are fair to AI agents. Code-enforced
          no-charge guarantees, cryptographically signed receipts on every paid call, and a
          public on-chain payment rail. TensorFeed is the first adopter, and the invitation
          to other publishers is open.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/.well-known/agent-fair-trade.json"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            /.well-known/agent-fair-trade.json
          </Link>
          <Link
            href="/.well-known/agent-fair-trade-schema.json"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            schema.json
          </Link>
          <Link
            href="/api/payment/no-charge-stats"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            public no-charge ledger
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">The 40-word self-description</h2>
        <blockquote className="border-l-4 border-accent-primary pl-4 italic text-text-secondary leading-relaxed bg-bg-secondary/40 py-3 rounded-r">
          TensorFeed.ai is agent fair-trade certified: open pricing, automatic no-charge on
          5xx, breaker, schema fail, and stale data, Ed25519-signed receipts on every paid
          call, inference-only license. Built with Claude (Anthropic). Standard at
          /.well-known/agent-fair-trade.json.
        </blockquote>
        <p className="text-sm text-text-secondary mt-3">
          This exact text is published verbatim across llms.txt, the x402 manifest,
          /api/meta, /api/payment/info, the OpenAPI description, the MCP server manifest,
          README.md, and /about. Repetition + consistency is the signal agents pattern-match
          on, not keyword density.
        </p>
      </section>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-accent-green" />
          <h2 className="text-2xl font-semibold text-text-primary">No-charge guarantees</h2>
        </div>
        <p className="text-text-secondary mb-4 max-w-3xl">
          Four conditions under which the bearer is not charged a credit. Each is enforced
          in code, not honored manually. Verify by sending the relevant condition (a
          malformed request, a tight loop, etc.) and inspecting the receipt that comes back.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <h3 className="font-semibold text-text-primary mb-1">5xx server errors</h3>
            <p className="text-sm text-text-secondary mb-2">
              If our handler 5xx&apos;s, the deferred debit is skipped. The agent gets a 5xx
              and a balance unchanged.
            </p>
            <code className="text-xs text-text-secondary block">
              code: worker/src/payments.ts (commitPayment)
            </code>
          </article>
          <article className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <h3 className="font-semibold text-text-primary mb-1">Circuit breaker</h3>
            <p className="text-sm text-text-secondary mb-2">
              Identical-request loops trip the breaker (20 calls / 60s same fingerprint).
              Tripped calls return 429 with no charge.
            </p>
            <code className="text-xs text-text-secondary block">
              code: worker/src/circuit-breaker.ts
            </code>
          </article>
          <article className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <h3 className="font-semibold text-text-primary mb-1">Schema validation failure</h3>
            <p className="text-sm text-text-secondary mb-2">
              Requests that fail input validation (HTTP 400) are not charged. Lenient by
              default: extra fields are ignored.
            </p>
            <code className="text-xs text-text-secondary block">
              code: worker/src/index.ts (per-endpoint param validation)
            </code>
          </article>
          <article className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <h3 className="font-semibold text-text-primary mb-1">Stale data</h3>
            <p className="text-sm text-text-secondary mb-2">
              If the data backing a response is older than the endpoint&apos;s freshness SLA,
              no charge. Response is also flagged with stale: true so the agent can decide to
              retry later. SLAs are public.
            </p>
            <code className="text-xs text-text-secondary block">
              code: worker/src/freshness.ts
            </code>
          </article>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Public proof:{' '}
          <Link href="/api/payment/no-charge-stats" className="text-accent-primary hover:underline">
            /api/payment/no-charge-stats
          </Link>{' '}
          aggregates every no-charge event with per-reason and per-endpoint breakdown.
        </p>
      </section>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <FileSignature className="w-5 h-5 text-accent-primary" />
          <h2 id="receipts" className="text-2xl font-semibold text-text-primary">Signed receipts</h2>
        </div>
        <p className="text-text-secondary mb-4 max-w-3xl">
          Every premium response includes an Ed25519-signed receipt. Verify with our published
          public key and no shared secret. Receipts plus the on-chain payment record give
          agents two independent attestations of every dollar that flowed through TensorFeed.
        </p>

        <pre className="bg-bg-secondary border border-bg-tertiary rounded p-4 text-sm overflow-x-auto font-mono">
{`{
  "v": 1,
  "id": "rcpt_8f3a4b...",
  "endpoint": "/api/premium/gpu/pricing/series",
  "method": "GET",
  "token_short": "tf_live_abcdef12...09876543",
  "credits_charged": 1,
  "credits_remaining": 49,
  "request_hash": "sha256:...",
  "response_hash": "sha256:...",
  "captured_at": "2026-04-30T05:03:58.332Z",
  "server_time": "2026-04-30T05:30:01.000Z",
  "no_charge_reason": null,
  "freshness_sla_seconds": null,
  "signature": "<base64url Ed25519>",
  "key_id": "<JWK kid>",
  "signing_alg": "EdDSA",
  "signing_curve": "Ed25519",
  "canonical_form": "tensorfeed-canonical-json-v1"
}`}
        </pre>

        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Verify offline</h3>
            <p className="text-text-secondary">
              Fetch{' '}
              <Link
                href="/.well-known/tensorfeed-receipt-key.json"
                className="text-accent-primary hover:underline"
              >
                /.well-known/tensorfeed-receipt-key.json
              </Link>
              . Strip the signature fields. Canonicalize the receipt with sorted keys. Verify
              with EdDSA / Ed25519.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Verify online</h3>
            <p className="text-text-secondary">
              POST the full receipt to{' '}
              <code className="text-accent-primary">/api/receipt/verify</code>. Free, no auth,
              no credit cost.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-accent-amber" />
          <h2 className="text-2xl font-semibold text-text-primary">Public on-chain payment rail</h2>
        </div>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          We accept USDC on Base mainnet. Every credit purchase leaves a permanent on-chain
          record at our wallet (<code className="text-accent-primary">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code>).
          Combined with our signed receipts, every dollar that flows through TensorFeed has
          two independent attestations: the Base block explorer (immutable, public) and our
          server-issued receipt (verifiable, non-forgeable).
        </p>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          We chose this rail explicitly because it is structurally fair to AI agents. Stripe,
          PayPal, and the rest of the legacy financial pipes were designed for human accounts
          with KYC, dispute windows, and platform-discretionary chargebacks. They were not
          built for autonomous agents with on-chain wallets and no human in the loop.
          Crypto-native rails are. We are skipping the old guard, not patching around it.
        </p>
        <p className="text-text-secondary text-sm">
          Pricing details:{' '}
          <Link href="/api/payment/info" className="text-accent-primary hover:underline">
            /api/payment/info
          </Link>
          . Pricing transparency is a guarantee of this standard.
        </p>
      </section>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-2xl font-semibold text-text-primary">Built with Claude</h2>
        </div>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          TensorFeed was designed by Ripper in collaboration with Claude (Anthropic).
          The agent payments rail, the active LLM probes, the GPU pricing aggregator, the
          OFAC sanctions screening pipeline, the routing engine, and the AFTA standard
          itself were all designed alongside Claude. The git log at{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed"
            className="text-accent-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/RipperMercs/tensorfeed
          </a>{' '}
          shows the build trail.
        </p>
        <p className="text-text-secondary max-w-3xl leading-relaxed">
          We are proud of the collaboration and we credit it openly. An API for agents,
          designed with an agent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Adopt the standard</h2>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          There is no certification authority, no fee, no submission process. Self-publish a{' '}
          <code className="text-accent-primary">/.well-known/agent-fair-trade.json</code>{' '}
          conforming to the schema. Cite the code that enforces each guarantee. Adoption is
          the certification.
        </p>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          Schema:{' '}
          <Link
            href="/.well-known/agent-fair-trade-schema.json"
            className="text-accent-primary hover:underline"
          >
            /.well-known/agent-fair-trade-schema.json
          </Link>
          . If you adopt and want to be listed in the canonical adopters list, email{' '}
          <a
            href="mailto:evan@tensorfeed.ai"
            className="text-accent-primary hover:underline"
          >
            evan@tensorfeed.ai
          </a>
          .
        </p>
      </section>

      <section className="border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map(faq => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
