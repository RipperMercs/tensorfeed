/**
 * Pure-logic tests for sec-filings-fetcher (SEC EDGAR filings ingest).
 *
 * Covers the URL builders (dashlessAccession, primaryDocUrl, filingIndexUrl),
 * the normalizer (normalizeSubmissions), and smoke checks on the
 * AI_BELLWETHERS constant. Env / network paths (fetchCompanySubmissions,
 * refreshSecFilingsSnapshot, getSecFilingsSnapshot,
 * getCompanyFilingsSnapshot) are out of scope here.
 */

import { describe, it, expect } from 'vitest';
import {
  dashlessAccession,
  primaryDocUrl,
  filingIndexUrl,
  normalizeSubmissions,
  AI_BELLWETHERS,
  AIBellwether,
  SecFiling,
} from './sec-filings-fetcher';

// Local mirror of the source's UpstreamSubmissions interface (not exported).
interface UpstreamFilingsRecent {
  accessionNumber?: string[];
  filingDate?: string[];
  reportDate?: string[];
  form?: string[];
  primaryDocument?: string[];
  primaryDocDescription?: string[];
}

interface UpstreamSubmissions {
  cik?: string;
  name?: string;
  tickers?: string[];
  filings?: {
    recent?: UpstreamFilingsRecent;
  };
}

function makeBellwether(overrides: Partial<AIBellwether> = {}): AIBellwether {
  return {
    cik: '0001045810',
    ticker: 'NVDA',
    display_name: 'NVIDIA',
    category: 'silicon',
    ...overrides,
  };
}

// ── dashlessAccession ───────────────────────────────────────────────

describe('dashlessAccession', () => {
  it('strips dashes from a canonical SEC accession', () => {
    expect(dashlessAccession('0001045810-25-000123')).toBe('000104581025000123');
  });

  it('passes a dashless input through unchanged', () => {
    expect(dashlessAccession('0001045810')).toBe('0001045810');
  });

  it('strips every dash when there are multiple', () => {
    expect(dashlessAccession('a-b-c')).toBe('abc');
  });

  it('returns empty string for empty input', () => {
    expect(dashlessAccession('')).toBe('');
  });
});

// ── primaryDocUrl ───────────────────────────────────────────────────

describe('primaryDocUrl', () => {
  it('strips leading zeros from CIK and uses the dashless accession in the URL path', () => {
    const url = primaryDocUrl('0001045810', '0001045810-25-000123', 'nvda-10k.htm');
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/1045810/000104581025000123/nvda-10k.htm',
    );
  });

  it('strips leading zeros for low-CIK companies like AAPL', () => {
    const url = primaryDocUrl('0000320193', '0000320193-25-000001', 'aapl-10q.htm');
    expect(url).toContain('/320193/');
    expect(url).not.toContain('/0000320193/');
  });

  it('uses https + the data.sec.gov Archives prefix', () => {
    const url = primaryDocUrl('0000789019', '0000789019-25-000045', 'msft-8k.htm');
    expect(url.startsWith('https://www.sec.gov/Archives/edgar/data/')).toBe(true);
  });

  it('embeds the primary document filename verbatim', () => {
    const url = primaryDocUrl('0001018724', '0001018724-25-000099', 'amzn-def14a.htm');
    expect(url.endsWith('/amzn-def14a.htm')).toBe(true);
  });
});

// ── filingIndexUrl ──────────────────────────────────────────────────

describe('filingIndexUrl', () => {
  it('builds the canonical EDGAR browse URL with the integer CIK', () => {
    const url = filingIndexUrl('0001045810', '0001045810-25-000123');
    expect(url).toContain('CIK=1045810');
    expect(url).not.toContain('CIK=0001045810');
  });

  it('strips leading zeros for low-CIK companies', () => {
    const url = filingIndexUrl('0000320193', '0000320193-25-000001');
    expect(url).toContain('CIK=320193');
  });

  it('includes the dashed accession as a URL fragment', () => {
    const url = filingIndexUrl('0001045810', '0001045810-25-000123');
    expect(url.endsWith('#0001045810-25-000123')).toBe(true);
  });

  it('points at the cgi-bin/browse-edgar endpoint with getcompany action', () => {
    const url = filingIndexUrl('0001045810', '0001045810-25-000123');
    expect(url).toContain('https://www.sec.gov/cgi-bin/browse-edgar');
    expect(url).toContain('action=getcompany');
  });
});

// ── normalizeSubmissions ────────────────────────────────────────────

describe('normalizeSubmissions', () => {
  it('returns empty array when filings.recent is empty (all arrays empty)', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: [],
          filingDate: [],
          reportDate: [],
          form: [],
          primaryDocument: [],
          primaryDocDescription: [],
        },
      },
    };
    expect(normalizeSubmissions(raw, makeBellwether())).toEqual([]);
  });

  it('returns empty array when filings is missing entirely', () => {
    const raw: UpstreamSubmissions = { name: 'NVIDIA CORP' };
    expect(normalizeSubmissions(raw, makeBellwether())).toEqual([]);
  });

  it('returns empty array when filings.recent is missing', () => {
    const raw: UpstreamSubmissions = { name: 'NVIDIA CORP', filings: {} };
    expect(normalizeSubmissions(raw, makeBellwether())).toEqual([]);
  });

  it('normalizes 3 aligned columnar filings into 3 SecFiling rows', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: [
            '0001045810-25-000123',
            '0001045810-25-000122',
            '0001045810-25-000121',
          ],
          filingDate: ['2026-05-20', '2026-05-18', '2026-05-10'],
          reportDate: ['2026-05-19', '', '2026-05-09'],
          form: ['8-K', '10-Q', '8-K'],
          primaryDocument: ['nvda-8k1.htm', 'nvda-10q.htm', 'nvda-8k2.htm'],
          primaryDocDescription: ['Current Report', 'Quarterly Report', 'Current Report'],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(3);
  });

  it('honors the cap parameter and trims excess filings', () => {
    const accessions = Array.from({ length: 10 }, (_, i) =>
      `0001045810-25-${String(i).padStart(6, '0')}`,
    );
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: accessions,
          filingDate: accessions.map(() => '2026-05-20'),
          reportDate: accessions.map(() => ''),
          form: accessions.map(() => '8-K'),
          primaryDocument: accessions.map((_, i) => `doc-${i}.htm`),
          primaryDocDescription: accessions.map(() => ''),
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether(), 4);
    expect(out).toHaveLength(4);
  });

  it('uses default cap of 25 when cap is not provided', () => {
    const accessions = Array.from({ length: 40 }, (_, i) =>
      `0001045810-25-${String(i).padStart(6, '0')}`,
    );
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: accessions,
          filingDate: accessions.map(() => '2026-05-20'),
          reportDate: accessions.map(() => ''),
          form: accessions.map(() => '8-K'),
          primaryDocument: accessions.map((_, i) => `doc-${i}.htm`),
          primaryDocDescription: accessions.map(() => ''),
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(25);
  });

  it('skips rows where accession is falsy', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123', '', '0001045810-25-000121'],
          filingDate: ['2026-05-20', '2026-05-18', '2026-05-10'],
          reportDate: ['', '', ''],
          form: ['8-K', '10-Q', '8-K'],
          primaryDocument: ['a.htm', 'b.htm', 'c.htm'],
          primaryDocDescription: ['', '', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(2);
    expect(out.map(f => f.accession_number)).toEqual([
      '0001045810-25-000123',
      '0001045810-25-000121',
    ]);
  });

  it('skips rows where form is falsy', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123', '0001045810-25-000122'],
          filingDate: ['2026-05-20', '2026-05-18'],
          reportDate: ['', ''],
          form: ['8-K', ''],
          primaryDocument: ['a.htm', 'b.htm'],
          primaryDocDescription: ['', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(1);
    expect(out[0].form).toBe('8-K');
  });

  it('skips rows where filing date is falsy', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123', '0001045810-25-000122'],
          filingDate: ['', '2026-05-18'],
          reportDate: ['', ''],
          form: ['8-K', '10-Q'],
          primaryDocument: ['a.htm', 'b.htm'],
          primaryDocDescription: ['', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(1);
    expect(out[0].filing_date).toBe('2026-05-18');
  });

  it('skips rows where primary document is falsy', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123', '0001045810-25-000122'],
          filingDate: ['2026-05-20', '2026-05-18'],
          reportDate: ['', ''],
          form: ['8-K', '10-Q'],
          primaryDocument: ['a.htm', ''],
          primaryDocDescription: ['', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(1);
    expect(out[0].primary_doc).toBe('a.htm');
  });

  it('sets report_date to null when the reportDate cell is an empty string', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: [''],
          form: ['8-K'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: ['Current Report'],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out[0].report_date).toBeNull();
  });

  it('sets report_date to null when the reportDate array is shorter than the others', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123', '0001045810-25-000122'],
          filingDate: ['2026-05-20', '2026-05-18'],
          reportDate: [], // missing entirely
          form: ['8-K', '10-Q'],
          primaryDocument: ['a.htm', 'b.htm'],
          primaryDocDescription: ['', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(2);
    expect(out[0].report_date).toBeNull();
    expect(out[1].report_date).toBeNull();
  });

  it('preserves a real report date when present', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: ['2026-04-30'],
          form: ['10-Q'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: ['Quarterly Report'],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out[0].report_date).toBe('2026-04-30');
  });

  it('defaults primary_doc_description to empty string when the array is shorter', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: [''],
          form: ['8-K'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: [], // missing entirely
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out[0].primary_doc_description).toBe('');
  });

  it('falls back to bellwether.display_name when raw.name is missing', () => {
    const raw: UpstreamSubmissions = {
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: [''],
          form: ['8-K'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: [''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether({ display_name: 'NVIDIA' }));
    expect(out[0].company_name).toBe('NVIDIA');
  });

  it('uses raw.name when present (preferring the SEC name over the display name)', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: [''],
          form: ['8-K'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: [''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether({ display_name: 'NVIDIA' }));
    expect(out[0].company_name).toBe('NVIDIA CORP');
  });

  it('populates every output field on the happy path', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: ['2026-04-30'],
          form: ['10-Q'],
          primaryDocument: ['nvda-10q.htm'],
          primaryDocDescription: ['Quarterly Report'],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(1);
    const f: SecFiling = out[0];
    expect(f.accession_number).toBe('0001045810-25-000123');
    expect(f.cik).toBe('0001045810');
    expect(f.company_name).toBe('NVIDIA CORP');
    expect(f.ticker).toBe('NVDA');
    expect(f.category).toBe('silicon');
    expect(f.form).toBe('10-Q');
    expect(f.filing_date).toBe('2026-05-20');
    expect(f.report_date).toBe('2026-04-30');
    expect(f.primary_doc).toBe('nvda-10q.htm');
    expect(f.primary_doc_description).toBe('Quarterly Report');
    expect(f.primary_doc_url).toBe(
      'https://www.sec.gov/Archives/edgar/data/1045810/000104581025000123/nvda-10q.htm',
    );
    expect(f.index_url).toContain('CIK=1045810');
    expect(f.index_url.endsWith('#0001045810-25-000123')).toBe(true);
  });

  it('uses the dashless accession when constructing primary_doc_url', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: ['0001045810-25-000123'],
          filingDate: ['2026-05-20'],
          reportDate: [''],
          form: ['8-K'],
          primaryDocument: ['a.htm'],
          primaryDocDescription: [''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out[0].primary_doc_url).toContain('/000104581025000123/');
    expect(out[0].primary_doc_url).not.toContain('/0001045810-25-000123/');
  });

  it('honors Math.min across columns: 3 accessions, 2 dates -> 2 rows', () => {
    const raw: UpstreamSubmissions = {
      name: 'NVIDIA CORP',
      filings: {
        recent: {
          accessionNumber: [
            '0001045810-25-000123',
            '0001045810-25-000122',
            '0001045810-25-000121',
          ],
          filingDate: ['2026-05-20', '2026-05-18'], // only 2 dates
          reportDate: ['', '', ''],
          form: ['8-K', '10-Q', '8-K'],
          primaryDocument: ['a.htm', 'b.htm', 'c.htm'],
          primaryDocDescription: ['', '', ''],
        },
      },
    };
    const out = normalizeSubmissions(raw, makeBellwether());
    expect(out).toHaveLength(2);
  });
});

// ── AI_BELLWETHERS cohort smoke checks ──────────────────────────────

describe('AI_BELLWETHERS', () => {
  const expectedTickers = [
    'NVDA',
    'MSFT',
    'GOOGL',
    'META',
    'AAPL',
    'AMZN',
    'AMD',
    'AVGO',
    'ORCL',
    'PLTR',
    'ARM',
    'TSM',
    'SMCI',
    'TSLA',
  ];

  it('contains exactly the expected 14 AI bellwether tickers', () => {
    expect(AI_BELLWETHERS).toHaveLength(14);
    const tickers = AI_BELLWETHERS.map(b => b.ticker).sort();
    expect(tickers).toEqual([...expectedTickers].sort());
  });

  it('every entry has a 10-digit zero-padded CIK', () => {
    for (const b of AI_BELLWETHERS) {
      expect(b.cik).toMatch(/^\d{10}$/);
    }
  });

  it('every entry has a non-empty ticker, display_name, and category', () => {
    for (const b of AI_BELLWETHERS) {
      expect(b.ticker.length).toBeGreaterThan(0);
      expect(b.display_name.length).toBeGreaterThan(0);
      expect(b.category.length).toBeGreaterThan(0);
    }
  });

  it('every category is from the allowed set', () => {
    const allowed = new Set(['silicon', 'hyperscaler', 'ai-native', 'infra', 'consumer']);
    for (const b of AI_BELLWETHERS) {
      expect(allowed.has(b.category)).toBe(true);
    }
  });

  it('every ticker is unique', () => {
    const tickers = AI_BELLWETHERS.map(b => b.ticker);
    expect(new Set(tickers).size).toBe(tickers.length);
  });

  it('every CIK is unique', () => {
    const ciks = AI_BELLWETHERS.map(b => b.cik);
    expect(new Set(ciks).size).toBe(ciks.length);
  });
});
