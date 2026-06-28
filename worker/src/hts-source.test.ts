import { describe, it, expect, vi } from 'vitest';
import {
  fetchHtsRecord,
  fetchChapter99Record,
  extractChapter99Codes,
  HTS_EXPORT_URL,
} from './hts-source';
import type { Env } from './types';

const ENV = {} as unknown as Env;

function okFetch(body: unknown): typeof fetch {
  return (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch;
}
function statusFetch(status: number): typeof fetch {
  return (async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch;
}
function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('egress blocked');
  }) as unknown as typeof fetch;
}

// Real exportList record shape captured by the research probe.
const ASSES = {
  htsno: '0101.30.00.00',
  indent: '1',
  description: 'Asses',
  superior: null,
  units: ['No.'],
  general: '6.8%',
  special: 'Free (A+,AU,BH,CL,CO,D,E,IL,JO,KR,MA,OM,P,PA,PE,S,SG)',
  other: '15%',
  footnotes: [{ columns: ['general'], value: 'See 9903.88.15. ', type: 'endnote' }],
};

describe('fetchHtsRecord', () => {
  it('returns the normalized record for the matching HTS number', async () => {
    const r = await fetchHtsRecord(ENV, '0101.30.00.00', okFetch([ASSES]));
    expect(r).not.toBeNull();
    expect(r!.htsno).toBe('0101.30.00.00');
    expect(r!.general).toBe('6.8%');
    expect(r!.special).toContain('Free');
    expect(r!.other).toBe('15%');
    expect(r!.units).toEqual(['No.']);
    expect(r!.footnotes[0].value).toContain('9903.88.15');
  });

  it('matches by digits, ignoring dot formatting in the caller input', async () => {
    const r = await fetchHtsRecord(ENV, '0101300000', okFetch([ASSES]));
    expect(r).not.toBeNull();
    expect(r!.htsno).toBe('0101.30.00.00');
  });

  it('prefers the record carrying a rate when the range returns parent lines too', async () => {
    const parent = { htsno: '0101.30.00.00', description: 'Live asses', units: [], general: '', special: '', other: '', footnotes: [] };
    const r = await fetchHtsRecord(ENV, '0101.30.00.00', okFetch([parent, ASSES]));
    expect(r!.general).toBe('6.8%');
  });

  it('returns null when the code is not in the response', async () => {
    const r = await fetchHtsRecord(ENV, '9999.99.99.99', okFetch([ASSES]));
    expect(r).toBeNull();
  });

  it('returns null on a non-200 response', async () => {
    expect(await fetchHtsRecord(ENV, '0101.30.00.00', statusFetch(503))).toBeNull();
  });

  it('returns null when the fetch throws (egress blocked)', async () => {
    expect(await fetchHtsRecord(ENV, '0101.30.00.00', throwingFetch())).toBeNull();
  });

  it('requests the exportList endpoint with a descriptive User-Agent', async () => {
    let calledUrl = '';
    let ua = '';
    const spy: typeof fetch = (async (url: string, init?: RequestInit) => {
      calledUrl = String(url);
      ua = ((init?.headers as Record<string, string>) ?? {})['User-Agent'] ?? '';
      return { ok: true, status: 200, json: async () => [ASSES] };
    }) as unknown as typeof fetch;
    await fetchHtsRecord(ENV, '0101.30.00.00', spy);
    expect(calledUrl.startsWith(HTS_EXPORT_URL)).toBe(true);
    expect(calledUrl).toContain('format=JSON');
    expect(ua.toLowerCase()).toContain('tensorfeed');
  });
});

describe('fetchChapter99Record', () => {
  const NINE9 = {
    htsno: '9903.88.15',
    description: 'Articles the product of China, as provided for in U.S. note 20(r)',
    general: 'The duty provided in the applicable subheading + 7.5%',
  };
  it('returns the add-on record with its rate text', async () => {
    const r = await fetchChapter99Record(ENV, '9903.88.15', okFetch([NINE9]));
    expect(r).not.toBeNull();
    expect(r!.htsno).toBe('9903.88.15');
    expect(r!.rate_text).toContain('+ 7.5%');
  });
  it('returns null when nothing matches', async () => {
    expect(await fetchChapter99Record(ENV, '9903.00.00', okFetch([]))).toBeNull();
  });
});

describe('extractChapter99Codes', () => {
  it('pulls 9903 codes out of footnote endnote text', () => {
    const codes = extractChapter99Codes([
      { columns: ['general'], value: 'See 9903.88.15. ' },
      { columns: ['general'], value: 'See 9903.88.03 and 9903.01.25.' },
    ]);
    expect(codes).toEqual(['9903.88.15', '9903.88.03', '9903.01.25']);
  });
  it('dedupes and ignores footnotes with no 9903 reference', () => {
    const codes = extractChapter99Codes([
      { columns: ['general'], value: 'See 9903.88.15.' },
      { columns: ['general'], value: 'See 9903.88.15 again.' },
      { columns: ['general'], value: 'For statistical reporting only.' },
    ]);
    expect(codes).toEqual(['9903.88.15']);
  });
  it('returns an empty array for no footnotes', () => {
    expect(extractChapter99Codes([])).toEqual([]);
  });
});
