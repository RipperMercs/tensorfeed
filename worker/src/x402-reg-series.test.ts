import { describe, it, expect } from 'vitest';
import {
  resolveRange,
  projectX402RegSeries,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
} from './x402-reg-series';
import {
  X402_REGISTRY_ATTRIBUTION,
  type RegistryEntry,
  type RegistrySnapshot,
} from './x402-registry';

function entry(domain: string, over: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    domain,
    manifest_url: `https://${domain}/.well-known/x402`,
    fetched_at: '2026-05-01T00:00:00Z',
    status: 'ok',
    federation_member: false,
    ...over,
  };
}

function snap(
  date: string,
  entries: RegistryEntry[],
  by_network: Record<string, number> = { 'eip155:8453': entries.length },
): RegistrySnapshot {
  const ok = entries.filter((e) => e.status === 'ok').length;
  return {
    fetched_at: `${date}T00:00:00Z`,
    total: entries.length,
    ok_count: ok,
    error_count: entries.length - ok,
    federation_count: entries.filter((e) => e.federation_member && e.status === 'ok').length,
    by_network,
    entries,
    attribution: X402_REGISTRY_ATTRIBUTION,
  };
}

const daySpan = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );

describe('resolveRange', () => {
  it('defaults to a trailing DEFAULT_RANGE_DAYS window', () => {
    const r = resolveRange(null, null);
    expect(r.ok).toBe(true);
    expect(r.to).toBe(new Date().toISOString().slice(0, 10));
    expect(daySpan(r.from!, r.to!) + 1).toBe(DEFAULT_RANGE_DAYS);
  });

  it('rejects malformed dates and inverted ranges', () => {
    expect(resolveRange(null, 'nope')).toEqual({ ok: false, error: 'invalid_to_date' });
    expect(resolveRange('bad', '2026-05-10')).toEqual({ ok: false, error: 'invalid_from_date' });
    expect(resolveRange('2026-05-10', '2026-05-01')).toEqual({ ok: false, error: 'from_after_to' });
  });

  it('rejects a range over the max and accepts the boundary', () => {
    expect(resolveRange('2026-01-01', '2026-05-01')).toEqual({
      ok: false,
      error: 'range_exceeds_max_days',
    });
    const r = resolveRange('2026-02-01', '2026-05-01'); // 90 inclusive == MAX
    expect(r.ok).toBe(true);
    expect(daySpan(r.from!, r.to!) + 1).toBe(MAX_RANGE_DAYS);
  });
});

describe('projectX402RegSeries', () => {
  it('marks every day no-data for an empty range and notes it', () => {
    const dates = ['2026-05-01', '2026-05-02'];
    const r = projectX402RegSeries(
      '2026-05-01',
      '2026-05-02',
      dates.map((date) => ({ date, snap: null })),
    );
    expect(r.points.every((p) => p.has_data === false)).toBe(true);
    expect(r.delta_in_window.start_total).toBeNull();
    expect(r.notes.some((n) => n.includes('No captured snapshots'))).toBe(true);
  });

  it('leaves churn null on a single data day and notes it', () => {
    const r = projectX402RegSeries('2026-05-01', '2026-05-01', [
      { date: '2026-05-01', snap: snap('2026-05-01', [entry('a.com', { payment_wallet: '0xAAA' })]) },
    ]);
    expect(r.points[0].has_data).toBe(true);
    expect(r.points[0].added).toBeNull();
    expect(r.points[0].status_flips).toBeNull();
    expect(r.points[0].wallet_changes).toBeNull();
    expect(r.notes.some((n) => n.includes('Only one day has data'))).toBe(true);
  });

  it('computes add, remove, status flip, and wallet change vs the prior has-data day', () => {
    const d1 = snap('2026-05-01', [
      entry('a.com', { status: 'ok', payment_wallet: '0xAAA' }),
      entry('b.com', { status: 'ok', payment_wallet: '0xBBB' }),
      entry('e.com', { status: 'ok', payment_wallet: '0xEEE' }),
    ]);
    const d2 = snap('2026-05-02', [
      entry('a.com', { status: 'ok', payment_wallet: '0xZZZ' }), // wallet changed
      entry('b.com', { status: 'fetch_error', payment_wallet: '0xBBB' }), // status flip
      entry('c.com', { status: 'ok', payment_wallet: '0xCCC' }), // added
      // e.com removed
    ]);
    const r = projectX402RegSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: d1 },
      { date: '2026-05-02', snap: d2 },
    ]);
    expect(r.points[0].added).toBeNull(); // first has-data day
    expect(r.points[1].added).toBe(1);
    expect(r.points[1].removed).toBe(1);
    expect(r.points[1].status_flips).toBe(1);
    expect(r.points[1].wallet_changes).toBe(1);
    expect(r.points[1].added_sample).toContain('c.com');
    expect(r.points[1].removed_sample).toContain('e.com');
    expect(r.points[1].wallet_change_sample).toContain('a.com');
  });

  it('computes churn against the prior has-data day, not a gap day', () => {
    const a = snap('2026-05-01', [entry('a.com', { payment_wallet: '0xAAA' })]);
    const b = snap('2026-05-03', [
      entry('a.com', { payment_wallet: '0xAAA' }),
      entry('b.com', { payment_wallet: '0xBBB' }),
    ]);
    const r = projectX402RegSeries('2026-05-01', '2026-05-03', [
      { date: '2026-05-01', snap: a },
      { date: '2026-05-02', snap: null },
      { date: '2026-05-03', snap: b },
    ]);
    expect(r.points[1].has_data).toBe(false);
    expect(r.points[2].added).toBe(1);
    expect(r.points[2].removed).toBe(0);
    expect(r.points[2].status_flips).toBe(0);
    expect(r.points[2].wallet_changes).toBe(0);
  });

  it('aggregates counts and reports the window delta over first and last has-data day', () => {
    const d1 = snap(
      '2026-05-01',
      [
        entry('a.com', {
          status: 'ok',
          paid_endpoints_count: 20,
          free_endpoints_count: 5,
          agent_fair_trade_declared: true,
          federation_member: true,
        }),
      ],
      { 'eip155:8453': 1 },
    );
    const d2 = snap(
      '2026-05-02',
      [
        entry('a.com', { status: 'ok', paid_endpoints_count: 22, free_endpoints_count: 5 }),
        entry('b.com', { status: 'ok', paid_endpoints_count: 3, free_endpoints_count: 1 }),
      ],
      { 'eip155:8453': 2, 'eip155:84532': 1 },
    );
    const r = projectX402RegSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: d1 },
      { date: '2026-05-02', snap: d2 },
    ]);
    expect(r.points[0].paid_endpoints_total).toBe(20);
    expect(r.points[0].agent_fair_trade_count).toBe(1);
    expect(r.points[0].network_count).toBe(1);
    expect(r.points[1].paid_endpoints_total).toBe(25);
    expect(r.points[1].network_count).toBe(2);
    expect(r.points[1].networks).toEqual(['eip155:8453', 'eip155:84532']);
    expect(r.delta_in_window.start_total).toBe(1);
    expect(r.delta_in_window.end_total).toBe(2);
    expect(r.delta_in_window.net).toBe(1);
    expect(r.delta_in_window.start_ok).toBe(1);
    expect(r.delta_in_window.end_ok).toBe(2);
  });

  it('echoes range, day count, and the attribution block', () => {
    const r = projectX402RegSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: snap('2026-05-01', [entry('a.com')]) },
      { date: '2026-05-02', snap: snap('2026-05-02', [entry('a.com')]) },
    ]);
    expect(r.from).toBe('2026-05-01');
    expect(r.to).toBe('2026-05-02');
    expect(r.days).toBe(2);
    expect(r.attribution).toBe(X402_REGISTRY_ATTRIBUTION);
  });
});
