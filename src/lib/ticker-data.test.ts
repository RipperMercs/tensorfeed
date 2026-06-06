import { describe, it, expect } from 'vitest';
import {
  buildPriceItems,
  buildBenchmarkItems,
  buildEvergreenTickerItems,
  type PricingDataLite,
  type BenchmarkDataLite,
} from './ticker-data';

const pricing: PricingDataLite = {
  providers: [
    {
      id: 'anthropic',
      models: [
        { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', inputPrice: 5, outputPrice: 25, tier: 'flagship', released: '2026-05' },
        { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75, tier: 'flagship', released: '2026-04' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, tier: 'standard', released: '2026-03' },
      ],
    },
    {
      id: 'openai',
      models: [
        { id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 5, outputPrice: 30, tier: 'flagship', released: '2026-04' },
        { id: 'gpt-4o', name: 'GPT-4o', inputPrice: 2.5, outputPrice: 10, tier: 'flagship', released: '2024-05' },
      ],
    },
    {
      id: 'google',
      models: [
        { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', inputPrice: 1.25, outputPrice: 10, tier: 'flagship', released: '2025-03' },
        { id: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash', inputPrice: 1.5, outputPrice: 9, tier: 'fast', released: '2026-05' },
      ],
    },
  ],
};

const benchmarks: BenchmarkDataLite = {
  models: [
    { model: 'GPT-5.5', scores: { swe_bench: 68.7, mmlu_pro: 94.2, gpqa_diamond: 78.3 } },
    { model: 'Claude Opus 4.7', scores: { swe_bench: 65.4, mmlu_pro: 93.8, gpqa_diamond: 76.5 } },
    { model: 'DeepSeek V4 Pro', scores: { swe_bench: 63.8, mmlu_pro: 91.5, gpqa_diamond: 73.1 } },
  ],
};

describe('buildPriceItems', () => {
  const items = buildPriceItems(pricing);
  const byTag = (tag: string) => items.find((i) => i.tag === tag);

  it('picks the NEWEST flagship per provider, not an older one', () => {
    // Opus 4.8 (2026-05) over Opus 4.7 (2026-04), with the live $5/$25 price.
    expect(byTag('OPUS 4.8')).toMatchObject({ kind: 'price', text: '$5 / $25', mono: 'per Mtok' });
    expect(byTag('OPUS 4.7')).toBeUndefined();
    // GPT-5.5 (2026-04) over GPT-4o (2024-05).
    expect(byTag('GPT-5.5')).toMatchObject({ text: '$5 / $30' });
  });

  it('ignores non-flagship tiers when picking the provider flagship', () => {
    // Gemini 3.5 Flash is newer but tier "fast", so the flagship is 2.5 Pro.
    expect(byTag('GEMINI 2.5 PRO')).toMatchObject({ text: '$1.25 / $10' });
    expect(byTag('GEMINI 3.5 FLASH')).toBeUndefined();
  });

  it('includes the explicitly featured Sonnet, price read from data', () => {
    expect(byTag('SONNET 4.6')).toMatchObject({ kind: 'price', text: '$3 / $15' });
  });

  it('derives the short tag by stripping the Claude prefix and uppercasing', () => {
    expect(byTag('OPUS 4.8')).toBeTruthy();
    expect(byTag('Claude Opus 4.8')).toBeUndefined();
  });
});

describe('buildBenchmarkItems', () => {
  const items = buildBenchmarkItems(benchmarks);
  const byTag = (tag: string) => items.find((i) => i.tag === tag);

  it('names the max-score model as leader for each featured benchmark', () => {
    expect(byTag('SWE-BENCH')).toMatchObject({ kind: 'benchmark', text: 'leader GPT-5.5', mono: '68.7%' });
    expect(byTag('MMLU-PRO')).toMatchObject({ text: 'leader GPT-5.5', mono: '94.2' });
    expect(byTag('GPQA')).toMatchObject({ text: 'leader GPT-5.5', mono: '78.3' });
  });
});

describe('buildEvergreenTickerItems', () => {
  const items = buildEvergreenTickerItems(pricing, benchmarks);

  it('concatenates price rows, benchmark rows, and the AFTA release row', () => {
    expect(items.some((i) => i.kind === 'price')).toBe(true);
    expect(items.some((i) => i.kind === 'benchmark')).toBe(true);
    const release = items.find((i) => i.kind === 'release');
    expect(release?.tag).toBe('AFTA');
  });

  it('carries no hardcoded prices: every price row matches the source data', () => {
    const opus = items.find((i) => i.tag === 'OPUS 4.8');
    expect(opus?.text).toBe('$5 / $25');
  });
});
