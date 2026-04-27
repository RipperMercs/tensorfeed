"""
Optional web3 integration for one-shot credit purchases.

This module is loaded lazily and is only imported when the user calls
``TensorFeed.purchase_credits()``. The base SDK has zero external
dependencies; web3.py is only required when you want auto-send.

Install with: pip install tensorfeed[web3]

Security:
    The auto-send flow takes a raw private key as a Python string. This
    is convenient but easy to leak. Prefer reading the key from an
    environment variable, never hardcode it in source, and never log it.
    Cloudflare Workers and similar environments should keep the key in
    a secret manager.

    For higher security, sign transactions externally (e.g., via a
    hardware wallet or remote signer) and call ``TensorFeed.confirm()``
    with the resulting tx hash directly. The auto-send path here is for
    server-side agents that hold their own keys.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .client import TensorFeed

USDC_BASE_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
DEFAULT_BASE_RPC = "https://mainnet.base.org"
BASE_CHAIN_ID = 8453
USDC_DECIMALS = 6

# Minimal ERC-20 transfer ABI; we do not need the full standard
USDC_TRANSFER_ABI = [
    {
        "name": "transfer",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
]


class Web3NotInstalled(ImportError):
    """Raised when web3.py is not installed but auto-send was requested."""


def auto_purchase_credits(
    tf: "TensorFeed",
    *,
    amount_usd: float,
    private_key: str,
    rpc_url: str | None = None,
    wait_seconds: int = 90,
    poll_interval: float = 2.0,
) -> dict[str, Any]:
    """Buy credits end-to-end: quote, sign USDC tx, broadcast, confirm.

    Args:
        tf: The TensorFeed client. Token is auto-stored on success so
            subsequent calls to ``tf.routing()`` etc. work immediately.
        amount_usd: USD value of credits to buy. Must be 0.5 to 10000.
        private_key: 0x-prefixed Ethereum private key for signing the
            USDC transfer. NEVER hardcode this; read from a secure env
            var. The key is held in memory only for the duration of
            this call.
        rpc_url: Base mainnet RPC endpoint. Defaults to the free public
            Base RPC, which is fine for occasional use. For production
            use Alchemy or QuickNode.
        wait_seconds: Max wall-clock seconds to wait for tx confirmation
            before raising TimeoutError. Default 90.
        poll_interval: Seconds between receipt polls.

    Returns:
        Dict with ``token``, ``credits``, ``balance``, ``tx_hash``,
        ``tx_amount_usd``, ``rate``.

    Raises:
        Web3NotInstalled: if web3.py is not installed
        TimeoutError: if the tx does not confirm within wait_seconds
        RuntimeError: on RPC connection failure, on-chain tx revert, or
            TensorFeed-side rejection of the confirmed tx
    """
    try:
        from web3 import Web3
        from eth_account import Account
    except ImportError as e:
        raise Web3NotInstalled(
            "web3 is not installed. Run: pip install 'tensorfeed[web3]'\n"
            "Then retry, or use the manual flow: tf.buy_credits() + sign "
            "the USDC tx yourself + tf.confirm(tx_hash=..., nonce=...)."
        ) from e

    rpc = rpc_url or DEFAULT_BASE_RPC
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
    if not w3.is_connected():
        raise RuntimeError(f"Cannot reach Base RPC at {rpc}")

    account = Account.from_key(private_key)
    sender = account.address

    # Step 1: TensorFeed-side quote
    quote = tf.buy_credits(amount_usd=amount_usd)
    receiving_wallet = quote["wallet"]
    memo = quote["memo"]

    # Step 2: build USDC transfer tx on Base
    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(USDC_BASE_CONTRACT),
        abi=USDC_TRANSFER_ABI,
    )
    amount_units = int(round(amount_usd * (10 ** USDC_DECIMALS)))

    tx_nonce = w3.eth.get_transaction_count(sender)
    tx = usdc.functions.transfer(
        Web3.to_checksum_address(receiving_wallet), amount_units
    ).build_transaction(
        {
            "from": sender,
            "nonce": tx_nonce,
            "chainId": BASE_CHAIN_ID,
        }
    )
    if "gas" not in tx:
        tx["gas"] = w3.eth.estimate_gas(tx)

    # Step 3: sign + broadcast
    signed = Account.sign_transaction(tx, private_key=private_key)
    raw_tx = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
    tx_hash_bytes = w3.eth.send_raw_transaction(raw_tx)
    tx_hash = "0x" + tx_hash_bytes.hex().lstrip("0x")

    # Step 4: wait for confirmation
    deadline = time.time() + wait_seconds
    receipt = None
    while time.time() < deadline:
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash_bytes)
            if receipt is not None:
                break
        except Exception:
            pass  # tx may not be mined yet; keep polling
        time.sleep(poll_interval)

    if receipt is None:
        raise TimeoutError(
            f"Tx {tx_hash} did not confirm within {wait_seconds}s. "
            f"You can complete the purchase manually once it confirms by "
            f"calling tf.confirm(tx_hash={tx_hash!r}, nonce={memo!r})."
        )
    if int(getattr(receipt, "status", 0)) != 1:
        raise RuntimeError(
            f"Tx {tx_hash} reverted on-chain (status=0). No credits were minted."
        )

    # Step 5: TensorFeed-side confirm
    result = tf.confirm(tx_hash=tx_hash, nonce=memo)
    if not result.get("ok"):
        raise RuntimeError(
            f"Tx {tx_hash} mined but TensorFeed rejected confirm: {result}. "
            f"Email evan@tensorfeed.ai with the tx hash for a manual reconciliation."
        )

    return {
        **result,
        "tx_hash": tx_hash,
        "block_number": getattr(receipt, "blockNumber", None),
    }
