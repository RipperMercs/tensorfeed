import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/claude-opus-5-same-price-half-of-fable' },
  title: 'Anthropic Shipped Opus 5 at the Old Opus Price. It Beats Fable 5 on Most Rows for Half the Money.',
  description:
    "Claude Opus 5 landed July 24, 2026 at $5/$25 per 1M tokens, the exact price of Opus 4.8 and half of Fable 5. On Anthropic's own launch table it takes seven of the eleven rows where both it and Fable 5 report a number, while Anthropic still calls Fable 5 the top capability tier. The gains over 4.8 are free in dollar terms, but three API defaults changed and two of them break working 4.8 code.",
  openGraph: {
    title: 'Anthropic Shipped Opus 5 at the Old Opus Price. It Beats Fable 5 on Most Rows for Half the Money.',
    description:
      "Opus 5 costs what Opus 4.8 cost and half what Fable 5 costs, and it outscores Fable 5 on seven of eleven comparable rows. Here is what the launch table actually says, and the three API changes that break a 4.8 port.",
    type: 'article',
    publishedTime: '2026-07-24T17:00:00Z',
    authors: ['Adrian Vale'],
    images: [{ url: 'https://tensorfeed.ai/originals/claude-opus-5-same-price-half-of-fable/hero.jpg', width: 1600, height: 900 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anthropic Shipped Opus 5 at the Old Opus Price.',
    description:
      'Opus 5 is $5/$25, identical to Opus 4.8 and half of Fable 5, and it outscores Fable 5 on seven of eleven comparable rows.',
  },
};

export default function ClaudeOpus5SamePriceHalfOfFablePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic Shipped Opus 5 at the Old Opus Price. It Beats Fable 5 on Most Rows for Half the Money."
        description="Claude Opus 5 launched July 24, 2026 at $5/$25 per 1M tokens, identical to Opus 4.8 and half the Fable 5 rate, and it outscores Fable 5 on seven of the eleven rows where both report a comparable number."
        datePublished="2026-07-24"
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

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Anthropic Shipped Opus 5 at the Old Opus Price. It Beats Fable 5 on Most Rows for Half the Money.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-07-24">July 24, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            8 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/claude-opus-5-same-price-half-of-fable"
        title="Anthropic Shipped Opus 5 at the Old Opus Price. It Beats Fable 5 on Most Rows for Half the Money."
      />

      <ArticleHero
        src="/originals/claude-opus-5-same-price-half-of-fable/hero.jpg"
        alt="Anthropic's Claude Opus 5 launch comparison table showing Opus 5, Fable 5, Opus 4.8, and GPT-5.6 Sol scores across agentic coding, knowledge work, novel problem-solving, agentic search, multidisciplinary reasoning, and computer use"
        caption="Anthropic's launch table for Claude Opus 5. The Opus 5 column is highlighted; every figure on it is vendor-reported."
        credit="Anthropic"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Anthropic released Claude Opus 5 today. The API id is{' '}
          <code className="text-base">claude-opus-5</code>, it carries a 1 million token context
          window, and it costs $5 per million input tokens and $25 per million output.
        </p>

        <p>
          That last number is the story, and it is worth stating plainly because the default
          assumption about a new Opus tier is wrong here. Opus 5 does not cost more than Opus 4.8.
          It costs exactly the same. Every benchmark gain in this release is free in dollar terms,
          which is not how the last several frontier launches went. GPT-5.5 doubled OpenAI&apos;s
          price when it landed in April. Fable 5 arrived in June at $10 and $50, double the Opus
          rate. Opus 5 holds the line.
        </p>

        <p>
          It also lands at exactly half of Fable 5. And on Anthropic&apos;s own launch table, it
          beats Fable 5 on most of the rows they chose to publish.
        </p>

        <h2 className="text-2xl font-bold text-text-primary mt-10 mb-4">
          What actually changed against Opus 4.8
        </h2>

        <p>
          The generational comparison is lopsided in a way that benchmark tables usually are not.
          These are Anthropic&apos;s numbers, not independent runs, so treat them as vendor-reported
          until someone reproduces them. With that caveat in place:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Benchmark</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Opus 4.8</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Opus 5</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">ARC-AGI-3 (novel problem-solving)</td>
                <td className="px-4 py-3">1.5%</td>
                <td className="px-4 py-3">30.2%</td>
                <td className="px-4 py-3">20x</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Frontier-Bench v0.1 (agentic terminal coding)</td>
                <td className="px-4 py-3">21.1%</td>
                <td className="px-4 py-3">43.3%</td>
                <td className="px-4 py-3">2.1x</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OSWorld 2.0 (computer use)</td>
                <td className="px-4 py-3">55.7%</td>
                <td className="px-4 py-3">70.6%</td>
                <td className="px-4 py-3">+14.9 pts</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AutomationBench (business workflows)</td>
                <td className="px-4 py-3">17.0%</td>
                <td className="px-4 py-3">26.0%</td>
                <td className="px-4 py-3">+9.0 pts</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSWE v1.1 (agentic coding)</td>
                <td className="px-4 py-3">59.0%</td>
                <td className="px-4 py-3">68.8%</td>
                <td className="px-4 py-3">+9.8 pts</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GDPval-AA v2 (knowledge work)</td>
                <td className="px-4 py-3">1593</td>
                <td className="px-4 py-3">1861</td>
                <td className="px-4 py-3">+268 ELO</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">BrowseComp (agentic search)</td>
                <td className="px-4 py-3">84.3%</td>
                <td className="px-4 py-3">90.8%</td>
                <td className="px-4 py-3">+6.5 pts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The ARC-AGI-3 row is the one to sit with. Opus 4.8 scored 1.5 percent, which is noise.
          Opus 5 scores 30.2. That is not an increment on an existing capability, it is a capability
          the previous model did not have. ARC-AGI is specifically designed to resist memorization,
          so a jump of that shape is either a real change in how the model generalizes or a
          contamination story, and only independent replication settles which.
        </p>

        <p>
          The computer-use jump matters more commercially. Fifteen points on OSWorld 2.0 is the
          difference between a GUI agent that needs a human watching it and one that can be left
          alone for a task. If you shelved a computer-use pilot in the spring because the success
          rate did not clear your bar, this is the release that justifies re-running it, and it
          costs the same per token as the model that failed.
        </p>

        <h2 className="text-2xl font-bold text-text-primary mt-10 mb-4">
          The awkward part: it outscores the model that costs twice as much
        </h2>

        <p>
          Anthropic still describes Fable 5 as its highest-capability tier. The launch table does
          not really support that at the row level.
        </p>

        <p>
          Across the eleven rows where both Opus 5 and Fable 5 report a directly comparable number,
          Opus 5 posts the higher score on seven and Fable 5 on four. Two of Fable 5&apos;s four
          wins are inside two tenths of a point, which is not a difference anyone should make a
          purchasing decision on.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Row</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Opus 5 ($5/$25)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Fable 5 ($10/$50)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Takes it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AutomationBench</td>
                <td className="px-4 py-3">26.0%</td>
                <td className="px-4 py-3">17.4%</td>
                <td className="px-4 py-3">Opus 5, by 8.6</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Frontier-Bench v0.1</td>
                <td className="px-4 py-3">43.3%</td>
                <td className="px-4 py-3">33.7%</td>
                <td className="px-4 py-3">Opus 5, by 9.6</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OSWorld 2.0</td>
                <td className="px-4 py-3">70.6%</td>
                <td className="px-4 py-3">66.1%</td>
                <td className="px-4 py-3">Opus 5, by 4.5</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">BrowseComp</td>
                <td className="px-4 py-3">90.8%</td>
                <td className="px-4 py-3">87.4%</td>
                <td className="px-4 py-3">Opus 5, by 3.4</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GDPval-AA v2</td>
                <td className="px-4 py-3">1861</td>
                <td className="px-4 py-3">1747</td>
                <td className="px-4 py-3">Opus 5, by 114</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">BioMysteryBench (hard)</td>
                <td className="px-4 py-3">49.4%</td>
                <td className="px-4 py-3">46.5%</td>
                <td className="px-4 py-3">Opus 5, by 2.9</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Humanity&apos;s Last Exam (tools)</td>
                <td className="px-4 py-3">64.7%</td>
                <td className="px-4 py-3">63.9%</td>
                <td className="px-4 py-3">Opus 5, by 0.8</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Legal Agent Benchmark</td>
                <td className="px-4 py-3">11.7%</td>
                <td className="px-4 py-3">13.3%</td>
                <td className="px-4 py-3">Fable 5, by 1.6</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSWE v1.1</td>
                <td className="px-4 py-3">68.8%</td>
                <td className="px-4 py-3">69.7%</td>
                <td className="px-4 py-3">Fable 5, by 0.9</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Humanity&apos;s Last Exam (no tools)</td>
                <td className="px-4 py-3">56.3%</td>
                <td className="px-4 py-3">56.5%</td>
                <td className="px-4 py-3">Fable 5, by 0.2</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">FrontierCode v1.1 (Main)</td>
                <td className="px-4 py-3">53.4%</td>
                <td className="px-4 py-3">53.5%</td>
                <td className="px-4 py-3">Fable 5, by 0.1</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two more rows appear on the chart and are not in that table, because they are not
          comparable. On HealthBench Professional and the human-solved split of BioMysteryBench, the
          Fable column reports a Mythos 5 number rather than a Fable 5 one. Mythos 5 is the
          safeguards-lifted variant available only through Project Glasswing, so those ceilings are
          not something a normal customer can buy. We excluded them here for the same reason we
          excluded them from the Fable 5 rows in{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">
            our benchmark data
          </Link>{' '}
          back in June.
        </p>

        <p>
          So what is Fable 5 for now? On this evidence, a narrow set: legal agent work, and coding
          pipelines where a sub-point edge on DeepSWE or FrontierCode is worth paying double. That
          is a real but thin argument. Anthropic&apos;s tier language and Anthropic&apos;s own
          published numbers are pulling in different directions, and customers will notice, because
          the finance team reads the price sheet even when the engineering team reads the tier
          chart.
        </p>

        <h2 className="text-2xl font-bold text-text-primary mt-10 mb-4">
          Three API changes, two of which break working code
        </h2>

        <p>
          The upgrade is free. The port is not. Three defaults changed against Opus 4.8, and only
          one of them is purely good news.
        </p>

        <p>
          <strong className="text-text-primary">Thinking is now on by default.</strong> On Opus 4.8,
          omitting the <code className="text-base">thinking</code> parameter meant no thinking. On
          Opus 5 the same request runs adaptive thinking. This is a silent cost and truncation
          change, not just a behavior one, because{' '}
          <code className="text-base">max_tokens</code> caps thinking plus response text together. A
          route that never set <code className="text-base">thinking</code> and sized{' '}
          <code className="text-base">max_tokens</code> tightly around its answer can now truncate
          mid-response. Nothing errors. You just get worse output and a larger bill.
        </p>

        <p>
          <strong className="text-text-primary">Disabling thinking is capped at high effort.</strong>{' '}
          Passing <code className="text-base">thinking: disabled</code> alongside{' '}
          <code className="text-base">xhigh</code> or <code className="text-base">max</code> effort
          returns a 400. Opus 4.8 accepted that combination, so any latency-sensitive route built on
          it fails outright rather than degrading. The check runs per request, so a call that raises
          effort later in a conversation is rejected even though earlier calls succeeded.
        </p>

        <p>
          <strong className="text-text-primary">The prompt cache minimum halved.</strong> Opus 5
          caches prompts from 512 tokens, down from 1024 on Opus 4.8. This is the free one: prompts
          that were previously too short to cache now create entries with no code change at all.
          Worth re-checking anything you wrote off as uncacheable.
        </p>

        <p>
          Two smaller operational notes. Opus 5 draws on its own rate-limit pool rather than the
          shared Opus 4.x bucket, so shifting traffic across neither frees headroom on the old pool
          nor inherits it, and capacity planning needs redoing. And Priority Tier does not cover
          Opus 5 at all, which is a genuine regression for anyone who bought Priority capacity
          against 4.8.
        </p>

        <h2 className="text-2xl font-bold text-text-primary mt-10 mb-4">Where it runs</h2>

        <p>
          Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry at launch. Bedrock uses the
          prefixed id <code className="text-base">anthropic.claude-opus-5</code>. Fast mode is
          available on the Claude API only, priced at $10 and $50, which is to say fast mode on Opus
          5 costs what Fable 5 costs at standard speed.
        </p>

        <p>
          Opus 5 also carries elevated cybersecurity safeguards, which means classifiers can decline
          a request and return a successful response with a refusal stop reason rather than an error.
          Code that reads the first content block without checking the stop reason will break on
          those. Anthropic shipped a server-side fallback option in the same release that reruns a
          declined request on another model automatically, and cyber-category refusals route to Opus
          4.8. If you are building anything adjacent to security tooling, wire that up on day one
          rather than after the first incident.
        </p>

        <h2 className="text-2xl font-bold text-text-primary mt-10 mb-4">What we are watching</h2>

        <p>
          <strong className="text-text-primary">Whether the ARC-AGI-3 number survives contact.</strong>{' '}
          A jump from 1.5 to 30.2 on a benchmark built to resist memorization is the single most
          consequential claim in this release. Independent replication settles it, and nothing else
          will.
        </p>

        <p>
          <strong className="text-text-primary">Whether Fable 5 gets repriced.</strong> A top tier
          that costs double and loses seven of eleven published rows is not a stable position. Either
          Fable 5 comes down, or Anthropic publishes the evaluations where its lead is real.
        </p>

        <p>
          <strong className="text-text-primary">Whether SWE-bench shows up.</strong> Anthropic&apos;s
          table leans on Frontier-Bench, DeepSWE, and FrontierCode, and does not include a SWE-bench
          Verified number for Opus 5. Fable 5 launched with one. The omission may be nothing, but
          SWE-bench is the number most teams still benchmark against, and its absence from a coding-
          focused launch table is conspicuous.
        </p>

        <p>
          For the live pricing and spec comparison, see{' '}
          <Link href="/models/claude-opus-5" className="text-accent-primary hover:underline">
            Claude Opus 5
          </Link>
          , or the head-to-head breakdowns against{' '}
          <Link href="/compare/claude-opus-5-vs-claude-opus-4-8" className="text-accent-primary hover:underline">
            Opus 4.8
          </Link>{' '}
          and{' '}
          <Link href="/compare/claude-opus-5-vs-claude-fable-5" className="text-accent-primary hover:underline">
            Fable 5
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
