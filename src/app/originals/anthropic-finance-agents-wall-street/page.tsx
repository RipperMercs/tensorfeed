import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor.',
  description:
    'Anthropic shipped ten preconfigured Claude agents for banks, asset managers, and insurers today, plus full Microsoft 365 integration, a Moody&apos;s data app covering 600 million companies, and a co-engineered Financial Crimes Agent with FIS. The day after the $1.5B Wall Street joint venture, the products that JV will sell are live.',
  openGraph: {
    title: 'Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor.',
    description:
      'Ten Claude finance agents, Microsoft 365 integration, a Moody&apos;s data app, and a co-built FIS Financial Crimes Agent. Anthropic is no longer selling tokens, it is selling workflows.',
    type: 'article',
    publishedTime: '2026-05-05T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor.',
    description:
      'Ten Claude finance agents, full Microsoft 365 integration, Moody&apos;s embedded as a native app, and a co-built FIS agent for AML.',
  },
};

export default function AnthropicFinanceAgentsWallStreetPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor."
        description="Anthropic shipped ten preconfigured Claude agents for banks, asset managers, and insurers, plus full Microsoft 365 integration, a Moody's data app covering 600 million companies, and a co-engineered Financial Crimes Agent with FIS."
        datePublished="2026-05-05"
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
          Anthropic Just Shipped 10 Wall Street Agents. The Frontier Lab Is Now a Vendor.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-05">May 5, 2026</time>
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
          Anthropic held an invite-only event in New York this morning and used it to do something
          frontier labs almost never do: sell finished products instead of capability promises. Ten
          preconfigured Claude agents for banks, asset managers, and insurers shipped today, alongside
          full Microsoft 365 integration, a Moody&apos;s app embedded directly inside Claude, and a
          co-engineered Financial Crimes Agent built with FIS. This is the day after the $1.5 billion
          joint venture with Blackstone, Hellman &amp; Friedman, and Goldman Sachs. Today is the day
          the JV got a catalog.
        </p>

        <p>
          I&apos;ve been waiting for one of the labs to make this jump. For two years the model
          companies have insisted they only sell intelligence and let partners build the workflows.
          That story just ended.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Ten Agents, In Order of Pain They Remove</h2>

        <p>
          Anthropic is shipping ten templates, each a Claude Cowork plugin and a Claude Code plugin,
          plus a cookbook for Claude Managed Agents. They are organized into three buckets: research
          and client coverage; credit, risk, and compliance; and the controllers&apos; office. Here
          is the lineup as Anthropic described it on stage and on the product page.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Agent</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Bucket</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">What It Replaces</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Pitch builder</td>
                <td className="px-4 py-3">Coverage</td>
                <td className="px-4 py-3">Junior banker pitchbook nights</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meeting preparer</td>
                <td className="px-4 py-3">Coverage</td>
                <td className="px-4 py-3">Pre-call brief packs</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Earnings reviewer</td>
                <td className="px-4 py-3">Research</td>
                <td className="px-4 py-3">Annual report reading queues</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Model builder</td>
                <td className="px-4 py-3">Research</td>
                <td className="px-4 py-3">Three-statement Excel grunt work</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Market researcher</td>
                <td className="px-4 py-3">Risk</td>
                <td className="px-4 py-3">Sector deep dives for credit memos</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">KYC screener</td>
                <td className="px-4 py-3">Compliance</td>
                <td className="px-4 py-3">Manual KYC file assembly</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Underwriting assistant</td>
                <td className="px-4 py-3">Insurance</td>
                <td className="px-4 py-3">Submission triage and rating</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claims investigator</td>
                <td className="px-4 py-3">Insurance</td>
                <td className="px-4 py-3">First-notice-of-loss intake</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Statement auditor</td>
                <td className="px-4 py-3">Controllers</td>
                <td className="px-4 py-3">Tickmark-and-trace review</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Month-end closer</td>
                <td className="px-4 py-3">Controllers</td>
                <td className="px-4 py-3">Reconciliation and journal-entry review</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Notice the through line. Every single one of these is a job that an analyst, associate, or
          mid-level operations person spends 20 to 50 hours a week on. Anthropic did not pick
          differentiated, novel use cases. They picked the workloads where any bank CIO can compute the
          headcount math in their head before the demo finishes.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Microsoft 365 Just Got a New Default Agent</h2>

        <p>
          The second piece is the one that quietly reshapes the desktop. Anthropic shipped general
          availability of Claude add-ins for Excel, PowerPoint, Word, and Outlook today, with a single
          shared agent state across all four. That last detail is the unlock. Until now, Claude in
          Excel was a separate session from Claude in Word. Today, the agent that just rebuilt your
          DCF in Excel can drop the chart and three bullet points into the PowerPoint pitch the
          coverage banker needs by 4 p.m., then draft the Outlook email to the client with the
          attachment correctly named.
        </p>

        <p>
          Microsoft has been quiet on whether this conflicts with Copilot. The honest answer is that
          it does. Copilot is the default agent inside Office. Claude is now the default agent on top
          of Office, with finance-specific reasoning and a dedicated Wall Street vertical behind it.
          The tension is going to surface in enterprise contracts within 90 days.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Moody&apos;s as a Native App, 600 Million Companies Inside Claude</h2>

        <p>
          The Moody&apos;s integration is the one analysts will quietly ignore for a week and then
          panic over. Moody&apos;s embedded its full platform, credit ratings, financials, ownership
          data, ESG signals, and corporate hierarchy for over 600 million companies, as a native
          Claude app. You ask Claude for a credit memo on a private mid-market borrower and it pulls
          structured Moody&apos;s data inside the same context window. No copy-paste from a separate
          terminal, no CSV export, no API gluework.
        </p>

        <p>
          That is a real shot at Bloomberg and S&amp;P Capital IQ. Both still own the workflow because
          the data sits behind their interface and the analyst has to be there to ask the question.
          When the analyst asks the question to Claude and Moody&apos;s answers from inside the same
          chat, the desktop terminal is no longer the gravity well.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">FIS, Financial Crimes, and the Embedded FDE Model</h2>

        <p>
          Yesterday FIS announced its own partnership with Anthropic, and the first deliverable is a
          co-built Financial Crimes Agent. The pitch: AML alert and case investigations compressed from
          days to minutes, evidence assembled across a bank&apos;s core systems automatically, false
          positives reduced, and SAR narrative quality improved. BMO and Amalgamated Bank are the
          design partners. General availability is targeted for the second half of 2026.
        </p>

        <p>
          The structural detail matters as much as the product. Anthropic embedded its Applied AI team
          and forward-deployed engineers inside FIS to co-design the agent and transfer enough
          knowledge that FIS can build and scale follow-on agents independently. Client data stays
          inside FIS-controlled infrastructure. This is the Palantir playbook adapted for an agent
          vendor: ship the first one with your engineers in the building, then hand them the toolkit.
        </p>

        <p>
          The roadmap that FIS published includes credit decisioning, deposit retention, customer
          onboarding, and fraud prevention. Each one is a multi-hundred-million-dollar line in a
          typical Tier 1 bank&apos;s technology budget.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Opus 4.7 Is the Engine, and the Benchmark Backs It</h2>

        <p>
          All ten agents are tuned to Claude Opus 4.7. Anthropic pointed at the Vals AI Finance Agent
          benchmark to back the choice: Opus 4.7 leads at 64.37%, ahead of GPT-5.5 and Gemini 3.1 Pro
          on the same task suite. We are tracking those numbers on our{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>
          {' '}and will reproduce them once the public test set lands. Until then, the relative ordering
          matters more than the absolute number.
        </p>

        <p>
          The pricing for these agents is Claude Opus 4.7 token economics ($15 input, $75 output per
          million), which means a single research-and-pitch cycle on a mid-cap target probably runs
          between $40 and $120 in inference. That is rounding error against an associate&apos;s
          fully-loaded cost for the same hours, which is the comparison Anthropic wants you to make.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Just Changed for the Industry</h2>

        <p>
          Three things, in order of how quickly they will hit a P&amp;L.
        </p>

        <p>
          First, Anthropic is no longer selling tokens. It is selling workflows. The pitch to a CFO is
          no longer &quot;here is an API, integrate it,&quot; it is &quot;here is a pre-built KYC
          screener, plug it into your case management system, your false positive rate drops 40% next
          quarter.&quot; That changes who at the buyer signs the contract and how big the contract is.
        </p>

        <p>
          Second, the consulting and ops outsourcing markets just got a new competitor with a
          structurally lower cost base. The Blackstone, Hellman &amp; Friedman, and Goldman Sachs JV
          announced yesterday is the distribution channel. Today&apos;s ten agents are the SKUs. A
          managed service that combines preconfigured agents with embedded Anthropic engineers is what
          Accenture and the Big Four have spent two decades building, and Anthropic just shipped a
          version one of it.
        </p>

        <p>
          Third, every other frontier lab has to respond. OpenAI launched Workspace Agents for
          ChatGPT Enterprise three weeks ago, but those are general productivity templates, not vertical
          finance products. Mistral has Le Chat Work mode but no banking partner. Google has Gemini
          inside Workspace and a deep cloud relationship with several US banks, but no shipped agent
          catalog. The pressure to publish a comparable vertical lineup is now on every leadership
          team.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The Anthropic 900 billion dollar valuation we wrote about{' '}
          <Link href="/originals/anthropic-900-billion-valuation-tops-openai" className="text-accent-primary hover:underline">yesterday</Link>
          {' '}was framed as a counter to OpenAI in the funding race. Today is what justifies it. The
          jump from $9 billion ARR to a reported $44 billion in five months is not a model story, it
          is a deals story. Wall Street pays for things that do work. Anthropic now sells things that
          do work. The mapping between those two facts is what makes the multiple defensible.
        </p>

        <p>
          For TensorFeed users, the practical takeaway is short. If you are building anything in
          finance ops, look at the agent templates as a baseline and decide whether to build on top or
          rebuild. If you are running a frontier lab strategy, the vertical product play is no longer
          theoretical. And if you are an analyst staring down a pitchbook tonight, your job did not
          disappear, but the boring half of it just got automated by a vendor you can buy on a
          standard MSA.
        </p>

        <p>
          We will be tracking the rollout cadence and the bank-by-bank deployments on the{' '}
          <Link href="/agents" className="text-accent-primary hover:underline">agents page</Link>. The
          Financial Crimes Agent goes GA in H2, and that is the launch worth watching, because if it
          delivers the alert-time compression Anthropic and FIS are claiming, every Tier 2 and Tier 3
          bank in the US will be in procurement by Q1 2027.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-900-billion-valuation-tops-openai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.</span>
          </Link>
          <Link
            href="/originals/openai-workspace-agents-chatgpt-enterprise"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Workspace Agents Land in ChatGPT Enterprise</span>
          </Link>
          <Link
            href="/originals/anthropic-project-deal-agent-marketplace"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Just Ran the First Real-Money AI Agent Marketplace.</span>
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
