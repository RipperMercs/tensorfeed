import { describe, it, expect } from 'vitest';
import {
  parseInsiderAtom,
  isInCohort,
  parseLimitParam,
} from './sec-insider-trades';
import { AI_BELLWETHERS } from './sec-filings-fetcher';

const NVDA = AI_BELLWETHERS.find((b) => b.ticker === 'NVDA')!;

const SAMPLE_ATOM = `<?xml version="1.0" encoding="ISO-8859-1"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <category label="form type" scheme="https://www.sec.gov/" term="4" />
    <content type="text/xml">
      <accession-number>0001199039-26-000003</accession-number>
      <filing-date>2026-03-24</filing-date>
      <filing-href>https://www.sec.gov/Archives/edgar/data/1045810/000119903926000003/0001199039-26-000003-index.htm</filing-href>
      <filing-type>4</filing-type>
      <form-name>Statement of changes in beneficial ownership of securities</form-name>
      <size>8 KB</size>
    </content>
    <title>4  - Statement of changes in beneficial ownership of securities</title>
  </entry>
  <entry>
    <category label="form type" scheme="https://www.sec.gov/" term="4" />
    <content type="text/xml">
      <accession-number>0001725292-26-000002</accession-number>
      <filing-date>2026-03-20</filing-date>
      <filing-href>https://www.sec.gov/Archives/edgar/data/1045810/000172529226000002/0001725292-26-000002-index.htm</filing-href>
      <filing-type>4</filing-type>
      <form-name>Statement of changes in beneficial ownership of securities</form-name>
      <size>9 KB</size>
    </content>
    <title>4  - Statement of changes in beneficial ownership of securities</title>
  </entry>
  <entry>
    <category label="form type" scheme="https://www.sec.gov/" term="10-K" />
    <content type="text/xml">
      <accession-number>0001045810-26-000099</accession-number>
      <filing-date>2026-02-10</filing-date>
      <filing-href>https://www.sec.gov/Archives/edgar/data/1045810/000104581026000099/0001045810-26-000099-index.htm</filing-href>
      <filing-type>10-K</filing-type>
      <form-name>Annual report</form-name>
      <size>5 MB</size>
    </content>
    <title>10-K - Annual report</title>
  </entry>
</feed>
`;

describe('isInCohort', () => {
  it('returns true for canonical bellwether tickers (case-insensitive)', () => {
    expect(isInCohort('NVDA')).toBe(true);
    expect(isInCohort('nvda')).toBe(true);
    expect(isInCohort('META')).toBe(true);
  });

  it('returns false for tickers outside the cohort', () => {
    expect(isInCohort('TSLAQ')).toBe(false);
    expect(isInCohort('BBAI')).toBe(false);
    expect(isInCohort('')).toBe(false);
  });
});

describe('parseLimitParam', () => {
  it('defaults to 25 when null', () => {
    expect(parseLimitParam(null)).toBe(25);
  });

  it('defaults to 25 on non-numeric input', () => {
    expect(parseLimitParam('abc')).toBe(25);
  });

  it('defaults to 25 on negative input', () => {
    expect(parseLimitParam('-5')).toBe(25);
  });

  it('clamps to 100 max', () => {
    expect(parseLimitParam('500')).toBe(100);
  });

  it('accepts a valid limit', () => {
    expect(parseLimitParam('10')).toBe(10);
    expect(parseLimitParam('1')).toBe(1);
  });
});

describe('parseInsiderAtom', () => {
  it('parses Form 4 entries and skips non-Form-4 entries', () => {
    const trades = parseInsiderAtom(SAMPLE_ATOM, NVDA, 25);
    expect(trades.length).toBe(2);
    expect(trades.every((t) => t.form === '4')).toBe(true);
  });

  it('extracts the accession number, filing date, URL, form name, and size', () => {
    const trades = parseInsiderAtom(SAMPLE_ATOM, NVDA, 25);
    expect(trades[0].accession_number).toBe('0001199039-26-000003');
    expect(trades[0].filing_date).toBe('2026-03-24');
    expect(trades[0].filing_url).toBe(
      'https://www.sec.gov/Archives/edgar/data/1045810/000119903926000003/0001199039-26-000003-index.htm',
    );
    expect(trades[0].form_name).toBe('Statement of changes in beneficial ownership of securities');
    expect(trades[0].size).toBe('8 KB');
  });

  it('annotates each trade with the bellwether cohort metadata', () => {
    const trades = parseInsiderAtom(SAMPLE_ATOM, NVDA, 25);
    expect(trades[0].ticker).toBe('NVDA');
    expect(trades[0].cik).toBe('0001045810');
    expect(trades[0].company_name).toBe('NVIDIA');
  });

  it('honors the limit cap', () => {
    const trades = parseInsiderAtom(SAMPLE_ATOM, NVDA, 1);
    expect(trades.length).toBe(1);
  });

  it('returns empty array on malformed XML rather than throwing', () => {
    expect(parseInsiderAtom('<not><xml>', NVDA, 25)).toEqual([]);
    expect(parseInsiderAtom('', NVDA, 25)).toEqual([]);
  });

  it('does not contain em dashes in any field', () => {
    const trades = parseInsiderAtom(SAMPLE_ATOM, NVDA, 25);
    const serialized = JSON.stringify(trades);
    expect(serialized).not.toMatch(/—/);
    expect(serialized).not.toMatch(/--/);
  });
});
