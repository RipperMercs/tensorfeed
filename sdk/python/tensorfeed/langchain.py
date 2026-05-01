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
    * ``tensorfeed_tools()``    - convenience: returns the full tool list

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


def tensorfeed_tools(token: str | None = None) -> list[Any]:
    """Convenience: returns all TensorFeed LangChain tools."""
    return [
        TensorFeedNewsTool(token),
        TensorFeedStatusTool(token),
        TensorFeedRoutingTool(token),
        TensorFeedAttentionTool(token),
        TensorFeedHarnessesTool(token),
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
