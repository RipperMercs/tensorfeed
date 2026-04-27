"""
TensorFeed quickstart example.

Demonstrates:
  1. Free tier (status, news, routing preview)
  2. Buying credits via USDC on Base (manual flow)
  3. Premium routing once a token has been minted

Run:
    pip install tensorfeed
    python quickstart.py
"""

from tensorfeed import TensorFeed, PaymentRequired, RateLimited


def main() -> None:
    tf = TensorFeed()

    print("=== Free tier ===")
    status = tf.status()
    services = status.get("services", [])
    print(f"Tracking {len(services)} AI services")
    for svc in services[:5]:
        print(f"  {svc['name']}: {svc['status']}")

    try:
        preview = tf.routing_preview(task="code")
        rec = preview.get("recommendation")
        if rec:
            rl = preview.get("rate_limit", {})
            print(
                f"\nFree top recommendation for code: {rec['model']} ({rec['provider']})"
            )
            print(
                f"Preview rate limit: {rl.get('remaining', '?')}/{rl.get('limit', '?')} remaining today"
            )
    except RateLimited:
        print("\nFree preview is rate-limited for today (5/day per IP).")

    print("\n=== Buy credits ===")
    quote = tf.buy_credits(amount_usd=1.00)
    print(f"Send {quote['amount_usd']} USDC on Base to:")
    print(f"  Wallet: {quote['wallet']}")
    print(f"  Memo:   {quote['memo']}")
    print(f"  Credits you will get: {quote['credits']}")
    print(f"  Quote expires in:    {quote['ttl_seconds']}s")
    print()
    print("After you send the tx:")
    print(f"  result = tf.confirm(tx_hash='0x...', nonce={quote['memo']!r})")
    print("  print(result['token'])  # save for future calls")
    print()
    print("=== Premium routing (once you have a token) ===")
    print("  tf = TensorFeed(token='tf_live_...')")
    print("  rec = tf.routing(task='code', budget=5.0, top_n=3)")
    print("  for r in rec['recommendations']:")
    print("      print(r['model']['name'], r['composite_score'])")


if __name__ == "__main__":
    main()
