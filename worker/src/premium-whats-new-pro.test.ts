import { describe, it, expect } from 'vitest';
import {
  assignDataIds,
  validateProBlock,
  buildUserPrompt,
  deriveCacheKey,
  type DataIds,
} from './premium-whats-new-pro';
import type { WhatsNewResult } from './whats-new';

// ── Helpers ─────────────────────────────────────────────────────────

function baseFixture(over: Partial<WhatsNewResult> = {}): WhatsNewResult {
  return {
    ok: true,
    window: { from: '2026-05-26', to: '2026-05-27', days: 1 },
    computed_at: '2026-05-26T08:00:00Z',
    summary: {
      total_pricing_changes: 1,
      new_models: 1,
      removed_models: 0,
      incidents: 1,
      news_articles: 2,
    },
    pricing: {
      changes: [
        { model: 'Claude Opus 4.7', provider: 'anthropic', field: 'inputPrice', from: 15, to: 14, delta_pct: -6.6667 },
      ],
      new_models: [
        { model: 'Sonnet 4.7', provider: 'anthropic', input_per_1m: 3, output_per_1m: 15, tier: 'mid' },
      ],
      removed_models: [],
    },
    status: {
      incidents: [
        {
          service: 'API',
          provider: 'openai',
          severity: 'minor',
          title: 'Elevated latency for ChatGPT',
          started_at: '2026-05-26T01:00:00Z',
          resolved_at: '2026-05-26T02:30:00Z',
          duration_minutes: 90,
        },
      ],
      currently_operational: 12,
      currently_degraded: 1,
      currently_down: 0,
      currently_unknown: 0,
    },
    news: [
      {
        title: 'Anthropic announces Sonnet 4.7',
        url: 'https://anthropic.com/news/sonnet-4-7',
        source: 'Anthropic',
        source_domain: 'anthropic.com',
        published_at: '2026-05-26T15:00:00Z',
        snippet: 'New mid-tier model',
        categories: ['model_release'],
      },
      {
        title: 'OpenAI status incident summary',
        url: 'https://status.openai.com/incidents/abc',
        source: 'OpenAI Status',
        source_domain: 'status.openai.com',
        published_at: '2026-05-26T03:00:00Z',
        snippet: 'Latency event',
        categories: ['status'],
      },
    ],
    news_attribution: {
      source: 'TensorFeed.ai',
      license: 'editorial',
      notes: 'test fixture',
    },
    data_freshness: { pricing: '2026-05-26T07:00:00Z', status: '2026-05-26T07:55:00Z', incidents_count: 1, news_total_corpus: 2 },
    notes: [],
    ...over,
  };
}

function dataIdsFromFixture(base: WhatsNewResult): DataIds {
  return assignDataIds(base);
}

// ── assignDataIds ───────────────────────────────────────────────────

describe('assignDataIds', () => {
  it('assigns sequential IDs across all row types', () => {
    const ids = assignDataIds(baseFixture());
    expect(Object.keys(ids.pricing_changes)).toEqual(['c1']);
    expect(Object.keys(ids.new_models)).toEqual(['m1']);
    expect(Object.keys(ids.removed_models)).toEqual([]);
    expect(Object.keys(ids.incidents)).toEqual(['i1']);
    expect(Object.keys(ids.news)).toEqual(['n1', 'n2']);
  });

  it('is deterministic across multiple calls on same data', () => {
    const a = assignDataIds(baseFixture());
    const b = assignDataIds(baseFixture());
    expect(a).toEqual(b);
  });

  it('handles empty payload', () => {
    const empty = baseFixture({
      pricing: { changes: [], new_models: [], removed_models: [] },
      status: { incidents: [], currently_operational: 0, currently_degraded: 0, currently_down: 0, currently_unknown: 0 },
      news: [],
    });
    const ids = assignDataIds(empty);
    expect(Object.keys(ids.pricing_changes)).toEqual([]);
    expect(Object.keys(ids.news)).toEqual([]);
  });
});

// ── buildUserPrompt ─────────────────────────────────────────────────

describe('buildUserPrompt', () => {
  it('includes window + ID references', () => {
    const base = baseFixture();
    const ids = assignDataIds(base);
    const prompt = buildUserPrompt(base, ids);
    expect(prompt).toContain('WINDOW: 2026-05-26 to 2026-05-27');
    expect(prompt).toContain('c1:');
    expect(prompt).toContain('m1:');
    expect(prompt).toContain('i1:');
    expect(prompt).toContain('n1:');
  });

  it('omits empty sections', () => {
    const empty = baseFixture({
      pricing: { changes: [], new_models: [], removed_models: [] },
    });
    const prompt = buildUserPrompt(empty, assignDataIds(empty));
    expect(prompt).not.toContain('PRICING_CHANGES:');
    expect(prompt).not.toContain('NEW_MODELS:');
    // Status + news still present
    expect(prompt).toContain('STATUS_INCIDENTS:');
    expect(prompt).toContain('NEWS:');
  });
});

// ── deriveCacheKey ──────────────────────────────────────────────────

describe('deriveCacheKey', () => {
  it('returns deterministic key for same window + base data', async () => {
    const base = baseFixture();
    const a = await deriveCacheKey(base.window, 10, base);
    const b = await deriveCacheKey(base.window, 10, base);
    expect(a).toBe(b);
    expect(a.startsWith('whats-new-pro:')).toBe(true);
  });

  it('differs when base data changes', async () => {
    const base1 = baseFixture();
    const base2 = baseFixture({
      pricing: {
        changes: [{ model: 'Different', provider: 'anthropic', field: 'inputPrice', from: 10, to: 9, delta_pct: -10 }],
        new_models: [],
        removed_models: [],
      },
    });
    const a = await deriveCacheKey(base1.window, 10, base1);
    const b = await deriveCacheKey(base2.window, 10, base2);
    expect(a).not.toBe(b);
  });

  it('differs when news limit changes', async () => {
    const base = baseFixture();
    const a = await deriveCacheKey(base.window, 10, base);
    const b = await deriveCacheKey(base.window, 25, base);
    expect(a).not.toBe(b);
  });
});

// ── validateProBlock ────────────────────────────────────────────────

function goodBlock(over: Record<string, unknown> = {}) {
  return {
    analyst_summary:
      'Anthropic cut Claude Opus 4.7 input pricing by 7 percent to 14 USD per million tokens. OpenAI experienced a minor 90 minute latency event on the ChatGPT API. New Sonnet 4.7 mid tier model announced.',
    key_takeaways: [
      { claim: 'Anthropic cut Claude Opus 4.7 input pricing', basis: ['c1'], confidence: 0.98 },
      { claim: 'OpenAI had a minor latency event', basis: ['i1'], confidence: 0.95 },
    ],
    recommended_actions: [
      { for: 'cost-bound', action: 'Re-evaluate Claude Opus as primary model', priority: 'monitor', basis: ['c1'] },
    ],
    ...over,
  };
}

describe('validateProBlock', () => {
  const ids = dataIdsFromFixture(baseFixture());

  it('accepts a well-formed block', () => {
    const r = validateProBlock(goodBlock(), ids);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.block.key_takeaways.length).toBe(2);
      expect(r.block.recommended_actions.length).toBe(1);
    }
  });

  it('rejects non-object input', () => {
    const r = validateProBlock('nope', ids);
    expect(r.ok).toBe(false);
  });

  it('rejects analyst_summary with em dash', () => {
    const r = validateProBlock(goodBlock({ analyst_summary: 'Pricing dropped — by 7 percent. More than 100 characters needed here to make sure the length check does not fire first instead.' }), ids);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('forbidden_chars');
  });

  it('rejects analyst_summary with double hyphen', () => {
    const r = validateProBlock(goodBlock({ analyst_summary: 'Pricing dropped -- by 7 percent. More than 100 characters needed here to make sure the length check does not fire first instead.' }), ids);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('forbidden_chars');
  });

  it('rejects analyst_summary too short', () => {
    const r = validateProBlock(goodBlock({ analyst_summary: 'short' }), ids);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_summary_length');
  });

  it('rejects analyst_summary too long', () => {
    const r = validateProBlock(goodBlock({ analyst_summary: 'x'.repeat(2500) }), ids);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_summary_length');
  });

  it('rejects basis ID that is not in data_ids', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [{ claim: 'Something happened today', basis: ['z99'], confidence: 0.9 }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('unresolved_basis_id');
  });

  it('rejects confidence out of range', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [{ claim: 'Anthropic cut pricing', basis: ['c1'], confidence: 1.5 }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects unknown agent class', () => {
    const r = validateProBlock(
      goodBlock({
        recommended_actions: [{ for: 'magic-agent', action: 'Do something useful', priority: 'monitor', basis: [] }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects unknown priority value', () => {
    const r = validateProBlock(
      goodBlock({
        recommended_actions: [{ for: 'cost-bound', action: 'Do something useful', priority: 'urgent_now', basis: [] }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('accepts empty basis array on recommended_action (no_action case)', () => {
    const r = validateProBlock(
      goodBlock({
        recommended_actions: [{ for: 'security-watchful', action: 'No security incidents in window', priority: 'no_action', basis: [] }],
      }),
      ids,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects key_takeaways with empty basis array', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [{ claim: 'Something happened', basis: [], confidence: 0.9 }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects key_takeaways with too many items', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: Array.from({ length: 6 }, () => ({ claim: 'Anthropic cut pricing', basis: ['c1'], confidence: 0.9 })),
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects too-short claim', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [{ claim: 'short', basis: ['c1'], confidence: 0.9 }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects too-long action', () => {
    const r = validateProBlock(
      goodBlock({
        recommended_actions: [{ for: 'cost-bound', action: 'x'.repeat(400), priority: 'monitor', basis: ['c1'] }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects too many basis entries', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [
          { claim: 'Anthropic cut pricing', basis: ['c1', 'c1', 'c1', 'c1', 'c1', 'c1'], confidence: 0.9 },
        ],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects recommended_actions out of count range', () => {
    const r = validateProBlock(
      goodBlock({
        recommended_actions: Array.from({ length: 5 }, () => ({ for: 'cost-bound', action: 'Re-evaluate models', priority: 'monitor', basis: ['c1'] })),
      }),
      ids,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects claim with em dash', () => {
    const r = validateProBlock(
      goodBlock({
        key_takeaways: [{ claim: 'Anthropic cut pricing — by 7 percent', basis: ['c1'], confidence: 0.9 }],
      }),
      ids,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('forbidden_chars');
  });
});
