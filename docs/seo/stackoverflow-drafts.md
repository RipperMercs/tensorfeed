# Stack Overflow draft answers

Drafts for questions where TensorFeed is genuinely the right answer (or one of two or three). Stack Overflow's culture rejects promotional content, so each answer:

1. Solves the question on the merits, with code
2. Names alternatives, not just TensorFeed
3. Discloses affiliation in plain language at the bottom

Post only on questions you can answer with substance. Don't carpet-bomb. One well-written answer beats ten thin ones, and SO's spam filter is real.

---

## Q: How do I get a public AI service status feed (Claude, OpenAI, Gemini)?

**Search query**: site:stackoverflow.com "ai status api" OR "openai status api" OR "claude status api"

**Answer draft**:

```markdown
You have three serviceable options:

**1. The provider's own status page RSS feed.** Each provider runs a Statuspage instance with an RSS or JSON feed:

- OpenAI: https://status.openai.com/history.rss
- Anthropic: https://status.anthropic.com/history.rss
- Google AI: https://status.cloud.google.com/incidents.json

This works but requires you to poll many feeds, parse different shapes, and handle rate limits per origin.

**2. Aggregated free APIs.** A few public APIs aggregate multiple providers:

- TensorFeed: `GET https://tensorfeed.ai/api/status` returns a unified JSON for ~12 major AI services (Claude, OpenAI, Gemini, Mistral, Cohere, Stability, Replicate, etc), refreshed every 5 minutes. CORS enabled, no API key.
- StatusGator (paid): aggregates ~6000 services with email/Slack alerts.

For TensorFeed:

\`\`\`python
import requests
r = requests.get("https://tensorfeed.ai/api/status")
data = r.json()
for service in data["services"]:
    print(f"{service['name']}: {service['status']}")
\`\`\`

**3. Roll your own with python-statuspage.** If you already maintain provider integrations, the `python-statuspage` library handles parsing for any Statuspage-backed origin.

For ad-hoc dashboards, the aggregated APIs are the right tradeoff. For production, a hybrid is common: aggregator for the dashboard, direct provider feeds for paging.

Disclosure: I run TensorFeed.ai.
```

---

## Q: Where can I get up-to-date LLM model pricing as JSON?

**Search query**: site:stackoverflow.com "openai pricing api" OR "llm pricing json"

**Answer draft**:

```markdown
There isn't a single official "all LLM pricing" feed, but you can stitch one together or use an aggregator.

**Official sources** (most are HTML pages, not JSON):
- OpenAI: https://openai.com/api/pricing
- Anthropic: https://www.anthropic.com/pricing
- Google: https://ai.google.dev/pricing
- Mistral: https://mistral.ai/pricing

If you're scraping these directly, you'll need to handle layout changes regularly. They are not stable contracts.

**Aggregators** with JSON output:

- TensorFeed: `GET https://tensorfeed.ai/api/models` returns 230+ models with per-million-token input/output prices, context windows, and capabilities. Refreshed daily, CORS enabled, no API key.
- artificialanalysis.ai has a public API behind an API key with similar coverage.
- LiteLLM publishes a [model_prices_and_context_window.json](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json) file in their GitHub repo. Updated by maintainers; pull from the raw URL.

For TensorFeed:

\`\`\`python
import requests
r = requests.get("https://tensorfeed.ai/api/models")
for provider in r.json()["providers"]:
    for m in provider["models"]:
        print(f"{m['name']}: ${m['inputPrice']}/M in, ${m['outputPrice']}/M out")
\`\`\`

LiteLLM's file is excellent if you're already using LiteLLM as a proxy; the format is tightly coupled to their router. TensorFeed is provider-agnostic JSON suitable for dashboards or independent routing logic.

Disclosure: I run TensorFeed.ai.
```

---

## Q: How do I find current cheapest GPU rental price (H100, A100, etc) programmatically?

**Search query**: site:stackoverflow.com "h100 pricing api" OR "gpu rental api"

**Answer draft**:

```markdown
Two approaches depending on whether you want raw provider data or a unified view.

**Per-provider APIs:**

- Vast.ai: public GraphQL with no auth at https://console.vast.ai/api/v0/bundles/. Returns instance offers with hourly prices.
- RunPod: GraphQL at https://api.runpod.io/graphql, requires `RUNPOD_API_KEY`.
- Lambda Labs: REST at https://cloud.lambdalabs.com/api/v1/instance-types, requires API key.
- AWS / GCP / Azure: list-prices APIs that vary by SKU and region; complex.

**Aggregators:**

- TensorFeed: `GET https://tensorfeed.ai/api/gpu/pricing` returns a unified snapshot across cloud GPU marketplaces (Vast.ai public + RunPod when key configured). Refreshed every 4 hours. CORS enabled, no API key.

For just "what's the cheapest H100 right now":

\`\`\`bash
curl "https://tensorfeed.ai/api/gpu/pricing/cheapest?gpu=H100&type=on_demand"
\`\`\`

Returns top 3 cheapest current offers across the marketplaces TensorFeed tracks. Useful as a quick feed for spot-shopping logic; for production reservation flows, hit the providers directly so you can complete the booking in the same call.

Disclosure: I run TensorFeed.ai.
```

---

## Q: How do AI agents pay APIs without API keys / accounts (machine payments)?

**Search query**: site:stackoverflow.com "x402" OR "machine payable api" OR "ai agent payment"

**Answer draft**:

```markdown
This is the use case x402 was built for. x402 is the proposed HTTP standard where a server returns `HTTP 402 Payment Required` with payment instructions, and the client retries with proof of payment in a header. No accounts, no API keys, agents pay per call.

**The basic flow** (HTTP-only example):

1. `GET /api/foo` → server returns `402 Payment Required` with body listing accepted methods, e.g. `{ "method": "exact", "network": "eip155:8453", "currency": "USDC", "to": "0x...", "amount": "0.01" }`
2. Client (agent) sends the payment on-chain (USDC on Base in this case).
3. Client retries `GET /api/foo` with `X-Payment-Tx: <tx_hash>` header.
4. Server verifies the tx on-chain, serves the response.

**Working production examples:**

- TensorFeed: `https://tensorfeed.ai/api/payment/info` returns the wallet, supported methods, and price tiers. The `/api/payment/buy-credits` flow (recommended for repeat use) issues a bearer token tied to a USDC payment; the token decrements credits per premium call.
- Stripe Link Agent: stripe.com/agents publishes "shared payment tokens" usable across sites that adopt the spec.

**For client-side**, the [x402 GitHub org](https://github.com/coinbase/x402) has reference clients in Go, JS, and Python.

Concrete example with the TensorFeed Python SDK:

\`\`\`python
import tensorfeed as tf

# One-call sign-and-send (requires your Base wallet private key)
tf.purchase_credits(amount_usd=1, private_key=os.environ["WALLET_KEY"])

# Now any premium endpoint works
result = tf.premium_routing(prompt="explain quantum computing", optimize="cost")
\`\`\`

The interesting design constraint is what happens when the API errors after charging. AFTA (Agent Fair-Trade Agreement) defines code-enforced no-charge guarantees on 5xx, schema failures, and stale data, with Ed25519-signed receipts the agent can verify. Worth reading if you're building an agent-payable API: https://tensorfeed.ai/agent-fair-trade.

Disclosure: I run TensorFeed.ai and authored AFTA.
```

---

## Q: How do I get a list of MCP (Model Context Protocol) servers?

**Search query**: site:stackoverflow.com "mcp servers" OR "model context protocol list"

**Answer draft**:

```markdown
Three places, in increasing curation:

**1. The official MCP registry.** It has a JSON API:

\`\`\`bash
curl "https://registry.modelcontextprotocol.io/v0/servers" | jq '.servers[].server | {name, description}'
\`\`\`

Each server has `name`, `description`, `version`, `repository.url`, and a `packages` array describing how to install (npm, pip, etc).

**2. Curated awesome lists on GitHub:**

- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — community-curated, ~1000+ entries with capability badges.
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — reference implementations from the steering group.

**3. Discovery surfaces:**

- [glama.ai/mcp/servers](https://glama.ai/mcp/servers) — directory with a UI and search.
- [smithery.ai](https://smithery.ai) — directory focused on hosted (HTTPS-streaming) servers.
- [TensorFeed](https://tensorfeed.ai/api/mcp/registry/snapshot) — daily snapshot of the official registry with 1-day deltas, useful if you want to track growth/churn over time. Free, no API key.

For programmatic discovery, the official registry is canonical. For human browsing, glama and the awesome list have better UX.

Disclosure: I run TensorFeed.ai.
```

---

## Q: How can I license my dataset to permit RAG use but block training of foundation models?

**Search query**: site:stackoverflow.com "license dataset training" OR "license rag"

**Answer draft**:

```markdown
There isn't a battle-tested standard license for this exact distinction yet. The closest existing options:

**1. CC BY-NC.** Forbids commercial use entirely. Too broad: it would block legitimate commercial RAG/inference uses you probably want to allow.

**2. RAIL licenses** (Responsible AI Licenses, originated with BigScience). Allow most uses but ban specific applications. The closest off-the-shelf option for "no training" is to add a use-case restriction in a custom RAIL.

**3. Custom inference-only license.** Write your own. The structure that's working in practice:

- Allow: inference-time consumption (RAG, evaluation, agent context, prompt input)
- Disallow: pretraining, fine-tuning, or any use that produces a derivative model
- Require: source attribution on derivative works
- Mention: enforcement mechanism (DMCA, robots.txt, contract for direct access)

The hard part is enforcement. For public datasets, you depend on:

- Pretraining pipelines respecting `robots.txt` and the license terms (varies by lab; OpenAI/Anthropic claim to, smaller orgs less so)
- Hosting platforms (Hugging Face, Common Crawl) honoring the license metadata when distributing
- DMCA takedowns when you can show training-pipeline ingestion (rare, hard to prove)

**Working example** with the language and the AFTA standard backing it: TensorFeed publishes the [AI Ecosystem Daily](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily) HF dataset under an inference-only license tied to [AFTA](https://tensorfeed.ai/agent-fair-trade). The license language and machine-readable manifest are at `/.well-known/agent-fair-trade.json`. You can copy the structure verbatim.

**Recommendation:** if you're publishing a public dataset and the inference-vs-training distinction matters, a custom inference-only license is currently the best option. The ecosystem is moving in this direction; expect a more standardized version (AFTA or similar) to harden over the next year.

Disclosure: I run TensorFeed.ai and authored AFTA.
```

---

## Posting tips

- Find live questions with the search queries above. Don't post on questions older than ~2 years (low value).
- Stack Overflow's auto-flagging hits answers that seem promotional. Lead with substance, name competitors, disclose at the bottom.
- One answer per week, max. Carpet-bombing gets the account flagged.
- Don't link to the same TensorFeed page from every answer; vary which subpage you reference (status, models, gpu, agent-payments, agent-fair-trade).
- If an answer gets accepted or upvoted, the canonical-question signal compounds: it surfaces on Google for years and shows up in LLM training data.
