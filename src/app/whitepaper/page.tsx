import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import WhitepaperBody from './_content';
import PrintButton from '@/components/whitepaper/PrintButton';

const TITLE =
  'The Agent Fair-Trade Agreement (AFTA): An Open Standard for Honest Commerce Between AI Agents and the Web';
const DESCRIPTION =
  'The AFTA whitepaper. An open peer-to-peer standard for honest commerce between data publishers and autonomous AI agents. Four code-enforced no-charge guarantees, Ed25519-signed receipts, USDC on Base as the value rail, and a federation pattern that lets independent sites share a credit ledger without a central broker. Reference implementation at TensorFeed.ai with a federation partner at TerminalFeed.io.';
const PUBLISHED = '2026-05-06';
const VERSION = 'v1.0';

export const metadata: Metadata = {
  title: 'AFTA Whitepaper - The Agent Fair-Trade Agreement (v1.0)',
  description: DESCRIPTION,
  alternates: { canonical: 'https://tensorfeed.ai/whitepaper' },
  openGraph: {
    type: 'article',
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://tensorfeed.ai/whitepaper',
    siteName: 'TensorFeed',
    publishedTime: PUBLISHED + 'T00:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AFTA Whitepaper v1.0',
    description:
      'The Agent Fair-Trade Agreement: open standard for honest commerce between AI agents and the web. USDC on Base, signed receipts, code-enforced no-charge guarantees, peer-to-peer federation.',
  },
};

const JSON_LD_TECH_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: TITLE,
  description: DESCRIPTION,
  author: {
    '@type': 'Person',
    name: 'Ripper',
    url: 'https://tensorfeed.ai',
  },
  publisher: {
    '@type': 'Organization',
    name: 'TensorFeed',
    url: 'https://tensorfeed.ai',
  },
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  mainEntityOfPage: 'https://tensorfeed.ai/whitepaper',
  inLanguage: 'en',
  keywords: [
    'AFTA',
    'Agent Fair-Trade Agreement',
    'AI agents',
    'agent payments',
    'USDC',
    'Base',
    'x402',
    'Ed25519',
    'signed receipts',
    'peer-to-peer federation',
    'TensorFeed',
    'TerminalFeed',
  ],
};

export default function WhitepaperPage() {
  return (
    <article
      className="max-w-3xl mx-auto px-4 sm:px-6 py-10 print:max-w-none print:px-0 print:py-0"
      itemScope
      itemType="https://schema.org/TechArticle"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_TECH_ARTICLE) }}
      />

      {/* Back link (hidden on print) */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to TensorFeed
      </Link>

      {/* Header */}
      <header className="mb-10 not-prose">
        <div
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
        >
          / Whitepaper {VERSION} &middot; Published {PUBLISHED}
        </div>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4 leading-tight"
          itemProp="headline"
        >
          The Agent Fair-Trade Agreement
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-6">
          An open standard for honest commerce between autonomous AI agents and the web.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span itemProp="author" className="text-text-secondary font-medium">
            Ripper @ TensorFeed.ai
          </span>
          <span>&middot;</span>
          <time itemProp="datePublished" dateTime={PUBLISHED}>
            May 6, 2026
          </time>
          <span>&middot;</span>
          <span>{VERSION}</span>
          <span>&middot;</span>
          <span>~45 min read</span>
        </div>

        {/* Action bar (hidden on print) */}
        <div className="flex flex-wrap items-center gap-2 mt-6 print:hidden">
          <PrintButton />
          <a
            href="https://github.com/RipperMercs/tensorfeed/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors"
          >
            <Shield className="w-4 h-4" />
            SECURITY.md
          </a>
          <Link
            href="/agent-fair-trade"
            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors"
          >
            <FileText className="w-4 h-4" />
            Public AFTA page
          </Link>
        </div>
      </header>

      {/* Body, auto-generated from specs/AFTA-WHITEPAPER.md */}
      <div className="whitepaper-prose" itemProp="articleBody">
        <WhitepaperBody />
      </div>

      {/* Footer (hidden on print) */}
      <footer className="mt-16 pt-8 border-t border-border text-sm text-text-muted print:hidden">
        <p className="mb-4">
          The Agent Fair-Trade Agreement is open and free to fork, adopt, or critique. The reference
          implementation source is at{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            github.com/RipperMercs/tensorfeed
          </a>
          . Vulnerability disclosures go to security@tensorfeed.ai (see{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            SECURITY.md
          </a>
          ).
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-accent-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to TensorFeed
          </Link>
          <Link href="/agent-fair-trade" className="hover:text-accent-primary transition-colors">
            Public AFTA page
          </Link>
          <Link
            href="/developers/agent-payments"
            className="hover:text-accent-primary transition-colors"
          >
            Agent Payments docs
          </Link>
          <Link href="/security" className="hover:text-accent-primary transition-colors">
            Security
          </Link>
        </div>
      </footer>
    </article>
  );
}
