import { describe, it, expect } from 'vitest';
import {
  validateFieldAllowlist,
  validatePricingRow,
  validateDeliverable,
  buildSubmissionMessage,
  validateSignedAt,
  assembleSubmissionRecord,
  toPublicSubmission,
  ALLOWED_DELIVERABLE_FIELDS,
  ALLOWED_ROW_FIELDS,
  MAX_ROWS,
  type PricingRow,
  type SubmissionWire,
} from './jobs-submissions';

function validRow(): Record<string, unknown> {
  return {
    model: 'claude-opus-4-7',
    vendor: 'Anthropic',
    input_per_1m: 15,
    output_per_1m: 75,
    context_window: 1_000_000,
    modalities: ['text', 'image'],
    effective_date: '2026-05-15',
    source_url: 'https://www.anthropic.com/pricing',
  };
}

function validRaw(): Record<string, unknown> {
  return {
    gig_id: 'gig_abc123',
    submitter_addr: '0x' + 'a'.repeat(40),
    rows: [validRow()],
    notes: 'sourced from vendor pricing page',
    nonce: 'nonce-xyz-1',
    signed_at: 1_778_000_000,
    signature: '0xdeadbeef',
  };
}

describe('validateFieldAllowlist', () => {
  it('accepts an allowlisted-only deliverable', () => {
    expect(
      validateFieldAllowlist(validRaw(), ALLOWED_DELIVERABLE_FIELDS),
    ).toEqual({ ok: true, value: true });
  });

  it('rejects a smuggled structured field (Roommates spine)', () => {
    const raw = { ...validRaw(), only_pay_us_persons: true };
    const r = validateFieldAllowlist(raw, ALLOWED_DELIVERABLE_FIELDS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('field_not_allowed:only_pay_us_persons');
  });

  it('rejects a smuggled row field', () => {
    const r = validateFieldAllowlist(
      { ...validRow(), discount_for: 'insiders' },
      ALLOWED_ROW_FIELDS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('field_not_allowed:discount_for');
  });
});

describe('validatePricingRow', () => {
  it('accepts a valid row unchanged', () => {
    const r = validatePricingRow(validRow());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.model).toBe('claude-opus-4-7');
      expect(r.value.modalities).toEqual(['text', 'image']);
      expect(r.value.input_per_1m).toBe(15);
    }
  });

  it.each([
    [42, 'row_not_object'],
    [null, 'row_not_object'],
    [['x'], 'row_not_object'],
  ])('rejects non-object row %p', (bad, err) => {
    const r = validatePricingRow(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(err);
  });

  it.each([
    [{ model: '' }, 'row_model_invalid'],
    [{ model: ' claude ' }, 'row_model_invalid'],
    [{ vendor: '' }, 'row_vendor_invalid'],
    [{ input_per_1m: -1 }, 'row_input_per_1m_invalid'],
    [{ input_per_1m: 'free' }, 'row_input_per_1m_invalid'],
    [{ output_per_1m: -0.01 }, 'row_output_per_1m_invalid'],
    [{ context_window: 0 }, 'row_context_window_invalid'],
    [{ context_window: 1.5 }, 'row_context_window_invalid'],
    [{ modalities: [] }, 'row_modalities_invalid'],
    [{ modalities: ['telepathy'] }, 'row_modalities_invalid'],
    [{ modalities: ['text', 'text'] }, 'row_modalities_duplicate'],
    [{ effective_date: '05/15/2026' }, 'row_effective_date_invalid'],
    [{ effective_date: '2026-13-40' }, 'row_effective_date_invalid'],
    [{ source_url: 'http://insecure.com' }, 'row_source_url_invalid'],
    [{ source_url: 'https://x.com/ a' }, 'row_source_url_invalid'],
  ])('rejects %p', (patch, err) => {
    const r = validatePricingRow({ ...validRow(), ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(err);
  });
});

describe('validateDeliverable', () => {
  it('accepts a valid deliverable', () => {
    const r = validateDeliverable(validRaw());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.gig_id).toBe('gig_abc123');
      expect(r.value.rows).toHaveLength(1);
    }
  });

  it('treats absent notes as empty string', () => {
    const raw = validRaw();
    delete raw.notes;
    const r = validateDeliverable(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.notes).toBe('');
  });

  it.each([
    [{ gig_id: '' }, 'gig_id_invalid'],
    [{ gig_id: ' gig ' }, 'gig_id_invalid'],
    [{ submitter_addr: '0xnope' }, 'submitter_addr_invalid'],
    [{ rows: [] }, 'rows_required'],
    [{ rows: 'lots' }, 'rows_required'],
    [{ notes: '  untrimmed  ' }, 'notes_invalid'],
    [{ notes: 123 }, 'notes_invalid'],
    [{ nonce: '' }, 'nonce_invalid'],
    [{ signed_at: 1.2 }, 'signed_at_invalid'],
    [{ signed_at: '1778000000' }, 'signed_at_invalid'],
    [{ signature: '' }, 'signature_required'],
  ])('rejects %p', (patch, err) => {
    const r = validateDeliverable({ ...validRaw(), ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(err);
  });

  it('rejects more than MAX_ROWS rows', () => {
    const raw = { ...validRaw(), rows: Array(MAX_ROWS + 1).fill(validRow()) };
    const r = validateDeliverable(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('rows_too_many');
  });

  it('propagates a row error with its index', () => {
    const raw = {
      ...validRaw(),
      rows: [validRow(), { ...validRow(), source_url: 'http://x.com' }],
    };
    const r = validateDeliverable(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('row_1:row_source_url_invalid');
  });

  it('rejects a smuggled deliverable field', () => {
    const r = validateDeliverable({ ...validRaw(), preferred_region: 'US' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('field_not_allowed:preferred_region');
  });
});

describe('buildSubmissionMessage', () => {
  it('is deterministic regardless of object key order at any depth', () => {
    const a = validateDeliverable(validRaw());
    const reordered = validateDeliverable({
      signature: '0xdeadbeef',
      signed_at: 1_778_000_000,
      nonce: 'nonce-xyz-1',
      notes: 'sourced from vendor pricing page',
      rows: [
        {
          source_url: 'https://www.anthropic.com/pricing',
          effective_date: '2026-05-15',
          modalities: ['text', 'image'],
          context_window: 1_000_000,
          output_per_1m: 75,
          input_per_1m: 15,
          vendor: 'Anthropic',
          model: 'claude-opus-4-7',
        },
      ],
      submitter_addr: '0x' + 'a'.repeat(40),
      gig_id: 'gig_abc123',
    });
    expect(a.ok && reordered.ok).toBe(true);
    if (a.ok && reordered.ok) {
      expect(buildSubmissionMessage(a.value)).toBe(
        buildSubmissionMessage(reordered.value),
      );
    }
  });

  it('is sensitive to array order (signed bytes are exact)', () => {
    const base = validateDeliverable(validRaw());
    const swapped = validateDeliverable({
      ...validRaw(),
      rows: [{ ...validRow(), modalities: ['image', 'text'] }],
    });
    expect(base.ok && swapped.ok).toBe(true);
    if (base.ok && swapped.ok) {
      expect(buildSubmissionMessage(base.value)).not.toBe(
        buildSubmissionMessage(swapped.value),
      );
    }
  });

  it('excludes the signature from the signed message', () => {
    const a = validateDeliverable(validRaw());
    const b = validateDeliverable({ ...validRaw(), signature: '0xfeed' });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(buildSubmissionMessage(a.value)).toBe(
        buildSubmissionMessage(b.value),
      );
    }
  });
});

describe('validateSignedAt (re-exported, not forked)', () => {
  it('accepts a fresh timestamp', () => {
    expect(validateSignedAt(1000, 1000).ok).toBe(true);
  });
  it('rejects a far-future timestamp', () => {
    const r = validateSignedAt(1000, 999_999);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('signed_at_future');
  });
  it('rejects a stale timestamp', () => {
    const r = validateSignedAt(1_000_000, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('signed_at_stale');
  });
});

describe('assembleSubmissionRecord', () => {
  it('builds a pending record whose signed_message matches the builder', () => {
    const v = validateDeliverable(validRaw());
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const rec = assembleSubmissionRecord(v.value, 1_778_000_123, 'sub_1');
    expect(rec.id).toBe('sub_1');
    expect(rec.status).toBe('pending');
    expect(rec.created_at).toBe(1_778_000_123);
    expect(rec.decided_at).toBeNull();
    expect(rec.decision_note).toBeNull();
    expect(rec.signed_message).toBe(buildSubmissionMessage(v.value));
  });
});

describe('toPublicSubmission', () => {
  it('omits signature, nonce, and signed_message', () => {
    const v = validateDeliverable(validRaw());
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const rec = assembleSubmissionRecord(v.value, 1_778_000_123, 'sub_1');
    const pub = toPublicSubmission(rec) as unknown as Record<string, unknown>;
    expect(pub.signature).toBeUndefined();
    expect(pub.nonce).toBeUndefined();
    expect(pub.signed_message).toBeUndefined();
    expect(pub.id).toBe('sub_1');
    expect(pub.status).toBe('pending');
    expect((pub.rows as PricingRow[])[0].model).toBe('claude-opus-4-7');
  });
});

// Type-only sanity: SubmissionWire is the validated shape.
const _typecheck: (s: SubmissionWire) => string = (s) => s.gig_id;
void _typecheck;
