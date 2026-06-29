import { describe, it, expect } from 'vitest';
import { buildMajesticTopN, parsePhishingActive } from './refresh-merchant-lists.mjs';

describe('refresh helpers', () => {
  it('takes the top N domains by file order with their GlobalRank', () => {
    const csv = 'GlobalRank,TldRank,Domain,TLD\n1,1,google.com,com\n2,1,facebook.com,com\n3,2,apple.com,com\n';
    expect(buildMajesticTopN(csv, 2)).toEqual({ 'google.com': 1, 'facebook.com': 2 });
  });
  it('parses phishing active list, trims and lowercases, drops blanks', () => {
    expect(parsePhishingActive('Bad.com\n\n  evil.example.org \n')).toEqual(['bad.com', 'evil.example.org']);
  });
});
