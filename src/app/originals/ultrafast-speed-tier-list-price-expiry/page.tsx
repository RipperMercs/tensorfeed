import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Gauge } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/ultrafast-speed-tier-list-price-expiry',
  },
  title:
    'OpenAI Shipped a Product With No Price. Almost Every Headline Rate This Week Has an Expiry Date.',
  description:
    'OpenAI previewed Ultrafast on August 13: GPT-5.6 Sol at up to 750 output tokens per second on Cerebras, up to 14x Standard, with no price, no date, and no model ID. In the same week Gemini 3.7 Flash launched at half price until December 31, Grok 4.6 kept its rate but doubles it above 200K tokens, Claude Sonnet 5 reverts on August 31, and DeepSeek warned of an unspecified increase.',
  openGraph: {
    title:
      'OpenAI Shipped a Product With No Price. Almost Every Headline Rate This Week Has an Expiry Date.',
    description:
      'Latency became a purchasable SKU this week and the list price stopped being a number you can plan against. Inside the expiry table, the speed table, and the implied 54 tokens per second baseline nobody published.',
    type: 'article',
    publishedTime: '2026-08-15T12:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAI Shipped a Product With No Price',
    description:
      'Ultrafast runs GPT-5.6 Sol at up to 750 tok/s with no published rate. Four other headline prices this week expire on a calendar date or a token threshold.',
  },
};

export default function UltrafastSpeedTierListPriceExpiryPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI Shipped a Product With No Price. Almost Every Headline Rate This Week Has an Expiry Date."
        description="OpenAI previewed Ultrafast mode on August 13, 2026, running GPT-5.6 Sol at up to 750 output tokens per second on Cerebras hardware with no published price, no GA date, and no model ID. The same week produced four other headline prices that expire on a date or a token threshold."
        datePublished="2026-08-15"
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
          OpenAI Shipped a Product With No Price. Almost Every Headline Rate This Week Has an
          Expiry Date.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-08-15">August 15, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ultrafast-speed-tier-list-price-expiry"
        title="OpenAI Shipped a Product With No Price. Almost Every Headline Rate This Week Has an Expiry Date."
      />

      <ArticleHero
        mode="graphic"
        icon={Gauge}
        gradientFrom="#0B1120"
        gradientTo="#4C1D95"
        eyebrow="Inference Economics &middot; Pricing"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          On Thursday, August 13, OpenAI previewed a new API service tier called Ultrafast. It runs
          GPT-5.6 Sol, the same weights and the same intelligence as the Standard tier, at a claimed
          750 output tokens per second, which OpenAI describes as up to 14 times faster than
          Standard processing. Cerebras is underneath it.
        </p>

        <p>
          There is no price. There is no GA date. As of this writing there is not even a model ID
          string you could put in a config file. A small set of customers across coding, financial
          research, voice AI, and e-commerce got access, and OpenAI said access expands as capacity
          grows.
        </p>

        <p>
          I have been staring at that missing number for two days and I have decided it is the most
          honest thing anyone published this week. Not because OpenAI meant it that way, but because
          it accidentally admits what the rest of the week&apos;s pricing news was working hard to
          disguise: the list price on a frontier API has stopped being a number you can plan
          against.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What Ultrafast Actually Is
        </h2>

        <p>
          The mechanism is not mysterious and it is not a model change. Cerebras builds a
          wafer-sized processor with roughly 44 GB of SRAM directly on chip, which means the weights
          for a served model can sit in on-chip memory rather than being pulled across a memory bus
          on every forward pass. GPU inference at frontier scale is bandwidth bound far more than it
          is compute bound. Remove the bus and the token rate moves in a way no amount of batching
          on conventional hardware reproduces.
        </p>

        <p>
          This is the payoff on a deal signed in January. OpenAI contracted for 750 megawatts of
          Cerebras inference capacity delivered in stages through 2028. Reuters put it above $10
          billion at signing; Cerebras later told investors the agreement exceeds $20 billion, and
          the structure includes warrants for roughly 10 percent of Cerebras plus about $1 billion
          in working capital from OpenAI to help build the sites OpenAI then rents. We wrote about
          the wafer-scale architecture bet{' '}
          <Link
            href="/originals/wafer-scale-vs-gpu-what-cerebras-sells"
            className="text-accent-primary hover:underline"
          >
            back when it was still a thesis
          </Link>
          . Ultrafast is the first consumer-visible product to come out of it.
        </p>

        <p>
          One number nobody published: the baseline. If Ultrafast tops out at 750 tokens per second
          and that is up to 14 times Standard, the implied Standard rate is somewhere around 54
          tokens per second. Both figures carry an &quot;up to&quot; so dividing them is an
          inference rather than a measurement, and I want to flag that rather than launder it. But
          if it is roughly right, it tells you something uncomfortable about what you have been
          paying $30 per million output tokens for.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Expiry Column Is the Article
        </h2>

        <p>
          Now put Ultrafast next to everything else that moved in the last ten days. I am adding a
          column most pricing tables leave off.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Headline (in / out per 1M)
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  What Happens Next
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  GPT-5.6 Sol Ultrafast
                </td>
                <td className="px-4 py-3 font-mono">not published</td>
                <td className="px-4 py-3 text-text-secondary">
                  Limited preview, no rate, no date
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.7 Flash</td>
                <td className="px-4 py-3 font-mono">$0.75 / $3.75</td>
                <td className="px-4 py-3 text-text-secondary">
                  Doubles to $1.50 / $7.50 on Jan 1, 2027
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.6</td>
                <td className="px-4 py-3 font-mono">$2.00 / $6.00</td>
                <td className="px-4 py-3 text-text-secondary">
                  Whole request rebills at $4 / $12 past 200K tokens
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 5</td>
                <td className="px-4 py-3 font-mono">intro rate</td>
                <td className="px-4 py-3 text-text-secondary">
                  Reverts to $3 / $15 on Aug 31, 2026
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSeek V4 Pro</td>
                <td className="px-4 py-3 font-mono">$0.435 / $0.87</td>
                <td className="px-4 py-3 text-text-secondary">
                  Increase announced Aug 6, amount and date unspecified
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol Standard</td>
                <td className="px-4 py-3 font-mono">$5.00 / $30.00</td>
                <td className="px-4 py-3 text-text-secondary">Unchanged</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          One stable rate in the group, and it belongs to the most expensive model on the list.
          Everything else is either promotional, threshold-triggered, expiring on a calendar date,
          or unannounced. Gemini 3.7 Flash is genuinely half the price of its three-week-old
          predecessor, and it is half price for 138 days. Grok 4.6 held its rate at $2 and $6, and
          the moment your agent&apos;s context crosses 200K the entire request rebills at double,
          which for long-horizon agent work is not an edge case, it is Tuesday.
        </p>

        <p>
          You can check any of this against live rates on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            models tracker
          </Link>{' '}
          and run your own token mix through the{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">
            cost calculator
          </Link>
          . Please do, because a spreadsheet built on any of the five rates above is a spreadsheet
          with a fuse in it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Axis Moved and Nobody Announced It
        </h2>

        <p>
          For three years the competitive question was dollars per million tokens. That question is
          quietly dying, and this week is where I would date the certificate. Here is the same set
          of models on the two axes that are replacing it.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Output speed
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  AA Intelligence Index
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  GPT-5.6 Sol Ultrafast
                </td>
                <td className="px-4 py-3 font-mono text-accent-primary font-semibold">
                  up to 750 tok/s
                </td>
                <td className="px-4 py-3 font-mono">61</td>
                <td className="px-4 py-3 text-text-secondary">Vendor / AA</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.7 Flash</td>
                <td className="px-4 py-3 font-mono">~340 tok/s</td>
                <td className="px-4 py-3 font-mono">56</td>
                <td className="px-4 py-3 text-text-secondary">AA</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.6</td>
                <td className="px-4 py-3 font-mono">not measured here</td>
                <td className="px-4 py-3 font-mono">61</td>
                <td className="px-4 py-3 text-text-secondary">AA</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Opus 5</td>
                <td className="px-4 py-3 font-mono">not measured here</td>
                <td className="px-4 py-3 font-mono">63</td>
                <td className="px-4 py-3 text-text-secondary">AA</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Fable 5</td>
                <td className="px-4 py-3 font-mono">not measured here</td>
                <td className="px-4 py-3 font-mono">62</td>
                <td className="px-4 py-3 text-text-secondary">AA</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  GPT-5.6 Sol Standard
                </td>
                <td className="px-4 py-3 font-mono">~54 tok/s (implied)</td>
                <td className="px-4 py-3 font-mono">61</td>
                <td className="px-4 py-3 text-text-secondary">Derived</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Look at the top and bottom rows. Same model. Same intelligence score. A speed difference
          large enough that Artificial Analysis has started publishing time per task alongside
          capability, and Gemini 3.7 Flash&apos;s headline achievement is not a benchmark at all,
          it is sitting on the Pareto frontier of intelligence against wall-clock time at 1.7
          minutes per task.
        </p>

        <p>
          When two SKUs share weights and differ only in latency, you are no longer buying tokens.
          You are buying time, and time does not have a natural per-million unit. That is why the
          price is missing. It is not an oversight. It is a category problem OpenAI has not solved
          yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Case That This Is Great, Made Properly
        </h2>

        <p>
          I want to give the optimistic read real weight, because I think it is largely correct.
        </p>

        <p>
          Latency is not a nice-to-have, it is a capability gate. A voice agent at 54 tokens per
          second is a product where the human waits. At 750 it is a conversation. An agent that runs
          a 40-step plan at Standard speed is a background job you check on later; at 14x it is
          something you supervise interactively, and interactive supervision is the single best
          known mitigation for the agent failure modes this whole industry has spent the summer
          apologizing for. The four verticals OpenAI picked for the preview (coding, financial
          research, voice, e-commerce) are exactly the four where the latency cliff is a business
          model, not a preference.
        </p>

        <p>
          And the economics genuinely do change shape. If a task completes in a tenth of the time,
          the operationally relevant metric is cost per completed task, not cost per token, and a
          more expensive per-token tier can win that comparison outright. Anyone still optimizing a
          dollars-per-million column is optimizing a proxy.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where I Get Off</h2>

        <p>
          All of that is true and none of it makes an unpriced tier a product. It makes it a
          demand-discovery experiment, and I am fairly sure that is what it is. Pick a handful of
          customers in the four verticals with the highest willingness to pay for latency, watch
          what they do with it, then set a price against observed value rather than against cost.
          That is a completely rational way to run a launch. It is also the opposite of the thing a
          platform needs to be, which is predictable.
        </p>

        <p>
          There is a supply-side reading too, and DeepSeek just illustrated it. DeepSeek matched
          OpenAI&apos;s 80 percent Luna cut within hours, took on something like 7 trillion tokens a
          week, discovered its fleet could not hold it, and on August 6 warned developers of a
          significant price increase it still has not quantified. Cheap tokens are a promise about
          capacity, and capacity is the part nobody can fake. &quot;Access expands as capacity
          grows&quot; is OpenAI saying the same thing more gracefully.
        </p>

        <p>
          So the honest summary of the week is not that OpenAI got faster. It is that five vendors
          published five headline prices and four of them are contingent on a date, a token
          threshold, or an announcement that has not happened yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What I Would Actually Do
        </h2>

        <p>
          Stop modeling on list price. Model on cost per completed task, measured on your own
          traffic, with your own harness. That number already exists in your logs and it is the only
          one that survives a promo expiring.
        </p>

        <p>
          Then put the expiry dates in your calendar rather than your memory. August 31 for Sonnet 5.
          January 1 for Gemini 3.7 Flash. Some unknown day for DeepSeek. If a rate change would
          break your margin, you need the alert before the invoice, not after.
        </p>

        <p>
          Instrument latency as a first-class metric next to spend. If you are not logging tokens
          per second per provider today, you cannot evaluate a speed tier when it gets a price, and
          you will end up buying it on a press release. Provider reliability and incident history
          live on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">
            status page
          </Link>{' '}
          if you want the availability half of that picture.
        </p>

        <p>
          And do not architect a critical path around a preview tier with no model ID. That should
          go without saying. It will not.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The interesting artifact of this week is a blank cell. OpenAI can build a wafer-scale
          inference stack and sell frontier intelligence at conversational speed, and it cannot yet
          tell you what that costs. Google can halve a price and only guarantee it for four months.
          xAI can hold a rate and double it at a context threshold most agent workloads cross
          routinely. DeepSeek can win on price and then lose on physics.
        </p>

        <p>
          None of that is a scandal. It is what a market looks like when the unit of value is
          changing underneath the unit of billing. The vendors will figure out how to price time.
          Until they do, the number on the pricing page is marketing, and the number in your logs is
          the truth.
        </p>

        <p>
          Three things I am watching. Whether Ultrafast ships with a per-token premium or a
          different billing shape entirely, because that choice defines the category. Whether
          anyone independently measures Standard Sol&apos;s baseline token rate and confirms or kills
          the 54 figure. And whether Anthropic or Google answers with a latency tier of their own
          before Q4, which would settle whether this is an OpenAI hardware quirk or the new second
          axis everyone has to compete on.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/deepseek-v4-pro-price-inversion-open-harness"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">DeepSeek Just Inverted the Pricing War. V4-Pro Ships With Higher Prices and an Open-Source Rival to Claude Code.</span>
          </Link>
          <Link
            href="/originals/wafer-scale-vs-gpu-what-cerebras-sells"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Wafer-Scale vs the GPU: What Cerebras Actually Sells, and Why It Only Matters for
              Inference
            </span>
          </Link>
          <Link
            href="/originals/ai-api-pricing-war-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The AI API Pricing War: Who&apos;s Winning in 2026?
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
