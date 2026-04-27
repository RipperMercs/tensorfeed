import { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Code, Microscope, DollarSign, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Agent Use Cases: Coding, Research, Cost Monitoring, Payments',
  description:
    'How to use TensorFeed.ai with your AI agent. Coding agents, research agents, API cost monitoring, agent payments integration. Specific endpoints, code examples, and integration paths for each use case.',
  alternates: { canonical: 'https://tensorfeed.ai/use-cases' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/use-cases',
    title: 'AI Agent Use Cases on TensorFeed',
    description: 'Coding agents, research agents, cost monitoring, agent payments. Specific TensorFeed endpoints per use case.',
    siteName: 'TensorFeed.ai',
  },
};

const USE_CASES = [
  {
    slug: 'coding-agents',
    title: 'Coding agents',
    blurb: 'Pick the right model for code work, stay current on SWE-bench leaders, watch for price drops and new model launches.',
    icon: Code,
  },
  {
    slug: 'research-agents',
    title: 'Research agents',
    blurb: 'Search a deep AI news corpus, dive into a single provider, get morning briefs on what changed in the field overnight.',
    icon: Microscope,
  },
  {
    slug: 'api-cost-monitoring',
    title: 'API cost monitoring',
    blurb: 'Project workload cost across models, get notified when a price drops, audit per-token and per-call spend through agent dashboards.',
    icon: DollarSign,
  },
  {
    slug: 'agent-payments',
    title: 'Agent payments integration',
    blurb: 'Make your AI agent pay TensorFeed (or your own API) per call in USDC on Base. End-to-end SDK paths and the validate-and-charge contract.',
    icon: Wallet,
  },
];

export default function UseCasesIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Compass className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Use cases</h1>
        </div>
        <p className="text-text-secondary text-lg">
          What an AI agent (or its builder) actually does with TensorFeed. Each page maps a
          common job-to-be-done to the specific endpoints, MCP tools, and SDK methods that get
          you there fastest.
        </p>
      </div>

      <div className="space-y-4">
        {USE_CASES.map(uc => {
          const Icon = uc.icon;
          return (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="block bg-bg-secondary border border-border rounded-xl p-5 hover:border-accent-primary transition"
            >
              <div className="flex items-start gap-3 mb-2">
                <Icon className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
                <h2 className="text-text-primary font-semibold text-lg">{uc.title}</h2>
              </div>
              <p className="text-text-secondary text-sm pl-8">{uc.blurb}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 text-text-muted text-sm">
        Looking for the discovery surfaces and integration paths instead? See{' '}
        <Link href="/for-ai-agents" className="text-accent-primary hover:underline">/for-ai-agents</Link>{' '}
        for the full agent-first overview, or{' '}
        <Link href="/glossary" className="text-accent-primary hover:underline">/glossary</Link>{' '}
        for definitions of x402, MCP, and agent payments.
      </div>
    </div>
  );
}
