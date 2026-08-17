"""Every premium method must send the Authorization header.

A customer buys credits, calls a documented premium method, and gets a 402
because the SDK never attached their token. That shipped in 2.2.1:
``attention_series`` was the only premium method of twenty that omitted
``require_token=True``, and the fallback meant to catch exactly that mistake
was dead code.

The fallback tested ``"/api/premium/" in path``. Paths handed to ``_request``
are relative, because ``base_url`` already ends in ``/api`` and the URL is
built as ``f"{base_url}{path}"``. So the substring could never match and the
safety net never fired for anything.

Two guards here, because either one alone is escapable:

1. Behavioral. Drive every premium method through a stub transport and assert
   the header is actually present on the wire. Catches a missing flag no
   matter how the method is written.
2. Static. Assert the fallback still matches the relative path form, so the
   net cannot silently go dead again while every method happens to pass the
   flag explicitly.

Network-free. Run from sdk/python::

    python -m unittest discover -s tests -t .
"""

from __future__ import annotations

import inspect
import json
import unittest
from unittest import mock

from tensorfeed import TensorFeed
from tensorfeed import client as client_mod

TOKEN = "tf_live_testtoken0000000000"


class _StubResponse:
    """Minimal stand-in for the urlopen context manager."""

    status = 200
    headers: dict[str, str] = {}

    def read(self) -> bytes:
        return json.dumps({"ok": True}).encode()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _premium_methods():
    """Public methods whose source calls a /premium/ path."""
    for name, fn in inspect.getmembers(TensorFeed, predicate=inspect.isfunction):
        if name.startswith("_"):
            continue
        try:
            src = inspect.getsource(fn)
        except OSError:  # pragma: no cover
            continue
        if '"/premium/' in src or "'/premium/" in src:
            yield name, fn


class PremiumMethodsSendTheToken(unittest.TestCase):
    def test_at_least_a_dozen_premium_methods_are_discovered(self):
        found = list(_premium_methods())
        self.assertGreater(
            len(found), 12, f"expected to discover many premium methods, got {len(found)}"
        )

    def test_every_premium_method_attaches_authorization(self):
        tf = TensorFeed(token=TOKEN)
        offenders: list[str] = []

        for name, fn in _premium_methods():
            sig = inspect.signature(fn)
            # Supply a placeholder for every required positional parameter so the
            # method reaches the transport. Values are irrelevant: the stub
            # answers everything with 200 and we only inspect the request.
            args: list[object] = []
            kwargs: dict[str, object] = {}
            for pname, p in list(sig.parameters.items())[1:]:
                if p.default is not inspect.Parameter.empty:
                    continue
                if p.kind in (p.VAR_POSITIONAL, p.VAR_KEYWORD):
                    continue
                # Numeric-sounding params need a number; everything else takes a
                # plausible string. The value never reaches a real service.
                filler: object = 1000 if "tokens" in pname or pname.endswith("_per_day") else "anthropic"
                if p.kind is p.KEYWORD_ONLY:
                    kwargs[pname] = filler
                else:
                    args.append(filler)

            captured: dict[str, object] = {}

            def _fake_urlopen(req, *a, **kw):
                captured["headers"] = {k.lower(): v for k, v in req.headers.items()}
                captured["url"] = req.full_url
                return _StubResponse()

            with mock.patch.object(client_mod.urllib.request, "urlopen", _fake_urlopen):
                try:
                    getattr(tf, name)(*args, **kwargs)
                except Exception as exc:  # noqa: BLE001
                    offenders.append(f"{name}: raised before transport ({exc!r})")
                    continue

            headers = captured.get("headers") or {}
            if headers.get("authorization") != f"Bearer {TOKEN}":
                offenders.append(
                    f"{name}: no Authorization header on {captured.get('url')}"
                )

        self.assertEqual(
            offenders,
            [],
            "These premium methods call a paid endpoint without the customer's token, so a "
            "customer holding credits gets a 402 instead of data:\n  " + "\n  ".join(offenders),
        )


class TheAuthFallbackIsNotDeadCode(unittest.TestCase):
    def test_fallback_matches_the_relative_path_form(self):
        src = inspect.getsource(client_mod.TensorFeed._request)
        self.assertIn(
            'path.startswith("/premium/")',
            src,
            "The premium auth fallback must match the RELATIVE path form. base_url already "
            "ends in /api, so a check for '/api/premium/' in path can never be true and the "
            "safety net is dead code.",
        )
        self.assertNotIn(
            '"/api/premium/" in path',
            src,
            "This is the dead check that let attention_series ship without a token.",
        )

    def test_base_url_still_ends_in_api(self):
        # The premise of the test above. If this ever changes, the relative-path
        # assumption changes with it.
        self.assertTrue(client_mod.DEFAULT_BASE_URL.endswith("/api"))
