import { describe, it, expect } from 'vitest';
import { normalizeModel, summarize, ORModel } from './openrouter-catalog';

describe('normalizeModel', () => {
  it('extracts core fields from a representative payload', () => {
    const m = normalizeModel({
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'High-end Anthropic model',
      created: 1714000000,
      context_length: 200000,
      architecture: { modality: 'text+image->text', instruct_type: 'claude', tokenizer: 'Claude' },
      pricing: { prompt: '0.000003', completion: '0.000015', image: '0.0048', request: '0' },
      top_provider: { max_completion_tokens: 8192, is_moderated: true },
      supported_parameters: ['temperature', 'top_p', 'tools'],
    });
    expect(m).not.toBeNull();
    expect(m!.id).toBe('anthropic/claude-3.5-sonnet');
    expect(m!.name).toBe('Claude 3.5 Sonnet');
    expect(m!.context_length).toBe(200000);
    expect(m!.modality).toBe('text+image->text');
    expect(m!.instruct_type).toBe('claude');
    expect(m!.pricing.prompt).toBeCloseTo(0.000003, 9);
    expect(m!.pricing.completion).toBeCloseTo(0.000015, 9);
    expect(m!.pricing.image).toBeCloseTo(0.0048, 5);
    expect(m!.pricing.request).toBe(0);
    expect(m!.top_provider.max_completion_tokens).toBe(8192);
    expect(m!.supported_parameters).toEqual(['temperature', 'top_p', 'tools']);
  });

  it('returns null when id is missing', () => {
    expect(normalizeModel({})).toBeNull();
    expect(normalizeModel({ id: '' })).toBeNull();
  });

  it('falls back to id for name when name is absent', () => {
    const m = normalizeModel({ id: 'foo/bar' });
    expect(m!.name).toBe('foo/bar');
  });

  it('synthesizes modality from input/output when modality field missing', () => {
    const m = normalizeModel({
      id: 'a/b',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    });
    expect(m!.modality).toBe('text+image->text');
  });

  it('caps long descriptions', () => {
    const m = normalizeModel({ id: 'a/b', description: 'x'.repeat(2000) });
    expect(m!.description!.length).toBeLessThanOrEqual(600);
    expect(m!.description!.endsWith('…')).toBe(true);
  });

  it('parses string-valued prices into numbers', () => {
    const m = normalizeModel({
      id: 'a/b',
      pricing: { prompt: '0.000001', completion: '0.000002' },
    });
    expect(m!.pricing.prompt).toBeCloseTo(0.000001, 9);
    expect(m!.pricing.completion).toBeCloseTo(0.000002, 9);
  });

  it('coerces unparseable price strings to null', () => {
    const m = normalizeModel({
      id: 'a/b',
      pricing: { prompt: 'free', completion: '' },
    });
    expect(m!.pricing.prompt).toBeNull();
    expect(m!.pricing.completion).toBeNull();
  });

  it('handles missing optional fields safely', () => {
    const m = normalizeModel({ id: 'a/b' });
    expect(m!.description).toBeNull();
    expect(m!.created).toBeNull();
    expect(m!.context_length).toBeNull();
    expect(m!.modality).toBeNull();
    expect(m!.instruct_type).toBeNull();
    expect(m!.tokenizer).toBeNull();
    expect(m!.pricing).toEqual({ prompt: null, completion: null, image: null, request: null });
    expect(m!.supported_parameters).toEqual([]);
  });
});

const sample = (over: Partial<ORModel>): ORModel => ({
  id: 'a/b',
  name: 'A/B',
  description: null,
  created: null,
  context_length: null,
  modality: null,
  instruct_type: null,
  tokenizer: null,
  pricing: { prompt: null, completion: null, image: null, request: null },
  top_provider: { max_completion_tokens: null, is_moderated: null },
  supported_parameters: [],
  ...over,
});

describe('summarize', () => {
  it('counts models by namespace and modality', () => {
    const s = summarize([
      sample({ id: 'anthropic/claude-3.5-sonnet', modality: 'text+image->text' }),
      sample({ id: 'anthropic/claude-3-opus', modality: 'text->text' }),
      sample({ id: 'openai/gpt-4o', modality: 'text+image->text' }),
    ]);
    expect(s.by_namespace[0]).toEqual({ namespace: 'anthropic', count: 2 });
    expect(s.by_namespace).toContainEqual({ namespace: 'openai', count: 1 });
    expect(s.by_modality['text+image->text']).toBe(2);
    expect(s.by_modality['text->text']).toBe(1);
  });

  it('finds the cheapest input and output models, ignoring free-tier zero prices', () => {
    const s = summarize([
      sample({ id: 'free/free', pricing: { prompt: 0, completion: 0, image: null, request: null } }),
      sample({ id: 'cheap/in', pricing: { prompt: 0.0000005, completion: 0.000005, image: null, request: null } }),
      sample({ id: 'cheap/out', pricing: { prompt: 0.000003, completion: 0.000001, image: null, request: null } }),
    ]);
    expect(s.cheapest_input!.id).toBe('cheap/in');
    expect(s.cheapest_input!.usd_per_million).toBeCloseTo(0.5, 5);
    expect(s.cheapest_output!.id).toBe('cheap/out');
    expect(s.free_tier_count).toBe(1);
  });

  it('finds the largest context length', () => {
    const s = summarize([
      sample({ id: 'a/small', context_length: 8000 }),
      sample({ id: 'b/big', context_length: 1_000_000 }),
      sample({ id: 'c/mid', context_length: 200_000 }),
    ]);
    expect(s.largest_context).toEqual({ id: 'b/big', tokens: 1_000_000 });
  });

  it('returns null trackers when there is nothing to rank', () => {
    const s = summarize([]);
    expect(s.cheapest_input).toBeNull();
    expect(s.cheapest_output).toBeNull();
    expect(s.largest_context).toBeNull();
    expect(s.free_tier_count).toBe(0);
  });
});
