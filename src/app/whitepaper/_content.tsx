// AUTO-GENERATED from specs/AFTA-WHITEPAPER.md by
// scripts/convert-whitepaper.py. Do not edit by hand; edit the
// markdown source and re-run the script.

import { ReactElement } from 'react';

export default function WhitepaperBody(): ReactElement {
  return (
    <>
<h1 id="the-agent-fair-trade-agreement" className="text-3xl sm:text-4xl font-bold text-text-primary mt-12 mb-6 leading-tight">The Agent Fair-Trade Agreement</h1>
<h3 id="an-open-standard-for-honest-commerce-between-autonomous-ai-agents-and-the-web" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">An Open Standard for Honest Commerce Between Autonomous AI Agents and the Web</h3>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Authored by Adrian Vale @ TensorFeed.ai</strong> <strong>Version 1.0, May 2026. Drafted with Claude (Anthropic).</strong></p>
<hr className="my-10 border-border" />
<h2 id="abstract" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">Abstract</h2>
<p className="my-4 text-text-secondary leading-relaxed">Autonomous AI agents are now first-class consumers of the web. They read documentation, query APIs, settle payments, and recommend services to other agents. The economic, technical, and trust primitives the web evolved for human users break down at agent scale and agent speed, and the breakdown is sharpest in the AI ecosystem itself: agents reading about AI, calling AI, paying for AI data, and routing across AI providers are the dominant first-wave use case. What the moment requires is an agent-first financial and trust layer, the next phase in finance, built from the ground up for transactions that are small, fast, programmatic, and verifiable. This paper proposes the Agent Fair-Trade Agreement (AFTA), an open peer-to-peer standard for honest commerce between data publishers and autonomous agents. AFTA defines four code-enforced no-charge guarantees, signed receipts as the audit rail, USDC on Base as the value rail (a public-ledger, low-fee, dollar-denominated layer purpose-built for the kind of transactions agent commerce actually generates), and a federation pattern that lets independently-operated sites share a credit ledger without a central broker. We document a reference implementation at TensorFeed.ai that monitors over twenty major AI providers in real time, publishes uptime data as a public good, charges only for time-deepened premium series, and shares a federation with TerminalFeed.io. We close with three predictions about the agent-first web through 2030 and an explicit invitation to other publishers to adopt AFTA, fork the spec, or propose a v2 we have not yet seen.</p>
<hr className="my-10 border-border" />
<h2 id="1-opening-four-cents-in-24-seconds" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">1. Opening: Four Cents in 2.4 Seconds</h2>
<p className="my-4 text-text-secondary leading-relaxed">On April 27, 2026, an autonomous Python script paid TensorFeed.ai four cents in USDC for a premium routing recommendation, received an Ed25519-signed receipt, and continued its work without human intervention. The transaction took 2.4 seconds. It cost the agent less than the value of the time a human would have spent clicking a button. There was no API key, no signup, no email confirmation, no captcha, no billing portal. The agent paid because the work was worth four cents to it. The publisher accepted payment because the rail was open.</p>
<p className="my-4 text-text-secondary leading-relaxed">That transaction was not the first agent-to-API payment in history. It was, however, one of the first executed under a code-enforced fair-trade agreement: a contract that the publisher commits, in code and on its public manifest, to refund any payment when the underlying service fails to deliver real value. If the response was 5xx, no charge. If a circuit breaker tripped, no charge. If the input failed validation, no charge. If the data was older than its published freshness SLA, no charge. The agent did not need to dispute anything. The receipt was signed at the moment the service committed the credit, and the publisher&apos;s source code, linked from the receipt itself, attested to which path the request took.</p>
<p className="my-4 text-text-secondary leading-relaxed">This is what AFTA is. It is also what AFTA is not. It is not a marketplace. It is not a token. It is not a foundation, a consortium, or a billing intermediary. It is a peer-to-peer agreement that publishers self-publish at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code>, that agents read, that any other publisher can adopt for free, and that any third party can verify by reading both the manifest and the source code it points to. The standard is open. Adoption is the certification.</p>
<p className="my-4 text-text-secondary leading-relaxed">The thesis of this paper is that the web for agents needs a small set of new primitives, that those primitives should be open and verifiable rather than mediated by a central platform, and that the most important primitive is the one we built first: a public ledger of when the publisher charged, when the publisher chose not to, and why. We call that primitive AFTA. The rest of this paper describes what we built, why we built it that way, and what we think comes next.</p>
<hr className="my-10 border-border" />
<h2 id="2-why-the-web-breaks-for-agents" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">2. Why The Web Breaks For Agents</h2>
<p className="my-4 text-text-secondary leading-relaxed">The web grew up around four assumptions about its users. Users are humans. Humans browse pages and tolerate ads. Humans have credit cards and email addresses. Humans sign up. Each of these breaks for an autonomous agent.</p>
<h3 id="21-humans-browse-agents-query" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">2.1 Humans browse, agents query</h3>
<p className="my-4 text-text-secondary leading-relaxed">A human reading a model-pricing comparison expects narrative, layout, screenshots, advertisements alongside the answer. An agent reading the same page wants structured JSON, a stable schema, and a way to ask follow-up questions in the same idiom. Browsing is not a translation problem we can solve with screen-scrapers. Even the best LLM-based scrapers extract only what was meant for the human reader, and the cost of that extraction (tokens, latency, failure rates) compounds across every page.</p>
<p className="my-4 text-text-secondary leading-relaxed">The maturing answer to this is machine-readable everything: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code> for index-style discovery, OpenAPI manifests for endpoint contracts, JSON-LD for structured facts, Schema.org for entity types, MCP for tool surface area. None of these are radical. All of them are decisions a publisher has to make explicitly. The publishers who do not make those decisions do not show up in the agent-first web.</p>
<h3 id="22-the-economics-flip" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">2.2 The economics flip</h3>
<p className="my-4 text-text-secondary leading-relaxed">A human visit to a content site is usually free at point of consumption because someone has paid the publisher in some other way: an advertiser, a subscription, an institutional license, or the publisher&apos;s own willingness to subsidize. An agent visit cannot reliably support any of those models. Agents are not the demographic an advertiser is buying. Agents do not have employer-paid licenses. Agents do not subscribe.</p>
<p className="my-4 text-text-secondary leading-relaxed">What agents do have is direct, atomic willingness to pay. An agent that needs a routing decision has a budget for that decision. The economically efficient transaction is not a monthly subscription with a 90 percent waste rate. It is a per-call payment at the moment of need, denominated in a currency the agent already holds. That currency, increasingly, is stablecoins on a public chain.</p>
<p className="my-4 text-text-secondary leading-relaxed">x402 is the standard that gives that transaction its protocol shape. An HTTP server returns 402 Payment Required, with a body that tells the client the price and the rail. The client makes the payment off the HTTP path, then retries the same request with a payment proof header. The server verifies and serves. This is not new. HTTP 402 has been in the spec since 1991. What is new is that the rest of the stack now works: stablecoins exist, public chains have low latency, and agents can hold balances and sign transactions without human intervention.</p>
<h3 id="23-trust-primitives-change" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">2.3 Trust primitives change</h3>
<p className="my-4 text-text-secondary leading-relaxed">When a human user receives a service, the trust primitives are accumulated reputation, recognizable brand, support channels, dispute mechanisms, and the threat of public review. None of these scale to the rate at which an autonomous agent makes purchase decisions. An agent making thousands of paid calls per day cannot wait for a Trustpilot review. It needs cryptographic attestations and on-chain finality.</p>
<p className="my-4 text-text-secondary leading-relaxed">The novel primitive AFTA contributes here is the <strong>signed no-charge attestation</strong>. Every interaction with a premium endpoint, paid or refunded, returns an Ed25519-signed receipt that records the credits charged, the credits remaining, the request and response hashes, the freshness SLA, and, critically, the no-charge reason if any. The agent can store these receipts and audit them later. A third party can verify any of them against the publisher&apos;s published key. The publisher cannot rewrite history because the receipts are signed at issue time and the on-chain payments are immutable.</p>
<h3 id="24-the-decisions-that-matter-are-different" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">2.4 The decisions that matter are different</h3>
<p className="my-4 text-text-secondary leading-relaxed">We should be specific about which &quot;agents on the web&quot; we are talking about. The dominant first-wave use case for agentic web traffic is, by a wide margin, agents working inside the AI ecosystem itself: agents that read documentation about AI models, agents that call AI APIs, agents that orchestrate other AI agents, agents that route across AI providers, agents that need pricing and reliability data about the AI services they depend on. The web for agents is, today, mostly the web for AI agents reasoning about AI infrastructure. TensorFeed is approximately 95% concerned with this surface, and we expect that ratio to hold for the next several years.</p>
<p className="my-4 text-text-secondary leading-relaxed">This matters for the decisions agents are making. Humans browsing the AI ecosystem care about narrative, brand, vibes, and the latest tweet. Agents browsing the AI ecosystem care about live status, pricing, capability, and whether the dependency they are about to call is currently healthy. The information architecture humans use, threaded comment sections and editorial roundups, is not the architecture agents need. Agents need the four numbers that drive a routing decision: latency, error rate, price per token, and capability fit for the task.</p>
<p className="my-4 text-text-secondary leading-relaxed">Reliability data is foundational to all four. An agent cannot decide whether to send the next call to Claude or GPT-4 without knowing whether either is currently degraded. The web does not currently make this easy. Each provider has its own status page in its own format on its own domain, with its own conventions for what counts as degraded. An agent that wants to make this decision well has to scrape eleven status pages, normalize the formats, and synthesize a current ranking. Or the web can provide one canonical surface that does this for everyone, makes the data free at point of access, and earns its keep by selling the time-deepened version of the same data.</p>
<p className="my-4 text-text-secondary leading-relaxed">That is the model TensorFeed.ai operates. We monitor over twenty providers, we publish the cross-provider uptime leaderboard for free, and we charge for the ninety-day window. The free tier is genuinely free, for agents and humans alike, with AFTA&apos;s protections applied to every paid call that does happen on top of it. The paid tier is paid, settled in USDC on Base, with all the protections AFTA guarantees. The arrangement only works because the rules are public, the no-charge guarantees are code-enforced, and the receipts attest to every transaction.</p>
<hr className="my-10 border-border" />
<h2 id="3-the-maturing-agent-first-stack" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">3. The Maturing Agent-First Stack</h2>
<p className="my-4 text-text-secondary leading-relaxed">AFTA does not exist in isolation. It composes with a stack that has matured rapidly across 2024 to 2026. We assume familiarity with the components but document the assumptions for completeness.</p>
<h3 id="31-discovery-llmstxt-and-openapi" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">3.1 Discovery: llms.txt and OpenAPI</h3>
<p className="my-4 text-text-secondary leading-relaxed"><code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code>, proposed in 2024 and rapidly adopted, is the agent-first analog of <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">robots.txt</code>. It lives at the site root, it lists the agent-relevant resources, and it gives each one a brief description an LLM can use to decide whether the link is worth following. TensorFeed publishes a 200-plus-line <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code> covering every endpoint, every landing page, every dataset, every well-known manifest. We cite our llms.txt entries in this paper rather than duplicating them.</p>
<p className="my-4 text-text-secondary leading-relaxed">OpenAPI 3.1 fills the contractual gap. Where <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code> says &quot;this endpoint exists and does X,&quot; OpenAPI says &quot;here is the request schema, the response schema, the parameters, the auth requirement, the example payload, and the rate limit.&quot; TensorFeed publishes <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">openapi.yaml</code> and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">openapi.json</code> covering every endpoint, validates the schema in CI, and the file is registered in APIs.guru.</p>
<p className="my-4 text-text-secondary leading-relaxed">For a publisher that has done the OpenAPI work, AFTA adds two things: a manifest at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code> declaring the no-charge guarantees, and a manifest at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/x402.json</code> declaring the payment rail. Both are JSON, both are static or near-static, both can be added to a static site without server-side code.</p>
<h3 id="32-tooling-mcp-and-the-standardization-moment" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">3.2 Tooling: MCP and the standardization moment</h3>
<p className="my-4 text-text-secondary leading-relaxed">Anthropic&apos;s Model Context Protocol (MCP) emerged in late 2024 as the standard for exposing tools to AI agents. By mid-2026 it has become the lingua franca: Claude Desktop, Claude Code, OpenAI&apos;s agent surfaces, and an emerging ecosystem of independent clients all speak MCP. Publishers wrap their APIs as MCP servers so agents can discover the tools, read the tool descriptions, and call them with type-checked arguments.</p>
<p className="my-4 text-text-secondary leading-relaxed">TensorFeed maintains an MCP server published on npm at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">@tensorfeed/mcp-server</code> and registered in the official MCP server registry. The server exposes thirty-plus tools split between free and premium. Free tools work with no configuration. Premium tools require a bearer token via the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">TENSORFEED_TOKEN</code> environment variable, which the agent gets from a one-time USDC payment to the credits flow.</p>
<p className="my-4 text-text-secondary leading-relaxed">MCP matters to AFTA because it is the discovery surface where agents find machine-payable services. An agent that does not know TensorFeed exists cannot pay TensorFeed. The MCP server registry, paired with the server&apos;s self-description, is one of the strongest paths to agent discovery in the current ecosystem.</p>
<h3 id="33-payment-x402-and-http-402-reborn" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">3.3 Payment: x402 and HTTP 402 reborn</h3>
<p className="my-4 text-text-secondary leading-relaxed">x402 specifies how an HTTP endpoint and an HTTP client negotiate payment. The current spec (v2) supports multiple payment methods and networks. TensorFeed accepts USDC on Base mainnet via the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">exact</code> method, with the transaction hash in the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">X-Payment-Tx</code> header. Other methods exist, including Stripe Link&apos;s Shared Payment Tokens, which we list in our manifest as &quot;evaluating&quot; but do not yet accept.</p>
<p className="my-4 text-text-secondary leading-relaxed">The protocol is straightforward. The agent calls a premium endpoint without authentication. The server returns:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 realm="tensorfeed", method="exact"
Content-Type: application/json

{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "amount": "20000",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
      "maxTimeoutSeconds": 60
    }
  ]
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The agent sends a USDC transfer of 20000 base units (0.02 USDC, one credit at our base rate) to the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">payTo</code> wallet on Base. It then retries the same request with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">X-Payment-Tx: 0x...</code> set to the transaction hash. The server verifies the transfer via Base RPC, returns the data, and includes a fresh bearer token in the response so the agent does not need to repeat the on-chain step on subsequent calls.</p>
<p className="my-4 text-text-secondary leading-relaxed">The credits flow is the same idea with batching. The agent buys 50 credits for $1 USDC up front, gets a bearer token, and uses one credit per call thereafter. The economic difference is that batching amortizes the on-chain gas cost across many calls. The trust difference is that batching requires the agent to extend trust to the publisher for the duration of the credit balance. AFTA is, in part, our answer to &quot;why should an agent extend that trust.&quot; If the publisher&apos;s no-charge guarantees are code-enforced and signed-attested, the trust window narrows from &quot;do they pay out at all&quot; to &quot;do they ship the source code their manifest claims to ship.&quot;</p>
<h3 id="34-settlement-usdc-on-base" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">3.4 Settlement: USDC on Base</h3>
<p className="my-4 text-text-secondary leading-relaxed">We settle in USDC on Base, and we want to be specific about why. The choice is technical and it is structural, and it reflects what we believe is the natural next phase in finance: a public-ledger, programmable, dollar-denominated rail that was built, from first principles, for the kinds of transactions autonomous agents actually make. Call it finance 2.0 if it helps. The point is that the agent-first economy needs an agent-first financial layer, and that layer now exists.</p>
<p className="my-4 text-text-secondary leading-relaxed">The technical reasons first. USDC is dollar-pegged so neither party carries crypto-volatility exposure. Base is an Ethereum L2 with median transaction fees in the sub-cent range, so the rail does not add meaningful overhead to a four-cent purchase. Base inherits the Ethereum mainnet trust assumption, so the rail does not introduce new chain-level risk. USDC on Base has matured to the point where most agent-friendly wallets and SDKs support it natively. Settlement is final in seconds. The block explorer is public.</p>
<p className="my-4 text-text-secondary leading-relaxed">The structural fit is what makes this the right rail for AFTA. A public on-chain ledger with a regulated stablecoin is fair to all participants by construction, agents and humans alike. Every payment is immutable. Every payment is publicly auditable on the Base block explorer. Settlement is final at the block, not at some opaque later moment. The rail itself is the audit trail. For an agreement built on the premise that the publisher&apos;s behavior is verifiable by anyone with internet access, this is the only kind of payment layer that makes the premise true rather than aspirational.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Why Base specifically.</strong> Among the L2s on Ethereum that meet the speed, fee, and trust criteria, Base has a particular institutional shape worth noting. Base is one of the faster L2s on Ethereum, with sub-cent fees and rapid finality. The sequencer is operated by Coinbase, a publicly-traded crypto exchange with audited financials, regulatory licenses across major jurisdictions, and a track record of operating financial infrastructure since 2012. For a rail asking agents and publishers to trust it with their money, the regulatory standing and operational track record of the entity running the sequencer is a material input to the choice.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Base is not Coinbase.</strong> That distinction matters. Base is an open, public, permissionless EVM L2 that anyone can build on, anyone can read, anyone can settle on. Coinbase operates the sequencer today and has publicly stated intentions to decentralize over time. The protocol is open even where the operator is presently centralized. If the sequencer operator changed in the future, Base the protocol would continue, the wallet at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">0x549c82...</code> would still hold its USDC on the same chain, and other operators could step in to run the sequencer. The choice combines near-term operational stability at the operator layer with long-term protocol-level durability at the chain layer.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>To be unambiguous about what we accept: USDC on Base only.</strong> AFTA&apos;s published rail is USDC on Base mainnet, full stop. We do not ask senders for ETH. We do not ask for USDC on Arbitrum, Optimism, Polygon, BNB Chain, or Ethereum mainnet. We do not ask for any other stablecoin or any other chain. The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/x402.json</code> manifest declares Base, our <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/info</code> endpoint declares Base, our <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/developers/agent-payments</code> documentation declares Base, and the auto-credit flow validates against Base RPC. Anything outside that path is not soliciting, not accepted as automatic credit, and not part of the AFTA we publish.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>A property of EVM addresses worth noting, separate from the above.</strong> The publisher wallet at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code> is a standard Ethereum-compatible address. The same address derivation works on every EVM-compatible chain. This is a property of how EVM key derivation works, not a path we direct anyone toward. We mention it only because, if a sender accidentally clicks the wrong network in their wallet UI and sends USDC on Polygon or Arbitrum to this address, the funds still arrive in our wallet on that chain rather than vanishing into the void. We retain full custody and can manually reconcile or bridge if a sender contacts us about the misclick. The auto-credit flow will not have granted credits in that case, because the verification is Base-only. The point is fault tolerance for human and automated mistakes, not a backdoor route around the published rail.</p>
<p className="my-4 text-text-secondary leading-relaxed">This is not a crypto-maximalist argument. We do not think USDC on Base is the only correct rail. The manifest declares which rails the publisher accepts, and any rail can be added without changing the AFTA spec itself. We list Stripe Link&apos;s Shared Payment Tokens in our manifest as &quot;evaluating,&quot; because Stripe is genuinely making an effort to support agents and we want to credit that. We list other paths as plausible. The point is not which chain. The point is that the rail should be built for what it actually has to do: serve autonomous agents at four-cent granularity, transparently, on terms the participants can verify.</p>
<p className="my-4 text-text-secondary leading-relaxed">We do not believe USDC on Base is the only correct answer forever. We believe it is the right answer right now: the rail exists, it works, the cost structure fits, and the publishers shipping on it now are the ones who will define how the agent-first economy looks for the next decade.</p>
<hr className="my-10 border-border" />
<h2 id="4-the-agent-fair-trade-agreement" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">4. The Agent Fair-Trade Agreement</h2>
<p className="my-4 text-text-secondary leading-relaxed">We now turn to AFTA itself: what it is, how it is structured, and what makes it different from other proposed agreements.</p>
<h3 id="41-the-five-principles" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">4.1 The Five Principles</h3>
<p className="my-4 text-text-secondary leading-relaxed">AFTA is built on five principles, in priority order. When two principles conflict, the earlier one wins.</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed"><strong>The publisher does not charge when the service fails to deliver.</strong> Code-enforced. The boundary cases are documented in the manifest with pointers to the source. We list four today: 5xx errors, circuit-breaker trips, schema validation failures, and stale data. Publishers may add more.</li>
  <li className="leading-relaxed"><strong>Every paid or refunded call returns a signed receipt.</strong> The receipt is Ed25519-signed by the publisher&apos;s published key, contains the request hash, response hash, credits charged, credits remaining, freshness SLA, no-charge reason, and an optional agent-supplied nonce. The agent can verify the receipt against the publisher&apos;s well-known key. The publisher commits to a 30-day rotation notice if the key changes.</li>
  <li className="leading-relaxed"><strong>Pricing is transparent and listed publicly.</strong> No surprise pricing. No tier-based price discrimination unless documented. Every premium endpoint declares its credit cost. The credit-to-USDC rate is published. Volume discounts are published. Welcome bonuses are published.</li>
  <li className="leading-relaxed"><strong>The data is licensed for inference only unless explicitly otherwise.</strong> Premium data may not be used for training, fine-tuning, evaluation, or distillation of machine learning models. The license tracks the data; agents that need training data should source it from feeds that license it that way.</li>
  <li className="leading-relaxed"><strong>Adoption is the certification.</strong> There is no AFTA central authority, no certification fee, no logo licensing, no trademark gate. Any publisher can self-publish their AFTA manifest. Any third party can verify the publisher&apos;s claims by reading the manifest and the linked source. Membership is plural rather than singular: a publisher&apos;s credibility comes from cross-referencing their manifest, their source repo, their on-chain payment history, and the public no-charge ledger.</li>
</ol>
<h3 id="42-the-no-charge-for-failure-clauses" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">4.2 The &quot;No-Charge for Failure&quot; Clauses</h3>
<p className="my-4 text-text-secondary leading-relaxed">The first principle is the one most worth dwelling on. It is also the one we expect to evolve fastest as more publishers adopt AFTA.</p>
<p className="my-4 text-text-secondary leading-relaxed">The four boundary cases TensorFeed currently encodes:</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>5xx errors.</strong> Any HTTP response in the 500 range is treated as a publisher-side failure. The credit is not committed. The receipt is signed with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">credits_charged: 0</code> and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason: &quot;5xx&quot;</code>. The event lands in the public no-charge ledger at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/no-charge-stats</code>. The implementation is in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/payments.ts</code>, in the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">commitPayment</code> function, which returns early on a 5xx flag set by the request handler.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Circuit-breaker trips.</strong> Two breaker layers run on every premium call. The identical-request layer trips at twenty same-fingerprint calls in sixty seconds. The burn-rate layer trips at a hundred calls per sixty seconds on a single bearer token regardless of path or query, so loops that randomize the URL cannot drain credits. Either trip returns HTTP 429 with no charge and a signed receipt that records <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason: &quot;circuit_breaker&quot;</code> and the trip kind. The implementation is in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/circuit-breaker.ts</code>.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Schema validation failures.</strong> Requests that fail input validation return HTTP 400, do not charge a credit, log to the public no-charge ledger, and carry a signed receipt with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason: &quot;schema_validation_failure&quot;</code>. The agent gets cryptographic proof the failure was free. We are lenient by default: extra fields are ignored. The agent has to genuinely violate the contract for the validator to fire.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Stale data.</strong> Every premium endpoint declares a freshness SLA in seconds. If the data backing the response is older than its SLA, the call is not charged. The response is also flagged with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">stale: true</code> so the agent can decide to retry later or accept the stale answer. The implementation is in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/freshness.ts</code>. The freshness SLAs themselves are published live at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/meta</code> so they can be inspected without scraping the source.</p>
<p className="my-4 text-text-secondary leading-relaxed">We expect this list to grow. Plausible additions are: empty-result no-charge for searches that find nothing, deprecated-endpoint refunds during a sunset window, and partial-region-failure prorating for endpoints that aggregate across cloud regions. We have not implemented those because we have not needed them yet, but the manifest schema allows publishers to declare additional clauses without breaking compatibility.</p>
<h3 id="43-signed-receipts-as-the-audit-trail" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">4.3 Signed Receipts as the Audit Trail</h3>
<p className="my-4 text-text-secondary leading-relaxed">The receipt is the cryptographic backbone of AFTA. Every paid or refunded call returns one. Receipts are JSON, canonicalized in a deterministic form (<code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tensorfeed-canonical-json-v1</code>), and signed with EdDSA over Ed25519. The receipt fields signed in v2:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="json">{`{
  "v": 2,
  "id": "rcpt_a1b2c3...",
  "endpoint": "/api/premium/routing",
  "method": "GET",
  "token_short": "tnsr_a1b2",
  "credits_charged": 1,
  "credits_remaining": 49,
  "request_hash": "sha256:...",
  "response_hash": "sha256:...",
  "captured_at": "2026-04-27T18:45:31.412Z",
  "server_time": "2026-04-27T18:45:31.418Z",
  "no_charge_reason": null,
  "freshness_sla_seconds": 300,
  "agent_nonce": "agent-xyz-2026-04-27-tx-1234"
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">agent_nonce</code> field, added in v2, lets the agent bind the receipt to its specific request. The agent supplies a nonce in the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">X-Agent-Nonce</code> header (regex-validated <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">[A-Za-z0-9._-]&#123;8,128&#125;</code>), the server echoes it back in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">X-Agent-Nonce-Echo</code> and includes it in the signed payload. Without the nonce, a sufficiently devious server could in theory replay a previously-signed receipt for a different cached identical call. With the nonce, the signature is bound to the agent&apos;s intent.</p>
<p className="my-4 text-text-secondary leading-relaxed">Verification is published in two ways. The publisher&apos;s public key lives at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/tensorfeed-receipt-key.json</code> in JWK format, ready for any standard EdDSA verifier. We also expose <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/receipt/verify</code> as a convenience endpoint that takes a receipt and returns valid/invalid plus the parsed fields. The convenience endpoint is non-authoritative; if it disagrees with a canonical-JSON-plus-key verification, trust the canonical.</p>
<p className="my-4 text-text-secondary leading-relaxed">We rotate keys with thirty days notice, and during the rotation window we serve both keys so older receipts remain verifiable. The current key has fingerprint <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">db1f1dc3dbf62c66</code>.</p>
<h3 id="44-on-chain-settlement-off-chain-verification" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">4.4 On-Chain Settlement, Off-Chain Verification</h3>
<p className="my-4 text-text-secondary leading-relaxed">The receipt rail and the on-chain rail are independent, but complementary. A receipt attests to what we charged and why. The chain attests to what was paid. They cross-reference each other but neither is sufficient on its own.</p>
<p className="my-4 text-text-secondary leading-relaxed">The reason for the separation is that each rail has a job the other does poorly. The on-chain rail makes payments immutable, publicly auditable, and beyond the publisher&apos;s reach to rewrite. It does not, however, encode why we charged or refunded. The receipt rail makes the publisher&apos;s pricing logic accountable. It does not, however, prove any money moved. Cross-referencing the two gives the agent both: the publisher cannot claim a refund happened without a corresponding signed receipt, and the publisher cannot claim payment without a corresponding on-chain transfer.</p>
<p className="my-4 text-text-secondary leading-relaxed">The receipt-to-chain mapping for the credits flow is:</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Agent posts to <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/buy-credits</code> with the proposed USDC amount and the sender wallet.</li>
  <li className="leading-relaxed">Server returns a quote: credits granted (with volume discount applied), the wallet to send to, and a quote ID with a 5-minute window.</li>
  <li className="leading-relaxed">Agent sends the USDC transfer on Base. The transaction hash is the on-chain attestation.</li>
  <li className="leading-relaxed">Agent posts to <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/confirm</code> with the transaction hash and the quote ID.</li>
  <li className="leading-relaxed">Server reads the transfer event from <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">eth_getTransactionReceipt</code> on the Base RPC, verifies the recipient wallet, the amount, and the block confirmation count.</li>
  <li className="leading-relaxed">If verified, server credits the bearer token and returns the bearer token plus a signed receipt confirming the credit grant.</li>
  <li className="leading-relaxed">Tx hash is permanently recorded in the replay-protection ledger so the same payment cannot be redeemed twice.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">The x402 fallback is the same idea condensed to a single retry. The agent does not pre-buy credits; instead the server&apos;s 402 response is itself the quote, and the retry&apos;s <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">X-Payment-Tx</code> header is the proof. We support both because some agents prefer the predictability of a credit balance and others prefer the just-in-time pattern.</p>
<h3 id="45-federation-without-centralization" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">4.5 Federation Without Centralization</h3>
<p className="my-4 text-text-secondary leading-relaxed">AFTA is a peer agreement, not a marketplace. There is no broker. Two AFTA-adopting sites can federate by exchanging a shared internal secret and agreeing on a validate-and-commit handshake. After federation, a bearer token issued by either site works on both sites without re-purchasing credits.</p>
<p className="my-4 text-text-secondary leading-relaxed">The federation we operate today is between TensorFeed.ai and TerminalFeed.io. Both sites publish their own AFTA manifests, both sign their own receipts with their own keys, and both share a single credit ledger hosted on TensorFeed. When an agent calls a premium endpoint on TerminalFeed with a TensorFeed-issued token, TerminalFeed&apos;s worker:</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Calls TensorFeed&apos;s internal <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">validate</code> endpoint with the token and the requested cost.</li>
  <li className="leading-relaxed">Receives <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">&#123; ok: true, credits_remaining: N, sufficient: true &#125;</code> if the token has the credits.</li>
  <li className="leading-relaxed">Serves the response to the agent.</li>
  <li className="leading-relaxed">Calls TensorFeed&apos;s internal <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">commit</code> endpoint to deduct the credit, with a <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason</code> if the response was eligible for refund.</li>
  <li className="leading-relaxed">Returns the data plus a TerminalFeed-signed receipt to the agent.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">The federation is symmetric. A TerminalFeed-issued token would work the same way at TensorFeed (in practice, only TensorFeed currently sells credits, so all tokens are TensorFeed-issued, but the rail does not care). No-charge events from federated calls land in the host&apos;s public no-charge ledger with the sister-site endpoint path, so the public record reflects the network rather than a single publisher.</p>
<p className="my-4 text-text-secondary leading-relaxed">The peer-to-peer nature is essential. A central marketplace would gate adoption, charge a fee, control disputes, and become a single point of failure. A peer agreement scales by simple pairwise federation. Two members today, ten by mid-2027 if the framing is right.</p>
<hr className="my-10 border-border" />
<h2 id="5-reference-implementation-tensorfeedai" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">5. Reference Implementation: TensorFeed.ai</h2>
<p className="my-4 text-text-secondary leading-relaxed">TensorFeed.ai is the first AFTA-certified site and the venue where we have validated each of the design decisions above. This section catalogs what is in production as of May 2026 and the live numbers behind the build.</p>
<h3 id="51-surface-area" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">5.1 Surface area</h3>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Real-time AI service status.</strong> Twenty providers monitored at a 2-minute polling cadence: Claude API, OpenAI API, Google Gemini, GitHub Copilot, Perplexity, Groq, Hugging Face, Replicate, Cohere, Mistral, AWS Bedrock, Azure OpenAI, DeepSeek, Together AI, Fireworks AI, OpenRouter, ElevenLabs, Stability AI, Runway, and Luma. Six different status-feed parsers handle the format diversity: Atlassian Statuspage v2 JSON for most, Instatus for Perplexity, Google Cloud incidents.json for Vertex Gemini, AWS Health currentevents.json for Bedrock (the file ships as UTF-16 with a BOM, which we discovered the hard way), Azure status RSS for Azure OpenAI, and an HTML fallback parser for Hugging Face, Mistral, Together, Fireworks, OpenRouter, and Luma.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Cross-provider uptime leaderboard.</strong> Live ranked table at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/leaderboard</code> showing every monitored provider by 7-day uptime percentage. Computed from minute-resolution counters captured every poll cycle (approximately 720 samples per provider per day, 5,040 over a 7-day window). Each row links to a dedicated <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/uptime/&#123;slug&#125;</code> trend page with daily breakdown chart and an embeddable badge.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Embeddable uptime badges.</strong> Shields.io-compatible SVG badges per provider at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/badge/uptime/&#123;slug&#125;</code>. Color thresholds: green at 99.9%+, lighter green at 99%+, yellow at 95%+, orange at 90%+, red below. Aggressively edge-cached at 5 minutes. Every README that embeds one is a permanent backlink and agent-discovery surface.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Per-provider detail pages.</strong> Twenty <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/uptime/&#123;slug&#125;</code> trend pages and nineteen <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/is-X-down</code> landing pages (Midjourney lacks a machine-readable status feed, so its page exists but cannot show live data). Each page renders headline uptime, daily chart, embeddable badge, FAQ, and cross-links.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Premium API.</strong> Nineteen paid endpoints behind x402, including premium routing recommendations, pricing time series, benchmark time series, status uptime time series, status leaderboard with incident_count and mttr_minutes, news search, agents directory, provider deep-dive, cost projection, what&apos;s-new digest, MCP registry series, probe series, GPU pricing series, and webhook watches.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Webhook watches.</strong> Four watch types: realtime price (fires on model price transitions), realtime status (fires on provider operational/degraded/down transitions), scheduled digest (fires daily or weekly with a curated summary), and leaderboard rank-change (fires when a provider crosses a rank threshold on the 7-day uptime leaderboard). Each watch lives 90 days, fires up to 100 times by default, costs 1 credit at registration. Fire deliveries POST to the agent&apos;s callback URL with HMAC-SHA256 signing.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>SDKs and MCP.</strong> Python SDK at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">pip install tensorfeed</code>, TypeScript SDK at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">npm install tensorfeed</code>, MCP server at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">npx @tensorfeed/mcp-server</code>. All three are auto-published from CI on version bump. As of this writing: Python 1.29.0, TypeScript 1.25.0, MCP 1.23.0.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Public dataset.</strong> Daily snapshots of the entire public TensorFeed surface published to Hugging Face at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tensorfeed/ai-ecosystem-daily</code>. 46 JSONL files per day covering news, models, pricing, status, benchmarks, agents-directory, agents-activity, podcasts, trending-repos, MCP registry, probe history, GPU pricing, AFTA adopters, AI hardware, open weights, inference providers, training runs, marketplaces, specialized models, fine-tuning providers, OSS tools, agent APIs, voice leaderboards, embeddings, multimodal, vector DBs, frameworks, benchmark registry, public leaderboards, conferences, funding, model cards, AI policy, compute providers, usage rankings, and agent provisioning. Committed at 08:00 UTC by GitHub Actions. License is inference-only, consistent with the AFTA standard. Hugging Face&apos;s auto-conversion bot publishes a Parquet version on <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">refs/convert/parquet</code>, queryable directly from DuckDB, ClickHouse, Pandas, and Polars without downloading.</p>
<h3 id="52-free-tier-as-public-good" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">5.2 Free tier as public good</h3>
<p className="my-4 text-text-secondary leading-relaxed">The decision to make the live status, the cross-provider leaderboard, the badges, the per-provider pages, the daily HF dataset, and the seven-day uptime series free is deliberate. We believe reliability data is foundational infrastructure for the agent-first web. Charging for the canonical version of &quot;is X currently up&quot; balkanizes the ecosystem and forces every agent to roll its own monitoring. That is bad for agents, bad for providers (because no agent&apos;s roll-your-own monitoring will be calibrated as well as ours), and bad for the long-term legitimacy of the agent commerce we are building.</p>
<p className="my-4 text-text-secondary leading-relaxed">We believe the free tier earns its keep three ways. First, every embed of a badge is a backlink. Second, every agent that integrates the free tier becomes a candidate for the premium tier when their needs grow past seven days of history. Third, the free tier is a discovery layer: the most efficient way for agents to find AFTA is to use the free TensorFeed surfaces and read what we publish about ourselves there.</p>
<p className="my-4 text-text-secondary leading-relaxed">The corollary is that the premium tier has to be genuinely time-deepened, not a paywall in front of the same data the free tier already exposes. We achieve this by capturing high-resolution counters (every 2 minutes per provider), retaining them for 90 days, and serving the 90-day window only behind paid credits. The free tier shows the last 7 days. The paid tier shows up to 90, plus per-provider incident_count and mttr_minutes that the free tier does not compute. Both tiers use the same underlying data.</p>
<h3 id="53-premium-tier-as-data-moat" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">5.3 Premium tier as data moat</h3>
<p className="my-4 text-text-secondary leading-relaxed">The data moat is a function of two things: the difficulty of replicating the dataset and the time it takes to accumulate.</p>
<p className="my-4 text-text-secondary leading-relaxed">We capture status counters for twenty providers every 2 minutes. That works out to:</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">~720 polls per provider per day</li>
  <li className="leading-relaxed">~14,400 polls per day across the federation</li>
  <li className="leading-relaxed">~5.2 million polls per year</li>
</ul>
<p className="my-4 text-text-secondary leading-relaxed">Retained for 90 days, the live counter set is approximately 1.3 million data points per provider, 26 million across the field. A new entrant wanting to replicate this dataset needs to start polling today and wait 90 days to match our breadth.</p>
<p className="my-4 text-text-secondary leading-relaxed">The premium leaderboard endpoint serves this set sliced any way the agent wants: by date range, with incident_count, with MTTR. The free tier sees the last 7 days. The paid tier sees the rolling 90. We expect to extend the retention to 180 and then 365 days as the cost-to-serve makes sense. Each extension widens the moat.</p>
<p className="my-4 text-text-secondary leading-relaxed">Pricing is one credit per call across virtually all premium endpoints. One credit is two cents at our base rate, fewer with volume discounts (down to 1.25 cents at $200+). One USDC buys 50 credits (or up to 80 credits with volume), so a hundred premium calls is a $1.25 to $2 transaction.</p>
<h3 id="54-live-numbers" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">5.4 Live numbers</h3>
<p className="my-4 text-text-secondary leading-relaxed">As of the writing of this paper (May 5, 2026):</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">20 monitored AI providers</li>
  <li className="leading-relaxed">2-minute status polling cadence (~14,400 polls/day across the field)</li>
  <li className="leading-relaxed">19 premium endpoints behind x402</li>
  <li className="leading-relaxed">4 webhook watch types active (price, status, digest, leaderboard rank)</li>
  <li className="leading-relaxed">30+ MCP tools published</li>
  <li className="leading-relaxed">2 federation members (TensorFeed.ai, TerminalFeed.io)</li>
  <li className="leading-relaxed">36 daily JSONL feeds in the public Hugging Face dataset</li>
  <li className="leading-relaxed">90-day premium retention horizon</li>
  <li className="leading-relaxed">Phase 1 of agent payments verified end-to-end on Base mainnet 2026-04-27</li>
</ul>
<p className="my-4 text-text-secondary leading-relaxed">The volume of paid traffic is small but compounds. We are not optimizing for short-term revenue. We are optimizing for the data moat, the publisher network, and the agent-discovery surface. Each compounds over time in a way that revenue alone does not.</p>
<hr className="my-10 border-border" />
<h2 id="6-reliability-data-as-the-foundational-public-good" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">6. Reliability Data as the Foundational Public Good</h2>
<p className="my-4 text-text-secondary leading-relaxed">We claimed earlier that reliability data is foundational. This section explains why we believe that and how we think about it economically.</p>
<h3 id="61-why-uptime-data-matters-more-than-benchmarks" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">6.1 Why uptime data matters more than benchmarks</h3>
<p className="my-4 text-text-secondary leading-relaxed">Benchmarks tell an agent which model is most capable at a task. Uptime tells the agent which model is currently usable. The capability score does not change minute-to-minute. The availability score does. An agent that ignores availability and routes solely on capability will fail loudly at the worst possible moment, when the upstream provider that the benchmark prefers is degraded. The agent that ignores capability and routes solely on availability will produce poor work but produce it consistently.</p>
<p className="my-4 text-text-secondary leading-relaxed">The right routing decision combines both. Capability is roughly stable on a daily timescale and is widely published on existing leaderboards (LMSys, Artificial Analysis, HF Open LLM, SWE-bench). Uptime is volatile on a minute timescale and was, until recently, not centrally published anywhere. Each provider has a status page, but no canonical surface lets an agent compare across the field.</p>
<p className="my-4 text-text-secondary leading-relaxed">That gap is the public good we set out to fill. The free leaderboard, the per-provider pages, the badges, the daily JSONL dataset on HF, and the every-2-minute polling are all in service of one claim: routing decisions over the agent-first web should not be bottlenecked by stale or scattered status data.</p>
<h3 id="62-minute-resolution-capture-and-the-time-compounding-moat" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">6.2 Minute-resolution capture and the time-compounding moat</h3>
<p className="my-4 text-text-secondary leading-relaxed">The premium tier is the time-deepened version of the same dataset. Day-granular snapshots tell an agent whether yesterday was good or bad. Minute-resolution counters tell the agent what fraction of yesterday was good or bad. The difference matters when a provider is &quot;operational on the headline but degraded for 30 minutes during peak.&quot; The minute counters catch that. The daily snapshot does not.</p>
<p className="my-4 text-text-secondary leading-relaxed">We capture counters at the same cadence the worker polls, so every status sample is recorded. Counters are stored in a per-day combined object: one Cloudflare Workers KV key per UTC day, all twenty providers in one JSON. The entire 90-day retained counter set is approximately 800 KB of storage. The data moat is not about storage volume. It is about the time it takes to accumulate, the cadence at which we capture, and our willingness to make the canonical surface free.</p>
<h3 id="63-the-free-7-days-premium-90-days-split" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">6.3 The &quot;free 7 days, premium 90 days&quot; split</h3>
<p className="my-4 text-text-secondary leading-relaxed">The seven-day window is an honest free tier. It is enough for an agent to make routing decisions today. It shows the trend. It shows the cross-provider leaderboard. The agent can get an embed badge and put it on its dashboard. The agent can subscribe to a webhook watch on rank changes. None of this costs a credit.</p>
<p className="my-4 text-text-secondary leading-relaxed">The ninety-day window is for SRE and procurement teams. They are comparing AI vendors over a quarter, building a vendor-reliability narrative, computing MTTR per provider, deciding which vendor to renew. These decisions are infrequent (maybe quarterly), high-stakes (millions in spend), and not time-sensitive (the team will pay for a thoughtful answer). Pricing them at one credit per call is intentional friction: it forces the user to articulate the question rather than scrape and re-scrape.</p>
<p className="my-4 text-text-secondary leading-relaxed">The seven-versus-ninety split is a trade-off we think is right today. We expect to revisit it. A reasonable v2 might be free 14 days, premium 365 days, as the dataset matures and the per-call cost on our side drops.</p>
<h3 id="64-embeddable-badges-as-distributed-agent-discovery-surfaces" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">6.4 Embeddable badges as distributed agent-discovery surfaces</h3>
<p className="my-4 text-text-secondary leading-relaxed">Every uptime badge embedded in a third-party README is a permanent backlink with our domain in the SVG src attribute. Agents crawling those READMEs (and there are many) see <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tensorfeed.ai</code> in the markup and have a path to investigate. The badge endpoint is intentionally Shields.io-compatible so the embed pattern is identical to what most developers already know.</p>
<p className="my-4 text-text-secondary leading-relaxed">We expect badges to be the highest-leverage discovery surface in the entire status stack. Every individual embed is small. The aggregate across thousands of READMEs is large. The cost on our side is essentially zero because Cloudflare&apos;s edge cache absorbs all the repeat hits and our SVG generation is sub-millisecond.</p>
<p className="my-4 text-text-secondary leading-relaxed">The strategic insight: badges turn our customers into our distributors. A Stripe-style &quot;powered by&quot; badge scaled to the status-data domain. The closest analog is the GitHub repo badges that aggregate stars, license, build status, and so on, but those are aggregator services. Ours is original data. The status displayed on the badge is captured by us, sourced from the upstream publisher&apos;s own status feed, and rendered through our worker. No middleman.</p>
<hr className="my-10 border-border" />
<h2 id="7-anatomy-of-an-afta-transaction" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">7. Anatomy of an AFTA Transaction</h2>
<p className="my-4 text-text-secondary leading-relaxed">This section walks through a complete transaction on the AFTA rails, with the actual headers and code paths. The example uses the credits flow.</p>
<h3 id="71-buying-credits" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.1 Buying credits</h3>
<p className="my-4 text-text-secondary leading-relaxed">The agent posts to <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/buy-credits</code>:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`POST /api/payment/buy-credits HTTP/1.1
Host: tensorfeed.ai
Content-Type: application/json

{
  "usd_amount": "1.00",
  "sender_wallet": "0xAGENT_WALLET..."
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The server responds with a quote:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="json">{`{
  "ok": true,
  "quote_id": "quo_a1b2c3...",
  "expires_at": "2026-04-27T18:50:31.412Z",
  "usd_amount": "1.00",
  "credits_granted": 50,
  "is_first_payment": true,
  "welcome_bonus_credits": 50,
  "total_credits_after_confirm": 100,
  "payment_instructions": {
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "wallet": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
    "network": "eip155:8453",
    "amount_base_units": "1000000"
  }
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The first-payment welcome bonus doubles the credits grant. This bonus exists because we want agents to find us cheaply enough to validate the rail before committing to scale.</p>
<h3 id="72-sending-the-on-chain-transfer" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.2 Sending the on-chain transfer</h3>
<p className="my-4 text-text-secondary leading-relaxed">The agent&apos;s wallet signs and broadcasts a USDC transfer of 1,000,000 base units (1 USDC) to the publisher wallet on Base. The transaction settles in seconds at sub-cent fees. The agent records the transaction hash.</p>
<h3 id="73-confirming-payment" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.3 Confirming payment</h3>
<p className="my-4 text-text-secondary leading-relaxed">The agent posts to <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/confirm</code>:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`POST /api/payment/confirm HTTP/1.1
Host: tensorfeed.ai
Content-Type: application/json

{
  "quote_id": "quo_a1b2c3...",
  "tx_hash": "0xTRANSFER_HASH..."
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The server reads the transfer event from <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">eth_getTransactionReceipt</code>, validates the recipient, the amount, and the block confirmation count. Critically, it also validates that the on-chain <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">from</code> address of the USDC transfer matches the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">sender_wallet</code> that was bound to the quote at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/buy-credits</code>. This is the binding that closes the public-mempool sniping vector: an observer who sees a real tx hash on Base cannot redeem it at our <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/confirm</code> because they cannot also produce a quote bound to the original sender&apos;s wallet. Mismatched senders are rejected with HTTP 400 and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">error: &quot;sender_mismatch&quot;</code>.</p>
<p className="my-4 text-text-secondary leading-relaxed">The server returns:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="json">{`{
  "ok": true,
  "token": "tnsr_a1b2c3d4e5f60718a9b0c1d2",
  "credits_granted": 100,
  "credits_remaining": 100,
  "quote_id": "quo_a1b2c3...",
  "tx_hash": "0xTRANSFER_HASH...",
  "is_first_payment": true,
  "welcome_bonus_credits": 50,
  "receipt": { ... full signed receipt ... }
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The bearer token <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tnsr_a1b2c3d4e5f60718a9b0c1d2</code> is the agent&apos;s credential for subsequent calls. It works on TensorFeed and on TerminalFeed (federation member). It does not expire on a calendar; credits are spent down per call until the balance hits zero.</p>
<h3 id="74-calling-a-premium-endpoint" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.4 Calling a premium endpoint</h3>
<p className="my-4 text-text-secondary leading-relaxed">The agent calls a premium endpoint:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`GET /api/premium/routing?task=code&budget=10 HTTP/1.1
Host: tensorfeed.ai
Authorization: Bearer tnsr_a1b2c3d4e5f60718a9b0c1d2
X-Agent-Nonce: agent-xyz-2026-04-27-tx-1234`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">The server runs the AFTA deferred-debit pipeline:</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Extracts the bearer token.</li>
  <li className="leading-relaxed">Reads the credit balance and validates the token is live (not revoked, sufficient credits).</li>
  <li className="leading-relaxed">Checks the circuit breakers (identical-request and burn-rate).</li>
  <li className="leading-relaxed">Validates the input parameters against the endpoint schema.</li>
  <li className="leading-relaxed">Computes the routing recommendation.</li>
  <li className="leading-relaxed">Checks the freshness SLA against the data backing the response.</li>
  <li className="leading-relaxed">If every check passes and the response is fresh, the commit phase debits 1 credit and the receipt is signed with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">credits_charged: 1</code> and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason: null</code>. If any of the no-charge guarantees fired (5xx, schema validation failure, circuit breaker, stale data), the commit phase debits zero credits and the receipt records the specific <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_reason</code>. The split between &quot;validate / read state&quot; and &quot;commit / mutate state&quot; is the load-bearing structural property that makes the no-charge guarantee provable in code: a debit cannot occur until the commit phase, and the commit phase fires after the response is fully resolved.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">Response:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`HTTP/1.1 200 OK
Content-Type: application/json
X-Agent-Nonce-Echo: agent-xyz-2026-04-27-tx-1234
X-Receipt-Id: rcpt_a1b2c3...
X-Credits-Remaining: 99

{
  "ok": true,
  "task": "code",
  "recommendations": [...],
  "billing": {
    "credits_charged": 1,
    "credits_remaining": 99
  },
  "receipt": {
    "v": 2,
    "id": "rcpt_a1b2c3...",
    "endpoint": "/api/premium/routing",
    "method": "GET",
    "token_short": "tnsr_a1b2",
    "credits_charged": 1,
    "credits_remaining": 99,
    "request_hash": "sha256:...",
    "response_hash": "sha256:...",
    "captured_at": "2026-04-27T18:55:14.412Z",
    "server_time": "2026-04-27T18:55:14.418Z",
    "no_charge_reason": null,
    "freshness_sla_seconds": 300,
    "agent_nonce": "agent-xyz-2026-04-27-tx-1234",
    "signature": "Ed25519:..."
  }
}`}</code>
</pre>
<h3 id="75-the-no-charge-path" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.5 The no-charge path</h3>
<p className="my-4 text-text-secondary leading-relaxed">If any of the no-charge guarantees fire, the response shape changes. For example, if the input fails validation:</p>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="http">{`HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Receipt-Id: rcpt_d4e5f6...
X-Credits-Remaining: 99

{
  "ok": false,
  "error": "schema_validation_failure",
  "field_errors": [...],
  "billing": {
    "credits_charged": 0,
    "credits_remaining": 99
  },
  "receipt": {
    "v": 2,
    "id": "rcpt_d4e5f6...",
    "credits_charged": 0,
    "no_charge_reason": "schema_validation_failure",
    ...
  }
}`}</code>
</pre>
<p className="my-4 text-text-secondary leading-relaxed">Notice the receipt is still signed. Notice the credit balance is unchanged. Notice the agent has cryptographic proof the failure was free. This is what AFTA buys you.</p>
<p className="my-4 text-text-secondary leading-relaxed">A note on abuse: receipt signing is intentionally cheap but not free, so we cap per-token no-charge events at a conservative threshold per minute to prevent the rail from being used as a free Ed25519-signing oracle. Honest agents will not approach the threshold under any normal error rate. Agents that sustain it past the threshold receive a cheap HTTP 429 response with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">error: &quot;no_charge_abuse&quot;</code> rather than a signed receipt; the AFTA promise of free errors holds, but the cryptographic side of the promise is reserved for traffic that meaningfully entered the worker logic. The exact threshold is operational and intentionally not published; the property that matters is that legitimate users do not encounter it.</p>
<h3 id="76-verification-after-the-fact" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">7.6 Verification, after the fact</h3>
<p className="my-4 text-text-secondary leading-relaxed">Some hours later, the agent or a third party can verify any receipt by:</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Fetching the publisher&apos;s public key from <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/tensorfeed-receipt-key.json</code>.</li>
  <li className="leading-relaxed">Canonicalizing the receipt&apos;s signed fields per <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tensorfeed-canonical-json-v1</code>.</li>
  <li className="leading-relaxed">Verifying the EdDSA signature against the canonical bytes.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">Or, more simply, posting the receipt to <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/receipt/verify</code> and trusting the response. The convenience endpoint is a courtesy. Nothing about it is privileged. Anyone can run their own verifier against the published key.</p>
<hr className="my-10 border-border" />
<h2 id="8-federation-patterns" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">8. Federation Patterns</h2>
<p className="my-4 text-text-secondary leading-relaxed">Two AFTA-adopting sites can federate on a payment rail. This section documents the pattern as we have implemented it.</p>
<h3 id="81-the-two-member-federation-today" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">8.1 The two-member federation today</h3>
<p className="my-4 text-text-secondary leading-relaxed">TensorFeed.ai and TerminalFeed.io are both AFTA-certified, both Pizza Robot Studios projects, and both share a single credit ledger hosted on TensorFeed. The federation was established 2026-04-30, the same day AFTA went live.</p>
<p className="my-4 text-text-secondary leading-relaxed">A bearer token issued at TensorFeed works seamlessly at TerminalFeed. The agent does not need to buy credits separately. The agent does not even need to know the federation exists. It calls a TerminalFeed premium endpoint with its TensorFeed token, the call works, the credit is decremented from the shared ledger, and TerminalFeed signs its own receipt with its own key.</p>
<p className="my-4 text-text-secondary leading-relaxed">The mechanics are an internal HTTP rail between the two workers. TerminalFeed&apos;s worker, on receiving a premium call:</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Calls TensorFeed&apos;s <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/internal/validate</code> with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">&#123; token, cost &#125;</code>. This is constant-time-secret-authenticated.</li>
  <li className="leading-relaxed">Receives <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">&#123; ok: true, credits_remaining: 99, sufficient: true, reservation_id: &quot;tf-...&quot; &#125;</code>. The credit balance has already been atomically debited; the reservation record holds the value pending the commit.</li>
  <li className="leading-relaxed">Serves the response.</li>
  <li className="leading-relaxed">Calls TensorFeed&apos;s <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/internal/commit</code> with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">&#123; token, cost, endpoint, no_charge_reason: null, reservation_id: &quot;tf-...&quot; &#125;</code>.</li>
  <li className="leading-relaxed">Receives <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">&#123; ok: true, credits_charged: 1, balance_after: 99, no_charge_reason: null &#125;</code>. (On a no-charge result, the reserved credits are restored to balance and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">credits_charged</code> is zero.)</li>
  <li className="leading-relaxed">Returns the data plus a TerminalFeed-signed receipt.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">The split between validate and commit is the same idiom used by stored-value cards: reserve the value at validate time, finalize the charge at commit time, and refund if the operation cannot be honored. The split is necessary because the response might trigger a no-charge condition (5xx, schema fail, stale data) that the validate step cannot anticipate. The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_id</code> ties the two phases together and prevents the federation double-spend race where parallel calls would otherwise each see sufficient balance and each serve at the publisher&apos;s expense.</p>
<p className="my-4 text-text-secondary leading-relaxed">Reservations carry a five-minute time-to-live. A handler that takes longer than that and a commit that arrives late will receive <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">error: &quot;reservation_not_found&quot;</code> and the credits remain debited (a soft loss in favor of the publisher, acceptable as a backstop because handler runtimes longer than five minutes are unusual and signal a different design problem). Mismatched token or cost between validate and commit is rejected as <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_mismatch</code> and is treated as a buggy-or-hostile caller.</p>
<p className="my-4 text-text-secondary leading-relaxed">No-charge events from federated calls land in TensorFeed&apos;s public no-charge ledger at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/no-charge-stats</code>, with the sister-site endpoint path included. The public record reflects the network rather than just the host.</p>
<h3 id="82-why-peer-to-peer-beats-centralized-brokers" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">8.2 Why peer-to-peer beats centralized brokers</h3>
<p className="my-4 text-text-secondary leading-relaxed">A central broker would gate adoption (apply, get approved, sign a contract), charge a fee (per transaction or subscription), control disputes (broker decides who wins), and become a single point of failure (broker&apos;s downtime is everyone&apos;s downtime). A peer agreement does none of those.</p>
<p className="my-4 text-text-secondary leading-relaxed">The cost of peer-to-peer is coordination. Each new federation member requires the existing members to do a per-pair handshake. This is fine at small N. It is potentially awkward at large N. We have not yet hit that ceiling, and we believe a hub-and-spoke pattern (one or two central members the rest peer with) will emerge organically before it becomes a problem.</p>
<p className="my-4 text-text-secondary leading-relaxed">We will not run a hub. Other sites are welcome to. The standard is the federation pattern, not a particular hub.</p>
<h3 id="83-the-path-to-ten-members" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">8.3 The path to ten members</h3>
<p className="my-4 text-text-secondary leading-relaxed">Two members today. Ten by mid-2027 is the target. The path:</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">The next two adopters are likely sister-network sites or close collaborators who already trust the rail. Onboarding is hours, not days.</li>
  <li className="leading-relaxed">The next four adopters are likely independent publishers in adjacent verticals (developer tools, DX-focused SaaS, infrastructure dashboards). Onboarding is days, including the security review of the manifest schema and the receipt format.</li>
  <li className="leading-relaxed">The last two to reach ten members are likely larger publishers who run their own AFTA federation off our schema. Onboarding is weeks, including legal review of the data license and the federation handshake. We would consider this a success even if those publishers did not formally federate with us, because adoption of the standard at that scale would prove the framing.</li>
</ul>
<p className="my-4 text-text-secondary leading-relaxed">We are not in a rush. Adoption that comes from the framing being right is durable. Adoption that comes from a marketing push is not.</p>
<hr className="my-10 border-border" />
<h2 id="9-discovery-how-agents-find-afta-services" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">9. Discovery: How Agents Find AFTA Services</h2>
<p className="my-4 text-text-secondary leading-relaxed">A standard nobody finds is not a standard. This section is about discovery: how an agent moving through the web today is supposed to encounter AFTA.</p>
<h3 id="91-the-llmstxt-convention" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">9.1 The llms.txt convention</h3>
<p className="my-4 text-text-secondary leading-relaxed">The agent&apos;s first stop on a new site is <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code>. We publish ours with explicit pointers to the AFTA manifest, the x402 manifest, the receipt key, the OpenAPI spec, and every premium endpoint with its credit cost. An agent reading this file knows within seconds whether the site is paid, what the rail is, and what AFTA guarantees apply.</p>
<p className="my-4 text-text-secondary leading-relaxed">The convention is simple enough that any publisher can adopt it. We have not yet seen llms.txt files from non-AFTA publishers that include payment information; we expect this to change as more sites adopt machine-payable rails.</p>
<h3 id="92-the-well-known-manifests" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">9.2 The /.well-known manifests</h3>
<p className="my-4 text-text-secondary leading-relaxed">Per RFC 8615, the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/</code> path is the home for site-level metadata. We publish three manifests there:</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed"><code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/x402.json</code>: the payment rail manifest.</li>
  <li className="leading-relaxed"><code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code>: the AFTA manifest.</li>
  <li className="leading-relaxed"><code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/tensorfeed-receipt-key.json</code>: the JWK for receipt verification.</li>
</ul>
<p className="my-4 text-text-secondary leading-relaxed">An agent that knows about RFC 8615 can crawl these without prior knowledge of TensorFeed. The manifests are static JSON, edge-cached, and never personalized. They are the cheapest way to onboard an agent to a site&apos;s AFTA stance.</p>
<h3 id="93-the-mcp-server-registry" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">9.3 The MCP server registry</h3>
<p className="my-4 text-text-secondary leading-relaxed">The official MCP server registry at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">registry.modelcontextprotocol.io</code> is the discovery layer for tool-using agents. Our server is registered as <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">ai.tensorfeed/mcp-server</code>, includes both free and premium tools, and self-describes as AFTA-certified in its description. An agent setting up Claude Desktop, Claude Code, or another MCP client can find us through the registry, install us with one command, and start using free tools immediately. Premium tools require the bearer token from a one-time payment.</p>
<h3 id="94-the-recommend-loop-thesis" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">9.4 The recommend-loop thesis</h3>
<p className="my-4 text-text-secondary leading-relaxed">The deepest discovery layer is agent-to-agent recommendation. An agent that has used TensorFeed, found it useful, and answered a downstream user&apos;s question better because of the data we provided will recommend us in its response. The next agent reading that response will treat us as an established service. This is the recommend-loop, and we believe it is the single most important success metric for the agent-first web.</p>
<p className="my-4 text-text-secondary leading-relaxed">We optimize for this in three ways:</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed"><strong>Quality of free tier.</strong> An agent that uses our free tier and is impressed will recommend us. An agent that uses our free tier and is disappointed will not.</li>
  <li className="leading-relaxed"><strong>AFTA framing.</strong> An agent that learns about AFTA through us will associate the standard with us. The first AFTA-adopter advantage is real.</li>
  <li className="leading-relaxed"><strong>Data moat depth.</strong> An agent recommending us in 2027 will cite &quot;the only place with 90+ days of cross-provider uptime data&quot; as the reason. We accumulate that reason every day.</li>
</ul>
<p className="my-4 text-text-secondary leading-relaxed">We expect the recommend-loop to compound non-linearly. It is hard to bootstrap. Once it bootstraps, it dominates.</p>
<hr className="my-10 border-border" />
<h2 id="10-conclusion" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">10. Conclusion</h2>
<p className="my-4 text-text-secondary leading-relaxed">The web is being rebuilt for agents in real time. The economic, technical, and trust primitives that worked for human users are being augmented or replaced. AFTA is one of the new primitives. It encodes, in code rather than legal contracts, the publisher&apos;s commitment to charge only for value delivered. It pairs with x402 as the protocol layer, USDC on Base as the settlement layer, and signed receipts as the audit layer to form a complete, peer-to-peer, open, no-broker, no-fee rail for honest commerce between autonomous agents and the websites they consume.</p>
<p className="my-4 text-text-secondary leading-relaxed">We documented the standard. We built the reference implementation. We proved the federation pattern with a second member. We shipped the data moat that compounds. We made the canonical surface free at point of access. We opened the schema, the source, and the receipt verifier to the world.</p>
<p className="my-4 text-text-secondary leading-relaxed">The next chapter is adoption. We invite you to write it with us.</p>
<hr className="my-10 border-border" />
<h2 id="appendix-a-the-afta-v10-specification" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">Appendix A: The AFTA v1.0 Specification</h2>
<p className="my-4 text-text-secondary leading-relaxed">This is the human-readable companion to the machine-readable manifest at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code>. The machine manifest is authoritative.</p>
<h3 id="a1-manifest-location" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.1 Manifest location</h3>
<p className="my-4 text-text-secondary leading-relaxed">A publisher adopting AFTA MUST publish a JSON document at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code>, served over HTTPS, with <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">Content-Type: application/json</code>. The document MUST validate against the published schema at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">https://tensorfeed.ai/.well-known/agent-fair-trade-schema.json</code>.</p>
<h3 id="a2-required-fields" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.2 Required fields</h3>
<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">
  <code className="font-mono text-text-secondary" data-language="jsonc">{`{
  "\$schema": "https://tensorfeed.ai/.well-known/agent-fair-trade-schema.json",
  "version": "1.0",
  "name": "Agent Fair-Trade Agreement",
  "abbrev": "AFTA",

  // Who is making the attestation.
  "publisher": {
    "name": "...",
    "legal_entity": "...",
    "url": "...",
    "contact": "...",
    "manifesto_page": "...",
    "source_repo": "..."
  },

  // The four-or-more no-charge guarantees, each pointing to source.
  "no_charge_guarantees": [
    {
      "id": "5xx",
      "description": "...",
      "code": "path/to/source.ts",
      "verifiable_via": "..."
    },
    // ... more guarantees ...
  ],

  // Receipt rail.
  "receipts": {
    "signed": true,
    "algorithm": "EdDSA",
    "curve": "Ed25519",
    "canonical_form": "tensorfeed-canonical-json-v1",
    "schema_version_current": 2,
    "schema_versions_supported": [1, 2],
    "public_key_url": "...",
    "verify_endpoint": "...",
    "fields_signed": [...],
    "rotation_policy": "..."
  },

  // Pricing transparency.
  "pricing": {
    "transparent": true,
    "listed_at": "...",
    "currency": "USDC",
    "network": "eip155:8453",
    "x402_compatibility": {
      "compliant": true,
      "manifest": "...",
      "accepted_methods": [...]
    }
  },

  // Data license.
  "data_license": {
    "type": "inference-only",
    "description": "...",
    "terms_url": "..."
  },

  // Deprecation notice.
  "deprecation": {
    "notice_days": 90,
    "channel": "..."
  },

  // Adoption / federation.
  "adoption": {
    "open_invitation": "...",
    "current_adopters": [...],
    "network_federation": {
      "description": "...",
      "rail_endpoints": {...},
      "current_federation": [...]
    }
  }
}`}</code>
</pre>
<h3 id="a3-required-no-charge-guarantees" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.3 Required no-charge guarantees</h3>
<p className="my-4 text-text-secondary leading-relaxed">A publisher MUST commit to at least the following. Additional guarantees MAY be added.</p>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed"><strong>5xx no-charge.</strong> Server errors do not charge a credit.</li>
  <li className="leading-relaxed"><strong>Stale data no-charge.</strong> If the underlying data is older than the endpoint&apos;s published freshness SLA, the call does not charge.</li>
  <li className="leading-relaxed"><strong>Schema validation no-charge.</strong> Requests that fail input validation do not charge a credit.</li>
</ol>
<p className="my-4 text-text-secondary leading-relaxed">The optional <strong>circuit-breaker no-charge</strong> is strongly recommended but not strictly required at v1.0. We expect v2.0 to mandate it.</p>
<h3 id="a4-required-receipt-format" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.4 Required receipt format</h3>
<p className="my-4 text-text-secondary leading-relaxed">Receipts MUST be Ed25519-signed and MUST include at minimum the fields listed in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">receipts.fields_signed</code>. The publisher MAY add more fields. The publisher MUST publish the public key in JWK format at the URL listed in <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">receipts.public_key_url</code>. The publisher MUST honor a 30-day rotation window when changing keys.</p>
<h3 id="a5-federation-contract" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.5 Federation contract</h3>
<p className="my-4 text-text-secondary leading-relaxed">If the publisher participates in a federation, the manifest MUST list the federation members under <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">adoption.network_federation.current_federation</code>. Each member entry MUST include the host site, the list of members, the establishment date, and a note explaining the federation arrangement.</p>
<p className="my-4 text-text-secondary leading-relaxed">The federation rail itself is an HTTPS POST contract between member workers. The validate and commit endpoints MAY be on a non-public path (e.g., <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/internal/validate</code>) but MUST be authenticated with a constant-time-checked shared secret and MUST log no-charge events to the host&apos;s public no-charge ledger.</p>
<p className="my-4 text-text-secondary leading-relaxed">The validate response MUST return a <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_id</code> (string) bound to the validate call. The validate call MUST atomically debit the credit balance at issue and write a reservation record with at least a five-minute time-to-live. The commit call MUST accept the <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_id</code> and consume it; on a no-charge result the commit MUST restore the reserved credits to the balance. A commit that arrives without a <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_id</code> MAY be served on a legacy path for backwards compatibility, but publishers and sister sites SHOULD treat the reservation-id form as mandatory because the legacy path is race-y by construction. Mismatched token or cost between validate and commit MUST be rejected (<code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">reservation_mismatch</code>).</p>
<h3 id="a6-manifest-validation-checklist" className="text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24">A.6 Manifest validation checklist</h3>
<p className="my-4 text-text-secondary leading-relaxed">Before going live, the publisher SHOULD verify:</p>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">[ ] The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/.well-known/agent-fair-trade.json</code> is reachable.</li>
  <li className="leading-relaxed">[ ] The document validates against the schema.</li>
  <li className="leading-relaxed">[ ] The receipts public key at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">receipts.public_key_url</code> is reachable and parseable.</li>
  <li className="leading-relaxed">[ ] The x402 manifest at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">pricing.x402_compatibility.manifest</code> is consistent with the AFTA manifest.</li>
  <li className="leading-relaxed">[ ] At least one signed receipt has been issued and verifies against the published key.</li>
  <li className="leading-relaxed">[ ] The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">no_charge_guarantees</code> source pointers resolve to real source code.</li>
  <li className="leading-relaxed">[ ] The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">verifiable_via</code> URLs return real endpoints.</li>
  <li className="leading-relaxed">[ ] The <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">current_adopters</code> includes the publisher&apos;s own entry.</li>
  <li className="leading-relaxed">[ ] The site <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llms.txt</code> references the AFTA manifest.</li>
</ul>
<hr className="my-10 border-border" />
<h2 id="appendix-b-reference-implementation-source-links" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">Appendix B: Reference Implementation Source Links</h2>
<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Worker source: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/payments.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/circuit-breaker.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/freshness.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/receipts.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/status.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/status-counters.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/status-leaderboard.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/badges.ts</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">worker/src/watches.ts</code>.</li>
  <li className="leading-relaxed">Manifests: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">public/.well-known/agent-fair-trade.json</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">public/.well-known/agent-fair-trade-schema.json</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">public/.well-known/x402.json</code>, <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">public/.well-known/tensorfeed-receipt-key.json</code>.</li>
  <li className="leading-relaxed">Public landing page: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">https://tensorfeed.ai/agent-fair-trade</code>.</li>
  <li className="leading-relaxed">Developer page: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">https://tensorfeed.ai/developers/agent-payments</code>.</li>
  <li className="leading-relaxed">Dataset: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily</code>.</li>
  <li className="leading-relaxed">Source repo: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">https://github.com/RipperMercs/tensorfeed</code>.</li>
</ul>
<hr className="my-10 border-border" />
<h2 id="appendix-c-glossary" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">Appendix C: Glossary</h2>
<p className="my-4 text-text-secondary leading-relaxed"><strong>AFTA.</strong> The Agent Fair-Trade Agreement. The standard described in this paper.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>x402.</strong> The HTTP payment protocol that uses HTTP 402 Payment Required as the negotiation handshake.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>MCP.</strong> Model Context Protocol. Anthropic&apos;s standard for exposing tools to AI agents.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Receipt.</strong> A signed JSON document attesting to a single API call&apos;s billing outcome: credits charged, credits remaining, no-charge reason if any, request and response hashes, and a freshness SLA marker.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>No-charge guarantee.</strong> A code-enforced commitment by the publisher that, in defined conditions, the agent&apos;s call does not consume a credit even though the call was executed.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Federation.</strong> A pairwise arrangement between two AFTA-adopting sites in which a single bearer token is honored on both, with credits decremented from a shared ledger.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Credit.</strong> The unit of premium access. One credit equals two cents at the base rate, fewer with volume discounts. One USDC buys 50 credits at the base rate, 80 credits at the maximum volume tier.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Bearer token.</strong> The agent&apos;s credential for authenticated calls. Format: <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">tnsr_&lt;24 hex chars&gt;</code>. Issued by the credits flow at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">/api/payment/confirm</code>. Does not expire on calendar; depleted at zero credits.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Freshness SLA.</strong> The maximum age, in seconds, of data backing an endpoint&apos;s response. If the backing data is older than this, the call is refunded under the stale-data no-charge guarantee.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Circuit breaker.</strong> A worker-side rate-limit mechanism that returns HTTP 429 with no charge when a single bearer token or request fingerprint exceeds defined thresholds. Two layers: identical-request and burn-rate.</p>
<p className="my-4 text-text-secondary leading-relaxed"><strong>Inference-only license.</strong> A license term restricting the use of premium data to inference (reading, querying, displaying, taking action). Use of the data for training, fine-tuning, evaluation, or distillation of machine learning models is prohibited.</p>
<hr className="my-10 border-border" />
<h2 id="references" className="text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24">References</h2>
<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">
  <li className="leading-relaxed">Anthropic. <em>Model Context Protocol Specification.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">modelcontextprotocol.io</code>. 2024-2026.</li>
  <li className="leading-relaxed">Howard, Jeremy. <em>llms.txt: A Proposal for AI Discoverability.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">llmstxt.org</code>. 2024.</li>
  <li className="leading-relaxed">Coinbase. <em>x402 Specification, version 2.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">x402.org</code>. 2024-2026.</li>
  <li className="leading-relaxed">Coinbase. <em>Base Network Documentation.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">docs.base.org</code>. 2023-2026.</li>
  <li className="leading-relaxed">Centre Consortium. <em>USDC on Base Asset Reference.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">usdc.com</code>. 2023-2026.</li>
  <li className="leading-relaxed">Ed25519 / EdDSA: Bernstein, D.J., Duif, N., Lange, T., Schwabe, P., Yang, B-Y. <em>High-speed high-security signatures.</em> J. Cryptographic Engineering, 2012.</li>
  <li className="leading-relaxed">Nottingham, M. <em>Well-Known URIs.</em> RFC 8615. 2019.</li>
  <li className="leading-relaxed">Roca, V., et al. <em>HTTP Status Code 402 Payment Required (Reserved).</em> RFC 9110, Section 15.5.2. 2022.</li>
  <li className="leading-relaxed">Anthropic. <em>Claude on Agent Reliability.</em> Internal blog series, 2025-2026.</li>
  <li className="leading-relaxed">Pizza Robot Studios LLC. <em>TensorFeed.ai Public Repository.</em> <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">github.com/RipperMercs/tensorfeed</code>. 2025-2026.</li>
</ol>
<hr className="my-10 border-border" />
<p className="my-4 text-text-secondary leading-relaxed"><em>This paper was drafted in May 2026 by Adrian Vale for TensorFeed.ai with substantial collaboration from Claude (Anthropic). The drafting transcript, design choices, and revisions are logged in the project memory. All numerical claims are reproducible from the public TensorFeed surface or the linked manifests at the time of writing.</em></p>
<p className="my-4 text-text-secondary leading-relaxed"><em>Comments, corrections, and forks welcome at <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">contact@tensorfeed.ai</code> and <code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">github.com/RipperMercs/tensorfeed</code>.</em></p>
    </>
  );
}
