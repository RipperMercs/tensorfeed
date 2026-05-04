import { describe, it, expect } from 'vitest';
import { applyDebit, assess, currentHourISO, tokenShort, HourlyBuffer, ANOMALY_LIMITS } from './anomaly';

const HOUR = (h: number, day = 4) => new Date(`2026-05-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000Z`);

describe('currentHourISO', () => {
  it('rounds down to the hour boundary', () => {
    expect(currentHourISO(new Date('2026-05-04T14:37:42.123Z'))).toBe('2026-05-04T14:00:00.000Z');
  });
});

describe('tokenShort', () => {
  it('takes the first 16 chars and adds an ellipsis', () => {
    expect(tokenShort('tf_live_abcdef123456')).toBe('tf_live_abcdef12...');
  });
});

describe('applyDebit', () => {
  it('starts a new bucket on a fresh hour', () => {
    const buf = applyDebit({ buckets: [] }, 5, HOUR(14));
    expect(buf.buckets).toHaveLength(1);
    expect(buf.buckets[0]).toEqual({
      hour: '2026-05-04T14:00:00.000Z',
      credits: 5,
      calls: 1,
    });
  });

  it('merges into the current hour bucket on a repeat', () => {
    let buf: HourlyBuffer = { buckets: [] };
    buf = applyDebit(buf, 5, HOUR(14));
    buf = applyDebit(buf, 3, HOUR(14));
    buf = applyDebit(buf, 2, HOUR(14));
    expect(buf.buckets).toHaveLength(1);
    expect(buf.buckets[0].credits).toBe(10);
    expect(buf.buckets[0].calls).toBe(3);
  });

  it('starts a new bucket when the hour rolls over', () => {
    let buf: HourlyBuffer = { buckets: [] };
    buf = applyDebit(buf, 5, HOUR(14));
    buf = applyDebit(buf, 7, HOUR(15));
    expect(buf.buckets).toHaveLength(2);
    expect(buf.buckets[1].credits).toBe(7);
  });

  it('trims to MAX_BUCKETS keeping the newest entries', () => {
    let buf: HourlyBuffer = { buckets: [] };
    for (let i = 0; i < ANOMALY_LIMITS.MAX_BUCKETS + 5; i++) {
      const t = new Date('2026-01-01T00:00:00Z');
      t.setUTCHours(t.getUTCHours() + i);
      buf = applyDebit(buf, 1, t);
    }
    expect(buf.buckets).toHaveLength(ANOMALY_LIMITS.MAX_BUCKETS);
    // The earliest 5 should have been dropped
    expect(buf.buckets[0].hour).not.toBe('2026-01-01T00:00:00.000Z');
  });
});

function bufferWithBaseline(creditsPerHour: number, hours: number): HourlyBuffer {
  const buckets = [];
  for (let i = 0; i < hours; i++) {
    const t = new Date('2026-05-01T00:00:00Z');
    t.setUTCHours(t.getUTCHours() + i);
    buckets.push({ hour: t.toISOString(), credits: creditsPerHour, calls: 1 });
  }
  return { buckets };
}

describe('assess', () => {
  it('returns no_baseline when fewer than 24h of history', () => {
    const buf = bufferWithBaseline(10, 5);
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(false);
    expect(r.reason).toBe('no_baseline');
    expect(r.buckets_in_baseline).toBe(5);
  });

  it('returns within_baseline when current matches history', () => {
    const buf = bufferWithBaseline(10, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 12, calls: 2 });
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(false);
    expect(r.reason).toBe('within_baseline');
    expect(r.baseline_median).toBe(10);
    expect(r.current_credits).toBe(12);
  });

  it('does not flag when multiplier is high but absolute credits are below floor', () => {
    // Baseline median = 1, current = 19. 19x ratio but below WARNING_FLOOR_CREDITS=20.
    const buf = bufferWithBaseline(1, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 19, calls: 1 });
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(false);
  });

  it('does not flag when credits are high but multiplier is low', () => {
    // Baseline median = 100, current = 200. 2x ratio. Below WARNING_MULTIPLIER=5.
    const buf = bufferWithBaseline(100, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 200, calls: 5 });
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(false);
  });

  it('flags warning when 5x baseline + 20 credit floor met', () => {
    const buf = bufferWithBaseline(4, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 25, calls: 5 });
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe('warning');
    expect(r.reason).toBe('warning');
    expect(r.multiplier_observed).toBeGreaterThanOrEqual(5);
  });

  it('flags critical when 10x baseline + 50 credit floor met', () => {
    const buf = bufferWithBaseline(5, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 60, calls: 10 });
    const r = assess(buf, HOUR(14, 6));
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe('critical');
    expect(r.multiplier_observed).toBeGreaterThanOrEqual(10);
  });

  it('handles zero baseline gracefully (median = 0)', () => {
    const buf = bufferWithBaseline(0, 30);
    buf.buckets.push({ hour: currentHourISO(HOUR(14, 6)), credits: 100, calls: 5 });
    const r = assess(buf, HOUR(14, 6));
    // multiplier = 100 / max(0, 1) = 100, plenty of credits, should flag critical
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe('critical');
  });

  it('reports zero current_credits when no current-hour bucket exists yet', () => {
    const buf = bufferWithBaseline(10, 30);
    const r = assess(buf, HOUR(14, 6));
    expect(r.current_credits).toBe(0);
    expect(r.flagged).toBe(false);
    expect(r.reason).toBe('within_baseline');
  });
});
