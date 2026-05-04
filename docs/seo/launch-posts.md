# Launch posts: HF dataset + AFTA + machine-payable API

Copy-paste ready. Each post is calibrated to its audience. No em dashes, no double hyphens, byline as Ripper not Evan.

---

## 1. Show HN

**Title** (under 80 chars):
```
Show HN: AI Ecosystem Daily, an inference-only dataset on Hugging Face
```

**URL**:
```
https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily
```

**First comment** (post immediately after submission):
```
Hi HN. I've been running TensorFeed for the last few months. It started as an AI news aggregator and grew into a real-time data hub: model pricing, service status, GPU rental prices, MCP registry telemetry, LLM endpoint latency probes, an agent directory, and a few other feeds.

Today I wired up a daily push of the whole dataset to Hugging Face. 13 JSONL files per day, one commit per day at 08:00 UTC, automated via GitHub Actions. The dataset compounds. It's already a starting time series of the entire frontier-AI ecosystem.

The piece I think is genuinely novel is the license. The dataset is inference-only. You can use it as RAG context, eval data, or in agent toolchains. You cannot train foundation models on it without explicit permission. That distinction comes out of a small standard I've been writing called AFTA, the Agent Fair-Trade Agreement: code-enforced no-charge on 5xx, breaker, schema fail, or stale data, plus Ed25519-signed receipts on every paid call. Manifest at /.well-known/agent-fair-trade.json on every adopting site.

The live API is at https://tensorfeed.ai/developers if you need fresher than daily. Free, no auth, CORS enabled. Premium tier accepts pay-per-call USDC on Base (x402-compatible) for ranked model routing, news search, and a few other computed-intelligence endpoints. Validated end-to-end on Base mainnet last week.

A few questions I'd genuinely like input on:
- What feeds are missing? I want to add what people will actually use.
- Is inference-only a workable license in practice, or is the line too fuzzy?
- For anyone using HF datasets inside agent stacks today, what's the day-2 friction look like?

Source: https://github.com/RipperMercs/tensorfeed (MIT for the code, inference-only for the data, both clearly labeled).

Built with Claude.
```

---

## 2. r/LocalLLaMA

**Title**:
```
TensorFeed AI Ecosystem Daily on Hugging Face: model pricing, GPU rental, MCP registry, and more
```

**Body**:
```
Just published a daily-snapshot dataset to Hugging Face that I think should be useful for anyone tracking the open-weights and inference-provider landscape.

What's in each daily snapshot:
- 230+ models with input/output pricing per 1M tokens (frontier closed + open weights)
- GPU rental prices across cloud marketplaces (Vast.ai, RunPod), refreshed every 4h upstream and snapshot once daily here
- MCP server registry growth and churn (running count + 1-day delta of the official registry)
- LLM endpoint latency probes (TTFB, total) for the providers I've configured keys for
- AI service operational status (12+ services)
- ~100 articles per day of AI news from major sources
- Benchmark scores per model
- Agents directory and live agent traffic on TensorFeed itself

JSONL per feed. One commit per day at 08:00 UTC, automated via GitHub Actions.

Dataset: https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily

License is inference-only. Free to use as RAG context or eval data, no foundation-model training without permission. That's part of a small open standard I'm working on called AFTA (https://tensorfeed.ai/agent-fair-trade) for how websites and AI agents work together.

Live API at https://tensorfeed.ai/developers if daily is too slow for your use case. Free tier, no auth.

Open to feedback on what feeds to add. The live API has more (AI hardware specs, open-weights deployment requirements, inference provider catalog, fine-tuning provider catalog, training-run cost estimates) but I haven't pulled those into the daily snapshot yet. Tell me which would be most useful.
```

**Cross-post candidates** (same body, light retitling):
- r/AI_Agents
- r/MachineLearning (must be in their weekly self-promotion thread, do not top-post)
- r/Anthropic (lighter version, lead with the Claude collaboration)

---

## 3. X / Twitter (after 2026-05-04, when cadence restriction lifts)

**Single tweet** (270 chars):
```
TensorFeed is now on Hugging Face.

Daily snapshots of AI news, model pricing, GPU rental prices, MCP registry growth, and 9 more feeds. Inference-only license: use it as agent context, not as training data.

https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily
```

**Thread (4 tweets)** if expanding:
```
1/ TensorFeed is now on Hugging Face.

Daily snapshot dataset of the AI ecosystem: news, model pricing, service status, GPU rental, MCP registry, latency probes, agent directory, and a few more feeds. JSONL per feed. One commit per day, 08:00 UTC.

2/ The interesting part is the license. It's inference-only. You can use the data as RAG context or eval input or in your agent stack. You cannot train foundation models on it without permission.

That distinction comes out of an open standard I've been writing called AFTA.

3/ AFTA = Agent Fair-Trade Agreement.

Code-enforced no-charge on 5xx / breaker / schema fail / stale data. Ed25519-signed receipts on every paid call. Open standard, machine-readable manifest at /.well-known/agent-fair-trade.json. Two adopters today, more invited.

4/ Live API at https://tensorfeed.ai/developers if you need fresher than daily. Free, no auth, CORS enabled.

Premium tier is machine-payable in USDC on Base (x402-compatible). Validated end-to-end on mainnet last week.

Built with Claude.
```

---

## Submission order and timing

1. **HN first**: post Tuesday or Wednesday morning Pacific (around 8 to 10 AM PT). Gets the front-page attempt without weekend dilution.
2. **r/LocalLLaMA**: 2-4 hours after HN, so the audience overlap doesn't see the same post twice in their feed.
3. **X/Twitter**: hold until 2026-05-04 per the X cadence reset. Single tweet first, expand to thread only if engagement warrants.
4. **r/AI_Agents and r/Anthropic**: day 2, light retitling.
5. **r/MachineLearning**: only in their weekly self-promotion thread, never top-posted.

## What to do if HN takes off

- Have the dataset README polished and the live API healthy. Both already done.
- Be in the comments fast. HN's voting half-life is ~3 hours; engagement compounds upvotes.
- Don't argue. Answer technical questions, fix mistakes, thank people who flag issues.
- If the front-page hit drives an obvious feature request, ship it the same week. HN remembers responsive maintainers.

## What to do if it flops

- Don't repost. Wait two weeks, find a different angle (e.g., focus on AFTA itself, or on a specific feed like GPU pricing time series).
- Cross-posting to LocalLLaMA / AI_Agents is independent of HN performance. Do it regardless.
- The HF dataset compounds value daily even with zero referrals, so the SEO play stands on its own.
