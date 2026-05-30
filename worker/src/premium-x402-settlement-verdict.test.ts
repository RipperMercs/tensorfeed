import { describe, it, expect } from 'vitest';
import { buildX402SettlementVerdict } from './premium-x402-settlement-verdict';
import type { SummaryResult, LeaderboardResult } from './x402-index/query';

const NOW = new Date('2026-05-29T18:00:00.000Z');
const CAPTURED = '2026-05-29T17:54:00.000Z';

function summary(over: Partial<SummaryResult> = {}): SummaryResult {
  return {
    window: '7d',
    captured_at: CAPTURED,
    volume_usdc: '1234.500000',
    count: 42,
    unique_publishers: 3,
    change_vs_prior_window: { volume_pct: 30, count_pct: 25, prior_window_empty: false },
    attribution: 'TensorFeed x402 settlement index over public Base mainnet on-chain data',
    license: 'CC BY 4.0',
    ...over,
  };
}

function leaderboard(over: Partial<LeaderboardResult> = {}): LeaderboardResult {
  return {
    window: '7d',
    captured_at: CAPTURED,
    leaders: [
      { rank: 1, domain: 'pub-a.com', volume_usdc: '800.000000', count: 25, share_pct: 64.8 },
      { rank: 2, domain: 'pub-b.com', volume_usdc: '300.000000', count: 12, share_pct: 24.3 },
      { rank: 3, domain: 'pub-c.com', volume_usdc: '134.500000', count: 5, share_pct: 10.9 },
    ],
    window_volume_usdc: '1234.500000',
    coverage_note: 'note',
    attribution: 'TensorFeed x402 settlement index over public Base mainnet on-chain data',
    license: 'CC BY 4.0',
    ...over,
  };
}

describe('buildX402SettlementVerdict', () => {
  it('classifies an expanding, concentrated market and names the leader', () => {
    const r = buildX402SettlementVerdict(summary(), leaderboard(), NOW);
    expect(r.ok).toBe(true);
    expect(r.verdict.momentum).toBe('expanding');
    // HHI = 64.8^2 + 24.3^2 + 10.9^2 = 4908.34, above 2500 -> concentrated
    expect(r.verdict.concentration).toBe('concentrated');
    expect(r.verdict.leading_publisher).toBe('pub-a.com');
    expect(r.ecosystem.hhi).toBe(4908);
    expect(r.ecosystem.top_publisher_share_pct).toBe(64.8);
    expect(r.ecosystem.volume_change_pct).toBe(30);
    expect(r.ranking).toHaveLength(3);
    expect(r.ranking[0]).toMatchObject({ rank: 1, domain: 'pub-a.com', count: 25, share_pct: 64.8 });
  });

  it('flags a shrinking window as contracting', () => {
    const r = buildX402SettlementVerdict(
      summary({ change_vs_prior_window: { volume_pct: -40, count_pct: -30, prior_window_empty: false } }),
      leaderboard(),
      NOW,
    );
    expect(r.verdict.momentum).toBe('contracting');
  });

  it('reports a flat window as steady', () => {
    const r = buildX402SettlementVerdict(
      summary({ change_vs_prior_window: { volume_pct: 5, count_pct: -2, prior_window_empty: false } }),
      leaderboard(),
      NOW,
    );
    expect(r.verdict.momentum).toBe('steady');
  });

  it('treats growth from a zero prior baseline as nascent, not expanding', () => {
    const r = buildX402SettlementVerdict(
      summary({ change_vs_prior_window: { volume_pct: 100, count_pct: 100, prior_window_empty: true } }),
      leaderboard(),
      NOW,
    );
    expect(r.verdict.momentum).toBe('nascent');
    expect(r.ecosystem.prior_window_empty).toBe(true);
  });

  it('classifies a many-publisher market as diversified', () => {
    const leaders = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      domain: `pub-${i}.com`,
      volume_usdc: '100.000000',
      count: 10,
      share_pct: 10,
    }));
    // HHI = 10 * 10^2 = 1000, below 1500 -> diversified
    const r = buildX402SettlementVerdict(summary({ unique_publishers: 10 }), leaderboard({ leaders }), NOW);
    expect(r.verdict.concentration).toBe('diversified');
    expect(r.ecosystem.hhi).toBe(1000);
  });

  it('classifies a mid-spread market as moderate', () => {
    const leaders = [
      { rank: 1, domain: 'a.com', volume_usdc: '400.000000', count: 4, share_pct: 40 },
      { rank: 2, domain: 'b.com', volume_usdc: '300.000000', count: 3, share_pct: 30 },
      { rank: 3, domain: 'c.com', volume_usdc: '300.000000', count: 3, share_pct: 30 },
    ];
    // HHI = 1600 + 900 + 900 = 3400 -> concentrated, so adjust: use 30/30/20/20
    const mid = [
      { rank: 1, domain: 'a.com', volume_usdc: '300.000000', count: 3, share_pct: 30 },
      { rank: 2, domain: 'b.com', volume_usdc: '300.000000', count: 3, share_pct: 30 },
      { rank: 3, domain: 'c.com', volume_usdc: '200.000000', count: 2, share_pct: 20 },
      { rank: 4, domain: 'd.com', volume_usdc: '200.000000', count: 2, share_pct: 20 },
    ];
    void leaders;
    // HHI = 900 + 900 + 400 + 400 = 2600 -> concentrated. Need 1500..2500.
    const band = [
      { rank: 1, domain: 'a.com', volume_usdc: '250.000000', count: 3, share_pct: 25 },
      { rank: 2, domain: 'b.com', volume_usdc: '250.000000', count: 3, share_pct: 25 },
      { rank: 3, domain: 'c.com', volume_usdc: '250.000000', count: 2, share_pct: 25 },
      { rank: 4, domain: 'd.com', volume_usdc: '150.000000', count: 2, share_pct: 15 },
      { rank: 5, domain: 'e.com', volume_usdc: '100.000000', count: 1, share_pct: 10 },
    ];
    void mid;
    // HHI = 625*3 + 225 + 100 = 1875 + 325 = 2200 -> moderate
    const r = buildX402SettlementVerdict(summary({ unique_publishers: 5 }), leaderboard({ leaders: band }), NOW);
    expect(r.verdict.concentration).toBe('moderate');
    expect(r.ecosystem.hhi).toBe(2200);
  });

  it('handles an empty index: nascent momentum, empty concentration, no leader', () => {
    const r = buildX402SettlementVerdict(
      summary({ count: 0, volume_usdc: '0.000000', unique_publishers: 0, change_vs_prior_window: { volume_pct: 0, count_pct: 0, prior_window_empty: true } }),
      leaderboard({ leaders: [], window_volume_usdc: '0.000000' }),
      NOW,
    );
    expect(r.verdict.momentum).toBe('nascent');
    expect(r.verdict.concentration).toBe('empty');
    expect(r.verdict.leading_publisher).toBeNull();
    expect(r.ranking).toHaveLength(0);
    expect(r.ecosystem.hhi).toBeNull();
    expect(r.ecosystem.top_publisher_share_pct).toBeNull();
  });

  it('survives null inputs without throwing', () => {
    const r = buildX402SettlementVerdict(null, null, NOW);
    expect(r.ok).toBe(true);
    expect(r.verdict.momentum).toBe('nascent');
    expect(r.verdict.concentration).toBe('empty');
    expect(r.verdict.leading_publisher).toBeNull();
    expect(r.capturedAt).toBeNull();
    expect(r.ranking).toHaveLength(0);
  });

  it('anchors capturedAt to the index captured_at, never the request clock', () => {
    const r = buildX402SettlementVerdict(summary(), leaderboard(), NOW);
    expect(r.capturedAt).toBe(CAPTURED);
    expect(r.capturedAt).not.toBe(NOW.toISOString());
  });

  it('emits no em dashes and no double hyphens anywhere in the output', () => {
    const r = buildX402SettlementVerdict(summary(), leaderboard(), NOW);
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/—/);
    expect(blob).not.toContain('--');
  });
});
