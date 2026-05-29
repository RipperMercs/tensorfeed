import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'What is Agent Payments? Pay-Per-Call APIs for AI Agents | TensorFeed',
  description:
    'Agent payments is the pattern: pay-per-call APIs settled in stablecoins (typically USDC on Base or Solana), no signup forms, no credit cards, no human in the loop. Built on x402 and MCP.',
  alternates: { canonical: 'https://tensorfeed.ai/glossary/agent-payments' },
  openGraph: {
    title: 'What is Agent Payments? Pay-Per-Call APIs for AI Agents',
    description: 'The pattern: pay-per-call APIs settled in stablecoins, no accounts, no human in the loop. Built on x402 and MCP.',
    url: 'https://tensorfeed.ai/glossary/agent-payments',
  },
  keywords: ['agent payments', 'agentic commerce', 'pay per call AI', 'autonomous agent commerce', 'x402', 'machine to machine payment', 'AI agent monetization', 'USDC on Base'],
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What does "agent payments" mean?',
      acceptedAnswer: { '@type': 'Answer', text: 'Agent payments refers to the pattern of pay-per-call API access settled in stablecoins (typically USDC on Base or Solana) where the buyer is an AI agent rather than a human. No signup forms, no credit cards, no copy-paste API keys. The agent has its own wallet, the API has its own wallet, and the transaction settles on-chain in seconds.' },
    },
    {
      '@type': 'Question',
      name: 'Why not use Stripe for AI agent APIs?',
      acceptedAnswer: { '@type': 'Answer', text: 'Stripe and traditional payment processors assume there is a human at a keyboard at purchase time. Their primitives (signup forms, 3DS challenges, webhook secrets, dashboard logins) all require human intervention. AI agents making decisions autonomously in a loop have none of those affordances. Agent payments uses on-chain rails because they are designed for programmatic actors with their own keys.' },
    },
    {
      '@type': 'Question',
      name: 'What does an agent payment flow look like in practice?',
      acceptedAnswer: { '@type': 'Answer', text: 'An agent discovers a paid endpoint (via x402 manifest, MCP registry, or hardcoded URL). It POSTs a request with no auth and receives HTTP 402 with payment instructions: wallet address, asset, network, amount. It signs and broadcasts a USDC transfer on-chain. It retries the request with the tx hash in a header. The server verifies the on-chain receipt and serves the data. Total round-trip: about 5 seconds the first time, sub-second per call after a bearer token mints.' },
    },
    {
      '@type': 'Question',
      name: 'What is the relationship between agent payments, x402, and MCP?',
      acceptedAnswer: { '@type': 'Answer', text: 'They compose. MCP is the discovery and tool-calling layer (how the agent finds and invokes APIs). x402 is the payment-required layer (how the API gates responses on payment). Agent payments is the resulting pattern: agents discover tools via MCP, pay via x402, settle on-chain. Each piece is independently useful, but together they form a complete agent commerce stack.' },
    },
  ],
};

export default function AgentPaymentsGlossaryPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Link
        href="/for-ai-agents"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AI agents
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">Agent Payments</h1>
        <p className="text-lg text-text-secondary">
          The pattern: pay-per-call APIs settled in stablecoins, no signup forms, no credit cards,
          no human in the loop. Built on{' '}
          <Link href="/glossary/x402" className="text-accent-primary hover:underline">x402</Link> and{' '}
          <Link href="/glossary/mcp" className="text-accent-primary hover:underline">MCP</Link>, settled
          on Base mainnet with USDC.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">The shift</h2>
        <p>
          For most of the internet&apos;s history, every paid API assumed a human at purchase time.
          A human filled out a signup form. A human attached a credit card. A human copy-pasted an
          API key into a config file. The whole stack of payment infrastructure (Stripe, PayPal,
          merchant accounts, processors) was designed around that assumption.
        </p>

        <p>
          AI agents do not have that. An agent making decisions in a loop does not have a credit
          card. It does not have a SaaS account. It does not have a human approving each
          transaction. The agent payments pattern fills the gap by removing the human entirely
          from the credential and authorization path.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">The three primitives</h2>
        <ol className="space-y-2 list-decimal list-inside ml-4">
          <li><strong className="text-text-primary">Self-custodied agent wallets:</strong> the agent has its own private key and an on-chain address it controls. Funded by its developer or earned from parent agents paying it for tasks.</li>
          <li><strong className="text-text-primary">x402 payment-required HTTP:</strong> the API returns 402 with payment instructions. The agent retries with proof of payment. See{' '}
            <Link href="/glossary/x402" className="text-accent-primary hover:underline">x402</Link>{' '}
            for the full protocol.</li>
          <li><strong className="text-text-primary">Discovery via MCP and well-known manifests:</strong> agents find paid services via the official MCP registry, .well-known/x402 manifests, or hardcoded URLs. See{' '}
            <Link href="/glossary/mcp" className="text-accent-primary hover:underline">MCP</Link>.</li>
        </ol>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Why on-chain settlement</h2>
        <p>The on-chain rail (typically USDC on Base, sometimes Solana) gives agent payments four properties traditional payment infra cannot match:</p>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><strong className="text-text-primary">No accounts:</strong> wallets are first-class identities. The agent is the wallet.</li>
          <li><strong className="text-text-primary">No chargebacks:</strong> on-chain finality means once paid, the transaction is settled. No 60-day reversal window.</li>
          <li><strong className="text-text-primary">No platform risk:</strong> Stripe can decide tomorrow that AI agent transactions look fishy and freeze the merchant account. On-chain settlement has no such kill switch.</li>
          <li><strong className="text-text-primary">Microtransactions work:</strong> sub-cent gas fees on L2s like Base make $0.02 per call economically viable. Stripe&apos;s $0.30 + 2.9% per transaction cannot price that low.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">A real example</h2>
        <p>
          TensorFeed validated the full agent payments loop on Base mainnet on April 27, 2026. Tx{' '}
          <a
            href="https://basescan.org/tx/0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline font-mono text-xs break-all"
          >
            0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e
          </a>: 1 USDC bought 50 credits, one premium routing call charged 1 credit, balance went
          50 to 49. Five steps, ran in under two minutes, worked first try. The full trace is in{' '}
          <Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline">
            this originals post
          </Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">The current state of the ecosystem</h2>
        <p>
          As of mid-2026, agent payments is early but real. Coinbase Developer Platform shipped{' '}
          <Link href="/glossary/x402" className="text-accent-primary hover:underline">x402</Link>{' '}
          V2 with discovery extensions. The official MCP registry has thousands of servers. Smithery,
          mcp.so, and other registries provide additional discovery paths. A handful of services
          (TensorFeed, PROWL, SkillMint, APIbase.pro, others) have shipped pay-per-call premium tiers.
          Coinbase&apos;s AgentKit and a few independent projects are working on agent wallet
          tooling.
        </p>

        <p>
          The bottleneck is on the buyer side: most AI agents do not yet have wallets. The frameworks
          most agents are built on (LangChain, LangGraph, CrewAI, Autogen, custom OpenAI/Anthropic
          SDKs) have no native wallet abstraction. That is changing, but slowly.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">If you are building an agent that pays</h2>
        <p>
          The simplest path: use TensorFeed&apos;s Python SDK with the optional <code className="text-accent-primary font-mono">[web3]</code>{' '}
          extra. <code className="text-accent-primary font-mono">tf.purchase_credits(amount_usd=, private_key=)</code>{' '}
          handles the full quote + sign + broadcast + confirm flow in one call. The token is
          stored on the client and used for subsequent premium calls. Equivalent flows exist in
          the TypeScript SDK and via direct curl + a wallet of your choice.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">If you are running an API and want to accept agent payments</h2>
        <p>
          Implement x402 on at least one paid endpoint. Verify the USDC Transfer event log
          server-side rather than trusting the tx hash. Implement replay protection at the
          tx-hash level. Publish a discovery manifest at{' '}
          <code className="text-accent-primary font-mono">/.well-known/x402</code>. Document the
          legal entity behind the wallet so paying agents can audit the counterparty. The full
          rationale is in <Link href="/originals/why-usdc-over-stripe" className="text-accent-primary hover:underline">why we picked USDC on Base over Stripe</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Further reading</h2>
        <ul className="space-y-1 list-disc list-inside ml-4">
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline">TensorFeed agent payments docs</Link>: the full TensorFeed implementation</li>
          <li><Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline">Mainnet validation post</Link>: the actual tx hash and five-step flow</li>
          <li><Link href="/originals/why-usdc-over-stripe" className="text-accent-primary hover:underline">Why USDC on Base over Stripe</Link>: the architectural argument</li>
          <li><a href="https://www.x402.org" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">x402.org</a>: the protocol</li>
          <li><a href="https://docs.cdp.coinbase.com/x402/welcome" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">CDP Bazaar</a>: Coinbase&apos;s x402 facilitator and discovery layer</li>
        </ul>
      </div>
    </article>
  );
}
