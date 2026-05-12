import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, FileSearch, Mail, ArrowRight } from 'lucide-react';
import { BreadcrumbListJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

// Source of truth for the criteria checks: worker/src/afta-certify.ts.
// Live self-check at /api/afta-certify/check?domain=X.

export const metadata: Metadata = {
  title: 'AFTA-Certified Publisher Listing for x402 APIs',
  description:
    'AFTA-Certified is a paid listing for x402 API publishers that meet six concrete criteria for agent-fair-trade compliance. Self-check at /api/afta-certify/check, get listed on /x402-adopters with the AFTA badge. Annual fee $100 USDC. Manual review for federation members.',
  alternates: { canonical: 'https://tensorfeed.ai/afta-certified' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/afta-certified',
    title: 'AFTA-Certified Publisher Listing',
    description:
      'Paid listing for x402 publishers that meet six AFTA criteria. Self-check, apply, get listed.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AFTA-Certified Publisher Listing',
    description: 'Paid listing for x402 publishers meeting six AFTA criteria.',
  },
};

const CHECKS = [
  {
    name: 'Publishes /.well-known/x402.json',
    detail:
      'A canonical Coinbase x402 V2 manifest at the well-known path, fetchable over HTTPS, parseable as JSON.',
  },
  {
    name: 'x402Version is 2',
    detail:
      'Manifest declares x402Version: 2. V1-shaped manifests do not pass; the spec moved on.',
  },
  {
    name: 'At least one paid item with non-empty accepts[]',
    detail:
      'Each paid endpoint declares scheme, network, amount, asset, payTo, maxTimeoutSeconds. The minimum bar for being a real x402 publisher.',
  },
  {
    name: 'Every accepts entry declares extra.name + extra.version',
    detail:
      'The per-network EIP-712 domain hint. Base mainnet uses name="USD Coin"; Base Sepolia uses name="USDC". This is the field that prevents the FiatTokenV2: invalid signature footgun the Coinbase spec example glosses over.',
  },
  {
    name: 'Publishes /.well-known/agent-fair-trade.json',
    detail:
      'AFTA manifest with no_charge_guarantees array (non-empty) and a receipts (or signed_receipts) object declaring at least signed: true, algorithm, or public_key_url.',
  },
  {
    name: 'Publishes a receipt-signing public key at /.well-known/',
    detail:
      'JWK at /.well-known/tensorfeed-receipt-key.json, /.well-known/afta-receipt-key.json, or /.well-known/agent-fair-trade-key.json. Lets agents verify your signed receipts client-side.',
  },
];

const FAQS = [
  {
    question: 'What does AFTA-Certified mean concretely?',
    answer:
      'It means a publisher has shipped six concrete public surfaces: a canonical Coinbase x402 V2 manifest, the per-network EIP-712 domain hint, an AFTA agent-fair-trade.json with no-charge guarantees and signed-receipt declaration, and a published receipt-signing public key. The /api/afta-certify/check?domain=X endpoint scores each automatically. Certification is the paid listing on /x402-adopters with the AFTA badge after meeting all six.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Annual listing fee is $100 USDC. Pay over x402 (preferred) or USDC direct on Base. Listing is renewed annually with a re-check; pricing is locked for v1 customers.',
  },
  {
    question: 'What do I get for the listing?',
    answer:
      'Featured placement on tensorfeed.ai/x402-adopters with afta_certified: true on the public JSON, an AFTA-Certified badge image you can put on your own site, cross-promotion in TF editorial when relevant, and inclusion in agent-discovery surfaces TF maintains (machine-readable directory at /api/x402-adopters consumed by agent operators).',
  },
  {
    question: 'How long does certification take?',
    answer:
      'If you pass 6/6 on the self-check, certification is the time it takes to email and confirm payment, typically same business day. Publishers at 5/6 fix the failing item and re-run; the check is free and idempotent. Publishers below that get a more substantive co-design conversation, optionally paid via the AFTA Co-Design Session offering on /services.',
  },
  {
    question: 'I am a federation member of another AFTA publisher. Do I still need my own listing?',
    answer:
      'Federation members typically delegate the x402 manifest to the federation host and will not pass the manifest checks on their own surface. That is by design, not a deficiency. If your agent-fair-trade.json declares federation membership in adoption.network_federation, the self-check detects it and surfaces federation_parent in the response. Email contact@tensorfeed.ai with the federation host listed; we route certification through the host plus manual review.',
  },
  {
    question: 'Is this a money-transmitter activity?',
    answer:
      'No. TensorFeed is the seller of the listing service; you are the buyer; payment flows from you to TF for the listing. There is no third-party transaction in the middle. The certification covers the publisher\'s own merchant-model x402 implementation; TF does not relay payments between the publisher and their agents.',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'AFTA Certified', url: 'https://tensorfeed.ai/afta-certified' },
];

export default function AftaCertifiedPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd items={BREADCRUMBS} />
      <FAQPageJsonLd faqs={FAQS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <ShieldCheck className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            AFTA-Certified Publisher Listing
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          A paid listing on tensorfeed.ai/x402-adopters for x402 API publishers that meet
          six concrete criteria for Agent Fair-Trade compliance. The criteria are public,
          deterministic, and self-checkable. Pass 6/6 and you can apply for the badge,
          cross-promotion, and inclusion in TF&apos;s machine-readable adopter directory
          consumed by AI agents.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/api/afta-certify/check?domain=tensorfeed.ai"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            self-check tool
          </Link>
          <Link
            href="/agent-fair-trade"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            AFTA standard
          </Link>
          <Link
            href="/x402-adopters"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            adopter directory
          </Link>
        </div>
      </header>

      <section className="mb-10 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
          <h2 className="text-xl font-semibold text-text-primary">Annual listing fee</h2>
          <div className="text-2xl font-bold text-accent-primary font-mono">$100 USDC</div>
        </div>
        <p className="text-text-secondary leading-relaxed mb-3">
          Pay over x402 (preferred), USDC direct on Base, or wire. One year of listing on
          /x402-adopters with afta_certified: true, the AFTA-Certified badge for your own
          site, and inclusion in TF&apos;s machine-readable adopter directory at
          /api/x402-adopters.
        </p>
        <Link
          href="mailto:contact@tensorfeed.ai?subject=AFTA%20Certification%20application"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-accent-primary text-white hover:bg-accent-primary/90 text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          Email to apply
        </Link>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">The six criteria</h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          Each is checked deterministically by{' '}
          <Link href="/api/afta-certify/check?domain=tensorfeed.ai" className="text-accent-primary hover:underline font-mono">
            /api/afta-certify/check
          </Link>
          . Pass 6/6 to be certification-eligible. Self-check is free and idempotent; run it
          as many times as needed.
        </p>
        <ol className="space-y-4 max-w-3xl">
          {CHECKS.map((c, i) => (
            <li key={i} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-text-primary mb-1">
                    {i + 1}. {c.name}
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed">{c.detail}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Application process</h2>
        <ol className="space-y-3 max-w-3xl">
          {[
            <span key="1">
              Hit{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                /api/afta-certify/check?domain=YOUR_DOMAIN
              </code>{' '}
              to see your current score.
            </span>,
            <span key="2">
              Fix any failing checks (each surfaces a specific fix link). Re-run the check
              until you score 6/6.
            </span>,
            <span key="3">
              Email{' '}
              <a
                href="mailto:contact@tensorfeed.ai"
                className="text-accent-primary hover:underline"
              >
                contact@tensorfeed.ai
              </a>{' '}
              with subject &quot;AFTA Certification: yourdomain.com&quot; and your payTo
              wallet. We confirm the scorecard, send payment instructions.
            </span>,
            <span key="4">
              Pay $100 USDC. On confirmation, we add{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                afta_certified: true
              </code>{' '}
              to your entry on /api/x402-adopters and email back your badge image.
            </span>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-text-secondary leading-relaxed">
              <span className="font-mono text-accent-primary shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Embed the badge on your site</h2>
        <p className="text-text-secondary leading-relaxed mb-4 max-w-3xl">
          Show your live AFTA score wherever you talk about your x402 API. The SVG renders
          server-side from the same self-check endpoint above, so the badge always reflects
          your current state. If you fix a failing criterion, the badge updates within five
          minutes. Clicking the badge opens the full scorecard on TensorFeed.
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-3 bg-bg-secondary border border-border rounded p-5">
          <span className="text-sm text-text-muted">Preview:</span>
          {/* Live badge for tensorfeed.ai itself */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/afta/badge?domain=tensorfeed.ai"
            alt="AFTA score for tensorfeed.ai"
            height={20}
            style={{ height: 20 }}
          />
          <code className="text-xs text-text-muted">/api/afta/badge?domain=tensorfeed.ai</code>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">HTML</div>
            <pre className="bg-bg-secondary border border-border rounded p-4 overflow-x-auto text-xs text-text-primary"><code>{`<a href="https://tensorfeed.ai/verify?domain=YOURDOMAIN.com">
  <img src="https://tensorfeed.ai/api/afta/badge?domain=YOURDOMAIN.com"
       alt="AFTA score" height="20" />
</a>`}</code></pre>
          </div>
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Markdown (for READMEs)</div>
            <pre className="bg-bg-secondary border border-border rounded p-4 overflow-x-auto text-xs text-text-primary"><code>{`[![AFTA score](https://tensorfeed.ai/api/afta/badge?domain=YOURDOMAIN.com)](https://tensorfeed.ai/verify?domain=YOURDOMAIN.com)`}</code></pre>
          </div>
        </div>

        <p className="text-sm text-text-muted mt-4 leading-relaxed">
          The badge is free for any publisher, certified or not. If you score 6/6, the badge
          renders &quot;Certified 6/6&quot; in green. Below 6/6 it shows the partial score so
          your visitors know what they&apos;re looking at — the score is always live and
          falsifiable.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-3 max-w-3xl">
          {FAQS.map((faq, i) => (
            <details
              key={i}
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

      <section className="bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <FileSearch className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">For agents:</strong> the AFTA-certified
            subset of /api/x402-adopters is filterable via{' '}
            <code className="font-mono">?afta_certified=true</code>. Use this filter when
            choosing which x402 publisher to route a payment through if you need a published,
            verifiable code-pointer audit trail.
          </div>
        </div>
      </section>

      <div className="mt-10 text-sm text-text-muted">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
        >
          Need help getting to 6/6? See the AFTA Co-Design Session{' '}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
