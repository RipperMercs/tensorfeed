import { describe, it, expect, vi } from 'vitest';
import {
  AI_NAICS_CODES,
  WINDOW_DAYS,
  MAX_PAGES,
  AI_PROCUREMENT_SNAPSHOT_KEY,
  PROCUREMENT_SOURCE,
  PROCUREMENT_LICENSE,
  fetchAiAwards,
  rollupAgencies,
  rollupVendors,
  buildProcurementSnapshot,
  captureAiProcurement,
} from './ai-procurement';
import type { AiAward } from './ai-procurement';
import type { Env } from './types';

// Fixed clock for every window calculation in this suite.
const NOW_MS = Date.parse('2026-06-04T00:00:00Z');
const DAY_MS = 86_400_000;

// Helper: produce a YYYY-MM-DD string a given number of days before NOW.
function daysAgo(n: number): string {
  return new Date(NOW_MS - n * DAY_MS).toISOString().slice(0, 10);
}

const FROM = '2025-12-06';
const TO = '2026-06-04';

// Upstream USAspending result-row shape used to build canned responses.
type UpstreamRow = {
  'Award ID'?: string | null;
  'Recipient Name'?: string | null;
  'Award Amount'?: number | string | null;
  'Awarding Agency'?: string | null;
  'NAICS Code'?: string | null;
  agency_slug?: string | null;
  generated_internal_id?: string | null;
  'Start Date'?: string | null;
  'Base Obligation Date'?: string | null;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Build a normalized AiAward for the pure-helper suites.
function award(partial: Partial<AiAward>): AiAward {
  return {
    award_id: 'A1',
    recipient: 'Acme Robotics LLC',
    amount: 1000,
    agency: 'Department of Defense',
    agency_slug: 'dod',
    naics_code: '541511',
    award_type: 'contract',
    internal_id: 'CONT_AWD_1',
    date: daysAgo(10),
    ...partial,
  };
}

describe('constants', () => {
  it('exposes the AI NAICS codes, window, page cap, key, source, and license', () => {
    expect(AI_NAICS_CODES).toEqual(['541511', '541512', '518210']);
    expect(WINDOW_DAYS).toBe(180);
    expect(MAX_PAGES).toBe(10);
    expect(AI_PROCUREMENT_SNAPSHOT_KEY).toBe('ai-procurement:snapshot');
    expect(PROCUREMENT_SOURCE).toContain('USAspending.gov');
    expect(PROCUREMENT_SOURCE).toContain('NAICS');
    expect(PROCUREMENT_LICENSE).toContain('Public domain');
  });
});

describe('fetchAiAwards', () => {
  it('parses two pages and stops when hasNext flips to false', async () => {
    const pages: number[] = [];
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as { page: number };
      pages.push(body.page);
      return jsonResponse({
        results: [
          {
            'Award ID': `AWD-${body.page}`,
            'Recipient Name': 'Acme Robotics LLC',
            'Award Amount': 100 * body.page,
            'Awarding Agency': 'Department of Defense',
            'NAICS Code': '541511',
            agency_slug: 'dod',
            generated_internal_id: `id-${body.page}`,
            'Start Date': '2026-01-01',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: body.page < 2 },
      });
    });

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);

    // Page 1 (hasNext true) then page 2 (hasNext false), then stop.
    expect(pages).toEqual([1, 2]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(awards.map((a) => a.award_id)).toEqual(['AWD-1', 'AWD-2']);
  });

  it('maps rows to AiAward: contract type, NAICS Code, obligation-date-first', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            'Award ID': 'OBLIG',
            'Recipient Name': 'Palantir Technologies Inc',
            'Award Amount': '4200',
            'Awarding Agency': 'Army',
            'NAICS Code': '541512',
            agency_slug: 'army',
            generated_internal_id: 'oblig-1',
            'Start Date': '2026-09-01',
            'Base Obligation Date': '2026-02-15',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: false },
      }),
    );

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toHaveLength(1);
    const a = awards[0];
    expect(a.award_type).toBe('contract');
    expect(a.naics_code).toBe('541512');
    expect(a.amount).toBe(4200);
    expect(a.recipient).toBe('Palantir Technologies Inc');
    // Base Obligation Date wins over Start Date, sliced to 10 chars.
    expect(a.date).toBe('2026-02-15');
  });

  it('treats a null Award Amount as 0 and missing dates as null', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            'Award ID': 'NULLAMT',
            'Recipient Name': 'Acme Robotics LLC',
            'Award Amount': null,
            'Awarding Agency': 'DoD',
            'NAICS Code': null,
            agency_slug: 'dod',
            generated_internal_id: 'na',
            'Start Date': null,
            'Base Obligation Date': null,
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: false },
      }),
    );

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toHaveLength(1);
    expect(awards[0].amount).toBe(0);
    expect(awards[0].date).toBeNull();
    expect(awards[0].naics_code).toBe('');
  });

  it('caps pagination at MAX_PAGES when hasNext never flips', async () => {
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call += 1;
      return jsonResponse({
        results: [
          {
            'Award ID': `LOOP-${call}`,
            'Recipient Name': 'Acme Robotics LLC',
            'Award Amount': 1,
            'Awarding Agency': 'DoD',
            'NAICS Code': '541511',
            agency_slug: 'dod',
            generated_internal_id: `loop-${call}`,
            'Start Date': '2026-01-01',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: true },
      });
    });

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledTimes(MAX_PAGES);
    expect(awards).toHaveLength(MAX_PAGES);
  });

  it('sends the NAICS filter and contract award-type codes in the request body', async () => {
    let captured: {
      filters?: {
        naics_codes?: string[];
        award_type_codes?: string[];
        time_period?: { start_date?: string; end_date?: string }[];
      };
      fields?: string[];
      sort?: string;
      order?: string;
    } = {};
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return jsonResponse({ results: [], page_metadata: { hasNext: false } });
    });

    await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(captured.filters?.naics_codes).toEqual(AI_NAICS_CODES);
    expect(captured.filters?.award_type_codes).toEqual(['A', 'B', 'C', 'D']);
    expect(captured.filters?.time_period?.[0]).toEqual({ start_date: FROM, end_date: TO });
    expect(captured.fields).toContain('NAICS Code');
    expect(captured.sort).toBe('Award Amount');
    expect(captured.order).toBe('desc');
  });

  it('swallows a non-ok (500) response without throwing and returns []', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'boom' }, 500));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows a thrown / aborted fetch without throwing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows a JSON parse error without throwing', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response('not json at all', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const awards = await fetchAiAwards(FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('rollupAgencies', () => {
  it('sums usd and award_count by agency_slug, sorted by usd desc', () => {
    const awards = [
      award({ amount: 100, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 400, agency: 'Navy', agency_slug: 'navy' }),
      award({ amount: 300, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 999, agency: 'CIA', agency_slug: 'cia' }),
    ];
    const agencies = rollupAgencies(awards);
    expect(agencies.map((a) => a.agency_slug)).toEqual(['cia', 'army', 'navy']);
    expect(agencies[0]).toEqual({ agency: 'CIA', agency_slug: 'cia', usd: 999, award_count: 1 });
    expect(agencies[1]).toEqual({ agency: 'Army', agency_slug: 'army', usd: 400, award_count: 2 });
    expect(agencies[2]).toEqual({ agency: 'Navy', agency_slug: 'navy', usd: 400, award_count: 1 });
  });

  it('returns an empty array for no awards', () => {
    expect(rollupAgencies([])).toEqual([]);
  });
});

describe('rollupVendors', () => {
  const cohortTokens = ['palantir', 'anthropic', 'scale ai'];

  it('flags a non-cohort recipient as emerging and a cohort recipient as not emerging', () => {
    const awards = [
      award({ recipient: 'Acme Robotics LLC', amount: 5000 }),
      award({ recipient: 'Palantir Technologies Inc', amount: 9000 }),
    ];
    const vendors = rollupVendors(awards, cohortTokens);
    const acme = vendors.find((v) => v.recipient === 'Acme Robotics LLC');
    const palantir = vendors.find((v) => v.recipient === 'Palantir Technologies Inc');
    expect(acme?.emerging).toBe(true);
    expect(palantir?.emerging).toBe(false);
  });

  it('sums usd and award_count by recipient, sorted by usd desc', () => {
    const awards = [
      award({ recipient: 'Acme Robotics LLC', amount: 1000 }),
      award({ recipient: 'Acme Robotics LLC', amount: 2000 }),
      award({ recipient: 'Palantir Technologies Inc', amount: 9000 }),
    ];
    const vendors = rollupVendors(awards, cohortTokens);
    expect(vendors.map((v) => v.recipient)).toEqual([
      'Palantir Technologies Inc',
      'Acme Robotics LLC',
    ]);
    expect(vendors[0]).toEqual({
      recipient: 'Palantir Technologies Inc',
      usd: 9000,
      award_count: 1,
      emerging: false,
    });
    expect(vendors[1]).toEqual({
      recipient: 'Acme Robotics LLC',
      usd: 3000,
      award_count: 2,
      emerging: true,
    });
  });

  it('matches cohort tokens case-insensitively against the recipient', () => {
    const awards = [award({ recipient: 'PALANTIR USG, INC', amount: 100 })];
    const vendors = rollupVendors(awards, cohortTokens);
    expect(vendors[0].emerging).toBe(false);
  });
});

describe('buildProcurementSnapshot', () => {
  const capturedAt = new Date(NOW_MS).toISOString();

  it('computes totals, unique counts, and attaches metadata', () => {
    const awards = [
      award({ award_id: 'A', recipient: 'Acme Robotics LLC', amount: 1000, agency_slug: 'dod', agency: 'DoD' }),
      award({ award_id: 'B', recipient: 'Beta AI Corp', amount: 2000, agency_slug: 'dod', agency: 'DoD' }),
      award({ award_id: 'C', recipient: 'Acme Robotics LLC', amount: 500, agency_slug: 'army', agency: 'Army' }),
    ];
    const snap = buildProcurementSnapshot(awards, capturedAt, WINDOW_DAYS);
    expect(snap.ok).toBe(true);
    expect(snap.captured_at).toBe(capturedAt);
    expect(snap.source).toBe(PROCUREMENT_SOURCE);
    expect(snap.license).toBe(PROCUREMENT_LICENSE);
    expect(snap.window_days).toBe(WINDOW_DAYS);
    expect(snap.naics_codes).toEqual(AI_NAICS_CODES);
    expect(snap.total_usd).toBe(3500);
    expect(snap.total_awards).toBe(3);
    expect(snap.unique_recipients).toBe(2);
    expect(snap.unique_agencies).toBe(2);
  });

  it('caps by_agency at 15 and by_vendor at 25, sorted by usd desc', () => {
    const awards: AiAward[] = [];
    for (let i = 0; i < 20; i++) {
      awards.push(
        award({
          award_id: `AG-${i}`,
          internal_id: `ag-${i}`,
          recipient: `Vendor ${i}`,
          amount: (i + 1) * 10,
          agency: `Agency ${i}`,
          agency_slug: `ag-${i}`,
          date: daysAgo(i),
        }),
      );
    }
    for (let i = 0; i < 30; i++) {
      awards.push(
        award({
          award_id: `V-${i}`,
          internal_id: `v-${i}`,
          recipient: `Recipient ${i}`,
          amount: (i + 1) * 5,
          agency: 'Shared',
          agency_slug: 'shared',
          date: daysAgo(i),
        }),
      );
    }
    const snap = buildProcurementSnapshot(awards, capturedAt, WINDOW_DAYS);
    expect(snap.by_agency).toHaveLength(15);
    expect(snap.by_vendor).toHaveLength(25);
    // Sorted desc by usd.
    for (let i = 1; i < snap.by_agency.length; i++) {
      expect(snap.by_agency[i - 1].usd).toBeGreaterThanOrEqual(snap.by_agency[i].usd);
    }
    for (let i = 1; i < snap.by_vendor.length; i++) {
      expect(snap.by_vendor[i - 1].usd).toBeGreaterThanOrEqual(snap.by_vendor[i].usd);
    }
  });

  it('orders recent by date desc, caps at 25, and drops null-date awards', () => {
    const awards: AiAward[] = [];
    for (let i = 0; i < 30; i++) {
      awards.push(award({ award_id: `R${i}`, internal_id: `id-${i}`, amount: 1, date: daysAgo(i) }));
    }
    awards.push(award({ award_id: 'NULL1', internal_id: 'null-1', date: null }));
    awards.push(award({ award_id: 'NULL2', internal_id: 'null-2', date: null }));
    const snap = buildProcurementSnapshot(awards, capturedAt, WINDOW_DAYS);
    expect(snap.recent).toHaveLength(25);
    expect(snap.recent[0].award_id).toBe('R0');
    expect(snap.recent[24].award_id).toBe('R24');
    expect(snap.recent.every((a) => a.date !== null)).toBe(true);
  });

  it('flags emerging vendors against the real FED_AI_COHORT tokens', () => {
    const awards = [
      award({ recipient: 'Acme Robotics LLC', amount: 100 }),
      award({ recipient: 'Palantir Technologies Inc', amount: 200 }),
    ];
    const snap = buildProcurementSnapshot(awards, capturedAt, WINDOW_DAYS);
    const acme = snap.by_vendor.find((v) => v.recipient === 'Acme Robotics LLC');
    const palantir = snap.by_vendor.find((v) => v.recipient === 'Palantir Technologies Inc');
    expect(acme?.emerging).toBe(true);
    expect(palantir?.emerging).toBe(false);
  });

  it('produces output JSON with zero em dashes, en dashes, and no double hyphens', () => {
    const awards = [
      award({ award_id: 'D1', recipient: 'Acme Robotics LLC', amount: 1000 }),
      award({ award_id: 'D2', recipient: 'Palantir Technologies Inc', amount: 2000 }),
    ];
    const snap = buildProcurementSnapshot(awards, capturedAt, WINDOW_DAYS);
    const json = JSON.stringify(snap);
    expect(json).not.toContain('—'); // em dash
    expect(json).not.toContain('–'); // en dash
    expect(json).not.toContain('--'); // double hyphen
  });
});

describe('captureAiProcurement', () => {
  function memoryKv(): { kv: KVNamespace; store: Map<string, string> } {
    const store = new Map<string, string>();
    const kv = {
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
    } as unknown as KVNamespace;
    return { kv, store };
  }

  it('fetches the 180 day window, builds the snapshot, and writes both KV keys', async () => {
    let capturedFrom = '';
    let capturedTo = '';
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const parsed = JSON.parse(init?.body as string) as {
        filters?: { time_period?: { start_date?: string; end_date?: string }[] };
      };
      const tp = parsed.filters?.time_period?.[0];
      capturedFrom = tp?.start_date ?? '';
      capturedTo = tp?.end_date ?? '';
      return jsonResponse({
        results: [
          {
            'Award ID': 'CAP-1',
            'Recipient Name': 'Acme Robotics LLC',
            'Award Amount': 1234,
            'Awarding Agency': 'DoD',
            'NAICS Code': '541511',
            agency_slug: 'dod',
            generated_internal_id: 'cap-1',
            'Start Date': '2026-03-01',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: false },
      });
    });

    const { kv, store } = memoryKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as Env;
    const result = await captureAiProcurement(env, NOW_MS, fetchFn as unknown as typeof fetch);

    expect(result).toEqual({ awards: 1 });
    expect(capturedTo).toBe(new Date(NOW_MS).toISOString().slice(0, 10));
    expect(capturedFrom).toBe(new Date(NOW_MS - WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10));

    const day = new Date(NOW_MS).toISOString().slice(0, 10);
    expect(store.has(AI_PROCUREMENT_SNAPSHOT_KEY)).toBe(true);
    expect(store.has(`ai-procurement:day:${day}`)).toBe(true);

    const snap = JSON.parse(store.get(AI_PROCUREMENT_SNAPSHOT_KEY) as string) as {
      total_usd: number;
      total_awards: number;
      captured_at: string;
    };
    expect(snap.total_usd).toBe(1234);
    expect(snap.total_awards).toBe(1);
    expect(snap.captured_at).toBe(new Date(NOW_MS).toISOString());
  });

  it('does not throw when env has no TENSORFEED_CACHE binding', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ results: [], page_metadata: { hasNext: false } }),
    );
    const env = {} as Env;
    const result = await captureAiProcurement(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ awards: 0 });
  });
});
