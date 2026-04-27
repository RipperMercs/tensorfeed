import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'The 100,000 KV Ops Daily Budget and What Fits in It',
  description:
    'Cloudflare KV gives you 100,000 operations per day on the free tier. We run a real-time AI news API, status monitoring, model pricing, and a paid agent payments tier inside that budget. Here is the engineering that makes it possible.',
  openGraph: {
    title: 'The 100,000 KV Ops Daily Budget and What Fits in It',
    description: 'How a real-time AI news API, status monitoring, and an agent payments tier all live inside 100k KV ops per day.',
    type: 'article',
    publishedTime: '2026-04-28T00:30:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The 100,000 KV Ops Daily Budget and What Fits in It',
    description: 'A real-time AI news API + agent payments inside 100k KV ops per day. Here is the engineering.',
  },
};

export default function KVOpsArticlePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The 100,000 KV Ops Daily Budget and What Fits in It"
        description="Cloudflare KV gives you 100,000 operations per day on the free tier. We run a real-time AI news API, status monitoring, model pricing, and a paid agent payments tier inside that budget."
        datePublished="2026-04-28"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The 100,000 KV Ops Daily Budget and What Fits in It
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-28">April 28, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Cloudflare Workers give you 100,000 KV operations per day on the free tier. That is the
          number that quietly defines our entire architecture. A real-time AI news API,
          status-page polling for ten providers, model pricing snapshots, the paid agent payments
          tier with credit accounting, daily revenue rollups, per-token usage logs, and webhook
          watch dispatch all live inside that budget. We have not paid Cloudflare a single dollar
          for KV. Here is what that took.
        </p>

        <p>
          The interesting part is not the constraint. The interesting part is that the constraint
          forced an architecture that ended up better than what we would have built with infinite
          ops. Tight budgets are clarifying.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The math</h2>

        <p>
          100,000 ops per day is one op every 0.864 seconds, sustained, for 24 hours. If a
          single user request to your API costs even 5 KV ops, you are out of budget after
          20,000 requests. A naive implementation of a cached news API will burn through that
          before lunch on a busy day.
        </p>

        <p>
          The naive shape: every request reads articles from KV, returns them. 1 read per
          request. 100,000 requests per day fits, but you have nothing left for any other system.
          Now add status polling: 10 providers, every 5 minutes, 2 ops each (read previous +
          write current). That is 5,760 ops per day, 5.7% of the budget. Now add daily snapshot
          captures: 5 types per day, ~10 ops each, 50 ops daily. Negligible. Now add agent
          payments: every premium API call decrements a credit token (1 read + 1 write = 2 ops),
          updates the daily rollup (1 read + 1 write), updates the per-token usage log (1 read +
          1 write). 6 ops per paid call, so 1,000 paid calls per day = 6,000 ops, 6% of budget.
        </p>

        <p>
          You see where this is going. Casual addition of features eats the budget fast. Every
          new piece of infrastructure has to justify its KV cost or live somewhere else.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Move 1: Cache API for reads</h2>

        <p>
          Cloudflare Workers have two storage primitives: KV (the metered one) and the Cache API
          (free and unlimited). Cache API is L1 cache living in the edge node; KV is the
          distributed key-value store. The trick is to use Cache API as the primary read path
          and only fall through to KV on cache miss.
        </p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`async function cachedKVGet(request, kv, key, ttlSeconds) {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = \`/__kv_cache/\${key}\`;
  const cacheRequest = new Request(cacheUrl.toString());

  // Try Cache API first (free, unlimited)
  const cached = await caches.default.match(cacheRequest);
  if (cached) return cached.json();

  // Cache miss: read from KV (metered)
  const data = await kv.get(key, 'json');

  // Backfill the cache so the next 100 requests are free
  if (data) {
    const resp = new Response(JSON.stringify(data), {
      headers: { 'Cache-Control': \`public, max-age=\${ttlSeconds}\` },
    });
    await caches.default.put(cacheRequest, resp);
  }
  return data;
}`}</code></pre>

        <p>
          Per-request cost goes from 1 KV read to 1 KV read every <em>ttlSeconds</em>. If our
          news endpoint caches for 60 seconds and serves 1,000 requests in that window, that is
          1 KV read instead of 1,000. 1000x amplification. The math goes from &quot;we can serve
          100,000 requests per day&quot; to &quot;we can serve 6 million requests per day from cache and
          only burn 1,440 KV ops on the cache misses.&quot; The bottleneck moves from KV to compute.
        </p>

        <p>
          Doing this for every read in the codebase is a half-day of work. Once it is in place,
          the rest of the budget conversation becomes &quot;how often do we need to bust the cache,&quot;
          which is a much friendlier question than &quot;how do we afford this read.&quot;
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Move 2: Batch writes, never per-request</h2>

        <p>
          The agent payments daily revenue rollup updates four counters per paid call: total USD,
          tx count, total credits charged, call count. Plus per-endpoint counters. Plus per-agent
          counters. Naively that is 8 KV writes per call. At 1,000 paid calls per day, you have
          burned 8% of your budget on analytics alone.
        </p>

        <p>
          The fix is to merge: read the rollup once, mutate it in memory, write it back once.
          Two ops per call instead of eight. The tradeoff is that under heavy concurrency some
          increments race and last-write-wins eats them. Acceptable at MVP scale; if revenue
          becomes real you swap the rollup behind a Durable Object with atomic counters and
          eat that storage cost.
        </p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`async function logRevenue(env, amountUsd, agentUa) {
  const date = new Date().toISOString().slice(0, 10);
  const rollup = await readRollup(env, date);   // 1 KV read
  rollup.total_usd += amountUsd;
  rollup.tx_count += 1;
  noteUniqueAgent(rollup, agentUa);
  bumpTopAgent(rollup, agentUa, { purchased_usd: amountUsd });
  await writeRollup(env, rollup);                // 1 KV write
}`}</code></pre>

        <p>
          Same shape applies to per-endpoint usage logs, agent activity tracking, and any other
          accumulator. If you are writing to KV more than once per logical event, you are
          probably leaving budget on the table.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Move 3: Cron-based polls, never per-request polls</h2>

        <p>
          The naive way to handle &quot;is this AI service up&quot; is to hit the provider&apos;s status
          page on each user request. We do not do that. We have a cron job that polls all 10
          providers every 5 minutes, writes the result to KV, and serves the cached answer. 10
          providers x 12 polls per hour x 24 hours x 2 ops each = 5,760 KV ops per day for
          status. Under 6% of the budget covers all status data for all users for all time.
        </p>

        <p>
          Same pattern for RSS news polling (every 10 minutes, 12 sources, ~3 KV ops per source
          to dedup and write), daily catalog updates (one cron per day), daily snapshot captures
          (one cron per day). The cron handlers are the only writers; user requests never write
          to KV in the read path. This separation is the single biggest reason we fit.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Move 4: In-memory buffers for high-frequency events</h2>

        <p>
          Agent activity tracking is the highest-volume signal we capture. Every API request from
          a known bot User-Agent (ClaudeBot, GPTBot, etc.) is a hit we want to count. At our
          current traffic that is hundreds of events per minute. If each one wrote to KV, we
          would burn through 100k ops in a few hours.
        </p>

        <p>
          Instead, hits accumulate in a per-isolate in-memory buffer. The buffer flushes to KV
          once every 60 seconds OR when it reaches 50 entries, whichever comes first. So the
          worst case is one KV write per minute (1,440 per day) regardless of how many actual
          hits we received. The downside: buffered hits in an isolate that gets reaped before
          the flush are lost. Acceptable for analytics; not acceptable for credit accounting,
          which is why credit operations are per-call writes.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Move 5: Index keys, not list scans</h2>

        <p>
          The webhook watches feature has a per-cron-tick problem: when a price changes, we need
          to know which watches care about that change. The naive approach is to list all
          watches every cron tick. KV list operations are limited to 1,000 keys per call and
          each list is metered. At any reasonable watch volume this dominates the budget.
        </p>

        <p>
          The fix is a per-type index key:{' '}
          <code className="text-accent-primary font-mono">watch:index:price</code> stores an array
          of watch IDs subscribed to price events. Same for status and digest. The cron reads
          one index key, then batch-reads the matching watches by ID. 1 KV read regardless of
          how many watches exist, plus 1 read per matching watch (most days, none).
        </p>

        <p>
          The tradeoff is that the index key has a soft cap of 1,000 entries before it gets
          unwieldy as a single value. We enforce a per-token cap of 25 watches and a global cap
          of 1,000 to keep the index small. Past that we would shard or move to D1.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What does NOT fit</h2>

        <p>
          A few things we deliberately do not do because they would blow the budget:
        </p>

        <ul className="space-y-2 list-disc list-inside ml-4">
          <li>
            <strong className="text-text-primary">Per-call rate limiting on the free tier.</strong>
            {' '}A 1 KV read per request would dominate. We rely on Cloudflare&apos;s built-in DDoS
            protection and rate-limit only the premium-discovery endpoint (5 calls per IP per
            day, which only writes when allowed).
          </li>
          <li>
            <strong className="text-text-primary">Real-time analytics with sub-minute granularity.</strong>
            {' '}Daily rollups are good enough for MVP. Sub-minute would require either a Durable
            Object pool or a different storage layer.
          </li>
          <li>
            <strong className="text-text-primary">Long-term per-token usage history (years).</strong>
            {' '}We cap the per-token usage ring buffer at 100 entries. If a token is heavily used,
            old entries roll off. Full lifetime audit would require D1 or R2.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the constraint is a feature</h2>

        <p>
          The 100k ops budget forced a few architectural choices that turned out to be right
          regardless of cost:
        </p>

        <p>
          <strong className="text-text-primary">User-facing reads do not write to KV.</strong>{' '}
          This means user traffic cannot DDoS our credit ledger or our analytics. Crons write,
          users read from cache. The blast radius of a traffic spike is bounded by Cache API,
          which is free and unlimited.
        </p>

        <p>
          <strong className="text-text-primary">All persistence happens at predictable rates.</strong>
          {' '}Cron jobs run on schedules we control. The KV ops budget is a flat curve, not a
          spiky one. We can precisely calculate our daily op count from the cron cadence, and
          our cost grows with feature additions, not with traffic.
        </p>

        <p>
          <strong className="text-text-primary">Cache invalidation is cheap.</strong>{' '}
          When we ship a new feature that needs to invalidate cached data, we do it through
          Cache API (free) instead of KV (metered). The architectural pressure to move
          frequently-changing data into Cache API made the system more responsive, not less.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where we are now</h2>

        <p>
          As of late April 2026, our daily KV op consumption sits around 30,000 ops on a normal
          day, 50,000 on a busy one. The agent payments tier validated end-to-end on Base
          mainnet (the
          <Link
            href="/originals/validating-agent-payments-mainnet"
            className="text-accent-primary hover:underline mx-1"
          >
            walkthrough is here
          </Link>
          ) without changing the KV budget at all because the credit operations are 6 ops per
          paid call and we are nowhere near the volume that matters.
        </p>

        <p>
          We will hit 100k ops per day eventually. When we do, the move is clear: pay for
          Cloudflare Workers Paid ($5/month, raises the limit to 10 million ops per month) or
          shard hot keys to Durable Objects. Both are cheap. Neither requires re-architecting
          the system because the architecture was always cache-first and cron-driven.
        </p>

        <p>
          The lesson is general: tight constraints are clarifying. Free tiers force you to think
          about cost as an engineering property instead of an expense line. The system you build
          to fit in 100,000 ops is usually the system you would have wanted anyway.
        </p>
      </div>
    </article>
  );
}
