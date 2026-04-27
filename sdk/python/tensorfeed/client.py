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
DEFAULT_USER_AGENT = "TensorFeed-SDK-Python/1.8"


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

    def usage(self) -> dict[str, Any]:
        """Per-token call history for the current bearer token. Free.

        Returns the last 100 premium API calls aggregated by endpoint
        plus the 25 most recent entries. Powers the human-facing
        ``/account`` dashboard but is also useful for agents that want
        to monitor their own spend.

        Returns:
            Dict with ``token_balance``, ``total_calls``,
            ``total_credits_spent``, ``by_endpoint`` (per-endpoint
            counts and credits), and ``recent`` (last 25 entries).

        Raises:
            ValueError: if no token is set on the client
        """
        if not self.token:
            raise ValueError(
                "usage() requires a token. Set it via TensorFeed(token=...) "
                "or call confirm() first."
            )
        return self._request("GET", "/payment/usage", require_token=True)

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

    # ── Paid: history series (Tier 1, 1 credit/call) ───────────────

    def _require_token(self, name: str) -> None:
        if not self.token:
            raise ValueError(
                f"{name}() requires a token. Buy credits via buy_credits() and "
                "confirm(), or pass an existing token to TensorFeed(token=...)."
            )

    def pricing_series(
        self,
        *,
        model: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Daily price points for one model with min/max/delta summary.

        Costs 1 credit per call. Range capped at 90 days; default 30 days
        back from today.

        Args:
            model: Model id or display name (e.g. "Claude Opus 4.7" or
                "claude-opus-4-7"). Case-insensitive.
            from_date: Start date in YYYY-MM-DD UTC. Defaults to 30 days ago.
            to_date: End date in YYYY-MM-DD UTC. Defaults to today.

        Returns:
            Dict with ``points`` (list of {date, input, output, blended}),
            ``summary`` (first/latest/min/max/delta_pct/changes_detected),
            ``range``, and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("pricing_series")
        return self._request(
            "GET",
            "/premium/history/pricing/series",
            params={"model": model, "from": from_date, "to": to_date},
            require_token=True,
        )

    def benchmark_series(
        self,
        *,
        model: str,
        benchmark: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Score evolution for a single benchmark on one model.

        Costs 1 credit per call. Range capped at 90 days; default 30 days
        back from today.

        Args:
            model: Model id or display name. Case-insensitive.
            benchmark: Benchmark key (e.g. "swe_bench", "mmlu_pro",
                "gpqa_diamond", "math", "human_eval"). Case-insensitive.
            from_date: Start date in YYYY-MM-DD UTC. Defaults to 30 days ago.
            to_date: End date in YYYY-MM-DD UTC. Defaults to today.

        Returns:
            Dict with ``points`` (list of {date, score}), ``summary``
            (first/latest/min_score/max_score/delta_pp), ``range``, and ``billing``.
        """
        self._require_token("benchmark_series")
        return self._request(
            "GET",
            "/premium/history/benchmarks/series",
            params={
                "model": model,
                "benchmark": benchmark,
                "from": from_date,
                "to": to_date,
            },
            require_token=True,
        )

    def status_uptime(
        self,
        *,
        provider: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Daily uptime rollup for one provider.

        Costs 1 credit per call. Operational days count fully, degraded
        days count as half, missing-data days are excluded from the
        denominator.

        Args:
            provider: Provider name (e.g. "anthropic", "openai", "google").
                Case-insensitive.
            from_date: Start date in YYYY-MM-DD UTC. Defaults to 30 days ago.
            to_date: End date in YYYY-MM-DD UTC. Defaults to today.

        Returns:
            Dict with ``uptime_pct``, day counts by status, ``incident_days``,
            and ``billing``.
        """
        self._require_token("status_uptime")
        return self._request(
            "GET",
            "/premium/history/status/uptime",
            params={"provider": provider, "from": from_date, "to": to_date},
            require_token=True,
        )

    def history_compare(
        self,
        *,
        from_date: str,
        to_date: str,
        snapshot_type: str = "pricing",
    ) -> dict[str, Any]:
        """Diff two daily snapshots: added, removed, and changed entries.

        Costs 1 credit per call.

        Args:
            from_date: Earlier snapshot date in YYYY-MM-DD UTC.
            to_date: Later snapshot date in YYYY-MM-DD UTC.
            snapshot_type: "pricing" (default) or "benchmarks".

        Returns:
            For pricing: ``added``, ``removed``, ``changed`` (with
            field/from/to/delta_pct), and ``unchanged_count``.
            For benchmarks: ``added_models``, ``removed_models``, and
            ``changed`` (with model/benchmark/from/to/delta_pp).
        """
        self._require_token("history_compare")
        return self._request(
            "GET",
            "/premium/history/compare",
            params={"from": from_date, "to": to_date, "type": snapshot_type},
            require_token=True,
        )

    # ── Paid: webhook watches (Tier 1, 1 credit per registration) ──

    def create_watch(
        self,
        *,
        spec: dict[str, Any],
        callback_url: str,
        secret: str | None = None,
        fire_cap: int | None = None,
    ) -> dict[str, Any]:
        """Register a webhook watch on a price change or status transition.

        Costs 1 credit at registration. Watch lives 90 days, fires up to
        ``fire_cap`` times (default 100), capped at 25 active watches per
        token. Each fire is a signed POST to ``callback_url`` with an
        ``X-TensorFeed-Signature: sha256=<hex>`` header (HMAC over the
        body using ``secret``) and ``X-TensorFeed-Watch-Id``.

        Args:
            spec: Watch predicate. One of:
                ``{"type": "price", "model": str, "field": "inputPrice"|
                "outputPrice"|"blended", "op": "lt"|"gt"|"changes",
                "threshold": float}``
                ``{"type": "status", "provider": str,
                "op": "becomes"|"changes",
                "value": "operational"|"degraded"|"down"}``
                Predicates are debounced: they fire only on edge
                transitions, not while continuously satisfying.
            callback_url: HTTPS URL to POST to. Private hosts (RFC1918,
                localhost, link-local) are rejected.
            secret: Optional shared secret. If provided, deliveries
                include an HMAC-SHA256 signature over the body.
            fire_cap: Max fires before the watch auto-disables (1-1000,
                default 100).

        Returns:
            Dict with ``watch`` (full record including ``id``,
            ``expires_at``, ``status``) and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
            TensorFeedError: 400 on invalid spec or callback URL
        """
        self._require_token("create_watch")
        body: dict[str, Any] = {"spec": spec, "callback_url": callback_url}
        if secret is not None:
            body["secret"] = secret
        if fire_cap is not None:
            body["fire_cap"] = fire_cap
        return self._request(
            "POST", "/premium/watches", body=body, require_token=True,
        )

    def list_watches(self) -> dict[str, Any]:
        """List all active watches owned by the current bearer token. Free."""
        self._require_token("list_watches")
        return self._request("GET", "/premium/watches", require_token=True)

    def get_watch(self, watch_id: str) -> dict[str, Any]:
        """Read one watch (must be owned by the current token). Free.

        Includes ``fire_count``, ``last_fired_at``, ``last_delivery_status``.
        """
        self._require_token("get_watch")
        return self._request(
            "GET", f"/premium/watches/{watch_id}", require_token=True,
        )

    def delete_watch(self, watch_id: str) -> dict[str, Any]:
        """Delete an owned watch. Free.

        Args:
            watch_id: The wat_... id returned from create_watch().
        """
        self._require_token("delete_watch")
        return self._request(
            "DELETE", f"/premium/watches/{watch_id}", require_token=True,
        )

    # ── Paid: enriched agents directory (Tier 1, 1 credit) ─────────

    def premium_agents_directory(
        self,
        *,
        category: str | None = None,
        status: str | None = None,
        open_source: bool | None = None,
        capability: str | None = None,
        sort: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Enriched agents directory: catalog joined with live signals.

        Costs 1 credit per call. Each agent record includes ``live_status``,
        ``status_page_url``, ``recent_news_count``, ``recent_news`` (top 3),
        ``agent_traffic_24h``, ``flagship_pricing`` (with blended $/1M),
        and a derived ``trending_score`` (0-100).

        Args:
            category: Filter to one category id (e.g. "coding", "research",
                "general", "creative", "frameworks").
            status: Filter to one live status: "operational", "degraded",
                "down", or "unknown".
            open_source: True for OSS-only, False for closed-only.
            capability: Substring match against an agent's capabilities tags.
            sort: One of "trending" (default), "alphabetical", "status",
                "price_low", "price_high", "news_count".
            limit: Max records to return (1-100, default 50).

        Returns:
            Dict with ``agents`` (list), ``total``, ``returned``,
            ``filters_applied``, ``sort``, ``data_freshness``, and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("premium_agents_directory")
        params: dict[str, Any] = {}
        if category is not None:
            params["category"] = category
        if status is not None:
            params["status"] = status
        if open_source is True:
            params["open_source"] = "true"
        elif open_source is False:
            params["open_source"] = "false"
        if capability is not None:
            params["capability"] = capability
        if sort is not None:
            params["sort"] = sort
        if limit is not None:
            params["limit"] = limit
        return self._request(
            "GET", "/premium/agents/directory", params=params, require_token=True,
        )

    # ── Paid: news search (Tier 1, 1 credit) ───────────────────────

    def news_search(
        self,
        *,
        q: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        provider: str | None = None,
        category: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        """Full-text search over the TensorFeed news article corpus.

        Costs 1 credit per call. Free /news returns the latest articles in
        date order; this endpoint adds query, date range, provider, and
        category filters with relevance scoring.

        Relevance blends term hits in title (weight 3) and snippet
        (weight 1) plus a recency boost. Stop words and tokens shorter
        than 2 chars are stripped from the query.

        Args:
            q: Free-text query (e.g. "claude opus pricing"). If omitted,
                returns the latest filtered articles in publishedAt desc.
            from_date: Start date YYYY-MM-DD UTC (inclusive).
            to_date: End date YYYY-MM-DD UTC (inclusive end-of-day).
            provider: Substring match against source name and sourceDomain
                (e.g. "anthropic", "openai", "techcrunch").
            category: Substring match against article categories.
            limit: Max results (1-100, default 25).

        Returns:
            Dict with ``query``, ``filters``, ``total_corpus``,
            ``matched``, ``returned``, ``results`` (each with title, url,
            source, snippet, published_at, relevance, matched_terms),
            and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("news_search")
        params: dict[str, Any] = {}
        if q is not None:
            params["q"] = q
        if from_date is not None:
            params["from"] = from_date
        if to_date is not None:
            params["to"] = to_date
        if provider is not None:
            params["provider"] = provider
        if category is not None:
            params["category"] = category
        if limit is not None:
            params["limit"] = limit
        return self._request(
            "GET", "/premium/news/search", params=params, require_token=True,
        )

    # ── Paid: cost projection (Tier 1, 1 credit) ──────────────────

    def cost_projection(
        self,
        *,
        models: list[str] | str,
        input_tokens_per_day: float,
        output_tokens_per_day: float,
        horizon: str | None = None,
    ) -> dict[str, Any]:
        """Project cost of a token-usage workload across one or more models.

        Costs 1 credit per call. Returns daily/weekly/monthly/yearly cost
        for each model plus a ranking by cheapest monthly. Pure compute on
        live /api/models pricing data.

        Args:
            models: One model name/id or a list of up to 10. Display
                names and ids are both accepted, case-insensitive.
            input_tokens_per_day: Expected daily input volume.
            output_tokens_per_day: Expected daily output volume.
            horizon: Default 'monthly'. One of 'daily', 'weekly',
                'monthly', 'yearly'. Used for the primary_horizon field
                in the response; all four horizons are always computed.

        Returns:
            Dict with ``workload``, ``projections`` (per-model with
            rates and per-horizon totals), ``ranked_cheapest_monthly``,
            and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
            TensorFeedError: 400 on validation failure (e.g. >10 models)
        """
        self._require_token("cost_projection")
        models_csv = ",".join(models) if isinstance(models, list) else str(models)
        params: dict[str, Any] = {
            "model": models_csv,
            "input_tokens_per_day": input_tokens_per_day,
            "output_tokens_per_day": output_tokens_per_day,
        }
        if horizon is not None:
            params["horizon"] = horizon
        return self._request(
            "GET", "/premium/cost/projection", params=params, require_token=True,
        )
