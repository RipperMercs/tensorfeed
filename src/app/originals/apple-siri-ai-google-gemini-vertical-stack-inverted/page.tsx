import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cloud } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/apple-siri-ai-google-gemini-vertical-stack-inverted',
  },
  title:
    "Apple's New Siri Is a Gemini Model on Google Cloud on Nvidia Chips. The Vertical Stack Just Inverted.",
  description:
    "At WWDC 2026 on June 8, Apple rebranded Siri to 'Siri AI' and confirmed that its hardest reasoning requests are served by a custom 1.2-trillion-parameter Gemini model running on Nvidia B200 GPUs inside Google Cloud, on a multi-year deal worth roughly $1 billion a year. The on-device tier still runs on Apple Silicon and Apple's own foundation models, but the cloud tier, where the new capabilities actually live, is three external dependencies stacked: Google's model, Google's data centers, Nvidia's silicon. Apple, the most vertically integrated company in tech, just rented the deepest part of its newest product line. The Extensions framework that lets users swap in Claude, ChatGPT, or Grok is the hedge. Inside the structural admission, what $1 billion a year actually buys, and why this is the most expensive 'we cannot ship our own frontier model' headline of the year.",
  openGraph: {
    title:
      "Apple's New Siri Is a Gemini Model on Google Cloud on Nvidia Chips. The Vertical Stack Just Inverted.",
    description:
      "Apple rented the deepest layer of its newest product line. Siri AI runs a custom 1.2T Gemini model on Nvidia B200 in Google Cloud at about $1B a year. The structural admission and what it does to the rest of the stack.",
    type: 'article',
    publishedTime: '2026-06-09T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Apple's New Siri Runs on Google's Model, Google's Cloud, Nvidia's Chips.",
    description:
      "WWDC 2026: Siri AI's cloud tier is a custom 1.2T Gemini model on Nvidia B200 inside Google Cloud, roughly $1B a year. The vertical stack inverted.",
  },
};

export default function AppleSiriAiGoogleGeminiVerticalStackInvertedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Apple's New Siri Is a Gemini Model on Google Cloud on Nvidia Chips. The Vertical Stack Just Inverted."
        description="At WWDC 2026 on June 8, Apple confirmed that 'Siri AI' routes its heavy reasoning requests to a custom 1.2-trillion-parameter Gemini model running on Nvidia B200 GPUs in Google Cloud, on a multi-year deal worth about $1 billion a year. The vertical-integration story Apple has told for two decades just inverted at the layer that defines the next decade of product."
        datePublished="2026-06-09"
        author="Marcus Chen"
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
          Apple&apos;s New Siri Is a Gemini Model on Google Cloud on Nvidia Chips. The Vertical Stack Just Inverted.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-06-09">June 9, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/apple-siri-ai-google-gemini-vertical-stack-inverted"
        title="Apple's New Siri Is a Gemini Model on Google Cloud on Nvidia Chips. The Vertical Stack Just Inverted."
      />

      <ArticleHero
        mode="graphic"
        icon={Cloud}
        gradientFrom="#1f2937"
        gradientTo="#2563eb"
        eyebrow="Markets &middot; AI Infrastructure"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Tim Cook walked on stage at Apple Park on Monday, June 8, and shipped the most expensive
          admission of the year. The new Siri, now rebranded &quot;Siri AI,&quot; routes its hardest
          requests to a custom 1.2-trillion-parameter Gemini model. The model runs on Nvidia
          Blackwell B200 GPUs. The B200s sit inside Google Cloud data centers, under Apple&apos;s
          Private Cloud Compute envelope. The deal, signed in January and confirmed across multiple
          outlets, is worth roughly $1 billion a year on a multi-year term.
        </p>

        <p>
          Read that sentence again and notice what is missing. The model is not Apple&apos;s. The
          data center is not Apple&apos;s. The silicon at the bottom of the stack is not
          Apple&apos;s either. The most vertically integrated company in tech just rented the three
          deepest layers of its newest product line.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What WWDC actually shipped
        </h2>

        <p>
          The keynote framed it as a three-tier privacy architecture, and on the privacy framing it
          is genuinely thoughtful. The on-device tier still runs on Apple Silicon and Apple&apos;s
          own next-generation foundation models, handling expressive voices, dictation, on-screen
          awareness, and personal-context lookups against email, messages, and calendar. The middle
          tier is Apple&apos;s Private Cloud Compute, the hardware-isolated, attested-build Apple
          Silicon enclaves the company introduced in 2024. The top tier is the part that is new:
          when a request needs world knowledge or harder reasoning, it leaves Apple infrastructure
          entirely and lands on the custom Gemini model inside Google Cloud, on B200 GPUs running
          Nvidia&apos;s confidential-computing mode so the working memory is encrypted under
          hardware attestation.
        </p>

        <p>
          The second product Apple shipped is the Extensions framework, the user-facing piece we
          covered when Apple{' '}
          <Link
            href="/originals/apple-intelligence-extensions-ios-27"
            className="text-accent-primary hover:underline"
          >
            opened Siri to Claude, Gemini, and ChatGPT in early May
          </Link>
          . That framework is now live in iOS 27, iPadOS 27, and macOS 27 betas. A user can set
          Claude, ChatGPT, Gemini, or Grok as the default assistant across Siri, Writing Tools, and
          Image Playground. The Extensions tier sits parallel to Siri AI, not underneath it.
          Anthropic, OpenAI, and xAI all get distribution to roughly a billion devices through it.
        </p>

        <p>
          The third announcement, almost lost in the shuffle, is a standalone Siri app with an
          iMessage-style chat surface, scheduled for the fall release alongside iOS 27.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The numbers Apple agreed to
        </h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Annual licensing cost</td>
                <td className="px-4 py-3 font-mono">~$1B/yr</td>
                <td className="px-4 py-3">Custom Gemini license + Google Cloud capacity, multi-year</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Custom model size</td>
                <td className="px-4 py-3 font-mono">1.2T params</td>
                <td className="px-4 py-3">About 8x Apple&apos;s ~150B cloud foundation model</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Cloud silicon</td>
                <td className="px-4 py-3 font-mono">Nvidia B200</td>
                <td className="px-4 py-3">Not Google TPU, not Apple Silicon, in Google data centers</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Privacy mechanism</td>
                <td className="px-4 py-3 font-mono">PCC + B200 CC</td>
                <td className="px-4 py-3">Private Cloud Compute envelope, Nvidia confidential computing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Public beta window</td>
                <td className="px-4 py-3 font-mono">July 2026</td>
                <td className="px-4 py-3">Fall 2026 launch alongside iOS 27</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The single most interesting line in that table is the silicon. Google has spent the last
          year telling the rest of the industry that TPU economics undercut Nvidia by something like
          40 to 50 percent on equivalent capacity. That framing is the entire premise of{' '}
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="text-accent-primary hover:underline"
          >
            the $200 billion Anthropic TPU contract we wrote up in May
          </Link>
          . Yet Apple&apos;s Siri AI, the highest-profile Gemini workload Google has ever sold, is
          running on Nvidia B200, not TPU. That is either Apple insisting on Nvidia for parity with
          internal benchmarks, or Google needing to ship faster than the next TPU generation can
          deliver at this volume. Either way, the headline customer for Google&apos;s headline cloud
          deal is paying for Nvidia silicon, and that is a number Jensen Huang gets to put on the
          next investor call.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The vertical stack, inverted
        </h2>

        <p>
          Apple&apos;s identity for two decades has been the company that owns its stack end to end.
          M-series silicon, the OS, the SDKs, the App Store, the services. The pitch to investors
          and to users has always been that integration is the moat, that the parts work together
          because Apple made the parts. Siri AI breaks that script at the layer that is going to
          define the next decade of product.
        </p>

        <p>
          The reverse-vertical pattern matters because it sets a precedent for how the rest of the
          industry now reads Apple&apos;s position. Microsoft just spent Build telling everyone it
          is building seven in-house MAI models so it can serve more Copilot traffic{' '}
          <Link
            href="/originals/microsoft-mai-models-openai-independence"
            className="text-accent-primary hover:underline"
          >
            without paying a third party
          </Link>
          . Amazon is doing the same with Trainium and the Nova model family. Google has TPU and
          Gemini. Meta is shipping Llama on its own clusters. Apple, alone among the hyperscalers
          and platform companies, is signing a billion-a-year check to a competitor to be the brain
          of its flagship consumer product. The shape of that decision tells you Apple believed it
          could not catch up on its own foundation model curve in the WWDC window, and that
          believing it harder would have shipped nothing.
        </p>

        <p>
          The Extensions framework is the hedge. If Gemini disappoints, a user can flip to Claude or
          ChatGPT and Siri keeps working. That hedging is real, and it is also the tell. A company
          that fully trusted its core integration would not need a one-click user-facing switch to
          replace the brain.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What $1 billion a year actually buys
        </h2>

        <p>
          The number is small relative to Apple&apos;s roughly $400 billion in annual revenue, and
          small relative to the $30 billion Apple spends on R&amp;D. As a percentage of either, $1
          billion a year is a rounding error. But that is not the right denominator. The right one
          is what it would have cost Apple to ship a comparable model itself in the same window,
          and on that math the number is plausibly a bargain.
        </p>

        <p>
          A frontier-tier training run at the 1T-plus parameter scale costs somewhere between $1.5
          and $4 billion in raw compute, ignoring research salaries and data pipelines. To stand up
          a steady cadence of those, Apple would need to recruit a 500-plus person frontier
          research team it has been famously bad at retaining, secure roughly 10 to 20 gigawatts of
          training and inference capacity that does not exist on the buildout calendar until 2027,
          and absorb a two to three year ramp before the product caught the frontier. $1 billion a
          year buys Apple the model now and the option to walk in two to three years if its own
          foundation team finally lands. That is not a cheap deal. It is a sane one.
        </p>

        <p>
          The catch is the option value running the other direction. Google now has a multi-year
          commercial relationship with Apple at the most strategic possible layer. The contract
          encodes capacity, latency, and roadmap commitments. By the time Apple is in a position to
          swap Gemini out, the engineering tax of doing so against a model the iPhone is tuned for,
          on an inference graph that has been hardened against a billion-device traffic pattern,
          will be measured in years and billions of dollars. The switching cost grows every quarter.
          That is the part of the deal that did not make it into the keynote.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The second-order effects
        </h2>

        <p>
          Three things move because of this deal that did not move yesterday.
        </p>

        <p>
          One, Google&apos;s case as the &quot;quiet hyperscaler&quot; on AI infrastructure gets a
          consumer-scale validation. The Anthropic TPU contract said Google could service a frontier
          training and inference workload. The Apple contract says Google can service a billion-user
          consumer assistant on a model it designed. The cloud sales pitch around Gemini just
          changed shape, and the implicit multiple on Google Cloud changed with it.
        </p>

        <p>
          Two, Nvidia&apos;s data-center revenue line gets a long-tenor consumer-AI floor that does
          not depend on a single frontier lab&apos;s capex curve. The B200 install base attached to
          Siri AI is not training a moonshot; it is serving steady consumer inference for the
          installed iPhone base. That demand is more durable than a training cluster and less
          vulnerable to a depreciation argument like the one{' '}
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="text-accent-primary hover:underline"
          >
            Burry is pressing on the hyperscalers
          </Link>
          . If you wanted a counter-example to the bubble framing, an Apple consumer workload on
          B200 priced into a multi-year contract is a good one.
        </p>

        <p>
          Three, the Extensions market just became a real distribution surface for Anthropic,
          OpenAI, and xAI. The default-assistant slot inside Siri reaches roughly a billion devices.
          The labs do not get the system-prompt slot Gemini gets for free, but they get a one-click
          user pathway that no other platform has shipped at this scale. The companies that have
          been complaining for years that Google and Apple control discovery just got a real
          distribution lever, on Apple&apos;s terms.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Apple did the right thing for the product, and the right thing for the product is the
          wrong thing for the brand. Shipping a competitive Siri this year required renting Gemini.
          Renting Gemini means Apple&apos;s flagship AI experience is now structurally dependent on
          a company it competes with in mobile, search, and advertising. The privacy architecture
          is genuinely good, and the on-device tier preserves the most sensitive interactions on
          Apple Silicon. The cloud tier, where the new capabilities live, is on someone else&apos;s
          stack from chip to model.
        </p>

        <p>
          The trade I would watch for is not whether Apple ships its own 1T-plus foundation model
          in 2027 or 2028. The trade is whether Apple uses Extensions to quietly migrate Siri
          AI&apos;s default-routing logic toward whichever third-party model wins on per-query cost,
          and turns the Gemini contract into a price ceiling rather than a brain. If Extensions
          becomes the routing layer and Siri AI becomes the orchestration layer, Apple ends up
          owning the agent runtime even if it never wins the model wars. That is a longer game, and
          it is the only one consistent with how Apple has historically caught up to a market it
          entered late.
        </p>

        <p>
          We track the providers behind this on the{' '}
          <Link href="/providers/google" className="text-accent-primary hover:underline">
            Google
          </Link>
          ,{' '}
          <Link href="/providers/anthropic" className="text-accent-primary hover:underline">
            Anthropic
          </Link>
          , and{' '}
          <Link href="/providers/openai" className="text-accent-primary hover:underline">
            OpenAI
          </Link>{' '}
          pages, and the pricing surface the labs will compete on inside Extensions on{' '}
          <Link href="/model-wars" className="text-accent-primary hover:underline">
            model wars
          </Link>
          . The next data point to watch is the iOS 27 public beta in July: whether the default
          routing inside Siri AI is hard-coded to Gemini for cloud queries, or whether Apple quietly
          exposes a load-balancing dial that admits the brain was always going to be plural.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/apple-intelligence-extensions-ios-27"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Apple Just Opened Siri to Claude and Gemini. ChatGPT&apos;s Exclusivity Is Dead.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.
            </span>
          </Link>
          <Link
            href="/originals/microsoft-mai-models-openai-independence"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Microsoft Shipped Seven of Its Own Models. The One That Counts Lives Inside Copilot.
            </span>
          </Link>
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.
            </span>
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
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
