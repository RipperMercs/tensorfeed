import { describe, it, expect } from 'vitest';
import { contentDigest } from './constant-digest';
import { BENCHMARK_REGISTRY, BENCHMARK_REGISTRY_LAST_UPDATED } from './benchmark-registry';

/**
 * BENCHMARK_REGISTRY_LAST_UPDATED is published inside a SIGNED premium
 * response (the `anchors` block in premium-route-verdict.ts) as a freshness
 * claim about this registry. The registry and the date were two independent
 * hand-edits, so the entries could change while the date stood still and
 * TensorFeed would sign a claim that was not true.
 *
 * IF THIS TEST FAILS you changed the registry. Required follow-through:
 *   1. Set BENCHMARK_REGISTRY_LAST_UPDATED to the date you verified the new
 *      frontier scores.
 *   2. Update PINNED below to the digest printed in the failure message.
 * Doing step 2 without step 1 re-publishes a stale freshness claim to paying
 * agents.
 */
const PINNED = {
  digest: '7aa6a8e51fdb0827',
  lastUpdated: '2026-08-26',
  entries: 33,
};

describe('BENCHMARK_REGISTRY freshness claim', () => {
  it('has not drifted from the date it is published under', () => {
    expect({
      digest: contentDigest(BENCHMARK_REGISTRY),
      lastUpdated: BENCHMARK_REGISTRY_LAST_UPDATED,
      entries: BENCHMARK_REGISTRY.length,
    }).toEqual(PINNED);
  });

  it('publishes a well-formed ISO date, since agents parse it', () => {
    expect(BENCHMARK_REGISTRY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(BENCHMARK_REGISTRY_LAST_UPDATED))).toBe(false);
  });

  it('has no duplicate benchmark id, which would make lookups ambiguous', () => {
    const ids = BENCHMARK_REGISTRY.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the frontier fields internally consistent', () => {
    // frontierModel null means the score is saturated, contested, or moving.
    // In that case the date and source must be null too, otherwise a reader
    // sees a citation attached to no model.
    for (const b of BENCHMARK_REGISTRY) {
      if (b.frontierModel === null) {
        expect(b.frontierDate, `${b.id} frontierDate`).toBeNull();
        expect(b.frontierSource, `${b.id} frontierSource`).toBeNull();
      } else {
        expect(b.frontierDate, `${b.id} frontierDate`).toMatch(/^\d{4}-\d{2}$/);
        expect(b.frontierSource, `${b.id} frontierSource`).toMatch(/^https?:\/\//);
      }
    }
  });
});
