"""Tests for the native Route Verdict client methods.

Network-free. Patches urllib.request.urlopen so each method runs through
the real client plumbing (URL building, auth header logic, param
serialization) without a socket. Asserts that:

  - route_verdict_preview hits /preview/route-verdict with NO auth header
  - route_verdict hits /premium/route-verdict WITH the bearer auth header
  - optional params serialize only when provided
  - exactly the task / model selector is forwarded

Run from sdk/python::

    python -m unittest discover -s tests -t .
"""

from __future__ import annotations

import io
import json
import unittest
import urllib.parse
import urllib.request
from typing import Any
from unittest import mock

from tensorfeed import TensorFeed


def _capture(client: TensorFeed) -> dict[str, Any]:
    """Patch urlopen, return a dict that the patched call fills in.

    The fake urlopen records the outgoing Request (full URL and headers)
    and returns a minimal JSON body so the method completes normally.
    """
    captured: dict[str, Any] = {}

    class _FakeResp:
        def __init__(self, body: bytes) -> None:
            self._body = body

        def read(self) -> bytes:
            return self._body

        def __enter__(self) -> "_FakeResp":
            return self

        def __exit__(self, *exc: object) -> None:
            return None

    def fake_urlopen(req: urllib.request.Request, timeout: float = 0.0) -> _FakeResp:
        full_url = req.full_url
        parsed = urllib.parse.urlparse(full_url)
        captured["url"] = full_url
        captured["path"] = parsed.path
        captured["params"] = dict(urllib.parse.parse_qsl(parsed.query))
        # Header keys are normalized to Capitalized form by urllib.
        captured["headers"] = {k.lower(): v for k, v in req.header_items()}
        captured["method"] = req.get_method()
        return _FakeResp(io.BytesIO(b'{"ok": true}').read())

    client._patch = mock.patch.object(  # type: ignore[attr-defined]
        urllib.request, "urlopen", side_effect=fake_urlopen
    )
    client._patch.start()  # type: ignore[attr-defined]
    return captured


class RouteVerdictPreview(unittest.TestCase):
    def setUp(self) -> None:
        self.tf = TensorFeed()  # no token: free preview
        self.captured = _capture(self.tf)

    def tearDown(self) -> None:
        self.tf._patch.stop()  # type: ignore[attr-defined]

    def test_preview_hits_free_path_with_task(self) -> None:
        out = self.tf.route_verdict_preview(task="code")
        self.assertEqual(out, {"ok": True})
        self.assertEqual(self.captured["path"], "/api/preview/route-verdict")
        self.assertEqual(self.captured["params"], {"task": "code"})

    def test_preview_has_no_auth_header(self) -> None:
        # Even if a token is present, the free preview must not advertise it.
        tf = TensorFeed(token="tok_secret")
        captured = _capture(tf)
        try:
            tf.route_verdict_preview(model="claude-opus-4-7")
        finally:
            tf._patch.stop()  # type: ignore[attr-defined]
        self.assertEqual(captured["path"], "/api/preview/route-verdict")
        self.assertEqual(captured["params"], {"model": "claude-opus-4-7"})
        self.assertNotIn("authorization", captured["headers"])

    def test_preview_omits_unset_selector(self) -> None:
        self.tf.route_verdict_preview(task="reasoning")
        self.assertNotIn("model", self.captured["params"])


class RouteVerdictPremium(unittest.TestCase):
    def setUp(self) -> None:
        self.tf = TensorFeed(token="tok_abc123")
        self.captured = _capture(self.tf)

    def tearDown(self) -> None:
        self.tf._patch.stop()  # type: ignore[attr-defined]

    def test_premium_hits_paid_path_with_auth(self) -> None:
        out = self.tf.route_verdict(task="code")
        self.assertEqual(out, {"ok": True})
        self.assertEqual(self.captured["path"], "/api/premium/route-verdict")
        self.assertEqual(self.captured["headers"]["authorization"], "Bearer tok_abc123")
        self.assertEqual(self.captured["params"], {"task": "code"})

    def test_premium_serializes_optional_params(self) -> None:
        self.tf.route_verdict(
            task="code",
            max_latency_p95_ms=1500,
            budget=5.0,
            min_quality=0.6,
            require_operational=True,
            exclude_deprecated=False,
        )
        params = self.captured["params"]
        self.assertEqual(params["task"], "code")
        self.assertEqual(params["max_latency_p95_ms"], "1500")
        self.assertEqual(params["budget"], "5.0")
        self.assertEqual(params["min_quality"], "0.6")
        self.assertEqual(params["require_operational"], "true")
        self.assertEqual(params["exclude_deprecated"], "false")

    def test_premium_omits_unset_optional_params(self) -> None:
        self.tf.route_verdict(model="gpt-5")
        params = self.captured["params"]
        self.assertEqual(params, {"model": "gpt-5"})
        for key in (
            "max_latency_p95_ms",
            "budget",
            "min_quality",
            "require_operational",
            "exclude_deprecated",
        ):
            self.assertNotIn(key, params)

    def test_premium_requires_token(self) -> None:
        tf = TensorFeed()  # no token
        with self.assertRaises(ValueError):
            tf.route_verdict(task="code")


if __name__ == "__main__":
    unittest.main()
