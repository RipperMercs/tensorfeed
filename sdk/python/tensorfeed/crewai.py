"""TensorFeed CrewAI integration.

Optional extra. Install with::

    pip install 'tensorfeed[crewai]'

Provides a set of CrewAI-compatible tools:
    * ``tensorfeed_news_tool()``      - latest AI news
    * ``tensorfeed_status_tool()``    - live AI service status
    * ``tensorfeed_attention_tool()`` - AI Attention Index
    * ``tensorfeed_harnesses_tool()`` - coding harness leaderboard
    * ``tensorfeed_routing_tool()``   - top model recommendation

Plus the paid catalog via ``tensorfeed_premium_tools()`` (1 credit per
call). Premium tools never move funds: called without a credit token
they return a clear guidance string instead of paying or raising.
Provisioning credits stays an explicit operator action.

Usage::

    from crewai import Agent
    from tensorfeed.crewai import tensorfeed_tools

    research_agent = Agent(
        role="AI ecosystem researcher",
        goal="Track frontier AI provider activity and surface signals.",
        backstory="Expert in real-time AI news and benchmarks.",
        tools=tensorfeed_tools(),
    )

This module imports ``crewai_tools`` lazily so the base ``tensorfeed``
install stays stdlib-only.
"""

from __future__ import annotations

import json
from typing import Any

from .client import TensorFeed
from ._premium_tools import DESCRIPTIONS, FORMATTERS, safe_call


def _require_crewai() -> Any:
    try:
        from crewai.tools import BaseTool
    except ImportError:
        try:
            from crewai_tools import BaseTool  # type: ignore[no-redef]
        except ImportError as e:  # pragma: no cover
            raise ImportError(
                "crewai is required for tensorfeed.crewai. "
                "Install with: pip install 'tensorfeed[crewai]'"
            ) from e
    return BaseTool


def _client(token: str | None) -> TensorFeed:
    return TensorFeed(token=token, user_agent="TensorFeed-CrewAI/1.0")


def tensorfeed_news_tool(token: str | None = None) -> Any:
    BaseTool = _require_crewai()

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = "TensorFeed News"
        description: str = (
            "Get the latest AI news from TensorFeed (15+ aggregated sources, "
            "updated every 10 minutes). Optional inputs: 'category' (research, "
            "tools, anthropic, openai, etc) and 'limit' (default 20)."
        )

        def _run(self, category: str | None = None, limit: int = 20) -> str:
            result = _client(token).news(category=category, limit=limit)
            items = result.get("articles", [])
            return "\n".join(
                f"- {a.get('title', '')} ({a.get('source', '')}): {a.get('snippet', '')}"
                for a in items[:limit]
            ) or "No articles."

    return _Tool()


def tensorfeed_status_tool(token: str | None = None) -> Any:
    BaseTool = _require_crewai()

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = "TensorFeed Status"
        description: str = (
            "Get the live operational status of major AI services. "
            "No inputs. Returns service-by-service status."
        )

        def _run(self) -> str:
            result = _client(token).status()
            return "\n".join(
                f"- {s.get('name', '')}: {s.get('status', 'unknown')}"
                for s in result.get("services", [])
            )

    return _Tool()


def tensorfeed_attention_tool(token: str | None = None) -> Any:
    BaseTool = _require_crewai()

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = "TensorFeed AI Attention Index"
        description: str = (
            "Get the live AI Attention Index ranking AI providers by news volume, "
            "GitHub trending repos, and agent traffic. Score 0-100. "
            "Useful for sensing which providers are dominating the conversation."
        )

        def _run(self) -> str:
            result = _client(token).attention()
            rows = result.get("providers", [])[:10]
            return "\n".join(
                f"#{p['rank']:>2} {p['name']:<14} {p['attention_score']:>5.1f}  "
                f"({p['news_24h']} news/24h, {p['trending_repos']} trending repos)"
                for p in rows
            )

    return _Tool()


def tensorfeed_harnesses_tool(token: str | None = None) -> Any:
    BaseTool = _require_crewai()

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = "TensorFeed Coding Harness Leaderboard"
        description: str = (
            "Get the cross-harness coding agent leaderboard. Optional input "
            "'benchmark' (one of: swe_bench_verified, terminal_bench, "
            "aider_polyglot, swe_lancer; default swe_bench_verified)."
        )

        def _run(self, benchmark: str = "swe_bench_verified") -> str:
            result = _client(token).harnesses()
            rows = [
                r
                for r in result.get("results", [])
                if isinstance(r.get("scores", {}).get(benchmark), (int, float))
            ]
            rows.sort(key=lambda r: r["scores"][benchmark], reverse=True)
            return "\n".join(
                f"  {r['scores'][benchmark]:>5.1f}  {r['harness']:<18} on {r['model']}"
                for r in rows[:15]
            )

    return _Tool()


def tensorfeed_routing_tool(token: str | None = None) -> Any:
    BaseTool = _require_crewai()

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = "TensorFeed Routing Preview"
        description: str = (
            "Get the top-1 recommended AI model for a task. "
            "Input: 'task' (one of: code, reasoning, creative, general; default general)."
        )

        def _run(self, task: str = "general") -> str:
            result = _client(token).routing_preview(task=task)
            rec = result.get("recommendation") or {}
            return json.dumps(rec, indent=2) if rec else "No recommendation."

    return _Tool()


def tensorfeed_tools(
    token: str | None = None,
    *,
    include_premium: bool = False,
) -> list[Any]:
    """Convenience: the TensorFeed CrewAI tool list.

    Returns the five free tools by default. Pass
    ``include_premium=True`` to also attach the paid catalog (1 credit
    per call). Premium tools are safe to attach without a token: called
    with no credits they return guidance instead of paying or raising.
    """
    tools = [
        tensorfeed_news_tool(token),
        tensorfeed_status_tool(token),
        tensorfeed_attention_tool(token),
        tensorfeed_harnesses_tool(token),
        tensorfeed_routing_tool(token),
    ]
    if include_premium:
        tools.extend(tensorfeed_premium_tools(token))
    return tools


# ── Premium tools (paid, 1 credit each, never auto-pay) ───────────────
#
# Each is a thin CrewAI BaseTool whose _run routes through the shared
# safe_call, so the payment posture and formatting match the LangChain
# binding exactly and are tested once in test_premium_tools.py.


def _premium_tool(token: str | None, tool_name: str, runner) -> Any:
    BaseTool = _require_crewai()
    fmt = FORMATTERS[tool_name]

    class _Tool(BaseTool):  # type: ignore[misc, valid-type]
        name: str = tool_name
        description: str = DESCRIPTIONS[tool_name]

        def _run(self, **kwargs: Any) -> str:
            return safe_call(lambda: runner(_client(token), kwargs), fmt)

    return _Tool()


def tensorfeed_whats_new_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_whats_new",
        lambda c, kw: c.whats_new(
            days=kw.get("days", 1), news_limit=kw.get("news_limit", 10)
        ),
    )


def tensorfeed_routing_full_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_routing",
        lambda c, kw: c.routing(
            task=kw.get("task", "general"),
            budget=kw.get("budget"),
            top_n=kw.get("top_n", 5),
        ),
    )


def tensorfeed_compare_models_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_compare_models",
        lambda c, kw: c.compare_models(ids=kw.get("ids", "")),
    )


def tensorfeed_cost_projection_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_cost_projection",
        lambda c, kw: c.cost_projection(
            models=kw.get("models", ""),
            input_tokens_per_day=kw.get("input_tokens_per_day", 0),
            output_tokens_per_day=kw.get("output_tokens_per_day", 0),
            horizon=kw.get("horizon"),
        ),
    )


def tensorfeed_news_search_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_news_search",
        lambda c, kw: c.news_search(
            q=kw.get("q"),
            from_date=kw.get("from_date"),
            to_date=kw.get("to_date"),
            provider=kw.get("provider"),
            category=kw.get("category"),
            limit=kw.get("limit", 25),
        ),
    )


def tensorfeed_provider_deepdive_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_provider_deepdive",
        lambda c, kw: c.provider_deepdive(kw.get("provider", "")),
    )


def tensorfeed_status_leaderboard_tool(token: str | None = None) -> Any:
    return _premium_tool(
        token,
        "tensorfeed_status_leaderboard",
        lambda c, kw: c.status_leaderboard(
            from_date=kw.get("from_date"), to_date=kw.get("to_date")
        ),
    )


def tensorfeed_premium_tools(token: str | None = None) -> list[Any]:
    """The paid TensorFeed CrewAI tool catalog (1 credit per call).

    Safe to attach without a token: each tool returns actionable
    guidance instead of paying or raising when no credits are
    available. None of these tools move funds.
    """
    return [
        tensorfeed_whats_new_tool(token),
        tensorfeed_routing_full_tool(token),
        tensorfeed_compare_models_tool(token),
        tensorfeed_cost_projection_tool(token),
        tensorfeed_news_search_tool(token),
        tensorfeed_provider_deepdive_tool(token),
        tensorfeed_status_leaderboard_tool(token),
    ]
