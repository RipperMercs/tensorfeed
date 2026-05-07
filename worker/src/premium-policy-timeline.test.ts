import { describe, it, expect } from 'vitest';
import {
  computePolicyTimeline,
  classifyPosition,
  parseTimelineParams,
} from './premium-policy-timeline';
import { POLICY_REGISTRY } from './ai-policy-registry';

// ── classifyPosition ───────────────────────────────────────────────

describe('classifyPosition', () => {
  it('returns no-date when effective_date is null', () => {
    expect(classifyPosition(null, '2026-05-06')).toBe('no-date');
  });

  it('returns past for dates before today', () => {
    expect(classifyPosition('2024-05-01', '2026-05-06')).toBe('past');
  });

  it('returns today when dates match', () => {
    expect(classifyPosition('2026-05-06', '2026-05-06')).toBe('today');
  });

  it('returns upcoming for dates within 2-year horizon', () => {
    expect(classifyPosition('2026-12-01', '2026-05-06')).toBe('upcoming');
    expect(classifyPosition('2027-08-01', '2026-05-06')).toBe('upcoming');
  });

  it('returns far-future beyond default 2-year threshold', () => {
    expect(classifyPosition('2030-01-01', '2026-05-06')).toBe('far-future');
  });

  it('respects custom far-future threshold', () => {
    expect(classifyPosition('2027-06-01', '2026-05-06', 30)).toBe('far-future');
  });
});

// ── computePolicyTimeline ──────────────────────────────────────────

describe('computePolicyTimeline', () => {
  const REFERENCE_NOW = new Date('2026-05-06T12:00:00Z');

  it('returns ok with all-default options', () => {
    const r = computePolicyTimeline({}, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.window.days_back).toBe(180);
    expect(r.window.days_forward).toBe(180);
    expect(r.computed_at).toBe('2026-05-06T12:00:00.000Z');
    expect(r.entries.length).toBeGreaterThan(0);
  });

  it('respects custom window sizes', () => {
    const r = computePolicyTimeline({ daysBack: 30, daysForward: 730 }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.window.days_back).toBe(30);
    expect(r.window.days_forward).toBe(730);
    expect(r.window.from).toBe('2026-04-06');
    expect(r.window.to).toBe('2028-05-05');
  });

  it('caps window sizes at 5 years', () => {
    const r = computePolicyTimeline({ daysBack: 999_999, daysForward: 999_999 }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.window.days_back).toBe(365 * 5);
    expect(r.window.days_forward).toBe(365 * 5);
  });

  it('filters by jurisdiction', () => {
    const r = computePolicyTimeline({ jurisdiction: 'EU' }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries.every(e => e.jurisdiction === 'EU')).toBe(true);
  });

  it('rejects unknown jurisdiction', () => {
    const r = computePolicyTimeline({ jurisdiction: 'Atlantis' }, REFERENCE_NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('invalid_jurisdiction');
    expect(r.hint).toBeDefined();
  });

  it('classifies registry entries correctly relative to 2026-05-06', () => {
    const r = computePolicyTimeline({ daysBack: 365 * 5, daysForward: 365 * 5 }, REFERENCE_NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Colorado SB 24-205 takes effect 2026-02-01 → past relative to 2026-05-06
    const co = r.entries.find(e => e.id === 'us-co-sb24-205');
    expect(co?.relative_position).toBe('past');

    // California AB 2013 takes effect 2026-01-01 → past
    const ca = r.entries.find(e => e.id === 'us-ca-ab-2013');
    expect(ca?.relative_position).toBe('past');

    // Vetoed entries have null effective_date → no-date
    const vetoed = r.entries.find(e => e.id === 'us-ca-sb-1047');
    expect(vetoed?.relative_position).toBe('no-date');
  });

  it('computes days_until_effective accurately', () => {
    const r = computePolicyTimeline({ daysBack: 365 * 5, daysForward: 365 * 5 }, REFERENCE_NOW);
    if (!r.ok) return;
    const co = r.entries.find(e => e.id === 'us-co-sb24-205');
    // 2026-02-01 was 94 days before 2026-05-06
    expect(co?.days_until_effective).toBe(-94);
  });

  it('builds totals counts that add up to in_window', () => {
    const r = computePolicyTimeline({}, REFERENCE_NOW);
    if (!r.ok) return;
    const sum =
      r.totals.past + r.totals.today + r.totals.upcoming + r.totals.far_future + r.totals.no_date;
    expect(sum).toBe(r.totals.in_window);
  });

  it('aggregates by_jurisdiction sums to in_window', () => {
    const r = computePolicyTimeline({}, REFERENCE_NOW);
    if (!r.ok) return;
    const sum = Object.values(r.by_jurisdiction).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.totals.in_window);
  });

  it('next_milestones returns up to 3 upcoming entries', () => {
    const r = computePolicyTimeline({ daysBack: 0, daysForward: 365 * 5 }, REFERENCE_NOW);
    if (!r.ok) return;
    expect(r.next_milestones.length).toBeLessThanOrEqual(3);
    for (const m of r.next_milestones) {
      expect(m.relative_position).toBe('upcoming');
      expect(m.days_until_effective).not.toBeNull();
      expect((m.days_until_effective ?? 0)).toBeGreaterThan(0);
    }
  });

  it('next_milestones sorted by closest effective_date', () => {
    const r = computePolicyTimeline({ daysBack: 0, daysForward: 365 * 5 }, REFERENCE_NOW);
    if (!r.ok) return;
    for (let i = 1; i < r.next_milestones.length; i++) {
      const prev = r.next_milestones[i - 1].days_until_effective ?? 0;
      const curr = r.next_milestones[i].days_until_effective ?? 0;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('attribution carries the derivation note', () => {
    const r = computePolicyTimeline({}, REFERENCE_NOW);
    if (!r.ok) return;
    expect(r.attribution.derivation.toLowerCase()).toContain('temporal');
  });

  it('produces a deterministic output for a given input + now', () => {
    const r1 = computePolicyTimeline({ daysBack: 90, daysForward: 90 }, REFERENCE_NOW);
    const r2 = computePolicyTimeline({ daysBack: 90, daysForward: 90 }, REFERENCE_NOW);
    if (!r1.ok || !r2.ok) return;
    expect(r1.entries.map(e => e.id)).toEqual(r2.entries.map(e => e.id));
  });

  it('sees every active or phased entry from the registry when window is wide', () => {
    const r = computePolicyTimeline({ daysBack: 365 * 5, daysForward: 365 * 5 }, REFERENCE_NOW);
    if (!r.ok) return;
    const activeOrPhasedFromRegistry = POLICY_REGISTRY.filter(
      p => p.status === 'active' || p.status === 'phased',
    );
    for (const expected of activeOrPhasedFromRegistry) {
      expect(r.entries.some(e => e.id === expected.id)).toBe(true);
    }
  });
});

// ── parseTimelineParams ────────────────────────────────────────────

describe('parseTimelineParams', () => {
  it('parses valid params', () => {
    const p = parseTimelineParams(new URLSearchParams('days_back=30&days_forward=730&jurisdiction=EU'));
    expect(p.daysBack).toBe(30);
    expect(p.daysForward).toBe(730);
    expect(p.jurisdiction).toBe('EU');
    expect(p.error).toBeUndefined();
  });

  it('rejects negative days_back', () => {
    const p = parseTimelineParams(new URLSearchParams('days_back=-5'));
    expect(p.error).toBe('invalid_days_back');
  });

  it('rejects non-numeric days_forward', () => {
    const p = parseTimelineParams(new URLSearchParams('days_forward=soon'));
    expect(p.error).toBe('invalid_days_forward');
  });

  it('rejects window beyond 5-year cap', () => {
    const p = parseTimelineParams(new URLSearchParams('days_forward=10000'));
    expect(p.error).toBe('days_forward_exceeds_max');
  });

  it('returns empty options for empty params', () => {
    const p = parseTimelineParams(new URLSearchParams());
    expect(p.daysBack).toBeUndefined();
    expect(p.daysForward).toBeUndefined();
    expect(p.jurisdiction).toBeUndefined();
  });
});
