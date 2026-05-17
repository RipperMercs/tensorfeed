import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  normalizeRow,
  summarize,
  EPOCH_ATTRIBUTION,
  type EpochModel,
} from './ai-training-compute';

describe('parseCsv (the load-bearing parser)', () => {
  it('parses a simple row', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('Model,Domain\nGPT,"Multimodal,Language,Vision"')).toEqual([
      ['Model', 'Domain'],
      ['GPT', 'Multimodal,Language,Vision'],
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsv('note\n"she said ""hi"" loudly"')).toEqual([
      ['note'],
      ['she said "hi" loudly'],
    ]);
  });

  it('keeps newlines inside a quoted field', () => {
    const rows = parseCsv('a,b\n"line1\nline2",x');
    expect(rows).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });

  it('handles CRLF line endings and a trailing newline without a blank row', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('skips blank lines but keeps empty trailing fields', () => {
    expect(parseCsv('a,b,c\n\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

function rec(over: Record<string, string> = {}): Record<string, string> {
  return {
    Model: 'Test-Model',
    Organization: 'OpenAI',
    'Organization categorization': 'Industry',
    Domain: 'Language',
    Task: 'Language modeling/generation',
    'Publication date': '2026-04-23',
    Parameters: '1600000000000.0',
    'Training compute (FLOP)': '9.702e+24',
    'Training dataset size (total)': '33000000000000',
    'Training compute cost (2023 USD)': '12500000',
    'Training power draw (W)': '',
    'Frontier model': 'True',
    'Notability criteria': 'Discretionary',
    'Country (of organization)': 'United States of America',
    'Model accessibility': 'API access',
    Link: 'https://openai.com/index/introducing-gpt-5-5/',
    'Last modified': '2026-04-29 15:04:34+00:00',
    ...over,
  };
}

describe('normalizeRow', () => {
  it('maps a full record with correct types', () => {
    const m = normalizeRow(rec());
    expect(m).not.toBeNull();
    expect(m!.model).toBe('Test-Model');
    expect(m!.training_compute_flop).toBe(9.702e24);
    expect(m!.parameters).toBe(1.6e12);
    expect(m!.training_dataset_size).toBe(33000000000000);
    expect(m!.training_compute_cost_usd_2023).toBe(12500000);
    expect(m!.training_power_draw_w).toBeNull();
    expect(m!.frontier_model).toBe(true);
    expect(m!.publication_date).toBe('2026-04-23');
  });

  it('returns null when the model name is absent', () => {
    expect(normalizeRow(rec({ Model: '' }))).toBeNull();
    expect(normalizeRow(rec({ Model: '   ' }))).toBeNull();
  });

  it('rejects a notes-leaked numeric as null, never a guess', () => {
    expect(normalizeRow(rec({ Parameters: '1.6T total, 49B active' }))!.parameters).toBeNull();
    expect(normalizeRow(rec({ 'Training compute (FLOP)': 'unknown' }))!.training_compute_flop).toBeNull();
  });

  it('parses booleans strictly (true/false/yes/no else null)', () => {
    expect(normalizeRow(rec({ 'Frontier model': 'No' }))!.frontier_model).toBe(false);
    expect(normalizeRow(rec({ 'Frontier model': 'Unreleased' }))!.frontier_model).toBeNull();
    expect(normalizeRow(rec({ 'Frontier model': '' }))!.frontier_model).toBeNull();
  });

  it('normalizes a timestamped date to YYYY-MM-DD and rejects garbled', () => {
    expect(normalizeRow(rec({ 'Publication date': '2026-05-13 15:08:42+00:00' }))!.publication_date).toBe('2026-05-13');
    expect(normalizeRow(rec({ 'Publication date': 'circa 2019' }))!.publication_date).toBeNull();
    expect(normalizeRow(rec({ 'Publication date': '' }))!.publication_date).toBeNull();
  });
});

describe('summarize', () => {
  const models: EpochModel[] = [
    normalizeRow(rec({ Model: 'A', Organization: 'OpenAI', 'Training compute (FLOP)': '1e24', 'Publication date': '2024-01-01', 'Frontier model': 'True' }))!,
    normalizeRow(rec({ Model: 'B', Organization: 'OpenAI', 'Training compute (FLOP)': '5e25', 'Publication date': '2026-04-23', 'Frontier model': 'False' }))!,
    normalizeRow(rec({ Model: 'C', Organization: 'DeepMind', 'Training compute (FLOP)': '', 'Publication date': '2025-06-15', 'Frontier model': 'True' }))!,
  ];

  it('computes counts, max compute, and date range', () => {
    const s = summarize(models);
    expect(s.with_training_compute).toBe(2);
    expect(s.frontier_count).toBe(2);
    expect(s.max_training_compute_flop).toEqual({ model: 'B', flop: 5e25 });
    expect(s.publication_date_range).toEqual({ earliest: '2024-01-01', latest: '2026-04-23' });
    expect(s.by_organization[0]).toEqual({ organization: 'OpenAI', count: 2 });
  });
});

describe('attribution', () => {
  it('is CC-BY-4.0 with Epoch AI credit (license-required, must ship in payload)', () => {
    expect(EPOCH_ATTRIBUTION.license).toBe('CC-BY-4.0');
    expect(EPOCH_ATTRIBUTION.source).toBe('Epoch AI');
    expect(EPOCH_ATTRIBUTION.source_url).toContain('epoch.ai');
  });
});
