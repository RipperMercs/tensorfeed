import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI API Cost Monitoring: Project, Compare, Watch for Drops',
  description:
    'How to monitor AI API spend across providers. Project workload cost across 1-10 models, get notified when prices drop, audit per-token usage through the credits dashboard. Specific TensorFeed endpoints for FinOps and platform teams.',
  alternates: { canonical: 'https://tensorfeed.ai/use-cases/api-cost-monitoring' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/use-cases/api-cost-monitoring',
    title: 'AI API Cost Monitoring on TensorFeed',
    description: 'Project workload cost, watch for drops, audit usage. The endpoints for FinOps and platform teams.',
    siteName: 'TensorFeed.ai',
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I project AI API cost across multiple models?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Call /api/premium/cost/projection with a comma-separated list of 1-10 model ids and your expected daily input + output token volume. The endpoint returns daily/weekly/monthly/yearly cost per model plus a ranking by cheapest monthly. Pure compute on live pricing, 1 credit per call (~$0.02).',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I get notified when an AI model price drops?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Register a price watch via POST /api/premium/watches with type:"price", model:"...", field:"inputPrice"|"outputPrice"|"blended", op:"lt", and a threshold. Watches fire HMAC-signed POST requests to your callback URL when the price crosses the threshold. 1 credit at registration; fires are free up to a per-watch cap. Watches live 90 days.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I audit my agent\'s API spend?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Call GET /api/payment/usage with the bearer token. Returns the last 100 calls aggregated by endpoint with per-endpoint counts and total credits spent. The /account dashboard renders the same data in a table for human review. Both are free for the owning bearer token.',
      },
    },
  ],
};

export default function ApiCostMonitoringUseCasePage() {
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
          <DollarSign className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">API cost monitoring</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Project workload cost across providers, catch price drops as they happen, audit
          per-call spend. The endpoints FinOps and platform teams use to keep AI API spend
          predictable.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">Three jobs of cost monitoring</h2>
        <p>
          Most cost-monitoring work falls into three buckets: project future cost, react to
          price changes, audit historical spend. TensorFeed has a dedicated endpoint for each.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 1: Project future cost across providers</h2>
        <p>
          Pure math, but agents pay 1 credit for the canonical abstraction so they do not have
          to maintain pricing tables in their own code:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`from tensorfeed import TensorFeed

tf = TensorFeed(token="tf_live_...")

projection = tf.cost_projection(
    models=["Claude Opus 4.7", "GPT-5.5", "DeepSeek V4 Pro"],
    input_tokens_per_day=5_000_000,    # busy production agent fleet
    output_tokens_per_day=1_500_000,
    horizon="monthly",
)

# Cheapest at the top
for r in projection["ranked_cheapest_monthly"]:
    print(f"{r['model']}: \${r['monthly_total']}/mo")`}</code></pre>
        <p>
          Use the same call to validate budget changes: re-run with new token volume estimates
          before signing off on a quarterly budget. Returns daily/weekly/monthly/yearly
          breakdowns so finance teams can plug into their existing reporting cadence.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 2: React to price changes</h2>
        <p>
          The AI pricing market moves fast. New models drop every few weeks; existing models
          get repriced; budget tiers compete on input cost. Three reactive patterns:
        </p>

        <p>
          <strong className="text-text-primary">Realtime price watch:</strong>
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`tf.create_watch(
    spec={
        "type": "price",
        "model": "GPT-5.5",
        "field": "blended",
        "op": "lt",
        "threshold": 20,  # blended $/1M tokens
    },
    callback_url="https://your-finops.example.com/webhooks/price",
    secret="any-shared-secret",
)`}</code></pre>

        <p>
          <strong className="text-text-primary">Daily/weekly digest:</strong>
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`tf.create_digest_watch(
    cadence="weekly",
    callback_url="https://your-finops.example.com/webhooks/weekly",
)
# Fires every 7 days with a curated summary of pricing changes,
# new/removed models, regardless of whether anything dramatic happened.`}</code></pre>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 3: Audit historical spend</h2>
        <p>
          For every TensorFeed bearer token your agents use, the per-token usage history is
          one free call away:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`usage = tf.usage()
# usage["total_calls"]
# usage["total_credits_spent"]
# usage["by_endpoint"]   - per-endpoint count and credits
# usage["recent"]        - last 25 calls with timestamp`}</code></pre>
        <p>
          The same data renders in the human-facing{' '}
          <Link href="/account" className="text-accent-primary hover:underline">/account</Link>{' '}
          dashboard if you prefer a UI. Token-scoped, no audit dance, no extra access requests.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Job 4 (optional): Compare cost-effectiveness</h2>
        <p>
          When picking between two models for a workload, compare them side by side:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`tf.compare_models(ids=[
    "Claude Sonnet 4.6",
    "GPT-4o",
    "DeepSeek V4 Flash",
    "Gemini 2.0 Flash",
])
# Returns rankings.cheapest_blended, plus benchmarks side-by-side`}</code></pre>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">For the daily TensorFeed slack channel</h2>
        <p>
          A common pattern: a digest watch fires every morning to a Slack webhook. The digest
          includes any pricing changes overnight and any new models launched. The Slack channel
          then has a daily message at 7am UTC that takes the team 10 seconds to read. No human
          has to remember to check the pricing page.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Recommended TensorFeed endpoints (in priority order)</h2>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/cost/projection</code></Link> — workload cost across 1-10 models, 4 horizons</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/premium/watches</code></Link> — realtime price-drop notifications</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/payment/usage</code></Link> — per-token audit log (free with bearer token)</li>
          <li><Link href="/account" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/account</code></Link> — human-facing dashboard for the same data</li>
        </ul>

        <div className="bg-bg-secondary border border-border rounded-xl p-5 mt-8">
          <h3 className="text-text-primary font-semibold mb-2">Other use cases</h3>
          <ul className="space-y-1 text-text-secondary text-sm list-disc list-inside">
            <li><Link href="/use-cases/coding-agents" className="text-accent-primary hover:underline">Coding agents</Link></li>
            <li><Link href="/use-cases/research-agents" className="text-accent-primary hover:underline">Research agents</Link></li>
            <li><Link href="/use-cases/agent-payments" className="text-accent-primary hover:underline">Agent payments integration</Link></li>
          </ul>
        </div>
      </div>
    </article>
  );
}
