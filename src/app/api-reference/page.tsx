import { Metadata } from 'next';
import Link from 'next/link';
import { Code2, BookOpen } from 'lucide-react';
import { API_REFERENCE, getApiRefsByCategory, EndpointCategory } from '@/lib/api-reference-directory';

export const metadata: Metadata = {
  title: 'TensorFeed API Reference: All Endpoints, Free and Premium',
  description:
    'Complete TensorFeed.ai API reference. Per-endpoint pages with input parameters, response schemas, code samples in curl, Python, and TypeScript, MCP tool names, and FAQ.',
  alternates: { canonical: 'https://tensorfeed.ai/api-reference' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/api-reference',
    title: 'TensorFeed API Reference',
    description: 'Per-endpoint pages with input parameters, response schemas, code samples, MCP tool names, and FAQ.',
    siteName: 'TensorFeed.ai',
  },
};

const CATEGORY_LABELS: Record<EndpointCategory, string> = {
  news: 'News',
  status: 'Service status',
  models: 'Models, benchmarks, comparison',
  routing: 'Routing recommendations',
  history: 'History series and snapshots',
  agents: 'Agents directory and provider deep-dive',
  watches: 'Webhook watches',
  payment: 'Payment flow',
  'agent-brief': 'Agent morning brief',
};

const CATEGORY_ORDER: EndpointCategory[] = [
  'news',
  'status',
  'models',
  'routing',
  'history',
  'agents',
  'watches',
  'agent-brief',
  'payment',
];

export default function ApiReferenceIndexPage() {
  const grouped = getApiRefsByCategory();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Code2 className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">API reference</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Per-endpoint reference pages with input parameters, response schemas, code samples in
          curl / Python / TypeScript, MCP tool names, and endpoint-specific FAQs. The full
          machine-readable spec is at{' '}
          <Link href="/openapi.json" className="text-accent-primary hover:underline font-mono text-sm">
            /openapi.json
          </Link>
          .
        </p>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
          <div className="text-text-secondary text-sm">
            <p className="text-text-primary font-semibold mb-1">Two ways to consume the API</p>
            <p>
              Free endpoints return open AI ecosystem data and require no auth. Premium endpoints
              are pay-per-call in USDC on Base, gated by a bearer token from{' '}
              <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
                /developers/agent-payments
              </Link>
              . MCP tools wrap both tiers for Claude Desktop / Code consumption (see{' '}
              <Link href="/glossary/mcp" className="text-accent-primary hover:underline">/glossary/mcp</Link>
              ).
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.filter(cat => grouped[cat] && grouped[cat].length > 0).map(cat => (
          <section key={cat}>
            <h2 className="text-text-primary font-semibold text-lg mb-3 flex items-center gap-2">
              <span
                className="font-mono uppercase text-xs text-text-muted px-2 py-0.5 border border-border rounded"
                style={{ letterSpacing: '0.08em' }}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[cat].map(e => (
                <Link
                  key={e.slug}
                  href={`/api-reference/${e.slug}`}
                  className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-text-primary font-semibold text-sm">{e.name}</h3>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background:
                          e.tier === 'premium' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                        color: e.tier === 'premium' ? 'var(--accent-primary)' : '#10b981',
                      }}
                    >
                      {e.cost}
                    </span>
                  </div>
                  <code className="font-mono text-xs text-text-muted block mb-2 break-all">
                    {e.method} {e.path}
                  </code>
                  <p className="text-text-secondary text-xs line-clamp-2">{e.seoDescription}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-border text-text-muted text-sm">
        Looking for the agent-first overview instead? See{' '}
        <Link href="/for-ai-agents" className="text-accent-primary hover:underline">/for-ai-agents</Link>
        . For the full payment flow with code examples, see{' '}
        <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">/developers/agent-payments</Link>
        . For use-case-specific integration paths, see{' '}
        <Link href="/use-cases" className="text-accent-primary hover:underline">/use-cases</Link>.
      </div>
    </div>
  );
}
