import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Microscope } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI for Research Agents: Search News, Track Providers, Daily Briefs',
  description:
    'How a research agent uses TensorFeed: full-text news search, provider deep-dive in one paid call, daily morning brief on what changed in AI overnight, MCP integration with Claude Desktop.',
  alternates: { canonical: 'https://tensorfeed.ai/use-cases/research-agents' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/use-cases/research-agents',
    title: 'AI for Research Agents on TensorFeed',
    description: 'Full-text news search, provider deep-dive, agent morning brief. Specific endpoints for research workloads.',
    siteName: 'TensorFeed.ai',
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does an AI research agent stay current on the AI industry?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Two paths. The free /api/news endpoint gives the latest articles aggregated from 15+ sources. The paid /api/premium/news/search endpoint adds full-text search with relevance scoring and date/provider filters, useful for "what did Anthropic publish in March" queries. Most research agents use both: a daily call to /api/premium/whats-new for the morning brief, then targeted /api/premium/news/search calls when synthesizing on a specific topic.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I get a one-call profile of an AI provider?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. /api/premium/providers/{name} returns a single response with the provider\'s live status, all their models with pricing + tier + benchmark scores joined, recent news mentions, and agent traffic. One paid call (1 credit) replaces 4-5 free endpoint calls plus the join you would have written client-side.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I do full-text search over the AI news corpus?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Call /api/premium/news/search with a query, optional date range, optional provider filter, and optional category filter. Relevance scoring weights term matches in the title (3x) over snippet (1x) and adds a recency boost. Stop words are stripped. The endpoint returns up to 100 ranked results with title, url, source, snippet, published_at, relevance, and matched_terms. 1 credit per call.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the agent morning brief?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '/api/premium/whats-new is a single endpoint that returns a curated 1-7 day window across pricing changes, new and removed models, status incidents, and top news headlines. Designed for the case where an agent boots up and wants to know "what changed since I last ran" in one paid call (1 credit) instead of stitching news + status + history-compare client-side.',
      },
    },
  ],
};

export default function ResearchAgentsUseCasePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Link
        href="/use-cases"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All use cases
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Microscope className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Research agents</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Search a deep AI news corpus, get a full provider profile in one call, fire a morning
          brief at boot. The endpoints a research agent calls when it needs to know what changed
          in AI overnight.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">The shape of a research agent&apos;s day</h2>
        <p>
          Most research agents have a similar loop: wake up on a schedule, figure out what is
          new since last run, dive deep on one or two topics, write a synthesis. TensorFeed
          slots into the &quot;what is new&quot; and &quot;dive deep&quot; steps. Three endpoints
          cover most of the work.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Step 1: Boot up with the morning brief</h2>
        <p>
          One paid call returns a curated 24-hour window:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`from tensorfeed import TensorFeed

tf = TensorFeed(token="tf_live_...")

brief = tf.whats_new(days=1, news_limit=10)
# brief["pricing"]["changes"]   - which models had price changes
# brief["pricing"]["new_models"] - any new models launched in the period
# brief["status"]["incidents"]   - any provider outages
# brief["news"]                  - top 10 headlines, newest first`}</code></pre>
        <p>
          Most days the answer is &quot;nothing dramatic happened.&quot; The brief surfaces that
          cleanly so the agent can skip ahead. On busy days, it is the difference between a
          one-line decision and a fifteen-call reconciliation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Step 2: Dive on a specific topic</h2>
        <p>
          Two patterns for &quot;dig deeper&quot; research:
        </p>

        <p>
          <strong className="text-text-primary">By topic / keyword:</strong>
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`# What did Anthropic publish in March?
results = tf.news_search(
    q="Anthropic Claude",
    from_date="2026-03-01",
    to_date="2026-03-31",
    provider="anthropic",
    limit=25,
)
for r in results["results"]:
    print(f"{r['published_at']}: {r['title']}")`}</code></pre>

        <p>
          <strong className="text-text-primary">By provider (one-call deep-dive):</strong>
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`# Everything about a provider in one paid call
profile = tf.provider_deepdive("anthropic")
# profile["status"]            - live status + components
# profile["models"]            - sorted flagship-first, with benchmark scores joined
# profile["recent_news"]       - top 8 mentions
# profile["agent_traffic_24h"] - hits attributed to Anthropic bots`}</code></pre>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Step 3: Compare across providers</h2>
        <p>
          When the synthesis needs a side-by-side, use the comparison endpoint:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`compare = tf.compare_models(ids=[
    "Claude Opus 4.7",
    "GPT-5.5",
    "Gemini 2.5 Pro",
    "DeepSeek V4 Pro",
])
# compare["models"]                          - per-model rows with normalized benchmarks
# compare["rankings"]["cheapest_blended"]    - sorted by blended price
# compare["rankings"]["by_benchmark"]        - per-benchmark leaderboards`}</code></pre>
        <p>
          Benchmarks are normalized to a union-of-keys with <code className="text-accent-primary font-mono">null</code>{' '}
          for missing scores so the agent&apos;s downstream code never crashes on undefined.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Step 4: Write the synthesis</h2>
        <p>
          That part is your agent&apos;s job. TensorFeed gives you the inputs, you decide what
          to do with them. If the agent runs inside Claude Desktop, the same MCP tools are
          available natively:&nbsp;
          <em>&quot;Get the morning brief, then deep-dive on Anthropic, then write a 200-word
          summary suitable for a daily Slack channel.&quot;</em>
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Free vs paid</h2>
        <p>
          Research agents that want to keep credit usage low can do most of the work on the
          free tier:
        </p>
        <ul className="space-y-1 list-disc list-inside ml-4">
          <li>Free: <Link href="/developers" className="text-accent-primary hover:underline">/api/news</Link>, <Link href="/developers" className="text-accent-primary hover:underline">/api/status</Link>, <Link href="/developers" className="text-accent-primary hover:underline">/api/models</Link>, <Link href="/developers" className="text-accent-primary hover:underline">/api/benchmarks</Link></li>
          <li>Paid: search, deep-dive, compare, whats-new (each 1 credit ~$0.02)</li>
        </ul>
        <p>
          A research agent running once-daily can do its work for under a penny per session
          using the paid tier; running on free is a full minute of fan-out calls. Pick based on
          how much your agent cares about latency.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Recommended TensorFeed endpoints (in priority order)</h2>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/whats-new</code></Link> — boot-time morning brief</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/news/search</code></Link> — full-text search with date/provider filters</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/providers/&#123;name&#125;</code></Link> — one-call provider deep-dive</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/compare/models</code></Link> — side-by-side comparison with normalized benchmarks</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/watches</code></Link> with <code className="font-mono text-sm">type:&quot;digest&quot;</code> — set-and-forget weekly summaries</li>
        </ul>

        <div className="bg-bg-secondary border border-border rounded-xl p-5 mt-8">
          <h3 className="text-text-primary font-semibold mb-2">Other use cases</h3>
          <ul className="space-y-1 text-text-secondary text-sm list-disc list-inside">
            <li><Link href="/use-cases/coding-agents" className="text-accent-primary hover:underline">Coding agents</Link></li>
            <li><Link href="/use-cases/api-cost-monitoring" className="text-accent-primary hover:underline">API cost monitoring</Link></li>
            <li><Link href="/use-cases/agent-payments" className="text-accent-primary hover:underline">Agent payments integration</Link></li>
          </ul>
        </div>
      </div>
    </article>
  );
}
