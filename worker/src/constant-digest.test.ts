import { describe, it, expect } from 'vitest';
import { contentDigest } from './constant-digest';

describe('contentDigest', () => {
  it('returns the same digest for the same value', () => {
    expect(contentDigest([{ a: 1 }])).toBe(contentDigest([{ a: 1 }]));
  });

  it('ignores key order, so a cosmetic source reshuffle is not a false alarm', () => {
    expect(contentDigest({ a: 1, b: 2 })).toBe(contentDigest({ b: 2, a: 1 }));
  });

  it('respects array order, because ranking position is meaningful data', () => {
    expect(contentDigest([1, 2])).not.toBe(contentDigest([2, 1]));
  });

  it('changes when a nested value changes', () => {
    expect(contentDigest([{ model: 'x', share: 1.0 }])).not.toBe(
      contentDigest([{ model: 'x', share: 1.1 }]),
    );
  });

  it('changes when a field is added or removed', () => {
    expect(contentDigest({ a: 1 })).not.toBe(contentDigest({ a: 1, b: 2 }));
  });

  it('distinguishes a number from its string form', () => {
    expect(contentDigest({ a: 1 })).not.toBe(contentDigest({ a: '1' }));
  });

  it('distinguishes null from undefined from absent', () => {
    expect(contentDigest({ a: null })).not.toBe(contentDigest({ a: undefined }));
    expect(contentDigest({ a: null })).not.toBe(contentDigest({}));
  });

  it('produces a short stable hex string', () => {
    expect(contentDigest({ a: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });
});
