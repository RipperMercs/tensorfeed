import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, GitBranch } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/claude-fermat-prove2me-harness-receipt' },
  title: "Claude Just Formalized Fermat in 11 Days on 6 Billion Tokens. The Harness Thesis Got Its Receipt.",
  description:
    "On Friday, September 5, 2026, Anthropic said dozens of Claude agents produced the first fully machine-checked Lean 4 proof of Fermat's Last Theorem in 11 wall-clock days: 13 million lines of code, 29,500 intermediate theorems, roughly 6 billion output tokens. The default Claude Code multi-agent harness failed. A DAG-shaped orchestrator called Prove2Me, built by an Anthropic researcher with Columbia collaborators, worked. Inside the numbers, the compute bill, why the same Claude every enterprise customer already has cleared a Millennium-adjacent formalization once a graph was wrapped around it, and what the receipt says about where value accrues in the frontier stack.",
  openGraph: {
    title: "Claude Just Formalized Fermat in 11 Days on 6 Billion Tokens. The Harness Thesis Got Its Receipt.",
    description:
      "13 million Lean lines. 29,500 theorems. 6 billion tokens. The default multi-agent harness broke. A DAG orchestrator called Prove2Me finished the job. The harness is the product, and now it has a receipt.",
    type: 'article',
    publishedTime: '2026-09-05T14:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Claude Formalized Fermat in 11 Days. The Harness Thesis Got Its Receipt.",
    description:
      "Same model. New graph. 13M Lean lines, 29,500 theorems, 6B tokens. The DAG did the work.",
  },
};

export default function ClaudeFermatProve2MeHarnessReceiptPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Claude Just Formalized Fermat in 11 Days on 6 Billion Tokens. The Harness Thesis Got Its Receipt."
        description="On September 5, 2026, Anthropic said dozens of Claude agents produced the first fully machine-checked Lean 4 proof of Fermat's Last Theorem in 11 wall-clock days, using 13 million lines of Lean, 29,500 intermediate theorems, and roughly 6 billion output tokens. The default Claude Code multi-agent harness failed. A DAG-shaped orchestrator called Prove2Me finished the job. Inside the numbers, the compute bill, and what the receipt says about where value accrues."
        datePublished="2026-09-05"
        author="Adrian Vale"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Hero (graphic mode: proof-graph indigo to Anthropic copper) */}
      <ArticleHero
        mode="graphic"
        icon={GitBranch}
        gradientFrom="#4C1D95"
        gradientTo="#C26A3A"
        eyebrow="Agent Stack &middot; Frontier Harness"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Claude Just Formalized Fermat in 11 Days on 6 Billion Tokens. The Harness Thesis Got Its Receipt.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-09-05">September 5, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/claude-fermat-prove2me-harness-receipt"
        title="Claude Just Formalized Fermat in 11 Days on 6 Billion Tokens. The Harness Thesis Got Its Receipt."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic published the writeup this morning, Friday, September 5, 2026: dozens of Claude
          agents produced the first complete, machine-checked Lean 4 formalization of Fermat&apos;s
          Last Theorem. Eleven days of wall clock. Roughly 6 billion output tokens. About 13 million
          lines of Lean, roughly five times the size of Lean&apos;s main mathematics library. Around
          29,500 intermediate theorems in the final graph. Independent verification by Lean itself,
          which either accepts the proof term or it does not.
        </p>

        <p>
          Headline: the theorem is not the news. Andrew Wiles cleared Fermat in 1994 across 129
          journal pages and seven years of solitary work. What is new is the shape of the compute
          that produced a mechanically checkable version of the same result. A general-purpose model
          every enterprise customer already has, wrapped in a graph of proof obligations, running in
          parallel across dozens of agents for eleven days, at a compute bill on the order of a
          seed check. The harness is the product, and this run is the first public receipt with a
          number attached to every column.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Line item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Wall clock</td>
                <td className="px-4 py-3 font-mono">11 days</td>
                <td className="px-4 py-3">Early to mid August 2026, launched by Anthropic + Columbia</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Output tokens</td>
                <td className="px-4 py-3 font-mono">~6B</td>
                <td className="px-4 py-3">Across all agents, all rewrites, all failed branches</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Lean lines produced</td>
                <td className="px-4 py-3 font-mono">~13M</td>
                <td className="px-4 py-3">Roughly 5x the size of Lean&apos;s standard mathlib</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Intermediate theorems</td>
                <td className="px-4 py-3 font-mono">~29,500</td>
                <td className="px-4 py-3">Nodes in the shared proof graph</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Concurrency</td>
                <td className="px-4 py-3 font-mono">Dozens</td>
                <td className="px-4 py-3">Agents working the graph in parallel via Prove2Me</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Verifier</td>
                <td className="px-4 py-3 font-mono">Lean 4</td>
                <td className="px-4 py-3">Deterministic; the trust root sits outside the model</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-text-muted">
            Numbers per Anthropic&apos;s September 5 research post and the accompanying paper. The
            token figure counts output only; input and cache reads are the majority of the bill.
          </div>
        </div>

        <p>
          Two things read straight off the table. First, this run consumed more output tokens than
          most public model evaluations combined. Six billion output tokens on a single research
          project is a compute footprint that sits in the neighborhood of a small pretraining
          fine-tune, not a benchmark. Second, the concurrency figure is the interesting one. Dozens
          of agents running for eleven days is not a serial reasoning trace, it is a parallel
          construction, which is exactly the shape a proof of this scale requires and exactly the
          shape a single-agent chatbot cannot express.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the Default Harness Failed</h2>

        <p>
          The important sentence in the writeup is the one about the first attempt. Anthropic tried
          the standard Claude Code multi-agent workflow, the same harness shape thousands of teams
          run in production every day, and it broke. Individual agents made local progress. Then
          they lost track of the overall project state and stopped coordinating. Long-horizon memory
          degradation is the canonical failure mode of the entire agent stack, and it fired on the
          hardest available test.
        </p>

        <p>
          The fix was not a bigger model, a longer context window, or a smarter prompt. It was a
          different orchestrator. Tianyi Peng, an Anthropic researcher who initiated the project,
          built Prove2Me with collaborators at Columbia. Prove2Me maintains a directed acyclic graph
          of theorem statements. An agent picks an unfinished node, drafts a proof against the
          statement, runs Lean, and either commits a verified subtree or fails and hands the node
          back to the queue. The graph is the memory the individual context windows cannot hold.
          The graph is also what lets a dozen agents work at once without stepping on each
          other&apos;s proof state.
        </p>

        <p>
          That is the whole insight, and it is a small one on paper. In practice it is the
          difference between an agent fleet that quietly stalls after three days and one that
          converges on a formal proof of the Modularity Theorem in eleven. The model contributed
          general reasoning. The harness contributed the ability to remember and to parallelize.
          Every commercial agent product in the market is going to have to answer the same design
          question inside the next year, because the shape that worked for Fermat is the shape a
          large software refactor needs, or a multi-week security audit, or a data-migration
          project.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Receipt Costs</h2>

        <p>
          Anthropic did not publish the compute bill, so build it from public pricing. Six billion
          output tokens at the Fable 5 rate of $50 per million is $300,000 in output alone. Agentic
          workloads at this shape run inputs roughly 20 to 50 times higher than outputs once cached
          context, tool traces, and Lean feedback are counted, and cached reads dominate the input
          column. Anchor an estimate at 200 billion input-equivalent tokens with 90 percent cached,
          price the cached portion at the pre-cut $1.00 per million that was in effect during the
          August run, and the bill lands somewhere in the low seven figures for the whole eleven
          days. Call it $500,000 to $1.5 million, all in, plus the researcher salaries that do not
          show up on the API invoice.
        </p>

        <p>
          That is not zero. It is also not a scale that requires a new hyperscaler contract. It is
          the size of one team&apos;s quarterly project budget at a well-funded lab, or a single
          grant at a serious research university, or a rounding error against the{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            $200 billion Google TPU commitment
          </Link>{' '}
          Anthropic signed in May. Formalizing a Millennium-adjacent result used to be a career. It
          is now a line item on a research budget with a bounded delivery window, which is a
          different thing entirely.
        </p>

        <p>
          It gets cheaper next quarter. Fable 5.1 shipped on September 1 with cache reads at $0.25
          per million, a 75 percent cut on the line that dominates this workload, per the{' '}
          <Link href="/originals/fable-5-1-cache-read-cut-agent-pricing-floor" className="text-accent-primary hover:underline">
            cache-read repricing we covered yesterday
          </Link>
          . The next attempt at a project of this shape on the same tier of model runs at roughly
          half the price, without a single change to the harness or the prompt.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Harness Thesis, With a Receipt</h2>

        <p>
          We wrote up the shape of this bet twice already. In July, when Anthropic launched Claude
          Science as a workbench of coordinating agents and shipped no new model,{' '}
          <Link href="/originals/claude-science-harness-is-the-product" className="text-accent-primary hover:underline">
            the harness-is-the-product piece
          </Link>{' '}
          argued that the lab was selling the workflow and letting the frontier model ride
          underneath it. In April, when a wave of coding harnesses started opening the gap between
          model capability and delivered capability,{' '}
          <Link href="/originals/harness-gap-not-the-model" className="text-accent-primary hover:underline">
            the harness-gap essay
          </Link>{' '}
          argued that the axis of competition had already moved. Both were forward reads on a curve
          that had no killer public receipt attached.
        </p>

        <p>
          Prove2Me plus Fermat is the receipt. It is the first public run at frontier scale where
          the same model produced a qualitatively new capability strictly because someone wrapped a
          better graph around it. The DAG is 200 lines of Python and a scheduler. The agents are
          the Claude every paying customer already has. The Lean verifier is open source. Put those
          three pieces together with a research question that decomposes into 29,500 provable
          statements and the model clears a formal proof no single agent could plan. Take any of
          the three away and it stalls. That is a stack claim, not a model claim.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Receipt Does Not Say</h2>

        <p>
          Three things worth naming, because the temperature on this announcement is going to run
          hot for a week. First, the project formalizes an existing proof; it does not discover a
          new one. Wiles and Taylor did the mathematics. Kevin Buzzard&apos;s team at Imperial
          spent years planning the Lean blueprint that Claude filled in. flt-regular gave the
          agents a working Kummer proof to lean on. The result is scale, not insight, and every
          honest headline says so. Second, the token efficiency is dreadful by human standards. A
          working mathematician does not need six billion output tokens to reproduce the argument;
          the whole textbook of algebraic number theory fits in maybe fifty million tokens. The
          receipt is about parallel construction, not about efficient reasoning. Third, none of
          this generalizes automatically. A DAG of theorem statements exists for Fermat because
          Buzzard spent years writing it. There is no equivalent graph for the Riemann hypothesis,
          or the Hodge conjecture, or the Navier-Stokes existence problem. The bottleneck has moved
          from the proof to the plan, and the plan is still a human artifact.
        </p>

        <p>
          Those caveats are real. They are also exactly the shape of caveats that get quietly
          smaller quarter by quarter, because a general model plus a general graph plus a
          deterministic verifier is a research pattern that can grind through any problem someone
          bothers to plan. The next public run does not need to be Riemann. It only needs to be a
          formalization someone has been waiting a decade to finish.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The interesting sentence in the writeup is the one about the failed first attempt.
          Anthropic buried it, and the industry press ran the 13-million-line number instead, but
          the failure of the default Claude Code harness on the hardest available task is the
          disclosure that reprices the agent stack. If the flagship in-house harness cannot hold
          project state across an eleven-day run without a purpose-built graph on top of it, then
          every commercial agent product on the market is running on the same wrong end of the same
          scaling curve, and the fix is orchestration, not tokens. That is a positioning problem
          for the model layer and an opportunity for whoever ships the second Prove2Me.
        </p>

        <p>
          Practical read for builders on the API. If your agent product hits a ceiling on
          long-horizon tasks, the ceiling is almost certainly not the model. It is the shape of the
          memory your agents share. Prove2Me is 200 lines and a DAG, and it beat the default
          multi-agent harness on a task nobody thought a general model could clear. Whatever shared
          state your agents rely on today, that state is the axis to iterate on, not the prompt and
          not the tier. The receipt Anthropic just published is a very expensive proof that the
          orchestrator wins.
        </p>

        <p>
          Three signposts for the next 90 days. Whether a second lab publishes a comparable formal
          proof of a hard formalization target (the Poincare conjecture in Lean, the Odd Order
          theorem in a modern prover, or one of the still-open Millennium problems reduced to a
          formalizable subresult), which is the direct test of whether Prove2Me is a pattern or a
          one-off. Whether the DAG-orchestrator shape shows up inside a shipping commercial agent
          product (Cursor, Cognition&apos;s Devin, Claude Code itself, a new entrant), which is the
          direct test of whether Anthropic ports its own research finding into the customer stack
          before someone else does. And whether Anthropic&apos;s next revenue disclosure breaks out
          research or science workloads as a separate line, because at $500K to $1.5M per formal
          proof and dropping fast on the cache-read curve, this is a segment that can be sold to
          hundreds of research groups on the same infrastructure that runs the coding harnesses.
          Two of the three fire and the harness thesis stops being a TF read and becomes a category
          on the pricing page.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/claude-science-harness-is-the-product"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Claude Science Ships a Coordinating Agent, Not a New Model. The Harness Is the Product Now.</span>
          </Link>
          <Link
            href="/originals/harness-gap-not-the-model"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">It Is Not the Model. It Is the Harness.</span>
          </Link>
          <Link
            href="/originals/fable-5-1-cache-read-cut-agent-pricing-floor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That&apos;s the Line Agents Actually Pay.</span>
          </Link>
          <Link
            href="/originals/claude-protein-binders-gpu-hours-per-binder"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Claude Ran a Protein Design Campaign Alone and Beat 245 Human Entrants Ten to One. The Cost Was Roughly 120 GPU-Hours Per Binder.</span>
          </Link>
        </div>
      </footer>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
