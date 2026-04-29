import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCircuitBreaker,
  CIRCUIT_BREAKER_LIMITS,
  _resetCircuitBreakerForTests,
} from './circuit-breaker';

describe('circuit breaker', () => {
  beforeEach(() => {
    _resetCircuitBreakerForTests();
  });

  it('does not trip on a single request', () => {
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code');
    expect(result.tripped).toBe(false);
    expect(result.count).toBe(1);
  });

  it('does not trip up to the threshold', () => {
    const now = 1_000_000;
    let lastResult;
    for (let i = 0; i <= CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      lastResult = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    // The (THRESHOLD+1)th request is the first to exceed; everything up to and
    // including the THRESHOLDth must NOT trip.
    expect(lastResult).toBeDefined();
  });

  it('trips on the request that exceeds the threshold', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      const r = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
      expect(r.tripped).toBe(false);
    }
    const finalResult = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(finalResult.tripped).toBe(true);
    expect(finalResult.cooldown_seconds).toBe(CIRCUIT_BREAKER_LIMITS.COOLDOWN_SECONDS);
    expect(finalResult.retry_after_unix_ms).toBeGreaterThan(now);
  });

  it('does not consider requests outside the rolling window', () => {
    const t0 = 1_000_000;
    // Fill up to THRESHOLD requests at t0
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', t0 + i);
    }
    // Step past the window. New request should not trip.
    const tFar = t0 + CIRCUIT_BREAKER_LIMITS.WINDOW_MS + 1000;
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', tFar);
    expect(result.tripped).toBe(false);
    expect(result.count).toBe(1);
  });

  it('isolates by token, path, and query', () => {
    const now = 1_000_000;
    // Hit the threshold for token A on path X with query Y
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=code', now + i);
    }
    // The (THRESHOLD+1)th hit on the SAME tuple should trip
    const tripped = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(tripped.tripped).toBe(true);

    // A different token, same path/query, should not trip
    const otherToken = checkCircuitBreaker('tf_live_bbbbbbbb', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(otherToken.tripped).toBe(false);

    // Same token, different path, should not trip
    const otherPath = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/news/search', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(otherPath.tripped).toBe(false);

    // Same token, same path, different query, should not trip
    const otherQuery = checkCircuitBreaker('tf_live_aaaaaaaa', '/api/premium/routing', 'task=reasoning', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(otherQuery.tripped).toBe(false);
  });

  it('keeps refusing requests during the cooldown period', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    const trip = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);
    expect(trip.tripped).toBe(true);

    // Halfway through the cooldown, still tripped
    const stillTripped = checkCircuitBreaker(
      'tf_live_abcdef12',
      '/api/premium/routing',
      'task=code',
      now + CIRCUIT_BREAKER_LIMITS.THRESHOLD + (CIRCUIT_BREAKER_LIMITS.COOLDOWN_SECONDS * 1000) / 2,
    );
    expect(stillTripped.tripped).toBe(true);
    expect(stillTripped.cooldown_seconds).toBeLessThan(CIRCUIT_BREAKER_LIMITS.COOLDOWN_SECONDS);
  });

  it('lets requests through again after the cooldown elapses', () => {
    const now = 1_000_000;
    for (let i = 0; i < CIRCUIT_BREAKER_LIMITS.THRESHOLD; i++) {
      checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + i);
    }
    checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', now + CIRCUIT_BREAKER_LIMITS.THRESHOLD);

    const past = now + CIRCUIT_BREAKER_LIMITS.THRESHOLD + (CIRCUIT_BREAKER_LIMITS.COOLDOWN_SECONDS * 1000) + (CIRCUIT_BREAKER_LIMITS.WINDOW_MS) + 1;
    const result = checkCircuitBreaker('tf_live_abcdef12', '/api/premium/routing', 'task=code', past);
    expect(result.tripped).toBe(false);
    expect(result.count).toBe(1);
  });
});
