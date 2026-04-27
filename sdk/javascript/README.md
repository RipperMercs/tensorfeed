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
| `tf.routing({ task, budget, topN, weights })` | 1 credit | Top-N ranked routing with full detail |

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
