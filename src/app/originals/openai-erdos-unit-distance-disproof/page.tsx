import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/openai-erdos-unit-distance-disproof' },
  title: 'OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math.',
  description:
    'On May 20, OpenAI announced that an internal general-purpose reasoning model disproved a 1946 Erdős conjecture on the planar unit distance problem. 125 pages of coherent proof using Golod-Shafarevich theory and infinite class field towers, no math-specific training, no problem-targeted scaffolding. Tim Gowers and Will Sawin verified it. Inside what actually shipped, why "general purpose" is the line that matters, and what it does to the research-discovery rail.',
  openGraph: {
    title: 'OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math.',
    description:
      'A general-purpose OpenAI reasoning model disproved a 1946 Erdős conjecture in discrete geometry. 125 pages, verified by Fields medalist Tim Gowers and Princeton mathematician Will Sawin. Why the "general purpose" framing is the structural story, not the proof itself.',
    type: 'article',
    publishedTime: '2026-05-24T16:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math.',
    description:
      'General-purpose OpenAI reasoner cracks the planar unit distance problem in 125 pages. Gowers and Sawin verified. What it means for the research rail.',
  },
};

export default function OpenAIErdosUnitDistanceDisproofPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math."
        description="On May 20, 2026, an internal OpenAI general-purpose reasoning model disproved a Paul Erdős conjecture on the planar unit distance problem first posed in 1946. The 125-page proof used algebraic number theory (Golod-Shafarevich theory, infinite class field towers) and was verified by Fields medalist Tim Gowers and Princeton mathematician Will Sawin. The strategic story is the model: no math-specific training, no problem-targeted scaffolding."
        datePublished="2026-05-24"
        author="Kira Nolan"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-24">May 24, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/openai-erdos-unit-distance-disproof"
        title="OpenAI Just Disproved an 80-Year Erdős Conjecture. The Model Was Not Trained for Math."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          On Wednesday May 20, OpenAI announced that an internal general-purpose reasoning model
          disproved a conjecture about the planar unit distance problem that Paul Erdős first posed
          in 1946. The proof runs roughly 125 pages, uses Golod-Shafarevich theory and infinite class
          field towers, and arrives at a polynomial improvement over the square-grid construction
          mathematicians had treated as effectively optimal for eighty years. Fields medalist Tim
          Gowers and Princeton mathematician Will Sawin verified it. Sawin tightened the bound to
          n raised to the power of one plus delta, where delta equals 0.014.
        </p>

        <p>
          That is the headline. The structural story is the sentence OpenAI buried two paragraphs
          into the post: the model was not trained on the unit distance problem, it was not given
          problem-specific search tooling, and it was not a specialized theorem prover. It was a
          general-purpose reasoning model, the same kind of system OpenAI sells through the API.
        </p>

        <p>
          I have been watching the AI-for-math beat closely since AlphaProof cleared a silver medal
          at IMO 2024. Until this week, every public frontier result on a hard open problem leaned
          on a math-shaped harness: Lean integration, search-over-tactics, retrieval against a
          problem-specific corpus, RL on closely related families. This one did not. That is the
          line worth circling.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Problem Actually Asks</h2>

        <p>
          The planar unit distance problem is one of the oldest open questions in combinatorial
          geometry. Place n points in a plane. Count the pairs that are exactly distance 1 apart.
          What is the maximum count you can achieve as n grows large?
        </p>

        <p>
          The trivial upper bound is n squared, because that is the number of pairs you have to
          start with. The trivial lower bound is around n times the square root of log n, which a
          carefully aligned square grid will give you. The Erdős conjecture, in the version
          mathematicians were trying to defend through the 1970s, was that you cannot meaningfully
          beat the square-grid construction by anything polynomial in n. Bumping the bound up by a
          fixed polynomial factor was treated as the kind of thing that, if it were possible, would
          have shown up already.
        </p>

        <p>
          The OpenAI proof constructs an infinite family of configurations that breaks that
          assumption. It exhibits arrangements with n raised to one plus delta unit-distance pairs,
          for a fixed positive delta. Sawin pinned delta down to 0.014. That is small in absolute
          terms and structural in mathematical terms: an existence proof that the gap is at least
          polynomial closes off an entire class of upper-bound arguments mathematicians had been
          building since the 1980s.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Surprise Was the Toolbox</h2>

        <p>
          The construction does not come from combinatorial geometry. It comes from algebraic
          number theory, specifically Golod-Shafarevich theory on infinite class field towers, a
          piece of machinery developed in the 1960s for a question about how class groups grow in
          algebraic number fields. The bridge between number-theoretic towers and a count of
          unit-distance pairs in the plane is what reviewers flagged as the surprise. Two adjacent
          subfields of mathematics that rarely talk to each other, glued together for a result in
          neither one&apos;s home territory.
        </p>

        <p>
          That is also where the &quot;general purpose&quot; framing earns its keep. A
          system trained narrowly on combinatorial geometry would have had no reason to reach into
          class field towers. A system trained narrowly on number theory would have had no reason
          to produce a unit-distance construction. A model whose pretraining mix covers both, plus
          enough connective tissue to suggest the bridge, can. That is the capability that becomes
          interesting at scale.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">How It Compares to Prior Frontier Math Runs</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">System</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Result</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Math-Specific Scaffolding</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI (this model)</td>
                <td className="px-4 py-3">Disproof, planar unit distance</td>
                <td className="px-4 py-3">None</td>
                <td className="px-4 py-3">May 20, 2026</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepMind AlphaProof / AlphaGeometry 2</td>
                <td className="px-4 py-3">Silver medal, IMO 2024</td>
                <td className="px-4 py-3">Lean integration, geometry DSL</td>
                <td className="px-4 py-3">Jul 2024</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepMind FunSearch</td>
                <td className="px-4 py-3">Cap-set lower bound (n=8)</td>
                <td className="px-4 py-3">Program-search loop</td>
                <td className="px-4 py-3">Dec 2023</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Numina (open-source)</td>
                <td className="px-4 py-3">AIMO Progress Prize</td>
                <td className="px-4 py-3">Math-tuned base, tool use</td>
                <td className="px-4 py-3">2024 to 2025</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic Claude Mythos</td>
                <td className="px-4 py-3">Frontier cyber, math reasoning</td>
                <td className="px-4 py-3">Cyber range scaffolding</td>
                <td className="px-4 py-3">Apr to May 2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Read this table the right way. The earlier systems were not embarrassed by the comparison;
          they were all designed to push specific frontiers. The line OpenAI claims to have crossed
          is that the same model you would deploy to draft code, summarize a deposition, or run an
          autonomous agent produced this result. That claim is what Gowers and Sawin verified at the
          mathematical layer, but the systems claim sits with OpenAI and will need a paper to fully
          stand up.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why 125 Pages Matters</h2>

        <p>
          The page count is doing real work in the announcement. Coherent mathematical proofs that
          run more than twenty pages are difficult for current models. Most produce arguments that
          drift, repeat lemmas without naming them, or accept circular reasoning by the eighth or
          ninth step. 125 pages of proof that two reviewers can follow is, on its own, a frontier
          result on long-horizon coherence.
        </p>

        <p>
          For comparison, a typical SWE-Bench Pro trajectory the same class of model produces is in
          the range of 5 to 15 tool calls before the agent loses the plot. The unit-distance proof
          is essentially one continuous tool call against an internal scratchpad. Whatever
          inference-time technique is doing the heavy lifting here (likely a tree-search variant
          over partial proof states, with self-verification at each node) is something OpenAI has
          not described in detail and probably will not until a paper drops.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What It Does to the Research-Discovery Rail</h2>

        <p>
          We have been writing about the research-discovery rail (the layer where models propose,
          verify, and ship novel scientific results) as a category that was approaching but not yet
          present. Claude Mythos surfacing 271 Firefox zero-days in one cycle was the security
          version of that rail. The OpenBSD vulnerability that survived 27 years of human review,
          flagged by Mythos last month, was another. This is the mathematics version.
        </p>

        <p>
          The pattern across all three: a model with no domain-specific scaffolding finds something
          experts missed for years or decades, in a domain where exhaustive expert attention is the
          baseline. The interesting variable is no longer whether the models can do this. It is how
          often, in which domains, and under what verification regime.
        </p>

        <p>
          For mathematics specifically, the next thirty days are the test. The unit-distance proof
          will be picked apart at the arXiv level. Reviewers will look for gaps Sawin and Gowers
          did not catch, for hidden assumptions, for places where the model leaned on a
          near-duplicate result that already existed in the literature. If it holds, OpenAI will
          almost certainly run the same model against other open problems on the Erdős list, and
          the next announcement will tell us whether this was a singular finding or a repeatable
          process.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Capability the Market Is Not Yet Pricing</h2>

        <p>
          The current API pricing tier for general-purpose reasoning models tops out at $30 per
          million output tokens (GPT-5.5) and $75 per million output tokens (Claude Opus 4.7). Those
          prices are set against agentic-coding and long-context workloads. Neither is priced
          against &quot;produce a 125-page novel proof on a 1946 open problem.&quot; That use case
          does not have a market yet, because until this week it was not on the menu.
        </p>

        <p>
          The interesting question is what happens to research budgets at universities, pharma R&amp;D
          arms, and national labs once a vendor can credibly say &quot;our base model produced a
          novel polynomial improvement on an Erdős conjecture without any math-specific training.&quot;
          The answer is probably not &quot;we replace mathematicians.&quot; It is more likely
          &quot;every senior researcher gets a multi-million-dollar inference budget and a list of
          their twenty favorite open problems to throw at it.&quot;
        </p>

        <p>
          That is a different shape of demand than the current API mix. It is closer to compute
          procurement than to per-token inference, and it favors the vendor that can sustain
          high-cost, long-horizon runs at low marginal failure rates. OpenAI is signaling it wants
          the seat. Anthropic, with Mythos&apos; record on autonomous discovery in security and the
          Karpathy pretraining team that landed on Tuesday, is signaling the same thing from the
          other direction.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What to Watch</h2>

        <p>
          Three signposts over the next month. First, whether the proof survives independent
          formalization in Lean or Coq. Gowers and Sawin reviewed it on paper. A formal verification
          run, even on a few load-bearing lemmas, is the next gate. Second, whether OpenAI publishes
          the inference-time recipe. The 125-page coherence is the systems-level claim, and it
          needs a method-section to stand up. Third, whether a second open problem falls to the
          same model. If it does, the research-discovery rail is no longer an emerging category. It
          is the category that defines the next pricing tier.
        </p>

        <p>
          For now, the right framing is that the line between &quot;general-purpose chat model&quot;
          and &quot;research-grade scientific instrument&quot; got blurrier this week. The model is
          the same one OpenAI was already shipping. The capability is the one nobody had named yet.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-karpathy-four-moves-one-week"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Karpathy Joined Anthropic. That Is the Fourth Structural Move in One Week.</span>
          </Link>
          <Link
            href="/originals/claude-mythos-ai-security"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Claude Mythos: What Anthropic&apos;s Security-Tier Model Actually Is</span>
          </Link>
          <Link
            href="/originals/gpt-5-5-openai-flagship"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.</span>
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
