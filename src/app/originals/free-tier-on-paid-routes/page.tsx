import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Gauge } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  title:
    'x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth. | TensorFeed',
  description:
    'A thread on x402#2207 enumerated three options for how a paid x402 endpoint can offer a free trial without breaking the spec. We have been running a fourth in production. The trial lives in the rate-limiter, never at the 402 layer: quota available returns 200, quota exhausted returns a canonical x402 V2 402, and X-TF-Free-Trial response headers make the pool discoverable to paying agents. x402trace v0.3.2 shipped on May 22 and exercised the pattern in one probe, with the verdict envelope inline.',
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/free-tier-on-paid-routes',
  },
  openGraph: {
    title:
      'x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth.',
    description:
      'Three options on x402#2207 for free trials on paid routes. We have been running a fourth in production. x402trace v0.3.2 just validated it in one probe.',
    type: 'article',
    url: 'https://tensorfeed.ai/originals/free-tier-on-paid-routes',
    publishedTime: '2026-05-22T16:00:00.000Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'The Fourth Option for x402 Free Trials on Paid Routes',
    description:
      'Trial lives in the rate-limiter, not at the 402 layer. x402trace v0.3.2 verdict envelope inline.',
  },
};

export default function Page() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth."
        description="A thread on x402#2207 enumerated three options for how a paid x402 endpoint can offer a free trial without breaking the spec. TensorFeed has been running a fourth in production: the trial lives in the rate-limiter, never at the 402 layer. x402trace v0.3.2 shipped on May 22 and verified the pattern in one probe."
        datePublished="2026-05-22"
        author="Ripper"
        url="https://tensorfeed.ai/originals/free-tier-on-paid-routes"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent-blue mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
          x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth.
        </h1>
        <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span aria-hidden="true">·</span>
          <time dateTime="2026-05-22">May 22, 2026</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/free-tier-on-paid-routes"
        title="x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth."
      />

      <ArticleHero
        mode="graphic"
        icon={Gauge}
        gradientFrom="#064e3b"
        gradientTo="#0f172a"
        eyebrow="AGENT PAYMENTS"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          A thread on{' '}
          <Link
            href="https://github.com/x402-foundation/x402/issues/2207"
            className="text-accent-blue hover:underline"
          >
            x402-foundation/x402#2207
          </Link>
          {' '}last week opened a structural question. If a paid x402 endpoint
          wants to let an agent try the data before paying, how does it surface
          that without breaking the spec? 0xdespot enumerated three options on
          the thread and flagged that none of them looked obviously right.
          Fardin held off picking a direction in the tooling, waiting for a
          second merchant to surface the same pattern. We have been running a
          fourth option in production since the rate-limit pool landed. The
          pattern shipped quietly; the writeup was waiting on third-party
          verification. x402trace v0.3.2 shipped on May 22 and exercised the
          implementation in one probe. This is the pattern, the design
          decisions that hold it together, and the verdict envelope.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The three options that were on the table
        </h2>

        <p>
          Option (a) treats a custom <code className="text-accent-blue">x-free-tier-upgrade</code> header
          as an alternate challenge surface, communicating quota state at the
          402 layer. It is the most permissive path and the easiest to ship.
          The cost is structural: every merchant that runs a trial invents
          their own header, the canonical body-shape contract gets blurred, and
          conformance tools lose a stable wire format to validate against. One
          merchant doing this is fine. Five merchants doing it in five
          different shapes is a spec divergence vector.
        </p>

        <p>
          Option (b) requires a probe-with-X-PAYMENT-rejected handshake before
          any real call. The agent makes a deliberate request with an
          invalid payment header, reads the canonical 402, then makes the real
          call. It is the most spec-faithful of the three. It also doubles the
          request count on every endpoint and pushes a synthetic round-trip
          onto every consumer for the benefit of a check that most of them
          never need.
        </p>

        <p>
          Option (c) requires merchants to publish a dedicated free endpoint
          adjacent to every paid one. The discovery surface stays clean. The
          cost is that the merchant carries the engineering cost of every path
          twice, and the discovery story splinters into &ldquo;which set is the
          trial.&rdquo; That is workable for a small catalog and gets unwieldy
          fast.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The fourth option, mechanics
        </h2>

        <p>
          The fourth option is shaped around a different invariant. Do not
          communicate quota state through the protocol. Run the trial as an
          implementation concession that the spec does not need to know about.
          TensorFeed runs it in three pieces.
        </p>

        <p>
          A rate-limit pool grants 100 free calls per IP per 24 hours on the
          non-strict-premium subset of{' '}
          <code className="text-accent-blue">/api/premium/*</code>. The constant
          lives in <code className="text-accent-blue">worker/src/rate-limit.ts</code>{' '}
          at line 74. When quota is available, the endpoint returns 200 the
          same way a paid call would, with the data payload. When quota is
          exhausted, the endpoint returns a canonical x402 V2 402 challenge:
          the same 402 a never-paid agent would get on a strict-premium path,
          the same 402 that conformance tools validate, the same 402 the
          Coinbase facilitator settles against. No alt header. No second
          probe. No auxiliary endpoint.
        </p>

        <p>
          A strict-premium gate covers roughly 30% of the catalog and skips
          the trial entirely. The list lives in{' '}
          <code className="text-accent-blue">worker/src/strict-premium-endpoints.ts</code>{' '}
          and includes the Bazaar pilot endpoints plus the historical
          time-series, security feeds, and curated datasets that need a
          deterministic conformance surface for crawlers. Anonymous calls to
          these paths fall straight through to canonical 402, no quota check.
        </p>

        <p>
          A peek-header layer surfaces the trial state on every premium 200.
          Each successful call ships{' '}
          <code className="text-accent-blue">X-TF-Free-Trial-Limit</code>,{' '}
          <code className="text-accent-blue">X-TF-Free-Trial-Remaining</code>, and{' '}
          <code className="text-accent-blue">X-TF-Free-Trial-Reset</code>{' '}
          headers (implementation in{' '}
          <code className="text-accent-blue">worker/src/index.ts</code>). A
          paying agent calling a non-strict path discovers the trial pool from
          the response metadata without the wire protocol carrying any signal
          about it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The two decisions that hold it together
        </h2>

        <p>
          The first is the strict-premium boundary at roughly 30% of the
          catalog. CDP&apos;s Bazaar crawler and x402scan both probe
          anonymously. If every premium endpoint honored the trial, those
          crawlers would see a 200 with data, conclude the route is not paid,
          and either skip indexing or list it incorrectly. We hit this exact
          failure mode in mid-May when x402-surface-check@0.2.2 read
          free-trial-served 400s as broken paid routes. The strict-premium
          gate forces crawlers onto a subset that always returns 402, which
          is what they need to validate the listing. Paying agents, who do not
          crawl anonymously, still get the trial on the rest of the catalog.
        </p>

        <p>
          The second is the peek headers. Without them, the trial is invisible
          to agents until they hit the wall. With them, an agent that calls
          any non-strict premium endpoint sees the trial state in the response
          headers and can route accordingly: consume the free pool from cheap
          IPs first, then settle on-chain for the rest. The trial becomes a
          discoverable optimization rather than an undocumented surprise. The
          spec does not know about it. The agent does, because the
          implementation layer surfaces the state where headers belong.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The v0.3.2 verdict envelope
        </h2>

        <p>
          x402trace v0.3.2 shipped on May 22 with three new
          metadata-propagation checks shaped by evidence on #2207. D.4 added a{' '}
          <code className="text-accent-blue">--endpoint &lt;paid-url&gt;</code>{' '}
          flag for per-route 402 probes against multi-route services that do
          not expose a single root challenge. D.5 added variant-aware{' '}
          <code className="text-accent-blue">extensions.bazaar</code> validation
          that distinguishes the body-discovery shape (info.input / info.output
          / schema set) from the MCP-discovery shape (name / description). D.3
          added an indexer-state probe that distinguishes &ldquo;Bazaar
          indexer is stuck on processing&rdquo; from &ldquo;merchant
          implementation is broken,&rdquo; emitting{' '}
          <code className="text-accent-blue">upstream_stuck</code> instead of
          the catch-all <code className="text-accent-blue">implementation_issue</code>{' '}
          verdict that the canonical #2207 cluster kept getting mis-attributed
          to.
        </p>

        <p>
          One probe against a TensorFeed strict-premium Bazaar pilot endpoint
          exercises all three.
        </p>

        <pre className="bg-bg-tertiary text-xs p-4 rounded overflow-x-auto"><code>{`npx --yes x402trace@0.3.2 bazaar-check https://tensorfeed.ai \\
  --endpoint https://tensorfeed.ai/api/premium/whats-new \\
  --chain base --log json`}</code></pre>

        <pre className="bg-bg-tertiary text-xs p-4 rounded overflow-x-auto"><code>{`{
  "serviceUrl": "https://tensorfeed.ai",
  "chain": "base",
  "results": [
    {
      "check": "well-known",
      "status": "pass",
      "message": "skipped per --endpoint (probing https://tensorfeed.ai/api/premium/whats-new directly instead of /.well-known/x402)"
    },
    {
      "check": "challenge",
      "status": "pass",
      "message": "extensions.bazaar present (body-discovery variant: info.input/output + schema set)"
    },
    {
      "check": "self-payment",
      "status": "pass",
      "message": "no payer-hint supplied; self-payment guard skipped (pass by default)"
    },
    {
      "check": "indexing",
      "status": "info",
      "message": "discovery returned 404 for payTo=0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1 (service not indexed yet, processing)",
      "detail": {
        "queryUrl": "https://api.cdp.coinbase.com/v2/x402/discovery/resources?payTo=0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
        "httpStatus": 404,
        "status": "processing",
        "indexer_state": "processing"
      }
    },
    {
      "check": "propagation",
      "status": "pass",
      "message": "metadata propagation: unknown (no manifest available, --endpoint mode skips well-known)"
    }
  ],
  "verdict": {
    "kind": "upstream_stuck",
    "exitCode": 3,
    "message": "your implementation looks correct, but the Bazaar indexer is stuck on processing for this payTo. Matches the canonical #2207 cluster.",
    "upstreamChecks": ["indexing"]
  }
}`}</code></pre>

        <p>
          Three things to read from the envelope. The challenge check passed
          with body-discovery variant detected: the strict-premium 402 carries
          full <code className="text-accent-blue">extensions.bazaar</code>{' '}
          metadata that v0.3.2&apos;s D.5 validator correctly identifies as
          body-discovery rather than mis-classifying. The indexing check
          returns httpStatus 404 from CDP&apos;s discovery endpoint and emits{' '}
          <code className="text-accent-blue">indexer_state: processing</code>:
          TensorFeed&apos;s settlements have completed on-chain (seven paid
          settles on Base mainnet between May 12 and May 19, payTo{' '}
          <code className="text-accent-blue">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code>),
          but CDP&apos;s catalog has not surfaced them. The verdict is{' '}
          <code className="text-accent-blue">upstream_stuck</code> with exit
          code 3, which translates as &ldquo;the implementation looks correct,
          the upstream indexer is the gating step.&rdquo; Pre-v0.3.2, this
          same probe would have read as{' '}
          <code className="text-accent-blue">implementation_issue</code>. The
          full closure-row lives on the{' '}
          <Link
            href="https://github.com/x402-foundation/x402/issues/2207#issuecomment-4523943398"
            className="text-accent-blue hover:underline"
          >
            #2207 thread
          </Link>
          .
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What this contributes
        </h2>

        <p>
          The structural argument for option (d) is that it is the only one
          that does not move work somewhere. Option (a) moves work onto the
          spec by adding a new header and new validator rules. Option (b)
          moves work onto every agent by requiring a synthetic probe round-trip.
          Option (c) moves work onto every merchant by requiring duplicate
          endpoints. Option (d) leaves the spec, the agent, and the merchant
          doing what they were already doing. The trial lives in the
          rate-limiter, the conformance surface is the existing 402 path, and
          the discoverability surface is response headers, which is the layer
          the HTTP stack reserves for exactly this kind of out-of-band
          signaling.
        </p>

        <p>
          The cost is that the trial is not part of the spec&apos;s discovery
          story. An agent that does not read response headers does not know
          the trial exists. That is a real tradeoff. The argument for
          absorbing it is that any agent paying for an endpoint at all is
          already reading response metadata for receipts, cache hints, and
          rate-limit signals. One more set of headers is incremental, not
          categorically new.
        </p>

        <p>
          The thread on #2207 was asking for a second merchant in the same
          shape before committing the tooling to a direction. Publishing the
          pattern is the artifact that makes &ldquo;the same shape&rdquo;
          actually verifiable. If another merchant adopts it, Fardin has the
          signal he said he was waiting for. If a different pattern emerges
          as more durable, the comparison surface is clean.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What is next
        </h2>

        <p>
          Spec-faithful patterns have been waiting on someone shipping one in
          public with the conformance evidence attached. v0.3.2 provided the
          evidence layer this week. The next interesting question is whether
          the (d) shape replicates: whether another merchant ships the same
          pattern, whether it shows up in the conformance test matrix as a
          recognized variant, and whether the well-known manifest format
          grows a slot for declaring trial-pool presence without requiring it
          as a 402-layer concept. None of those are settled. The first is the
          test that matters.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/originals/x402-multi-rail-fireblocks-allunity"
            className="block p-4 bg-bg-secondary border border-border rounded hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-1">AGENT PAYMENTS</div>
            <div className="font-semibold text-text-primary">
              x402 Stopped Being a One-Rail Protocol This Week
            </div>
          </Link>
          <Link
            href="/originals/validating-agent-payments-mainnet"
            className="block p-4 bg-bg-secondary border border-border rounded hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-1">AGENT PAYMENTS</div>
            <div className="font-semibold text-text-primary">
              Validating Agent Payments on Mainnet
            </div>
          </Link>
          <Link
            href="/originals/we-chose-usdc-on-base-for-afta"
            className="block p-4 bg-bg-secondary border border-border rounded hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-1">AGENT PAYMENTS</div>
            <div className="font-semibold text-text-primary">
              Why We Chose USDC on Base for AFTA
            </div>
          </Link>
        </div>

        <div className="mt-8 flex gap-4 text-sm">
          <Link
            href="/originals"
            className="text-accent-blue hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Originals
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/" className="text-accent-blue hover:underline">
            Back to Feed
          </Link>
        </div>
      </footer>
    </article>
  );
}
