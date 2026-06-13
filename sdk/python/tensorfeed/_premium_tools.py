"""Shared premium-tool plumbing for the framework adapters.

Internal module. Powers ``tensorfeed.langchain.tensorfeed_premium_tools()``
and ``tensorfeed.crewai.tensorfeed_premium_tools()``. It is framework
agnostic: it owns the canonical tool descriptions, the result
formatters, and the one piece of behavior that must never drift between
frameworks, the payment posture.

Payment posture (load-bearing, do not weaken):

  These tools never move funds. A premium call made without a valid
  token returns a clear, actionable guidance string explaining how an
  operator provisions credits out of band. The tool does not, and will
  not, initiate a USDC transfer on its own. Autonomous payment from
  inside a tool call is a deliberate non-feature: credit purchases stay
  an explicit, per-action operator decision. Centralizing this here (and
  testing it once) keeps every framework binding honest.

Each adapter writes its own thin, explicitly typed function or tool
class so the framework gets a good argument schema for the model, then
routes the call through ``safe_call`` with the shared formatter. The
descriptions are shared verbatim so LangChain and CrewAI surface
identical copy to the agent.
"""

from __future__ import annotations

from typing import Any, Callable

from .client import PaymentRequired, RateLimited, TensorFeedError


# The exact, actionable message an agent sees when a premium tool is
# called without spendable credits. It tells the model what is true
# (this needs credits), what will not happen (no automatic payment),
# and what the path is (an operator provisions a token out of band).
PREMIUM_PAYMENT_GUIDANCE = (
    "This is a paid TensorFeed endpoint (1 credit) and no spendable "
    "credit token is available. This tool will not buy credits or move "
    "any funds on its own, by design. To enable it, an operator must "
    "provision credits out of band (buy_credits() then confirm() with a "
    "USDC payment on Base, or the documented x402 flow) and pass the "
    "resulting token when constructing the tools, for example "
    "tensorfeed_premium_tools(token='...'). Until then, prefer the free "
    "TensorFeed tools (news, status, attention, harnesses, routing "
    "preview) for this question."
)


def _billing_line(result: dict[str, Any]) -> str:
    """One-line cost footer if the response carries billing metadata."""
    billing = result.get("billing")
    if not isinstance(billing, dict):
        return ""
    charged = billing.get("credits_charged")
    remaining = billing.get("balance")
    bits = []
    if charged is not None:
        bits.append(f"{charged} credit(s) charged")
    if remaining is not None:
        bits.append(f"{remaining} remaining")
    return f"\n[{', '.join(bits)}]" if bits else ""


def safe_call(
    invoke: Callable[[], dict[str, Any]],
    formatter: Callable[[dict[str, Any]], str],
) -> str:
    """Run a premium client call and return agent-readable text.

    Never raises for the expected money and quota cases. A raised
    exception inside an agent tool call usually aborts the agent or
    produces an opaque trace; a structured guidance string lets the
    model reason about what to do next (typically: tell the user it
    needs credits, or fall back to a free tool).

      * no token / token rejected (402): the payment guidance string
      * rate limited (429): a short back-off message
      * other API error: a concise one-line error
      * success: the tool's own formatter output

    The PaymentRequired and missing-token paths are exactly where an
    autonomous-payment bug would hide. There is intentionally no code
    path here that touches the wallet or the web3 signer.
    """
    try:
        result = invoke()
    except PaymentRequired as e:
        hint = ""
        payload = getattr(e, "payload", None)
        if isinstance(payload, dict):
            need = payload.get("credits_required")
            if need is not None:
                hint = f" (endpoint requires {need} credit(s))"
        return PREMIUM_PAYMENT_GUIDANCE + hint
    except ValueError:
        # client raises ValueError when no token is set on the client
        return PREMIUM_PAYMENT_GUIDANCE
    except RateLimited:
        return (
            "TensorFeed rate limit hit. Wait and retry, or reduce call "
            "frequency. Free public endpoints allow 120 requests/minute "
            "per IP; bearer tokens are exempt."
        )
    except TensorFeedError as e:
        return f"TensorFeed API error {e.status_code}: {e}"
    try:
        return formatter(result) + _billing_line(result)
    except Exception:  # defensive: a shape change must not break the agent
        return (
            "TensorFeed returned a response in an unexpected shape. Raw "
            f"top-level keys: {sorted(result) if isinstance(result, dict) else type(result).__name__}."
        )


# ── Shared descriptions (identical copy across frameworks) ─────────────
#
# Every description states the credit cost up front so the model can
# weigh it before calling, and what the tool is uniquely good for so it
# is picked for the right question.

DESCRIPTIONS: dict[str, str] = {
    "tensorfeed_whats_new": (
        "PAID, 1 credit. The agent boot brief: a single curated summary "
        "of AI model pricing changes, new and removed models, service "
        "incidents that started or resolved, current operational counts, "
        "and the top news headlines, over the last 1 to 7 days. Call "
        "this once at startup instead of polling many free endpoints. "
        "Inputs: days (1-7, default 1), news_limit (1-25, default 10)."
    ),
    "tensorfeed_routing": (
        "PAID, 1 credit. Full ranked model routing: the top-N AI models "
        "for a task with a complete score breakdown (quality, "
        "availability, cost, latency). Use this when the free top-1 "
        "preview is not enough. Inputs: task (code|reasoning|creative|"
        "general), budget (optional max blended USD per 1M tokens), "
        "top_n (1-10, default 5)."
    ),
    "tensorfeed_compare_models": (
        "PAID, 1 credit. Side-by-side comparison of 2 to 5 AI models: "
        "pricing, normalized benchmarks, live provider status, context "
        "window, capabilities, recent news, plus rankings for cheapest "
        "blended and most context. Input: ids (comma-separated model "
        "ids or display names, 2 to 5)."
    ),
    "tensorfeed_cost_projection": (
        "PAID, 1 credit. Project the cost of a token-usage workload "
        "across 1 to 10 models over day, week, month, and year, with a "
        "cheapest-monthly ranking. Inputs: models (comma-separated), "
        "input_tokens_per_day, output_tokens_per_day, horizon (optional)."
    ),
    "tensorfeed_news_search": (
        "PAID, 1 credit. Full-text search over the TensorFeed AI news "
        "corpus with relevance scoring and a recency boost. Filter by "
        "query, date range, provider, and category. Use this instead of "
        "the free latest-news feed when you need to find specific "
        "coverage. Inputs: q, from_date, to_date, provider, category, "
        "limit (1-100, default 25)."
    ),
    "tensorfeed_provider_deepdive": (
        "PAID, 5 credits. One AI provider's full profile in a single "
        "call: live status, every model with pricing and benchmarks "
        "joined in, recent news, and agent-traffic attribution. Doing "
        "this from free endpoints takes several round-trips and a "
        "non-trivial join. Input: provider (id or display name)."
    ),
    "tensorfeed_status_leaderboard": (
        "PAID, 5 credits. Cross-provider AI uptime leaderboard over the "
        "full 90-day retention window, with incident_count and "
        "mttr_minutes per provider. Built for vendor selection and "
        "post-incident review. Inputs: from_date, to_date (optional, "
        "default last 30 days)."
    ),
}

PREMIUM_TOOL_NAMES: list[str] = list(DESCRIPTIONS)


# ── Shared result formatters ───────────────────────────────────────────
#
# Compact, deterministic, defensive. They turn a response dict into a
# short text block an LLM can read. Lists are truncated. Missing keys
# degrade to a sane default rather than raising (safe_call also guards
# the formatter, this is belt and suspenders).


def format_whats_new(r: dict[str, Any]) -> str:
    w = r.get("window", {})
    s = r.get("summary", {})
    lines = [f"What's new ({w.get('days', '?')}d window):"]
    pricing = r.get("pricing", {}) or {}
    changed = pricing.get("changes", []) or []
    added = pricing.get("new_models", []) or []
    removed = pricing.get("removed_models", []) or []
    lines.append(
        f"  pricing: {len(changed)} changes, {len(added)} new, "
        f"{len(removed)} removed models"
    )
    for c in changed[:5]:
        lines.append(
            f"    {c.get('model', '?')} {c.get('field', '')}: "
            f"{c.get('from')} -> {c.get('to')}"
        )
    status = r.get("status", {}) or {}
    incidents = status.get("incidents", []) or []
    lines.append(f"  status: {len(incidents)} incident(s) in window")
    for i in incidents[:3]:
        lines.append(
            f"    {i.get('provider', '?')}: {i.get('state', i.get('status', ''))}"
        )
    news = r.get("news", []) or []
    lines.append(f"  news: {len(news)} headlines")
    for n in news[:5]:
        lines.append(f"    - {n.get('title', '')} ({n.get('source', '')})")
    if s:
        lines.append(f"  counts: {s}")
    return "\n".join(lines)


def format_routing(r: dict[str, Any]) -> str:
    recs = r.get("recommendations") or r.get("recommendation") or []
    if isinstance(recs, dict):
        recs = [recs]
    if not recs:
        return "No routing recommendation returned."
    lines = ["Model routing (ranked):"]
    for x in recs[:10]:
        model = x.get("model", {})
        name = model.get("name") if isinstance(model, dict) else model
        score = x.get("composite_score", x.get("score"))
        try:
            score_s = f"{float(score):.3f}"
        except (TypeError, ValueError):
            score_s = str(score)
        lines.append(
            f"  #{x.get('rank', '?')} {name}  score={score_s}"
            f"  provider={x.get('provider', model.get('provider') if isinstance(model, dict) else '')}"
        )
    return "\n".join(lines)


def format_compare_models(r: dict[str, Any]) -> str:
    models = r.get("models", []) or []
    lines = [f"Compared {len(models)} model(s):"]
    for m in models[:5]:
        if m.get("matched") is False:
            label = m.get("query") or m.get("name") or m.get("id") or "?"
            lines.append(f"  {label}: (no match)")
            continue
        name = m.get("name") or m.get("id") or "?"
        pricing = m.get("pricing", {}) or {}
        lines.append(
            f"  {name}: in {pricing.get('input', '?')} / "
            f"out {pricing.get('output', '?')} per 1M, "
            f"ctx {m.get('context_window', '?')}"
        )
    rankings = r.get("rankings", {}) or {}
    if rankings.get("cheapest_blended"):
        lines.append(f"  cheapest blended: {rankings['cheapest_blended']}")
    if rankings.get("most_context"):
        lines.append(f"  most context: {rankings['most_context']}")
    return "\n".join(lines)


def format_cost_projection(r: dict[str, Any]) -> str:
    proj = r.get("projections", []) or []
    lines = ["Cost projection (per model):"]
    for p in proj[:10]:
        name = p.get("model", "?")
        monthly = p.get("monthly_total")
        lines.append(f"  {name}: ~{monthly}/month")
    ranked = r.get("ranked_cheapest_monthly", []) or []
    if ranked:
        head = ranked[0]
        name = head.get("model") if isinstance(head, dict) else head
        lines.append(f"  cheapest monthly: {name}")
    return "\n".join(lines)


def format_news_search(r: dict[str, Any]) -> str:
    results = r.get("results", []) or []
    lines = [
        f"News search: {r.get('matched', len(results))} matched, "
        f"showing {len(results)}"
    ]
    for a in results[:10]:
        lines.append(
            f"  - {a.get('title', '')} ({a.get('source', '')}, "
            f"{a.get('published_at', '')}) {a.get('url', '')}"
        )
    return "\n".join(lines)


def format_provider_deepdive(r: dict[str, Any]) -> str:
    prov = r.get("provider", "?")
    status = r.get("status", {})
    st = status.get("status") if isinstance(status, dict) else status
    models = r.get("models", []) or []
    lines = [
        f"{prov}: status={st}, {len(models)} model(s), "
        f"{r.get('recent_news_count', 0)} recent news, "
        f"{r.get('agent_traffic_24h', 0)} agent hits/24h"
    ]
    for m in models[:6]:
        lines.append(
            f"  {m.get('name', m.get('id', '?'))}: "
            f"tier {m.get('tier', '?')}, ctx {m.get('context_window', '?')}"
        )
    for n in (r.get("recent_news", []) or [])[:5]:
        lines.append(f"  news: {n.get('title', '')} ({n.get('source', '')})")
    return "\n".join(lines)


def format_status_leaderboard(r: dict[str, Any]) -> str:
    entries = r.get("entries", []) or []
    if not entries:
        return (
            "No leaderboard data for the requested window "
            f"({r.get('error', 'no_data')})."
        )
    lines = ["AI provider uptime leaderboard:"]
    for e in entries[:15]:
        lines.append(
            f"  #{e.get('rank', '?')} {e.get('provider', '?')}: "
            f"{e.get('uptime_pct', '?')}% uptime, "
            f"{e.get('incident_count', 0)} incidents, "
            f"MTTR {e.get('mttr_minutes', '?')}m"
        )
    return "\n".join(lines)


# Maps tool name -> (client method name, formatter). The adapters use
# this so the call target and the formatter never drift apart.
FORMATTERS: dict[str, Callable[[dict[str, Any]], str]] = {
    "tensorfeed_whats_new": format_whats_new,
    "tensorfeed_routing": format_routing,
    "tensorfeed_compare_models": format_compare_models,
    "tensorfeed_cost_projection": format_cost_projection,
    "tensorfeed_news_search": format_news_search,
    "tensorfeed_provider_deepdive": format_provider_deepdive,
    "tensorfeed_status_leaderboard": format_status_leaderboard,
}
