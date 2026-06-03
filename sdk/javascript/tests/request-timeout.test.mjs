/**
 * Tests for the request() timeout + network-error handling (JS SDK).
 *
 * Zero-dependency: Node's built-in node:test. Network-free: global fetch is
 * stubbed to throw (simulating an AbortSignal.timeout firing, or a dropped
 * connection) so the client's error-wrapping path runs without a socket.
 *
 * Asserts that:
 *   - a fetch TimeoutError becomes TensorFeedError(0) with error "timeout"
 *   - any other fetch rejection becomes TensorFeedError(0) with "network_error"
 *   - every request passes an AbortSignal so a stalled call cannot hang forever
 *
 * Run with `npm test` (builds first, then `node --test tests/`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TensorFeed, TensorFeedError } from '../dist/index.js';

function stubFetchThrowing(err) {
  const original = globalThis.fetch;
  const captured = {};
  globalThis.fetch = async (url, init) => {
    captured.url = url;
    captured.signal = init?.signal;
    throw err;
  };
  return { captured, restore: () => { globalThis.fetch = original; } };
}

test('a fetch timeout becomes a TensorFeedError with error "timeout"', async () => {
  // AbortSignal.timeout rejects the fetch with a TimeoutError-named DOMException.
  const timeoutErr = Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' });
  const { captured, restore } = stubFetchThrowing(timeoutErr);
  try {
    const tf = new TensorFeed({ timeoutMs: 25 });
    await assert.rejects(
      () => tf.news(),
      (e) => {
        assert.ok(e instanceof TensorFeedError, 'should be a TensorFeedError');
        assert.equal(e.statusCode, 0, 'statusCode 0 means no HTTP response');
        assert.equal(e.payload.error, 'timeout');
        // .message is built from payload.error (the short code); the human
        // detail lives in payload.message per the TensorFeedError convention.
        assert.match(e.payload.message, /timed out after 25ms/);
        return true;
      },
    );
    assert.ok(captured.signal instanceof AbortSignal, 'a timeout signal was passed');
  } finally {
    restore();
  }
});

test('a network failure becomes a TensorFeedError with error "network_error"', async () => {
  const netErr = new TypeError('fetch failed');
  const { restore } = stubFetchThrowing(netErr);
  try {
    const tf = new TensorFeed();
    await assert.rejects(
      () => tf.news(),
      (e) => {
        assert.ok(e instanceof TensorFeedError);
        assert.equal(e.statusCode, 0);
        assert.equal(e.payload.error, 'network_error');
        return true;
      },
    );
  } finally {
    restore();
  }
});

test('request passes an AbortSignal so calls cannot hang forever', async () => {
  let capturedSignal;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    capturedSignal = init?.signal;
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  try {
    const tf = new TensorFeed();
    await tf.news();
    assert.ok(capturedSignal instanceof AbortSignal, 'fetch should receive an AbortSignal');
  } finally {
    globalThis.fetch = original;
  }
});
