import { describe, it, expect } from 'vitest';
import {
  buildAiCompanyEnvelope,
  filterNewsByAliases,
  filterFundingByInvestor,
  isInCohort,
  findBellwether,
  AI_COMPANY_NEWS_ALIASES,
} from './premium-ai-companies';
import type { Article } from './types';
import type { SecFiling } from './sec-filings-fetcher';
import type { FundingRound } from './funding';

function mkArticle(over: Partial<Article>): Article {
  return {
    id: over.id ?? 'a1',
    title: over.title ?? 'untitled',
    url: over.url ?? 'https://example.com',
    source: over.source ?? 'TechCrunch AI',
    sourceDomain: over.sourceDomain ?? 'techcrunch.com',
    snippet: over.snippet ?? '',
    categories: over.categories ?? [],
    publishedAt: over.publishedAt ?? '2026-05-27T12:00:00Z',
    fetchedAt: over.fetchedAt ?? '2026-05-27T12:05:00Z',
  };
}

function mkFiling(over: Partial<SecFiling>): SecFiling {
  return {
    accession_number: over.accession_number ?? '0001045810-26-000001',
    cik: over.cik ?? '0001045810',
    company_name: over.company_name ?? 'NVIDIA CORP',
    ticker: over.ticker ?? 'NVDA',
    category: over.category ?? 'silicon',
    form: over.form ?? '8-K',
    filing_date: over.filing_date ?? '2026-05-27',
    report_date: over.report_date ?? '2026-05-27',
    primary_doc: over.primary_doc ?? 'doc.htm',
    primary_doc_description: over.primary_doc_description ?? '8-K',
    primary_doc_url: over.primary_doc_url ?? 'https://www.sec.gov/...',
    index_url: over.index_url ?? 'https://www.sec.gov/...',
  };
}

function mkRound(over: Partial<FundingRound>): FundingRound {
  return {
    id: over.id ?? 'r1',
    company: over.company ?? 'Anthropic',
    category: over.category ?? 'frontier-lab',
    stage: over.stage ?? 'strategic',
    amountM: over.amountM ?? 1000,
    valuationB: over.valuationB ?? null,
    announcedDate: over.announcedDate ?? '2026-05-01',
    leadInvestors: over.leadInvestors ?? [],
    notableInvestors: over.notableInvestors ?? [],
    description: over.description ?? 'desc',
    url: over.url ?? 'https://example.com',
    sourceUrl: over.sourceUrl ?? 'https://example.com',
  };
}

describe('isInCohort', () => {
  it('returns true for canonical bellwether tickers (case-insensitive)', () => {
    expect(isInCohort('NVDA')).toBe(true);
    expect(isInCohort('nvda')).toBe(true);
    expect(isInCohort('GOOGL')).toBe(true);
    expect(isInCohort('META')).toBe(true);
  });

  it('returns false for tickers outside the cohort', () => {
    expect(isInCohort('TSLAQ')).toBe(false);
    expect(isInCohort('BBAI')).toBe(false);
    expect(isInCohort('')).toBe(false);
  });
});

describe('findBellwether', () => {
  it('returns the entry with CIK and display_name for NVDA', () => {
    const b = findBellwether('NVDA');
    expect(b).toBeDefined();
    expect(b?.cik).toBe('0001045810');
    expect(b?.display_name).toBe('NVIDIA');
  });
});

describe('AI_COMPANY_NEWS_ALIASES', () => {
  it('covers all 14 bellwether tickers', () => {
    const expectedTickers = [
      'NVDA', 'AMD', 'AVGO', 'TSM', 'ARM',
      'MSFT', 'GOOGL', 'AMZN', 'ORCL',
      'PLTR', 'SMCI',
      'AAPL', 'META', 'TSLA',
    ];
    for (const t of expectedTickers) {
      expect(AI_COMPANY_NEWS_ALIASES[t]).toBeDefined();
      expect(AI_COMPANY_NEWS_ALIASES[t].length).toBeGreaterThan(0);
    }
  });

  it('contains no em dashes in any alias', () => {
    for (const aliases of Object.values(AI_COMPANY_NEWS_ALIASES)) {
      for (const alias of aliases) {
        expect(alias).not.toMatch(/—/);
        expect(alias).not.toMatch(/--/);
      }
    }
  });
});

describe('filterNewsByAliases', () => {
  it('matches articles whose title contains a curated alias', () => {
    const articles = [
      mkArticle({ id: '1', title: 'NVIDIA announces Rubin successor at GTC' }),
      mkArticle({ id: '2', title: 'AMD Instinct MI400 cluster spec leaked' }),
      mkArticle({ id: '3', title: 'Random unrelated headline' }),
    ];
    const res = filterNewsByAliases(articles, ['NVIDIA', 'Nvidia']);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('1');
    expect(res[0].matched_aliases).toContain('NVIDIA');
  });

  it('matches against the snippet too', () => {
    const articles = [
      mkArticle({
        id: '1',
        title: 'AI hardware roundup',
        snippet: 'Includes commentary on NVIDIA, AMD, and others.',
      }),
    ];
    const res = filterNewsByAliases(articles, ['NVIDIA']);
    expect(res.length).toBe(1);
    expect(res[0].matched_aliases).toContain('NVIDIA');
  });

  it('respects the limit cap', () => {
    const articles = Array.from({ length: 20 }, (_, i) =>
      mkArticle({ id: String(i), title: 'NVIDIA item ' + i }),
    );
    const res = filterNewsByAliases(articles, ['NVIDIA'], 5);
    expect(res.length).toBe(5);
  });

  it('returns empty for zero alias hits', () => {
    const articles = [mkArticle({ title: 'Coffee shop opens downtown' })];
    const res = filterNewsByAliases(articles, ['NVIDIA']);
    expect(res.length).toBe(0);
  });

  it('is case-insensitive', () => {
    const articles = [mkArticle({ title: 'nvidia delivers another beat' })];
    const res = filterNewsByAliases(articles, ['NVIDIA']);
    expect(res.length).toBe(1);
  });
});

describe('filterFundingByInvestor', () => {
  it('surfaces rounds where the company is a lead investor', () => {
    const rounds = [
      mkRound({ id: 'r1', company: 'Anthropic', leadInvestors: ['Google'] }),
      mkRound({ id: 'r2', company: 'Cursor', leadInvestors: ['Thrive Capital'] }),
    ];
    const res = filterFundingByInvestor(rounds, 'Alphabet (Google)', ['Google', 'Alphabet']);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('r1');
  });

  it('surfaces rounds where the company is a notable investor', () => {
    const rounds = [
      mkRound({ id: 'r1', company: 'Anthropic', notableInvestors: ['Amazon'] }),
    ];
    const res = filterFundingByInvestor(rounds, 'Amazon', ['Amazon AWS']);
    expect(res.length).toBe(1);
  });

  it('returns empty when company is unrelated to all rounds', () => {
    const rounds = [
      mkRound({ id: 'r1', leadInvestors: ['Thrive Capital'], notableInvestors: ['Accel'] }),
    ];
    const res = filterFundingByInvestor(rounds, 'NVIDIA', ['NVIDIA', 'Nvidia']);
    expect(res.length).toBe(0);
  });
});

describe('buildAiCompanyEnvelope', () => {
  it('returns null when ticker is not in cohort', () => {
    const env = buildAiCompanyEnvelope('FAKE', [], [], [], '2026-05-27T18:00:00Z');
    expect(env).toBeNull();
  });

  it('composes the envelope for NVDA with filings + news + funding', () => {
    const filings = [
      mkFiling({ accession_number: '0001045810-26-000052', form: '10-Q', filing_date: '2026-05-20' }),
      mkFiling({ accession_number: '0001045810-26-000051', form: '8-K', filing_date: '2026-05-20' }),
    ];
    const articles = [
      mkArticle({ id: 'n1', title: 'NVIDIA earnings beat consensus' }),
      mkArticle({ id: 'n2', title: 'Coffee shop opens downtown' }),
    ];
    const rounds = [
      mkRound({ id: 'r1', company: 'Lambda Labs', leadInvestors: ['NVIDIA'] }),
    ];
    const env = buildAiCompanyEnvelope('NVDA', filings, articles, rounds, '2026-05-27T18:00:00Z');
    expect(env).not.toBeNull();
    if (!env) return;
    expect(env.ok).toBe(true);
    expect(env.ticker).toBe('NVDA');
    expect(env.cohort_size).toBe(14);
    expect(env.company.cik).toBe('0001045810');
    expect(env.company.display_name).toBe('NVIDIA');
    expect(env.company.exchange).toBe('NASDAQ');
    expect(env.filings.count).toBe(2);
    expect(env.news.count).toBe(1);
    expect(env.news.items[0].id).toBe('n1');
    expect(env.funding_as_investor.count).toBe(1);
    expect(env.funding_as_investor.items[0].id).toBe('r1');
  });

  it('caps filings at 10', () => {
    const filings = Array.from({ length: 25 }, (_, i) =>
      mkFiling({ accession_number: `0001045810-26-${String(i).padStart(6, '0')}` }),
    );
    const env = buildAiCompanyEnvelope('NVDA', filings, [], [], '2026-05-27T18:00:00Z');
    expect(env?.filings.count).toBe(10);
  });

  it('is uppercase-normalized on the ticker input', () => {
    const env = buildAiCompanyEnvelope('nvda', [], [], [], '2026-05-27T18:00:00Z');
    expect(env?.ticker).toBe('NVDA');
  });

  it('surfaces the passed capturedAt verbatim at the top level (staleness no-charge basis)', () => {
    // getAiCompanyEnvelope now passes the REAL SEC filings snapshot capture
    // time here (not new Date()), so the top-level capturedAt the staleness
    // check reads reflects the 6h cron, not build time. Pin that pass-through.
    const snapTime = '2026-05-27T06:00:00.000Z';
    const env = buildAiCompanyEnvelope('NVDA', [], [], [], snapTime);
    expect(env).not.toBeNull();
    if (!env) return;
    expect(env.capturedAt).toBe(snapTime);
  });

  it('returns an envelope free of em dashes in description fields', () => {
    const env = buildAiCompanyEnvelope('NVDA', [], [], [], '2026-05-27T18:00:00Z');
    expect(env).not.toBeNull();
    if (!env) return;
    const serialized = JSON.stringify(env);
    expect(serialized).not.toMatch(/—/);
    expect(serialized).not.toMatch(/--/);
  });
});
