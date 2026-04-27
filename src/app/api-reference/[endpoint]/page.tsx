import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Code2 } from 'lucide-react';
import {
  API_REFERENCE,
  getApiRefBySlug,
  getAllApiRefSlugs,
  ApiRefMeta,
} from '@/lib/api-reference-directory';

export function generateStaticParams() {
  return getAllApiRefSlugs().map(endpoint => ({ endpoint }));
}

export function generateMetadata({ params }: { params: { endpoint: string } }): Metadata {
  const meta = getApiRefBySlug(params.endpoint);
  if (!meta) return {};
  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    alternates: { canonical: `https://tensorfeed.ai/api-reference/${meta.slug}` },
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/api-reference/${meta.slug}`,
      title: meta.seoTitle,
      description: meta.seoDescription,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: { card: 'summary_large_image', title: meta.seoTitle, description: meta.seoDescription },
  };
}

function tierBadge(tier: ApiRefMeta['tier']): { label: string; color: string; bg: string } {
  if (tier === 'premium') return { label: 'Premium', color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.15)' };
  if (tier === 'free-with-token') return { label: 'Free with token', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' };
  return { label: 'Free', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
}

export default function ApiReferencePage({ params }: { params: { endpoint: string } }) {
  const meta = getApiRefBySlug(params.endpoint);
  if (!meta) notFound();
  const badge = tierBadge(meta.tier);

  const FAQ_JSONLD = meta.faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: meta.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const TECH_ARTICLE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: meta.seoTitle,
    description: meta.seoDescription,
    url: `https://tensorfeed.ai/api-reference/${meta.slug}`,
    proficiencyLevel: 'Expert',
    inLanguage: 'en',
    isAccessibleForFree: meta.tier !== 'premium',
    author: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    publisher: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
  };

  const related = meta.relatedSlugs
    .map(slug => API_REFERENCE.find(e => e.slug === slug))
    .filter((e): e is ApiRefMeta => Boolean(e));

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {FAQ_JSONLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TECH_ARTICLE_JSONLD) }}
      />

      <Link
        href="/api-reference"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All endpoints
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Code2 className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">{meta.name}</h1>
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ background: badge.bg, color: badge.color }}
          >
            {meta.cost}
          </span>
        </div>
        <code className="font-mono text-sm text-text-muted block mb-3">
          {meta.method} {meta.path}
        </code>
        <p className="text-text-secondary text-lg">{meta.intro}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-3">When to use this endpoint</h2>
        <p className="text-text-secondary">{meta.whenToUse}</p>
      </section>

      {meta.params.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Parameters</h2>
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">In</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Description</th>
                </tr>
              </thead>
              <tbody>
                {meta.params.map(p => (
                  <tr key={p.name} className="border-t border-border">
                    <td className="px-4 py-2.5 font-mono text-text-primary text-xs">
                      {p.name}
                      {p.required && <span className="text-red-400 ml-1">*</span>}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted text-xs font-mono">{p.in}</td>
                    <td className="px-4 py-2.5 text-text-muted text-xs font-mono">{p.type}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">
                      {p.description}
                      {p.example && (
                        <code className="font-mono text-accent-primary ml-2 text-xs">e.g. {p.example}</code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-text-muted text-xs px-4 py-2 border-t border-border">
              <span className="text-red-400">*</span> required
            </p>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Example response</h2>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-xs overflow-x-auto"><code className="text-text-primary font-mono">{meta.exampleResponse}</code></pre>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Code samples</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-text-primary font-semibold text-sm mb-2 font-mono">Python SDK</h3>
            <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-xs overflow-x-auto"><code className="text-text-primary font-mono">{meta.pythonExample}</code></pre>
          </div>
          <div>
            <h3 className="text-text-primary font-semibold text-sm mb-2 font-mono">TypeScript SDK</h3>
            <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-xs overflow-x-auto"><code className="text-text-primary font-mono">{meta.typescriptExample}</code></pre>
          </div>
          {meta.mcpTool && (
            <div>
              <h3 className="text-text-primary font-semibold text-sm mb-2 font-mono">MCP tool</h3>
              <p className="text-text-secondary text-sm">
                Available via the{' '}
                <Link href="/glossary/mcp" className="text-accent-primary hover:underline">
                  TensorFeed MCP server
                </Link>{' '}
                as <code className="font-mono text-accent-primary">{meta.mcpTool}</code>. Add{' '}
                <code className="font-mono text-accent-primary">npx -y @tensorfeedai/mcp-server</code>{' '}
                to your Claude Desktop or Claude Code MCP config.
              </p>
            </div>
          )}
        </div>
      </section>

      {meta.faqs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-3">FAQ</h2>
          <div className="space-y-3">
            {meta.faqs.map((f, i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-2 text-sm">{f.q}</h3>
                <p className="text-text-secondary text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Related endpoints</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map(r => (
              <Link
                key={r.slug}
                href={`/api-reference/${r.slug}`}
                className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
              >
                <h3 className="text-text-primary font-semibold text-sm mb-1">{r.name}</h3>
                <code className="font-mono text-xs text-text-muted">{r.path}</code>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 pt-6 border-t border-border text-text-muted text-sm flex flex-wrap items-center gap-3">
        <Link href="/openapi.json" className="text-accent-primary hover:underline inline-flex items-center gap-1">
          OpenAPI 3.1 spec <ExternalLink className="w-3 h-3" />
        </Link>
        <span>·</span>
        <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
          Agent payments docs
        </Link>
        <span>·</span>
        <Link href="/for-ai-agents" className="text-accent-primary hover:underline">
          For AI agents
        </Link>
      </div>
    </article>
  );
}
