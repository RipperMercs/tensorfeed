"""
Generate an Ed25519 keypair for mcp-publisher DNS authentication.

Outputs:
  - Hex-encoded private key (paste into `mcp-publisher login dns --private-key <hex>`)
  - DNS TXT record content (paste into Cloudflare DNS for tensorfeed.ai)
  - Saved key file at C:/projects/tensorfeed/.mcp-key (gitignored, do not commit)

Run once. Save the output. The private key file is gitignored; protect it.
"""

from __future__ import annotations

import base64
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)


def main() -> None:
    key = Ed25519PrivateKey.generate()
    priv = key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    pub = key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

    priv_hex = priv.hex()
    pub_b64 = base64.b64encode(pub).decode()

    out = Path(__file__).parent.parent / ".mcp-key"
    out.write_text(
        f"# mcp-publisher Ed25519 key for tensorfeed.ai\n"
        f"# DO NOT COMMIT. Keep this file.\n"
        f"PRIVATE_KEY_HEX={priv_hex}\n"
        f"PUBLIC_KEY_BASE64={pub_b64}\n",
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print("Ed25519 keypair generated for tensorfeed.ai mcp-publisher")
    print("=" * 72)
    print()
    print("STEP 1: Add this DNS TXT record on Cloudflare for tensorfeed.ai")
    print("-" * 72)
    print(f"  Type:    TXT")
    print(f"  Name:    tensorfeed.ai            (apex / @ / blank)")
    print(f"  Content: v=MCPv1; k=ed25519; p={pub_b64}")
    print(f"  TTL:     Auto (or 300)")
    print()
    print("  If a v=MCPv1 TXT already exists from a prior publish, REPLACE its")
    print("  content with the line above (do not add a second TXT).")
    print()
    print("STEP 2: Wait ~30s for DNS propagation, then run:")
    print("-" * 72)
    print(f"  mcp-publisher login dns --domain tensorfeed.ai --private-key {priv_hex}")
    print()
    print(f"Both values are also saved to: {out}")
    print("This file is gitignored. Do not commit it.")
    print()


if __name__ == "__main__":
    main()
