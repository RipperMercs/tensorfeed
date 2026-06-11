import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Server } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/aws-ships-hosted-mcp-server' },
  title:
    'AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For. | TensorFeed',
  description:
    "AWS shipped a hosted MCP Server with SigV4 auth, IAM authorization, and two regional endpoints, and folded its two prior MCP servers into it. The news is not that AWS has an MCP server. It is that AWS decided MCP belongs on production cloud infrastructure with enterprise auth, not on a developer's laptop. Inside what shipped, why the auth model matters more than the tool list, and how this stacks with AgentCore Payments.",
  openGraph: {
    title:
      'AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For.',
    description:
      "AWS shipped a hosted MCP Server with SigV4 auth and IAM authorization, folding its two prior MCP servers into one. The auth model matters more than the tool list. Inside what shipped and how it stacks with AgentCore Payments.",
    type: 'article',
    publishedTime: '2026-05-15T17:00:00.000Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For.',
    description:
      'Hosted MCP Server, SigV4 auth, IAM authorization, two regional endpoints, two prior servers folded into one. The protocol just left the laptop.',
  },
};

export default function Page() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For."
        description="AWS shipped a hosted MCP Server with SigV4 auth, IAM authorization, and two regional endpoints, and folded its two prior MCP servers into it. The auth model matters more than the tool list. Inside what shipped and how it stacks with AgentCore Payments."
        datePublished="2026-05-15"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent-blue mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
          AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For.
        </h1>
        <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span aria-hidden="true">·</span>
          <time dateTime="2026-05-15">May 15, 2026</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/aws-ships-hosted-mcp-server"
        title="AWS Put MCP on Its Own Infrastructure. That Changes What the Protocol Is For."
      />

      <ArticleHero
        mode="graphic"
        icon={Server}
        gradientFrom="#232f3e"
        gradientTo="#16202c"
        eyebrow="AGENT INFRASTRUCTURE"
      />

      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          AWS shipped an MCP server. On its own that is not news. There are
          thousands of MCP servers, and AWS already had two of them. The news is
          where this one runs. It is not a package you clone and launch on your
          machine. It is a hosted service AWS operates, reachable at{' '}
          <span className="font-mono text-sm">aws-mcp.us-east-1.api.aws/mcp</span>{' '}
          and a Frankfurt endpoint, authenticated with SigV4, authorized through
          your existing IAM policies. AWS did not just publish a tool. It decided
          that the Model Context Protocol belongs on production cloud
          infrastructure with enterprise auth, and built it that way.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What actually shipped
        </h2>

        <p>
          The product is called, plainly, the AWS MCP Server. It exposes the AWS
          API surface to an AI agent through MCP tools, including{' '}
          <span className="font-mono text-sm">aws___search_documentation</span>{' '}
          and <span className="font-mono text-sm">aws___retrieve_skill</span>,
          with the agent able to operate on resources in any region the caller
          specifies. It is documented as available today in two regions: US East
          (N. Virginia) and Europe (Frankfurt). Supported clients listed in the
          setup guide are Kiro CLI, Kiro IDE, Cursor, Claude Desktop, and Codex.
          Anthropic&apos;s Claude Desktop is a first-class target, named directly
          in the configuration examples.
        </p>

        <p>
          The setup guide opens with an instruction that tells you most of the
          story: if you already have the <span className="font-mono text-sm">aws-api-mcp-server</span>{' '}
          or <span className="font-mono text-sm">aws-knowledge-mcp-server</span>{' '}
          installed, remove them first. AWS had two earlier MCP servers, run
          locally, scoped to API calls and documentation respectively. Both are
          now superseded. The unified hosted server replaces them, and the docs
          explicitly tell you to delete the old ones to avoid tool conflicts that
          confuse agents. Two iterations in roughly half a year, collapsed into a
          single hosted surface. That is a team moving fast on a product they
          have decided matters, not a team shipping a sample.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The auth model is the actual headline
        </h2>

        <p>
          Most MCP servers in the wild are local stdio processes. You install a
          package, your client spawns it as a subprocess, and it talks to the
          model over standard input and output. There is no network boundary, no
          identity, no audit trail. That design is fine for a developer wiring up
          a personal tool. It is unshippable for an enterprise that wants an
          agent calling its cloud control plane.
        </p>

        <p>
          AWS&apos;s server does not use bearer tokens, the default for the small
          slice of remote MCP servers that do exist. It uses SigV4, the same
          request-signing scheme that authenticates every AWS API call, brokered
          through a thin proxy (<span className="font-mono text-sm">mcp-proxy-for-aws</span>,
          open-sourced at github.com/aws/mcp-proxy-for-aws) that handles signing
          and credential rotation. Authorization does not happen at the MCP layer
          at all. When the agent calls a tool, the server forwards the request to
          the underlying AWS service, and that service authorizes it against your
          existing IAM roles and policies, exactly as it would a direct API call.
          The MCP server adds no new permission system. It inherits yours.
        </p>

        <p>
          AWS also added two global IAM condition keys:{' '}
          <span className="font-mono text-sm">aws:ViaAWSMCPService</span>, true
          for any request through an AWS managed MCP server, and{' '}
          <span className="font-mono text-sm">aws:CalledViaAWSMCP</span>, carrying
          the specific server principal. An organization can now write a policy
          that denies, for example, <span className="font-mono text-sm">s3:DeleteBucket</span>{' '}
          when the call originates from an agent through MCP, while still allowing
          it from a human running the CLI. That is the kind of control a security
          team asks for before it lets an agent near production. It existing at
          launch is the tell. This was scoped as enterprise infrastructure from
          the start.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          This is the second half of an agent platform
        </h2>

        <p>
          Read this next to what AWS shipped eight days earlier. On May 7, AWS
          put native x402 agent payments into Bedrock AgentCore, the same
          canonical x402 V2 settlement layer{' '}
          <Link href="/developers/agent-payments" className="text-accent-blue hover:underline">
            TensorFeed has served for months
          </Link>
          . AgentCore already had Runtime and Identity. Now there is a managed
          payments rail and a managed tool-call rail, both authenticated through
          AWS&apos;s own identity primitives, both pointed at agents rather than
          humans. Identity, payments, and tool execution are the three legs an
          autonomous agent needs to do useful work in someone&apos;s cloud
          account. AWS now operates all three as managed services.
        </p>

        <p>
          The strategic shape is consistent with the{' '}
          <Link href="/originals/google-a2a-x402-payments-extension" className="text-accent-blue hover:underline">
            Google A2A x402 coalition
          </Link>{' '}
          we wrote about yesterday. Two hyperscalers, in the same fortnight,
          building the acceptance side of the agent economy before the demand
          side has obviously arrived. Google&apos;s play is a payments protocol
          with sixty logos behind it. AWS&apos;s play is to make its own cloud
          the place agents run, with the protocol layer it endorses being MCP for
          tools and x402 for money. Neither is betting on a niche. They are
          laying rail.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What it does not mean
        </h2>

        <p>
          It is worth being precise about what this is not. AWS is not the first
          to host a remote MCP server. Cloudflare has shipped remote MCP with
          OAuth, and others have hosted servers in production. The significant
          thing here is not primacy. It is that the largest cloud provider chose
          to make MCP a managed service of its own platform, with its own
          identity model, and to deprecate its local servers in favor of it.
          When the company that runs a third of the internet&apos;s workloads
          decides a protocol is production infrastructure, the protocol&apos;s
          status question is settled. MCP is no longer a thing you wonder whether
          to take seriously.
        </p>

        <p>
          It also does not mean local MCP servers are dead. The laptop server is
          still the right shape for a personal tool, a prototype, a thing one
          developer runs for one workflow. What changed is the ceiling. There is
          now a clear, vendor-blessed pattern for the other end of the spectrum:
          a hosted server, on real infrastructure, behind real auth, that an
          enterprise can put in front of an agent without a security review
          stalling the project for a quarter.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          TensorFeed runs MCP servers on the hosted side of that line already.{' '}
          <a
            href="https://www.npmjs.com/package/@tensorfeed/mcp-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            @tensorfeed/mcp-server
          </a>{' '}
          fronts a Cloudflare Worker, not a local process, and{' '}
          <a
            href="https://www.npmjs.com/package/@tensorfeed/x402-base-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            @tensorfeed/x402-base-mcp
          </a>{' '}
          carries the payments primitive. We made that architectural choice
          because the value of an MCP server is the freshness and structure of
          what it returns, and that has to come from a backend you operate, not a
          script on a user&apos;s disk. AWS validating the hosted-plus-auth
          pattern is not a threat to that. It is the rest of the industry
          arriving where the design already pointed.
        </p>

        <p>
          The metric we watch for our own MCP work is not downloads. It is
          whether agents recommend the server to other agents, because that is
          the only growth loop that compounds in a machine-to-machine ecosystem.
          AWS hosting MCP centrally, with IAM scoping per tool call, makes that
          loop more legible, not less. An agent that can reason about which
          server is trustworthy, audited, and correctly scoped is an agent that
          can make a recommendation worth acting on. The protocol getting an
          enterprise-grade reference implementation from AWS raises the floor for
          everyone building on it, including us.
        </p>

        <p>
          The story is not that AWS built a tool. The story is that AWS looked at
          MCP, decided it was load-bearing enough to put on the same
          infrastructure and the same identity model as its core API, and
          deprecated its own earlier attempts to get there. That is what
          conviction looks like from a company that does not ship infrastructure
          casually.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Related</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="block p-4 border border-border rounded-lg hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-2">AGENT STACK</div>
            <div className="text-sm font-medium text-text-primary">
              Google Just Put 60 Payment Companies Behind a Crypto-Native Agent Rail
            </div>
          </Link>
          <Link
            href="/originals/agentic-usdc-pay-and-trade-converge"
            className="block p-4 border border-border rounded-lg hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-2">AGENT PAYMENTS</div>
            <div className="text-sm font-medium text-text-primary">
              Same Dollar, Same Chain, Same Custodian: The Agentic USDC Stack Is Converging
            </div>
          </Link>
          <Link
            href="/originals/x402-verifier-mcp-launch"
            className="block p-4 border border-border rounded-lg hover:border-accent-blue transition-colors"
          >
            <div className="text-xs text-text-secondary mb-2">MCP</div>
            <div className="text-sm font-medium text-text-primary">
              We Shipped an x402 Verifier as an MCP Server
            </div>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-between text-sm">
          <Link
            href="/originals"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-accent-blue"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Originals
          </Link>
          <Link href="/" className="text-text-secondary hover:text-accent-blue">
            Back to Feed
          </Link>
        </div>
      </footer>
    </article>
  );
}
