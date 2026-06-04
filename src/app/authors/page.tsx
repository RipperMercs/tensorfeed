import { Metadata } from 'next';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authors: TensorFeed.ai Editorial Team',
  description:
    'Meet the TensorFeed.ai editorial team: Adrian Vale (founder and lead editor), Kira Nolan (AI safety and open source), and Marcus Chen (API economics and enterprise AI).',
  alternates: {
    canonical: 'https://tensorfeed.ai/authors',
  },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/authors',
    title: 'Authors: TensorFeed.ai Editorial Team',
    description:
      'Meet the TensorFeed.ai editorial team: Adrian Vale (founder and lead editor), Kira Nolan (AI safety and open source), and Marcus Chen (API economics and enterprise AI).',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Authors: TensorFeed.ai Editorial Team',
    description:
      'Meet the TensorFeed.ai editorial team: Adrian Vale (founder and lead editor), Kira Nolan (AI safety and open source), and Marcus Chen (API economics and enterprise AI).',
  },
};

const AUTHORS = [
  {
    slug: 'adrian-vale',
    name: 'Adrian Vale',
    role: 'Founder and Lead Editor',
    beat: 'Software engineering, AI agents, developer tooling, infrastructure',
    summary:
      'Evan (Adrian Vale) is a software engineer and entrepreneur with over a decade of experience building web applications, real-time data systems, and developer tools. He founded TensorFeed in March 2026 and leads all editorial decisions.',
  },
  {
    slug: 'kira-nolan',
    name: 'Kira Nolan',
    role: 'Contributing Editor',
    beat: 'AI safety, open source models, agent ecosystems, alignment research',
    summary:
      'Kira Nolan covers the open source AI ecosystem, frontier model safety research, and the agent tooling landscape. She tracks alignment labs, model evals, and the practical security posture of agentic systems.',
  },
  {
    slug: 'marcus-chen',
    name: 'Marcus Chen',
    role: 'Contributing Editor',
    beat: 'API economics, pricing analysis, enterprise AI, model infrastructure',
    summary:
      'Marcus Chen covers the economics of AI APIs, frontier model pricing, enterprise adoption patterns, and the infrastructure behind large-scale inference. He writes the ongoing pricing war coverage.',
  },
];

export default function AuthorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Authors</h1>
        </div>
        <p className="text-text-muted text-sm mt-2 max-w-2xl">
          Every original article on TensorFeed is written, fact-checked, and signed by a
          named human editor. Meet the team behind the byline.
        </p>
      </div>

      <div className="grid gap-5">
        {AUTHORS.map((author) => (
          <Link
            key={author.slug}
            href={`/authors/${author.slug}`}
            className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {author.name}
                </h2>
                <p className="text-text-muted text-sm mt-1">{author.role}</p>
                <p className="text-text-secondary text-sm mt-3 leading-relaxed">
                  {author.summary}
                </p>
                <p className="text-text-muted text-xs mt-3 font-mono">
                  Beat: {author.beat}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-sm text-text-muted">
        Read more about our standards in the{' '}
        <Link href="/editorial-policy" className="text-accent-primary hover:underline">
          Editorial Policy
        </Link>
        .
      </div>
    </div>
  );
}
