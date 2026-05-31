"""Tests for the shared premium-tool plumbing.

Network-free. Covers the safe_call behavior matrix, the formatters,
the framework bindings (skipped if the framework is not installed),
and a static guard that the premium-tool path can never reach the
wallet or the web3 signer.

Run from sdk/python::

    python -m unittest discover -s tests -t .
"""

from __future__ import annotations

import inspect
import unittest

from tensorfeed import PaymentRequired, RateLimited, TensorFeed, TensorFeedError
from tensorfeed import _premium_tools as pt


class SafeCallBehavior(unittest.TestCase):
    def test_payment_required_returns_guidance_not_raise(self):
        def boom():
            raise PaymentRequired(402, {})

        out = pt.safe_call(boom, lambda r: "unreachable")
        self.assertIn("will not", out.lower())
        self.assertIn("credit", out.lower())
        # The whole point: no exception escapes a tool call.
        self.assertIsInstance(out, str)

    def test_payment_required_appends_credits_hint(self):
        def boom():
            raise PaymentRequired(402, {"credits_required": 1})

        out = pt.safe_call(boom, lambda r: "unreachable")
        self.assertIn("1 credit", out)

    def test_missing_token_value_error_returns_guidance(self):
        def boom():
            raise ValueError("whats_new() requires a token.")

        out = pt.safe_call(boom, lambda r: "unreachable")
        self.assertEqual(out, pt.PREMIUM_PAYMENT_GUIDANCE)

    def test_rate_limited_returns_backoff_message(self):
        def boom():
            raise RateLimited(429, {})

        out = pt.safe_call(boom, lambda r: "unreachable")
        self.assertIn("rate limit", out.lower())

    def test_other_api_error_is_concise(self):
        def boom():
            raise TensorFeedError(500, {"error": "kaboom"})

        out = pt.safe_call(boom, lambda r: "unreachable")
        self.assertIn("500", out)
        self.assertNotIn("Traceback", out)

    def test_success_runs_formatter_and_billing_footer(self):
        result = {"value": 1, "billing": {"credits_charged": 1, "balance": 49}}
        out = pt.safe_call(lambda: result, lambda r: f"value={r['value']}")
        self.assertIn("value=1", out)
        self.assertIn("1 credit(s) charged", out)
        self.assertIn("49 remaining", out)

    def test_formatter_exception_is_contained(self):
        def bad_formatter(r):
            raise KeyError("missing")

        out = pt.safe_call(lambda: {"a": 1}, bad_formatter)
        self.assertIn("unexpected shape", out)
        self.assertIn("'a'", out)  # surfaced the real keys


class GuidanceContract(unittest.TestCase):
    def test_guidance_states_no_autonomous_payment(self):
        g = pt.PREMIUM_PAYMENT_GUIDANCE.lower()
        self.assertIn("will not", g)
        self.assertTrue("move any funds" in g or "move funds" in g)
        self.assertIn("operator", g)


class NoAutonomousPaymentStaticGuard(unittest.TestCase):
    """A future edit must not be able to wire payment into a tool call.

    The premium-tool module is the single chokepoint for every paid
    tool. If it never references the web3 signer or the purchase path,
    no tool can autonomously spend. This asserts that invariant at the
    source level so it fails loudly if someone changes it.
    """

    def test_premium_tools_source_has_no_payment_path(self):
        src = inspect.getsource(pt)
        for forbidden in ("web3_signer", "purchase_credits", "private_key"):
            self.assertNotIn(forbidden, src)


class Formatters(unittest.TestCase):
    def test_each_formatter_smoke(self):
        samples = {
            "tensorfeed_whats_new": {
                "window": {"days": 1},
                "pricing": {
                    "changes": [{"model": "X", "field": "blended", "from": 1, "to": 2}],
                    "new_models": [],
                    "removed_models": [],
                },
                "status": {"incidents": [{"provider": "openai", "state": "down"}]},
                "news": [{"title": "T", "source": "S"}],
                "summary": {"total": 1},
            },
            "tensorfeed_routing": {
                "recommendations": [
                    {"rank": 1, "model": {"name": "Opus", "provider": "anthropic"},
                     "composite_score": 0.91}
                ]
            },
            "tensorfeed_compare_models": {
                "models": [
                    {"name": "A", "pricing": {"input": 1, "output": 2, "blended": 1.5},
                     "context_window": 200000},
                    {"matched": False, "query": "ghost-model", "reason": "model_not_found"},
                ],
                "rankings": {"cheapest_blended": "A"},
            },
            "tensorfeed_cost_projection": {
                "projections": [{"model": "A", "monthly_total": 12.5}],
                "ranked_cheapest_monthly": [{"model": "A"}],
            },
            "tensorfeed_news_search": {
                "matched": 3,
                "results": [{"title": "T", "source": "S", "published_at": "2026-05-17",
                             "url": "u"}],
            },
            "tensorfeed_provider_deepdive": {
                "provider": "anthropic",
                "status": {"status": "operational"},
                "models": [{"name": "Opus", "tier": "flagship", "context_window": 200000}],
                "recent_news_count": 2,
                "recent_news": [{"title": "T", "source": "S"}],
                "agent_traffic_24h": 100,
            },
            "tensorfeed_status_leaderboard": {
                "entries": [{"rank": 1, "provider": "Anthropic", "uptime_pct": 99.9,
                             "incident_count": 0, "mttr_minutes": 0}]
            },
        }
        for name, fmt in pt.FORMATTERS.items():
            with self.subTest(tool=name):
                text = fmt(samples[name])
                self.assertIsInstance(text, str)
                self.assertTrue(text.strip())

    def test_status_leaderboard_handles_no_data(self):
        out = pt.format_status_leaderboard({"entries": [], "error": "no_data"})
        self.assertIn("no_data", out)

    def test_cost_projection_reads_monthly_total(self):
        out = pt.format_cost_projection(
            {"projections": [{"model": "A", "monthly_total": 12.5}]}
        )
        self.assertIn("12.5", out)
        self.assertNotIn("None", out)

    def test_model_comparison_pricing_fields_and_no_match(self):
        out = pt.format_compare_models(
            {
                "models": [
                    {"name": "A", "pricing": {"input": 1, "output": 2}, "context_window": 200000},
                    {"matched": False, "query": "ghost-model", "reason": "model_not_found"},
                ]
            }
        )
        self.assertIn("in 1 / out 2", out)
        self.assertIn("ghost-model: (no match)", out)
        self.assertNotIn("?", out)

    def test_names_and_descriptions_and_formatters_align(self):
        self.assertEqual(set(pt.DESCRIPTIONS), set(pt.FORMATTERS))
        self.assertEqual(set(pt.PREMIUM_TOOL_NAMES), set(pt.DESCRIPTIONS))
        for name, desc in pt.DESCRIPTIONS.items():
            self.assertIn("1 credit", desc, msg=name)


class ClientIntegrationOffline(unittest.TestCase):
    """End-to-end through the real client, no network.

    A tokenless client raises ValueError from _require_token BEFORE any
    HTTP call, so routing it through safe_call exercises the real
    no-credit path offline and proves no network and no payment occur.
    """

    def test_tokenless_premium_call_yields_guidance_no_network(self):
        tf = TensorFeed()  # no token
        out = pt.safe_call(
            lambda: tf.whats_new(), pt.FORMATTERS["tensorfeed_whats_new"]
        )
        self.assertEqual(out, pt.PREMIUM_PAYMENT_GUIDANCE)


class FrameworkBindings(unittest.TestCase):
    def test_langchain_premium_tools_build(self):
        try:
            from tensorfeed.langchain import tensorfeed_premium_tools, tensorfeed_tools
        except Exception as e:  # pragma: no cover
            self.skipTest(f"langchain import failed: {e}")
        try:
            tools = tensorfeed_premium_tools(token=None)
        except ImportError:
            self.skipTest("langchain_core not installed")
        names = {t.name for t in tools}
        self.assertEqual(names, set(pt.DESCRIPTIONS))
        # Default tool list stays free-only (backward compatible).
        free = tensorfeed_tools()
        self.assertTrue(all(t.name not in pt.DESCRIPTIONS for t in free))
        combined = {t.name for t in tensorfeed_tools(include_premium=True)}
        self.assertTrue(set(pt.DESCRIPTIONS).issubset(combined))

    def test_crewai_premium_tools_build(self):
        try:
            from tensorfeed.crewai import tensorfeed_premium_tools
        except Exception as e:  # pragma: no cover
            self.skipTest(f"crewai import failed: {e}")
        try:
            tools = tensorfeed_premium_tools(token=None)
        except ImportError:
            self.skipTest("crewai not installed")
        names = {t.name for t in tools}
        self.assertEqual(names, set(pt.DESCRIPTIONS))


if __name__ == "__main__":
    unittest.main()
