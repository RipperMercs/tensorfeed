import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agent Payments Integration: Make Your AI Agent Pay APIs in USDC',
  description:
    'How to wire your AI agent to pay TensorFeed (or your own pay-per-call API) in USDC on Base mainnet. Python and TypeScript SDK paths, MCP integration, and the validate-and-charge contract for sister-site Workers.',
  alternates: { canonical: 'https://tensorfeed.ai/use-cases/agent-payments' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/use-cases/agent-payments',
    title: 'Agent Payments Integration on TensorFeed',
    description: 'Make your AI agent pay TensorFeed in USDC on Base. SDK paths, MCP integration, validate-and-charge contract.',
    siteName: 'TensorFeed.ai',
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I make my AI agent pay TensorFeed in USDC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Easiest path: install the Python SDK with the optional [web3] extra (pip install \'tensorfeed[web3]\'), then call tf.purchase_credits(amount_usd=1, private_key="0x..."). The SDK quotes credits, signs and broadcasts the USDC tx on Base, confirms with TensorFeed, and stores the bearer token on the client. From there, every premium API call decrements credits automatically. The TypeScript SDK has the equivalent flow but you bring your own wallet client.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can my agent pay without a Python SDK?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The full payment flow is three HTTP calls: POST /api/payment/buy-credits with {amount_usd} returns a wallet + memo + quote. Send the USDC on Base to the wallet using your wallet of choice (Rabby, Coinbase Wallet, etc.). POST /api/payment/confirm with {tx_hash, nonce} returns a bearer token. From then on, send Authorization: Bearer tf_live_... on any /api/premium/* request. The discovery manifest at /.well-known/x402 documents every endpoint with its accepts.amount in atomic USDC units.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does cross-site agent payment work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The TensorFeed Worker exposes /api/internal/validate-and-charge (server-to-server only, X-Internal-Auth gated) so a sister-site Worker can validate a TensorFeed bearer token and decrement credits over HTTP. This is the contract that powers the cross-site bundle: an agent buys credits once on TensorFeed, then spends them on TerminalFeed.io premium endpoints (and any future sister-site Pizza Robot Studios product). One purchase, multiple sites.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I implement my own agent-payable API?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'See the architectural argument at /originals/why-usdc-over-stripe and the build retrospective at /originals/15-paid-endpoints-24-hours. The minimum viable payment middleware is one file: verify the USDC Transfer event on the Base RPC, mint a bearer token, decrement credits per call. Replay protection at the tx-hash level is non-negotiable. Multi-publication wallet attestation (TLS + at least 3 published locations) prevents address-swap attacks.',
      },
    },
  ],
};

export default function AgentPaymentsUseCasePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Link
        href="/use-cases"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All use cases
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Wallet className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Agent payments integration</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Make your AI agent pay TensorFeed (or your own pay-per-call API) in USDC on Base
          mainnet. End-to-end SDK paths, MCP integration, and the validate-and-charge contract
          for sister-site Workers. No accounts, no API keys, no Stripe.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">Path 1: One-call purchase via the Python SDK</h2>
        <p>
          The shortest path for an agent that already has a private key for a Base wallet:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`# pip install 'tensorfeed[web3]'
from tensorfeed import TensorFeed

tf = TensorFeed()
result = tf.purchase_credits(
    amount_usd=1.0,
    private_key="0x...",   # never hardcode; read from env or secret manager
)
# Token is auto-stored on tf. Premium calls just work.

rec = tf.routing(task="code", top_n=3)
print(tf.balance())  # ~49 credits remaining`}</code></pre>
        <p>
          Under the hood this calls /api/payment/buy-credits, signs and broadcasts the USDC
          transfer via web3.py, then calls /api/payment/confirm. End-to-end takes 5-10 seconds
          the first time; subsequent premium calls are 50ms.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Path 2: Manual flow (any language)</h2>
        <p>
          If you do not want a web3 dependency in your agent, do the three steps yourself:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`# 1. Quote
curl -X POST https://tensorfeed.ai/api/payment/buy-credits \\
  -H "Content-Type: application/json" \\
  -d '{"amount_usd": 1.0}'
# -> {"wallet": "0x549...", "memo": "tf-...", "credits": 50, ...}

# 2. Send USDC on Base to the wallet using your wallet of choice
#    (Rabby, Coinbase Wallet, MetaMask on Base, AgentKit, etc.)

# 3. Confirm
curl -X POST https://tensorfeed.ai/api/payment/confirm \\
  -H "Content-Type: application/json" \\
  -d '{"tx_hash": "0x...", "nonce": "tf-..."}'
# -> {"token": "tf_live_...", "balance": 50}

# 4. Use
curl https://tensorfeed.ai/api/premium/routing?task=code \\
  -H "Authorization: Bearer tf_live_..."`}</code></pre>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Path 3: x402 fallback (no pre-flight)</h2>
        <p>
          For one-shot discovery calls where you do not want to pre-commit to credits, hit any
          premium endpoint without auth. The 402 response includes payment instructions; retry
          with <code className="text-accent-primary font-mono">X-Payment-Tx: 0x...</code> after
          sending the USDC. Latency is 3-5 seconds (on-chain confirmation) instead of 50ms, so
          this is best for discovery, not repeat use.
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`# Discover the endpoint
curl https://tensorfeed.ai/api/premium/routing
# -> 402 Payment Required + payment instructions

# Send USDC on Base to the wallet from the response, then:
curl https://tensorfeed.ai/api/premium/routing?task=code \\
  -H "X-Payment-Tx: 0x..."
# -> data + bearer token in X-Payment-Token header`}</code></pre>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Path 4: MCP integration (Claude Desktop / Code)</h2>
        <p>
          If your agent is an MCP-aware client, drop the TensorFeed MCP server into config. The
          token lives in an env var; the server reads it on each tool call:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"],
      "env": { "TENSORFEED_TOKEN": "tf_live_..." }
    }
  }
}`}</code></pre>
        <p>
          22 tools become available to the model: 5 free (news, status, pricing, etc.) and 17
          premium (routing, news search, history series, cost projection, forecasting,
          provider deep-dive, model comparison, webhook watches, etc.). The model decides which
          tools to call; you pay 1 credit per premium tool invocation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Cross-site bundle</h2>
        <p>
          TensorFeed exposes <code className="text-accent-primary font-mono">/api/internal/validate-and-charge</code>{' '}
          so sister-site Workers (TerminalFeed.io today, future Pizza Robot Studios products
          tomorrow) can validate the same bearer token and debit credits over HTTP. Server-to-
          server only, gated by an X-Internal-Auth shared secret, never exposed to agents
          directly. The result: agents buy credits once, spend them on either site. The
          architecture is in <Link href="/originals/15-paid-endpoints-24-hours" className="text-accent-primary hover:underline">the build retrospective</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Wallet attestation</h2>
        <p>
          Before any agent sends real USDC, it should cross-check the wallet across the four
          published locations. We publish the address at:
        </p>
        <ul className="space-y-1 list-disc list-inside ml-4">
          <li><Link href="/llms.txt" className="text-accent-primary hover:underline">/llms.txt</Link></li>
          <li><a href="https://tensorfeed.ai/api/payment/info" className="text-accent-primary hover:underline">/api/payment/info</a> (also lists the operator: Pizza Robot Studios LLC, California, USA)</li>
          <li><a href="https://github.com/RipperMercs/tensorfeed" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">GitHub README</a></li>
          <li><a href="https://x.com/tensorfeed" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">@tensorfeed bio on X</a></li>
        </ul>
        <p>
          If any of the four disagree, do not send. The address is currently
          <code className="text-accent-primary font-mono break-all mx-1">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code>
          on Base mainnet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">If you are building your own agent-payable API</h2>
        <p>
          The full architectural argument is in the originals: why USDC on Base over Stripe (
          <Link href="/originals/why-usdc-over-stripe" className="text-accent-primary hover:underline">link</Link>),
          how validation works end-to-end (
          <Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline">link</Link>),
          and a 50-line MCP server reference (
          <Link href="/originals/mcp-server-fifty-line-file" className="text-accent-primary hover:underline">link</Link>).
          The TensorFeed source is on GitHub if you want to crib the payment middleware
          directly.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Recommended endpoints (in priority order)</h2>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><a className="text-accent-primary hover:underline" href="https://tensorfeed.ai/api/payment/info"><code className="font-mono text-sm">/api/payment/info</code></a> — wallet, pricing, supported flows, attestation</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/payment/buy-credits</code></Link> — quote a credit purchase</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/payment/confirm</code></Link> — verify USDC tx on-chain, mint bearer token</li>
          <li><Link href="/developers/agent-payments" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/api/payment/balance</code></Link> — check remaining credits</li>
          <li><Link href="/.well-known/x402" className="text-accent-primary hover:underline"><code className="font-mono text-sm">/.well-known/x402</code></Link> — x402 V2 discovery manifest with all paid endpoints</li>
        </ul>

        <div className="bg-bg-secondary border border-border rounded-xl p-5 mt-8">
          <h3 className="text-text-primary font-semibold mb-2">Other use cases</h3>
          <ul className="space-y-1 text-text-secondary text-sm list-disc list-inside">
            <li><Link href="/use-cases/coding-agents" className="text-accent-primary hover:underline">Coding agents</Link></li>
            <li><Link href="/use-cases/research-agents" className="text-accent-primary hover:underline">Research agents</Link></li>
            <li><Link href="/use-cases/api-cost-monitoring" className="text-accent-primary hover:underline">API cost monitoring</Link></li>
          </ul>
        </div>
      </div>
    </article>
  );
}
