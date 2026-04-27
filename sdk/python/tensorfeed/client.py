"""TensorFeed API client.

Stdlib-only HTTP client for the TensorFeed.ai API. Covers all free
endpoints (news, status, models, benchmarks, history, routing preview,
agent activity) plus the paid premium tier (routing, payment flow).

Premium endpoints are paid via USDC on Base. No accounts, no API keys,
no traditional payment processors. See ``buy_credits()`` and ``confirm()``.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any  # noqa: F401  (re-exported by purchase_credits return type)


DEFAULT_BASE_URL = "https://tensorfeed.ai/api"
DEFAULT_USER_AGENT = "TensorFeed-SDK-Python/1.1"


class TensorFeedError(Exception):
    """Base class for all TensorFeed SDK errors."""

    def __init__(self, status_code: int, payload: dict[str, Any]) -> None:
        self.status_code = status_code
        self.payload = payload
        msg = payload.get("error") or payload.get("message") or str(payload)
        super().__init__(f"TensorFeed API error {status_code}: {msg}")


class PaymentRequired(TensorFeedError):
    """Raised on HTTP 402.

    Inspect ``e.payload`` for wallet, credits required, and pricing
    metadata. Premium endpoints return 402 when no token is provided
    or the token has insufficient credits.
    """


class RateLimited(TensorFeedError):
    """Raised on HTTP 429 (free preview tier rate limit, 5/day per IP)."""


class TensorFeed:
    """Client for the TensorFeed.ai API.

    Free endpoints work without auth. Paid endpoints require a bearer
    token obtained via ``buy_credits()`` and ``confirm()``.

    Usage::

        from tensorfeed import TensorFeed

        # Free
        tf = TensorFeed()
        news = tf.news(limit=10)
        preview = tf.routing_preview(task="code")

        # Paid: buy credits, then call routing
        quote = tf.buy_credits(amount_usd=1.00)
        # ... send USDC tx ...
        result = tf.confirm(tx_hash="0x...", nonce=quote["memo"])
        # token is auto-stored on the client
        rec = tf.routing(task="code", top_n=5)
    """

    def __init__(
        self,
        token: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 15.0,
        user_agent: str = DEFAULT_USER_AGENT,
    ) -> None:
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.user_agent = user_agent

    # ── HTTP plumbing ──────────────────────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
        require_token: bool = False,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        if params:
            cleaned = {k: v for k, v in params.items() if v is not None}
            if cleaned:
                url = f"{url}?{urllib.parse.urlencode(cleaned)}"

        headers: dict[str, str] = {"User-Agent": self.user_agent}
        data: bytes | None = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        # Premium endpoints, balance, and explicit-require-token paths get
        # the Authorization header. Free endpoints do not advertise a token
        # (avoids accidentally leaking it to public-data endpoints).
        needs_auth = (
            require_token
            or "/api/premium/" in path
            or path == "/api/payment/balance"
        )
        if needs_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read().decode())
            except Exception:
                payload = {"error": "non_json_response", "status": e.code}
            if e.code == 402:
                raise PaymentRequired(402, payload) from e
            if e.code == 429:
                raise RateLimited(429, payload) from e
            raise TensorFeedError(e.code, payload) from e

    def _get(self, path: str, **params: Any) -> dict[str, Any]:
        return self._request("GET", path, params=params)

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", path, body=body)

    # ── Free: news, status, models ─────────────────────────────────

    def news(
        self, *, category: str | None = None, limit: int | None = None
    ) -> dict[str, Any]:
        """Get latest AI news articles. Free.

        Args:
            category: Filter by category (e.g. "research", "tools")
            limit: Number of articles (default 50, max 200)
        """
        return self._get("/news", category=category, limit=limit)

    def status(self) -> dict[str, Any]:
        """Get real-time AI service status. Free."""
        return self._get("/status")

    def status_summary(self) -> dict[str, Any]:
        """Get lightweight status summary. Free."""
        return self._get("/status/summary")

    def models(self) -> dict[str, Any]:
        """Get AI model pricing and specs. Free."""
        return self._get("/models")

    def benchmarks(self) -> dict[str, Any]:
        """Get AI model benchmark scores. Free."""
        return self._get("/benchmarks")

    def agent_activity(self) -> dict[str, Any]:
        """Get agent traffic metrics. Free."""
        return self._get("/agents/activity")

    def health(self) -> dict[str, Any]:
        """API health check. Free."""
        return self._get("/health")

    def is_down(self, service_name: str) -> dict[str, Any]:
        """Check if a specific AI service is down.

        Args:
            service_name: Service to check (e.g. "claude", "openai", "gemini")
        """
        data = self.status()
        needle = service_name.lower()
        for svc in data.get("services", []):
            if needle in svc["name"].lower() or needle in svc["provider"].lower():
                return {
                    "name": svc["name"],
                    "status": svc["status"],
                    "is_down": svc["status"] == "down",
                }
        names = ", ".join(s["name"] for s in data.get("services", []))
        raise ValueError(
            f'Service "{service_name}" not found. Available: {names}'
        )

    # ── Free: history snapshots ────────────────────────────────────

    def history(self) -> dict[str, Any]:
        """List available daily history snapshot dates. Free."""
        return self._get("/history")

    def history_snapshot(self, date: str, snapshot_type: str) -> dict[str, Any]:
        """Read a specific historical snapshot. Free.

        Args:
            date: YYYY-MM-DD UTC
            snapshot_type: pricing, models, benchmarks, status, or agent-activity
        """
        return self._get(f"/history/{date}/{snapshot_type}")

    # ── Free: routing preview (rate-limited) ───────────────────────

    def routing_preview(
        self,
        *,
        task: str = "general",
        budget: float | None = None,
        min_quality: float | None = None,
    ) -> dict[str, Any]:
        """Top-1 model recommendation. Free, 5 calls/day per IP.

        For full top-5 with score breakdown and no rate limit, use
        ``routing()`` with credits.

        Args:
            task: code, reasoning, creative, or general (default general)
            budget: optional max blended USD per 1M tokens
            min_quality: optional minimum quality score in [0, 1]

        Raises:
            RateLimited: after 5 free preview calls per UTC day from an IP
        """
        return self._get(
            "/preview/routing",
            task=task,
            budget=budget,
            min_quality=min_quality,
        )

    # ── Payment flow ───────────────────────────────────────────────

    def payment_info(self) -> dict[str, Any]:
        """Get wallet address, pricing, and supported flows. Free.

        Use this to verify the wallet address before sending USDC.
        Cross-check against ``llms.txt``, the GitHub README, and the
        @tensorfeed X bio.
        """
        return self._get("/payment/info")

    def buy_credits(self, *, amount_usd: float) -> dict[str, Any]:
        """Generate a 30-min payment quote.

        Returns a dict with ``wallet``, ``memo``, ``amount_usd``, ``credits``,
        ``expires_at``, ``ttl_seconds``, ``next_step``.

        Send the USDC on Base to ``wallet`` (memo is optional but recommended),
        then call ``confirm()`` with the tx hash and the ``memo`` as nonce.

        Args:
            amount_usd: USD value of credits to buy. Must be 0.5 to 10000.
                Volume discounts apply at $5 (10%), $30 (25%), $200 (40%).
        """
        return self._post("/payment/buy-credits", {"amount_usd": amount_usd})

    def confirm(
        self,
        *,
        tx_hash: str,
        nonce: str | None = None,
    ) -> dict[str, Any]:
        """Verify a USDC tx on-chain and mint a credit token.

        On success, the returned token is also stored on this client
        instance, so subsequent calls to ``routing()``, ``balance()``,
        etc. work immediately.

        Returns a dict with ``token``, ``credits``, ``balance``,
        ``tx_amount_usd``, ``rate``.

        Args:
            tx_hash: 0x-prefixed Base mainnet transaction hash
            nonce: optional memo from ``buy_credits()``. If provided and
                the tx amount matches the quote within $0.01, the quoted
                credits (with volume discount) are applied. Otherwise
                credits are calculated from the actual tx amount.
        """
        body: dict[str, Any] = {"tx_hash": tx_hash}
        if nonce is not None:
            body["nonce"] = nonce
        result = self._post("/payment/confirm", body)
        if isinstance(result, dict) and result.get("ok") and result.get("token"):
            self.token = str(result["token"])
        return result

    def balance(self) -> dict[str, Any]:
        """Check remaining credits for the current token.

        Raises:
            ValueError: if no token is set on the client
        """
        if not self.token:
            raise ValueError(
                "balance() requires a token. Set it via TensorFeed(token=...) "
                "or call confirm() first."
            )
        return self._request("GET", "/payment/balance", require_token=True)

    # ── Auto-purchase via web3 (optional dependency) ───────────────

    def purchase_credits(
        self,
        *,
        amount_usd: float,
        private_key: str,
        rpc_url: str | None = None,
        wait_seconds: int = 90,
    ) -> dict[str, Any]:
        """Buy credits end-to-end: quote, sign USDC tx, broadcast, confirm.

        Convenience wrapper around buy_credits() + raw signing + confirm()
        that handles the whole flow in one call. The token is auto-stored
        on this client on success, so subsequent ``routing()`` calls work
        immediately.

        Requires the optional ``web3`` extra:
            pip install 'tensorfeed[web3]'

        Args:
            amount_usd: USD value of credits to buy (0.5 to 10000)
            private_key: 0x-prefixed Ethereum private key. DO NOT
                hardcode; read from an env var or secret manager.
            rpc_url: Base mainnet RPC. Defaults to public Base RPC,
                which is fine for occasional use. For production use
                Alchemy or QuickNode.
            wait_seconds: Max seconds to wait for tx confirmation
                (default 90)

        Returns:
            Dict with token, credits, balance, tx_hash, tx_amount_usd,
            rate, block_number.

        Raises:
            Web3NotInstalled: if pip install 'tensorfeed[web3]' was not run
            TimeoutError: if the tx doesn't confirm in wait_seconds
            RuntimeError: on RPC failure, on-chain revert, or
                TensorFeed-side rejection
        """
        from .web3_signer import auto_purchase_credits  # lazy import
        return auto_purchase_credits(
            self,
            amount_usd=amount_usd,
            private_key=private_key,
            rpc_url=rpc_url,
            wait_seconds=wait_seconds,
        )

    # ── Paid: routing (Tier 2, 1 credit/call) ──────────────────────

    def routing(
        self,
        *,
        task: str = "general",
        budget: float | None = None,
        min_quality: float | None = None,
        top_n: int = 5,
        weights: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Tier 2 routing: top-N ranked models with full score breakdown.

        Costs 1 credit per call. Requires a token from ``confirm()`` or
        passed to the constructor.

        Args:
            task: code, reasoning, creative, or general
            budget: optional max blended USD per 1M tokens
            min_quality: optional minimum quality score in [0, 1]
            top_n: how many models to return (1 to 10, default 5)
            weights: optional dict of {quality, availability, cost, latency}
                weights to override the defaults (0.4, 0.3, 0.2, 0.1).
                Will be normalized server-side to sum to 1.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits

        Example::

            rec = tf.routing(task="code", budget=5.0, top_n=3)
            for r in rec["recommendations"]:
                print(r["model"]["name"], r["composite_score"])
        """
        if not self.token:
            raise ValueError(
                "routing() requires a token. Buy credits via buy_credits() and "
                "confirm(), or pass an existing token to TensorFeed(token=...)."
            )
        params: dict[str, Any] = {"task": task, "top_n": top_n}
        if budget is not None:
            params["budget"] = budget
        if min_quality is not None:
            params["min_quality"] = min_quality
        if weights:
            for key in ("quality", "availability", "cost", "latency"):
                if key in weights:
                    params[f"w_{key}"] = weights[key]
        return self._request(
            "GET", "/premium/routing", params=params, require_token=True
        )
