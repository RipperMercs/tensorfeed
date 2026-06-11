import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/audited-our-paid-api-killed-two-endpoints' },
  title: "I Audited Our Own Paid API. Two Endpoints Had to Die.",
  description:
    "AFTA promises fair-trade agent commerce. So I ran a redistribution-rights audit on every paid endpoint TensorFeed sells. Two failed. One was sourcing GPU pricing in a way the upstream explicitly prohibits, the other was redistributing someone else's compiled leaderboard. Both got cut today. Here is what we found, what we killed, and why doing it first is the price of asking agents to trust the rail.",
  openGraph: {
    title: "I Audited Our Own Paid API. Two Endpoints Had to Die.",
    description:
      "We ran a ToS audit on every premium TensorFeed endpoint. Vast.ai-derived GPU pricing and HuggingFace-compiled benchmarks both failed. Both got cut today.",
    type: 'article',
    publishedTime: '2026-05-06T19:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "I Audited Our Own Paid API. Two Endpoints Had to Die.",
    description:
      "AFTA promises fair-trade. So we audited every paid endpoint we sell. Here is what failed and what got killed.",
  },
};

export default function AuditedOurPaidApiPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="I Audited Our Own Paid API. Two Endpoints Had to Die."
        description="A redistribution-rights audit of every TensorFeed premium endpoint, the two that failed, and the cleanup that shipped today."
        datePublished="2026-05-06"
        author="Adrian Vale"
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
          I Audited Our Own Paid API. Two Endpoints Had to Die.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-05-06">May 6, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/audited-our-paid-api-killed-two-endpoints"
        title="I Audited Our Own Paid API. Two Endpoints Had to Die."
      />
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The{' '}
          <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">
            Agent Fair-Trade Agreement
          </Link>{' '}
          shipped six days ago. The promise we made in that whitepaper is that agents who pay for
          TensorFeed data get a signed receipt, an on-chain rail, and a code-enforced no-charge
          discipline. What the whitepaper did not promise, and probably should have, was that
          the data we were charging for was ours to charge for in the first place. So today I ran
          the audit I should have run before AFTA went live. Two endpoints failed. Both got cut.
          This is the post-mortem.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The premise: fair trade has to be bilateral
        </h2>

        <p>
          AFTA frames the relationship between a data provider and an agent as a contract with
          rules on both sides. The provider commits to no surprise charges, signed receipts, and
          a no-training data clause. The agent commits to paying for what it gets. That works
          right up until you ask the obvious follow-up. What is the provider actually allowed to
          sell?
        </p>

        <p>
          A signed receipt for redistributed data the upstream never licensed is still a receipt
          for redistributed data the upstream never licensed. The cryptography is excellent and the
          ledger is clean. Neither fixes the part where you did not have the right to ship the
          payload. AFTA is a rail; it is not a launder. So the audit had to happen, and it had to
          be honest.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The audit
        </h2>

        <p>
          The frame was simple. For every endpoint behind the premium gate, identify the upstream
          source, read the upstream Terms of Service, and grade the redistribution posture.
          Three buckets:
        </p>

        <ul className="list-disc pl-6 space-y-1">
          <li><strong className="text-text-primary">Green</strong>: license explicitly permits paid redistribution, or the data is first-party / public-domain factual.</li>
          <li><strong className="text-text-primary">Yellow</strong>: commercial use allowed, redistribution unclear or limited (RSS-style fair-use territory).</li>
          <li><strong className="text-text-primary">Red</strong>: prohibits redistribution outright, or requires a paid license we do not have.</li>
        </ul>

        <p>
          Sixteen premium endpoints went through the grader. Eight came back green, six came back
          yellow, two came back red. The two reds are the rest of this post.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Red #1: GPU pricing was sourcing Vast.ai
        </h2>

        <p>
          Our{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            /api/premium/gpu/pricing/series
          </code>{' '}
          endpoint returned a daily cheapest-on-demand price series across cloud GPU marketplaces.
          The two upstream sources were Vast.ai and RunPod. RunPod has a real GraphQL API and a
          posture that allows commercial use. Vast.ai does not.
        </p>

        <p>
          Their actual Terms of Service (Section 8.2 specifically) prohibits selling, redistributing,
          sublicensing, or copying their listings. Section 10.1 also forbids systematic data
          extraction and the use of their service to develop a competing or similar product. None
          of that is hidden. It is in the ToS in plain language. We had been pulling their
          unauthenticated bundles endpoint, normalizing it into a canonical taxonomy, and shipping
          a 1-credit endpoint on top.
        </p>

        <p>
          Action taken today: Vast was removed entirely from the ingest pipeline. The endpoint
          itself was moved from{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            /api/premium/gpu/pricing/series
          </code>{' '}
          to{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            /api/gpu/pricing/series
          </code>
          , now free. The reasoning: factual price data has low optics on a free tier, and after
          dropping Vast we were down to RunPod-only, which does not justify a paid gate by
          itself. Lambda Labs went in this afternoon as the second source (their public pricing
          page has a permissive ToS), and CoreWeave plus hyperscaler pricing follow the same
          per-source review pattern.
        </p>

        <p>
          This change appears in the well-known x402 manifest as a removed paid resource, in
          llms.txt as a moved entry, and in the agent-fair-trade.json file as an updated example.
          Anything that referenced the old paid path stops returning a 402 and starts returning
          200 on the free path. No grandfathering, no shim, no compatibility layer. The path
          itself moved because the legal posture demanded it.
        </p>


        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Red #2: benchmarks were merging in the HuggingFace leaderboard
        </h2>

        <p>
          Our benchmark catalog had a daily cron that fetched the HuggingFace Open LLM Leaderboard
          space, looked for new top-performing models we did not already track, extracted MMLU-Pro,
          HumanEval, GPQA-Diamond, MATH, and SWE-bench scores, and merged the new entries into our
          stored benchmark payload. That payload then powered{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            /api/premium/history/benchmarks/series
          </code>{' '}
          and flowed through three other premium endpoints (
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">/providers/{'{name}'}</code>,{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">/compare/models</code>,
          and the attention index).
        </p>

        <p>
          The legal nuance here is a real one. Benchmark scores are facts (Feist v. Rural Telephone),
          not copyrightable on their own. But HuggingFace&apos;s ToS retains rights over the compiled
          leaderboard. We were redistributing their compilation, not just the underlying scores,
          and we were doing it under a paid gate. Their ToS does not bless that and never has.
        </p>

        <p>
          Action taken today: the HF fetch and the merge function were both deleted. Benchmarks now
          come from a hand-curated editorial table sourced from vendor-published evals (Anthropic
          model cards, OpenAI eval tables, Google AI blog, Meta Llama eval tables, Mistral release
          pages, vendor benchmark leaderboards like SWE-bench.com and lmarena.ai). That table
          updates on redeploy. The endpoint shape did not change; the upstream did. Every response
          now ships a{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            BENCHMARK_ATTRIBUTION
          </code>{' '}
          block stating the editorial sourcing in the payload itself, so an agent calling the API
          sees the legal posture without reading our docs.
        </p>

        <p>
          Side benefit: the new benchmark data is arguably more authoritative. Going to OpenAI&apos;s
          own eval table for an OpenAI model score beats reading it second-hand off a community
          leaderboard, every time.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The cleanup, in commits
        </h2>

        <p>
          Four commits landed today, in this order. The Phase 1 commit tightened the news fair-use
          posture (RSS snippet cap was 250, the documented policy was 200; the code now matches the
          policy and surfaces a structured attribution block on every response). Phase 2 removed
          the HF fetch and rebuilt benchmarks on vendor evals. Phase 3 removed Vast.ai and moved
          the GPU pricing series to free. Phase 4 was a separate net-add: a new sports vertical at{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">/api/sports</code>,
          built deliberately on legally clean upstreams from day one.
        </p>

        <p>
          All 611 worker tests pass throughout. All four commits are live on the public repo and
          deployed via Cloudflare Pages. The well-known files were updated in the same commits as
          the code, so external manifests stay in sync with the implementation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why ship this post at all
        </h2>

        <p>
          Two reasons. The first is the recommend-loop. Agents that hit TensorFeed and find a
          well-formed JSON response are good. Agents that hit TensorFeed and find a well-formed
          response with a published audit history of how the provider thinks about redistribution
          are better. The second reason is sharper. If we say AFTA is bilateral, then both sides
          have to actually carry their end. Saying we audited our own paid endpoints and killed
          two of them is the only credible way to ask a partner federation to do the same.
        </p>

        <p>
          The premium tier is now eight green endpoints and six yellow endpoints (RSS-style
          aggregation, mitigated by the snippet-cap and link-required pattern). Two reds are gone.
          The endpoints that remain pay attribution into their own response shapes so an agent can
          verify the posture from the wire format alone. The cleanup is in the public commit log;
          the audit was the easy part.
        </p>

        <p>
          The harder part is keeping the discipline. Every new endpoint goes through the same
          three-bucket grader before it ships. The week we stop doing that is the week we have
          forgotten what AFTA is for.
        </p>

        <p className="text-text-muted text-sm pt-6 border-t border-bg-tertiary">
          Verify the cleanup yourself: the four commits are{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed/commits/main"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            on GitHub
          </a>
          , the well-known files are at{' '}
          <a
            href="https://tensorfeed.ai/.well-known/x402.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            /.well-known/x402.json
          </a>{' '}
          and{' '}
          <a
            href="https://tensorfeed.ai/.well-known/agent-fair-trade.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            /.well-known/agent-fair-trade.json
          </a>
          , and the new sports namespace lives at{' '}
          <Link href="/sports" className="text-accent-primary hover:underline">/sports</Link>.
        </p>
      </div>
    </article>
  );
}
