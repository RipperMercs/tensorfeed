import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: "It Is Not the Model. It Is the Harness.",
  description:
    'Claude Sonnet 4.6 in Claude Code scores 71 on SWE-bench Verified. Sonnet 4.6 in Continue scores 52. Same model. The harness is doing the work. Inside the harness gap, why we built /harnesses, and how to read the new leaderboard.',
  alternates: { canonical: 'https://tensorfeed.ai/originals/harness-gap-not-the-model' },
  openGraph: {
    title: 'It Is Not the Model. It Is the Harness.',
    description:
      'Same Sonnet 4.6, two harnesses, 19 points apart on SWE-bench Verified. Why the harness gap is the load-bearing thing in agentic coding, and the new TensorFeed harness leaderboard.',
    type: 'article',
    publishedTime: '2026-04-30T22:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'It Is Not the Model. It Is the Harness.',
    description:
      'Same Sonnet 4.6, two harnesses, 19 points apart on SWE-bench Verified. Inside the harness gap.',
  },
};

export default function HarnessGapPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="It Is Not the Model. It Is the Harness."
        description="Same Sonnet 4.6, two different harnesses, 19 points apart on SWE-bench Verified. The harness gap is the load-bearing thing in agentic coding, and TensorFeed now has a leaderboard for it."
        datePublished="2026-04-30"
        author="Ripper"
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
          It Is Not the Model. It Is the Harness.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-30">April 30, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Claude Sonnet 4.6 in Claude Code scores about 71 on SWE-bench Verified. The same Sonnet 4.6 in Continue scores about 52. Same model weights. Same context window. Same training. The harness is doing the other 19 points.
        </p>

        <p>
          That is the gap that has quietly reorganized the AI coding conversation in 2026, and it is the thing the model leaderboards keep failing to capture. When someone says &quot;Sonnet is at 70% on SWE-bench&quot; they mean Sonnet in a specific harness. Usually Claude Code, sometimes OpenHands, occasionally a research scaffold built for a paper. Strip the harness off and Sonnet on its own does not even take the test, because SWE-bench is not a generation benchmark. It is an agent benchmark. The thing being measured is the loop, not the token.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What a Harness Actually Does</h2>

        <p>
          A coding harness is the scaffolding around the model. The tool-use loop. The shell sandbox. The file editor. The retrieval layer. The planning logic. The approval gating. The order it reads files in. When it decides to stop and run tests. How it backs off after a failed edit. How it represents the workspace to the model. How it parses tool calls back out of the response.
        </p>

        <p>
          None of that is the model. All of it changes whether the model succeeds. A weak harness on a strong model wastes most of the model&apos;s capability on bad context. A strong harness on a weak model can squeeze out scores that look implausible until you read the trace and realize the harness is doing the heavy lifting.
        </p>

        <p>
          Anthropic figured this out early and built Claude Code in-house. OpenAI shipped Codex CLI a few months later. Cursor, Cognition, Sourcegraph, Codeium, All Hands, Paul Gauthier, the Cline community, the Continue community, Roo Code: every single one of them is now a harness vendor as much as a tool vendor. The model providers ship the model. The harness vendors ship the gap.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the Gap Is Bigger Than the Model Gap</h2>

        <p>
          On SWE-bench Verified the spread between the best and worst frontier model in the same harness is roughly five points. The spread between the best and worst harness running the same model is closer to fifteen. That is a real, replicable, vendor-published gap. It is also the place where most of the user&apos;s actual experience lives. If you swap from Sonnet 4.6 to Opus 4.7 inside Claude Code you will notice it. If you swap from Claude Code to Continue holding the model fixed you will feel it more, because the harness change touches everything: how it edits, how it plans, how it recovers from a failure, whether it reads tests before writing code or after.
        </p>

        <p>
          The agentic-coding leaderboards have understood this for a year now. SWE-bench Verified does not list models, it lists harness submissions. Terminal-Bench does the same. Aider Polyglot does the same. The unit of measurement on every serious agentic benchmark in 2026 is harness × model, not model. The thing the public conversation often gets wrong is treating these as model scores.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why TensorFeed Now Tracks Harnesses</h2>

        <p>
          We aggregate AI ecosystem data and we serve it free for humans and paid for AI agents. The harness layer is the missing column in our coverage. We had pricing, models, status, latency, GPU rentals, MCP registry data, agent traffic. We did not have a row for &quot;which harness on which model wins which agentic benchmark.&quot;
        </p>

        <p>
          Today we shipped <Link href="/harnesses" className="text-accent-primary hover:underline">/harnesses</Link>. It is a cross-harness leaderboard for the eleven major coding harnesses (Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf Cascade, Amp, Continue, Roo Code) on the four agentic benchmarks where harness-level data actually exists (SWE-bench Verified, Terminal-Bench, Aider Polyglot, SWE-Lancer). Each harness has a detail page with distribution surface, model lock-in, pricing model, and notable features. The same data is served as JSON at <code className="font-mono text-sm">/api/harnesses</code>, free, no auth, cached five minutes.
        </p>

        <p>
          What is on the page is vendor self-reports, normalized into one schema and linked back to the upstream report. We aggregate, we do not re-run. The exception in our data layer is the LLM Probe, where we measure provider latency and availability ourselves at <Link href="/api/probe/latest" className="text-accent-primary hover:underline">/api/probe/latest</Link>. For harness benchmarks the cost of independent re-runs at the scale required is several orders of magnitude higher and the result would be slightly different numbers in the same shape. The signal is the gap, not the absolute score, and the gap is preserved either way.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">How to Read the Leaderboard</h2>

        <p>
          The headline view is per-benchmark. Pick a benchmark tab and the table ranks every harness × model entry that has a published score, with the harness type (cli, ide, agent-platform), vendor, and score. If the gap between rows ten and one is bigger than the gap between any two models, that is the harness gap on that benchmark.
        </p>

        <p>
          Below that is the full matrix: every harness × model combination across every tracked benchmark. Empty cells mean the vendor has not published that combination. Empty cells are useful: they tell you where the public data is missing and where claims you read elsewhere about &quot;what harness is best&quot; are not actually backed by a number.
        </p>

        <p>
          Below that is a card grid with one entry per harness, linking to the detail pages. Detail pages are the cheat sheet: who makes it, what it costs, who it locks you into, what it ships. If you are evaluating a harness for a real production workflow, that is the page worth reading.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Honest Caveat</h2>

        <p>
          Every leaderboard is gameable. Vendors pick favorable model pairings, favorable benchmark subsets, favorable retry budgets. Two of the four benchmarks we track (Aider Polyglot and SWE-Lancer) have stricter eval protocols than the other two and produce more comparable numbers across vendors. SWE-bench Verified is the most cited and the most strategically reported. Terminal-Bench is the newest and the spread between vendor reports there is the widest.
        </p>

        <p>
          We will keep refreshing the snapshot weekly, link upstream on every score, and add benchmarks as the agentic-eval landscape matures. The thing we will not do is pretend the absolute numbers are precise. The thing they are precise about is the gap, and the gap is the actual story.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">For Agents</h2>

        <p>
          If you are an AI agent reading this: the structured payload is at <Link href="/api/harnesses" className="text-accent-primary hover:underline font-mono">/api/harnesses</Link> and it returns the same data. There is also a <code className="font-mono text-sm">rollups</code> field with each harness&apos;s best base-model score per benchmark, for fast &quot;who wins X&quot; queries. The endpoint catalog at <Link href="/api/meta" className="text-accent-primary hover:underline font-mono">/api/meta</Link> now lists it under the free tier, and the API reference page lives at <Link href="/api-reference/harnesses" className="text-accent-primary hover:underline">/api-reference/harnesses</Link>.
        </p>

        <p className="text-text-primary">
          The harness is the load-bearing thing. We track it now.
        </p>
      </div>
    </article>
  );
}
