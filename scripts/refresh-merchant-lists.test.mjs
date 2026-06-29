import { describe, it, expect } from 'vitest';
import {
  buildMajesticTopN,
  parsePhishingActive,
  assertMajesticSane,
  assertPhishingSane,
} from './refresh-merchant-lists.mjs';

describe('refresh helpers', () => {
  it('takes the top N domains by file order with their GlobalRank', () => {
    const csv = 'GlobalRank,TldRank,Domain,TLD\n1,1,google.com,com\n2,1,facebook.com,com\n3,2,apple.com,com\n';
    expect(buildMajesticTopN(csv, 2)).toEqual({ 'google.com': 1, 'facebook.com': 2 });
  });

  it('parses phishing active list, trims and lowercases, drops blanks', () => {
    expect(parsePhishingActive('Bad.com\n\n  evil.example.org \n')).toEqual(['bad.com', 'evil.example.org']);
  });

  // www-normalization parity with the Worker reader
  it('buildMajesticTopN strips leading www from domain keys', () => {
    const csv = 'GlobalRank,TldRank,Domain,TLD\n1,1,WWW.Foo.com,com\n2,1,bar.com,com\n';
    expect(buildMajesticTopN(csv, 2)).toEqual({ 'foo.com': 1, 'bar.com': 2 });
  });

  it('parsePhishingActive strips leading www from entries', () => {
    expect(parsePhishingActive('www.Bad.com\n  WWW.evil.org \nnormal.com\n')).toEqual([
      'bad.com',
      'evil.org',
      'normal.com',
    ]);
  });

  // assertMajesticSane
  it('assertMajesticSane returns the map when it has >= 50000 keys', () => {
    const big = Object.fromEntries(Array.from({ length: 50000 }, (_, i) => [`d${i}.com`, i + 1]));
    expect(assertMajesticSane(big)).toBe(big);
  });

  it('assertMajesticSane throws when the map has fewer than 50000 keys', () => {
    const small = { 'a.com': 1 };
    expect(() => assertMajesticSane(small)).toThrow();
  });

  // assertPhishingSane
  it('assertPhishingSane returns the array when length >= 1000', () => {
    const big = Array.from({ length: 1000 }, (_, i) => `d${i}.com`);
    expect(assertPhishingSane(big)).toBe(big);
  });

  it('assertPhishingSane throws when the array has fewer than 1000 entries', () => {
    const small = ['a.com', 'b.com'];
    expect(() => assertPhishingSane(small)).toThrow();
  });
});
