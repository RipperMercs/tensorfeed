import { describe, it, expect } from 'vitest';
import { normalizeModel, normalizeDataset, summarize, HFModelEntry, HFDatasetEntry } from './hf-trending';

describe('normalizeModel', () => {
  it('returns null when id is missing', () => {
    expect(normalizeModel({})).toBeNull();
    expect(normalizeModel({ id: '' })).toBeNull();
  });

  it('falls back to modelId when id is absent', () => {
    const m = normalizeModel({ modelId: 'foo/bar' });
    expect(m!.id).toBe('foo/bar');
  });

  it('coerces missing numeric fields to 0', () => {
    const m = normalizeModel({ id: 'a/b' });
    expect(m!.downloads).toBe(0);
    expect(m!.likes).toBe(0);
  });

  it('preserves pipeline_tag and tags', () => {
    const m = normalizeModel({
      id: 'a/b',
      pipeline_tag: 'text-generation',
      tags: ['llama', 'transformers'],
    });
    expect(m!.pipeline_tag).toBe('text-generation');
    expect(m!.tags).toEqual(['llama', 'transformers']);
  });

  it('defaults gated to false when undefined', () => {
    expect(normalizeModel({ id: 'a/b' })!.gated).toBe(false);
    expect(normalizeModel({ id: 'a/b', gated: 'auto' })!.gated).toBe('auto');
  });

  it('drops non-string entries from tags', () => {
    const m = normalizeModel({ id: 'a/b', tags: ['ok', 123 as unknown as string, 'also-ok'] });
    expect(m!.tags).toEqual(['ok', 'also-ok']);
  });
});

describe('normalizeDataset', () => {
  it('returns null when id is missing', () => {
    expect(normalizeDataset({})).toBeNull();
  });

  it('extracts core fields', () => {
    const d = normalizeDataset({
      id: 'org/data',
      downloads: 1000,
      likes: 50,
      tags: ['vision'],
      lastModified: '2026-04-01T00:00:00Z',
    });
    expect(d!.id).toBe('org/data');
    expect(d!.downloads).toBe(1000);
    expect(d!.likes).toBe(50);
    expect(d!.lastModified).toBe('2026-04-01T00:00:00Z');
  });
});

const sampleModel = (over: Partial<HFModelEntry>): HFModelEntry => ({
  id: 'a/b',
  downloads: 0,
  likes: 0,
  pipeline_tag: null,
  tags: [],
  lastModified: null,
  private: false,
  gated: false,
  ...over,
});

const sampleDataset = (over: Partial<HFDatasetEntry>): HFDatasetEntry => ({
  id: 'a/d',
  downloads: 0,
  likes: 0,
  tags: [],
  lastModified: null,
  private: false,
  gated: false,
  ...over,
});

describe('summarize', () => {
  it('counts pipeline tags from models only', () => {
    const s = summarize(
      [
        sampleModel({ id: 'a/m1', pipeline_tag: 'text-generation' }),
        sampleModel({ id: 'a/m2', pipeline_tag: 'text-generation' }),
        sampleModel({ id: 'b/m3', pipeline_tag: 'feature-extraction' }),
      ],
      [],
    );
    expect(s.top_pipeline_tags[0]).toEqual({ tag: 'text-generation', count: 2 });
    expect(s.top_pipeline_tags).toContainEqual({ tag: 'feature-extraction', count: 1 });
  });

  it('counts namespaces across models and datasets', () => {
    const s = summarize(
      [sampleModel({ id: 'meta/m1' }), sampleModel({ id: 'meta/m2' })],
      [sampleDataset({ id: 'meta/d1' }), sampleDataset({ id: 'openai/d2' })],
    );
    expect(s.top_namespaces[0]).toEqual({ namespace: 'meta', count: 3 });
    expect(s.top_namespaces).toContainEqual({ namespace: 'openai', count: 1 });
  });

  it('handles empty inputs', () => {
    const s = summarize([], []);
    expect(s.top_pipeline_tags).toEqual([]);
    expect(s.top_namespaces).toEqual([]);
  });

  it('skips models with no pipeline tag', () => {
    const s = summarize(
      [sampleModel({ id: 'a/m', pipeline_tag: null }), sampleModel({ id: 'b/m', pipeline_tag: 'text-classification' })],
      [],
    );
    expect(s.top_pipeline_tags).toEqual([{ tag: 'text-classification', count: 1 }]);
  });
});
