import { describe, it, expect } from 'vitest';
import {
  validateExtraction,
  validateBatch,
  MAX_FILINGS_PER_BATCH,
  MAX_CONTEXT_LEN,
  type FilingExtraction,
} from './sec-filings-extraction';
import {
  buildAiFlaggedResponse,
  buildByFormResponse,
  buildIndexResponse,
  parseTickerFilter,
  parseFormFilter,
  parseSinceFilter,
  parseMinScoreFilter,
  INDEX_MAX_LIMIT,
} from './premium-sec-filings';

// ── Helpers ─────────────────────────────────────────────────────────

function baseFiling(over: Partial<FilingExtraction> = {}): FilingExtraction {
  return {
    accession_number: '0001045810-25-000123',
    cik: '0001045810',
    ticker: 'NVDA',
    company_name: 'NVIDIA',
    form: '10-K',
    filing_date: '2025-12-12',
    ai_relevant: true,
    ai_relevance_score: 90,
    ai_keyword_hits: ['artificial intelligence', 'GPU'],
    ai_capex_mentions: [],
    ai_revenue_mentions: [],
    ai_partnership_mentions: [],
    ai_chip_mentions: [],
    new_ai_products_announced: [],
    ai_workforce_changes: [],
    key_quotes: [],
    extracted_by: 'qwen-3.6-27b',
    extracted_at: '2026-05-26T00:00:00Z',
    ...over,
  };
}

function batchOf(filings: FilingExtraction[]) {
  return {
    batch_id: 'test-batch-001',
    extracted_at: '2026-05-26T00:00:00Z',
    filings,
  };
}

// ── validateExtraction ──────────────────────────────────────────────

describe('validateExtraction', () => {
  it('accepts a minimal valid filing', () => {
    const r = validateExtraction(baseFiling());
    expect(r.ok).toBe(true);
  });

  it('rejects non-object input', () => {
    const r = validateExtraction('nope');
    expect(r.ok).toBe(false);
  });

  it('rejects bad accession_number format', () => {
    const r = validateExtraction(baseFiling({ accession_number: 'CVE-2024-1234' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_accession');
  });

  it('rejects cik not 10-digit', () => {
    const r = validateExtraction(baseFiling({ cik: '1045810' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_cik');
  });

  it('rejects filing_date not YYYY-MM-DD', () => {
    const r = validateExtraction(baseFiling({ filing_date: '12/12/2025' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_filing_date');
  });

  it('rejects ai_relevance_score over 100', () => {
    const r = validateExtraction(baseFiling({ ai_relevance_score: 101 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_score');
  });

  it('rejects ai_relevance_score below 0', () => {
    const r = validateExtraction(baseFiling({ ai_relevance_score: -1 }));
    expect(r.ok).toBe(false);
  });

  it('rejects extracted_at not ISO 8601 UTC', () => {
    const r = validateExtraction(baseFiling({ extracted_at: '2026-05-26 00:00:00' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_extracted_at');
  });

  it('rejects em dash in context strings', () => {
    const f = baseFiling({
      ai_capex_mentions: [
        {
          amount_usd: 1000000000,
          range_low_usd: null,
          range_high_usd: null,
          context: 'AI capex — expanded materially this quarter',
          forward_looking: false,
        },
      ],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('em_dash_in_context');
  });

  it('rejects bad relationship_type enum', () => {
    const f = baseFiling({
      ai_partnership_mentions: [
        {
          partner_name: 'Foxconn',
          relationship_type: 'strategic_alliance' as never,
          context: 'multi-year strategic collaboration',
        },
      ],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_enum');
  });

  it('rejects bad chip vendor enum', () => {
    const f = baseFiling({
      ai_chip_mentions: [
        {
          vendor: 'cerebras' as never,
          chip_or_product: 'CS-3',
          context: 'deploying Cerebras CS-3 wafer-scale chips',
        },
      ],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_enum');
  });

  it('rejects bad workforce change_type enum', () => {
    const f = baseFiling({
      ai_workforce_changes: [
        {
          change_type: 'reorganization' as never,
          headcount_affected: 200,
          summary: 'AI research team restructured',
        },
      ],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_enum');
  });

  it('rejects null where array expected', () => {
    const f = baseFiling({ ai_capex_mentions: null as unknown as [] });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_field');
  });

  it('rejects amount_usd as string', () => {
    const f = baseFiling({
      ai_capex_mentions: [
        {
          amount_usd: '1000000000' as unknown as number,
          range_low_usd: null,
          range_high_usd: null,
          context: 'AI capex expanded materially this quarter',
          forward_looking: false,
        },
      ],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(false);
  });

  it('accepts a populated filing with all mention types', () => {
    const f = baseFiling({
      ai_capex_mentions: [{
        amount_usd: 19400000000,
        range_low_usd: null,
        range_high_usd: null,
        context: 'Capital expenditures were 19.4 billion this quarter',
        forward_looking: false,
      }],
      ai_revenue_mentions: [{
        amount_usd: null,
        period: 'Q1 FY26',
        context: 'Azure AI services revenue grew triple digits',
        forward_looking: false,
      }],
      ai_partnership_mentions: [{
        partner_name: 'Foxconn',
        relationship_type: 'joint_venture',
        context: 'multi-year strategic collaboration',
      }],
      ai_chip_mentions: [{
        vendor: 'nvidia',
        chip_or_product: 'H100',
        context: 'powered by NVIDIA H100 GPUs',
      }],
      new_ai_products_announced: [{
        product_name: 'Vision 2.0',
        category: 'model',
        announcement_summary: 'next-generation vision model',
      }],
      ai_workforce_changes: [{
        change_type: 'hiring',
        headcount_affected: 500,
        summary: 'hired 500 AI engineers',
      }],
      key_quotes: [{
        quote: 'AI factories are the foundation of intelligence infrastructure',
        section: 'MD&A',
      }],
    });
    const r = validateExtraction(f);
    expect(r.ok).toBe(true);
  });
});

// ── validateBatch ───────────────────────────────────────────────────

describe('validateBatch', () => {
  it('accepts a valid single-filing batch', () => {
    const r = validateBatch(batchOf([baseFiling()]));
    expect(r.ok).toBe(true);
  });

  it('rejects empty filings array', () => {
    const r = validateBatch(batchOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('empty_filings');
  });

  it('rejects too many filings', () => {
    const big = Array.from({ length: MAX_FILINGS_PER_BATCH + 1 }, (_, i) =>
      baseFiling({ accession_number: `0001045810-25-${String(i).padStart(6, '0')}` }),
    );
    const r = validateBatch(batchOf(big));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('too_many_filings');
  });

  it('rejects duplicate accession_numbers in batch', () => {
    const r = validateBatch(batchOf([baseFiling(), baseFiling()]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('duplicate_accession');
  });

  it('rejects bad batch_id', () => {
    const r = validateBatch({ ...batchOf([baseFiling()]), batch_id: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_batch_id');
  });

  it('returns filing index on per-filing failure', () => {
    const r = validateBatch(
      batchOf([
        baseFiling(),
        baseFiling({ accession_number: 'BADFORMAT' }),
      ]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('bad_accession');
      expect(r.index).toBe(1);
    }
  });
});

// ── parsers ──────────────────────────────────────────────────────────

describe('filter parsers', () => {
  it('parseTickerFilter uppercases and rejects empties', () => {
    expect(parseTickerFilter('nvda')).toBe('NVDA');
    expect(parseTickerFilter('  msft  ')).toBe('MSFT');
    expect(parseTickerFilter(null)).toBe(null);
    expect(parseTickerFilter('')).toBe(null);
    expect(parseTickerFilter('TOOLONGTICKER12')).toBe(null);
  });

  it('parseFormFilter accepts SEC form strings', () => {
    expect(parseFormFilter('10-K')).toBe('10-K');
    expect(parseFormFilter('10-k')).toBe('10-K');
    expect(parseFormFilter('DEF 14A')).toBe('DEF 14A');
    expect(parseFormFilter(null)).toBe(null);
  });

  it('parseSinceFilter accepts YYYY-MM-DD only', () => {
    expect(parseSinceFilter('2025-12-12')).toBe('2025-12-12');
    expect(parseSinceFilter('12/12/2025')).toBe(null);
    expect(parseSinceFilter('2025')).toBe(null);
    expect(parseSinceFilter(null)).toBe(null);
  });

  it('parseMinScoreFilter clamps to valid 0-100 range', () => {
    expect(parseMinScoreFilter('70')).toBe(70);
    expect(parseMinScoreFilter('0')).toBe(0);
    expect(parseMinScoreFilter('100')).toBe(100);
    expect(parseMinScoreFilter('-1')).toBe(null);
    expect(parseMinScoreFilter('101')).toBe(null);
    expect(parseMinScoreFilter('nope')).toBe(null);
    expect(parseMinScoreFilter(null)).toBe(null);
  });
});

// ── buildAiFlaggedResponse ──────────────────────────────────────────

describe('buildAiFlaggedResponse', () => {
  const emptyFilter = { ticker: null, form: null, since: null, min_score: null };

  it('returns empty cohort when snapshot is null', () => {
    const r = buildAiFlaggedResponse(null, emptyFilter);
    expect(r.cohort.total_after_filter).toBe(0);
    expect(r.filings).toEqual([]);
  });

  it('returns all filings when no filter', () => {
    const r = buildAiFlaggedResponse(
      { batch_id: 'b', extracted_at: '2026-05-26T00:00:00Z', filings: [baseFiling()] },
      emptyFilter,
    );
    expect(r.cohort.total_after_filter).toBe(1);
  });

  it('filters by ticker case-insensitively', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', ticker: 'NVDA' }),
        baseFiling({ accession_number: '0000789019-25-000001', ticker: 'MSFT', cik: '0000789019' }),
      ],
    };
    const r = buildAiFlaggedResponse(snap, { ...emptyFilter, ticker: 'msft' });
    expect(r.cohort.total_after_filter).toBe(1);
    expect(r.filings[0].ticker).toBe('MSFT');
  });

  it('filters by form', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', form: '10-K' }),
        baseFiling({ accession_number: '0001045810-25-000002', form: '8-K' }),
      ],
    };
    const r = buildAiFlaggedResponse(snap, { ...emptyFilter, form: '10-K' });
    expect(r.cohort.total_after_filter).toBe(1);
  });

  it('filters by since (inclusive)', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', filing_date: '2025-01-01' }),
        baseFiling({ accession_number: '0001045810-25-000002', filing_date: '2025-06-01' }),
        baseFiling({ accession_number: '0001045810-25-000003', filing_date: '2025-12-01' }),
      ],
    };
    const r = buildAiFlaggedResponse(snap, { ...emptyFilter, since: '2025-06-01' });
    expect(r.cohort.total_after_filter).toBe(2);
  });

  it('filters by min_score (inclusive)', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', ai_relevance_score: 60 }),
        baseFiling({ accession_number: '0001045810-25-000002', ai_relevance_score: 90 }),
      ],
    };
    const r = buildAiFlaggedResponse(snap, { ...emptyFilter, min_score: 70 });
    expect(r.cohort.total_after_filter).toBe(1);
    expect(r.filings[0].ai_relevance_score).toBe(90);
  });

  it('sorts by filing_date desc then score desc', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', filing_date: '2025-06-01', ai_relevance_score: 50 }),
        baseFiling({ accession_number: '0001045810-25-000002', filing_date: '2025-06-01', ai_relevance_score: 90 }),
        baseFiling({ accession_number: '0001045810-25-000003', filing_date: '2025-12-01', ai_relevance_score: 70 }),
      ],
    };
    const r = buildAiFlaggedResponse(snap, emptyFilter);
    expect(r.filings.map((f) => f.accession_number)).toEqual([
      '0001045810-25-000003',
      '0001045810-25-000002',
      '0001045810-25-000001',
    ]);
  });
});

// ── buildByFormResponse ─────────────────────────────────────────────

describe('buildByFormResponse', () => {
  it('returns empty by_form when snapshot is null', () => {
    const r = buildByFormResponse(null, { ticker: null, form: null });
    expect(r.by_form).toEqual([]);
  });

  it('groups by form with aggregate stats', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', form: '10-K', ai_relevance_score: 80 }),
        baseFiling({ accession_number: '0001045810-25-000002', form: '10-K', ai_relevance_score: 60 }),
        baseFiling({ accession_number: '0001045810-25-000003', form: '8-K', ai_relevance_score: 90 }),
      ],
    };
    const r = buildByFormResponse(snap, { ticker: null, form: null });
    expect(r.by_form.length).toBe(2);
    const tenK = r.by_form.find((f) => f.form === '10-K');
    expect(tenK?.total_filings).toBe(2);
    expect(tenK?.avg_ai_relevance_score).toBe(70);
  });

  it('top_filings caps at 3 per form sorted by score desc', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({ accession_number: '0001045810-25-000001', form: '10-K', ai_relevance_score: 50 }),
        baseFiling({ accession_number: '0001045810-25-000002', form: '10-K', ai_relevance_score: 90 }),
        baseFiling({ accession_number: '0001045810-25-000003', form: '10-K', ai_relevance_score: 70 }),
        baseFiling({ accession_number: '0001045810-25-000004', form: '10-K', ai_relevance_score: 80 }),
        baseFiling({ accession_number: '0001045810-25-000005', form: '10-K', ai_relevance_score: 60 }),
      ],
    };
    const r = buildByFormResponse(snap, { ticker: null, form: null });
    expect(r.by_form[0].top_filings.length).toBe(3);
    expect(r.by_form[0].top_filings[0].ai_relevance_score).toBe(90);
    expect(r.by_form[0].top_filings[2].ai_relevance_score).toBe(70);
  });

  it('counts aggregate mention totals correctly', () => {
    const snap = {
      batch_id: 'b',
      extracted_at: '2026-05-26T00:00:00Z',
      filings: [
        baseFiling({
          accession_number: '0001045810-25-000001',
          ai_capex_mentions: [
            { amount_usd: 1, range_low_usd: null, range_high_usd: null, context: 'a', forward_looking: false },
            { amount_usd: 2, range_low_usd: null, range_high_usd: null, context: 'b', forward_looking: false },
          ],
          ai_chip_mentions: [{ vendor: 'nvidia', chip_or_product: 'H100', context: 'one' }],
        }),
      ],
    };
    const r = buildByFormResponse(snap, { ticker: null, form: null });
    expect(r.by_form[0].total_capex_mentions).toBe(2);
    expect(r.by_form[0].total_chip_mentions).toBe(1);
  });
});

// ── buildIndexResponse ──────────────────────────────────────────────

describe('buildIndexResponse', () => {
  it('returns empty entries for empty index', () => {
    const r = buildIndexResponse([], 25, 0);
    expect(r.total).toBe(0);
    expect(r.entries).toEqual([]);
  });

  it('caps limit at INDEX_MAX_LIMIT', () => {
    const big = Array.from({ length: INDEX_MAX_LIMIT + 50 }, (_, i) => ({
      accession_number: `0001045810-25-${String(i).padStart(6, '0')}`,
      cik: '0001045810',
      ticker: 'NVDA',
      form: '10-K',
      filing_date: '2025-12-12',
      ai_relevant: i % 2 === 0,
      ai_relevance_score: 70,
      extracted_at: '2026-05-26T00:00:00Z',
    }));
    const r = buildIndexResponse(big, INDEX_MAX_LIMIT + 200, 0);
    expect(r.entries.length).toBe(INDEX_MAX_LIMIT);
  });

  it('counts ai_relevant entries', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      accession_number: `0001045810-25-${String(i).padStart(6, '0')}`,
      cik: '0001045810',
      ticker: 'NVDA',
      form: '10-K',
      filing_date: '2025-12-12',
      ai_relevant: i < 6,
      ai_relevance_score: 70,
      extracted_at: '2026-05-26T00:00:00Z',
    }));
    const r = buildIndexResponse(entries, 25, 0);
    expect(r.ai_relevant_count).toBe(6);
  });

  it('respects offset', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      accession_number: `0001045810-25-${String(i).padStart(6, '0')}`,
      cik: '0001045810',
      ticker: 'NVDA',
      form: '10-K',
      filing_date: '2025-12-12',
      ai_relevant: true,
      ai_relevance_score: 70,
      extracted_at: '2026-05-26T00:00:00Z',
    }));
    const r = buildIndexResponse(entries, 3, 5);
    expect(r.entries.length).toBe(3);
    expect(r.entries[0].accession_number.endsWith('000005')).toBe(true);
  });
});
