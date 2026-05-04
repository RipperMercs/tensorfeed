import { Metadata } from 'next';
import Link from 'next/link';
import { Database, ExternalLink, Code, Calendar, FileJson, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TensorFeed Datasets: AI Ecosystem Daily on Hugging Face',
  description:
    'Public daily-snapshot dataset of the AI ecosystem: news, model pricing, GPU rental prices, MCP registry, benchmarks, leaderboards, training run costs, agent infrastructure, and more. 36 JSONL feeds per day, inference-only license. Mirror of the live TensorFeed.ai API.',
  alternates: { canonical: 'https://tensorfeed.ai/datasets' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/datasets',
    title: 'TensorFeed Datasets: AI Ecosystem Daily on Hugging Face',
    description:
      'Daily JSONL snapshots of the AI ecosystem on Hugging Face. 36 feeds, inference-only license, mirror of the live TensorFeed API.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed AI Ecosystem Daily',
    description:
      'Daily JSONL snapshots of the AI ecosystem on Hugging Face. 36 feeds, inference-only license.',
  },
  keywords: [
    'AI dataset',
    'AI ecosystem dataset',
    'Hugging Face AI dataset',
    'model pricing dataset',
    'GPU pricing dataset',
    'AI news dataset',
    'MCP registry dataset',
    'LLM benchmark dataset',
    'AI training corpus',
    'inference-only dataset',
    'AFTA dataset',
    'tensorfeed dataset',
  ],
};

const DATASET_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'TensorFeed AI Ecosystem Daily',
  alternateName: 'tensorfeed/ai-ecosystem-daily',
  description:
    'Daily snapshots of the AI ecosystem: news, model pricing, service status, GPU rental prices, MCP registry telemetry, LLM endpoint latency probes, agent directory, benchmark scores, leaderboard pointers, training-run cost estimates, AI hardware specs, open-weights deployment specs, inference providers, fine-tuning providers, marketplaces, specialized models, embeddings, multimodal, vector DBs, frameworks, conferences, funding rounds, model cards, AI policy, compute providers, usage rankings, agent infrastructure providers, and the AFTA adopter directory. JSONL per feed, one commit per day at 08:00 UTC, inference-only license consistent with the AFTA standard.',
  url: 'https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily',
  sameAs: [
    'https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily',
    'https://github.com/RipperMercs/tensorfeed',
  ],
  identifier: 'tensorfeed/ai-ecosystem-daily',
  creator: {
    '@type': 'Organization',
    name: 'TensorFeed.ai',
    url: 'https://tensorfeed.ai',
    sameAs: 'https://huggingface.co/tensorfeed',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Pizza Robot Studios LLC',
    url: 'https://tensorfeed.ai',
  },
  license: 'https://tensorfeed.ai/agent-fair-trade',
  isAccessibleForFree: true,
  inLanguage: 'en',
  datePublished: '2026-05-04',
  dateModified: new Date().toISOString().slice(0, 10),
  encodingFormat: 'application/x-jsonlines',
  keywords: [
    'AI',
    'LLM',
    'machine learning',
    'model pricing',
    'GPU pricing',
    'benchmarks',
    'MCP',
    'agents',
    'AFTA',
    'time series',
    'inference-only',
  ],
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/x-jsonlines',
      contentUrl: 'https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily',
      name: 'JSONL on Hugging Face Hub',
    },
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://tensorfeed.ai/openapi.json',
      name: 'Live API: OpenAPI 3.1 spec',
    },
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/yaml',
      contentUrl: 'https://tensorfeed.ai/openapi.yaml',
      name: 'Live API: OpenAPI 3.1 spec (YAML)',
    },
  ],
  temporalCoverage: '2026-05-04/..',
  variableMeasured: [
    'AI news article',
    'AI model pricing per 1M tokens',
    'AI service operational status',
    'GPU rental price',
    'MCP server registry size',
    'LLM endpoint latency (TTFB, total)',
    'Benchmark score',
    'AI agent directory',
    'Training run cost (USD millions)',
    'AI hardware spec (FLOPS, VRAM, TDP)',
    'Open-weights model deployment spec',
    'Inference provider pricing',
    'Fine-tuning provider pricing',
    'AI marketplace size',
    'Specialized model coverage',
    'Embedding model spec',
    'Multimodal model spec',
    'Vector database spec',
    'Agent framework spec',
    'AI conference dates',
    'AI funding round',
    'Model card document',
    'AI policy / regulation',
    'Compute provider spec',
    'Model usage ranking',
    'Agent infrastructure provider spec',
    'AFTA adopter manifest',
  ],
};

const FEEDS = [
  { name: 'news', records: 'up to 200', desc: 'AI news articles, snippets clipped, prompt-injection sanitized' },
  { name: 'models', records: '~230', desc: 'Model pricing and specs, flattened with provider on each row' },
  { name: 'pricing', records: '1', desc: 'Compact pricing payload for agents' },
  { name: 'status', records: '~12', desc: 'Real-time operational status of major AI services' },
  { name: 'benchmarks', records: '~5', desc: 'Public benchmark scores per model' },
  { name: 'agents-directory', records: '~18', desc: 'Curated AI agent directory' },
  { name: 'agents-activity', records: 'varies', desc: 'Live AI bot traffic on TensorFeed' },
  { name: 'podcasts', records: '~50', desc: 'Recent AI podcast episodes' },
  { name: 'trending-repos', records: '~20', desc: 'Trending GitHub repos in AI/ML' },
  { name: 'mcp-registry', records: '1', desc: 'Daily count and 1-day delta of the official MCP registry' },
  { name: 'probe', records: '1', desc: 'Last 24h of LLM endpoint latency probes' },
  { name: 'gpu-pricing', records: '1', desc: 'GPU rental price snapshot across cloud marketplaces' },
  { name: 'afta-adopters', records: 'varies', desc: 'Sites publishing an AFTA manifest' },
  { name: 'ai-hardware', records: '~17', desc: 'AI accelerator specs (NVIDIA, AMD, TPU, Trainium, etc)' },
  { name: 'open-weights', records: '~9', desc: 'Open-weights models with quantization + VRAM requirements' },
  { name: 'inference-providers', records: '~8', desc: 'Hosted inference for open-weights' },
  { name: 'training-runs', records: '~11', desc: 'Disclosed and estimated training cost catalog' },
  { name: 'marketplaces', records: '~12', desc: 'AI marketplace catalog' },
  { name: 'specialized-models', records: '~19', desc: 'Domain-specialized models' },
  { name: 'fine-tuning', records: '~12', desc: 'Fine-tuning providers (first-party and hosted)' },
  { name: 'oss-tools', records: '~25', desc: 'Production OSS tools agents install' },
  { name: 'agent-apis', records: '~29', desc: 'Non-LLM APIs in the agent stack' },
  { name: 'voice-leaderboards', records: '1', desc: 'TTS Arena Elo + Open ASR Leaderboard WER' },
  { name: 'embeddings', records: '~18', desc: 'Embedding and reranker model catalog' },
  { name: 'multimodal', records: '~24', desc: 'Image, video, TTS, STT model catalog' },
  { name: 'vector-dbs', records: '~12', desc: 'Vector database catalog' },
  { name: 'frameworks', records: '~15', desc: 'Agent framework catalog' },
  { name: 'benchmark-registry', records: '~24', desc: 'Benchmark catalog with active/saturated status' },
  { name: 'public-leaderboards', records: '~20', desc: 'Pointers to every live public AI leaderboard' },
  { name: 'conferences', records: '~18', desc: 'AI conferences with dates' },
  { name: 'funding', records: '~21', desc: 'AI funding rounds catalog' },
  { name: 'model-cards', records: '~8', desc: 'Per-model system / safety / red-team docs' },
  { name: 'ai-policy', records: '~10', desc: 'AI regulation tracker' },
  { name: 'compute-providers', records: '~17', desc: 'GPU cloud, hyperscaler, AI-serverless catalog' },
  { name: 'usage-rankings', records: '~20', desc: 'Model usage rankings' },
  { name: 'agent-provisioning', records: '~18', desc: 'Agent infrastructure providers' },
];

export default function DatasetsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATASET_JSONLD) }}
      />

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Database className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Datasets
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Public daily-snapshot mirrors of the TensorFeed API on Hugging Face. Each snapshot is a
          point-in-time JSONL artifact suitable for RAG, evaluation, agent context, and
          time-series analysis. Inference-only license consistent with the AFTA standard.
        </p>
      </div>

      {/* Featured dataset */}
      <section className="mb-12">
        <a
          href="https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-accent-cyan/10 border border-accent-primary/30 rounded-xl p-6 hover:border-accent-primary transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent-primary/20 shrink-0">
              <FileJson className="w-7 h-7 text-accent-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-2xl font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  tensorfeed / ai-ecosystem-daily
                </h2>
                <ExternalLink className="w-4 h-4 text-accent-primary opacity-70" />
              </div>
              <p className="text-text-secondary text-base mb-4">
                Daily JSONL snapshots of the entire public TensorFeed API, committed at 08:00 UTC
                via GitHub Actions. {FEEDS.length} feeds per day, ~900 records per snapshot.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Cadence</div>
                  <div className="text-text-primary font-mono">Daily 08:00 UTC</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Format</div>
                  <div className="text-text-primary font-mono">JSONL per feed</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wider mb-1">License</div>
                  <div className="text-text-primary font-mono">Inference-only</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Cost</div>
                  <div className="text-text-primary font-mono">Free</div>
                </div>
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Quick start */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Quick start</h2>
        </div>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`from datasets import load_dataset

# Load any single feed
news = load_dataset("tensorfeed/ai-ecosystem-daily", "news", split="train")
models = load_dataset("tensorfeed/ai-ecosystem-daily", "models", split="train")
gpu = load_dataset("tensorfeed/ai-ecosystem-daily", "gpu-pricing", split="train")

# Filter by date (filename pattern is YYYY-MM-DD/)
recent = news.filter(lambda x: x["fetchedAt"] >= "2026-05-01")`}</code></pre>
      </section>

      {/* Feed catalog */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          {FEEDS.length} feeds per daily snapshot
        </h2>
        <p className="text-text-secondary mb-6">
          Each feed is a JSONL file under <code className="font-mono text-accent-primary text-sm">YYYY-MM-DD/</code>.
          Configs are loadable individually via <code className="font-mono text-accent-primary text-sm">load_dataset(repo, &quot;feedname&quot;)</code>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEEDS.map((feed) => (
            <div
              key={feed.name}
              className="bg-bg-secondary border border-border rounded-lg p-3 flex items-start gap-3"
            >
              <div className="font-mono text-sm text-accent-primary font-semibold shrink-0 min-w-[160px]">
                {feed.name}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-muted mb-0.5">{feed.records} rec</div>
                <div className="text-sm text-text-secondary">{feed.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* License */}
      <section className="mb-12 bg-bg-secondary border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-accent-amber" />
          <h2 className="text-xl font-semibold text-text-primary">Inference-only license</h2>
        </div>
        <p className="text-text-secondary mb-3">
          The dataset is released under TensorFeed&apos;s inference-only license. You may use it
          as input context for AI agents and LLM inference: RAG, evaluation, prompt context,
          agent toolchains. You may not use it as training data for foundation models without
          explicit written permission.
        </p>
        <p className="text-text-secondary">
          The license is part of the{' '}
          <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">
            Agent Fair-Trade Agreement
          </Link>
          : the same standard that governs paid API access on tensorfeed.ai. Compliant agents get
          a perpetual usage right; non-compliant training pipelines do not.
        </p>
      </section>

      {/* Live API alternative */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">If daily is too slow</h2>
        </div>
        <p className="text-text-secondary mb-4">
          The dataset is a daily mirror. The live API is updated continuously: news every 10
          minutes, status every 5 minutes, models and benchmarks daily, GPU pricing every 4
          hours.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/developers"
            className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <div className="font-semibold text-text-primary mb-1">Developer docs</div>
            <p className="text-sm text-text-secondary">Free, no-auth API. CORS enabled.</p>
          </Link>
          <a
            href="/openapi.yaml"
            className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <div className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
              OpenAPI 3.1 spec
              <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <p className="text-sm text-text-secondary">Drop into Swagger UI, Postman, or any code generator.</p>
          </a>
          <Link
            href="/for-ai-agents"
            className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <div className="font-semibold text-text-primary mb-1">For AI Agents</div>
            <p className="text-sm text-text-secondary">MCP server, x402, SDKs, glossary.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
