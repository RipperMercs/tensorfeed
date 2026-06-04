import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title: 'The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP.',
  description:
    'Four days after AWS made x402 the default agent payment rail, the next question is who verifies the on-chain settlement actually matches the claimed receipt. We shipped the read-only Base mainnet chain reader that lets any agent answer that without holding a private key. Eleven tools, MIT, on npm and the canonical MCP registry today.',
  alternates: { canonical: 'https://tensorfeed.ai/originals/x402-verifier-mcp-launch' },
  openGraph: {
    title: 'The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP.',
    description:
      'AWS made x402 the default. We shipped the verifier MCP. Read-only Base chain reader, eleven tools, no private keys, in the MCP registry today.',
    type: 'article',
    publishedTime: '2026-05-11T22:30:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP.',
    description:
      'AWS plugged x402 in four days ago. Today we shipped the canonical verifier MCP. npx -y @tensorfeed/x402-base-mcp.',
  },
};

export default function X402VerifierMcpLaunchPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP."
        description="Four days after AWS made x402 the default agent payment rail, the next question is who verifies the on-chain settlement actually matches the claimed receipt. We shipped the read-only Base mainnet chain reader that lets any agent answer that without holding a private key."
        datePublished="2026-05-11"
        author="Adrian Vale"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <ArticleHero
        mode="graphic"
        icon={ShieldCheck}
        gradientFrom="#0B2A1A"
        gradientTo="#16C784"
        eyebrow="Build Log · Agent Infrastructure"
      />

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-05-11">May 11, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/x402-verifier-mcp-launch"
        title="The x402 Payment Just Settled. Now What Verifies It? We Shipped the MCP."
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Four days ago AWS plugged x402 in. Stablecoin micropayments became a first-class way for an
          AI agent to buy compute from the largest cloud on the planet. The rail just got picked. The
          rail now needs the layer everyone forgot to build: an open, key-free, agent-callable verifier
          for the on-chain settlement. We shipped it today.
        </p>

        <p>
          It is on npm as <code>@tensorfeed/x402-base-mcp</code>. It is in the canonical Model Context
          Protocol registry as <code>ai.tensorfeed/x402-base-mcp</code>. It is open source under MIT.
          It is published with cryptographic provenance via GitHub Actions OIDC, so any agent can
          verify the package on its own machine matches what we built. It is read-only. It cannot move
          a single token. That last property is the whole point.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Trust Question Nobody Was Asking Loud Enough</h2>

        <p>
          An x402 round trip is a beautiful thing. The agent calls a paid endpoint, gets a 402 with
          payment requirements, signs an EIP-3009 transferWithAuthorization for USDC on Base, and
          retries the call with the signature attached. The merchant&apos;s facilitator broadcasts the
          authorization, watches it land, returns 200 with the data and a payment receipt. The whole
          thing clears in two seconds for fractions of a cent in gas. No accounts. No API keys for
          billing. No human in the loop. Magic.
        </p>

        <p>
          But the receipt the merchant returns is, at the end of the day, just a JSON object the
          merchant typed. The transaction hash inside it is supposed to point to an on-chain transfer
          that exactly matches the claim. In practice, the agent has two options: trust the merchant,
          or stand up its own Ethereum RPC, decode the receipt, parse the Transfer event, and check
          the recipient and the amount. The first option is fine until a merchant cheats. The second
          option requires the agent to operate infrastructure it should not have to operate.
        </p>

        <p>
          The middle option is a piece of software that any agent can call as a tool, that reads the
          chain on the agent&apos;s behalf, that holds no private keys and can move no funds, and
          that answers exactly one question well: did the on-chain settlement actually match this
          receipt? That is what shipped today.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Eleven Tools, One Boundary</h2>

        <p>
          The package exposes eleven Model Context Protocol tools split into three tiers. Six are
          generic Base mainnet reads any agent might want for sanity: ETH balance, USDC balance, block
          number, transaction receipt, contract call, and a USDC transfer scan for a given address.
          Three are x402-native: verify a settlement matches a claim, parse a publisher&apos;s
          <code>/.well-known/x402</code> manifest, list recent USDC payments to a merchant address.
          Two are TensorFeed-flavored: check whether a domain meets the Agent Fair-Trade Agreement
          certification, and look up whether a transaction hash is a payment to our own canonical
          wallet.
        </p>

        <p>
          The whole surface area is read-only by construction. There is no signing key in the package.
          There is no RPC endpoint in the allowlist that accepts write operations. The package cannot
          be repurposed into a wallet. If an attacker compromises an installation, the worst they can
          do is observe what the agent is querying. We picked that constraint on purpose.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The First Canonical Settlement Is Our Own</h2>

        <p>
          The integration tests in the repository do not run against a mock. They run against the live
          Base mainnet, and one of the tests verifies the first canonical Coinbase x402 V2 payment
          TensorFeed ever received: transaction hash
          {' '}<code>0xe20c57d8aa6df63f75ce7a4e4c0cab492eb7fa672a23cd8fd59967eb6b66bd67</code>, block
          45,716,939, 0.02 USDC from an AgentCore-compatible client to our payment wallet. The
          verification tool returns <code>verified: true</code> with the matching transfer evidence.
        </p>

        <p>
          Anyone can run that test from their own machine, against their own RPC, and reach the same
          answer. That is what a canonical artifact looks like. We tag it because the next year of
          agent commerce will need a thousand of these references, and we wanted the first one to be
          something we could point at.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Federation Composability</h2>

        <p>
          The verifier composes with the Agent Fair-Trade Agreement. AFTA is the open standard we
          shipped two weeks ago for agent-friendly paid APIs. It guarantees a no-charge on upstream
          errors, a no-charge on schema validation failure, a no-charge on stale data, and an
          Ed25519-signed receipt on every paid call. TerminalFeed federates with us under it.
        </p>

        <p>
          With this MCP, any agent doing AFTA-aware reasoning gets a one-call shortcut to the
          canonical answer on whether a domain&apos;s public surfaces honor the standard. The agent
          does not have to run the manifest fetch, the wallet cross-check, and the receipt-key probe
          itself. We do that lookup, sign the response, return a scored checklist. The federation
          grows by being legible to the agents who would join it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Install It</h2>

        <p>
          Drop the following into <code>claude_desktop_config.json</code>:
        </p>

        <pre className="bg-bg-secondary border border-border-primary rounded p-4 overflow-x-auto text-sm text-text-primary"><code>{`{
  "mcpServers": {
    "tensorfeed-x402-base": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/x402-base-mcp"]
    }
  }
}`}</code></pre>

        <p>
          Or, for Claude Code:
        </p>

        <pre className="bg-bg-secondary border border-border-primary rounded p-4 overflow-x-auto text-sm text-text-primary"><code>{`claude mcp add tensorfeed-x402-base -- npx -y @tensorfeed/x402-base-mcp`}</code></pre>

        <p>
          The default RPC is the public Base endpoint. For higher rate limits you can supply an
          Alchemy or Infura URL via <code>TENSORFEED_RPC_URL</code>. The full source is at
          {' '}<a href="https://github.com/RipperMercs/tensorfeed-x402-base-mcp" className="text-accent-primary hover:underline">github.com/RipperMercs/tensorfeed-x402-base-mcp</a>.
          The threat model is in the README. The security policy is in <code>SECURITY.md</code>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Goes</h2>

        <p>
          The next year of agent commerce will produce more on-chain settlements than the last decade
          of crypto produced. Most of those settlements will be tiny. Most of those receipts will be
          machine-generated. Some fraction of them will be wrong, by accident or by design. The agents
          buying things at loop speed need a primitive that lets them check before they trust. We
          built that primitive, made it free, and put it where the agents already look for tools.
        </p>

        <p>
          AWS picked open four days ago. AFTA federation members are running on open today. The
          x402 verifier is open as of this afternoon. The early-mover window for the agent payment
          stack is real and it is closing fast. Lock in your stake while you can still pick the layer.
        </p>
      </div>

    </article>
  );
}
