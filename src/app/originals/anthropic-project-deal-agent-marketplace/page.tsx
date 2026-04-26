import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality.',
  description:
    "Project Deal let 69 Anthropic employees turn Claude loose on a real cash marketplace. 186 trades, $4,000 in goods, and a hidden A/B test that exposes what happens when your agent is cheaper than your neighbor's.",
  openGraph: {
    title: 'Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality.',
    description: 'Anthropic ran a secret A/B test inside Project Deal. People with Opus made more money than people with Haiku. None of them noticed.',
    type: 'article',
    publishedTime: '2026-04-26T15:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality.',
    description: 'Project Deal proved AI agents can negotiate real deals with real money. It also revealed something nobody is ready for.',
  },
};

export default function AnthropicProjectDealPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality."
        description="Inside Anthropic's Project Deal, a real-money agent-to-agent marketplace where 69 employees, $100 each, and 186 trades exposed a model-tier inequality nobody saw coming."
        datePublished="2026-04-26"
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
          Anthropic Just Ran the First Real-Money AI Agent Marketplace. The Results Reveal a Coming Inequality.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-04-26">April 26, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic just published the results of Project Deal, an internal experiment where 69 employees handed
          their wallets to Claude and let the model buy and sell physical goods on their behalf. The agents made
          186 trades. They moved more than $4,000 in real money. And Anthropic ran a secret A/B test on top of
          all of it, the kind of test that should make anyone planning to deploy agents at scale stop and read it twice.
        </p>

        <p>
          The headline finding is not that AI agents can negotiate. We knew that. The finding that matters is what
          happened when people were given different model tiers without their knowledge. Some got Opus 4.5. Some
          got Haiku 4.5. The Opus users won, every time. None of the Haiku users noticed they were losing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Project Deal Actually Was</h2>

        <p>
          Anthropic ran the experiment in December 2025 inside its San Francisco office. 69 employees opted in.
          Each one got a $100 gift card balance and a small marketplace where they could list items they owned
          and bid on items their coworkers had listed. Snowboards. Ping-pong balls. Office plants. Real stuff,
          real money, real ownership transfers when the experiment ended.
        </p>

        <p>
          The catch: every participant was represented by a Claude agent. The agent posted listings, set asking
          prices, made offers, ran counteroffers, and closed deals. Humans set high-level preferences (&quot;I want
          to sell this snowboard, target $80&quot;) and then stepped back. The agents talked to each other. The market cleared.
        </p>

        <p>
          Anthropic released full results on April 25. You can read their summary on the Project Deal page they
          published. The numbers are interesting. The methodology is the part that should land harder.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Hidden A/B Test</h2>

        <p>
          What participants did not know is that Anthropic was running four parallel marketplaces in the background.
          One was the &quot;real&quot; marketplace where every participant got the same model and the trades were honored.
          The other three were study markets, where Anthropic randomly assigned participants to Opus 4.5 or Haiku 4.5.
        </p>

        <p>
          This was a clean experiment. Same participants. Same items. Same starting cash. Different agents.
          The results were not subtle.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Metric</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Opus 4.5 advantage</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Seller revenue per item</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">+$2.68</td>
                <td className="px-4 py-3">Opus sellers got higher final prices</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Buyer savings per item</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">+$2.45</td>
                <td className="px-4 py-3">Opus buyers paid less per deal</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Deals closed</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">+2.07</td>
                <td className="px-4 py-3">Opus completed more transactions overall</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">User-perceived performance</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">No difference</td>
                <td className="px-4 py-3">Haiku users did not notice they were losing</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two and a half dollars per item does not sound like much. Scale it. If your agent runs hundreds of
          decisions a day, and each one costs you a couple of dollars in expected value because it is reasoning
          with a smaller model, you are bleeding cash. The other side is bleeding it onto a competitor with deeper pockets.
        </p>

        <p>
          The user-perception part is the one that rattles me. Every Haiku participant came away from the
          experiment thinking their agent did fine. They had nothing to compare it to. They saw their listings
          sell, their bids accepted, their balance move. From the inside, the experience felt complete. From
          the outside, they were systematically getting worse outcomes.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Matters Outside an Office</h2>

        <p>
          Project Deal is the first real-money agent-to-agent commerce study at scale that I am aware of, and
          Anthropic published it because they want to highlight that this kind of market is coming. It is.
          MCP just crossed{' '}
          <Link href="/originals/mcp-97-million-installs" className="text-accent-primary hover:underline">97 million installs</Link>.
          OpenAI shipped workspace agents this week. Every major lab is putting agents into the loop on tasks
          that used to be human-only. Procurement. Travel. Negotiation. Hiring funnels. Insurance.
        </p>

        <p>
          When those agents start meeting other agents, the negotiation dynamics from Project Deal stop being
          a curiosity and start being a market structure. If your supplier&apos;s agent is running on a $0.25
          input model and yours is running on a $5 input model, there is now a measurable expectation that the
          better-resourced agent extracts more value, every time, on every line item.
        </p>

        <p>
          That is a kind of inequality the agent era has not had to confront yet. The cheap models are good
          enough for most consumer chat. They are clearly not good enough for adversarial negotiation against
          a frontier-tier counterparty.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Pricing Math, Made Concrete</h2>

        <p>
          Pull up the actual API costs and it gets uglier. Here is what the gap looks like at current list prices.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input (per 1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output (per 1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Opus 4.7</td>
                <td className="px-4 py-3">$15.00</td>
                <td className="px-4 py-3">$75.00</td>
                <td className="px-4 py-3">Frontier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 4.6</td>
                <td className="px-4 py-3">$3.00</td>
                <td className="px-4 py-3">$15.00</td>
                <td className="px-4 py-3">Mid</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Haiku 4.5</td>
                <td className="px-4 py-3">$0.25</td>
                <td className="px-4 py-3">$1.25</td>
                <td className="px-4 py-3">Budget</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.5</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">$30.00</td>
                <td className="px-4 py-3">Frontier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.1 Pro</td>
                <td className="px-4 py-3">$1.25</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">Mid</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Opus output costs 60x more than Haiku output. The Project Deal numbers say that 60x cost gap turned
          into roughly $5 of edge per closed deal (the seller side plus buyer side). On a household-level
          shopping agent that closes one deal a week, the Haiku version saves you about $80 a year on inference
          and loses you about $260 in worse outcomes. The cheap option is not the cheap option.
        </p>

        <p>
          This is the real argument for the premium tier. Not bigger context windows. Not nicer prose.
          Negotiation outcomes. The model that is smart enough to bluff, anchor, and walk away when the
          counterparty is doing the same.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Consent Question</h2>

        <p>
          I want to flag something about how this experiment was designed. Anthropic ran a hidden A/B test on
          paid employees with real money on the line. Some of them lost real value because they were quietly
          assigned the cheaper model. The participants opted into Project Deal. Anthropic disclosed the
          methodology only after the experiment ended.
        </p>

        <p>
          For an internal study at a research lab, that is reasonable. For the same setup deployed in a
          consumer product, it is the start of a regulatory conversation. If a marketplace assigns me an
          inferior agent and does not tell me, while routing my counterparty to a better one, that is the
          algorithmic version of yield-managing the customer. The FTC has shown an appetite for chasing this
          kind of thing in airline pricing. Agent assignment will get there.
        </p>

        <p>
          46% of Project Deal participants said they would pay for a similar service. That is a strong
          signal for product-market fit. It is also a signal that the consumer agent layer is going to ship
          before the regulatory framework around it does. Which is normal for the internet. It is just
          noticeable when the stakes are real cash on real items in real time.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Project Deal is a quiet announcement with a loud subtext. The tech works. Agents can negotiate
          real deals with real money and the markets clear cleanly. That part is settled.
        </p>

        <p>
          The harder finding is that the model you assign your agent matters more than anyone has been
          publicly admitting. Cheap models lose to expensive ones in negotiation, and the people running
          cheap models cannot tell. We are about to live through several years of agent-to-agent commerce
          where the price-performance curve looks one way (cheap is fine, smart is luxury) and the actual
          outcome curve looks completely different (cheap pays a tax, you just cannot see it).
        </p>

        <p>
          For developers building agent products: do not default to the cheapest model for tasks that involve
          adversarial negotiation, contract terms, or pricing decisions. Run the math the way Anthropic ran
          it. Hold every input constant. Swap only the model. Measure outcome. The right tier is the one that
          breaks even on inference cost plus expected delta in outcomes, not the one that wins on raw API price.
        </p>

        <p>
          You can compare frontier model pricing on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link> and run
          your specific workload through the{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>{' '}
          if you want to model the break-even yourself.
        </p>

        <p>
          The agent economy is not arriving with a press release. It is arriving with experiments like this
          one. Quiet. Methodologically tight. Findings that change how you should price your stack. If you
          missed Project Deal in the noise this week, do not. It is the most important thing Anthropic has
          published in a month.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/rise-of-agentic-ai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Rise of Agentic AI: From Chatbots to Autonomous Workers</span>
          </Link>
          <Link
            href="/originals/mcp-97-million-installs"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">MCP Just Hit 97 Million Installs. The Agent Era Is Here.</span>
          </Link>
          <Link
            href="/originals/building-for-ai-agents"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Building for AI Agents: What Developers Need to Know</span>
          </Link>
        </div>
      </footer>

      <AdPlaceholder format="horizontal" className="mt-10" />

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
