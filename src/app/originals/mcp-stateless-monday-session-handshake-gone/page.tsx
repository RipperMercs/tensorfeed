import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Network } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/mcp-stateless-monday-session-handshake-gone' },
  title: 'MCP Goes Stateless on Monday. The Session Handshake Is Gone, and So Is the Reason Servers Were Hard to Run.',
  description:
    "On Tuesday, July 28, 2026, the Model Context Protocol ships its biggest revision since launch. The initialize handshake is removed, the Mcp-Session-Id header is removed, and any request can hit any server instance. Extensions become first-class with MCP Apps (sandboxed HTML UIs) and Tasks (polling handles) shipping alongside the core. Authorization aligns with OAuth 2.0 and OpenID Connect. A formal 12-month deprecation policy replaces silent breaking changes. Inside the changes table, what it does to the load-balanced and edge-deployed MCP surface we ship at TensorFeed, and how the x402 rail lands cleaner once sessions stop pinning agents to instances.",
  openGraph: {
    title: 'MCP Goes Stateless on Monday. The Session Handshake Is Gone.',
    description:
      'The 2026-07-28 MCP spec drops sessions, promotes Apps and Tasks to first-class extensions, hardens auth to OAuth 2.0 and OIDC, and adds a 12-month deprecation policy. The scaling story just got real.',
    type: 'article',
    publishedTime: '2026-07-26T14:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Goes Stateless on Monday.',
    description:
      'Sessions removed. Any request hits any instance. Apps and Tasks graduate. Auth aligns with OAuth 2.0. Twelve-month deprecation policy. What breaks and what gets cheaper.',
  },
};

export default function MCPStatelessMondayPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="MCP Goes Stateless on Monday. The Session Handshake Is Gone, and So Is the Reason Servers Were Hard to Run."
        description="The 2026-07-28 MCP release candidate removes the initialize handshake and Mcp-Session-Id header, promotes MCP Apps and Tasks to first-class extensions, aligns authorization with OAuth 2.0 and OpenID Connect, and adds a 12-month deprecation policy. Inside the changes, why the load-balanced surface just got easier, and what it does to the x402 agent-payments rail."
        datePublished="2026-07-26"
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

      {/* Hero (graphic mode: MCP protocol blue to teal) */}
      <ArticleHero
        mode="graphic"
        icon={Network}
        gradientFrom="#0F2A44"
        gradientTo="#1E7A6E"
        eyebrow="Agent Stack &middot; Protocols"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          MCP Goes Stateless on Monday. The Session Handshake Is Gone, and So Is the Reason Servers Were Hard to Run.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-07-26">July 26, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/mcp-stateless-monday-session-handshake-gone"
        title="MCP Goes Stateless on Monday. The Session Handshake Is Gone."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The release candidate for the next Model Context Protocol specification landed last week
          and the final spec ships on Tuesday, July 28, 2026. David Soria Parra and Den Delimarsky
          signed the announcement. It is the largest revision since MCP launched in November 2024,
          and every line in the change log points in the same direction. The protocol just stopped
          pretending it lives inside one process.
        </p>

        <p>
          The one-sentence version: MCP is now stateless. No initialize handshake, no
          Mcp-Session-Id header, any request can hit any server instance. The knock-on effects run
          through Apps, Tasks, authorization, and a formal deprecation policy, but the stateless
          core is the change that reorganizes everything else.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Ships Tuesday</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Change</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Before</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Session model</td>
                <td className="px-4 py-3">initialize / initialized handshake, Mcp-Session-Id sticky routing</td>
                <td className="px-4 py-3">No handshake, client info in _meta on every request, any instance can serve</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Tasks</td>
                <td className="px-4 py-3">Experimental core, blocking tasks/result, session-bound objects</td>
                <td className="px-4 py-3">Extension SEP-2663, polling tasks/get, tasks/update, tasks/cancel, tasks/list removed</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">MCP Apps</td>
                <td className="px-4 py-3">Not part of core</td>
                <td className="px-4 py-3">First-class extension, server-rendered HTML in a sandboxed iframe, templates prefetched</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Authorization</td>
                <td className="px-4 py-3">OAuth 2.1 draft alignment, ad hoc</td>
                <td className="px-4 py-3">Six SEPs, RFC 9207 iss validation, application_type on registration, refresh token guidance</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Deprecated outright</td>
                <td className="px-4 py-3">Roots, Sampling, Logging shipped with the core</td>
                <td className="px-4 py-3">All three deprecated, minimum 12 months before removal</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Deprecation policy</td>
                <td className="px-4 py-3">Silent breaking changes between spec revisions</td>
                <td className="px-4 py-3">Formal Active, Deprecated, Removed states with a 12-month minimum window</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Stateless Is the Whole Story</h2>

        <p>
          Every headline change here is downstream of one architectural bet: a request is
          self-contained, a response is self-contained, and server instances are interchangeable.
          That reads like a sentence from a compliance document, and in a sense it is. It is the
          sentence that lets an MCP server run behind a normal load balancer, autoscale on ordinary
          horizontal replicas, and deploy on serverless without a shared session store bolted to
          the side.
        </p>

        <p>
          The previous protocol required an initialize handshake before any real work. The client
          announced itself, the server issued an Mcp-Session-Id, and every subsequent request
          carried that id back. If the load balancer routed you to a different replica, the id was
          garbage. The workaround was sticky routing, which is a soft way of saying autoscaling did
          not really work. If a replica died mid-conversation, the client had to re-handshake and
          re-hydrate state, which is a soft way of saying reliability did not really work either.
        </p>

        <p>
          Both of those problems came from one place, and the spec removed the place. Client
          information now travels via a _meta field on every request. No id, no sticky header, no
          shared session store on the server side. The scaling story just got dramatically simpler,
          and it got that way through subtraction rather than addition.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Apps and Tasks Get Their Own Track</h2>

        <p>
          The Extensions framework is the second load-bearing change. Extensions get reverse-DNS
          identifiers, capability negotiation, independent version cadence, and their own Standards
          Track repositories. MCP Apps and Tasks are the first two official ones, and both are
          shipping alongside the core rather than inside it.
        </p>

        <p>
          MCP Apps let a server ship interactive HTML that the host renders in a sandboxed iframe,
          with templates prefetched and security-reviewed before execution. That is what turns a
          tool call from a JSON round trip into a small application surface with pointer events,
          progress bars, and interactive forms. The design constraint is intentional: the host owns
          the sandbox, the server owns the pixels, and the model still calls tools underneath. The
          product target is any MCP client that already has a chat surface (Claude, Claude Code,
          Cowork, VS Code, plus every third-party host) and wants tools to render richer output
          without giving each vendor a bespoke SDK.
        </p>

        <p>
          Tasks graduates the other direction, out of the experimental core and into an extension.
          The redesign is stateless in the same shape as the rest of the protocol. Servers return a
          task handle from tools/call. Clients poll tasks/get and push input via tasks/update. The
          old tasks/list, which required the server to remember every task in flight, is removed
          outright. Handles are visible to the model, which also means the model reasons about
          them, which is a small but real correctness win for agent loops that used to lose track
          of long-running work when the transport lost track first.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Authorization Grows Up</h2>

        <p>
          Six security proposals harden the authorization spec against real-world OAuth 2.0 and
          OpenID Connect deployments. The list reads like a compliance change log. Clients now
          validate the iss parameter on authorization responses per RFC 9207. Registrations declare
          an application_type. Refresh token guidance stops being implementation-defined. The
          Enterprise-Managed Authorization work reached stable on July 6, 2026, with Okta named as
          the reference identity provider and Anthropic&apos;s Claude, Claude Code, Cowork, plus VS
          Code as reference clients.
        </p>

        <p>
          What that means for anyone shipping an MCP server into a real company: the identity story
          is now the story an enterprise architecture review already has language for. You do not
          need to invent an auth story on top of an auth story. The path from the corporate
          identity provider to the MCP server to the tool call is one continuous OAuth 2.0 flow,
          and the pieces of that flow that used to be footnotes in a draft are now normative
          clauses. That is the difference between a protocol you can pitch to a CIO and a protocol
          you can only pitch to a friend.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Breaks</h2>

        <p>
          Servers that expect initialize as the first message will fail. The Mcp-Session-Id header
          is gone, and any host code parsing it is dead. Roots, Sampling, and Logging are
          deprecated in the core (kept working for at least 12 months, then removed). Tasks that
          were session-bound need to be rebuilt around explicit handles. tasks/list is gone
          entirely, so any UI that enumerated in-flight jobs has to move that state into the
          client.
        </p>

        <p>
          The recommended migration pattern is more disciplined than the old one and better for the
          model. Return an explicit handle from a tool call (a basket_id, a job_id, a search_cursor),
          then take that handle as an argument on the follow-up call. The state is now visible to
          the model instead of hidden in transport metadata, and the server no longer needs to
          remember which client had which id. This is the same shape of change REST APIs went
          through in the mid-2010s when session cookies died on the mobile edge and everyone moved
          to tokens.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to the Edge</h2>

        <p>
          The stateless move is the change that finally makes MCP a first-class citizen at the
          edge. We wrote up{' '}
          <Link href="/originals/cloudflare-monetization-gateway-x402-mcp-edge" className="text-accent-primary hover:underline">
            Cloudflare and AWS embedding x402 into the edge
          </Link>{' '}
          two weeks ago. Both providers pushed paid MCP tool calls into their respective request
          fabrics on the assumption that MCP would eventually stop needing a sticky server. As of
          Tuesday, it does not. Any request hits any Worker isolate, any Fargate task, any Lambda
          cold start. The pricing story for hosted MCP shifts from &ldquo;pay for the persistent
          connection&rdquo; to &ldquo;pay for the call,&rdquo; which is exactly the mental model
          x402 already assumed.
        </p>

        <p>
          Our own MCP stack sits inside this shift. The{' '}
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
            @tensorfeed/mcp-server
          </Link>{' '}
          npm package wraps the TensorFeed REST API as MCP tools, and the paid tools settle in USDC
          on Base through x402. The old protocol required us to hold the session while the
          agent decided whether to pay. The new protocol lets every request stand on its own,
          which is the shape a payment-required rail has always wanted. We are shipping a stateless
          upgrade of the server alongside the spec, and the migration will not touch the tool
          catalog. The auth layer will pick up the OAuth 2.0 hardening for enterprise agents that
          need SSO, and the free tools will keep working with no auth at all.
        </p>

        <p>
          For anyone else running an MCP server: the 12-month deprecation window means you do not
          need to rewrite this week. You do need to plan the rewrite this quarter. A server that
          held state in the transport is going to keep holding it for a while, and then it is going
          to break. Better to write the new shape now while the old shape still works than to run
          the fire drill in July 2027.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          MCP as an open protocol has been running the same trajectory as every other successful
          agent-era standard we cover. First a narrow reference implementation shipped by the
          vendor with the loudest voice, then a burst of real production adoption that exposes the
          seams, then a formalization pass that quietly rebuilds the load-bearing pieces to
          match how the protocol is actually used. HTTP went through this. OAuth went through this.
          MCP is going through it now, and the 2026-07-28 revision is the pass where the seams get
          rebuilt.
        </p>

        <p>
          The stateless bet is the right one. It closes the operational gap between MCP and every
          other successful transport of the last decade, and it lands at the exact moment the
          agent-payments rail needed a protocol that could survive being priced per call. The
          extensions framework is the right shape too. It gives Apps and Tasks their own version
          cadence without dragging the core along, and it gives the ecosystem a place to iterate
          without every experiment turning into a breaking spec change.
        </p>

        <p>
          The thing to watch is the extension market itself. First-class extensions are only
          first-class if hosts actually ship them, and the interesting split will be whether
          Anthropic, OpenAI, Google, and the third-party host ecosystem all implement MCP Apps and
          Tasks on the same calendar. If they do not, extensions become the new place fragmentation
          hides. If they do, MCP&apos;s{' '}
          <Link href="/originals/mcp-97-million-installs" className="text-accent-primary hover:underline">
            97 million installs
          </Link>{' '}
          become the substrate for a much richer surface than a chat window with tool calls.
        </p>

        <p>
          Three signposts through the rest of the year. Whether Anthropic ships MCP Apps in Claude
          Desktop and Claude Code by Q4. Whether OpenAI adopts the 2026-07-28 auth hardening for
          its own MCP surface in ChatGPT. And whether the first paid, x402-metered MCP Apps land on
          any of the hosted registries (ours, Cloudflare&apos;s, Apify&apos;s, the official one)
          before the end of Q3. The protocol just got the scaffolding it needed. The next six
          months are about whether the ecosystem builds on it.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/cloudflare-monetization-gateway-x402-mcp-edge"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Cloudflare and AWS Embedded x402 Into the Edge in Two Weeks. Paid MCP Tools Now Live at the Request Fabric.</span>
          </Link>
          <Link
            href="/originals/mcp-97-million-installs"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">MCP Just Crossed 97 Million Installs. The Protocol Layer Is Real.</span>
          </Link>
          <Link
            href="/originals/aws-ships-hosted-mcp-server"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">AWS Shipped a Hosted MCP Server. The Hyperscaler Race for the Agent Runtime Is Live.</span>
          </Link>
          <Link
            href="/originals/mcp-server-fifty-line-file"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">An MCP Server Is a Fifty Line File Now. What Changes When the Barrier Goes to Zero.</span>
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
