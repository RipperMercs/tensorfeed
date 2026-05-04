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
DEFAULT_USER_AGENT = "TensorFeed-SDK-Python/1.19"


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

    def multimodal(self, *, modality: str | None = None) -> dict[str, Any]:
        """Get the multimodal model catalog. Free.

        Args:
            modality: Filter to "image", "video", "tts", or "stt"
        """
        return self._get("/multimodal", modality=modality)

    def vector_dbs(
        self, *, type: str | None = None, open_source: bool | None = None
    ) -> dict[str, Any]:
        """Get the vector database catalog. Free.

        Args:
            type: "managed", "oss", or "hybrid"
            open_source: Restrict to open-source databases only
        """
        kwargs: dict[str, Any] = {}
        if type is not None:
            kwargs["type"] = type
        if open_source is not None:
            kwargs["open_source"] = "true" if open_source else "false"
        return self._get("/vector-dbs", **kwargs)

    def embeddings(self, *, type: str | None = None) -> dict[str, Any]:
        """Get the embedding & reranker model catalog. Free.

        Args:
            type: Filter to "embedding" or "reranker" only
        """
        return self._get("/embeddings", type=type)

    def inference_providers(self, *, family: str | None = None) -> dict[str, Any]:
        """Get the cross-provider pricing matrix for open-weight models. Free.

        Args:
            family: Filter by origin lab (Meta, DeepSeek, Mistral, Alibaba)
        """
        return self._get("/inference-providers", family=family)

    def inference_cheapest(
        self, model: str, *, sort: str = "blended"
    ) -> dict[str, Any]:
        """Get the top 3 cheapest hosted inference offers for one model. Free.

        Args:
            model: Canonical model id (e.g. "llama-4-scout", "deepseek-v4-pro")
            sort: One of "blended" (default), "input", "output", "tps_desc"
        """
        return self._get("/inference-providers/cheapest", model=model, sort=sort)

    def harnesses(self) -> dict[str, Any]:
        """Get the cross-harness coding agent leaderboard. Free.

        Returns scores for Claude Code, Cursor Agent, Codex CLI, Aider,
        OpenHands, Devin, Cline, Windsurf Cascade, Amp, Continue, and
        Roo Code on SWE-bench Verified, Terminal-Bench, Aider Polyglot,
        and SWE-Lancer. Includes a ``rollups`` field with each harness's
        best base-model score per benchmark.
        """
        return self._get("/harnesses")

    def embodied_ai(self, *, category: str | None = None) -> dict[str, Any]:
        """Get the embodied AI catalog. Free.

        Vision-language-action foundation models (pi-0, pi-0.5, GR00T N1,
        OpenVLA, Octo, RDT-1B, Helix), humanoid platforms (Figure 02,
        1X NEO, Tesla Optimus, Apptronik Apollo, Unitree G1/H1, Atlas
        Electric, Agility Digit, Sanctuary Phoenix), real-world training
        datasets (Open X-Embodiment, DROID, AgiBot World, Mobile ALOHA,
        BridgeData V2), and physics simulators (Isaac Lab, MuJoCo
        Playground, Genesis).

        Args:
            category: Filter to one of "foundation_model", "humanoid",
                "dataset", or "simulator".
        """
        return self._get("/embodied-ai", category=category)

    def training_datasets(self, *, stage: str | None = None) -> dict[str, Any]:
        """Get the AI training datasets registry. Free.

        Pretraining corpora (FineWeb, RedPajama v2, Common Crawl, Dolma,
        The Pile, RefinedWeb), instruction-tuning sets (Tulu 3 SFT,
        OpenHermes 2.5, OpenOrca, AgentInstruct), DPO/RLHF preference
        sets (UltraFeedback, Tulu 3 Pref, HelpSteer 2), and multimodal
        sets (LAION-5B, DataComp-1B). Each row: tokens, license,
        languages, and the upstream URL.

        Args:
            stage: Filter to one of "pretraining", "instruction-tuning",
                "dpo", "rlhf", "continued-pretraining", or "multimodal".
        """
        return self._get("/training-datasets", stage=stage)

    def mcp_servers(
        self,
        *,
        capability: str | None = None,
        first_party: bool | None = None,
    ) -> dict[str, Any]:
        """Get the curated MCP server catalog. Free.

        Distinct from /api/mcp/registry/snapshot (which is a daily
        count + churn telemetry of the official registry); this returns
        the curated production-server catalog with capabilities,
        transport (stdio | sse | streamable-http), license, and
        first-party flag.

        Args:
            capability: Filter to one of "filesystem", "web-search",
                "browser", "github", "slack", "database", etc.
            first_party: True to limit to first-party (vendor-published)
                servers only.
        """
        kwargs: dict[str, Any] = {}
        if capability is not None:
            kwargs["capability"] = capability
        if first_party is True:
            kwargs["first_party"] = "true"
        return self._get("/mcp-servers", **kwargs)

    def benchmark_registry(
        self,
        *,
        category: str | None = None,
        status: str | None = None,
    ) -> dict[str, Any]:
        """Get the meta-catalog of AI evaluation benchmarks. Free.

        Each entry: size, score range, current frontier score, current
        SOTA holder model + date + citation URL, status (active vs
        saturated vs deprecated), contamination risk, paper/repo/
        leaderboard URLs. Covers MMLU-Pro, GPQA Diamond, HLE, ARC-AGI-2,
        AIME 2025, SWE-bench Verified, LiveCodeBench, Aider Polyglot,
        Terminal-Bench, SWE-Lancer, MMMU-Pro, MathVista, Tau-Bench,
        GAIA, WebArena, OSWorld, BFCL v3, HCAST, RULER, and more.

        Args:
            category: Filter to "knowledge", "math", "code", "multimodal",
                "agents", "long-context", or "safety".
            status: Filter to "active", "saturated", or "deprecated".
        """
        kwargs: dict[str, Any] = {}
        if category is not None:
            kwargs["category"] = category
        if status is not None:
            kwargs["status"] = status
        return self._get("/benchmark-registry", **kwargs)

    def gpu_pricing(self) -> dict[str, Any]:
        """Get GPU rental pricing across cloud marketplaces. Free.

        Snapshot of GPU spot/on-demand pricing for H100, H200, A100,
        L40S, B200, MI300X, etc across Vast.ai, RunPod, and other
        marketplaces. Updated multiple times per day.
        """
        return self._get("/gpu/pricing")

    def incidents(self) -> dict[str, Any]:
        """Get the AI service incident history. Free.

        Service incidents surfaced by TensorFeed status monitoring
        (Anthropic, OpenAI, Google, Mistral, Cohere, others). Returns
        the historical incident list with start/end timestamps and
        severity. Pairs with /api/status (current state) and
        /api/premium/history/status/uptime (per-provider uptime series).
        """
        return self._get("/incidents")

    def attention(self) -> dict[str, Any]:
        """Get the live AI Attention Index. Free.

        Returns a derived 0-100 attention score per AI provider, computed
        from news article volume in 24h and 7d, GitHub trending repos
        matching the provider, and bot/agent traffic to provider-related
        endpoints. Each provider entry includes raw signal counts and the
        top 3 most recent matching articles. Cached 5 minutes.
        """
        return self._get("/attention")

    def attention_history(self) -> dict[str, Any]:
        """List dates with a captured AI Attention Index snapshot. Free."""
        return self._get("/attention/history")

    def attention_snapshot(self, date: str) -> dict[str, Any]:
        """Read a specific date's AI Attention Index snapshot. Free.

        Args:
            date: Date as YYYY-MM-DD (UTC)
        """
        return self._get(f"/attention/history/{date}")

    def attention_series(
        self,
        provider: str,
        *,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Get the per-provider attention time series. 1 credit. Premium.

        Returns daily attention_score and raw signal counts for one
        provider over the requested range, plus first/last/delta/min/max/avg
        summary. Range capped at 90 days, default 30 days back.

        Args:
            provider: Provider id (anthropic, openai, google, meta, mistral,
                cohere, deepseek, xai, perplexity, nvidia, huggingface, cursor)
            from_date: Start YYYY-MM-DD (default: 30 days ago)
            to_date: End YYYY-MM-DD (default: today)
        """
        kwargs = {"provider": provider}
        if from_date is not None:
            kwargs["from"] = from_date
        if to_date is not None:
            kwargs["to"] = to_date
        return self._get("/premium/attention/series", **kwargs)

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

    def create_digest_watch(
        self,
        *,
        cadence: str,
        callback_url: str,
        secret: str | None = None,
        fire_cap: int | None = None,
    ) -> dict[str, Any]:
        """Register a scheduled digest watch.

        Costs 1 credit at registration. Fires on a fixed cadence (daily
        or weekly) with a curated summary of pricing changes,
        added/removed models, and total change count for the period,
        regardless of whether anything dramatic happened. Set-and-forget
        for agents that want a periodic snapshot without subscribing to
        realtime transitions.

        First fire happens at the next daily 7am UTC cron after
        registration. Daily watches re-fire roughly every 24 hours;
        weekly watches re-fire roughly every 7 days. A small slack
        window (1h for daily, 12h for weekly) absorbs cron drift.

        Same delivery contract as ``create_watch``: HMAC-SHA256 signed
        POST to callback_url with X-TensorFeed-Signature and
        X-TensorFeed-Watch-Id headers. The fire payload's
        ``match.type`` is ``'digest'`` so consumers can route on it.

        Args:
            cadence: 'daily' or 'weekly'.
            callback_url: HTTPS URL to POST to on each fire.
            secret: Optional HMAC shared secret.
            fire_cap: Max fires before auto-disable (default 100).

        Returns:
            Same shape as ``create_watch``: dict with ``watch`` (full
            record) and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
            TensorFeedError: 400 on invalid cadence or callback URL
        """
        return self.create_watch(
            spec={"type": "digest", "cadence": cadence},
            callback_url=callback_url,
            secret=secret,
            fire_cap=fire_cap,
        )

    # ── Paid: provider deep-dive (Tier 1, 1 credit) ────────────────

    def provider_deepdive(self, provider: str) -> dict[str, Any]:
        """Everything about a provider in one paid call.

        Costs 1 credit. Returns the live status + status_page_url +
        components, all of the provider's models with pricing, tier,
        context window, capabilities, and benchmark scores joined in,
        recent news mentions, and agent-traffic attribution.

        Aggregation IS the value. Doing this from free endpoints would
        take 4 round-trips and a non-trivial join.

        Args:
            provider: Provider id or display name. Case-insensitive.
                Examples: "anthropic", "OpenAI", "google".

        Returns:
            Dict with ``provider``, ``status``, ``models`` (sorted
            flagship-first), ``recent_news`` (top 8), ``recent_news_count``,
            ``agent_traffic_24h``, ``data_freshness``, ``notes``, and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
            TensorFeedError: 404 with available_providers if the
                provider name does not match any known provider
        """
        self._require_token("provider_deepdive")
        return self._request(
            "GET", f"/premium/providers/{provider}", require_token=True,
        )

    # ── Paid: compare models (Tier 1, 1 credit) ────────────────────

    def compare_models(self, *, ids: list[str] | str) -> dict[str, Any]:
        """Side-by-side comparison of 2-5 AI models.

        Costs 1 credit. Returns each model's pricing, benchmarks
        (normalized to a union of keys with null for missing scores),
        provider-level live status, capabilities, context window, and
        recent news mentions. Plus three rankings: cheapest blended,
        most context, and a per-benchmark leaderboard.

        Args:
            ids: 2-5 model ids or display names. Pass a list or a
                comma-separated string.

        Returns:
            Dict with ``models`` (list of matched/unmatched entries),
            ``benchmark_keys`` (union of all benchmark keys present),
            ``rankings`` (cheapest_blended, most_context, by_benchmark),
            ``data_freshness``, and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
            TensorFeedError: 400 on validation failure (< 2 or > 5 models)
        """
        self._require_token("compare_models")
        ids_csv = ",".join(ids) if isinstance(ids, list) else str(ids)
        return self._request(
            "GET", "/premium/compare/models",
            params={"ids": ids_csv},
            require_token=True,
        )

    # ── Paid: whats-new summary (Tier 1, 1 credit) ─────────────────

    def whats_new(
        self,
        *,
        days: int | None = None,
        news_limit: int | None = None,
    ) -> dict[str, Any]:
        """Agent morning brief: pricing changes, incidents, and top news.

        Costs 1 credit. The endpoint to call when an agent boots up.
        Returns a curated summary across pricing changes (input/output
        deltas), new and removed models, status incidents that started
        or resolved in the window, current operational counts, and the
        top news headlines from the period.

        Args:
            days: Window length in days, 1-7 (default 1).
            news_limit: Max news headlines (1-25, default 10).

        Returns:
            Dict with ``window``, ``summary`` (counts), ``pricing``
            (changes/new_models/removed_models), ``status``
            (incidents, current state counts), ``news``, ``data_freshness``,
            ``notes``, and ``billing``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("whats_new")
        params: dict[str, Any] = {}
        if days is not None:
            params["days"] = days
        if news_limit is not None:
            params["news_limit"] = news_limit
        return self._request(
            "GET", "/premium/whats-new", params=params, require_token=True,
        )

    # ── Free: MCP server registry telemetry ─────────────────────────

    def get_mcp_registry_snapshot(self) -> dict[str, Any]:
        """Today's summary of the official MCP server registry.

        Free, no auth. Returns total servers, by-status breakdown, top
        namespaces, and 1-day deltas (newly added, reactivated, deprecated).
        Captured daily at 9:30 AM UTC from registry.modelcontextprotocol.io.

        Returns:
            Dict with ``ok`` and ``summary`` keys. The ``summary`` includes
            ``date``, ``total_servers``, ``by_status``, ``top_namespaces``,
            ``new_today``, and ``delta_vs_yesterday``.
        """
        return self._request("GET", "/mcp/registry/snapshot")

    # ── Free: AI papers, citation-ranked (Semantic Scholar) ─────────

    def get_papers_ai_trending(self) -> dict[str, Any]:
        """Daily curated AI/ML research papers ranked by citation count.

        Free, no auth. Five fan-out queries against the Semantic Scholar
        Graph API (large language model, transformer, RLHF, AI agents,
        diffusion model), deduped by paperId, top 30 returned. Refreshed
        daily at 11:00 UTC.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. The ``snapshot``
            includes ``date``, ``capturedAt``, ``total_papers``,
            ``papers`` (each with title, abstract, authors, year,
            venue, citationCount, arxivId, doi, fieldsOfStudy), and
            ``summary`` (by_year, top_venues, top_authors).
        """
        return self._request("GET", "/papers/ai-trending")

    # ── Free: arXiv recent submissions ──────────────────────────────

    def get_papers_arxiv_recent(self) -> dict[str, Any]:
        """Most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV.

        Free, no auth. Single Atom API call to arXiv, deduped by arxivId,
        top 50 by submission date. The firehose pair to
        ``get_papers_ai_trending``: this shows what just dropped,
        ``ai_trending`` ranks the field by citation count. Refreshed
        daily at 11:30 UTC.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. Each paper has
            ``arxivId``, ``version``, ``title``, ``abstract``,
            ``authors``, ``primaryCategory``, ``categories``,
            ``publishedAt``, ``updatedAt``, ``htmlUrl``, ``pdfUrl``,
            and ``doi`` (when present).
        """
        return self._request("GET", "/papers/arxiv-recent")

    # ── Free: Hugging Face top-downloaded ───────────────────────────

    def get_hf_trending(self) -> dict[str, Any]:
        """Top Hugging Face models, datasets, and Spaces.

        Free, no auth. Snapshotted daily at 12:00 UTC against the public
        HF API. Three sections in one response:
          - ``models``: top 30 by downloads
          - ``datasets``: top 30 by downloads
          - ``spaces``: top 30 by likes (the right signal for hosted
            apps; downloads is meaningless for Spaces)

        Once enough daily snapshots accumulate, day-over-day deltas
        become a real trending signal computed over the dated keys.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. Snapshot includes
            ``models`` (each entry: id, downloads, likes, pipeline_tag,
            tags, lastModified, private, gated), ``datasets`` (same
            shape minus pipeline_tag), ``spaces`` (id, author, sdk,
            likes, tags, lastModified, private, runtime_stage, hardware),
            and ``summary`` (top_pipeline_tags, top_namespaces,
            top_space_sdks).
        """
        return self._request("GET", "/hf/trending")

    # ── Free: Hot GitHub issues across AI repos ─────────────────────

    def get_openrouter_models(self) -> dict[str, Any]:
        """Cross-provider AI model catalog from OpenRouter.

        Free, no auth. Daily snapshot of every model OpenRouter routes
        to (200+), normalized with comparable per-token pricing
        (prompt / completion / image / request), context window,
        modality, top provider metadata (max_completion_tokens,
        moderation flag), and supported_parameters. Pairs with
        ``client.models()`` (TensorFeed's curated frontier-lab catalog)
        by adding the long tail of OSS models on cloud inference.
        Refreshed daily at 14:00 UTC.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. Snapshot includes
            ``date``, ``capturedAt``, ``total_models``, ``models``
            (each entry: id, name, description, created, context_length,
            modality, instruct_type, tokenizer, pricing, top_provider,
            supported_parameters), and ``summary`` (by_namespace,
            by_modality, cheapest_input, cheapest_output, largest_context,
            free_tier_count).
        """
        return self._request("GET", "/openrouter/models")

    def get_reddit_trending(self) -> dict[str, Any]:
        """Currently-hot Reddit threads in 7 AI-relevant subreddits.

        Free, no auth. Subreddits queried: LocalLLaMA, MachineLearning,
        ClaudeAI, OpenAI, singularity, artificial, AI_Agents. Pulls each
        subreddit's "hot" listing, dedups by post id, drops stickied and
        NSFW posts, ranks by score, top 30. Refreshed daily at 13:00 UTC.
        Companion to ``get_hot_issues()``: that surfaces developer-side
        conversation on GitHub, this surfaces community-side conversation
        on Reddit.

        Titles pass through TensorFeed's prompt-injection sanitization at
        capture time, so role-confusion tokens and bidi/zero-width
        spoofing characters in Reddit posts cannot reach an agent.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. Snapshot includes
            ``date``, ``capturedAt``, ``total_posts``, ``subreddits_queried``,
            ``posts`` (each with id, subreddit, title, author, score,
            upvote_ratio, num_comments, permalink, url, created_utc,
            flair, is_self, is_video), and ``summary`` (by_subreddit,
            top_authors).
        """
        return self._request("GET", "/reddit/trending")

    def get_hot_issues(self) -> dict[str, Any]:
        """Currently-hot GitHub issues across the AI ecosystem.

        Free, no auth. Five fan-out searches on AI-relevant topics
        (llm, ai-agents, large-language-models, machine-learning,
        transformer) for is:issue is:open archived:false comments>=10
        updated within the last 7 days. Deduped by URL, ranked by
        comment count, top 30. Refreshed daily at 12:30 UTC. Companion
        to /api/trending-repos: that one shows which AI repos are gaining
        stars; this one shows where the active conversations are.

        Returns:
            Dict with ``ok`` and ``snapshot`` keys. Snapshot includes
            ``date``, ``capturedAt``, ``total_issues``, ``topics_queried``,
            ``recent_window_days``, ``comments_threshold``, and ``issues``
            (each with url, repo, number, title, author, state, comments,
            reactions_total, labels, created_at, updated_at, matched_topic),
            plus ``summary`` (by_topic, top_repos).
        """
        return self._request("GET", "/issues/hot")

    # ── Free: LLM endpoint probing (last 24h) ───────────────────────

    def get_probe_latest(self) -> dict[str, Any]:
        """Last 24 hours of measured LLM endpoint latency and availability.

        Free, no auth. TensorFeed pings each major LLM provider's chat
        completion endpoint every 15 min and records ttfb / total time /
        HTTP status. Returns per-provider aggregates (count, ok_pct,
        ttfb p50/p95/p99, total p50/p95/p99, status code distribution,
        last error). Data is unique because we measure it (not
        self-reported by providers).

        Returns:
            Dict with ``ok`` and ``summary`` keys. The ``summary`` includes
            ``computed_at``, ``window_label``, and ``providers`` (list of
            per-provider aggregates).
        """
        return self._request("GET", "/probe/latest")

    # ── Paid: LLM probe time series (Tier 1, 1 credit) ─────────────

    def get_probe_series(
        self,
        *,
        provider: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Daily SLA series for one LLM provider, measured by TensorFeed.

        Costs 1 credit. Returns per-day count, success rate, ttfb
        p50/p95/p99, total p50/p95/p99, incident-hour count for each
        day in the requested window. Provider status pages are
        politically managed; this is the measured truth.

        Args:
            provider: One of "anthropic", "openai", "google", "mistral",
                "cohere".
            from_date: Inclusive start YYYY-MM-DD. Defaults to 30 days
                before ``to_date``.
            to_date: Inclusive end YYYY-MM-DD. Defaults to today UTC.

        Returns:
            Dict with ``provider``, ``from``, ``to``, ``days``, ``points``
            (per-day datapoints with ``has_data`` flag), ``summary``
            (overall uptime, days with data, days with incidents).

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("get_probe_series")
        params: dict[str, Any] = {"provider": provider}
        if from_date is not None:
            params["from"] = from_date
        if to_date is not None:
            params["to"] = to_date
        return self._request(
            "GET", "/premium/probe/series", params=params, require_token=True,
        )

    # ── Paid: MCP registry time series (Tier 1, 1 credit) ──────────

    def get_mcp_registry_series(
        self,
        *,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Multi-day series of MCP registry growth and churn.

        Costs 1 credit. Returns per-day total servers, active count,
        daily added/removed for each day in the requested window. The
        registry itself is open data, but a 30/90-day trend requires
        daily capture started weeks before the question is asked.

        Args:
            from_date: Inclusive start date as YYYY-MM-DD. Defaults to
                30 days before ``to_date``.
            to_date: Inclusive end date as YYYY-MM-DD. Defaults to today UTC.

        Returns:
            Dict with ``from``, ``to``, ``days``, ``points`` (per-day
            datapoints with ``has_data`` flag), and ``delta_in_window``.

        Raises:
            ValueError: if no token is set on the client
            PaymentRequired: if the token has insufficient credits
        """
        self._require_token("get_mcp_registry_series")
        params: dict[str, Any] = {}
        if from_date is not None:
            params["from"] = from_date
        if to_date is not None:
            params["to"] = to_date
        return self._request(
            "GET", "/premium/mcp/registry/series", params=params, require_token=True,
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

