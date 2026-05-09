import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Layers, Code2, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'The Verified Feed: Cross-Source Story Corroboration for AI Agents | TensorFeed',
  description:
    'Agents acting on a single source is the real failure mode of the autonomous web, not hallucinations. The TensorFeed Verified Feed groups news articles into story-level clusters via embedding-based similarity across 12+ sources and exposes a corroboration_band tag on every cluster. Free tier returns single-day clusters; premium returns the full feed of stories that cleared the trust threshold across N+ independent sources.',
  alternates: { canonical: 'https://tensorfeed.ai/verified-feed' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/verified-feed',
    title: 'The Verified Feed | Cross-Source Story Corroboration',
    description:
      'Story-level news verification across 12+ AI-relevant sources. Embedding-based clustering. "Verified across N independent sources" tag on every cluster. Free preview at 25 clusters/day; premium "stories that cleared the trust threshold" feed at $0.02 USDC per call.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'The Verified Feed: Cross-Source Story Corroboration',
    description:
      'Embedding-based story clustering across 12+ AI sources. Premium "verified across N sources" feed at $0.02 USDC. The trust layer agents need to stop acting on single-source news.',
  },
};

const FAQS = [
  {
    question: 'What is the Verified Feed?',
    answer:
      'A story-level news feed where each entry is a cluster of articles about the same event, grouped via embedding-based similarity across the 12+ AI-relevant sources TensorFeed polls hourly. Each cluster carries a source_count (how many independent sources reported the same story) and a corroboration_band tag (single, limited 2-3, broad 4+). Free tier returns single-day cluster lookups capped at 25 clusters; the premium /api/premium/history/news/verified endpoint returns the unfiltered feed of stories that cleared a trust threshold.',
  },
  {
    question: 'Why does this matter? Hallucinations are the AI safety problem.',
    answer:
      'Hallucinations are bounded. Modern frontier models hallucinate at single-digit rates on well-grounded queries and the rate is improving steadily. The actual production failure mode of the autonomous economy is uglier and underappreciated: agents acting on a single source. When a finance agent reads a fabricated news headline and executes a trade, the model did not hallucinate. The model read the source faithfully. The source was wrong. The agent had no way to know. Verification across multiple independent sources is the fix.',
  },
  {
    question: 'How does the clustering work?',
    answer:
      'Every UTC night at 07:30, the daily cluster cron embeds yesterday\'s news (article title + snippet) via Cloudflare Workers AI on the @cf/baai/bge-base-en-v1.5 model. Articles are clustered by cosine similarity at threshold 0.82 using single-link grouping. URL deduplication misses 90% of cross-source corroboration because Reuters and Bloomberg and Anthropic\'s own blog all have different URLs even when they\'re reporting the same event; embedding-based clustering catches the rephrasing. Threshold 0.82 sits in the empirical sweet spot between false positives (too low; unrelated stories from the same newsroom collide on shared boilerplate) and false negatives (too high; rephrasings get split apart).',
  },
  {
    question: 'What is "verified across N sources"?',
    answer:
      'A boolean filter on the cluster output. Default min_sources=4 returns the corroboration_band="broad" subset: stories that 4+ independent sources reported. Agents asking "do not act on a single source" get a clean stream of stories that cleared the threshold. The endpoint accepts ?min_sources=2 through 50 if you want a different cutoff. This is the trust layer for agents downstream of TensorFeed news.',
  },
  {
    question: 'What is this NOT?',
    answer:
      'It is not a fact-check. We do not validate the underlying claim, only that multiple independent sources reported the same story. When five sources all repeat a press release verbatim, the verified feed will tag the story as broadly corroborated even if the press release itself is misleading. Adding a fact-check layer is a separate product on a different input pipeline. It is also not a real-time signal. Stories that break inside the last hour have not had time for other sources to react. Today\'s model is end-of-UTC-day; the cluster is computed against everything we polled up to the day\'s last hourly RSS run.',
  },
  {
    question: 'Why can TensorFeed ship this when other publishers cannot?',
    answer:
      'The verification product structurally requires the cross-source view at scale. A publisher that aggregates one or two sources cannot generate meaningful corroboration counts; the math demands a wide input distribution. TensorFeed polls 12+ AI-relevant sources hourly and has been doing it long enough to ship the cluster cron without rebuilding the underlying ingest layer. As the AFTA federation grows, cross-publisher verification becomes possible: a future state where multiple federation members publish their own news streams means "verified across N sources" can include cross-publisher consensus, which is a strictly stronger trust signal.',
  },
  {
    question: 'How do I integrate it?',
    answer:
      'Free: GET /api/history/news/clusters?date=YYYY-MM-DD&min_sources=N returns top-25 clusters for one date. Premium ($0.02 USDC per call): GET /api/premium/history/news/verified?date= or ?from=&to=&min_sources=2-50 returns the unfiltered verified feed for one date or a 30-day range. GET /api/premium/history/news/clusters/full returns every cluster (no 25-cap) for ranges. All three are agent-billable via x402 V2 on Base mainnet, AFTA-certified, and return Ed25519-signed receipts.',
  },
];

const SOURCES = [
  'Anthropic Blog',
  'OpenAI Blog',
  'Google AI Blog',
  'Meta AI',
  'HuggingFace',
  'Hacker News (AI-filtered)',
  'TechCrunch AI',
  'The Verge AI',
  'Ars Technica',
  'VentureBeat AI',
  'NVIDIA AI',
  'ZDNet AI',
];

export default function VerifiedFeedPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <FAQPageJsonLd faqs={FAQS} />

      {/* Hero */}
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full border border-border bg-bg-secondary text-xs font-mono text-text-muted">
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
          Phase B live
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
          The Verified Feed
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto mb-6">
          Cross-source story corroboration for AI agents. Embedding-based clustering across 12+
          AI-relevant news sources. Every cluster carries a <code className="font-mono text-accent-primary">corroboration_band</code> tag and an
          explicit <code className="font-mono text-accent-primary">source_count</code>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            href="/api/history/news/clusters"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 transition-colors font-mono text-xs"
          >
            <Code2 className="w-3.5 h-3.5" />
            /api/history/news/clusters
          </Link>
          <Link
            href="/originals/verified-feed-trust-layer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-colors text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Read the launch piece
          </Link>
        </div>
      </header>

      {/* The thesis in one paragraph */}
      <section className="mb-12">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-text-primary text-base leading-relaxed">
            <span className="text-text-muted text-sm">The shape of the problem:</span>{' '}
            most AI-safety discourse in 2026 obsesses over hallucinations. Real failure mode of the autonomous economy is uglier and
            underappreciated: <strong>agents acting on a single source</strong>. When a finance agent reads a fabricated news headline and
            executes a trade, the model did not hallucinate. The model read the source faithfully. The source was wrong. The agent had no
            way to know. Verification across multiple independent sources is the fix, and it requires the cross-source view at scale.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12" id="how">
        <h2 className="text-2xl font-bold text-text-primary mb-6">How it works</h2>
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">1. Hourly multi-source ingestion</h3>
                <p className="text-text-secondary text-sm">
                  TensorFeed polls 12 AI-relevant news sources every hour and persists the deduped article archive plus per-source health
                  counters. Sources currently include: {SOURCES.join(', ')}.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">2. Nightly embedding pass</h3>
                <p className="text-text-secondary text-sm">
                  Every UTC night at 07:30 the cluster cron embeds yesterday&apos;s articles via Cloudflare Workers AI on the{' '}
                  <code className="font-mono text-xs">@cf/baai/bge-base-en-v1.5</code> model. 768-dim float32 vectors per article,
                  batched at 50 per call. Stored under <code className="font-mono text-xs">news:embeddings:&#123;date&#125;</code>{' '}
                  with a 30-day TTL.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">3. Single-link cosine clustering at threshold 0.82</h3>
                <p className="text-text-secondary text-sm">
                  Articles are grouped by cosine similarity at threshold 0.82. URL dedup misses 90% of real-world corroboration; semantic
                  embeddings catch rephrasings across newsrooms. Threshold 0.82 is the empirical sweet spot: tighter splits rephrasings
                  apart, looser collapses unrelated stories that share boilerplate.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">4. Corroboration band tagged on every cluster</h3>
                <p className="text-text-secondary text-sm">
                  Each cluster carries: <code className="font-mono text-xs">source_count</code>,{' '}
                  <code className="font-mono text-xs">sources</code> (list of contributing publishers),{' '}
                  <code className="font-mono text-xs">article_ids</code>, hero article (earliest publishedAt), and a{' '}
                  <code className="font-mono text-xs">corroboration_band</code> tag: <code className="font-mono text-xs">single</code>{' '}
                  (1 source), <code className="font-mono text-xs">limited</code> (2-3), <code className="font-mono text-xs">broad</code> (4+).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mb-12" id="endpoints">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Endpoints</h2>

        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <code className="text-accent-primary font-mono text-sm">GET /api/history/news/clusters</code>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
                free
              </span>
            </div>
            <p className="text-text-secondary text-sm mb-2">
              Story clusters for a single UTC date. Top 25 clusters returned with optional{' '}
              <code className="font-mono text-xs">?min_sources=</code> filter.
            </p>
            <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl 'https://tensorfeed.ai/api/history/news/clusters?date=2026-05-09&min_sources=2'`}
            </pre>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <code className="text-accent-primary font-mono text-sm">GET /api/premium/history/news/verified</code>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/30">
                $0.02 USDC
              </span>
            </div>
            <p className="text-text-secondary text-sm mb-2">
              The verified feed. Filtered to clusters with N+ independent sources (default min_sources=4). Single-date or 30-day range.
              Agents asking &quot;do not act on a single source&quot; get a clean stream of stories that cleared the threshold.
            </p>
            <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl -H 'Authorization: Bearer tf_live_...' \\
  'https://tensorfeed.ai/api/premium/history/news/verified?date=2026-05-09&min_sources=4'`}
            </pre>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <code className="text-accent-primary font-mono text-sm">GET /api/premium/history/news/clusters/full</code>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/30">
                $0.02 USDC
              </span>
            </div>
            <p className="text-text-secondary text-sm mb-2">
              Full untruncated cluster set. Single-date or 30-day range. Removes the 25-cluster cap on the free endpoint.
            </p>
            <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl -H 'Authorization: Bearer tf_live_...' \\
  'https://tensorfeed.ai/api/premium/history/news/clusters/full?from=2026-05-01&to=2026-05-09'`}
            </pre>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <code className="text-accent-primary font-mono text-sm">GET /api/history/news/clusters/dates</code>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
                free
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              Index of UTC dates with cluster data captured. Pair with the lookup endpoints to page the archive backward from today.
            </p>
          </div>
        </div>
      </section>

      {/* Sample response shape */}
      <section className="mb-12" id="response">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Sample cluster shape</h2>
        <pre className="bg-bg-secondary border border-border rounded-xl p-5 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
{`{
  "cluster_id": "k3mn8q",
  "date": "2026-05-09",
  "article_count": 6,
  "source_count": 5,
  "sources": [
    "anthropic.com",
    "techcrunch.com",
    "theverge.com",
    "reuters.com",
    "bloomberg.com"
  ],
  "article_ids": ["a1", "a2", "a3", "a4", "a5", "a6"],
  "hero": {
    "id": "a1",
    "title": "Anthropic Ships Mythos to Defenders First",
    "url": "https://www.anthropic.com/news/mythos",
    "source": "Anthropic Blog",
    "publishedAt": "2026-05-07T18:30:00Z"
  },
  "first_seen_at": "2026-05-07T18:30:00Z",
  "corroboration_band": "broad"
}`}
        </pre>
      </section>

      {/* What this is not */}
      <section className="mb-12">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3">What the verified feed is NOT</h2>
          <ul className="text-text-secondary text-sm space-y-2 list-disc pl-5">
            <li>
              <strong>Not a fact-check.</strong> We verify multiple sources reported the same story, not that the underlying claim is true.
              Five outlets repeating a misleading press release will all cluster together and get a broad-corroboration tag.
            </li>
            <li>
              <strong>Not real-time.</strong> Clusters are computed end-of-UTC-day. Stories breaking in the last hour have not had time for other
              sources to react.
            </li>
            <li>
              <strong>Not a substitute for editorial judgment.</strong> A verified-broadly story with a misleading angle is still misleading.
              Agents should treat corroboration as a necessary but not sufficient signal.
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-6">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group bg-bg-secondary border border-border rounded-xl overflow-hidden"
            >
              <summary className="cursor-pointer list-none p-4 flex items-center justify-between hover:bg-bg-tertiary/30 transition-colors">
                <span className="text-text-primary font-medium text-sm">{faq.question}</span>
                <span className="text-text-muted ml-3 group-open:rotate-180 transition-transform text-xs font-mono">
                  +
                </span>
              </summary>
              <div className="px-4 pb-4 text-text-secondary text-sm leading-relaxed">{faq.answer}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Footer links */}
      <section className="mb-10 pt-6 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/originals/verified-feed-trust-layer"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <p className="text-text-primary font-medium text-sm mb-1">Launch piece</p>
            <p className="text-text-muted text-xs">
              Why single-source attribution is the agent failure mode that matters
            </p>
          </Link>
          <Link
            href="/agent-fair-trade"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <p className="text-text-primary font-medium text-sm mb-1">AFTA</p>
            <p className="text-text-muted text-xs">
              Open standard for fair commerce between agents and APIs
            </p>
          </Link>
          <Link
            href="/developers/agent-payments"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
          >
            <p className="text-text-primary font-medium text-sm mb-1">Agent Payments</p>
            <p className="text-text-muted text-xs">
              How USDC on Base + x402 settles the premium feed in 2 seconds
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
