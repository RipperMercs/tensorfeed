"""TensorFeed LangChain integration.

Optional extra. Install with::

    pip install 'tensorfeed[langchain]'

Provides:
    * ``TensorFeedNewsTool``    - LangChain tool wrapping ``/api/news``
    * ``TensorFeedStatusTool``  - tool wrapping ``/api/status``
    * ``TensorFeedRoutingTool`` - tool wrapping the free ``/api/preview/routing``
    * ``TensorFeedAttentionTool`` - tool wrapping ``/api/attention``
    * ``TensorFeedHarnessesTool`` - tool wrapping ``/api/harnesses``
    * ``TensorFeedNewsLoader``  - LangChain document loader for news articles
    * ``tensorfeed_tools()``    - convenience: free tools, optionally premium
    * ``tensorfeed_premium_tools()`` - the paid catalog (1 credit each)

The premium tools never move funds. Called without a credit token they
return a clear guidance string instead of paying or raising. Provisioning
credits stays an explicit operator action; see ``_premium_tools``.

Usage::

    from langchain_openai import ChatOpenAI
    from langgraph.prebuilt import create_react_agent
    from tensorfeed.langchain import tensorfeed_tools

    agent = create_react_agent(ChatOpenAI(model="gpt-5.5"), tensorfeed_tools())
    agent.invoke({"messages": [("user", "What is happening with Anthropic today?")]})

This module imports ``langchain_core`` lazily so the base ``tensorfeed``
install stays stdlib-only.
"""

from __future__ import annotations

import json
from typing import Any

from .client import TensorFeed
from ._premium_tools import DESCRIPTIONS, FORMATTERS, safe_call


def _require_langchain() -> tuple[Any, Any]:
    try:
        from langchain_core.tools import StructuredTool
        from langchain_core.documents import Document
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "langchain_core is required for tensorfeed.langchain. "
            "Install with: pip install 'tensorfeed[langchain]'"
        ) from e
    return StructuredTool, Document


def _client(token: str | None) -> TensorFeed:
    return TensorFeed(token=token, user_agent="TensorFeed-LangChain/1.0")


# ── Tools ─────────────────────────────────────────────────────────


def TensorFeedNewsTool(token: str | None = None):
    """LangChain tool returning the latest AI news from /api/news."""
    StructuredTool, _ = _require_langchain()

    def _news(category: str | None = None, limit: int = 20) -> str:
        result = _client(token).news(category=category, limit=limit)
        items = result.get("articles", [])
        lines = []
        for a in items[:limit]:
            lines.append(
                f"- {a.get('title', '')} ({a.get('source', '')}, {a.get('publishedAt', '')}): {a.get('snippet', '')}"
            )
        return "\n".join(lines) if lines else "No articles."

    return StructuredTool.from_function(
        func=_news,
        name="tensorfeed_news",
        description=(
            "Get the latest AI news headlines and snippets from TensorFeed. "
            "Aggregated from 15+ sources, updated every 10 minutes. "
            "Optional `category` filter (research, tools, anthropic, openai, etc). "
            "Default limit 20, max 100."
        ),
    )


def TensorFeedStatusTool(token: str | None = None):
    """LangChain tool returning live AI service status from /api/status."""
    StructuredTool, _ = _require_langchain()

    def _status() -> str:
        result = _client(token).status()
        services = result.get("services", [])
        lines = []
        for s in services:
            name = s.get("name", "")
            status = s.get("status", "unknown")
            lines.append(f"- {name}: {status}")
        return "\n".join(lines) if lines else "No status data."

    return StructuredTool.from_function(
        func=_status,
        name="tensorfeed_status",
        description=(
            "Get the real-time operational status of major AI services "
            "(Claude, ChatGPT, Gemini, Mistral, Cohere, Replicate, Hugging Face). "
            "Polled every 5 minutes. Status: operational, degraded, down, or unknown."
        ),
    )


def TensorFeedRoutingTool(token: str | None = None):
    """LangChain tool returning the free top-1 model routing recommendation."""
    StructuredTool, _ = _require_langchain()

    def _routing(task: str = "general") -> str:
        result = _client(token).routing_preview(task=task)
        rec = result.get("recommendation") or {}
        if not rec:
            return "No routing recommendation available."
        return json.dumps(
            {
                "task": task,
                "model": rec.get("model"),
                "provider": rec.get("provider"),
                "blended_price": rec.get("blendedPrice"),
                "score": rec.get("score"),
            },
            indent=2,
        )

    return StructuredTool.from_function(
        func=_routing,
        name="tensorfeed_routing_preview",
        description=(
            "Get the top-1 recommended AI model for a given task. "
            "Task can be 'code', 'reasoning', 'creative', or 'general'. "
            "Free preview tier; for the full ranked list with score breakdown "
            "use the paid /api/premium/routing endpoint."
        ),
    )


def TensorFeedAttentionTool(token: str | None = None):
    """LangChain tool returning the live AI Attention Index."""
    StructuredTool, _ = _require_langchain()

    def _attention() -> str:
        result = _client(token).attention()
        rows = result.get("providers", [])[:10]
        lines = ["AI Attention Index (live):"]
        for p in rows:
            lines.append(
                f"  #{p['rank']:>2} {p['name']:<14} {p['attention_score']:>5.1f}  "
                f"({p['news_24h']} news/24h, {p['trending_repos']} trending repos)"
            )
        return "\n".join(lines)

    return StructuredTool.from_function(
        func=_attention,
        name="tensorfeed_attention",
        description=(
            "Get the live AI Attention Index ranking AI providers by news volume, "
            "GitHub trending repos, and inbound agent traffic. Score is 0-100, "
            "normalized within each response. Updates every 5 minutes."
        ),
    )


def TensorFeedHarnessesTool(token: str | None = None):
    """LangChain tool returning the cross-harness coding agent leaderboard."""
    StructuredTool, _ = _require_langchain()

    def _harnesses(benchmark: str = "swe_bench_verified") -> str:
        result = _client(token).harnesses()
        rows = [
            r
            for r in result.get("results", [])
            if isinstance(r.get("scores", {}).get(benchmark), (int, float))
        ]
        rows.sort(key=lambda r: r["scores"][benchmark], reverse=True)
        lines = [f"Coding harness leaderboard ({benchmark}):"]
        for r in rows[:15]:
            lines.append(
                f"  {r['scores'][benchmark]:>5.1f}  {r['harness']:<18} on {r['model']}"
            )
        return "\n".join(lines)

    return StructuredTool.from_function(
        func=_harnesses,
        name="tensorfeed_harnesses",
        description=(
            "Get the cross-harness coding agent leaderboard. "
            "Compares Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, "
            "Devin, Cline, Windsurf, Amp, Continue, Roo Code on agentic benchmarks. "
            "Pass `benchmark` as one of: swe_bench_verified (default), terminal_bench, "
            "aider_polyglot, swe_lancer."
        ),
    )


def tensorfeed_tools(
    token: str | None = None,
    *,
    include_premium: bool = False,
) -> list[Any]:
    """Convenience: the TensorFeed LangChain tools.

    Returns the five free tools by default. Pass
    ``include_premium=True`` to also attach the paid catalog (1 credit
    per call). The premium tools are safe to attach even without a
    token: called with no credits they return guidance instead of
    paying or raising, so an agent can still reason about them.

    Args:
        token: Optional bearer token for premium calls. Free tools
            ignore it.
        include_premium: Append the premium tools as well.
    """
    tools = [
        TensorFeedNewsTool(token),
        TensorFeedStatusTool(token),
        TensorFeedRoutingTool(token),
        TensorFeedAttentionTool(token),
        TensorFeedHarnessesTool(token),
    ]
    if include_premium:
        tools.extend(tensorfeed_premium_tools(token))
    return tools


# ── Premium tools (paid, 1 credit each, never auto-pay) ───────────────
#
# Each tool has an explicit typed signature so LangChain builds a clean
# argument schema for the model. The call is routed through the shared
# ``safe_call`` so the payment posture and result formatting are
# identical to the CrewAI binding and tested once.


def _premium_structured_tool(name: str, fn):
    StructuredTool, _ = _require_langchain()
    return StructuredTool.from_function(
        func=fn, name=name, description=DESCRIPTIONS[name]
    )


def TensorFeedWhatsNewTool(token: str | None = None):
    """Paid agent boot brief. 1 credit. Will not auto-pay."""

    def _whats_new(days: int = 1, news_limit: int = 10) -> str:
        return safe_call(
            lambda: _client(token).whats_new(days=days, news_limit=news_limit),
            FORMATTERS["tensorfeed_whats_new"],
        )

    return _premium_structured_tool("tensorfeed_whats_new", _whats_new)


def TensorFeedRoutingFullTool(token: str | None = None):
    """Paid full ranked routing. 1 credit. Will not auto-pay."""

    def _routing(
        task: str = "general",
        budget: float | None = None,
        top_n: int = 5,
    ) -> str:
        return safe_call(
            lambda: _client(token).routing(task=task, budget=budget, top_n=top_n),
            FORMATTERS["tensorfeed_routing"],
        )

    return _premium_structured_tool("tensorfeed_routing", _routing)


def TensorFeedCompareModelsTool(token: str | None = None):
    """Paid 2-5 model comparison. 1 credit. Will not auto-pay."""

    def _compare(ids: str) -> str:
        return safe_call(
            lambda: _client(token).compare_models(ids=ids),
            FORMATTERS["tensorfeed_compare_models"],
        )

    return _premium_structured_tool("tensorfeed_compare_models", _compare)


def TensorFeedCostProjectionTool(token: str | None = None):
    """Paid workload cost projection. 1 credit. Will not auto-pay."""

    def _cost(
        models: str,
        input_tokens_per_day: float,
        output_tokens_per_day: float,
        horizon: str | None = None,
    ) -> str:
        return safe_call(
            lambda: _client(token).cost_projection(
                models=models,
                input_tokens_per_day=input_tokens_per_day,
                output_tokens_per_day=output_tokens_per_day,
                horizon=horizon,
            ),
            FORMATTERS["tensorfeed_cost_projection"],
        )

    return _premium_structured_tool("tensorfeed_cost_projection", _cost)


def TensorFeedNewsSearchTool(token: str | None = None):
    """Paid full-text news search. 1 credit. Will not auto-pay."""

    def _search(
        q: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        provider: str | None = None,
        category: str | None = None,
        limit: int = 25,
    ) -> str:
        return safe_call(
            lambda: _client(token).news_search(
                q=q,
                from_date=from_date,
                to_date=to_date,
                provider=provider,
                category=category,
                limit=limit,
            ),
            FORMATTERS["tensorfeed_news_search"],
        )

    return _premium_structured_tool("tensorfeed_news_search", _search)


def TensorFeedProviderDeepDiveTool(token: str | None = None):
    """Paid one-call provider profile. 1 credit. Will not auto-pay."""

    def _deepdive(provider: str) -> str:
        return safe_call(
            lambda: _client(token).provider_deepdive(provider),
            FORMATTERS["tensorfeed_provider_deepdive"],
        )

    return _premium_structured_tool("tensorfeed_provider_deepdive", _deepdive)


def TensorFeedStatusLeaderboardTool(token: str | None = None):
    """Paid 90-day uptime leaderboard. 1 credit. Will not auto-pay."""

    def _leaderboard(
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> str:
        return safe_call(
            lambda: _client(token).status_leaderboard(
                from_date=from_date, to_date=to_date
            ),
            FORMATTERS["tensorfeed_status_leaderboard"],
        )

    return _premium_structured_tool("tensorfeed_status_leaderboard", _leaderboard)


def tensorfeed_premium_tools(token: str | None = None) -> list[Any]:
    """The paid TensorFeed tool catalog (1 credit per call).

    Safe to attach without a token: each tool returns actionable
    guidance instead of paying or raising when no credits are
    available. None of these tools move funds.
    """
    return [
        TensorFeedWhatsNewTool(token),
        TensorFeedRoutingFullTool(token),
        TensorFeedCompareModelsTool(token),
        TensorFeedCostProjectionTool(token),
        TensorFeedNewsSearchTool(token),
        TensorFeedProviderDeepDiveTool(token),
        TensorFeedStatusLeaderboardTool(token),
    ]


# ── Document loader ───────────────────────────────────────────────


class TensorFeedNewsLoader:
    """LangChain document loader for TensorFeed news articles.

    Each article becomes a ``Document`` with ``page_content`` set to
    title + snippet, and metadata covering source, URL, categories,
    and publishedAt. Useful for RAG over recent AI news.

    Usage::

        from tensorfeed.langchain import TensorFeedNewsLoader

        docs = TensorFeedNewsLoader(category="research", limit=50).load()
    """

    def __init__(
        self,
        category: str | None = None,
        limit: int = 50,
        token: str | None = None,
    ) -> None:
        self.category = category
        self.limit = limit
        self.token = token

    def load(self) -> list[Any]:
        _, Document = _require_langchain()
        result = _client(self.token).news(category=self.category, limit=self.limit)
        docs = []
        for a in result.get("articles", []):
            docs.append(
                Document(
                    page_content=f"{a.get('title', '')}\n\n{a.get('snippet', '')}",
                    metadata={
                        "source": a.get("source", ""),
                        "source_domain": a.get("sourceDomain", ""),
                        "url": a.get("url", ""),
                        "published_at": a.get("publishedAt", ""),
                        "categories": a.get("categories", []),
                        "id": a.get("id", ""),
                    },
                )
            )
        return docs

    def lazy_load(self):
        for doc in self.load():
            yield doc
