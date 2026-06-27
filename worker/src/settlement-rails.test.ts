import { describe, it, expect } from 'vitest';
import {
  computeEvmRawCostUsd,
  computeSolanaRawCostUsd,
  buildSnapshot,
  buildRailVerdict,
  isRailPreference,
  USDC_TRANSFER_GAS_UNITS,
  SOLANA_BASE_FEE_LAMPORTS,
  SOLANA_CU_LIMIT,
  CDP_FACILITATOR,
  RAILS,
  RefreshInputs,
} from './settlement-rails';

const FULL_INPUTS: RefreshInputs = {
  capturedAt: '2026-06-27T00:00:00.000Z',
  gasPriceWei: { base: 1e7, polygon: 3e10, arbitrum: 1e7, avalanche: 2.5e10 },
  solanaCuPriceMicroLamports: 0,
  prices: { 'ETH-USD': 2000, 'SOL-USD': 150, 'POL-USD': 0.5, 'AVAX-USD': 25 },
};

describe('computeEvmRawCostUsd', () => {
  it('computes execution-layer cost from gas units, gas price, and native price', () => {
    // 55000 gas at 0.01 gwei (1e7 wei) and ETH $2000 = 0.0011 USD
    const c = computeEvmRawCostUsd(55000, 1e7, 2000);
    expect(c).toBeCloseTo(0.0011, 6);
  });

  it('returns null when the gas price is unavailable', () => {
    expect(computeEvmRawCostUsd(55000, null, 2000)).toBeNull();
  });

  it('returns null when the native token price is unavailable', () => {
    expect(computeEvmRawCostUsd(55000, 1e7, null)).toBeNull();
  });
});

describe('computeSolanaRawCostUsd', () => {
  it('uses base fee only when priority fee is zero', () => {
    // 5000 lamports = 5e-6 SOL, at SOL $150 = 0.00075 USD
    const c = computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, 0, SOLANA_CU_LIMIT, 150);
    expect(c).toBeCloseTo(0.00075, 6);
  });

  it('adds the priority fee when the network charges one', () => {
    const withPriority = computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, 1000, SOLANA_CU_LIMIT, 150)!;
    const baseOnly = computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, 0, SOLANA_CU_LIMIT, 150)!;
    expect(withPriority).toBeGreaterThan(baseOnly);
  });

  it('treats a null priority fee as zero', () => {
    const c = computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, null, SOLANA_CU_LIMIT, 150);
    expect(c).toBeCloseTo(0.00075, 6);
  });

  it('returns null when the SOL price is unavailable', () => {
    expect(computeSolanaRawCostUsd(SOLANA_BASE_FEE_LAMPORTS, 0, SOLANA_CU_LIMIT, null)).toBeNull();
  });
});

describe('buildSnapshot', () => {
  it('produces a cost row for every rail with full inputs', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    expect(snap.rails).toHaveLength(RAILS.length);
    for (const r of snap.rails) {
      expect(r.raw_onchain_cost_usd).not.toBeNull();
      expect(r.raw_cost_pct_of_reference).not.toBeNull();
      expect(typeof r.finality_hard_seconds).toBe('number');
    }
  });

  it('recommends a CDP-supported rail in best_rail_quick (Solana for micro-payments)', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    expect(snap.best_rail_quick.id).toBe('solana');
  });

  it('never returns null cost rows even when all live inputs are missing', () => {
    const snap = buildSnapshot({
      capturedAt: '2026-06-27T00:00:00.000Z',
      gasPriceWei: {},
      solanaCuPriceMicroLamports: null,
      prices: {},
    });
    expect(snap.rails).toHaveLength(RAILS.length);
    for (const r of snap.rails) {
      expect(r.raw_onchain_cost_usd).toBeNull();
      // finality facts are static and always present
      expect(r.finality_hard_seconds).toBeGreaterThan(0);
    }
    // verdict still works (effective CDP cost is flat, independent of raw cost)
    expect(snap.best_rail_quick.id).toBe('solana');
  });

  it('marks the CDP facilitator supported_rails list correctly', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    expect(snap.cdp_facilitator.supported_rails).toContain('solana');
    expect(snap.cdp_facilitator.supported_rails).toContain('base');
    expect(snap.cdp_facilitator.supported_rails).not.toContain('avalanche');
  });
});

describe('buildRailVerdict', () => {
  it('recommends Solana over Base for a micro-payment (faster finality among CDP rails)', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    const v = buildRailVerdict(snap, 0.01, 'balanced');
    expect(v.recommended_rail.id).toBe('solana');
    const ids = v.ranking.map((r) => r.id);
    expect(ids.indexOf('solana')).toBeLessThan(ids.indexOf('base'));
  });

  it('ranks the non-CDP rail (Avalanche) last despite its fast finality', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    const v = buildRailVerdict(snap, 0.01, 'finality');
    const ids = v.ranking.map((r) => r.id);
    expect(ids[ids.length - 1]).toBe('avalanche');
    // even though Avalanche has the fastest hard finality of any rail
    const fastest = [...snap.rails].sort((a, b) => a.finality_hard_seconds - b.finality_hard_seconds)[0];
    expect(fastest.id).toBe('avalanche');
  });

  it('never recommends a self-settle-only rail when a CDP rail exists', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    for (const prefer of ['balanced', 'cost', 'finality'] as const) {
      const v = buildRailVerdict(snap, 0.01, prefer);
      const rec = v.ranking.find((r) => r.id === v.recommended_rail.id)!;
      expect(rec.cdp_supported).toBe(true);
    }
  });

  it('prices CDP rails at the flat facilitator fee and self-settle rails at raw cost', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    const v = buildRailVerdict(snap, 0.01, 'balanced');
    const sol = v.ranking.find((r) => r.id === 'solana')!;
    const avax = v.ranking.find((r) => r.id === 'avalanche')!;
    expect(sol.settle_path).toBe('cdp_facilitator');
    expect(sol.effective_cost_usd).toBe(CDP_FACILITATOR.fee_usd_after_free_tier);
    expect(avax.settle_path).toBe('self_settle');
  });

  it('carries the payment amount and preference through to the result', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    const v = buildRailVerdict(snap, 0.05, 'cost');
    expect(v.payment_usd).toBe(0.05);
    expect(v.prefer).toBe('cost');
    expect(v.capturedAt).toBe(snap.capturedAt);
  });
});

describe('isRailPreference', () => {
  it('accepts the valid preferences and rejects others', () => {
    expect(isRailPreference('balanced')).toBe(true);
    expect(isRailPreference('cost')).toBe(true);
    expect(isRailPreference('finality')).toBe(true);
    expect(isRailPreference('fastest')).toBe(false);
  });
});

describe('no em dashes or double hyphens in output strings', () => {
  it('snapshot and verdict serialize clean (anti-AI-detection content rule)', () => {
    const snap = buildSnapshot(FULL_INPUTS);
    const verdict = buildRailVerdict(snap, 0.01, 'balanced');
    const blob = JSON.stringify(snap) + JSON.stringify(verdict);
    const emDash = String.fromCharCode(0x2014);
    expect(blob).not.toContain(emDash); // U+2014 em dash
    expect(blob).not.toMatch(/-{2}/); // double hyphen substitute
  });
});

describe('USDC_TRANSFER_GAS_UNITS constant', () => {
  it('is a representative USDC transfer gas figure', () => {
    expect(USDC_TRANSFER_GAS_UNITS).toBeGreaterThan(40000);
    expect(USDC_TRANSFER_GAS_UNITS).toBeLessThan(70000);
  });
});
