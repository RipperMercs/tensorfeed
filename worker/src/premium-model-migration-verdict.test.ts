import { describe, it, expect } from 'vitest';
import { buildMigrationVerdict, type MigrationSources } from './premium-model-migration-verdict';
import type { PricingDataLite } from './premium-models-frontier';
import type { IntelligenceSnapshot, ModelIntelligence } from './model-intelligence';
import type { TimelineEntry } from './premium-model-deprecations';

const NOW = new Date('2026-06-06T12:00:00Z');

function priceModel(id: string, name: string, inp: number, out: number) {
  return { id, name, inputPrice: inp, outputPrice: out };
}

const PRICING: PricingDataLite = {
  providers: [
    { name: 'Anthropic', models: [priceModel('claude-3-opus', 'Claude 3 Opus', 15, 45), priceModel('claude-opus-4-8', 'Claude Opus 4.8', 15, 45)] },
    { name: 'OpenAI', models: [priceModel('gpt-5', 'GPT-5', 5, 15)] },
  ],
};

function mi(model_id: string, name: string, provider: string, tfii: number): ModelIntelligence {
  return {
    model_id,
    name,
    provider,
    rank: 1,
    as_of: '2026-06-06',
    tfii,
    subscores: { code: tfii, reasoning: tfii, creative: tfii, general: tfii },
    trust: { contamination: 'low', benchmarks_used: ['mmlu_pro'], coverage: 1, low_coverage: false, flagged: [] },
    methodology_version: 'tfii-1',
  };
}

const INTEL: IntelligenceSnapshot = {
  as_of: '2026-06-06',
  methodology_version: 'tfii-1',
  models: [mi('claude-3-opus', 'Claude 3 Opus', 'Anthropic', 74), mi('claude-opus-4-8', 'Claude Opus 4.8', 'Anthropic', 92), mi('gpt-5', 'GPT-5', 'OpenAI', 88)],
};

function dep(over: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: 'dep-claude-3-opus',
    provider: 'Anthropic',
    model: 'claude-3-opus',
    modelDisplay: 'Claude 3 Opus',
    status: 'deprecated',
    sunsetDate: '2026-07-06',
    replacement: 'claude-opus-4-8',
    sourceUrl: 'https://www.anthropic.com',
    days_until_deprecation: null,
    days_until_sunset: 30,
    days_since_sunset: null,
    urgency_band: 'within_30d',
    migration_chain: ['claude-opus-4-8'],
    ...over,
  };
}

const SRC = (over: Partial<MigrationSources> = {}): MigrationSources => ({ deprecations: [dep()], pricing: PRICING, intelligence: INTEL, ...over });

describe('/api/premium/model-migration-verdict', () => {
  it('rules MIGRATE_NOW on a near-sunset model and computes deltas', () => {
    const r = buildMigrationVerdict('claude-3-opus', null, SRC(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('MIGRATE_NOW');
    expect(r.successor?.id).toBe('claude-opus-4-8');
    expect(r.deltas?.cost_blended_per_1m).toBe(0);
    expect(r.deltas?.capability_tfii).toBe(18);
    expect(r.drop_in?.same_provider).toBe(true);
  });

  it('rules NO_ACTION for a recognized current model not in the registry', () => {
    const r = buildMigrationVerdict('gpt-5', null, SRC({ deprecations: [] }), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('NO_ACTION');
    expect(r.deprecation).toBeNull();
    expect(r.model.capability_tfii).toBe(88);
  });

  it('no-charges (model_not_recognized) for a model in no source', () => {
    const r = buildMigrationVerdict('totally-unknown', null, SRC({ deprecations: [] }), NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('model_not_recognized');
  });

  it('reconciles a caller deadline against the sunset date', () => {
    const r = buildMigrationVerdict('claude-3-opus', '2026-08-01', SRC(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deadline?.sunset_before_deadline).toBe(true); // sunset 30d < deadline ~56d
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const ok = buildMigrationVerdict('claude-3-opus', '2026-08-01', SRC(), NOW);
    const empty = buildMigrationVerdict('nope', null, SRC({ deprecations: [] }), NOW);
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
