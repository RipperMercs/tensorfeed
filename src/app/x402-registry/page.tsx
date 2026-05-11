import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Globe, ShieldCheck, Database } from 'lucide-react';
import RegistryTable from './RegistryTable';

export const metadata: Metadata = {
  title: 'x402 Publisher Registry: Live Index of Machine-Payable APIs',
  description:
    'Live registry of x402-compatible publishers, crawled daily from each domain\'s /.well-known/x402 manifest. Status, version, payment networks, endpoint counts, and AFTA federation flags in one normalized snapshot. The structured live alternative to hand-curated readmes.',
  alternates: { canonical: 'https://tensorfeed.ai/x402-registry' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/x402-registry',
    title: 'x402 Publisher Registry',
    description:
      'Live index of x402-compatible publishers. Daily crawl, normalized snapshot, open data export at /api/x402-registry/snapshot.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402 Publisher Registry',
    description:
      'Live machine-readable index of x402 publishers. Daily crawl. Open data. Structured alternative to hand-curated readmes.',
  },
  keywords: [
    'x402 registry',
    'x402 publishers',
    'x402 directory',
    'machine-payable API directory',
    'agent payments registry',
    'x402 well-known',
    'AFTA federation',
    'Coinbase x402',
    'AgentCore Payments',
    'tensorfeed x402',
  ],
};

export default function X402RegistryPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
          x402 Publisher Registry
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          A live index of x402-compatible publishers, crawled daily from each domain&apos;s
          {' '}
          <code className="font-mono text-sm bg-bg-secondary px-1.5 py-0.5 rounded">/.well-known/x402</code>
          {' '}
          manifest. Status, payment networks, endpoint counts, and federation flags in one normalized snapshot.
        </p>
      </header>

      <section className="mb-10">
        <RegistryTable />
      </section>

      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-accent-primary" />
          How this differs from a curated awesome-list
        </h2>
        <p className="text-text-secondary leading-relaxed mb-3">
          Curated readmes are useful but stale within weeks. The x402 spec already defines a
          discovery manifest at <code className="font-mono text-sm">/.well-known/x402</code>. We crawl that.
          Every publisher self-publishes their own data; we surface it normalized and dated. The
          canonical source of truth is the publisher&apos;s manifest, not a maintainer&apos;s taste.
        </p>
        <ul className="space-y-2 text-sm text-text-secondary mt-4">
          <li className="flex gap-3">
            <span className="text-accent-primary shrink-0">&middot;</span>
            <span><strong className="text-text-primary">Auto-refreshed:</strong> daily crawl at 02:15 UTC, status per entry preserved in the snapshot.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary shrink-0">&middot;</span>
            <span><strong className="text-text-primary">Open data:</strong> the JSON at <code className="font-mono text-sm">/api/x402-registry/snapshot</code> is the same data this page renders, free, no auth, no rate limit beyond the standard edge cache.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary shrink-0">&middot;</span>
            <span><strong className="text-text-primary">Structurally agent-friendly:</strong> an MCP or HTTP agent can list every machine-payable API in the ecosystem with one call.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent-primary shrink-0">&middot;</span>
            <span><strong className="text-text-primary">Not an endorsement:</strong> inclusion means the publisher exposes a valid <code className="font-mono text-sm">/.well-known/x402</code>. Agents must still verify wallet addresses on-chain against the publisher&apos;s own <code className="font-mono text-sm">publisher.validation.publishedAt</code> locations before sending funds.</span>
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-accent-primary" />
          Get your site listed
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          The seed list grows organically. To get added:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-text-secondary leading-relaxed">
          <li>
            Publish a valid x402 V2 manifest at <code className="font-mono text-sm">/.well-known/x402</code> on your domain.
            See the <Link href="/glossary/x402" className="text-accent-primary hover:underline">x402 glossary</Link>
            {' '}or the
            {' '}
            <a
              href="https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline inline-flex items-center gap-1"
            >
              Coinbase x402 V2 spec
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </li>
          <li>
            Send the domain to{' '}
            <a href="mailto:contact@tensorfeed.ai?subject=x402 Registry Submission" className="text-accent-primary hover:underline">
              contact@tensorfeed.ai
            </a>
            {' '}
            with subject &quot;x402 Registry Submission&quot;.
          </li>
          <li>We add it to the seed list. The next daily crawl picks up the manifest and the entry appears here automatically.</li>
        </ol>
        <p className="text-sm text-text-muted leading-relaxed mt-4">
          No PR review, no curatorial gatekeeping on signal-or-vibes. The canonical x402 manifest is the
          submission. We just index it.
        </p>
      </section>

      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent-primary" />
          AFTA federation membership
        </h2>
        <p className="text-text-secondary leading-relaxed mb-3">
          The
          {' '}
          <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">Agent Fair-Trade Agreement</Link>
          {' '}
          is an open spec for how machine-payable APIs should behave toward agents: code-enforced no-charge on
          schema failures, breaker trips, or stale data; Ed25519-signed receipts on every paid response; on-chain
          rail for verifiable settlement. Federation members serve <code className="font-mono text-sm">/api/afta-certify/check?domain=</code>
          {' '}
          and score 6/6 on the canonical checks.
        </p>
        <p className="text-text-secondary leading-relaxed">
          Federation membership is a separate signal from x402 compatibility. A site can be x402-compatible
          without being in the AFTA federation. The federation flag in the snapshot above is a TF assertion
          made on the registry side, not a manifest-level claim.
        </p>
      </section>

      <footer className="text-sm text-text-muted border-t border-border pt-6">
        Refresh cadence: daily 02:15 UTC. Snapshot JSON:
        {' '}
        <a
          href="/api/x402-registry/snapshot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline font-mono"
        >
          /api/x402-registry/snapshot
        </a>
        . The page client-polls the same endpoint every 60 seconds.
        <div className="mt-3">
          <Link
            href="/developers"
            className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary"
          >
            All developer endpoints
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
