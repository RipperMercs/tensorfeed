import { describe, it, expect } from 'vitest';
import {
  validateDelta,
  validateBatch,
  writeBatch,
  getGuidanceDelta,
  getIndex,
  getMaterial,
  getLatest,
  KEY_INDEX,
  KEY_MATERIAL,
  KEY_LATEST,
  KEY_BY_ACCESSION_PREFIX,
  MAX_TOPIC_LEN,
  type GuidanceDelta,
  type GuidanceChange,
} from './sec-guidance-delta';
import type { Env } from './types';

// ── Helpers ─────────────────────────────────────────────────────────

function baseChange(over: Partial<GuidanceChange> = {}): GuidanceChange {
  return {
    topic: 'Full-year revenue outlook',
    prior_text: 'We expect full-year revenue of 100 billion to 105 billion.',
    current_text: 'We now expect full-year revenue of 108 billion to 112 billion.',
    prior_value: '100B to 105B',
    current_value: '108B to 112B',
    section: 'MD&A',
    category: 'revenue_guidance',
    change_type: 'raised',
    direction: 'up',
    materiality: 'material',
    ...over,
  };
}

function baseDelta(over: Partial<GuidanceDelta> = {}): GuidanceDelta {
  return {
    accession_number: '0001045810-25-000200',
    prior_accession_number: '0001045810-24-000150',
    cik: '0001045810',
    ticker: 'NVDA',
    company_name: 'NVIDIA',
    form: '10-K',
    filing_date: '2025-12-12',
    prior_filing_date: '2024-12-13',
    changes: [
      baseChange(),
      baseChange({
        topic: 'Supply concentration risk factor',
        prior_text: 'A limited number of suppliers manufacture our products.',
        current_text: 'A limited number of suppliers continue to manufacture our products.',
        prior_value: null,
        current_value: null,
        section: 'Risk Factors',
        category: 'risk_factor',
        change_type: 'reworded',
        direction: 'neutral',
        materiality: 'minor',
      }),
    ],
    extracted_by: 'phi-4-14b',
    extracted_at: '2026-05-28T00:00:00Z',
    ...over,
  };
}

function batchOf(deltas: GuidanceDelta[]) {
  return {
    batch_id: 'test-gd-batch-001',
    extracted_at: '2026-05-28T00:00:00Z',
    deltas,
  };
}

// Minimal in-memory KV that mirrors the surface sec-guidance-delta touches
// (get + put with an optional options bag for expirationTtl).
class FakeKV {
  store = new Map<string, string>();
  async get(key: string, _type?: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async put(key: string, value: string, _opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function envWith(kv: FakeKV): Env {
  return { TENSORFEED_NEWS: kv } as unknown as Env;
}

// ── validateBatch / validateDelta ────────────────────────────────────

describe('validateBatch', () => {
  it('accepts a one-delta batch with a material and a minor change', () => {
    const r = validateBatch(batchOf([baseDelta()]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.deltas.length).toBe(1);
      expect(r.value.deltas[0].changes.length).toBe(2);
    }
  });

  it('accepts a delta with an empty changes array', () => {
    const r = validateBatch(batchOf([baseDelta({ changes: [] })]));
    expect(r.ok).toBe(true);
  });

  it('accepts a change with empty prior_text (initiated guidance)', () => {
    const r = validateDelta(baseDelta({
      changes: [baseChange({
        prior_text: '',
        prior_value: null,
        change_type: 'initiated',
        materiality: 'material',
      })],
    }));
    expect(r.ok).toBe(true);
  });

  it('rejects a bad category enum', () => {
    const r = validateBatch(batchOf([baseDelta({
      changes: [baseChange({ category: 'forward_outlook' as never })],
    })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_enum');
  });

  it('rejects an em dash in current_text', () => {
    const r = validateBatch(batchOf([baseDelta({
      changes: [baseChange({ current_text: 'We now expect revenue of 108 billion — a step up.' })],
    })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('em_dash_in_context');
  });

  it('rejects prior_accession_number equal to accession_number', () => {
    const r = validateBatch(batchOf([baseDelta({
      prior_accession_number: '0001045810-25-000200',
    })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('prior_equals_current');
  });

  it('rejects duplicate accession_number across two deltas', () => {
    const r = validateBatch(batchOf([baseDelta(), baseDelta()]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('duplicate_accession');
      expect(r.index).toBe(1);
    }
  });

  it('rejects a bad accession_number format', () => {
    const r = validateBatch(batchOf([baseDelta({ accession_number: 'NOT-AN-ACCESSION' })]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('bad_accession');
      expect(r.index).toBe(0);
    }
  });

  it('rejects extracted_at with a non-UTC offset', () => {
    const r = validateBatch(batchOf([baseDelta({ extracted_at: '2026-05-28T00:00:00-08:00' })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_extracted_at');
  });

  it('rejects a topic over the length cap', () => {
    const r = validateBatch(batchOf([baseDelta({
      changes: [baseChange({ topic: 'x'.repeat(MAX_TOPIC_LEN + 1) })],
    })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('bad_change');
  });

  it('rejects an empty deltas array', () => {
    const r = validateBatch(batchOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('empty_deltas');
  });
});

// ── writeBatch ───────────────────────────────────────────────────────

describe('writeBatch', () => {
  it('writes by-accession, index, material subset, and returns counts', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    const v = validateBatch(batchOf([baseDelta()]));
    expect(v.ok).toBe(true);
    if (!v.ok) return;

    const result = await writeBatch(env, v.value);

    expect(result.ok).toBe(true);
    expect(result.deltas_written).toBe(1);
    // One delta has at least one material change, so material_count is 1.
    expect(result.material_count).toBe(1);
    expect(result.indexed_total).toBe(1);

    // by-accession record is present and round-trips.
    const stored = await getGuidanceDelta(env, '0001045810-25-000200');
    expect(stored).not.toBeNull();
    expect(stored?.ticker).toBe('NVDA');
    expect(kv.store.has(`${KEY_BY_ACCESSION_PREFIX}0001045810-25-000200`)).toBe(true);

    // index entry carries the correct material_count + change_count.
    const index = await getIndex(env);
    expect(index.length).toBe(1);
    expect(index[0].accession_number).toBe('0001045810-25-000200');
    expect(index[0].material_count).toBe(1);
    expect(index[0].change_count).toBe(2);
    expect(kv.store.has(KEY_INDEX)).toBe(true);

    // material subset contains the delta.
    const material = await getMaterial(env);
    expect(material).not.toBeNull();
    expect(material?.deltas.length).toBe(1);
    expect(material?.deltas[0].accession_number).toBe('0001045810-25-000200');
    expect(kv.store.has(KEY_MATERIAL)).toBe(true);

    // latest pointer.
    const latest = await getLatest(env);
    expect(latest?.batch_id).toBe('test-gd-batch-001');
    expect(kv.store.has(KEY_LATEST)).toBe(true);
  });

  it('excludes a delta with no material change from the material subset', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    const v = validateBatch(batchOf([baseDelta({
      accession_number: '0001045810-25-000201',
      changes: [baseChange({ materiality: 'minor' })],
    })]));
    expect(v.ok).toBe(true);
    if (!v.ok) return;

    const result = await writeBatch(env, v.value);
    expect(result.material_count).toBe(0);

    const material = await getMaterial(env);
    expect(material?.deltas.length).toBe(0);
  });

  it('is idempotent on accession_number (re-write replaces, no dup index entry)', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);

    const first = validateBatch(batchOf([baseDelta()]));
    if (!first.ok) return;
    await writeBatch(env, first.value);

    const second = validateBatch(batchOf([baseDelta({ ticker: 'NVDA', company_name: 'NVIDIA Corporation' })]));
    if (!second.ok) return;
    const result = await writeBatch(env, second.value);

    expect(result.indexed_total).toBe(1);
    const stored = await getGuidanceDelta(env, '0001045810-25-000200');
    expect(stored?.company_name).toBe('NVIDIA Corporation');
  });
});
