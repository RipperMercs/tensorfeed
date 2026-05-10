import { describe, it, expect } from 'vitest';
import { computeFundingExposure, classifyLoop } from './premium-funding-exposure';
import type { FundingCommitment } from './ai-funding-registry';

function mk(over: Partial<FundingCommitment>): FundingCommitment {
  return {
    id: over.id ?? 'x',
    from: over.from ?? 'Nvidia',
    to: over.to ?? 'X',
    amount_usd_max: over.amount_usd_max ?? 1_000_000_000,
    amount_usd_disclosed: over.amount_usd_disclosed ?? null,
    announced_date: over.announced_date ?? '2026-01-01',
    type: over.type ?? 'private-equity',
    recipient_silicon_dependency: over.recipient_silicon_dependency ?? 'nvidia',
    commercial_quid_pro_quo: 'qpq',
    source_urls: ['https://example.com'],
    notes: 'note',
  };
}

describe('classifyLoop', () => {
  it('returns fully-circular at >=0.85', () => {
    expect(classifyLoop(1, 'nvidia')).toBe('fully-circular');
    expect(classifyLoop(0.85, 'nvidia')).toBe('fully-circular');
  });
  it('returns partial-loop in 0.25 to 0.85', () => {
    expect(classifyLoop(0.5, 'nvidia')).toBe('partial-loop');
    expect(classifyLoop(0.25, 'nvidia')).toBe('partial-loop');
  });
  it('returns agnostic below 0.25', () => {
    expect(classifyLoop(0.1, 'nvidia')).toBe('agnostic');
    expect(classifyLoop(0, 'nvidia')).toBe('agnostic');
  });
  it('returns agnostic when investor has no silicon brand', () => {
    expect(classifyLoop(1, null)).toBe('agnostic');
  });
});

describe('computeFundingExposure with synthetic registry', () => {
  it('returns empty_registry error on empty input', () => {
    const r = computeFundingExposure([], '2026-05-10');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('empty_registry');
  });

  it('computes silicon concentration shares correctly', () => {
    const reg = [
      mk({ id: 'a', amount_usd_max: 30_000_000_000, recipient_silicon_dependency: 'nvidia' }),
      mk({ id: 'b', amount_usd_max: 10_000_000_000, recipient_silicon_dependency: 'tpu' }),
      mk({ id: 'c', amount_usd_max: 10_000_000_000, recipient_silicon_dependency: 'nvidia' }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const nvidia = r.silicon_concentration.find((s) => s.silicon_dependency === 'nvidia')!;
      const tpu = r.silicon_concentration.find((s) => s.silicon_dependency === 'tpu')!;
      expect(nvidia.commitment_count).toBe(2);
      expect(nvidia.total_amount_usd_max).toBe(40_000_000_000);
      expect(nvidia.share_of_total_pct).toBe(80);
      expect(tpu.share_of_total_pct).toBe(20);
    }
  });

  it('identifies Nvidia as fully-circular when all commitments go to nvidia silicon', () => {
    const reg = [
      mk({ id: 'a', from: 'Nvidia', to: 'OpenAI', recipient_silicon_dependency: 'nvidia' }),
      mk({ id: 'b', from: 'Nvidia', to: 'Corning', recipient_silicon_dependency: 'nvidia' }),
      mk({ id: 'c', from: 'Nvidia', to: 'IREN', recipient_silicon_dependency: 'nvidia' }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const nvidia = r.circular_exposure.find((e) => e.investor === 'Nvidia')!;
      expect(nvidia.loop_classification).toBe('fully-circular');
      expect(nvidia.circular_ratio_by_count).toBe(1);
      expect(nvidia.circular_ratio_by_amount).toBe(1);
    }
  });

  it('identifies partial-loop when investor splits between own + other silicon', () => {
    const reg = [
      mk({ id: 'a', from: 'Amazon', to: 'Anthropic', amount_usd_max: 1, recipient_silicon_dependency: 'mixed' }),
      mk({ id: 'b', from: 'Amazon', to: 'AnthropicTrainium', amount_usd_max: 1, recipient_silicon_dependency: 'trainium' }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const az = r.circular_exposure.find((e) => e.investor === 'Amazon')!;
      expect(az.loop_classification).toBe('partial-loop');
      expect(az.circular_ratio_by_count).toBe(0.5);
    }
  });

  it('flags non-silicon investor as agnostic', () => {
    const reg = [
      mk({ id: 'a', from: 'SoftBank', to: 'OpenAI', recipient_silicon_dependency: 'nvidia' }),
      mk({ id: 'b', from: 'SoftBank', to: 'AnotherCo', recipient_silicon_dependency: 'tpu' }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const sb = r.circular_exposure.find((e) => e.investor === 'SoftBank')!;
      expect(sb.loop_classification).toBe('agnostic');
      expect(sb.investor_silicon_brand).toBe('unknown');
    }
  });

  it('builds top_recipients sorted by inbound amount desc', () => {
    const reg = [
      mk({ id: 'a', from: 'Nvidia', to: 'OpenAI', amount_usd_max: 30_000_000_000 }),
      mk({ id: 'b', from: 'Microsoft', to: 'OpenAI', amount_usd_max: 13_000_000_000 }),
      mk({ id: 'c', from: 'Nvidia', to: 'IREN', amount_usd_max: 2_000_000_000 }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.top_recipients[0].recipient).toBe('OpenAI');
      expect(r.top_recipients[0].inbound_amount_usd_max).toBe(43_000_000_000);
      expect(r.top_recipients[0].inbound_commitments).toBe(2);
      expect(r.top_recipients[0].investors).toEqual(['Microsoft', 'Nvidia']);
    }
  });

  it('builds co_investor_pairs for shared recipients', () => {
    const reg = [
      mk({ id: 'a', from: 'Microsoft', to: 'OpenAI' }),
      mk({ id: 'b', from: 'Nvidia', to: 'OpenAI' }),
      mk({ id: 'c', from: 'Amazon', to: 'Anthropic' }),
      mk({ id: 'd', from: 'Google', to: 'Anthropic' }),
    ];
    const r = computeFundingExposure(reg, '2026-05-10');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.co_investor_pairs).toHaveLength(2);
      const oa = r.co_investor_pairs.find((p) => p.shared_recipients.includes('OpenAI'));
      expect(oa).toBeDefined();
      const anth = r.co_investor_pairs.find((p) => p.shared_recipients.includes('Anthropic'));
      expect(anth).toBeDefined();
    }
  });

  it('runs against the live FUNDING_REGISTRY and produces nontrivial output', () => {
    const r = computeFundingExposure();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_commitments).toBeGreaterThan(0);
      expect(r.total_amount_usd_max).toBeGreaterThan(0);
      expect(r.silicon_concentration.length).toBeGreaterThan(0);
      // Nvidia should be in the circular exposure list given seed entries
      expect(r.circular_exposure.some((e) => e.investor === 'Nvidia')).toBe(true);
    }
  });
});
