import { describe, it, expect, vi } from 'vitest';
import {
  AI_TITLE_KEYWORDS,
  WINDOW_DAYS,
  MAX_PER_KEYWORD,
  OPEN_CAP,
  OPP_SNAPSHOT_KEY,
  OPP_DAY_PREFIX,
  OPP_SOURCE,
  OPP_LICENSE,
  formatSamDate,
  mapNotice,
  dedupeByNoticeId,
  isOpen,
  rollupAgencies,
  rollupSetAsides,
  buildOpportunitySnapshot,
  fetchAiOpportunities,
  captureAiOpportunities,
} from './ai-opportunities';
import type { AiOpportunity } from './ai-opportunities';
import type { Env } from './types';

// Fixed clock for every window calculation in this suite.
const NOW_MS = Date.UTC(2026, 5, 4);
const DAY_MS = 86_400_000;

// Minimal upstream SAM row used to build canned responses.
type SamRow = {
  noticeId?: string | null;
  title?: string | null;
  solicitationNumber?: string | null;
  fullParentPathName?: string | null;
  type?: string | null;
  postedDate?: string | null;
  responseDeadLine?: string | null;
  naicsCode?: string | null;
  typeOfSetAsideDescription?: string | null;
  active?: string | null;
  uiLink?: string | null;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Build a normalized AiOpportunity for the pure-helper suites.
function opp(partial: Partial<AiOpportunity>): AiOpportunity {
  return {
    notice_id: 'N1',
    title: 'Artificial intelligence research support',
    solicitation_number: 'SOL-1',
    agency: 'Department of Defense',
    agency_path: 'Department of Defense.Army',
    notice_type: 'Solicitation',
    posted_date: '2026-05-01',
    response_deadline: '2026-07-01T17:00:00-05:00',
    naics_code: '541511',
    set_aside: 'None',
    active: true,
    ui_link: 'https://sam.gov/opp/N1/view',
    matched_keyword: 'artificial intelligence',
    ...partial,
  };
}

describe('constants', () => {
  it('exposes the AI title keywords, window, caps, keys, source, and license', () => {
    expect(AI_TITLE_KEYWORDS).toEqual([
      'artificial intelligence',
      'machine learning',
      'large language model',
      'generative ai',
      'deep learning',
      'neural network',
      'natural language processing',
      'computer vision',
    ]);
    expect(WINDOW_DAYS).toBe(90);
    expect(MAX_PER_KEYWORD).toBe(100);
    expect(OPEN_CAP).toBe(250);
    expect(OPP_SNAPSHOT_KEY).toBe('ai-opportunities:snapshot');
    expect(OPP_DAY_PREFIX).toBe('ai-opportunities:day:');
    expect(OPP_SOURCE).toContain('SAM.gov');
    expect(OPP_LICENSE).toContain('Public domain');
  });
});

describe('formatSamDate', () => {
  it('formats epoch ms to MM/dd/yyyy in UTC', () => {
    expect(formatSamDate(Date.UTC(2026, 5, 4))).toBe('06/04/2026');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatSamDate(Date.UTC(2026, 0, 9))).toBe('01/09/2026');
  });
});

describe('mapNotice', () => {
  it('maps a canned SAM row to the normalized shape', () => {
    const raw: SamRow = {
      noticeId: 'abc123',
      title: 'Generative AI platform support',
      solicitationNumber: 'W123-26-R-0001',
      fullParentPathName: 'DEPT OF DEFENSE.DEPT OF THE ARMY.AMC',
      type: 'Combined Synopsis/Solicitation',
      postedDate: '2026-05-20T08:00:00-04:00',
      responseDeadLine: '2026-06-30T17:00:00-04:00',
      naicsCode: '541512',
      typeOfSetAsideDescription: 'Total Small Business Set-Aside',
      active: 'Yes',
      uiLink: 'https://sam.gov/opp/abc123/view',
    };
    const mapped = mapNotice(raw, 'generative ai');
    expect(mapped.notice_id).toBe('abc123');
    expect(mapped.response_deadline).toBe('2026-06-30T17:00:00-04:00');
    expect(mapped.agency).toBe('DEPT OF DEFENSE');
    expect(mapped.agency_path).toBe('DEPT OF DEFENSE.DEPT OF THE ARMY.AMC');
    expect(mapped.active).toBe(true);
    expect(mapped.posted_date).toBe('2026-05-20');
    expect(mapped.naics_code).toBe('541512');
    expect(mapped.set_aside).toBe('Total Small Business Set-Aside');
    expect(mapped.ui_link).toBe('https://sam.gov/opp/abc123/view');
    expect(mapped.matched_keyword).toBe('generative ai');
  });

  it('defaults set_aside to None when missing and active to false when not Yes', () => {
    const raw: SamRow = {
      noticeId: 'n2',
      title: 'Machine learning study',
      fullParentPathName: 'NASA',
      active: 'No',
      uiLink: 'https://sam.gov/opp/n2/view',
    };
    const mapped = mapNotice(raw, 'machine learning');
    expect(mapped.set_aside).toBe('None');
    expect(mapped.active).toBe(false);
    expect(mapped.response_deadline).toBeNull();
    expect(mapped.posted_date).toBe('');
    expect(mapped.agency).toBe('NASA');
  });
});

describe('dedupeByNoticeId', () => {
  it('collapses two rows sharing a notice_id into one (first wins)', () => {
    const rows = [
      opp({ notice_id: 'dup', matched_keyword: 'artificial intelligence' }),
      opp({ notice_id: 'dup', matched_keyword: 'machine learning' }),
      opp({ notice_id: 'unique' }),
    ];
    const deduped = dedupeByNoticeId(rows);
    expect(deduped).toHaveLength(2);
    const dup = deduped.find((o) => o.notice_id === 'dup');
    expect(dup?.matched_keyword).toBe('artificial intelligence');
  });

  it('drops rows with an empty notice_id', () => {
    const rows = [opp({ notice_id: '' }), opp({ notice_id: 'keep' })];
    const deduped = dedupeByNoticeId(rows);
    expect(deduped.map((o) => o.notice_id)).toEqual(['keep']);
  });
});

describe('isOpen', () => {
  it('returns false for an inactive notice', () => {
    expect(isOpen(opp({ active: false }), NOW_MS)).toBe(false);
  });

  it('returns false for a past deadline', () => {
    const past = new Date(NOW_MS - DAY_MS).toISOString();
    expect(isOpen(opp({ active: true, response_deadline: past }), NOW_MS)).toBe(false);
  });

  it('returns true for a future deadline', () => {
    const future = new Date(NOW_MS + DAY_MS).toISOString();
    expect(isOpen(opp({ active: true, response_deadline: future }), NOW_MS)).toBe(true);
  });

  it('returns true for a null deadline on an active notice', () => {
    expect(isOpen(opp({ active: true, response_deadline: null }), NOW_MS)).toBe(true);
  });

  it('keeps an unparseable deadline rather than silently dropping it', () => {
    expect(isOpen(opp({ active: true, response_deadline: 'not a date' }), NOW_MS)).toBe(true);
  });
});

describe('rollupAgencies', () => {
  it('sums counts by agency and sorts descending', () => {
    const opps = [
      opp({ notice_id: 'a', agency: 'Army' }),
      opp({ notice_id: 'b', agency: 'Navy' }),
      opp({ notice_id: 'c', agency: 'Army' }),
      opp({ notice_id: 'd', agency: 'Army' }),
    ];
    const rolled = rollupAgencies(opps);
    expect(rolled[0]).toEqual({ agency: 'Army', open_count: 3 });
    expect(rolled[1]).toEqual({ agency: 'Navy', open_count: 1 });
  });

  it('buckets an empty agency under Unknown', () => {
    const rolled = rollupAgencies([opp({ notice_id: 'x', agency: '' })]);
    expect(rolled[0]).toEqual({ agency: 'Unknown', open_count: 1 });
  });
});

describe('rollupSetAsides', () => {
  it('sums counts by set_aside and sorts descending', () => {
    const opps = [
      opp({ notice_id: 'a', set_aside: 'None' }),
      opp({ notice_id: 'b', set_aside: 'Total Small Business Set-Aside' }),
      opp({ notice_id: 'c', set_aside: 'None' }),
    ];
    const rolled = rollupSetAsides(opps);
    expect(rolled[0]).toEqual({ set_aside: 'None', count: 2 });
    expect(rolled[1]).toEqual({ set_aside: 'Total Small Business Set-Aside', count: 1 });
  });
});

describe('buildOpportunitySnapshot', () => {
  const capturedAt = new Date(NOW_MS).toISOString();

  it('counts only open notices in total_open and attaches metadata', () => {
    const future = new Date(NOW_MS + 5 * DAY_MS).toISOString();
    const past = new Date(NOW_MS - 5 * DAY_MS).toISOString();
    const opps = [
      opp({ notice_id: 'open1', active: true, response_deadline: future, agency: 'DoD' }),
      opp({ notice_id: 'open2', active: true, response_deadline: null, agency: 'NASA' }),
      opp({ notice_id: 'closed', active: true, response_deadline: past, agency: 'DoD' }),
      opp({ notice_id: 'inactive', active: false, response_deadline: future, agency: 'DoD' }),
    ];
    const snap = buildOpportunitySnapshot(opps, capturedAt, WINDOW_DAYS, NOW_MS);
    expect(snap.ok).toBe(true);
    expect(snap.captured_at).toBe(capturedAt);
    expect(snap.source).toBe(OPP_SOURCE);
    expect(snap.license).toBe(OPP_LICENSE);
    expect(snap.window_days).toBe(WINDOW_DAYS);
    expect(snap.keywords).toEqual(AI_TITLE_KEYWORDS);
    expect(snap.total_open).toBe(2);
    expect(snap.unique_agencies).toBe(2);
  });

  it('orders closing_soon by deadline ascending', () => {
    const opps = [
      opp({
        notice_id: 'far',
        active: true,
        response_deadline: new Date(NOW_MS + 30 * DAY_MS).toISOString(),
      }),
      opp({
        notice_id: 'near',
        active: true,
        response_deadline: new Date(NOW_MS + 2 * DAY_MS).toISOString(),
      }),
      opp({
        notice_id: 'mid',
        active: true,
        response_deadline: new Date(NOW_MS + 10 * DAY_MS).toISOString(),
      }),
    ];
    const snap = buildOpportunitySnapshot(opps, capturedAt, WINDOW_DAYS, NOW_MS);
    expect(snap.closing_soon.map((o) => o.notice_id)).toEqual(['near', 'mid', 'far']);
  });

  it('caps open at OPEN_CAP when fed OPEN_CAP + 5 open notices', () => {
    const opps: AiOpportunity[] = [];
    const future = new Date(NOW_MS + 7 * DAY_MS).toISOString();
    for (let i = 0; i < OPEN_CAP + 5; i++) {
      opps.push(
        opp({ notice_id: `cap-${i}`, active: true, response_deadline: future }),
      );
    }
    const snap = buildOpportunitySnapshot(opps, capturedAt, WINDOW_DAYS, NOW_MS);
    expect(snap.open).toHaveLength(OPEN_CAP);
    expect(snap.total_open).toBe(OPEN_CAP);
  });

  it('orders recent by posted_date desc, caps at 25, drops empty posted_date', () => {
    const opps: AiOpportunity[] = [];
    for (let i = 0; i < 30; i++) {
      const posted = new Date(NOW_MS - i * DAY_MS).toISOString().slice(0, 10);
      opps.push(opp({ notice_id: `r-${i}`, posted_date: posted, active: false }));
    }
    opps.push(opp({ notice_id: 'no-date', posted_date: '', active: false }));
    const snap = buildOpportunitySnapshot(opps, capturedAt, WINDOW_DAYS, NOW_MS);
    expect(snap.recent).toHaveLength(25);
    expect(snap.recent[0].notice_id).toBe('r-0');
    expect(snap.recent.every((o) => o.posted_date !== '')).toBe(true);
  });

  it('produces output JSON with zero em dashes, en dashes, and no double hyphens', () => {
    const opps = [
      opp({ notice_id: 'j1', active: true, response_deadline: null }),
      opp({ notice_id: 'j2', active: true, response_deadline: null }),
    ];
    const snap = buildOpportunitySnapshot(opps, capturedAt, WINDOW_DAYS, NOW_MS);
    const json = JSON.stringify(snap);
    expect(json).not.toContain('—'); // em dash
    expect(json).not.toContain('–'); // en dash
    expect(json).not.toContain('--'); // double hyphen
  });
});

describe('fetchAiOpportunities', () => {
  const FROM = '03/06/2026';
  const TO = '06/04/2026';

  function envWithKey(): Env {
    return { SAM_GOV_API_KEY: 'test-key' } as unknown as Env;
  }

  it('unions across the 8 keyword calls and dedupes by notice_id', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      // Extract the matched keyword from the url for a per-keyword row, plus a
      // shared duplicate row that should collapse across all 8 calls.
      const href = String(url);
      const m = /title=([^&]+)/.exec(href);
      const kw = m ? decodeURIComponent(m[1]) : 'unknown';
      return jsonResponse({
        opportunitiesData: [
          {
            noticeId: `kw-${kw}`,
            title: `${kw} support`,
            fullParentPathName: 'GSA',
            active: 'Yes',
            uiLink: 'https://sam.gov/opp/x/view',
          } satisfies SamRow,
          {
            noticeId: 'shared-dup',
            title: 'shared',
            fullParentPathName: 'GSA',
            active: 'Yes',
            uiLink: 'https://sam.gov/opp/shared/view',
          } satisfies SamRow,
        ],
      });
    });

    const opps = await fetchAiOpportunities(
      envWithKey(),
      FROM,
      TO,
      fetchFn as unknown as typeof fetch,
    );
    expect(fetchFn).toHaveBeenCalledTimes(AI_TITLE_KEYWORDS.length);
    // 8 distinct per-keyword notices + 1 shared (deduped) = 9.
    expect(opps).toHaveLength(AI_TITLE_KEYWORDS.length + 1);
    expect(opps.filter((o) => o.notice_id === 'shared-dup')).toHaveLength(1);
  });

  it('returns [] and never calls fetch when SAM_GOV_API_KEY is undefined', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ opportunitiesData: [] }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const env = {} as Env;

    const opps = await fetchAiOpportunities(env, FROM, TO, fetchFn as unknown as typeof fetch);
    expect(opps).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not throw when the stub returns a non-ok 404', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, 404));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const opps = await fetchAiOpportunities(
      envWithKey(),
      FROM,
      TO,
      fetchFn as unknown as typeof fetch,
    );
    expect(opps).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(AI_TITLE_KEYWORDS.length);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not throw when the stub fetch itself throws', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const opps = await fetchAiOpportunities(
      envWithKey(),
      FROM,
      TO,
      fetchFn as unknown as typeof fetch,
    );
    expect(opps).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('captureAiOpportunities', () => {
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

  it('fetches the window, builds the snapshot, and writes both KV keys', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        opportunitiesData: [
          {
            noticeId: 'cap-1',
            title: 'Artificial intelligence integration',
            fullParentPathName: 'GSA',
            active: 'Yes',
            responseDeadLine: new Date(NOW_MS + 14 * DAY_MS).toISOString(),
            postedDate: '2026-05-10T00:00:00-04:00',
            uiLink: 'https://sam.gov/opp/cap-1/view',
          } satisfies SamRow,
        ],
      }),
    );

    const { kv, store } = memoryKv();
    const env = { SAM_GOV_API_KEY: 'k', TENSORFEED_CACHE: kv } as unknown as Env;
    const result = await captureAiOpportunities(env, NOW_MS, fetchFn as unknown as typeof fetch);

    // One notice across 8 keyword calls, all deduped to a single notice_id.
    expect(result).toEqual({ opportunities: 1 });

    const day = new Date(NOW_MS).toISOString().slice(0, 10);
    expect(store.has(OPP_SNAPSHOT_KEY)).toBe(true);
    expect(store.has(`${OPP_DAY_PREFIX}${day}`)).toBe(true);

    const snap = JSON.parse(store.get(OPP_SNAPSHOT_KEY) as string) as {
      total_open: number;
      captured_at: string;
    };
    expect(snap.total_open).toBe(1);
    expect(snap.captured_at).toBe(new Date(NOW_MS).toISOString());
  });

  it('does not throw when env has no TENSORFEED_CACHE binding', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ opportunitiesData: [] }));
    const env = { SAM_GOV_API_KEY: 'k' } as unknown as Env;
    const result = await captureAiOpportunities(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ opportunities: 0 });
  });
});
