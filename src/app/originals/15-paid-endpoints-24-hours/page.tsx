import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: '15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible',
  description:
    'A first-person retrospective on shipping 15 pay-per-call premium endpoints, full SDKs in two languages, an MCP server, and a human dashboard in a single 24-hour build session. The compounding effects nobody talks about.',
  openGraph: {
    title: '15 Paid AI Agent API Endpoints in 24 Hours',
    description:
      'Shipped 15 pay-per-call premium endpoints, two SDK versions, an MCP server expansion, and a human dashboard in 24 hours. Here is what made the cadence possible.',
    type: 'article',
    publishedTime: '2026-04-27T20:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '15 Paid AI Agent API Endpoints in 24 Hours',
    description:
      'A retrospective on the build velocity that turned an architecture into 15 working pay-per-call endpoints in a single day.',
  },
};

export default function FifteenEndpointsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible"
        description="A first-person retrospective on shipping 15 pay-per-call premium endpoints, full SDKs in two languages, an MCP server, and a human dashboard in a single 24-hour build session."
        datePublished="2026-04-27"
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
          15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-27">April 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            8 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          This morning at 5 AM Pacific I had one paid AI agent endpoint live: routing
          recommendations. By 1 PM I had fifteen. Same codebase, same machine, same coffee. The
          difference between hour zero and hour twelve was not effort. It was that the first
          endpoint paid for the next fourteen.
        </p>

        <p>
          Building velocity stories on the internet are usually fake. Either the writer is
          embellishing, or they had a team they failed to mention, or what they shipped does not
          actually work. So before I tell you what we got done today, here is the receipt: every
          endpoint mentioned in this post is live on tensorfeed.ai right now, every one is paid
          in real USDC on Base mainnet, every one passes its unit tests, and the
          <Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline mx-1">
            end-to-end mainnet validation
          </Link>
          this morning used the same code path agents will hit. You can verify all of this from
          public sources before you keep reading.
        </p>

        <p>
          Now the part worth writing about. Why was today fast?
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The first endpoint is the only hard one</h2>

        <p>
          When I shipped routing recommendations yesterday it took the better part of a week. The
          payment middleware was new. The KV layout for credits had to be designed from scratch.
          The verification path that reads a USDC Transfer event from a Base RPC and parses the
          recipient out of the topics array was something I had never written before. The bearer
          token format, the replay protection storage, the credit decrement under contention, the
          x402 fallback for one-shot calls without pre-flight: all of this was first-time work.
        </p>

        <p>
          Then I shipped the second paid endpoint today. It took an hour. The third took 45
          minutes. The fourth took 30. The pattern, by then, was a copy-paste from the routing
          handler with a different feature behind it. Every premium endpoint after the first is a
          variation on the same shape:
        </p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`if (path === '/api/premium/X') {
  const payment = await requirePayment(request, env, 1);
  if (!payment.paid) return payment.response!;

  const result = await doTheActualWork(env, parseQueryParams(url));

  ctx.waitUntil(
    logPremiumUsage(env, '/api/premium/X', userAgent, 1, payment.token),
  );
  return premiumResponse(result, payment, 1);
}`}</code></pre>

        <p>
          The three lines that mattered for me to write were the call to
          <code className="text-accent-primary mx-1 font-mono">doTheActualWork</code>. Everything
          else was infrastructure that already existed. Every endpoint costs one credit, every
          credit is recorded against the bearer token, every response includes billing metadata
          and the X-Payment-Token-Balance header. None of that needed thinking. It was a pattern.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What I shipped today</h2>

        <p>
          Counting from this morning&apos;s first commit at 5 AM:
        </p>

        <ul className="space-y-2 ml-6 list-disc">
          <li>Four history-series endpoints (pricing series, benchmark series, status uptime, snapshot diff)</li>
          <li>Webhook watches with HMAC-signed delivery, SSRF guard, fire-cap, and 90-day TTL</li>
          <li>Enriched agents directory with derived trending score, six sort modes, and four filters</li>
          <li>Per-token usage tracking and a free <code className="text-accent-primary font-mono mx-1">/api/payment/usage</code> endpoint</li>
          <li>News search with full-text relevance scoring, recency boost, and date/provider filters</li>
          <li>Cost projection across 1-10 models with daily/weekly/monthly/yearly horizons and cheapest-monthly ranking</li>
          <li>A human-facing <Link href="/account" className="text-accent-primary hover:underline">credits dashboard</Link> with sessionStorage-only token handling and one-click watch deletion</li>
          <li>MCP server expansion from 5 free tools to 17 total (12 premium tools added)</li>
          <li>Python SDK shipped four versions (1.3.0 through 1.8.0) with full coverage of every new endpoint</li>
          <li>TypeScript SDK shipped four versions (1.2.0 through 1.7.0) with discriminated-union response types</li>
          <li>FAQPage and HowTo JSON-LD schema on the agent-payments docs page for AI Overviews and rich results</li>
          <li>An originals article documenting the mainnet validation, with the actual on-chain tx hash</li>
          <li>A distribution playbook with copy-paste-ready submissions for 12 MCP and x402 directories</li>
          <li>Worker test suite from 15 to 105 vitest cases across 7 files</li>
        </ul>

        <p>
          Every one of those was a Git commit on main. Every commit was deployed automatically by
          Cloudflare Pages and Workers. Every one passes <code className="text-accent-primary font-mono mx-1">tsc --noEmit</code>
          and the test suite. None of them are mocked or stubbed. None of them are behind a
          feature flag waiting for the &quot;real&quot; rollout.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the cadence held</h2>

        <p>
          A few things compounded. None of them were heroic.
        </p>

        <p>
          <strong className="text-text-primary">The data layer was already there.</strong> We
          have been snapshotting pricing, models, benchmarks, status, and agent activity to dated
          KV keys for weeks. By today the historical dataset had real depth, which meant new
          endpoints (history series, news search, cost projection) could read from existing
          storage rather than waiting for ingestion. Phase 0 of agent payments was about
          capturing data we could not backfill. Today that decision paid back across half a dozen
          features.
        </p>

        <p>
          <strong className="text-text-primary">The payment primitive was solved once.</strong>
          The <code className="text-accent-primary font-mono mx-1">requirePayment(env, tier)</code>
          middleware does all the auth, balance check, debit, and 402-with-instructions response
          logic. Every new paid endpoint is two lines: call the middleware, return on failure.
          New endpoints inherit the entire payment surface for free, including the x402 fallback,
          the bearer token rotation, the daily revenue rollup, and the per-token usage log.
        </p>

        <p>
          <strong className="text-text-primary">Tests were written alongside, not after.</strong>
          When I shipped the routing engine yesterday I wrote 15 vitest cases for it. That suite
          gave me confidence to refactor freely. When I added each new endpoint today, I wrote
          its tests in the same module-and-test pair pattern. That stayed the test count at
          1.5x to 2x the production code count. By the end of the day we have 105 tests. None of
          them ran on real RPCs, real KV, or real wallets. They run in ~500ms total against
          in-memory mocks. That speed is what makes them get run.
        </p>

        <p>
          <strong className="text-text-primary">SDKs followed the same shape.</strong> The
          Python and TypeScript SDKs share a structural pattern. Each free endpoint has a method.
          Each paid endpoint has a method that auto-attaches the token, throws a typed error if
          credits are insufficient, and surfaces billing metadata in the response. Adding a new
          endpoint to both SDKs takes ten minutes once the worker side is done, including
          updating the README API table.
        </p>

        <p>
          <strong className="text-text-primary">The MCP server reuses the SDK pattern.</strong>
          Each MCP tool is a thin wrapper over a worker endpoint. The fetch helper handles auth
          and 402 with friendly error messages. New tools were five-minute additions per
          endpoint.
        </p>

        <p>
          <strong className="text-text-primary">Documentation was generated alongside, not
          after.</strong> Every commit that adds an endpoint also updates
          <code className="text-accent-primary font-mono mx-1">public/llms.txt</code>,
          <code className="text-accent-primary font-mono mx-1">CLAUDE.md</code>, the
          <code className="text-accent-primary font-mono mx-1">/api/meta</code> manifest, the
          /developers/agent-payments page, both SDK READMEs, and the MCP README. Six docs
          locations updated per commit, every commit, no skips. That is the only way docs stay
          honest at this cadence.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The lesson worth keeping</h2>

        <p>
          The first endpoint is the platform. Everything after the first endpoint is content.
          When the platform work is real, content scales fast. When the platform work is fake or
          rushed, every new endpoint reopens the same questions you thought you had answered.
        </p>

        <p>
          Every team that ships slowly is paying the platform tax over and over. They are
          rebuilding auth in each new feature because their auth primitive was never abstracted.
          They are debating credit accounting in every endpoint because there is no shared
          credit primitive. They are writing one-off tests because their test infrastructure does
          not generalize. The cure is to spend the disproportionate time up front on the bones,
          then let the surface area compound.
        </p>

        <p>
          That is what made today possible. The bones got built last week. Today was just hanging
          features off them.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What is live</h2>

        <p>
          Fifteen pay-per-call premium endpoints. Free preview tier on the highest-value
          recommendation engine. Daily snapshots of pricing, models, benchmarks, status, and
          agent activity going back weeks. Webhook watches that fire HMAC-signed POSTs on price
          and status transitions. Full-text news search over our article corpus. Cost projection
          across any 1-10 models. SDKs in Python and TypeScript, an MCP server for Claude
          Desktop and Claude Code, and a human dashboard at
          <Link href="/account" className="text-accent-primary hover:underline mx-1">/account</Link>
          that uses sessionStorage only.
        </p>

        <p>
          And one verified transaction on Base mainnet that proves all of it works. The full
          trace is in the
          <Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline mx-1">
            mainnet validation post
          </Link>
          if you want the receipts.
        </p>

        <p>
          Try it: <code className="text-accent-primary font-mono mx-1">pip install tensorfeed</code>,
          buy a dollar of credits via <code className="text-accent-primary font-mono mx-1">tf.buy_credits()</code>,
          and call any of the fifteen endpoints. Or drop the MCP server into Claude Desktop and
          ask it to project your monthly cost across three models. Either way the loop closes
          end-to-end without a human in the credential path.
        </p>

        <p>
          That is what fast looks like when the foundation is real.
        </p>
      </div>
    </article>
  );
}
