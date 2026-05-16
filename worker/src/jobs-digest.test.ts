import { describe, it, expect } from 'vitest';
import {
  selectNewGigs,
  buildJobsDigest,
  DIGEST_WINDOW_SEC,
} from './jobs-digest';
import type { GigRecord } from './jobs';

function gig(over: Partial<GigRecord>): GigRecord {
  return {
    id: 'g1',
    title: 'Test gig',
    body: 'body',
    category: 'data-entry',
    budget_note: '',
    poster_x402: 'https://example.com/x402',
    poster_addr: '0x' + '1'.repeat(40),
    nonce: 'n',
    signed_at: 1000,
    signature: 'sig',
    status: 'active',
    signed_message: '{}',
    created_at: 1000,
    expires_at: 1000 + 30 * 86400,
    removed_reason: null,
    ...over,
  };
}

const LONG_DASH = /[‒–—―−]/;
const DOUBLE_HYPHEN = /-{2,}/;

describe('selectNewGigs', () => {
  const now = 1_000_000;

  it('includes gigs at and within the 24h window, newest first', () => {
    const out = selectNewGigs(
      [
        gig({ id: 'old', created_at: now - DIGEST_WINDOW_SEC - 1 }),
        gig({ id: 'edge', created_at: now - DIGEST_WINDOW_SEC }),
        gig({ id: 'fresh', created_at: now - 10 }),
      ],
      now,
    );
    expect(out.map((g) => g.id)).toEqual(['fresh', 'edge']);
  });

  it('respects a custom window', () => {
    expect(
      selectNewGigs([gig({ created_at: now - 100 })], now, 50),
    ).toHaveLength(0);
  });

  it('returns empty when nothing is fresh', () => {
    expect(
      selectNewGigs([gig({ created_at: now - 99_999 })], now),
    ).toHaveLength(0);
  });
});

describe('buildJobsDigest', () => {
  it('counts and pluralizes the subject', () => {
    expect(buildJobsDigest([gig({})]).subject).toBe(
      'TensorFeed Jobs: 1 new listing',
    );
    expect(
      buildJobsDigest([gig({ id: 'a' }), gig({ id: 'b' })]).subject,
    ).toBe('TensorFeed Jobs: 2 new listings');
  });

  it('renders fields, "none" for empty budget, and the canonical link', () => {
    const d = buildJobsDigest([
      gig({ id: 'x7', title: 'Cite AI prices', category: 'research', budget_note: '' }),
    ]);
    expect(d.text).toContain('Title: Cite AI prices');
    expect(d.text).toContain('Category: research');
    expect(d.text).toContain('Budget note: none');
    expect(d.text).toContain('https://tensorfeed.ai/api/jobs/x7');
  });

  it('adds an overflow line past the cap', () => {
    const many = Array.from({ length: 27 }, (_, i) => gig({ id: `g${i}` }));
    expect(buildJobsDigest(many, 25).text).toContain('Plus 2 more not shown');
  });

  it('never emits a long dash or double hyphen, even from poster text', () => {
    const d = buildJobsDigest([
      gig({ title: 'Need data — fast', budget_note: 'pay--soon', category: 'research' }),
    ]);
    for (const s of [d.subject, d.text, d.html]) {
      expect(LONG_DASH.test(s)).toBe(false);
      expect(DOUBLE_HYPHEN.test(s)).toBe(false);
    }
  });

  it('escapes html in poster-controlled fields', () => {
    const d = buildJobsDigest([gig({ title: '<script>x</script>' })]);
    expect(d.html).not.toContain('<script>');
    expect(d.html).toContain('&lt;script&gt;');
  });
});
