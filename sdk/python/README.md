# tensorfeed

Python SDK for the [TensorFeed.ai](https://tensorfeed.ai) API.

Free endpoints (news, status, models, benchmarks, history, routing preview) need no auth. The premium tier (top-N routing, plus more endpoints landing later) is paid via USDC on Base. No accounts, no API keys, no traditional payment processors.

## Install

```bash
pip install tensorfeed
```

Stdlib-only. No external dependencies.

## Free Tier

```python
from tensorfeed import TensorFeed

tf = TensorFeed()

# News
for article in tf.news(category="research", limit=10)["articles"]:
    print(article["title"])

# Live AI service status
for svc in tf.status()["services"]:
    print(f'{svc["name"]}: {svc["status"]}')

# Is a service down?
print(tf.is_down("claude"))

# Model pricing and benchmarks
print(tf.models())
print(tf.benchmarks())

# Daily history snapshots (the moat)
print(tf.history())  # list of available dates
print(tf.history_snapshot("2026-04-27", "pricing"))

# Free routing preview (top-1 model, 5 calls/day per IP)
preview = tf.routing_preview(task="code")
print(preview["recommendation"])
```

## Premium Tier (paid, USDC on Base)

```python
from tensorfeed import TensorFeed, PaymentRequired

tf = TensorFeed()

# Step 1: get a 30-minute quote
quote = tf.buy_credits(amount_usd=1.00)
print(f"Send {quote['amount_usd']} USDC on Base to {quote['wallet']}")
print(f"Memo: {quote['memo']} (expires in {quote['ttl_seconds']}s)")
print(f"Will get: {quote['credits']} credits")

# Step 2: send the USDC tx with your wallet
# (auto-send via web3 is on the roadmap; for v1.1 you sign and send manually)

# Step 3: confirm with the tx hash
result = tf.confirm(tx_hash="0xYOUR_TX_HASH", nonce=quote["memo"])
print(f"Got {result['credits']} credits, token: {result['token']}")
# The token is also stored on `tf` automatically; routing() will use it.

# Step 4: call premium endpoints
rec = tf.routing(task="code", budget=5.0, top_n=5)
for r in rec["recommendations"]:
    print(f'#{r["rank"]}: {r["model"]["name"]} (score: {r["composite_score"]:.2f})')

# Custom routing weights
rec = tf.routing(
    task="general",
    weights={"quality": 0.6, "cost": 0.3, "availability": 0.1, "latency": 0.0},
)

# Premium history series (1 credit each, range default = last 30 days, max 90)
prices = tf.pricing_series(model="Claude Opus 4.7")
print(f'Price changed {prices["summary"]["delta_pct_blended"]}% over the window')

scores = tf.benchmark_series(model="Claude Opus 4.7", benchmark="swe_bench")
print(f'SWE-bench moved {scores["summary"]["delta_pp"]} pp')

uptime = tf.status_uptime(provider="anthropic")
print(f'Anthropic uptime: {uptime["uptime_pct"]}% over {uptime["days_with_data"]} days')

diff = tf.history_compare(
    from_date="2026-04-01", to_date="2026-04-27", snapshot_type="pricing",
)
print(f'{len(diff["changed"])} price changes, {len(diff["added"])} new models')

# Premium webhook watches (1 credit per registration, free reads)
created = tf.create_watch(
    spec={
        "type": "price",
        "model": "Claude Opus 4.7",
        "field": "blended",
        "op": "lt",
        "threshold": 30,
    },
    callback_url="https://agent.example.com/hook",
    secret="any-shared-secret",  # used to sign deliveries
)
watch_id = created["watch"]["id"]
print(f"Watch {watch_id} active until {created['watch']['expires_at']}")

# When a delivery arrives, verify it:
#   sig = request.headers["X-TensorFeed-Signature"]  # "sha256=<hex>"
#   import hmac, hashlib
#   expected = "sha256=" + hmac.new(b"any-shared-secret", body, hashlib.sha256).hexdigest()
#   assert hmac.compare_digest(sig, expected)

print(tf.list_watches())          # see all your active watches
print(tf.get_watch(watch_id))     # check fire_count, last_fired_at
tf.delete_watch(watch_id)         # remove when done

# Check remaining credits
print(tf.balance())
```

## Auto-Send (optional, web3 extra)

The base SDK keeps you dependency-free, but if you want to skip the manual tx step, install with the `web3` extra:

```bash
pip install 'tensorfeed[web3]'
```

Then `tf.purchase_credits()` quotes, signs, broadcasts, and confirms in one call:

```python
import os
from tensorfeed import TensorFeed

tf = TensorFeed()

result = tf.purchase_credits(
    amount_usd=1.00,
    private_key=os.environ["TENSORFEED_PRIVATE_KEY"],  # NEVER hardcode
    # rpc_url="https://base-mainnet.g.alchemy.com/v2/<key>",  # optional
)
print(result["token"])      # auto-stored on tf
print(result["tx_hash"])    # for your records
print(result["credits"])    # how many credits were minted

# Token already on tf, so:
rec = tf.routing(task="code")
```

Security: read the key from a secret manager or env var. Never commit it. The raw key is held in memory only for the duration of one signing call.

## Reusing a Token Across Sessions

Save the token after `confirm()`. Reuse it next time:

```python
# Save once
token = result["token"]

# Reuse in another process / job
tf = TensorFeed(token=token)
print(tf.balance())
rec = tf.routing(task="code")
```

## Error Handling

```python
from tensorfeed import TensorFeed, PaymentRequired, RateLimited, TensorFeedError

tf = TensorFeed(token="bad_token")
try:
    tf.routing(task="code")
except PaymentRequired as e:
    # 402: token invalid, expired, or out of credits
    # e.payload contains wallet, credits required, top_up_at, etc.
    print("Need to top up:", e.payload)
except RateLimited as e:
    # 429: free preview tier hit its 5/day per-IP limit
    print("Hit the rate limit:", e.payload)
except TensorFeedError as e:
    # Other API errors
    print("API error", e.status_code, e.payload)
```

## API Reference

### Free

| Method | Description |
|--------|-------------|
| `tf.news(category=, limit=)` | Latest AI news articles |
| `tf.status()` | Real-time AI service status |
| `tf.status_summary()` | Lightweight status summary |
| `tf.models()` | Model pricing and specs |
| `tf.benchmarks()` | Benchmark scores |
| `tf.is_down(service_name)` | Check if a specific service is down |
| `tf.agent_activity()` | Agent traffic metrics |
| `tf.history()` | List of available daily snapshot dates |
| `tf.history_snapshot(date, type)` | Read a specific snapshot |
| `tf.routing_preview(task=)` | Top-1 routing recommendation (5/day/IP) |
| `tf.health()` | API health check |
| `tf.payment_info()` | Wallet, pricing, supported payment flows |
| `tf.buy_credits(amount_usd=)` | Generate a 30-min payment quote |
| `tf.confirm(tx_hash=, nonce=)` | Verify USDC tx, mint credit token |

### Token-required

| Method | Cost | Description |
|--------|------|-------------|
| `tf.balance()` | Free | Check remaining credits |
| `tf.usage()` | Free | Per-token call history (last 100 calls aggregated by endpoint) |
| `tf.routing(task=, budget=, top_n=, weights=)` | 1 credit | Top-N ranked routing with full detail |
| `tf.pricing_series(model=, from_date=, to_date=)` | 1 credit | Daily price points for one model with min/max/delta summary |
| `tf.benchmark_series(model=, benchmark=, from_date=, to_date=)` | 1 credit | Score evolution for a benchmark on one model, returns delta_pp |
| `tf.status_uptime(provider=, from_date=, to_date=)` | 1 credit | Uptime % per provider with incident days (degraded = half) |
| `tf.history_compare(from_date=, to_date=, snapshot_type=)` | 1 credit | Diff two snapshots: added, removed, changed entries with deltas |
| `tf.create_watch(spec=, callback_url=, secret=, fire_cap=)` | 1 credit | Register a webhook watch on a price change or status transition |
| `tf.list_watches()` | Free | List all active watches owned by the current token |
| `tf.get_watch(watch_id)` | Free | Read one watch including fire_count and last_fired_at |
| `tf.delete_watch(watch_id)` | Free | Remove an owned watch |
| `tf.premium_agents_directory(category=, status=, sort=, limit=, ...)` | 1 credit | Enriched directory: status, news, traffic, pricing, trending_score per agent |
| `tf.news_search(q=, from_date=, to_date=, provider=, category=, limit=)` | 1 credit | Full-text news search with date/provider filters, relevance scoring, recency boost |
| `tf.cost_projection(models=, input_tokens_per_day=, output_tokens_per_day=, horizon=)` | 1 credit | Project workload cost across 1-10 models, 4 horizons, cheapest-monthly ranking |

### Auto-send (requires `tensorfeed[web3]`)

| Method | Description |
|--------|-------------|
| `tf.purchase_credits(amount_usd=, private_key=, rpc_url=)` | One-call quote + sign + broadcast + confirm. Returns token, credits, tx_hash, block_number. |

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
- [TensorFeed.ai](https://tensorfeed.ai)
- [GitHub](https://github.com/RipperMercs/tensorfeed)
- [Changelog](https://tensorfeed.ai/changelog)

## License

MIT
