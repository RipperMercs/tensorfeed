import { describe, it, expect } from 'vitest';
import {
  DELTA_CURSOR_VERSION,
  encodeDeltaCursor,
  decodeDeltaCursor,
  gateDeltaCursor,
  buildDeltaContinuation,
} from './delta-cursor';

describe('encode/decode round-trip', () => {
  it('preserves cap and key', () => {
    const raw = encodeDeltaCursor(DELTA_CURSOR_VERSION, '2026-07-20T00:00:00.000Z', 'abc123');
    const d = decodeDeltaCursor(raw, DELTA_CURSOR_VERSION);
    expect(d).toEqual({ v: DELTA_CURSOR_VERSION, cap: '2026-07-20T00:00:00.000Z', key: 'abc123' });
  });
  it('is URL-safe (no +, /, =)', () => {
    const raw = encodeDeltaCursor(DELTA_CURSOR_VERSION, '2026-07-20T00:00:00.000Z', 'k');
    expect(raw).not.toMatch(/[+/=]/);
  });
  it('decodes garbage to null', () => {
    expect(decodeDeltaCursor('not-a-cursor', DELTA_CURSOR_VERSION)).toBeNull();
    expect(decodeDeltaCursor('', DELTA_CURSOR_VERSION)).toBeNull();
  });
  it('decodes a version mismatch to null', () => {
    const raw = encodeDeltaCursor(DELTA_CURSOR_VERSION, '2026-07-20T00:00:00.000Z', 'k');
    expect(decodeDeltaCursor(raw, DELTA_CURSOR_VERSION + 1)).toBeNull();
  });
  it('round-trips a key with code points above U+00FF without throwing (UTF-8 safe)', () => {
    const key = 'stack_\u{1F512}_中'; // a lock emoji and a CJK char, both above the Latin1 range
    const raw = encodeDeltaCursor(DELTA_CURSOR_VERSION, '2026-07-20T00:00:00.000Z', key);
    const d = decodeDeltaCursor(raw, DELTA_CURSOR_VERSION);
    expect(d).toEqual({ v: DELTA_CURSOR_VERSION, cap: '2026-07-20T00:00:00.000Z', key });
  });
});

describe('gateDeltaCursor', () => {
  const base = { resultCap: '2026-07-20T00:00:00.000Z', cursorCap: '2026-07-20T00:00:00.000Z', resultKey: 'k', cursorKey: 'k' };
  it('full when resultCap is null', () => {
    expect(gateDeltaCursor({ ...base, resultCap: null })).toBe('full');
  });
  it('full when keys differ', () => {
    expect(gateDeltaCursor({ ...base, cursorKey: 'other' })).toBe('full');
  });
  it('full when cursorCap is null', () => {
    expect(gateDeltaCursor({ ...base, cursorCap: null })).toBe('full');
  });
  it('full on an unparseable time', () => {
    expect(gateDeltaCursor({ ...base, cursorCap: 'nope' })).toBe('full');
  });
  it('full when the cursor is dated in the future', () => {
    expect(gateDeltaCursor({ ...base, cursorCap: '2026-07-21T00:00:00.000Z' })).toBe('full');
  });
  it('no_charge when the capture time is unchanged', () => {
    expect(gateDeltaCursor(base)).toBe('no_charge');
  });
  it('advanced when the result capture time is newer', () => {
    expect(gateDeltaCursor({ ...base, cursorCap: '2026-07-19T00:00:00.000Z' })).toBe('advanced');
  });
});

describe('buildDeltaContinuation', () => {
  it('builds a POST continuation url', () => {
    const c = buildDeltaContinuation('POST', '/api/premium/cve-check', 'CUR', 'desc');
    expect(c).toEqual({ method: 'POST', url: '/api/premium/cve-check?since=CUR', description: 'desc' });
  });
  it('returns null for an empty cursor', () => {
    expect(buildDeltaContinuation('POST', '/api/premium/cve-check', '', 'desc')).toBeNull();
  });
  it('joins with & when the path already has a query string', () => {
    const c = buildDeltaContinuation('GET', '/api/premium/x402-settlement-verdict?window=7d', 'CUR', 'd');
    expect(c).toEqual({ method: 'GET', url: '/api/premium/x402-settlement-verdict?window=7d&since=CUR', description: 'd' });
  });
});
