"""
End-to-end credit purchase example with web3 auto-send.

Requires:
    pip install 'tensorfeed[web3]'

Reads the private key from a TENSORFEED_PRIVATE_KEY env var so it is
never hardcoded. NEVER commit a private key to source control.

The flow this script runs:
    1. tf.purchase_credits(amount_usd=1.00, private_key=..., ...)
    2. Internally: TensorFeed.buy_credits() (quote)
    3. Internally: web3 signs and broadcasts the USDC transfer on Base
    4. Internally: poll until the tx confirms
    5. Internally: TensorFeed.confirm() (mints the bearer token)
    6. The token is auto-stored on the client; tf.routing() works immediately.
"""

import os

from tensorfeed import TensorFeed


def main() -> None:
    private_key = os.environ.get("TENSORFEED_PRIVATE_KEY")
    if not private_key:
        print("Set TENSORFEED_PRIVATE_KEY env var with a 0x-prefixed key")
        print("for an account that holds USDC on Base.")
        return

    tf = TensorFeed()

    # Optional: use a paid RPC for production
    rpc_url = os.environ.get("BASE_RPC_URL")  # e.g. an Alchemy URL

    print("Buying $1.00 of credits ...")
    result = tf.purchase_credits(
        amount_usd=1.00,
        private_key=private_key,
        rpc_url=rpc_url,
        wait_seconds=120,
    )
    print(f"  tx hash:     {result['tx_hash']}")
    print(f"  block:       {result.get('block_number')}")
    print(f"  credits:     {result['credits']}")
    print(f"  rate:        {result['rate']}")
    print(f"  token:       {result['token'][:16]}... (auto-stored on client)")

    print("\nCalling premium routing ...")
    rec = tf.routing(task="code", top_n=3)
    for r in rec["recommendations"]:
        print(f"  #{r['rank']} {r['model']['name']:25s} score={r['composite_score']:.3f}")

    print(f"\nRemaining credits: {tf.balance()['balance']}")


if __name__ == "__main__":
    main()
