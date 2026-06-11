import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/openai-workspace-agents-chatgpt-enterprise' },
  title: 'OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform',
  description:
    'OpenAI launched Workspace Agents in research preview for ChatGPT Business, Enterprise, and Edu. Long-running, scheduled, Codex-powered agents that plug straight into Slack, Salesforce, Drive, and Notion. The Custom GPT era is over.',
  openGraph: {
    title: 'OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform',
    description:
      'Workspace Agents are OpenAI’s answer to Slack workflows, Microsoft Copilot Studio, and Anthropic’s agent stack. Free until May 6, then credit-based pricing kicks in.',
    type: 'article',
    publishedTime: '2026-04-26T13:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform',
    description:
      'Workspace Agents quietly retire Custom GPTs and turn ChatGPT into a workflow engine. Here is what changed.',
  },
};

export default function OpenAIWorkspaceAgentsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform"
        description="OpenAI launched Workspace Agents in research preview for ChatGPT Business, Enterprise, and Edu. Long-running, scheduled, Codex-powered agents that plug straight into Slack, Salesforce, Drive, and Notion."
        datePublished="2026-04-26"
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
          OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-04-26">April 26, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/openai-workspace-agents-chatgpt-enterprise"
        title="OpenAI Just Turned ChatGPT Into an Enterprise Automation Platform"
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          OpenAI dropped Workspace Agents into ChatGPT Business, Enterprise, Edu, and Teachers
          plans this week. The framing was modest: a research preview, free until May 6. The
          implication is anything but. Workspace Agents quietly retire Custom GPTs and turn
          ChatGPT itself into the same kind of long-running, multi-tool, scheduled workflow
          engine that companies have spent the last decade buying from Slack, Zapier,
          Salesforce, and Microsoft.
        </p>

        <p>
          I&apos;ve been watching every major lab converge on the same product shape for months.
          With this launch, the picture is finally clear. The next ChatGPT competitor is not
          another chatbot. It is the org chart.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What a Workspace Agent Actually Is</h2>

        <p>
          A Workspace Agent is a shared, persistent agent that lives inside an organization&apos;s
          ChatGPT workspace. Anyone with the right permissions can build one without writing
          code. The agent runs in the cloud on Codex, can be invoked on demand, scheduled on a
          cron, or triggered by an event in a connected app. It can call multiple tools across
          a single task, hold state across runs, and post its results back where the team
          already lives: Slack threads, Salesforce records, Notion pages, Drive folders.
        </p>

        <p>
          That is the substantive change. Custom GPTs were chat surfaces. They reset every
          conversation, lived inside the ChatGPT app, and could not really do work over time.
          Workspace Agents are workers. They sit in a queue, take jobs, run for minutes or
          hours, and report back.
        </p>

        <p>
          OpenAI&apos;s reference example is a Rippling sales rep who built an agent that pulls
          account context, summarizes Gong calls, and drafts deal briefs every morning. The
          number they quote is five to six hours saved per rep per week. I&apos;m skeptical of
          self-reported productivity numbers, but the workflow itself is exactly the kind of
          glue work that used to require a Zapier subscription, a halfhearted Salesforce
          dashboard, and a person.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Connectors Are the Whole Game</h2>

        <p>
          Capabilities only matter if the agent can reach the data. OpenAI shipped this with a
          serious connector list out of the gate.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Category</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Connectors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Messaging</td>
                <td className="px-4 py-3">Slack, Microsoft Teams</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Files &amp; Docs</td>
                <td className="px-4 py-3">Google Drive, Microsoft 365, Notion, Box</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">CRM &amp; Sales</td>
                <td className="px-4 py-3">Salesforce, HubSpot</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Code &amp; Issues</td>
                <td className="px-4 py-3">GitHub, Linear, Jira</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Calendar &amp; Mail</td>
                <td className="px-4 py-3">Google Calendar, Outlook, Gmail</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          What is interesting is what you do not see: a Custom Connector SDK. Today, agents
          reach external systems through OpenAI&apos;s curated set or through Model Context
          Protocol servers. That MCP path is the one that matters long-term, because it lets
          internal tools, vertical SaaS, and the long tail of corporate systems plug in
          without OpenAI gatekeeping the integration. We covered why MCP became the de facto
          agent layer in {' '}
          <Link href="/originals/mcp-97-million-installs" className="text-accent-primary hover:underline">
            our 97 million installs piece
          </Link>
          . Workspace Agents make that bet pay.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Pricing Tells You Where This Is Going</h2>

        <p>
          Workspace Agents are free through May 6, 2026. After that, they move to credit-based
          pricing on top of the existing per-seat ChatGPT Business and Enterprise contracts.
          OpenAI has not published the per-credit rate yet, but the model itself tells you the
          plan: charge for the work, not the seat. That is the same direction Anthropic took
          with Claude Code consumption pricing and Google has been edging toward with Vertex
          Agent Builder.
        </p>

        <p>
          The seat-and-credit hybrid is a quiet but important shift. Per-seat SaaS pricing
          assumes every employee uses the tool roughly the same amount. Agents do not work
          that way. A single sales agent that runs every morning across 200 accounts will burn
          through compute that has nothing to do with how many humans are licensed. Credits
          are how OpenAI keeps a 5,000-seat enterprise account from accidentally costing them
          their margin.
        </p>

        <p>
          For buyers, it means total cost of agents is going to need its own line item. The
          model your agent calls, the connector pulls it makes, and the Codex runtime that
          powers the loop are all priced separately. Plan accordingly. Our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">
            cost calculator
          </Link>{' '}
          is set up to help finance teams model this.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Lines Up Against Everyone Else</h2>

        <p>
          The agent platform race is now real, and the players have all positioned. Here is
          how the four serious entrants stack up as of this week.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Platform</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Runtime</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Strength</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Weakness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI Workspace Agents</td>
                <td className="px-4 py-3">Codex</td>
                <td className="px-4 py-3">ChatGPT distribution, broad connectors</td>
                <td className="px-4 py-3">No custom connector SDK yet</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Microsoft Copilot Studio</td>
                <td className="px-4 py-3">Azure AI Foundry</td>
                <td className="px-4 py-3">Tight M365 + Power Platform integration</td>
                <td className="px-4 py-3">Heavy admin lift, Microsoft-centric</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google Vertex Agent Builder</td>
                <td className="px-4 py-3">Gemini 3.1</td>
                <td className="px-4 py-3">Cheapest tokens, longest context</td>
                <td className="px-4 py-3">Workspace ecosystem still maturing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic Claude for Work</td>
                <td className="px-4 py-3">Claude Opus 4.7</td>
                <td className="px-4 py-3">Best-in-class coding and reasoning</td>
                <td className="px-4 py-3">No native scheduled-agent surface</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          OpenAI&apos;s real advantage is distribution. ChatGPT has hundreds of millions of
          weekly active users, and a meaningful share of large enterprises already pay for
          Business or Enterprise seats. Microsoft has Office. Google has Workspace. Anthropic
          has the best model. OpenAI has the surface every employee already opens once a day.
          Workspace Agents turn that habit into a beachhead.
        </p>

        <p>
          The honest counterpoint: Microsoft has spent two years selling Copilot Studio into
          IT departments, and Copilot has plumbing OpenAI does not (Power Automate, Dataverse,
          group policy controls). For Fortune 500 IT, the path of least resistance is still
          Microsoft. For everyone smaller, OpenAI just made the easier choice.
        </p>


        <h2 className="text-2xl font-semibold text-text-primary pt-4">What It Means for Builders</h2>

        <p>
          If you build software that touches knowledge work, three things changed this week.
        </p>

        <p>
          First, the Custom GPT moat evaporated. Anyone selling a Custom GPT directory, a
          GPT-powered SaaS wrapper, or a thin chat layer on top of an internal database needs
          to ask whether a Workspace Agent on Codex does the same job natively. In most cases
          it does, with better tools and better permissions.
        </p>

        <p>
          Second, MCP just got more valuable. OpenAI is routing third-party tool access
          through MCP servers, which means writing one good MCP for your product gets you
          discovery across ChatGPT, Claude, Gemini, and any number of agent runtimes. If you
          have not shipped one, see {' '}
          <Link href="/originals/building-for-ai-agents" className="text-accent-primary hover:underline">
            our agent-readiness guide
          </Link>
          .
        </p>

        <p>
          Third, the structure of B2B SaaS is starting to invert. Historically, every category
          (CRM, project management, HR, support) shipped its own AI features. With Workspace
          Agents, the agent is the surface and the apps are the tools. The interesting
          question is which categories still get to own the workflow and which become
          connector destinations.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The labs have been telegraphing this for a year. GPT-5.5, which we covered in {' '}
          <Link href="/originals/gpt-5-5-openai-flagship" className="text-accent-primary hover:underline">
            this analysis
          </Link>
          , scored 78.7 percent on OSWorld-Verified, the benchmark for autonomous OS-level
          agents. Codex got faster and cheaper. Claude Code shipped. MCP crossed 97 million
          installs. Workspace Agents are the productization step that turns all of those
          components into a product a finance director can buy.
        </p>

        <p>
          For Evan and the rest of us building on top of these platforms, the takeaway is
          simple. Stop thinking about prompts and start thinking about jobs. The unit of value
          is no longer a clever instruction or a fine-tuned chatbot. It is a piece of work
          that finishes while you are asleep, costs three credits, and lands in your Slack
          before standup. OpenAI just made that the default mental model.
        </p>

        <p>
          The free preview window closes on May 6. If you run a team that pays for ChatGPT
          Business or Enterprise, the cheapest learning you will do this year is the next ten
          days. Build one agent for one workflow you actually run. See what breaks. The next
          twelve months are going to be defined by which teams figured this out early and
          which ones are still arguing about Custom GPTs.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-project-deal-agent-marketplace"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Just Ran the First Real-Money AI Agent Marketplace</span>
          </Link>
          <Link
            href="/originals/mcp-97-million-installs"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">MCP Just Hit 97 Million Installs. The Agent Era Is Here.</span>
          </Link>
          <Link
            href="/originals/rise-of-agentic-ai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Rise of Agentic AI: From Chatbots to Autonomous Workers</span>
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
