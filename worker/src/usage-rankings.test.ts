import { describe, it, expect } from 'vitest';
import { contentDigest } from './constant-digest';
import {
  USAGE_RANKINGS,
  USAGE_RANKINGS_LAST_UPDATED,
  USAGE_RANKINGS_SOURCE,
  USAGE_RANKINGS_WINDOW,
} from './usage-rankings';

/**
 * USAGE_RANKINGS_LAST_UPDATED is published inside a SIGNED premium response
 * (the `anchors` block in premium-route-verdict.ts) as a freshness claim about
 * this data. Before this test, the rankings array and the date were two
 * independent hand-edits, so the array could change while the date stood
 * still and TensorFeed would sign a claim that was not true.
 *
 * IF THIS TEST FAILS you changed the rankings. That is fine, and here is the
 * required follow-through:
 *   1. Set USAGE_RANKINGS_LAST_UPDATED to the date you pulled the new data.
 *   2. Update PINNED below to the digest printed in the failure message.
 * Updating the digest without step 1 re-publishes a stale freshness claim to
 * paying agents. The whole point of this test is to make that a decision
 * instead of an accident.
 */
const PINNED = {
  digest: 'c0816de1814ca6d3',
  lastUpdated: '2026-04-30',
  entries: 20,
};

describe('USAGE_RANKINGS freshness claim', () => {
  it('has not drifted from the date it is published under', () => {
    expect({
      digest: contentDigest(USAGE_RANKINGS),
      lastUpdated: USAGE_RANKINGS_LAST_UPDATED,
      entries: USAGE_RANKINGS.length,
    }).toEqual(PINNED);
  });

  it('publishes a well-formed ISO date, since agents parse it', () => {
    expect(USAGE_RANKINGS_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(USAGE_RANKINGS_LAST_UPDATED))).toBe(false);
  });

  it('names its provenance, which the signed receipt attributes the data to', () => {
    expect(USAGE_RANKINGS_SOURCE).toContain('openrouter.ai');
    expect(USAGE_RANKINGS_WINDOW.length).toBeGreaterThan(0);
  });

  it('has no duplicate openrouterId, which would double-count one model', () => {
    const ids = USAGE_RANKINGS.map((r) => r.openrouterId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is ranked 1..N with no gaps, since consumers read rank as position', () => {
    expect(USAGE_RANKINGS.map((r) => r.rank)).toEqual(
      USAGE_RANKINGS.map((_, i) => i + 1),
    );
  });

  it('keeps sharePct a plausible percentage that does not exceed 100 in total', () => {
    for (const r of USAGE_RANKINGS) {
      expect(r.sharePct).toBeGreaterThan(0);
      expect(r.sharePct).toBeLessThanOrEqual(100);
    }
    const total = USAGE_RANKINGS.reduce((a, r) => a + r.sharePct, 0);
    expect(total).toBeLessThanOrEqual(100);
  });
});
