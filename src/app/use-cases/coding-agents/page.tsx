import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI for Coding Agents: Pick a Model, Track SWE-bench, Catch Drops',
  description:
    'How a coding agent uses TensorFeed: routing recommendations sized to a code budget, live SWE-bench leaderboard, webhook watches for new model launches and price drops, MCP tools for Claude Code.',
  alternates: { canonical: 'https://tensorfeed.ai/use-cases/coding-agents' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/use-cases/coding-agents',
    title: 'AI for Coding Agents: Pick a Model, Track SWE-bench, Catch Drops',
    description: 'Pick the right model for code work, stay current on SWE-bench, catch price drops. TensorFeed endpoints and MCP tools that fit a coding agent.',
    siteName: 'TensorFeed.ai',
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I pick the right AI model for a coding agent?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Use TensorFeed\'s premium routing endpoint with task=code and your budget. The endpoint synthesizes live SWE-bench scores, HumanEval scores, current pricing, and provider status into a ranked list. As of mid-2026, Claude Opus 4.7 leads SWE-bench at ~73-75%, GPT-5.5 follows in the 68-70% range, and DeepSeek V4 Pro matches mid-pack performance at roughly an order of magnitude lower price. The right pick depends entirely on your budget and latency constraints.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which AI model is best on SWE-bench?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The live SWE-bench leaderboard is at https://tensorfeed.ai/benchmarks/swe_bench. As of April 2026, Claude Opus 4.7 leads on SWE-bench Verified, with GPT-5.5 close behind. The leaderboard is a snapshot; for a coding agent that needs to stay current, register a webhook watch on benchmark score changes or call the premium history series endpoint to track movement over time.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I get notified when a coding model price drops?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Register a price watch via POST /api/premium/watches with type:"price", model:"Claude Opus 4.7", field:"blended", op:"lt", threshold:30. The watch lives 90 days and fires HMAC-signed POSTs to your callback URL whenever the blended price crosses the threshold. Costs 1 credit at registration; fires are free up to a per-watch cap.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can my coding agent in Claude Code or Claude Desktop use TensorFeed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The @tensorfeed/mcp-server npm package exposes 20 tools including routing recommendations, SWE-bench history, news search, and webhook watches. Add `npx -y @tensorfeed/mcp-server` to your MCP config. Free tools work without auth; premium tools require a TENSORFEED_TOKEN env var pointing to a tf_live_ bearer token.',
      },
    },
  ],
};

export default function CodingAgentsUseCasePage() {
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
          <Code className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Coding agents</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Pick the right model for code work, stay current on SWE-bench leaders, catch price
          drops, and integrate everything in Claude Code or Claude Desktop. Specific TensorFeed
          endpoints for the jobs a coding agent actually does.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">The four jobs of a coding agent</h2>
        <p>
          When a coding agent boots up to handle a task, it does some subset of these four things:
          pick a model, fetch project context, generate code, verify the output. TensorFeed sits
          in the &quot;pick a model&quot; step. The other three are your application logic.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 1: Pick the right model for the task</h2>
        <p>
          Use the premium routing endpoint with task=code:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`from tensorfeed import TensorFeed

tf = TensorFeed(token="tf_live_...")

# Pick the best model for a code task under $5/1M tokens
rec = tf.routing(task="code", budget=5.0, top_n=3)
for r in rec["recommendations"]:
    print(f"#{r['rank']}: {r['model']['name']} (score: {r['composite_score']:.2f})")
    print(f"  Quality {r['components']['quality']:.2f}, Cost {r['components']['cost']:.2f}")`}</code></pre>
        <p>
          The composite score weights quality (SWE-bench + HumanEval scores from live
          benchmarks), availability (current provider status), cost (normalized blended
          $/1M across the candidate set), and latency. Tweak the weights via{' '}
          <code className="text-accent-primary font-mono">w_quality=</code>,
          {' '}<code className="text-accent-primary font-mono">w_cost=</code>, etc. for your
          specific tradeoff. Costs 1 credit per call.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 2: Stay current on the SWE-bench leaderboard</h2>
        <p>
          New frontier models ship every 2-4 weeks now. The model that was the SWE-bench leader
          last month may not be this month. Two paths to stay current:
        </p>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li>
            Free:{' '}
            <Link href="/benchmarks/swe_bench" className="text-accent-primary hover:underline">
              /benchmarks/swe_bench
            </Link>{' '}
            for the public leaderboard, refreshed weekly.
          </li>
          <li>
            Paid:{' '}
            <code className="text-accent-primary font-mono">tf.benchmark_series(model=&quot;Claude Opus 4.7&quot;, benchmark=&quot;swe_bench&quot;, lookback=90)</code>{' '}
            for the daily score evolution over the last 90 days. 1 credit per call.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 3: Catch price drops as they happen</h2>
        <p>
          Coding workloads burn through tokens fast and pricing matters. Register a price watch
          on the model you currently use:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`tf.create_watch(
    spec={
        "type": "price",
        "model": "Claude Opus 4.7",
        "field": "blended",
        "op": "lt",
        "threshold": 30,  # cents per blended 1M tokens
    },
    callback_url="https://your-agent.example.com/webhooks/price",
    secret="any-shared-secret",
)`}</code></pre>
        <p>
          Or use a digest watch for a daily/weekly summary of pricing changes regardless of
          whether anything dramatic happened:{' '}
          <code className="text-accent-primary font-mono">tf.create_digest_watch(cadence=&quot;daily&quot;, callback_url=...)</code>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 4: Cost projection for a workload</h2>
        <p>
          Before committing to a model, project the cost across a few options:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`tf.cost_projection(
    models=["Claude Opus 4.7", "GPT-5.5", "DeepSeek V4 Pro"],
    input_tokens_per_day=2_000_000,   # ~2M input/day for a busy coding agent
    output_tokens_per_day=500_000,
)`}</code></pre>
        <p>
          Returns daily / weekly / monthly / yearly projections per model with a
          cheapest-monthly ranking. Useful for picking a budget tier or for monthly board
          slides.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 5 (optional): Run inside Claude Code</h2>
        <p>
          If your coding agent runs inside Claude Code, you can call all of the above through
          the MCP server directly. Add this to your Claude Code config:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"],
      "env": { "TENSORFEED_TOKEN": "tf_live_..." }
    }
  }
}`}</code></pre>
        <p>
          Then in a Claude Code session, ask:&nbsp;
          <em>&quot;Recommend the best AI model for code under $5 per million tokens, then project the
          monthly cost at 2M input tokens per day.&quot;</em>{' '}
          The MCP tools fire under the hood; you get the answer in chat.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Recommended TensorFeed endpoints (in priority order)</h2>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/routing</code></Link> — top-N model picker, pass <code>task=code</code></li>
          <li><Link href="/benchmarks/swe_bench" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/benchmarks/swe_bench</code></Link> — public leaderboard, free</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/history/benchmarks/series</code></Link> — daily SWE-bench score evolution per model</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/watches</code></Link> — price-drop and benchmark-change webhooks</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/cost/projection</code></Link> — workload cost across models</li>
        </ul>

        <div className="bg-bg-secondary border border-border rounded-xl p-5 mt-8">
          <h3 className="text-text-primary font-semibold mb-2">Other use cases</h3>
          <ul className="space-y-1 text-text-secondary text-sm list-disc list-inside">
            <li><Link href="/use-cases/research-agents" className="text-accent-primary hover:underline">Research agents</Link></li>
            <li><Link href="/use-cases/api-cost-monitoring" className="text-accent-primary hover:underline">API cost monitoring</Link></li>
            <li><Link href="/use-cases/agent-payments" className="text-accent-primary hover:underline">Agent payments integration</Link></li>
          </ul>
        </div>
      </div>
    </article>
  );
}
