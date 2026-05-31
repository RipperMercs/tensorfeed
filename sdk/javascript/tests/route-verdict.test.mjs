/**
 * Tests for the native Route Verdict client methods (JS SDK).
 *
 * Zero-dependency: Node's built-in node:test. Network-free: global
 * fetch is stubbed to capture the outgoing URL plus headers and return a
 * minimal JSON body, so each method runs through the real client
 * plumbing (URL building, auth header logic, param serialization)
 * without a socket.
 *
 * Asserts that:
 *   - routeVerdictPreview hits /preview/route-verdict with NO auth header
 *   - routeVerdict hits /premium/route-verdict WITH the bearer header
 *   - optional params serialize only when provided
 *
 * Run with `npm test` (builds first, then `node --test tests/`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TensorFeed } from '../dist/index.js';

/**
 * Install a fetch stub on globalThis. Returns a `captured` object the
 * stub fills in, and a `restore` to put the original fetch back.
 */
function stubFetch() {
  const captured = {};
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const parsed = new URL(url);
    captured.url = url;
    captured.path = parsed.pathname;
    captured.params = Object.fromEntries(parsed.searchParams.entries());
    captured.headers = init?.headers ?? {};
    captured.method = init?.method;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    };
  };
  return { captured, restore: () => { globalThis.fetch = original; } };
}

// ── Free preview: /preview/route-verdict, no auth ─────────────────────

test('routeVerdictPreview hits the free path with the task param', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed();
    const out = await tf.routeVerdictPreview({ task: 'code' });
    assert.deepEqual(out, { ok: true });
    assert.equal(captured.path, '/api/preview/route-verdict');
    assert.deepEqual(captured.params, { task: 'code' });
  } finally {
    restore();
  }
});

test('routeVerdictPreview sends no auth header even when a token is set', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed({ token: 'tok_secret' });
    await tf.routeVerdictPreview({ model: 'claude-opus-4-7' });
    assert.equal(captured.path, '/api/preview/route-verdict');
    assert.deepEqual(captured.params, { model: 'claude-opus-4-7' });
    assert.equal(captured.headers['Authorization'], undefined);
  } finally {
    restore();
  }
});

// ── Premium: /premium/route-verdict, with auth ────────────────────────

test('routeVerdict hits the paid path with the bearer auth header', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed({ token: 'tok_abc123' });
    const out = await tf.routeVerdict({ task: 'code' });
    assert.deepEqual(out, { ok: true });
    assert.equal(captured.path, '/api/premium/route-verdict');
    assert.equal(captured.headers['Authorization'], 'Bearer tok_abc123');
    assert.deepEqual(captured.params, { task: 'code' });
  } finally {
    restore();
  }
});

test('routeVerdict serializes optional params when provided', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed({ token: 'tok_abc123' });
    await tf.routeVerdict({
      task: 'code',
      maxLatencyP95Ms: 1500,
      budget: 5,
      minQuality: 0.6,
      requireOperational: true,
      excludeDeprecated: false,
    });
    assert.equal(captured.params.task, 'code');
    assert.equal(captured.params.max_latency_p95_ms, '1500');
    assert.equal(captured.params.budget, '5');
    assert.equal(captured.params.min_quality, '0.6');
    assert.equal(captured.params.require_operational, 'true');
    assert.equal(captured.params.exclude_deprecated, 'false');
  } finally {
    restore();
  }
});

test('routeVerdict omits unset optional params', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed({ token: 'tok_abc123' });
    await tf.routeVerdict({ model: 'gpt-5' });
    assert.deepEqual(captured.params, { model: 'gpt-5' });
    for (const key of [
      'max_latency_p95_ms',
      'budget',
      'min_quality',
      'require_operational',
      'exclude_deprecated',
    ]) {
      assert.equal(captured.params[key], undefined);
    }
  } finally {
    restore();
  }
});

test('routeVerdict throws without a token, no network', async () => {
  const { captured, restore } = stubFetch();
  try {
    const tf = new TensorFeed(); // no token
    await assert.rejects(() => tf.routeVerdict({ task: 'code' }), /requires a token/);
    assert.equal(captured.url, undefined); // fetch never called
  } finally {
    restore();
  }
});
