import { describe, it, expect, vi } from 'vitest';
import {
  screenPartyAgainstCSL,
  CSL_SEARCH_URL,
  type CslScreenResult,
} from './compliance-screen';
import type { Env } from './types';

// A keyed env activates live screening; an unkeyed env must short-circuit.
const KEYED_ENV = { TRADE_GOV_CSL_KEY: 'test-subscription-key' } as unknown as Env;
const UNKEYED_ENV = {} as unknown as Env;

// Minimal fetch stub: we only read res.ok, res.status, and res.json().
function okFetch(body: unknown): typeof fetch {
  return (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch;
}
function statusFetch(status: number): typeof fetch {
  return (async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch;
}
function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
}

const ACME_EL_RESULT = {
  name: 'ACME TRADING CO',
  alt_names: ['ACME TRADING COMPANY LIMITED'],
  type: 'Entity',
  source: 'Entity List (EL) - Bureau of Industry and Security',
  source_list_url: 'https://www.bis.doc.gov/entitylist',
  source_information_url: 'https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/entity-list',
  programs: ['EAR'],
  entity_number: '12345',
  id: '12345',
  addresses: [{ address: '1 Industrial Rd', city: 'Shenzhen', state: null, postal_code: '518000', country: 'CN' }],
  score: 0.99,
};

describe('screenPartyAgainstCSL', () => {
  it('short-circuits to screening_not_configured when no key is set, without calling fetch', async () => {
    const fetchFn = vi.fn();
    const r = await screenPartyAgainstCSL(UNKEYED_ENV, 'Acme Trading Co', {}, fetchFn as unknown as typeof fetch);
    expect(r.available).toBe(false);
    expect(r.error).toBe('screening_not_configured');
    expect(r.total).toBe(0);
    expect(r.matches).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('flags an exact name match as match_type exact', async () => {
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'Acme Trading Co',
      {},
      okFetch({ total: 1, results: [ACME_EL_RESULT] }),
    );
    expect(r.available).toBe(true);
    expect(r.error).toBeNull();
    expect(r.total).toBe(1);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].match_type).toBe('exact');
    expect(r.matches[0].source).toContain('Entity List');
    expect(r.matches[0].source_list_url).toContain('bis.doc.gov');
  });

  it('treats an alias (alt_names) exact match as match_type exact', async () => {
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'acme trading company limited',
      {},
      okFetch({ total: 1, results: [ACME_EL_RESULT] }),
    );
    expect(r.matches[0].match_type).toBe('exact');
  });

  it('treats corporate-suffix punctuation variants as an exact match', async () => {
    // The official Entity List form carries periods/commas ("Co., Ltd.") that a
    // caller rarely types. Punctuation-insensitive normalization keeps these an
    // exact hit instead of demoting a definitive listing to a fuzzy possible.
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'Huawei Technologies Co Ltd',
      {},
      okFetch({ total: 1, results: [{ ...ACME_EL_RESULT, name: 'Huawei Technologies Co., Ltd.', alt_names: [] }] }),
    );
    expect(r.matches[0].match_type).toBe('exact');
  });

  it('preserves non-Latin letters when normalizing (does not strip accents to overmatch)', async () => {
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'Acme Cafe',
      {},
      okFetch({ total: 1, results: [{ ...ACME_EL_RESULT, name: 'Acme Café', alt_names: [] }] }),
    );
    // "Acme Cafe" must NOT exact-match "Acme Café" (e != é); accents are letters, not punctuation.
    expect(r.matches[0].match_type).toBe('fuzzy');
  });

  it('treats a near but unequal name as match_type fuzzy', async () => {
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'Acme Trade Co',
      {},
      okFetch({ total: 1, results: [ACME_EL_RESULT] }),
    );
    expect(r.matches[0].match_type).toBe('fuzzy');
  });

  it('returns an empty match set with available true when nothing matches', async () => {
    const r = await screenPartyAgainstCSL(
      KEYED_ENV,
      'Totally Unlisted LLC',
      {},
      okFetch({ total: 0, results: [] }),
    );
    expect(r.available).toBe(true);
    expect(r.error).toBeNull();
    expect(r.total).toBe(0);
    expect(r.matches).toEqual([]);
  });

  it('reports upstream_error on a non-200 response (auth failure, server error)', async () => {
    const r401 = await screenPartyAgainstCSL(KEYED_ENV, 'Acme', {}, statusFetch(401));
    expect(r401.available).toBe(false);
    expect(r401.error).toBe('upstream_error');
    const r500 = await screenPartyAgainstCSL(KEYED_ENV, 'Acme', {}, statusFetch(500));
    expect(r500.available).toBe(false);
    expect(r500.error).toBe('upstream_error');
  });

  it('reports upstream_error when the fetch throws', async () => {
    const r = await screenPartyAgainstCSL(KEYED_ENV, 'Acme', {}, throwingFetch());
    expect(r.available).toBe(false);
    expect(r.error).toBe('upstream_error');
  });

  it('calls the live CSL search host with fuzzy_name and the subscription-key header', async () => {
    let calledUrl = '';
    let calledHeaders: Record<string, string> = {};
    const spy: typeof fetch = (async (url: string, init?: RequestInit) => {
      calledUrl = String(url);
      calledHeaders = (init?.headers as Record<string, string>) ?? {};
      return { ok: true, status: 200, json: async () => ({ total: 0, results: [] }) };
    }) as unknown as typeof fetch;
    await screenPartyAgainstCSL(KEYED_ENV, 'Acme & Sons', {}, spy);
    expect(calledUrl.startsWith(CSL_SEARCH_URL)).toBe(true);
    expect(calledUrl).toContain('fuzzy_name=true');
    expect(calledUrl).toContain('name=Acme');
    expect(calledHeaders['subscription-key']).toBe('test-subscription-key');
  });

  it('caps the number of matches it surfaces', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...ACME_EL_RESULT, name: `ACME ${i}`, entity_number: String(i) }));
    const r = await screenPartyAgainstCSL(KEYED_ENV, 'Acme', {}, okFetch({ total: 50, results: many }));
    expect(r.total).toBe(50);
    expect(r.matches.length).toBeLessThanOrEqual(25);
  });
});
