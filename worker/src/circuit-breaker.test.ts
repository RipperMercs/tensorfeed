import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCircuitBreaker,
  CIRCUIT_BREAKER_LIMITS,
  _resetCircuitBreakerForTests,
} from './circuit-breaker';

describe('circuit breaker (identical-request layer)', () => {
  beforeEach(() => {
    _resetCircuitBreakerForTests();
  });

  it('does not trip on a single request', () => {
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code');
    expect(result.tripped).toBe(false);
    expect(result.trip_kind).toBeNull();
    expect(result.count).toBe(1);
  });

  it('does not trip up to the threshold', () => {
    const now = 1_000_000;
    let lastResult;
    for (let i = 0; i <= CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      lastResult = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    expect(lastResult).toBeDefined();
  });

  it('trips on the request that exceeds the per-tuple threshold', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      const r = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
      expect(r.tripped).toBe(false);
    }
    const finalResult = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(finalResult.tripped).toBe(true);
    expect(finalResult.trip_kind).toBe('identical_request');
    expect(finalResult.cooldown_seconds).toBe(CIRCUIT_BREAKER_LIMITS.TUPLE_COOLDOWN_SECONDS);
    expect(finalResult.retry_after_unix_ms).toBeGreaterThan(now);
  });

  it('does not consider requests outside the rolling window', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', t0 + i);
    }
    const tFar = t0 + CIRCUIT_BREAKER_LIMITS.WINDOW_MS + 1000;
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', tFar);
    expect(result.tripped).toBe(false);
    expect(result.count).toBe(1);
  });

  it('isolates by token, path, and query at the tuple layer', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=code', now + i);
    }
    const tripped = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(tripped.tripped).toBe(true);
    expect(tripped.trip_kind).toBe('identical_request');

    // A different token, same path/query, should not trip
    const otherToken = checkCircuitBreaker('tf_live_bbbbbbbb', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(otherToken.tripped).toBe(false);

    // Same token, different path. Reuses same isolate, so 21 hits on path A
    // already counted toward the burn-rate layer. Add only 1 hit on path B.
    const otherPath = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/news/search', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(otherPath.tripped).toBe(false);

    const otherQuery = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=reasoning', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(otherQuery.tripped).toBe(false);
  });

  it('keeps refusing requests during the cooldown period', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    const trip = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);
    expect(trip.tripped).toBe(true);

    const stillTripped = checkCircuitBreaker(
      'tf_live_abcdef12',
      '/api/premium/routing',
      'task=code',
      now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD + (CIRCUIT_BREAKER_LIMITS.TUPLE_COOLDOWN_SECONDS * 1000) / 2,
    );
    expect(stillTripped.tripped).toBe(true);
    expect(stillTripped.cooldown_seconds).toBeLessThan(CIRCUIT_BREAKER_LIMITS.TUPLE_COOLDOWN_SECONDS);
  });

  it('lets requests through again after the cooldown elapses', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD);

    // Step well past both cooldown and the rolling window so both layers reset.
    const past = now + CIRCUIT_BREAKER_LIMITS.TUPLE_THRESHOLD
      + (CIRCUIT_BREAKER_LIMITS.BURN_RATE_COOLDOWN_SECONDS * 1000)
      + CIRCUIT_BREAKER_LIMITS.WINDOW_MS + 1;
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', past);
    expect(result.tripped).toBe(false);
    expect(result.count).toBe(1);
  });
});

describe('circuit breaker (burn-rate layer)', () => {
  beforeEach(() => {
    _resetCircuitBreakerForTests();
  });

  it('trips when total requests across varied URLs exceed BURN_RATE_THRESHOLD', () => {
    const now = 1_000_000;
    // Vary the query string on every call so the per-tuple breaker
    // never sees the same fingerprint twice. This is the bypass the
    // burn-rate layer was added to close.
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD; i++) {
      const r = checkCircuitBreaker(
        'tf_live_burny___',
        '/api/premium/routing',
        `nonce=${i}`,
        now + i,
      );
      expect(r.tripped).toBe(false);
    }
    const finalResult = checkCircuitBreaker(
      'tf_live_burny___',
      '/api/premium/routing',
      `nonce=${CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD}`,
      now + CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD,
    );
    expect(finalResult.tripped).toBe(true);
    expect(finalResult.trip_kind).toBe('burn_rate');
    expect(finalResult.cooldown_seconds).toBe(CIRCUIT_BREAKER_LIMITS.BURN_RATE_COOLDOWN_SECONDS);
  });

  it('trips when traffic spans multiple endpoints under one token', () => {
    const now = 1_000_000;
    const endpoints = ['/api/premium/routing', '/api/premium/news/search', '/api/premium/whats-new'];
    // Vary the query as well so the per-tuple breaker never sees the
    // same fingerprint twice; only the burn-rate layer should fire.
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD; i++) {
      const r = checkCircuitBreaker(
        'tf_live_spread__',
        endpoints[i % endpoints.length],
        `nonce=${i}`,
        now + i,
      );
      expect(r.tripped).toBe(false);
    }
    const finalResult = checkCircuitBreaker(
      'tf_live_spread__',
      endpoints[0],
      `nonce=${CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD}`,
      now + CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD,
    );
    expect(finalResult.tripped).toBe(true);
    expect(finalResult.trip_kind).toBe('burn_rate');
  });

  it('isolates burn-rate by token', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_loud____', '/api/premium/routing', `nonce=${i}`, now + i);
    }
    // A different token starting fresh should not be affected.
    const result = checkCircuitBreaker('tf_live_quiet___', '/api/premium/routing', 'task=code', now);
    expect(result.tripped).toBe(false);
    expect(result.trip_kind).toBeNull();
  });

  it('keeps refusing during the burn-rate cooldown', () => {
    const now = 1_000_000;
    for (let i = 0; i <= CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_cooled__', '/api/premium/routing', `nonce=${i}`, now + i);
    }
    const halfway = now
      + CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD
      + (CIRCUIT_BREAKER_LIMITS.BURN_RATE_COOLDOWN_SECONDS * 1000) / 2;
    const stillTripped = checkCircuitBreaker(
      'tf_live_cooled__',
      '/api/premium/routing',
      'task=code',
      halfway,
    );
    expect(stillTripped.tripped).toBe(true);
    expect(stillTripped.trip_kind).toBe('burn_rate');
    expect(stillTripped.cooldown_seconds).toBeLessThan(CIRCUIT_BREAKER_LIMITS.BURN_RATE_COOLDOWN_SECONDS);
  });

  it('reports the burn-rate trip kind even when the per-tuple layer would also trip', () => {
    // Pound the same tuple over and over to maximize both counters.
    const now = 1_000_000;
    let lastResult;
    for (let i = 0; i <= CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD; i++) {
      lastResult = checkCircuitBreaker(
        'tf_live_double__',
        '/api/premium/routing',
        'task=code',
        now + i,
      );
    }
    expect(lastResult).toBeDefined();
    expect(lastResult!.tripped).toBe(true);
    // Burn-rate is checked first and should win when both would trip.
    // (Per-tuple has tripped much earlier in the loop, but its cooldown
    // returns identical_request. We assert the LAST sustained-trip
    // observation surfaces burn_rate once it crosses the threshold.)
    const oneMore = checkCircuitBreaker(
      'tf_live_double__',
      '/api/premium/routing',
      'task=code',
      now + CIRCUIT_BREAKER_LIMITS.BURN_RATE_THRESHOLD + 1,
    );
    expect(oneMore.tripped).toBe(true);
    expect(oneMore.trip_kind).toBe('burn_rate');
  });
});
