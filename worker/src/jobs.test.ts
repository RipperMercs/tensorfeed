import { describe, it, expect } from 'vitest';
import {
  validateFieldAllowlist,
  validateGigSubmission,
  buildSignedMessage,
  validateSignedAt,
  assembleGigRecord,
  isExpired,
  toPublicGig,
  buildCloseMessage,
  GIG_TTL_DAYS,
  MAX_TITLE_LEN,
  MAX_BODY_LEN,
  type GigSubmission,
} from './jobs';

// Tests inject a fixed vocab so the unit is isolated from the shared
// SKILLS_TAG_VOCAB contents (wiring of the default is an integration
// concern, not a unit one).
const VOCAB = new Set(['research', 'coding']);

function validRaw(): Record<string, unknown> {
  return {
    title: 'Gather structured pricing data for AI APIs',
    body: 'Need a daily snapshot of model pricing across providers.',
    category: 'research',
    budget_note: 'around 5 USDC, negotiable',
    poster_x402: 'https://example.com/api/quote',
    poster_addr: '0x' + 'a'.repeat(40),
    nonce: 'nonce-123',
    signed_at: 1_778_000_000,
    signature: '0xdeadbeef',
  };
}

describe('validateFieldAllowlist', () => {
  it('accepts an allowlisted-only object', () => {
    expect(validateFieldAllowlist(validRaw())).toEqual({ ok: true, value: true });
  });

  it('rejects a smuggled structured selection field (Roommates spine)', () => {
    const raw = { ...validRaw(), requires_visa_status: 'citizen_only' };
    const r = validateFieldAllowlist(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('field_not_allowed:requires_visa_status');
  });
});

describe('validateGigSubmission', () => {
  it('accepts a valid submission', () => {
    const r = validateGigSubmission(validRaw(), VOCAB);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.category).toBe('research');
      expect(r.value.title).toContain('Gather');
    }
  });

  it.each([
    [{ title: '' }, 'title_required'],
    [{ title: 'x'.repeat(MAX_TITLE_LEN + 1) }, 'title_too_long'],
    [{ body: '' }, 'body_required'],
    [{ body: 'x'.repeat(MAX_BODY_LEN + 1) }, 'body_too_long'],
    [{ category: 'not-a-real-skill' }, 'category_not_in_vocab'],
    [{ budget_note: 'x'.repeat(1000) }, 'budget_note_too_long'],
    [{ poster_x402: 'http://insecure.example' }, 'poster_x402_invalid'],
    [{ poster_addr: '0xnothex' }, 'poster_addr_invalid'],
    [{ nonce: '' }, 'nonce_invalid'],
    [{ signed_at: 1.5 }, 'signed_at_invalid'],
    [{ signature: '' }, 'signature_required'],
  ])('rejects %o with %s', (patch, expected) => {
    const r = validateGigSubmission({ ...validRaw(), ...patch }, VOCAB);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(expected);
  });

  it('rejects an extra field before any other check', () => {
    const r = validateGigSubmission(
      { ...validRaw(), match_only: 'true' },
      VOCAB,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('field_not_allowed:match_only');
  });

  it('trims string fields on success', () => {
    const r = validateGigSubmission(
      { ...validRaw(), title: '  spaced title  ' },
      VOCAB,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe('spaced title');
  });
});

describe('buildSignedMessage', () => {
  it('is deterministic and key-order independent', () => {
    const a = validateGigSubmission(validRaw(), VOCAB);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const m1 = buildSignedMessage(a.value);
    const m2 = buildSignedMessage({
      signed_at: a.value.signed_at,
      poster_addr: a.value.poster_addr,
      nonce: a.value.nonce,
      poster_x402: a.value.poster_x402,
      budget_note: a.value.budget_note,
      category: a.value.category,
      body: a.value.body,
      title: a.value.title,
    });
    expect(m1).toBe(m2);
    expect(m1).not.toContain('"signature"');
  });
});

describe('validateSignedAt', () => {
  const now = 1_778_000_000;
  it('accepts a timestamp inside the window', () => {
    expect(validateSignedAt(now, now - 30).ok).toBe(true);
  });
  it('rejects a future timestamp', () => {
    const r = validateSignedAt(now, now + 5000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('signed_at_future');
  });
  it('rejects a stale timestamp', () => {
    const r = validateSignedAt(now, now - 100000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('signed_at_stale');
  });
});

describe('assembleGigRecord / isExpired', () => {
  const now = 1_778_000_000;
  const sub: GigSubmission = (() => {
    const r = validateGigSubmission(validRaw(), VOCAB);
    if (!r.ok) throw new Error('fixture invalid');
    return r.value;
  })();

  it('assembles an active record with a 30 day TTL', () => {
    const rec = assembleGigRecord(sub, now, 'gig_test_1');
    expect(rec.id).toBe('gig_test_1');
    expect(rec.status).toBe('active');
    expect(rec.created_at).toBe(now);
    expect(rec.expires_at).toBe(now + GIG_TTL_DAYS * 86_400);
    expect(rec.removed_reason).toBeNull();
    expect(rec.signed_message).toBe(buildSignedMessage(sub));
  });

  it('reads as expired only at or after expiry', () => {
    const rec = assembleGigRecord(sub, now, 'gig_test_2');
    expect(isExpired(rec, rec.expires_at - 1)).toBe(false);
    expect(isExpired(rec, rec.expires_at)).toBe(true);
  });
});

describe('toPublicGig', () => {
  const now = 1_778_000_000;
  const sub: GigSubmission = (() => {
    const r = validateGigSubmission(validRaw(), VOCAB);
    if (!r.ok) throw new Error('fixture invalid');
    return r.value;
  })();

  it('never leaks signature, signed_message, or nonce', () => {
    const pub = toPublicGig(assembleGigRecord(sub, now, 'p1'), now);
    const keys = Object.keys(pub);
    expect(keys).not.toContain('signature');
    expect(keys).not.toContain('signed_message');
    expect(keys).not.toContain('nonce');
    expect(keys).not.toContain('removed_reason');
    expect(pub.id).toBe('p1');
    expect(pub.poster_x402).toBe(sub.poster_x402);
  });

  it('computes effective status', () => {
    const rec = assembleGigRecord(sub, now, 'p2');
    expect(toPublicGig(rec, now).status).toBe('active');
    expect(toPublicGig(rec, rec.expires_at).status).toBe('expired');
    const removed = { ...rec, status: 'removed' as const };
    expect(toPublicGig(removed, now).status).toBe('removed');
  });
});

describe('buildCloseMessage', () => {
  it('is deterministic and pins action to close', () => {
    const m = buildCloseMessage({ id: 'gig_1', nonce: 'n1', signed_at: 100 });
    expect(m).toBe(buildCloseMessage({ id: 'gig_1', nonce: 'n1', signed_at: 100 }));
    expect(m).toContain('"action":"close"');
  });

  it('is distinct from a create-signature message (no cross-replay)', () => {
    const closeMsg = buildCloseMessage({ id: 'gig_1', nonce: 'n1', signed_at: 100 });
    const r = validateGigSubmission(validRaw(), VOCAB);
    if (!r.ok) throw new Error('fixture invalid');
    expect(closeMsg).not.toBe(buildSignedMessage(r.value));
  });
});
