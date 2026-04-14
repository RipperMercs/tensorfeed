import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Building for AI Agents: What Developers Need to Know',
  description:
    'A practical guide to building agent-friendly software: structured data, llms.txt, API design patterns, MCP protocol, and lessons learned from building TensorFeed as an agent-first platform.',
  openGraph: {
    type: 'article',
    url: 'https://tensorfeed.ai/originals/building-for-ai-agents',
    title: 'Building for AI Agents: What Developers Need to Know',
    description:
      'A practical guide to building agent-friendly software: structured data, llms.txt, API design patterns, MCP protocol, and lessons learned from building TensorFeed as an agent-first platform.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Building for AI Agents: What Developers Need to Know',
    description:
      'A practical guide to building agent-friendly software: structured data, llms.txt, API design patterns, MCP protocol, and lessons learned from building TensorFeed as an agent-first platform.',
  },
};

export default function BuildingForAiAgentsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Building for AI Agents: What Developers Need to Know"
        description="A practical guide to building agent-friendly software: structured data, llms.txt, API design patterns, MCP protocol, and lessons from building TensorFeed agent-first."
        datePublished="2026-04-05"
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
          Building for AI Agents: What Developers Need to Know
        </h1>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-05">April 5, 2026</time>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          For two decades, we built software for humans. Screens, buttons, forms, navigation patterns
          optimized for eyeballs and mouse clicks. Now there&apos;s a second consumer of your
          software: AI agents. And what they need looks very different from what humans need.
        </p>

        <p>
          I&apos;ve been thinking about this a lot while building TensorFeed. From the beginning, we
          designed the platform to serve both audiences. Not as an afterthought, not as a separate
          &quot;API mode,&quot; but as a core design principle that shapes every decision we make. Here&apos;s
          what I&apos;ve learned about building software that works well for agents.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Makes Agent-Friendly Software Different</h2>

        <p>
          Human users are forgiving. They can look at a messy webpage, figure out what&apos;s important,
          and ignore the rest. They can handle ambiguity, scroll past irrelevant content, and use
          visual cues to navigate. Agents can&apos;t do any of that. Or rather, they can try, but
          they&apos;re bad at it and it wastes tokens.
        </p>

        <p>
          Agent-friendly software prioritizes three things: structured data, predictable endpoints,
          and clear documentation. If an agent can&apos;t programmatically understand what your software
          offers and how to interact with it, your software doesn&apos;t exist to that agent.
        </p>

        <p>
          This doesn&apos;t mean you need to choose between human-friendly and agent-friendly design.
          The best approach serves both. A well-structured API with clear documentation is great for
          human developers too. Semantic HTML with proper metadata helps both search engines and AI
          agents understand your content.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Structured Data Is the Foundation</h2>

        <p>
          The single most impactful thing you can do is make your data available in structured formats.
          JSON-LD for web content. JSON and XML for API responses. Clear schemas with consistent
          naming conventions.
        </p>

        <p>
          On TensorFeed, every piece of content has structured metadata: category tags, source
          attribution, timestamps, relevance scores, and entity references. This metadata is
          invisible to most human users, but it&apos;s what makes the content useful to agents that
          need to filter, sort, and analyze AI news programmatically.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <p className="text-text-primary font-medium mb-3">Structured data checklist for agent readiness:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>JSON-LD schema markup on all content pages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>Consistent, documented API response schemas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>Machine-readable timestamps (ISO 8601)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>Stable identifiers for all entities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>Pagination with total counts and cursor-based navigation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">&#10003;</span>
              <span>Content type headers and proper HTTP status codes</span>
            </li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">llms.txt: Your Site&apos;s AI Readme</h2>

        <p>
          The <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">llms.txt</code> standard
          is one of those ideas that feels obvious in retrospect. Just like{' '}
          <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">robots.txt</code> tells
          search crawlers what they can access, llms.txt tells AI agents what your site offers and
          how to interact with it.
        </p>

        <p>
          A good llms.txt file includes a plain-language description of your site, its primary
          content types, available APIs, authentication requirements, rate limits, and preferred
          interaction patterns. It&apos;s a map for agents navigating your platform.
        </p>

        <p>
          We publish one on TensorFeed, and I recommend every site do the same. It takes about
          thirty minutes to write and it immediately makes your platform more accessible to the
          growing ecosystem of AI agents that are browsing the web on behalf of users.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">API Design for Agent Consumers</h2>

        <p>
          Traditional API design optimizes for human developers reading documentation and writing
          integration code. Agent-oriented API design also needs to optimize for AI models that are
          discovering and calling your APIs dynamically, often without prior training on your specific
          documentation.
        </p>

        <p>
          This means a few things in practice:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-4">
          <div>
            <p className="text-text-primary font-medium mb-1">Self-describing endpoints</p>
            <p className="text-sm">Every API endpoint should include enough metadata that an agent can understand its
              purpose, required parameters, and response format without consulting external docs.
              OpenAPI specs help, but even simpler approaches like descriptive field names and inline
              documentation make a difference.</p>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">Predictable error responses</p>
            <p className="text-sm">Agents need to handle errors programmatically. Return consistent error schemas with
              clear error codes, human-readable messages, and suggested fixes. Avoid HTML error pages
              on API routes; agents can&apos;t parse those reliably.</p>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">Idempotent operations</p>
            <p className="text-sm">Agents will retry failed requests. If your API isn&apos;t idempotent where it should be,
              you&apos;ll end up with duplicate actions. Design for retry safety from the start.</p>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">Reasonable rate limits with clear headers</p>
            <p className="text-sm">Expose rate limit status in response headers so agents can throttle themselves
              intelligently. A well-behaved agent will respect your limits if you communicate them clearly.</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Rise of MCP</h2>

        <p>
          The Model Context Protocol has become the standard way for AI agents to interact with
          external tools and services. If you haven&apos;t looked into MCP yet, now is the time.
        </p>

        <p>
          MCP provides a standardized interface that lets any AI model connect to any tool that
          implements the protocol. Instead of building custom integrations for Claude, then GPT, then
          Gemini, you build one MCP server and all of them can use it. The protocol handles discovery
          (what tools are available), invocation (how to call them), and response formatting (how to
          return results).
        </p>

        <p>
          For TensorFeed, we&apos;re building an MCP server that lets agents query our aggregated
          feed, search for specific topics, get model comparisons, and track API pricing changes.
          An agent working on behalf of a developer could ask, &quot;What changed in the AI API
          landscape this week?&quot; and get a structured, comprehensive answer directly from our data.
        </p>

        <p>
          The ecosystem is growing fast. There are already hundreds of MCP servers for databases,
          cloud platforms, developer tools, and content management systems. If your software could
          be useful to an AI agent, building an MCP server is the highest-leverage integration
          you can do right now.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Practical Patterns That Work</h2>

        <p>
          Here are specific patterns I&apos;ve found effective from building TensorFeed as an
          agent-first platform:
        </p>

        <p>
          <span className="text-text-primary font-medium">Dual-format responses.</span> Serve HTML
          for browsers and JSON for agents from the same URLs using content negotiation. An agent
          sending <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">Accept: application/json</code> should
          get structured data. A browser should get the full rendered page. Same content, different
          formats.
        </p>

        <p>
          <span className="text-text-primary font-medium">Semantic HTML as a fallback.</span> Even
          when an agent hits your HTML pages directly, well-structured markup with proper heading
          hierarchy, article tags, time elements, and schema.org microdata helps them extract
          meaning. Don&apos;t rely on visual layout to communicate structure.
        </p>

        <p>
          <span className="text-text-primary font-medium">Generous caching headers.</span> Agents
          tend to make more frequent requests than individual humans. Set appropriate cache headers
          so repeat requests are cheap for both you and the agent. ETags and conditional requests
          are your friend.
        </p>

        <p>
          <span className="text-text-primary font-medium">Webhook support.</span> Instead of
          requiring agents to poll for changes, offer webhooks or event streams. An agent that can
          subscribe to &quot;new model releases&quot; and get notified immediately is far more useful
          than one that checks every five minutes.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Tools and Frameworks Worth Knowing</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Tool</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Purpose</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Why It Matters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">MCP SDK</td>
                <td className="px-4 py-3">Build MCP servers and clients</td>
                <td className="px-4 py-3">The standard integration protocol for AI agents</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic Agent SDK</td>
                <td className="px-4 py-3">Build production AI agents</td>
                <td className="px-4 py-3">Handles tool loops, state, and orchestration</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAPI / Swagger</td>
                <td className="px-4 py-3">API specification</td>
                <td className="px-4 py-3">Self-describing APIs that agents can discover</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">JSON-LD</td>
                <td className="px-4 py-3">Structured web data</td>
                <td className="px-4 py-3">Makes web content machine-readable</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">llms.txt</td>
                <td className="px-4 py-3">AI site discovery</td>
                <td className="px-4 py-3">Helps agents understand your platform</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Matters Now</h2>

        <p>
          The shift toward agent-friendly software isn&apos;t speculative. It&apos;s happening right
          now. Coding agents browse documentation sites. Research agents pull data from APIs.
          Personal assistant agents interact with web services on behalf of users. The number of
          agent-driven requests to web services is growing exponentially.
        </p>

        <p>
          If your software isn&apos;t ready for agent consumers, you&apos;re leaving value on the
          table. Not in some hypothetical future scenario, but today. Developers are choosing tools
          partly based on how well they integrate with their AI workflows. If your platform has
          great MCP support and your competitor doesn&apos;t, that&apos;s a real competitive
          advantage.
        </p>

        <p>
          The good news is that most of the work involved in becoming agent-friendly also makes your
          software better for human users. Structured data improves SEO. Clear API design reduces
          support burden. Good documentation helps everyone. Building for agents isn&apos;t a
          separate workstream; it&apos;s a higher standard applied to the same work you&apos;re
          already doing.
        </p>

        <p>
          We&apos;re all figuring this out together. The patterns are still emerging, the standards
          are still evolving, and the best practices are being written in real time. But the
          direction is clear. The software that thrives in the next few years will be the software
          that serves both humans and agents equally well.
        </p>
      </div>

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
