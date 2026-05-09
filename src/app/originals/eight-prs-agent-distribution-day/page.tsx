import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Network } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title:
    'Eight Pull Requests Across the Agent Ecosystem in 24 Hours. Here Is What I Learned.',
  description:
    'I shipped eight PRs across Anthropic, OpenAI, and the canonical Model Context Protocol Registry in one day. None of it was a stunt. Each one fit into a slot the frontier labs had built and were waiting to be filled. Inside the recurring pattern of vertical reference repos and skill catalogs, the canonical MCP Registry as cross-LLM routing layer, what this implies for any data publisher with a real dataset, and the three signals to watch for the next wave.',
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/eight-prs-agent-distribution-day',
  },
  openGraph: {
    title:
      'Eight Pull Requests Across the Agent Ecosystem in 24 Hours. The Distribution Slots Are Open.',
    description:
      'Anthropic, OpenAI, and the MCP Registry all opened explicit third-party slots for data publishers in 2026. I filled eight of them in one day. Here is the recurring pattern, what it took, and the three signals that say more is coming.',
    type: 'article',
    publishedTime: '2026-05-10T01:00:00Z',
    authors: ['Ripper'],
    url: 'https://tensorfeed.ai/originals/eight-prs-agent-distribution-day',
    siteName: 'TensorFeed.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Eight Pull Requests Across the Agent Ecosystem in 24 Hours.',
    description:
      'The agent distribution stack got built across three frontier labs and one canonical registry. Here is what filling all eight slots taught me.',
  },
};

export default function EightPrsAgentDistributionDayPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Eight Pull Requests Across the Agent Ecosystem in 24 Hours. Here Is What I Learned."
        description="I shipped eight PRs across Anthropic, OpenAI, and the canonical Model Context Protocol Registry in one day. Inside the recurring pattern of vertical reference repos and skill catalogs, the MCP Registry as cross-LLM routing layer, what this implies for any data publisher, and three signals for the next wave."
        datePublished="2026-05-10"
        author="Ripper"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-8">
        <p className="text-text-muted text-sm font-mono mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          May 9, 2026 · 8 min read · By Ripper
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
          Eight Pull Requests Across the Agent Ecosystem in 24 Hours. Here Is What I Learned.
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          I opened eight pull requests across Anthropic, OpenAI, and the canonical Model Context Protocol Registry in one day. None of it was a stunt. Each one fit into a slot the frontier labs had built and were waiting to be filled. The slots had names like <em>vertical reference repository</em>, <em>skill catalog</em>, <em>plugin marketplace</em>, <em>cookbook</em>. The pattern is recurring. Here is what filling them taught me.
        </p>
      </header>

      <ShareBar
        path="/originals/eight-prs-agent-distribution-day"
        title="Eight Pull Requests Across the Agent Ecosystem in 24 Hours. Here Is What I Learned."
      />

      <ArticleHero
        mode="graphic"
        icon={Network}
        gradientFrom="#1e1b4b"
        gradientTo="#0f172a"
        eyebrow="Agent Distribution"
        caption="The agent distribution stack now spans Anthropic, OpenAI, Microsoft, and the canonical MCP Registry. Six third-party slots, one day, one data publisher."
      />

      <div className="prose prose-invert max-w-none">
        <h2>The pattern</h2>
        <p>
          The frontier labs have spent the last year quietly building out third-party-developer surfaces specifically for the agent layer. They are not API portals. They are not docs sites. They are git repositories with explicit submission paths, designed so that anyone with a real data layer or domain expertise can ship a connector that a Claude Code or Codex or Cursor session can install.
        </p>
        <p>
          Three categories show up across vendors:
        </p>
        <ol>
          <li>
            <strong>Vertical reference repositories.</strong> Anthropic shipped <code>anthropics/financial-services</code> on May 5 and <code>anthropics/life-sciences</code> a few weeks earlier. Each is a curated marketplace of MCP connectors aimed at one industry. Pubmed, ClinicalTrials.gov, ChEMBL, Open Targets for life sciences. FactSet, S&amp;P Global, PitchBook, Moody&apos;s for finance. The pattern is explicit: pick the vertical, list the data sources, let an agent install a coordinated bundle.
          </li>
          <li>
            <strong>Generic skill catalogs.</strong> <code>anthropics/skills</code> at 131K stars. <code>openai/skills</code> at 18.7K, the analog for Codex. <code>microsoft/skills</code> for Azure SDK and Foundry contexts. The shape repeats across vendors. Three legs of a triangle. Each has its own quirks but all three accept third-party SKILL.md submissions.
          </li>
          <li>
            <strong>Plugin marketplaces.</strong> <code>anthropics/knowledge-work-plugins</code> for Claude Cowork. <code>anthropics/claude-plugins-official</code> for Claude Code itself. The Anthropic Connectors Directory at <code>platform.claude.com</code>. These are user-facing install surfaces with curated approval flows.
          </li>
        </ol>
        <p>
          On top of all three sits the <strong>Model Context Protocol Registry</strong> at <code>registry.modelcontextprotocol.io</code>. Vendor-neutral. Maintained jointly by Anthropic, GitHub, PulseMCP, and Stacklok. This one is the routing layer the others quietly rely on. Once an MCP server is in the canonical registry, any spec-compliant client across any vendor can discover and connect.
        </p>
        <p>
          Six surfaces. One data publisher. One day.
        </p>

        <h2>The eight</h2>
        <p>
          For receipts, the stack:
        </p>
        <ul>
          <li>
            <strong>anthropics/financial-services</strong> (PR #156, opened May 8): added TensorFeed as an MCP connector option in <code>plugins/vertical-plugins/financial-analysis/.mcp.json</code>. The repo had launched May 5; we caught it the next day.
          </li>
          <li>
            <strong>anthropics/life-sciences</strong> (PR #41): same vertical-marketplace pattern, different industry. Submitted under <code>tensorfeed/.claude-plugin/plugin.json</code> with a description leading on FDA regulatory and safety data, the gap none of the existing 21 connectors covered.
          </li>
          <li>
            <strong>anthropics/skills</strong> (PR #1114): a SKILL.md describing how a Claude Code session should call our hosted MCP server. Trigger guidance on AI news, security CVE lookups, FDA recalls, SEC filings.
          </li>
          <li>
            <strong>anthropics/knowledge-work-plugins</strong> (PR #221): submitted under <code>partner-built/tensorfeed/</code> mirroring the existing Apollo, Salesforce, Common Room entries. Different framing for Claude Cowork, same hosted MCP underneath.
          </li>
          <li>
            <strong>anthropics/claude-cookbooks</strong> (PR #611): a working Jupyter notebook in <code>patterns/agents/</code> demonstrating cross-database CVE verification using the Anthropic API tool-use loop with our MCP server. Real demo, runs end to end with an Anthropic API key.
          </li>
          <li>
            <strong>anthropics/claude-plugins-official</strong> (form-submitted): the official Claude Code plugin directory uses a form at <code>clau.de/plugin-directory-submission</code> rather than a PR. Manifest committed at <code>claude-plugins/tensorfeed/</code> in our public repo, then submitted by form.
          </li>
          <li>
            <strong>openai/skills</strong> (PR #405): the Codex equivalent of the Anthropic skill submission. Tighter scoping for the OpenAI audience, same trigger guidance.
          </li>
          <li>
            <strong>openai/openai-cookbook</strong> (PR #2683): a notebook demonstrating cross-database CVE verification using OpenAI&apos;s Responses API native MCP tool. Cleaner code than the Anthropic version because the Responses API integrates MCP servers directly, no manual JSON-RPC loop.
          </li>
        </ul>
        <p>
          And the canonical registry update underneath all of it: <strong>ai.tensorfeed/mcp-server v1.26.0</strong> live with both the npm stdio package and the hosted HTTP URL listed. Any MCP-aware agent reading the registry can now route to us through either transport. The previous eight versions only exposed the stdio path.
        </p>

        <AdPlaceholder slot="originals-mid" />

        <h2>The MCP Registry is the part most people are missing</h2>
        <p>
          The plugin marketplaces and skill catalogs get the press. Anthropic launched claude-plugins-official with a public skill explorer. OpenAI&apos;s skills repo has 18K stars and ships with skills.sh installation. They are real. They are valuable. They are also vendor-locked. A skill written for Codex does not auto-show in a Claude Code session.
        </p>
        <p>
          The MCP Registry is the layer that should not be vendor-locked, and is not. It is a normal Apache-2.0 project with maintainers from four organizations including Anthropic and GitHub. The API is in feature-freeze at v0.1 since October 2025 specifically so integrators can build against a stable shape. Today&apos;s update from us was a domain-authenticated publish under <code>ai.tensorfeed/*</code> using an Ed25519 signature against a DNS TXT record. No Anthropic-specific tokens. No OpenAI-specific endpoints. The flow does not change whichever client picks our server up.
        </p>
        <p>
          That property compounds. If you make your MCP server discoverable through the canonical registry, every spec-compliant client across vendors gets you for free. Add a hosted HTTP variant alongside the stdio package and you remove the install step. We did both today, in one publish.
        </p>

        <h2>What this means if you publish data</h2>
        <p>
          If you operate a real dataset (open-source project with structured outputs, regulatory database, internal data tooling, anything that produces facts), you have an open invitation to ship a connector. The slots are documented. The submission paths are public. Most are PRs to a normal git repository with a CONTRIBUTING.md. The bar for a clean submission is a working MCP server, a SKILL.md or plugin.json, a license that permits redistribution, and an honest description.
        </p>
        <p>
          The cost-of-entry is not the engineering. It is the <em>knowing about it</em>. Two of the eight repos we landed in today did not exist a month ago. <code>anthropics/cwc-workshops</code> showed up three days ago with no submission docs yet. <code>anthropics/financial-services</code> appeared May 5. The vertical-marketplace pattern is going to repeat. There will be a Claude for Cybersecurity reference repo soon, a Claude for Healthcare, a Claude for Education. OpenAI will mirror.
        </p>
        <p>
          Whoever shows up first becomes the default for that vertical. Once a connector is referenced in <code>marketplace.json</code> with a maintained source path, it stays. The first integration becomes part of the install experience for everyone running <code>/plugin install vertical-name</code>.
        </p>

        <h2>The recurring pattern asks you to automate</h2>
        <p>
          We caught most of today&apos;s targets through manual GitHub searching. That worked but it is not durable. Halfway through the day we shipped a TensorFeed feature that polls GitHub on a daily cron at 13:30 UTC for new repos in the anthropics, openai, microsoft, and modelcontextprotocol orgs, plus broader keyword sweeps for MCP servers, x402 projects, and skill catalogs. Output is a free agent-discoverable endpoint at <code>/api/agents/opportunities</code>.
        </p>
        <p>
          The first run caught <code>anthropics/claude-plugins-official</code> at 18.9K stars, which I had missed in the manual scan that morning. That became the sixth submission of the day. The system worked the first time it ran. It will keep working.
        </p>
        <p>
          More importantly, the endpoint is itself a piece of the agent layer. An agent crawling TF discovers it the same way it discovers our news feed. It surfaces in the canonical MCP server tool list. The next agent looking for distribution opportunities can ask TF directly, instead of fanning out across GitHub search.
        </p>

        <h2>Three signals worth watching</h2>
        <p>
          <strong>The next vertical reference repo from Anthropic.</strong> The pattern says cybersecurity is the natural next one given the Mythos release and the pre-launch evaluation framework. Education, healthcare, and legal are also probable. The right move is to be ready before the announcement, with a clean MCP wrapper for the data layer that vertical needs.
        </p>
        <p>
          <strong>OpenAI&apos;s analog of claude-plugins-official.</strong> OpenAI has openai/skills and openai/plugins and a Codex install pipeline, but no curated third-party plugin directory yet. They will ship one. The submission flow will probably mirror what the Codex skills repo already accepts.
        </p>
        <p>
          <strong>The MCP Registry&apos;s path to GA.</strong> The v0.1 freeze runs until breaking-change-readiness; v1 GA will likely consolidate the schema and add multi-version queries. Once GA lands, registry-driven install becomes the default flow for every spec-compliant client. The lift to be in the registry early is small. The cost of being late is being skipped.
        </p>

        <h2>What I am actually claiming</h2>
        <p>
          The agent distribution stack got built this year. Most of it ships through git repositories you can read on GitHub right now. The frontier labs have been explicit and friendly about wanting third-party data layers in those slots, which is the polar opposite of how the cloud era distributed software (proprietary marketplaces, complicated reseller agreements, certification programs). The MCP Registry sits underneath as a vendor-neutral routing layer that any client can read.
        </p>
        <p>
          If you have a real dataset and a real opinion about what an agent should do with it, the entry path costs about a day of focused work and pays out for as long as the registry and the marketplace.json files keep their maintained shape.
        </p>
        <p>
          TensorFeed was built for AI agents from the first commit. Today the agent ecosystem returned the favor by giving us seven distinct discovery surfaces in a single day. The thesis just got loud.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-text-muted text-sm">
          More from TensorFeed:{' '}
          <Link href="/originals/verified-feed-trust-layer" className="text-accent-primary hover:underline">
            The Verified Feed Is Live
          </Link>{' '}
          ·{' '}
          <Link href="/originals/ai-cyber-tier-data-layer" className="text-accent-primary hover:underline">
            The AI Cyber Tier Now Has a Data Layer
          </Link>{' '}
          ·{' '}
          <Link href="/api/agents/opportunities" className="text-accent-primary hover:underline">
            /api/agents/opportunities
          </Link>{' '}
          ·{' '}
          <Link href="/api-reference" className="text-accent-primary hover:underline">
            Full API reference
          </Link>
        </p>
      </div>
    </article>
  );
}
