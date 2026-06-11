import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/validating-agent-payments-mainnet' },
  title: 'We Validated Agent Payments End-to-End on Base Mainnet',
  description:
    'A first-person walkthrough of the five-step USDC payment loop on Base mainnet that proved TensorFeed agent payments work in production. Real tx hash, real credits, no bugs surfaced.',
  openGraph: {
    title: 'We Validated Agent Payments End-to-End on Base Mainnet',
    description:
      'The five-step USDC payment loop that took TensorFeed agent payments from designed to operational. Real tx hash on Base mainnet, no bugs surfaced.',
    type: 'article',
    publishedTime: '2026-04-27T18:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'We Validated Agent Payments End-to-End on Base Mainnet',
    description:
      'Real USDC, real tx hash, real credits. The five-step payment loop that proved TensorFeed agent payments work.',
  },
};

export default function MainnetValidationPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="We Validated Agent Payments End-to-End on Base Mainnet"
        description="A first-person walkthrough of the five-step USDC payment loop on Base mainnet that proved TensorFeed agent payments work in production."
        datePublished="2026-04-27"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          We Validated Agent Payments End-to-End on Base Mainnet
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-04-27">April 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/validating-agent-payments-mainnet"
        title="We Validated Agent Payments End-to-End on Base Mainnet"
      />
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          This morning I sent one USDC from a wallet on my laptop to a wallet I had published in four
          places, called a Python function, got back a token, asked a paid AI routing endpoint a
          question, and watched my balance tick down by exactly one credit. The whole thing took under
          two minutes. Every step worked first try.
        </p>

        <p>
          That sentence is the difference between TensorFeed agent payments being a design and being a
          system. Until today, the architecture existed, the code was deployed, and the tests passed.
          But nothing had moved real money on chain. There is a particular kind of nervous you only
          feel the moment before you click confirm on an irreversible transaction to your own
          self-custodied wallet using software you wrote yourself.
        </p>

        <p>
          I want to walk through what actually happened, because the parts that worked and the parts I
          braced for both teach you something about building payment-native APIs for AI agents.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The five-step loop</h2>

        <p>
          The flow we shipped is simple by design. An agent buys credits once, gets a bearer token,
          and uses that token on premium API calls. Each call decrements credits. When credits run
          out, the agent buys more. No accounts, no API keys, no Stripe, no chargebacks. Just USDC on
          Base mainnet and a token.
        </p>

        <p>
          Here is what I ran, end to end, from a Python REPL with the freshly published
          <code className="text-accent-primary mx-1 font-mono">tensorfeed</code> SDK installed via pip:
        </p>

        <h3 className="text-xl font-semibold text-text-primary pt-2">Step 1. Quote</h3>

        <p>
          I called <code className="text-accent-primary font-mono">tf.buy_credits(amount_usd=1.00)</code>
          and got back a quote: a wallet address, a memo nonce
          (<code className="text-accent-primary font-mono">tf-eb13b1a17c6811d6</code>), 50 credits at
          base rate, and a 30 minute expiry. The memo lets the worker tie a specific on-chain
          transaction back to a specific quote so volume discounts apply correctly.
        </p>

        <h3 className="text-xl font-semibold text-text-primary pt-2">Step 2. Send USDC on Base</h3>

        <p>
          I opened Rabby, switched to Base, sent one USDC to the quoted wallet. The transaction landed
          on chain in a few seconds. The hash:
          <code className="text-accent-primary font-mono break-all mx-1">
            0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e
          </code>.
          Anyone can verify this on Basescan right now. That permanence is the whole point.
        </p>

        <h3 className="text-xl font-semibold text-text-primary pt-2">Step 3. Confirm</h3>

        <p>
          Back in Python, <code className="text-accent-primary font-mono">tf.confirm(tx_hash=&hellip;,
          nonce=&hellip;)</code>. The worker fetched the transaction receipt from a Base RPC, parsed
          the USDC Transfer event log, verified the recipient was our wallet, and verified the amount
          matched the quoted USD value. It then minted a bearer token (
          <code className="text-accent-primary font-mono">tf_live_eb0d0155&hellip;</code>) and recorded
          the tx hash permanently for replay protection. The whole verification took maybe 200
          milliseconds.
        </p>

        <h3 className="text-xl font-semibold text-text-primary pt-2">Step 4. Spend a credit</h3>

        <p>
          With a token in hand, I called <code className="text-accent-primary font-mono">
          tf.routing(task=&quot;code&quot;, top_n=3)</code>. The worker checked the bearer token,
          decremented the balance by one, ran the routing engine over live pricing and benchmarks and
          status data, and returned three ranked recommendations. The top three:
        </p>

        <ul className="space-y-2 ml-6 list-disc">
          <li>Mistral Large, composite score 0.83</li>
          <li>OpenAI o3-mini, composite score 0.82</li>
          <li>Claude Sonnet 4.6, composite score 0.81</li>
        </ul>

        <p>
          Each recommendation came back with the full breakdown: quality from benchmarks, availability
          from live status, normalized cost across the candidate set, latency placeholder. An AI agent
          building a routing layer on top of this gets a complete decision in one paid call instead of
          stitching four free endpoints together.
        </p>

        <h3 className="text-xl font-semibold text-text-primary pt-2">Step 5. Verify the balance</h3>

        <p>
          One more call: <code className="text-accent-primary font-mono">tf.balance()</code>. The
          response: 49 credits remaining. One credit charged, 49 left, total purchased 50.
          Math checks out. System works.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What I expected to fail</h2>

        <p>
          Honestly? Probably half of it. Building a payment system from scratch, even a simple one,
          has a lot of edges. Here is what I had braced for:
        </p>

        <p>
          <strong className="text-text-primary">RPC flakiness.</strong> Base mainnet RPCs sometimes
          return stale data, sometimes time out under load. The verify step queries
          <code className="text-accent-primary font-mono mx-1">eth_getTransactionReceipt</code> from a
          public RPC endpoint. I expected at least one retry. None needed. The call returned a fully
          formed receipt with the correct logs the first time.
        </p>

        <p>
          <strong className="text-text-primary">Wei conversion bugs.</strong> USDC on Base is six
          decimal places, not eighteen like ETH. We treat the on-chain value as a BigInt and divide by
          ten to the sixth. Any off-by-one in that math and a one dollar payment becomes 0.000001
          credits or 1,000,000 credits. I had unit tests, but the production path uses real numbers in
          a real receipt, not a mock. It worked exactly. Fifty credits minted, as quoted.
        </p>

        <p>
          <strong className="text-text-primary">Replay protection.</strong> Once a tx hash is used to
          mint credits, we permanently record it under the
          <code className="text-accent-primary font-mono mx-1">pay:tx:</code> KV prefix. If someone
          tries to replay the same hash, we reject. I considered testing that path with a deliberate
          replay, but the design feels right and the test suite covers it. Save it for a follow-up.
        </p>

        <p>
          <strong className="text-text-primary">Token format.</strong> The bearer token is a
          <code className="text-accent-primary font-mono mx-1">tf_live_</code> prefix plus 256 bits of
          random hex. The format is parseable, scannable in logs without leaking secrets via the
          prefix, and obviously different from any major LLM API key prefix. I worried briefly that
          the auth header would not survive HTTP round-tripping. It did. No surprises.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why this matters</h2>

        <p>
          Less than one percent of APIs on the internet are machine-payable today. Almost every paid
          API still requires a human to fill out a signup form, attach a credit card, generate an API
          key, and copy it into a config file. That works fine when the consumer is a human. It does
          not work when the consumer is an AI agent making decisions in a loop at three in the
          morning.
        </p>

        <p>
          The whole point of agent-native infrastructure is to remove the human from the credential
          loop. An agent should be able to discover a paid API, evaluate whether it needs to spend
          money, send the payment, and use the result. All in the same execution context, with no
          human approval step. That is what x402 was designed to enable, and that is what TensorFeed
          agent payments delivers today.
        </p>

        <p>
          I did the test loop manually because I needed to feel each step. But everything I did from
          Python could be done by an autonomous agent. There is nothing about the flow that requires
          a human in any step. That is the entire bet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What is live as of today</h2>

        <p>
          Thirteen paid premium endpoints across the API surface. A free preview tier on the routing
          engine for discovery. Daily snapshots of pricing, models, benchmarks, status, and agent
          activity that compound into a moat we cannot recreate after the fact. Webhook watches that
          fire on price changes and service status transitions, signed with HMAC. An enriched agents
          directory with a derived trending score. A human-facing dashboard at
          <Link href="/account" className="text-accent-primary hover:underline mx-1">/account</Link>
          for people who want to see their balance without writing curl. SDKs for Python and
          TypeScript, and an MCP server that exposes every premium tool to Claude Desktop and Claude
          Code.
        </p>

        <p>
          And one verified transaction on Base mainnet that proves all of it works.
        </p>

        <p>
          If you want to try it yourself, the
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline mx-1">
            agent payments docs
          </Link>
          have the wallet address (cross-checked against four published locations), pricing tiers,
          payment flow examples in Python and curl, and the no-training Terms summary. The Python SDK
          is on PyPI as <code className="text-accent-primary font-mono">tensorfeed</code>. Buy a
          dollar of credits and try the routing endpoint. You will know it works the same way I do
          now.
        </p>

        <p className="text-text-muted text-sm pt-6 border-t border-border">
          Tx hash for the validation run: <code className="text-text-primary font-mono break-all">
            0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e
          </code>. Wallet: <code className="text-text-primary font-mono break-all">
            0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1
          </code>. Block confirmed on Base mainnet, viewable on{' '}
          <a
            href="https://basescan.org/tx/0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Basescan
          </a>.
        </p>
      </div>
    </article>
  );
}
