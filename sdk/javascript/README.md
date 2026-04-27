# tensorfeed

JavaScript/TypeScript SDK for the [TensorFeed.ai](https://tensorfeed.ai) API.

Free endpoints (news, status, models, benchmarks, history, routing preview) need no auth. The premium tier (top-N model routing, more endpoints landing later) is paid via USDC on Base. No accounts, no API keys, no traditional payment processors.

## Install

```bash
npm install tensorfeed
```

Zero runtime dependencies. Uses native `fetch` (Node.js 18+ or any modern browser).

## Free Tier

```typescript
import { TensorFeed } from 'tensorfeed';

const tf = new TensorFeed();

// Latest AI news
const news = await tf.news({ category: 'research', limit: 10 });
news.articles.forEach(a => console.log(a.title));

// Live AI service status
const status = await tf.status();
status.services.forEach(s => console.log(`${s.name}: ${s.status}`));

// Is a service down?
const claude = await tf.isDown('claude');
console.log(`Claude is ${claude.isDown ? 'DOWN' : 'operational'}`);

// Model pricing and benchmarks
console.log(await tf.models());
console.log(await tf.benchmarks());

// Daily history snapshots (the moat)
console.log(await tf.history());
console.log(await tf.historySnapshot('2026-04-27', 'pricing'));

// Free routing preview (top-1, 5 calls/day per IP)
const preview = await tf.routingPreview({ task: 'code' });
console.log(preview.recommendation);
```

## Premium Tier (paid, USDC on Base)

```typescript
import { TensorFeed, PaymentRequired } from 'tensorfeed';

const tf = new TensorFeed();

// Step 1: get a 30-minute quote
const quote = await tf.buyCredits({ amountUsd: 1.0 });
console.log(`Send ${quote.amount_usd} USDC on Base to ${quote.wallet}`);
console.log(`Memo: ${quote.memo} (expires in ${quote.ttl_seconds}s)`);

// Step 2: send the USDC tx with your wallet (manually for now)

// Step 3: confirm with the tx hash
const result = await tf.confirm({ txHash: '0xYOUR_TX_HASH', nonce: quote.memo });
console.log(`Got ${result.credits} credits, token: ${result.token}`);
// The token is auto-stored on `tf`; routing() will use it.

// Step 4: call premium endpoints
const rec = await tf.routing({ task: 'code', budget: 5.0, topN: 5 });
rec.recommendations.forEach(r => {
  console.log(`#${r.rank}: ${r.model.name} (score: ${r.composite_score.toFixed(2)})`);
});

// Custom routing weights
const ranked = await tf.routing({
  task: 'general',
  weights: { quality: 0.6, cost: 0.3, availability: 0.1, latency: 0.0 },
});

// Premium history series (1 credit each, default range = last 30 days, max 90)
const prices = await tf.pricingSeries({ model: 'Claude Opus 4.7' });
console.log(`Price moved ${prices.summary.delta_pct_blended}% over the window`);

const scores = await tf.benchmarkSeries({
  model: 'Claude Opus 4.7',
  benchmark: 'swe_bench',
});
console.log(`SWE-bench moved ${scores.summary.delta_pp} pp`);

const uptime = await tf.statusUptime({ provider: 'anthropic' });
console.log(`Anthropic uptime: ${uptime.uptime_pct}% over ${uptime.days_with_data} days`);

const diff = await tf.historyCompare({
  from: '2026-04-01',
  to: '2026-04-27',
  type: 'pricing',
});
if (diff.type === 'pricing') {
  console.log(`${diff.changed.length} price changes, ${diff.added.length} new models`);
}

// Premium webhook watches (1 credit per registration, free reads)
const created = await tf.createWatch({
  spec: {
    type: 'price',
    model: 'Claude Opus 4.7',
    field: 'blended',
    op: 'lt',
    threshold: 30,
  },
  callbackUrl: 'https://agent.example.com/hook',
  secret: 'any-shared-secret', // used to sign deliveries
});
console.log(`Watch ${created.watch.id} active until ${created.watch.expires_at}`);

// When a delivery arrives, verify it:
//   const sig = req.headers['x-tensorfeed-signature']; // "sha256=<hex>"
//   const expected = 'sha256=' + crypto
//     .createHmac('sha256', 'any-shared-secret')
//     .update(rawBody)
//     .digest('hex');
//   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) reject();

console.log(await tf.listWatches());           // all your active watches
console.log(await tf.getWatch(created.watch.id)); // fire_count, last_fired_at
await tf.deleteWatch(created.watch.id);        // remove when done

// Check remaining credits
console.log(await tf.balance());
```

## Reusing a Token Across Sessions

```typescript
// Save the token after confirm()
const token = result.token!;

// Later, in another process:
const tf = new TensorFeed({ token });
console.log(await tf.balance());
const rec = await tf.routing({ task: 'code' });
```

## Error Handling

```typescript
import { TensorFeed, PaymentRequired, RateLimited, TensorFeedError } from 'tensorfeed';

const tf = new TensorFeed({ token: 'bad_token' });
try {
  await tf.routing({ task: 'code' });
} catch (e) {
  if (e instanceof PaymentRequired) {
    // 402: token invalid, expired, or out of credits
    console.log('Need to top up:', e.payload);
  } else if (e instanceof RateLimited) {
    // 429: free preview tier rate-limited (5/day per IP)
    console.log('Hit the rate limit:', e.payload);
  } else if (e instanceof TensorFeedError) {
    console.log('API error', e.statusCode, e.payload);
  } else {
    throw e;
  }
}
```

## API Reference

### Free

| Method | Description |
|--------|-------------|
| `tf.news({ category?, limit? })` | Latest AI news articles |
| `tf.status()` | Real-time AI service status |
| `tf.statusSummary()` | Lightweight status summary |
| `tf.models()` | Model pricing and specs |
| `tf.benchmarks()` | Benchmark scores |
| `tf.isDown(serviceName)` | Check if a specific service is down |
| `tf.agentActivity()` | Agent traffic metrics |
| `tf.history()` | List of available daily snapshot dates |
| `tf.historySnapshot(date, type)` | Read a specific snapshot |
| `tf.routingPreview({ task })` | Top-1 routing recommendation (5/day/IP) |
| `tf.health()` | API health check |
| `tf.paymentInfo()` | Wallet, pricing, supported payment flows |
| `tf.buyCredits({ amountUsd })` | Generate a 30-min payment quote |
| `tf.confirm({ txHash, nonce })` | Verify USDC tx, mint credit token |

### Token-required

| Method | Cost | Description |
|--------|------|-------------|
| `tf.balance()` | Free | Check remaining credits |
| `tf.usage()` | Free | Per-token call history (last 100 calls aggregated by endpoint) |
| `tf.routing({ task, budget, topN, weights })` | 1 credit | Top-N ranked routing with full detail |
| `tf.pricingSeries({ model, from?, to? })` | 1 credit | Daily price points for one model with min/max/delta summary |
| `tf.benchmarkSeries({ model, benchmark, from?, to? })` | 1 credit | Score evolution for a benchmark on one model, returns delta_pp |
| `tf.statusUptime({ provider, from?, to? })` | 1 credit | Uptime % per provider with incident days (degraded = half) |
| `tf.historyCompare({ from, to, type? })` | 1 credit | Diff two snapshots: added, removed, changed entries with deltas |
| `tf.createWatch({ spec, callbackUrl, secret?, fireCap? })` | 1 credit | Register a webhook watch on a price change or status transition |
| `tf.listWatches()` | Free | List all active watches owned by the current token |
| `tf.getWatch(id)` | Free | Read one watch including fire_count and last_fired_at |
| `tf.deleteWatch(id)` | Free | Remove an owned watch |
| `tf.premiumAgentsDirectory({ category?, status?, sort?, limit?, ... })` | 1 credit | Enriched directory: status, news, traffic, pricing, trending_score per agent |
| `tf.newsSearch({ q?, from?, to?, provider?, category?, limit? })` | 1 credit | Full-text news search with date/provider filters, relevance scoring, recency boost |

## Wallet & Trust

The TensorFeed payment wallet is `0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1` on Base mainnet. USDC contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.

Cross-check this address before sending funds at:

- https://tensorfeed.ai/llms.txt
- https://tensorfeed.ai/api/payment/info
- https://github.com/RipperMercs/tensorfeed (README)
- https://x.com/tensorfeed (bio)

If any source disagrees, do not send.

## Premium Data Terms

Premium API responses are licensed for inference use only. Use of TensorFeed premium data for training, fine-tuning, evaluation, or distillation of ML models is prohibited.

## Refunds

Email `evan@tensorfeed.ai` with the tx hash within 24 hours of the charge for a manual USDC refund.

## Links

- [API Docs](https://tensorfeed.ai/developers)
- [Agent Payments Guide](https://tensorfeed.ai/developers/agent-payments)
- [TensorFeed.ai](https://tensorfeed.ai)
- [GitHub](https://github.com/RipperMercs/tensorfeed)
- [Python SDK](https://github.com/RipperMercs/tensorfeed/tree/main/sdk/python)

## License

MIT
