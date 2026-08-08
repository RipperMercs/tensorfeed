import { describe, it, expect } from 'vitest';
import { contentDigest } from './constant-digest';
import { MODEL_DEPRECATIONS, MODEL_DEPRECATIONS_LAST_UPDATED } from './model-deprecations';

/**
 * MODEL_DEPRECATIONS drives /api/model-deprecations and its premium timeline
 * sibling. The list and MODEL_DEPRECATIONS_LAST_UPDATED were two independent
 * hand-edits, so entries could change while the date stood still.
 *
 * This registry is worse than stale-looking when it drifts: an agent reads it
 * to decide whether the model it is about to call is about to stop serving.
 * A missed sunset date is a wrong answer with a real consequence.
 *
 * IF THIS TEST FAILS you changed the list. Required follow-through:
 *   1. Set MODEL_DEPRECATIONS_LAST_UPDATED to the date you checked the
 *      provider announcements.
 *   2. Update PINNED below to the digest printed in the failure message.
 */
const PINNED = {
  digest: 'a27723325ff24056',
  lastUpdated: '2026-07-24',
  entries: 14,
};

describe('MODEL_DEPRECATIONS freshness claim', () => {
  it('has not drifted from the date it is published under', () => {
    expect({
      digest: contentDigest(MODEL_DEPRECATIONS),
      lastUpdated: MODEL_DEPRECATIONS_LAST_UPDATED,
      entries: MODEL_DEPRECATIONS.length,
    }).toEqual(PINNED);
  });

  it('publishes a well-formed ISO date, since agents parse it', () => {
    expect(MODEL_DEPRECATIONS_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(MODEL_DEPRECATIONS_LAST_UPDATED))).toBe(false);
  });

  it('has no duplicate id, which would render one row unreachable', () => {
    const ids = MODEL_DEPRECATIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cites an authoritative provider URL on every row', () => {
    for (const d of MODEL_DEPRECATIONS) {
      expect(d.sourceUrl, `${d.id} sourceUrl`).toMatch(/^https:\/\//);
    }
  });

  it('orders each row announced then deprecated then sunset', () => {
    for (const d of MODEL_DEPRECATIONS) {
      const seq = [d.announcedDate, d.deprecationDate, d.sunsetDate].filter(
        (x): x is string => typeof x === 'string',
      );
      const sorted = [...seq].sort();
      expect(seq, `${d.id} date order`).toEqual(sorted);
    }
  });

  it('marks a row sunsetted only when it actually has a sunset date', () => {
    for (const d of MODEL_DEPRECATIONS) {
      if (d.status === 'sunsetted') {
        expect(d.sunsetDate, `${d.id} sunsetDate`).toBeDefined();
      }
    }
  });
});
