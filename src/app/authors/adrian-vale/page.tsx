import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, ExternalLink } from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Adrian Vale, Founder and Lead Editor',
  description:
    'Adrian Vale (Evan) is the founder and lead editor of TensorFeed.ai. Software engineer covering AI agents, developer tooling, infrastructure, and the frontier model race.',
  alternates: {
    canonical: 'https://tensorfeed.ai/authors/adrian-vale',
  },
  openGraph: {
    type: 'profile',
    url: 'https://tensorfeed.ai/authors/adrian-vale',
    title: 'Adrian Vale, Founder and Lead Editor',
    description:
      'Adrian Vale (Evan) is the founder and lead editor of TensorFeed.ai. Software engineer covering AI agents, developer tooling, infrastructure, and the frontier model race.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Adrian Vale, Founder and Lead Editor',
    description:
      'Adrian Vale (Evan) is the founder and lead editor of TensorFeed.ai. Software engineer covering AI agents, developer tooling, infrastructure, and the frontier model race.',
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Adrian Vale',
  alternateName: 'Evan',
  url: 'https://tensorfeed.ai/authors/adrian-vale',
  image: 'https://tensorfeed.ai/tensorfeed-logo.png',
  jobTitle: 'Founder and Lead Editor',
  description:
    'Founder and lead editor of TensorFeed.ai. Software engineer covering AI agents, developer tooling, infrastructure, and the frontier model race.',
  knowsAbout: [
    'Artificial intelligence',
    'AI agents',
    'Large language models',
    'Developer tooling',
    'Web infrastructure',
    'Cloudflare Workers',
    'Next.js',
    'Real-time data systems',
  ],
  worksFor: {
    '@type': 'Organization',
    name: 'TensorFeed.ai',
    url: 'https://tensorfeed.ai',
  },
  sameAs: [
    'https://twitter.com/tensorfeed',
    'https://github.com/RipperMercs',
  ],
};

const BEATS = [
  'AI agents and agent infrastructure',
  'Developer tooling (MCP, CLAUDE.md, IDE assistants)',
  'Frontier model releases from Anthropic, OpenAI, Google, Meta',
  'Cloudflare Workers and edge computing',
  'Open source AI tooling',
];

const RECENT = [
  {
    href: '/originals/why-we-built-tensorfeed',
    title: 'Why We Built TensorFeed.ai',
  },
  {
    href: '/originals/claude-opus-4-7-release',
    title: 'Claude Opus 4.7 Release Analysis',
  },
  {
    href: '/originals/building-for-ai-agents',
    title: 'Building for AI Agents',
  },
  {
    href: '/originals/llms-txt-every-developer',
    title: 'Why Every Developer Needs an llms.txt',
  },
  {
    href: '/originals/mcp-97-million-installs',
    title: 'MCP at 97 Million Installs',
  },
];

export default function AdrianValeAuthorPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd data={personJsonLd} />

      <Link
        href="/authors"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Authors
      </Link>

      <header className="mb-8">
        <p className="text-sm text-text-muted uppercase tracking-wider font-mono">
          Founder and Lead Editor
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-2">Adrian Vale</h1>
        <p className="text-text-muted text-sm mt-2">Evan, writing as Adrian Vale</p>
      </header>

      <section className="space-y-4 text-text-secondary leading-relaxed mb-10">
        <p className="text-lg text-text-primary">
          Adrian Vale is the founder of TensorFeed.ai and its lead editor. He is a software
          engineer and entrepreneur with more than a decade of experience building web
          applications, real-time data platforms, and developer tools.
        </p>
        <p>
          He started TensorFeed in March 2026 because keeping up with AI shipped every
          week had become impossible without a dozen browser tabs, three RSS readers, and
          a Slack bot of his own design. He decided to build the aggregator he wanted to
          use, and to ship it for both human readers and AI agents from day one.
        </p>
        <p>
          Before TensorFeed, Adrian Vale ran Pizza Robot Studios LLC, the independent studio
          that operates TensorFeed and its sister site{' '}
          <a
            href="https://terminalfeed.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            TerminalFeed.io
          </a>
          . He has shipped production systems on Cloudflare Workers, Next.js, and edge
          networks for years, and uses TensorFeed&apos;s own stack as his reference
          implementation for building agent-ready sites.
        </p>
        <p>
          He writes the site&apos;s founder memos, the Claude and Anthropic coverage, the
          agent tooling deep dives, and the ongoing llms.txt and MCP reporting. He is
          also a sound designer, music composer, and lifelong RPG and MMO player, which
          is not editorially relevant but explains the dark-theme UI.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Beat</h2>
        <ul className="list-disc list-inside space-y-1 pl-2 text-text-secondary">
          {BEATS.map((beat) => (
            <li key={beat}>{beat}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Recent Articles</h2>
        <div className="grid gap-2">
          {RECENT.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
            >
              <span className="text-text-primary hover:text-accent-primary transition-colors">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Contact</h2>
        <div className="bg-bg-secondary border border-border rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-text-muted" />
            <a
              href="mailto:feedback@tensorfeed.ai"
              className="text-accent-primary hover:underline"
            >
              feedback@tensorfeed.ai
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-text-muted" />
            <a
              href="https://twitter.com/tensorfeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              @tensorfeed on X
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-text-muted" />
            <a
              href="https://github.com/RipperMercs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              github.com/RipperMercs
            </a>
          </div>
        </div>
      </section>

      <div className="pt-6 border-t border-border text-sm text-text-muted">
        See our{' '}
        <Link href="/editorial-policy" className="text-accent-primary hover:underline">
          Editorial Policy
        </Link>{' '}
        for standards, sourcing, and corrections.
      </div>
    </div>
  );
}
