import { Metadata } from 'next';
import { Package } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import PackageTrendingWidget from '@/components/packages/PackageTrendingWidget';

export const metadata: Metadata = {
  title: 'AI/ML Package Trending: npm + PyPI | TensorFeed Packages',
  description:
    'Which AI/ML libraries are agents reaching for. Curated trending across the npm and PyPI ecosystems, ranked by recent downloads. Free JSON API for both.',
  alternates: { canonical: 'https://tensorfeed.ai/packages' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/packages',
    title: 'TensorFeed Packages: AI/ML Trending',
    description:
      'npm and PyPI AI/ML libraries ranked by downloads. LLM SDKs, agent frameworks, RAG, inference, evals, MCP, observability.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Packages',
    description: 'AI/ML library trending across npm + PyPI. Free JSON API.',
  },
};

const FAQS = [
  {
    question: 'Where do the download counts come from?',
    answer:
      'npm: api.npmjs.org/downloads, the documented public download stats endpoint, used commercially everywhere from npmtrends to libraries.io. PyPI: pypistats.org JSON API, which serves aggregates derived from the public PyPI BigQuery dataset published by the Linehaul project (Python Software Foundation). Both are clean upstream sources free to redistribute.',
  },
  {
    question: 'How were the package lists chosen?',
    answer:
      "Editorial. We curated ~37 npm packages and ~41 PyPI packages each grouped into seven or eight categories (LLM SDKs, agent frameworks, RAG, inference, MCP, evals, tooling, plus observability for Python). The lists prioritize libraries developers actually reach for when building agents, not raw popularity. They're hand-edited; bumps land on redeploy.",
  },
  {
    question: 'How often are downloads refreshed?',
    answer:
      'Daily. npm at 03:30 UTC, PyPI at 03:45 UTC. The npm endpoint reports last-week downloads; PyPI reports last-day, last-week, and last-month. The page uses the largest available window to make rankings less noisy.',
  },
  {
    question: 'Can I use this commercially?',
    answer:
      'Yes. Download counts are facts derived from public infrastructure (npm registry stats and the PyPI BigQuery public dataset), redistributed under the same fair-use posture they have always had. The TensorFeed snapshot is curated and ranked, with structured attribution back to the upstream source on every response.',
  },
];

const NPM_CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'llm-sdk', label: 'LLM SDKs' },
  { id: 'agent-framework', label: 'Agent frameworks' },
  { id: 'rag', label: 'RAG' },
  { id: 'inference', label: 'Inference' },
  { id: 'mcp', label: 'MCP' },
  { id: 'evals', label: 'Evals' },
  { id: 'tooling', label: 'Tooling' },
];

const PYPI_CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'llm-sdk', label: 'LLM SDKs' },
  { id: 'agent-framework', label: 'Agent frameworks' },
  { id: 'rag', label: 'RAG' },
  { id: 'inference', label: 'Inference' },
  { id: 'mcp', label: 'MCP' },
  { id: 'evals', label: 'Evals' },
  { id: 'observability', label: 'Observability' },
  { id: 'tooling', label: 'Tooling' },
];

export default function PackagesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI/ML Package Trending"
        description="Curated AI/ML library trending across npm and PyPI ecosystems, ranked by recent downloads."
        url="https://tensorfeed.ai/packages"
        jsonUrl="/api/packages/npm/ai-trending"
        keywords={[
          'ai package trending',
          'npm ai libraries',
          'pypi ai libraries',
          'llm sdk downloads',
          'agent framework adoption',
          'rag inference mcp',
          'package download rankings',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Package className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI/ML Packages</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Which libraries are agents and developers actually reaching for. Curated trending
          across npm and PyPI.
        </p>
        <MachineReadableLink endpoint="/api/packages/npm/ai-trending" className="mt-2" />
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            Two free upstream sources give us the package ecosystem signal cleanly: npm&apos;s
            documented public downloads endpoint and pypistats.org&apos;s JSON API (which serves the
            public PyPI BigQuery dataset). Combined with editorial curation of ~78 AI-relevant
            packages, this is the &ldquo;what is the agent stack actually using&rdquo; view.
          </p>
          <p>
            Categories cover the canonical agent toolchain: LLM SDKs (Anthropic, OpenAI, Google,
            Mistral, Cohere, Groq, Together), agent frameworks (LangChain, LangGraph, LlamaIndex,
            CrewAI, Mastra, Vercel AI, AutoGen, smolagents), RAG (Pinecone, Chroma, Qdrant, Weaviate),
            inference (Transformers, vLLM, Ollama), MCP, evals, and observability.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">npm</h2>
          <span className="text-xs text-text-tertiary font-mono">refreshed 03:30 UTC</span>
        </div>
        <PackageTrendingWidget
          endpoint="/api/packages/npm/ai-trending"
          ecosystem="npm"
          categories={NPM_CATEGORIES}
          emptyMessage="npm trending snapshot not yet captured. Daily refresh at 03:30 UTC."
        />
      </section>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">PyPI</h2>
          <span className="text-xs text-text-tertiary font-mono">refreshed 03:45 UTC</span>
        </div>
        <PackageTrendingWidget
          endpoint="/api/packages/pypi/ai-trending"
          ecosystem="pypi"
          categories={PYPI_CATEGORIES}
          emptyMessage="PyPI trending snapshot not yet captured. Daily refresh at 03:45 UTC."
        />
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/packages/npm/ai-trending</code>
            <span className="text-text-secondary ml-2 block mt-1">
              npm AI/ML packages with weekly downloads. Filter:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?category=&limit=</code>.
            </span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/packages/pypi/ai-trending</code>
            <span className="text-text-secondary ml-2 block mt-1">
              PyPI AI/ML packages with daily/weekly/monthly downloads. Filter:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?category=&limit=</code>.
            </span>
          </li>
        </ul>
      </div>

      <div className="border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map(faq => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
