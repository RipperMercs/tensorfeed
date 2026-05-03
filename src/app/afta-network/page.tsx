import { Metadata } from 'next';
import Link from 'next/link';
import { Network, AlertCircle, GitFork, FileText, ExternalLink } from 'lucide-react';
import { AFTA_ADOPTERS } from '@/lib/afta-adopters';

export const metadata: Metadata = {
  title: 'AFTA Network Directory, TensorFeed',
  description:
    'Informational directory of known Agent Fair-Trade Agreement adopters. Not an authoritative list. Each adopter\'s own /.well-known/agent-fair-trade.json is the source of truth. Anyone can run a directory.',
  alternates: { canonical: 'https://tensorfeed.ai/afta-network' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/afta-network',
    title: 'AFTA Network Directory',
    description:
      'Informational directory of known AFTA adopters. Not authoritative.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AFTA Network Directory',
    description:
      'Informational directory of known AFTA adopters. Not authoritative.',
  },
};

const ROLE_LABEL: Record<string, string> = {
  host: 'Federation host',
  member: 'Federation member',
  standalone: 'Standalone adopter',
};

const ROLE_COLOR: Record<string, string> = {
  host: 'bg-accent-primary/10 text-accent-primary',
  member: 'bg-bg-tertiary text-text-secondary',
  standalone: 'bg-bg-tertiary text-text-secondary',
};

export default function AftaNetworkPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Network className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            AFTA Network Directory
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          A directory of known Agent Fair-Trade Agreement adopters. {AFTA_ADOPTERS.length} entries as of{' '}
          {new Date().toISOString().slice(0, 10)}. Open a PR to add yours.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/agent-fair-trade"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            What is AFTA?
          </Link>
          <a
            href="https://afta.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            afta.dev
          </a>
          <a
            href="https://github.com/RipperMercs/afta"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            source repo
          </a>
          <a
            href="https://github.com/RipperMercs/afta/blob/main/GOVERNANCE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            Governance
          </a>
        </div>
      </header>

      {/* Not-authoritative banner. Load-bearing. */}
      <section className="mb-10 rounded-lg border border-bg-tertiary bg-bg-secondary/40 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-text-primary font-semibold mb-2">
              This list is informational, not authoritative.
            </p>
            <p className="text-text-secondary text-sm leading-relaxed mb-2">
              The source of truth for any AFTA adopter is the manifest at their
              own <code className="text-accent-primary">/.well-known/agent-fair-trade.json</code>.
              Removal from this page does not revoke adopter status. Inclusion does
              not confer it. Adoption is the certification.
            </p>
            <p className="text-text-secondary text-sm leading-relaxed">
              Anyone can run a directory like this one. We welcome competing
              directories at other URLs and domains. Multiple non-authoritative
              views is the structurally capture-resistant shape, the same pattern
              Bitcoin block explorers use.
            </p>
          </div>
        </div>
      </section>

      {/* The list */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Adopters</h2>
        <div className="grid gap-4">
          {AFTA_ADOPTERS.map((a) => (
            <article
              key={a.site}
              className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-accent-primary hover:underline"
                  >
                    {a.site}
                  </a>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${ROLE_COLOR[a.role] ?? ROLE_COLOR.standalone}`}
                  >
                    {ROLE_LABEL[a.role]}
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  Adopted {a.adopted_at}
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-1 italic">{a.vertical}</p>
              <p className="text-sm text-text-secondary mb-3">{a.description}</p>
              {a.notes && (
                <p className="text-xs text-text-secondary mb-3">{a.notes}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href={a.manifest}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  manifest
                </a>
                <a
                  href={a.manifesto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  manifesto
                </a>
                <a
                  href={a.receipt_key}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  public key
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Submit your adoption */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Submit your adoption
        </h2>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          You become an AFTA adopter by self-publishing a conforming manifest at{' '}
          <code className="text-accent-primary">/.well-known/agent-fair-trade.json</code>.
          That is the entire bar. There is no review, no fee, no certification authority.
        </p>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          To appear in this directory, open a PR against{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed/blob/main/src/lib/afta-adopters.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            src/lib/afta-adopters.ts
          </a>{' '}
          adding your entry. The only check is that your manifest URL serves a conforming
          AFTA manifest. We do not review your business model, content, pricing,
          or affiliations.
        </p>
        <div className="rounded-lg border border-bg-tertiary bg-bg-secondary/40 p-4">
          <p className="text-xs text-text-secondary mb-2 font-mono">
            {'// src/lib/afta-adopters.ts entry shape:'}
          </p>
          <pre className="text-xs text-text-primary overflow-x-auto"><code>{`{
  site: 'yoursite.example',
  url: 'https://yoursite.example',
  vertical: 'What you do',
  description: 'One or two sentences.',
  adopted_at: '2026-MM-DD',
  manifest: 'https://yoursite.example/.well-known/agent-fair-trade.json',
  manifesto: 'https://yoursite.example/agent-fair-trade',
  receipt_key: 'https://yoursite.example/.well-known/yoursite-receipt-key.json',
  role: 'standalone' as const,  // or 'host' or 'member'
  notes: 'Optional free-form note.',
}`}</code></pre>
        </div>
      </section>

      {/* Run your own directory */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <GitFork className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-semibold text-text-primary">
            Run your own directory
          </h2>
        </div>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          We actively encourage other parties to run their own AFTA adopter directories
          at other URLs and domains. Multiple non-authoritative directories is the
          shape that survives any one of them being captured, going offline, or
          drifting from values. The schema and code are MIT-licensed; lifting the
          adopter list and rendering it elsewhere is welcomed, not just permitted.
        </p>
        <p className="text-text-secondary mb-3 max-w-3xl leading-relaxed">
          If you stand one up, let us know via a PR to{' '}
          <code className="text-accent-primary">src/lib/afta-adopters.ts</code> with
          a comment, and we will link to it from this page.
        </p>
      </section>

      {/* Footer-ish closing */}
      <section className="border-t border-bg-tertiary pt-6">
        <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
          This page renders <code className="text-accent-primary">src/lib/afta-adopters.ts</code> from{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            the TensorFeed repo
          </a>
          . The standard&apos;s canonical home is{' '}
          <a
            href="https://afta.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            afta.dev
          </a>
          . Source repo:{' '}
          <a
            href="https://github.com/RipperMercs/afta"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            github.com/RipperMercs/afta
          </a>
          . Governance lives at{' '}
          <a
            href="https://github.com/RipperMercs/afta/blob/main/GOVERNANCE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            GOVERNANCE.md
          </a>
          .
        </p>
      </section>
    </div>
  );
}
