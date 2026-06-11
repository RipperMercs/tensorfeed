import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/claude-fable-5-mythos-5-split-frontier' },
  title: 'Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy.',
  description:
    'On June 9, 2026 Anthropic shipped its newest frontier model as two products: Claude Fable 5, generally available behind always-on safety classifiers at $10 per 1M input and $50 per 1M output, and Claude Mythos 5, the same model with safeguards lifted for vetted cyberdefense and government partners. The vendor benchmark table leads the field (SWE-bench Pro 80.3 percent vs GPT-5.5 at 58.6), but several headline rows are Mythos-only ceilings public users cannot reach, flagged requests silently reroute to Opus 4.8 at Opus pricing, and for the first time in a frontier launch no ASL tier was named. What shipped, what the asterisks mean, and why the S-1 on file makes the two-product split read like governance becoming product architecture.',
  openGraph: {
    title: 'Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy.',
    description:
      'Claude Fable 5 is GA at $10/$50 per 1M tokens with a 1M context window. Claude Mythos 5 is the same model unleashed for vetted partners. The asterisks in the benchmark table are the story.',
    type: 'article',
    publishedTime: '2026-06-09T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy.',
    description:
      'One frontier model, two products: Fable 5 for everyone, Mythos 5 for the vetted few. The asterisks in the benchmark table are the story.',
  },
};

export default function ClaudeFable5Mythos5SplitFrontierPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy."
        description="Anthropic shipped Claude Fable 5 (GA, safeguarded, $10/$50 per 1M tokens) and Claude Mythos 5 (same model, safeguards lifted, vetted partners only) on June 9, 2026. Vendor benchmarks lead the field, several headline rows are Mythos-only, and no ASL tier was named."
        datePublished="2026-06-09"
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
          Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-06-09">June 9, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            8 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/claude-fable-5-mythos-5-split-frontier"
        title="Anthropic Split the Frontier in Two. Fable 5 Is the Half You Can Buy."
      />

      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#1e3a8a"
        gradientTo="#312e81"
        eyebrow="MODEL RELEASE"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic did not ship Opus 5 today. At 10:00 AM Pacific on June 9, it{' '}
          <a href="https://www.anthropic.com/news/claude-fable-5-mythos-5" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            announced
          </a>{' '}
          one frontier model wearing two names. Claude Fable 5 is the generally available product:
          API, Amazon Bedrock, Google Vertex, and Microsoft Foundry on day one, wrapped in always-on
          safety classifiers. Claude Mythos 5 is the same underlying model with the safeguards lifted
          in specific domains, and you cannot buy it. It goes to vetted cyberdefense partners under
          Project Glasswing, infrastructure providers, and US government coordination programs.
        </p>

        <p>
          The naming break is deliberate. &quot;Fable is from the Latin fabula, &apos;that which is
          told,&apos; akin to the Greek mythos,&quot; Anthropic wrote. The Claude 4.x family keeps
          shipping alongside it, and Opus 4.8 remains the default model everywhere. Fable 5 is a tier
          above, opt-in, and priced like it.
        </p>

        <p>
          I have read the announcement, the platform docs, and the launch-day coverage so you do not
          have to. The capabilities are real. So are the asterisks, and the asterisks are where the
          story lives.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What $10 In, $50 Out Buys You</h2>

        <p>
          Pricing first, because it frames everything: $10 per million input tokens, $50 per million
          output. That is exactly double <Link href="/models" className="text-accent-primary hover:underline">Opus 4.8</Link> at
          $5 and $25, and Anthropic notes it is less than half what Mythos Preview cost the handful of
          companies that touched it this spring. The 1M-token context window is the default, with no
          long-context surcharge. Compare GPT-5.5, which charges a premium above 272K input tokens.
          A 128K output ceiling per request rounds out the spec sheet.
        </p>

        <p>
          The model thinks whether you like it or not. Adaptive thinking is always on; sending{' '}
          <code className="text-sm bg-bg-secondary px-1.5 py-0.5 rounded">thinking: disabled</code>{' '}
          to the API returns a 400. You steer effort (low through max, default high) rather than
          toggling reasoning off. That is a first for an Anthropic flagship and it tells you what the
          model is for: long-horizon agentic work, not chat completions.
        </p>

        <p>
          The launch-day customer claims are aggressive. Stripe says Fable 5 worked through a
          50-million-line Ruby codebase migration and compressed months of engineering into days.
          Cursor&apos;s CEO called it &quot;the state of the art model on CursorBench&quot; and said it
          &quot;opened up a class of long-horizon problems out of reach.&quot; GitHub shipped it to
          Copilot the same morning. Vendor-curated quotes, yes. But the curation is unusually heavy on
          autonomy duration, which matches the spec choices.
        </p>

        <p>
          Consumer access has a clock on it. Fable 5 is included in Pro, Max, Team, and Enterprise
          plans through June 22, then moves to usage credits, with Anthropic saying it will restore
          standard-plan access as capacity allows. Demand, in its words, will be &quot;very high and
          difficult to predict.&quot; Our <Link href="/status" className="text-accent-primary hover:underline">live status board</Link> is
          tracking Anthropic&apos;s API health through the launch window; launch days are historically
          when probes earn their keep.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Benchmark Table Has Footnotes That Matter</h2>

        <p>
          The vendor table is a rout on paper. SWE-bench Pro: 80.3 percent against 69.2 for Opus 4.8,
          58.6 for GPT-5.5, and 54.2 for Gemini 3.1 Pro. FrontierCode Diamond, Cognition&apos;s
          hard-set: 29.3 percent where Opus 4.8 managed 13.4 and GPT-5.5 sits at 5.7. OSWorld-Verified
          computer use: 85.0 against GPT-5.5&apos;s 78.7. On GDPval-AA, the economically-weighted task
          ELO, Fable 5 posts 1932 to GPT-5.5&apos;s 1769.
        </p>

        <p>
          Now the footnotes. Several of the most-quoted numbers in today&apos;s coverage are starred
          in Anthropic&apos;s own table as Mythos 5 scores: Terminal-Bench 2.1 at 88.0, Humanity&apos;s
          Last Exam with tools at 64.5, ExploitBench at 78.0, HealthBench Professional at 66.0. Those
          are ceilings measured on the unrestricted model that vetted partners get. Public Fable 5
          routes flagged cyber and bio work to Opus 4.8 by design, so in exactly those domains the
          product you can buy performs at Opus level on purpose. Some outlets are quoting the starred
          rows as Fable 5 numbers without the caveat. They are not.
        </p>

        <p>
          Two more grains of salt. Every number above is vendor-reported as of today; independent
          replication does not exist yet, and our{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmark tracker</Link> will
          pick up third-party runs as they land. And the Terminal-Bench comparison is not
          apples-to-apples: GPT-5.5&apos;s 83.4 runs through its own Codex CLI harness. The harness
          gap is real and measurable; it is the entire premise of our{' '}
          <Link href="/harnesses" className="text-accent-primary hover:underline">cross-harness leaderboard</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">One Model, Two Products: How the Split Actually Works</h2>

        <p>
          The architecture is the news. Standalone classifiers watch every Fable 5 request for three
          things: offensive cybersecurity, biology and chemistry, and attempts to distill the
          model&apos;s capabilities. A flagged request does not get refused. It gets rerouted to
          Opus 4.8, mid-conversation if necessary. Anthropic says the classifiers trip in under 5
          percent of sessions and concedes they are tuned conservatively enough to catch harmless
          requests.
        </p>

        <p>
          Mythos 5 is the same weights without the leash, plus mandatory 30-day data retention for
          safety review on every request, which also means Fable 5 itself is unavailable under
          zero-data-retention agreements. CyberScoop&apos;s framing is the one that stuck with me:
          Mythos on a leash. The red-team numbers Anthropic published are strong: over 1,000 hours of
          internal and external testing, no universal jailbreaks found, zero compliance on single-turn
          cyberattack-planning prompts.
        </p>

        <p>
          Here is the omission I keep circling: no ASL tier. Every prior Anthropic frontier launch
          named its AI Safety Level designation under the Responsible Scaling Policy. The Fable 5
          materials describe protections consistent with ASL-3 or above without committing to a
          number. For a company whose public identity is the RSP, declining to name the tier on its
          most capable launch is a choice, and nobody covering the launch today has gotten a straight
          answer on it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Friction the Launch Post Skips</h2>

        <p>
          Three operational wrinkles deserve more attention than they got. First, billing: per the AWS
          launch documentation, when the safeguards reroute your request, you pay Opus 4.8 prices for
          the Opus-served response, and a mid-conversation reroute bills the early tokens at Fable
          rates and the rest at Opus rates. Your cost model now depends on a classifier&apos;s
          judgment. Agents budgeting per-call (ours included) should treat Fable 5 spend as a range,
          not a constant.
        </p>

        <p>
          Second, the distillation classifier is already the launch&apos;s loudest controversy.
          Builders report responses on frontier-LLM-development tasks being silently steered or
          degraded with no per-response notification, and the language from affected developers
          (&quot;terrible, nefarious&quot;) is the sharpest I have seen aimed at Anthropic in a while.
          Whatever the merits, silent modification of paid output is a trust problem that a settings
          page disclosure does not fully solve.
        </p>

        <p>
          Third, a gotcha straight from the Claude Code docs: the classifiers can trip on workspace
          context alone. A security-themed repository, a CLAUDE.md full of exploit terminology, or
          even directory names can bounce a session to Opus 4.8 before the user asks anything.
          Security teams, who are precisely the audience Project Glasswing courts, will hit this
          first and hardest.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Timing Is Not an Accident</h2>

        <p>
          Anthropic confidentially filed its S-1 on June 1 after a $65 billion Series H at a $965
          billion post-money valuation; OpenAI filed days later targeting a debut as early as
          September. We covered what that window does to lab behavior in{' '}
          <Link href="/originals/government-equity-stakes-ai-labs-ipo-window" className="text-accent-primary hover:underline">
            the government-equity piece
          </Link>{' '}
          last week. A flagship launch eight days after your S-1, on a date prediction markets had at
          94 percent beforehand, is a launch built for the roadshow narrative: we hold the frontier,
          and we hold it responsibly.
        </p>

        <p>
          TechCrunch&apos;s headline angle wrote itself: the most powerful public Claude shipped days
          after Anthropic warned that AI capabilities are getting dangerous enough to need exactly
          this kind of control. Both things can be true, and the two-product split is what holding
          both positions at once looks like as a shipped artifact. It also lands while Anthropic is{' '}
          <Link href="/originals/anthropic-maia-200-fourth-chip-inference" className="text-accent-primary hover:underline">
            negotiating a fourth silicon platform
          </Link>{' '}
          to serve exactly this kind of demand.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The split is the product. For three years the frontier labs have tried to serve one model to
          every customer and bolt policy on top with refusals. Anthropic just turned the policy layer
          into product segmentation: capability for everyone, dangerous capability for the vetted, and
          a classifier deciding which product you are talking to on a per-request basis. Expect the
          other labs to copy the structure within two quarters, because it solves their regulator
          problem and their enterprise problem in one move.
        </p>

        <p>
          What I cannot endorse is the silence in the seams. Silent reroutes that change your bill,
          silent steering of paid responses, and a missing ASL number are all the same failure: the
          governance is load-bearing but unannounced. Anthropic built the most legible safety
          architecture in the industry and then declined to label it. Say the tier. Flag the reroute
          in the response metadata. The trust cost of disclosure is always lower than the trust cost
          of discovery.
        </p>

        <p>
          Disclosure of our own, since today it is unusually direct: TensorFeed&apos;s editorial and
          engineering tooling runs on Claude models, including the model this article covers. Every
          number above is linked to its source so you can check the work without trusting either of
          us.
        </p>

        <p className="text-sm text-text-muted">
          Sources:{' '}
          <a href="https://www.anthropic.com/news/claude-fable-5-mythos-5" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            Anthropic announcement
          </a>
          ,{' '}
          <a href="https://platform.claude.com/docs/en/about-claude/models/overview" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            Claude platform docs
          </a>
          ,{' '}
          <a href="https://techcrunch.com/2026/06/09/anthropic-released-claude-fable-5-its-most-powerful-model-publicly-days-after-warning-ai-is-getting-too-dangerous/" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            TechCrunch
          </a>
          ,{' '}
          <a href="https://www.cnbc.com/2026/06/09/anthropic-mythos-claude-fable-5.html" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            CNBC
          </a>
          ,{' '}
          <a href="https://the-decoder.com/anthropic-releases-claude-fable-5-and-mythos-5-with-major-gains-in-coding-and-science/" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            The Decoder
          </a>
          ,{' '}
          <a href="https://aws.amazon.com/blogs/aws/anthropic-claude-fable-5-on-aws-mythos-class-capabilities-with-built-in-safeguards-now-available/" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            AWS launch blog
          </a>
          .
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-maia-200-fourth-chip-inference"
            className="block p-4 bg-bg-secondary border border-border rounded-lg hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary font-medium">
              Anthropic Is Negotiating a Fourth Chip. Claude Inference Just Stopped Being a Nvidia Story.
            </span>
          </Link>
          <Link
            href="/originals/government-equity-stakes-ai-labs-ipo-window"
            className="block p-4 bg-bg-secondary border border-border rounded-lg hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary font-medium">
              Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story.
            </span>
          </Link>
          <Link
            href="/originals/apple-gemini-siri-extensions-wwdc-2026"
            className="block p-4 bg-bg-secondary border border-border rounded-lg hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary font-medium">
              Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6 mt-8">
          <Link
            href="/originals"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Originals
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors"
          >
            Back to Feed
          </Link>
        </div>
      </footer>
    </article>
  );
}
