import { describe, it, expect, vi } from 'vitest';
import {
  FED_AI_COHORT,
  FED_SPEND_SNAPSHOT_KEY,
  FED_SOURCE,
  FED_LICENSE,
  ACTIVE_WINDOW_DAYS,
  MAX_PAGES,
  matchesVendor,
  rollupVendor,
  buildSnapshot,
  fetchVendorAwards,
  captureFederalSpending,
} from './federal-spending-fetcher';
import type { FedVendor, FedAward } from './federal-spending-fetcher';
import type { Env } from './types';

// Fixed clock for every window calculation in this suite.
const NOW_MS = Date.parse('2026-05-31T00:00:00Z');
const DAY_MS = 86_400_000;

// Helper: produce a YYYY-MM-DD string a given number of days before NOW.
function daysAgo(n: number): string {
  return new Date(NOW_MS - n * DAY_MS).toISOString().slice(0, 10);
}

const palantir = FED_AI_COHORT.find((v) => v.slug === 'palantir') as FedVendor;
const anthropic = FED_AI_COHORT.find((v) => v.slug === 'anthropic') as FedVendor;

function award(partial: Partial<FedAward>): FedAward {
  return {
    award_id: 'A1',
    recipient: 'Palantir Technologies Inc.',
    amount: 1000,
    agency: 'Department of Defense',
    agency_slug: 'dod',
    award_type: 'contract',
    internal_id: 'CONT_AWD_1',
    date: daysAgo(10),
    ...partial,
  };
}

describe('cohort + constants', () => {
  it('has the 8 pilot-validated vendors with the expected exact slugs', () => {
    expect(FED_AI_COHORT).toHaveLength(8);
    expect(FED_AI_COHORT.map((v) => v.slug)).toEqual([
      'palantir',
      'anduril',
      'shield-ai',
      'vannevar-labs',
      'scale-ai',
      'skydio',
      'saronic',
      'anthropic',
    ]);
  });

  it('every cohort vendor has a non-empty match token and valid category', () => {
    const cats = new Set(['ai-native', 'defense-ai', 'frontier-lab', 'silicon']);
    for (const v of FED_AI_COHORT) {
      expect(v.match.length).toBeGreaterThan(0);
      expect(v.match).toBe(v.match.toLowerCase());
      expect(cats.has(v.category)).toBe(true);
    }
  });

  it('exports the KV key, source, license, and window constants', () => {
    expect(FED_SPEND_SNAPSHOT_KEY).toBe('fedspend:snapshot');
    expect(FED_SOURCE).toContain('USAspending.gov');
    expect(FED_LICENSE).toContain('Public domain');
    expect(ACTIVE_WINDOW_DAYS).toBe(365);
  });
});

describe('matchesVendor', () => {
  it('matches case-insensitively on the vendor match token', () => {
    expect(matchesVendor('PALANTIR TECHNOLOGIES INC.', palantir)).toBe(true);
    expect(matchesVendor('Palantir USG, Inc.', palantir)).toBe(true);
  });

  it('returns false when the token is absent', () => {
    expect(matchesVendor('Lockheed Martin Corporation', palantir)).toBe(false);
    expect(matchesVendor('Anthropic PBC', palantir)).toBe(false);
  });

  it('matches multi-word tokens like "scale ai"', () => {
    const scale = FED_AI_COHORT.find((v) => v.slug === 'scale-ai') as FedVendor;
    expect(matchesVendor('SCALE AI INC', scale)).toBe(true);
    expect(matchesVendor('Scale Computing', scale)).toBe(false);
  });
});

describe('rollupVendor', () => {
  it('sums total_usd and award_count over all awards including null-date ones', () => {
    const awards = [
      award({ amount: 1000, date: daysAgo(10) }),
      award({ amount: 2000, date: daysAgo(20) }),
      award({ amount: 5000, date: null }),
    ];
    const r = rollupVendor(palantir, awards);
    expect(r.total_usd).toBe(8000);
    expect(r.award_count).toBe(3);
  });

  it('keeps null-date awards in the total but they never set last_award_date', () => {
    const awards = [
      award({ amount: 1000, date: daysAgo(10) }),
      award({ amount: 9999, date: null }),
    ];
    const r = rollupVendor(palantir, awards);
    expect(r.total_usd).toBe(10999);
    expect(r.award_count).toBe(2);
    expect(r.last_award_date).toBe(daysAgo(10));
  });

  it('sets last_award_date to the maximum non-null award date', () => {
    const awards = [
      award({ amount: 100, date: daysAgo(120) }),
      award({ amount: 200, date: daysAgo(5) }), // most recent
      award({ amount: 300, date: daysAgo(40) }),
    ];
    const r = rollupVendor(palantir, awards);
    expect(r.last_award_date).toBe(daysAgo(5));
  });

  it('returns null last_award_date when every award has a null date', () => {
    const awards = [
      award({ amount: 100, date: null }),
      award({ amount: 200, date: null }),
    ];
    const r = rollupVendor(palantir, awards);
    expect(r.last_award_date).toBeNull();
    expect(r.total_usd).toBe(300);
    expect(r.award_count).toBe(2);
  });

  it('returns top 3 agencies sorted by summed usd desc', () => {
    const awards = [
      award({ amount: 100, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 400, agency: 'Navy', agency_slug: 'navy' }),
      award({ amount: 50, agency: 'Air Force', agency_slug: 'af' }),
      award({ amount: 300, agency: 'Army', agency_slug: 'army' }),
      award({ amount: 999, agency: 'CIA', agency_slug: 'cia' }),
    ];
    const r = rollupVendor(palantir, awards);
    expect(r.top_agencies).toHaveLength(3);
    expect(r.top_agencies.map((a) => a.agency_slug)).toEqual(['cia', 'army', 'navy']);
    expect(r.top_agencies[0]).toEqual({ agency: 'CIA', agency_slug: 'cia', usd: 999 });
    expect(r.top_agencies[1]).toEqual({ agency: 'Army', agency_slug: 'army', usd: 400 });
    expect(r.top_agencies[2]).toEqual({ agency: 'Navy', agency_slug: 'navy', usd: 400 });
  });

  it('carries through vendor identity fields', () => {
    const r = rollupVendor(anthropic, []);
    expect(r.slug).toBe('anthropic');
    expect(r.name).toBe('Anthropic');
    expect(r.category).toBe('frontier-lab');
    expect(r.total_usd).toBe(0);
    expect(r.award_count).toBe(0);
    expect(r.top_agencies).toEqual([]);
    expect(r.last_award_date).toBeNull();
  });
});

describe('buildSnapshot', () => {
  it('sorts vendors by total_usd desc and sums totals', () => {
    const small = rollupVendor(anthropic, [award({ amount: 1000, recipient: 'Anthropic PBC' })]);
    const big = rollupVendor(palantir, [award({ amount: 9000 })]);
    const snap = buildSnapshot([small, big], [], '2026-05-31T00:00:00.000Z', 365);
    expect(snap.vendors.map((v) => v.slug)).toEqual(['palantir', 'anthropic']);
    expect(snap.total_usd).toBe(10000);
    expect(snap.total_awards).toBe(2);
    expect(snap.cohort_size).toBe(2);
  });

  it('attaches source, license, window, ok, and captured_at', () => {
    const snap = buildSnapshot([], [], '2026-05-31T00:00:00.000Z', 365);
    expect(snap.ok).toBe(true);
    expect(snap.source).toBe(FED_SOURCE);
    expect(snap.license).toBe(FED_LICENSE);
    expect(snap.window_days).toBe(365);
    expect(snap.captured_at).toBe('2026-05-31T00:00:00.000Z');
  });

  it('orders recent by date desc, caps at 25, and drops null-date awards', () => {
    const allAwards: FedAward[] = [];
    for (let i = 0; i < 30; i++) {
      allAwards.push(award({ award_id: `R${i}`, internal_id: `id-${i}`, amount: 1, date: daysAgo(i) }));
    }
    // Two null-date awards that must never appear in recent.
    allAwards.push(award({ award_id: 'NULL1', internal_id: 'null-1', date: null }));
    allAwards.push(award({ award_id: 'NULL2', internal_id: 'null-2', date: null }));
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.recent).toHaveLength(25);
    // Newest (daysAgo(0)) first.
    expect(snap.recent[0].award_id).toBe('R0');
    expect(snap.recent[24].award_id).toBe('R24');
    expect(snap.recent.every((a) => a.date !== null)).toBe(true);
  });

  it('computes cohort-wide top 10 agencies across all awards', () => {
    const allAwards: FedAward[] = [];
    // 12 distinct agencies, increasing usd so ordering is predictable.
    for (let i = 0; i < 12; i++) {
      allAwards.push(
        award({
          award_id: `A${i}`,
          internal_id: `id-${i}`,
          amount: (i + 1) * 100,
          agency: `Agency ${i}`,
          agency_slug: `ag-${i}`,
          date: daysAgo(i),
        }),
      );
    }
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.agencies).toHaveLength(10);
    expect(snap.agencies[0]).toEqual({ agency: 'Agency 11', agency_slug: 'ag-11', usd: 1200 });
    expect(snap.agencies[9]).toEqual({ agency: 'Agency 2', agency_slug: 'ag-2', usd: 300 });
  });

  it('aggregates agency usd across multiple awards to the same agency', () => {
    const allAwards = [
      award({ award_id: 'X1', internal_id: 'x1', amount: 200, agency: 'NSA', agency_slug: 'nsa' }),
      award({ award_id: 'X2', internal_id: 'x2', amount: 300, agency: 'NSA', agency_slug: 'nsa' }),
    ];
    const snap = buildSnapshot([], allAwards, '2026-05-31T00:00:00.000Z', 365);
    expect(snap.agencies).toHaveLength(1);
    expect(snap.agencies[0]).toEqual({ agency: 'NSA', agency_slug: 'nsa', usd: 500 });
  });
});

// ── Network layer ──────────────────────────────────────────────────

// Shape one upstream USAspending result row. award_type_codes in the
// request body tells us whether we are inside a contract or grant pull,
// but the upstream row itself does not echo that back.
type UpstreamRow = {
  'Award ID'?: string | null;
  'Recipient Name'?: string | null;
  'Award Amount'?: number | string | null;
  'Awarding Agency'?: string | null;
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

// Read the award_type_codes group from a request body to branch a mock.
function requestedCodes(init: RequestInit | undefined): string[] {
  const raw = typeof init?.body === 'string' ? init.body : '{}';
  const parsed = JSON.parse(raw) as { filters?: { award_type_codes?: string[] } };
  return parsed.filters?.award_type_codes ?? [];
}

function isContractCall(init: RequestInit | undefined): boolean {
  return requestedCodes(init).includes('A');
}

const FROM = '2025-05-31';
const TO = '2026-05-31';

describe('fetchVendorAwards', () => {
  it('caps pagination at MAX_PAGES per type and does not loop forever', async () => {
    let call = 0;
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      call += 1;
      const type = isContractCall(init) ? 'C' : 'G';
      // Always claim there is a next page so only the cap can stop us.
      return jsonResponse({
        results: [
          {
            'Award ID': `${type}-${call}`,
            'Recipient Name': 'Palantir USG, Inc.',
            'Award Amount': 100,
            'Awarding Agency': 'Department of Defense',
            agency_slug: 'dod',
            generated_internal_id: `CONT_AWD_${call}`,
            'Start Date': '2025-06-01',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: true },
      });
    });

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);

    // Two types, MAX_PAGES each => exactly 2 * MAX_PAGES fetch calls.
    expect(fetchFn).toHaveBeenCalledTimes(2 * MAX_PAGES);
    // One unique award per page per type.
    expect(awards).toHaveLength(2 * MAX_PAGES);
    expect(awards.filter((a) => a.award_type === 'contract')).toHaveLength(MAX_PAGES);
    expect(awards.filter((a) => a.award_type === 'grant')).toHaveLength(MAX_PAGES);
  });

  it('stops when hasNext flips to false (two pages then stop)', async () => {
    // Contracts: page 1 hasNext true, page 2 hasNext false. Grants: one
    // page, hasNext false. So 2 contract calls + 1 grant call = 3 total.
    const contractCalls: number[] = [];
    let grantPage = 0;
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as { page: number };
      if (isContractCall(init)) {
        contractCalls.push(body.page);
        return jsonResponse({
          results: [
            {
              'Award ID': `C-${body.page}`,
              'Recipient Name': 'Palantir Technologies Inc.',
              'Award Amount': 10,
              'Awarding Agency': 'Army',
              agency_slug: 'army',
              generated_internal_id: `id-c-${body.page}`,
              'Start Date': '2025-07-01',
            } satisfies UpstreamRow,
          ],
          page_metadata: { hasNext: body.page < 2 },
        });
      }
      grantPage += 1;
      return jsonResponse({ results: [], page_metadata: { hasNext: false } });
    });

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(contractCalls).toEqual([1, 2]);
    expect(grantPage).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(awards.map((a) => a.award_id)).toEqual(['C-1', 'C-2']);
  });

  it('drops false positives whose recipient does not contain the vendor match', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (isContractCall(init)) {
        return jsonResponse({
          results: [
            {
              'Award ID': 'GOOD',
              'Recipient Name': 'PALANTIR USG INC',
              'Award Amount': 500,
              'Awarding Agency': 'Navy',
              agency_slug: 'navy',
              generated_internal_id: 'good-1',
              'Start Date': '2025-08-01',
            } satisfies UpstreamRow,
            {
              'Award ID': 'BAD',
              'Recipient Name': 'Palomar Health District', // fuzzy false positive, no "palantir"
              'Award Amount': 999,
              'Awarding Agency': 'HHS',
              agency_slug: 'hhs',
              generated_internal_id: 'bad-1',
              'Start Date': '2025-08-02',
            } satisfies UpstreamRow,
          ],
          page_metadata: { hasNext: false },
        });
      }
      return jsonResponse({ results: [], page_metadata: { hasNext: false } });
    });

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards.map((a) => a.award_id)).toEqual(['GOOD']);
  });

  it('merges contracts and grants into one array with correct award_type tags', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (isContractCall(init)) {
        return jsonResponse({
          results: [
            {
              'Award ID': 'CONTRACT-1',
              'Recipient Name': 'Palantir Technologies Inc.',
              'Award Amount': 1000,
              'Awarding Agency': 'DoD',
              agency_slug: 'dod',
              generated_internal_id: 'c1',
              'Start Date': '2025-09-01',
            } satisfies UpstreamRow,
          ],
          page_metadata: { hasNext: false },
        });
      }
      return jsonResponse({
        results: [
          {
            'Award ID': 'GRANT-1',
            'Recipient Name': 'Palantir Technologies Inc.',
            'Award Amount': 250,
            'Awarding Agency': 'NSF',
            agency_slug: 'nsf',
            generated_internal_id: 'g1',
            'Base Obligation Date': '2025-10-15',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: false },
      });
    });

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toHaveLength(2);
    const contract = awards.find((a) => a.award_id === 'CONTRACT-1') as FedAward;
    const grant = awards.find((a) => a.award_id === 'GRANT-1') as FedAward;
    expect(contract.award_type).toBe('contract');
    expect(grant.award_type).toBe('grant');
    // Grant date falls back to Base Obligation Date and is sliced to YYYY-MM-DD.
    expect(grant.date).toBe('2025-10-15');
    expect(contract.date).toBe('2025-09-01');
  });

  it('treats a null Award Amount as 0 and missing dates as null', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (isContractCall(init)) {
        return jsonResponse({
          results: [
            {
              'Award ID': 'NULLAMT',
              'Recipient Name': 'Palantir Technologies Inc.',
              'Award Amount': null,
              'Awarding Agency': 'DoD',
              agency_slug: 'dod',
              generated_internal_id: 'na',
              'Start Date': null,
              'Base Obligation Date': null,
            } satisfies UpstreamRow,
          ],
          page_metadata: { hasNext: false },
        });
      }
      return jsonResponse({ results: [], page_metadata: { hasNext: false } });
    });

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toHaveLength(1);
    expect(awards[0].amount).toBe(0);
    expect(awards[0].date).toBeNull();
  });

  it('swallows a non-ok (500) response without throwing and returns []', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'boom' }, 500));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toEqual([]);
    // One failed call per type group; each breaks immediately.
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows a thrown / aborted fetch without throwing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
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

    const awards = await fetchVendorAwards(palantir, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(awards).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('captureFederalSpending', () => {
  it('returns a well-formed FedSnapshot from a per-vendor mock fetchFn', async () => {
    // Each vendor gets one contract award worth 1000 and one grant worth
    // 500, named to pass that vendor's own matchesVendor token.
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const raw = typeof init?.body === 'string' ? init.body : '{}';
      const parsed = JSON.parse(raw) as { filters?: { recipient_search_text?: string[] } };
      const searchText = parsed.filters?.recipient_search_text?.[0] ?? '';
      const vendor = FED_AI_COHORT.find((v) => v.search_text === searchText) as FedVendor;
      // Recipient name guaranteed to contain the vendor match token.
      const recipient = `${vendor.name} ${vendor.match.toUpperCase()} Federal Inc.`;
      if (isContractCall(init)) {
        return jsonResponse({
          results: [
            {
              'Award ID': `${vendor.slug}-contract`,
              'Recipient Name': recipient,
              'Award Amount': 1000,
              'Awarding Agency': 'Department of Defense',
              agency_slug: 'department-of-defense',
              generated_internal_id: `cont-${vendor.slug}`,
              'Start Date': '2025-12-01',
            } satisfies UpstreamRow,
          ],
          page_metadata: { hasNext: false },
        });
      }
      return jsonResponse({
        results: [
          {
            'Award ID': `${vendor.slug}-grant`,
            'Recipient Name': recipient,
            'Award Amount': 500,
            'Awarding Agency': 'National Science Foundation',
            agency_slug: 'national-science-foundation',
            generated_internal_id: `grant-${vendor.slug}`,
            'Base Obligation Date': '2025-11-20',
          } satisfies UpstreamRow,
        ],
        page_metadata: { hasNext: false },
      });
    });

    const env = {} as Env;
    const snap = await captureFederalSpending(env, NOW_MS, fetchFn as unknown as typeof fetch);

    expect(snap.ok).toBe(true);
    expect(snap.captured_at).toBe(new Date(NOW_MS).toISOString());
    expect(snap.source).toBe(FED_SOURCE);
    expect(snap.license).toBe(FED_LICENSE);
    expect(snap.window_days).toBe(ACTIVE_WINDOW_DAYS);

    const cohortSize = FED_AI_COHORT.length;
    expect(snap.cohort_size).toBe(cohortSize);
    expect(snap.vendors.length).toBeLessThanOrEqual(cohortSize);
    expect(snap.vendors).toHaveLength(cohortSize);

    // Each vendor: 2 awards (1 contract + 1 grant) => 2 per vendor total.
    expect(snap.total_awards).toBe(cohortSize * 2);
    // 1000 + 500 per vendor.
    expect(snap.total_usd).toBe(cohortSize * 1500);

    // Two type groups per vendor, sequential.
    expect(fetchFn).toHaveBeenCalledTimes(cohortSize * 2);

    // Cohort-wide top agencies: only DoD and NSF appear.
    expect(snap.agencies.map((a) => a.agency_slug).sort()).toEqual([
      'department-of-defense',
      'national-science-foundation',
    ]);
    const dod = snap.agencies.find((a) => a.agency_slug === 'department-of-defense');
    expect(dod?.usd).toBe(cohortSize * 1000);
  });

  it('derives the date window from nowMs (fromDate is ACTIVE_WINDOW_DAYS earlier)', async () => {
    let capturedFrom = '';
    let capturedTo = '';
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const parsed = JSON.parse(init?.body as string) as {
        filters?: { time_period?: { start_date?: string; end_date?: string }[] };
      };
      const tp = parsed.filters?.time_period?.[0];
      capturedFrom = tp?.start_date ?? '';
      capturedTo = tp?.end_date ?? '';
      return jsonResponse({ results: [], page_metadata: { hasNext: false } });
    });

    const env = {} as Env;
    await captureFederalSpending(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(capturedTo).toBe(new Date(NOW_MS).toISOString().slice(0, 10));
    expect(capturedFrom).toBe(new Date(NOW_MS - ACTIVE_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10));
  });
});
