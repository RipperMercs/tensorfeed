import { describe, it, expect, vi } from 'vitest';
import {
  SEARCH_API_URL,
  SEARCH_API_PUBLIC_KEY,
  TRACKED_LEGISLATIONS,
  NOTIFICATION_STATUS,
  EVENTS_CAP,
  EU_AI_ACT_CURRENT_KEY,
  EU_AI_ACT_EVENTS_KEY,
  EU_AI_ACT_SOURCE,
  EU_AI_ACT_LICENSE,
  EU_AI_ACT_TIMELINE_NOTE,
  buildNotificationQuery,
  normalizeNotification,
  scopeFingerprint,
  diffSnapshots,
  mergeEvents,
  filterEvents,
  fetchNotifications,
  captureEuAiAct,
} from './eu-ai-act';
import type { NotifiedBodyRecord, DesignationEvent } from './eu-ai-act';
import type { Env } from './types';

const NOW_MS = Date.parse('2026-06-09T19:33:00Z');

// Trimmed real record shape from the SMCS GROWTH_NANDO database (machinery
// regulation, captured 2026-06-09) so normalization is tested against the
// actual upstream contract, not an invented one.
const RAW_MACHINERY = {
  csId: '79464fe7634e38010d36514be883d3736fa01b3d',
  notificationId: 1022983,
  organizationName: 'TUV NORD CERT GmbH',
  organizationRefeCd: 'EPOS_43366',
  bodyNumber: 44,
  bodyTypeAbbr: 'NB',
  displayTypeAndNumber: 'NB 0044',
  organizationCountryName: 'Germany',
  organizationZipCodeAndCity: '45307 Essen',
  organizationEmail: 'tncert-accreditation@tuev-nord.de',
  organizationWebsite: 'www.tuev-nord.de/en/services/',
  bodyEndDate: '2029-01-28T00:00:00Z',
  notificationStatusId: 1,
  notificationIfLatestVersion: 'Y',
  notificationVersion: 1,
  notificationLegislationId: 162400,
  notificationUpdateDate: '2026-03-23T00:00:04Z',
  notificationLastApprovalDate: '2026-03-23T00:00:00Z',
  notificationLegislationKeyword: 'Regulation (EU) 2023/1230 on machinery',
  notificationProductKeyword: ['B.10. Injection moulding machinery', 'A.03. Vehicle servicing lifts'],
  notificationProcedureKeyword: ['EU-type examination (Module B)'],
  notificationAnnexKeyword: ['Annex I, Article 25(2) (a)'],
};

function record(partial: Partial<NotifiedBodyRecord>): NotifiedBodyRecord {
  return {
    notification_id: 1022983,
    body_name: 'TUV NORD CERT GmbH',
    body_display: 'NB 0044',
    body_type: 'NB',
    country: 'Germany',
    city: '45307 Essen',
    email: 'tncert-accreditation@tuev-nord.de',
    website: 'www.tuev-nord.de/en/services/',
    legislation_id: 162400,
    legislation: 'Regulation (EU) 2023/1230 on machinery',
    status_id: 1,
    status: 'Active',
    products: ['B.10. Injection moulding machinery'],
    procedures: ['EU-type examination (Module B)'],
    annexes: ['Annex I, Article 25(2) (a)'],
    notification_version: 1,
    last_approval_date: '2026-03-23',
    update_date: '2026-03-23',
    body_end_date: '2029-01-28',
    ...partial,
  };
}

// Build a search-API response envelope carrying the given jsonDoc payloads.
function searchResponse(docs: unknown[], totalResults = docs.length): Response {
  return new Response(
    JSON.stringify({
      apiVersion: '2.146',
      totalResults,
      pageNumber: 1,
      pageSize: 100,
      results: docs.map((d) => ({ metadata: { jsonDoc: [JSON.stringify(d)] } })),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('TRACKED_LEGISLATIONS', () => {
  it('tracks the AI Act as the primary legislation, plus CRA and EUCC', () => {
    expect(TRACKED_LEGISLATIONS[0].legislation_id).toBe(168380);
    expect(TRACKED_LEGISLATIONS.map((l) => l.legislation_id)).toEqual([168380, 167953, 164702]);
  });
});

describe('NOTIFICATION_STATUS', () => {
  it('maps the five SMCS notification status ids', () => {
    expect(NOTIFICATION_STATUS[1]).toBe('Active');
    expect(NOTIFICATION_STATUS[2]).toBe('Expired/Withdrawn');
    expect(NOTIFICATION_STATUS[3]).toBe('Expired');
    expect(NOTIFICATION_STATUS[4]).toBe('Withdrawn');
    expect(NOTIFICATION_STATUS[5]).toBe('Suspended');
  });
});

describe('buildNotificationQuery', () => {
  it('builds the ES bool query the SMCS SPA sends, minus any status filter', () => {
    const q = buildNotificationQuery(168380) as {
      bool: { must: Array<Record<string, unknown>> };
    };
    const flat = JSON.stringify(q);
    expect(flat).toContain('"csType":"nando_notification"');
    expect(flat).toContain('"notificationLegislationId":"168380"');
    expect(flat).toContain('"notificationIfLatestVersion":["Y","X"]');
    // All statuses are captured; status filtering happens downstream.
    expect(flat).not.toContain('notificationStatusId');
  });
});

describe('normalizeNotification', () => {
  it('maps the raw SMCS jsonDoc into the normalized record shape', () => {
    const rec = normalizeNotification(RAW_MACHINERY);
    expect(rec).toEqual(
      record({
        products: ['B.10. Injection moulding machinery', 'A.03. Vehicle servicing lifts'],
      }),
    );
  });

  it('returns null when notificationId is missing', () => {
    const { notificationId: _drop, ...rest } = RAW_MACHINERY;
    expect(normalizeNotification(rest)).toBeNull();
  });

  it('labels an unknown status id as Unknown with the id attached', () => {
    const rec = normalizeNotification({ ...RAW_MACHINERY, notificationStatusId: 9 });
    expect(rec?.status).toBe('Unknown (9)');
  });

  it('coerces missing optional fields to safe defaults', () => {
    const rec = normalizeNotification({ notificationId: 7, notificationLegislationId: 168380 });
    expect(rec).not.toBeNull();
    expect(rec?.body_name).toBe('');
    expect(rec?.products).toEqual([]);
    expect(rec?.last_approval_date).toBe('');
  });
});

describe('scopeFingerprint', () => {
  it('is stable under array order permutations', () => {
    const a = record({ products: ['p1', 'p2'], procedures: ['m1', 'm2'], annexes: ['x'] });
    const b = record({ products: ['p2', 'p1'], procedures: ['m2', 'm1'], annexes: ['x'] });
    expect(scopeFingerprint(a)).toBe(scopeFingerprint(b));
  });

  it('changes when a product is added', () => {
    const a = record({ products: ['p1'] });
    const b = record({ products: ['p1', 'p2'] });
    expect(scopeFingerprint(a)).not.toBe(scopeFingerprint(b));
  });
});

describe('diffSnapshots', () => {
  const OBSERVED = '2026-06-09T19:33:00.000Z';

  it('emits designation_first_seen for a notification id not present before', () => {
    const events = diffSnapshots([], [record({})], OBSERVED);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('designation_first_seen');
    expect(events[0].notification_id).toBe(1022983);
    expect(events[0].body).toBe('TUV NORD CERT GmbH');
    expect(events[0].legislation_id).toBe(162400);
    expect(events[0].observed_at).toBe(OBSERVED);
  });

  it('emits status_change with from and to names when the status id flips', () => {
    const prev = [record({ status_id: 1, status: 'Active' })];
    const curr = [record({ status_id: 4, status: 'Withdrawn' })];
    const events = diffSnapshots(prev, curr, OBSERVED);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('status_change');
    expect(events[0].from_status).toBe('Active');
    expect(events[0].to_status).toBe('Withdrawn');
  });

  it('emits scope_change when the product scope changes but status does not', () => {
    const prev = [record({ products: ['p1'] })];
    const curr = [record({ products: ['p1', 'p2'] })];
    const events = diffSnapshots(prev, curr, OBSERVED);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('scope_change');
  });

  it('emits delisted when a previously seen notification id disappears', () => {
    const events = diffSnapshots([record({})], [], OBSERVED);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('delisted');
  });

  it('emits nothing for identical snapshots', () => {
    expect(diffSnapshots([record({})], [record({})], OBSERVED)).toEqual([]);
  });
});

describe('mergeEvents', () => {
  function ev(partial: Partial<DesignationEvent>): DesignationEvent {
    return {
      type: 'designation_first_seen',
      observed_at: '2026-06-09T19:33:00.000Z',
      legislation_id: 168380,
      legislation: 'Regulation (EU) 2024/1689 on artificial intelligence (Artificial Intelligence Act)',
      notification_id: 1,
      body: 'Some Body',
      body_display: 'NB 0001',
      country: 'France',
      detail: 'first designation observed',
      ...partial,
    };
  }

  it('prepends new events ahead of prior ones', () => {
    const prior = [ev({ notification_id: 1, observed_at: '2026-06-01T00:00:00.000Z' })];
    const incoming = [ev({ notification_id: 2, observed_at: '2026-06-09T00:00:00.000Z' })];
    const merged = mergeEvents(prior, incoming);
    expect(merged.map((e) => e.notification_id)).toEqual([2, 1]);
  });

  it('caps the log at EVENTS_CAP', () => {
    const prior: DesignationEvent[] = [];
    for (let i = 0; i < EVENTS_CAP; i++) prior.push(ev({ notification_id: i }));
    const merged = mergeEvents(prior, [ev({ notification_id: 9999 })]);
    expect(merged).toHaveLength(EVENTS_CAP);
    expect(merged[0].notification_id).toBe(9999);
  });
});

describe('filterEvents', () => {
  function ev(partial: Partial<DesignationEvent>): DesignationEvent {
    return {
      type: 'designation_first_seen',
      observed_at: '2026-06-09T19:33:00.000Z',
      legislation_id: 168380,
      legislation: 'Regulation (EU) 2024/1689 on artificial intelligence (Artificial Intelligence Act)',
      notification_id: 1,
      body: 'Some Body',
      body_display: 'NB 0001',
      country: 'France',
      detail: 'first designation observed',
      ...partial,
    };
  }

  const EVENTS: DesignationEvent[] = [
    ev({ notification_id: 1, observed_at: '2026-06-01T19:33:00.000Z', legislation_id: 168380 }),
    ev({ notification_id: 2, observed_at: '2026-06-05T19:33:00.000Z', legislation_id: 164702, type: 'status_change' }),
    ev({ notification_id: 3, observed_at: '2026-06-09T19:33:00.000Z', legislation_id: 167953, type: 'scope_change' }),
  ];

  it('returns everything when no filters are set', () => {
    expect(filterEvents(EVENTS, {})).toHaveLength(3);
  });

  it('filters by inclusive from and to date on the observed_at day', () => {
    const got = filterEvents(EVENTS, { from: '2026-06-05', to: '2026-06-05' });
    expect(got.map((e) => e.notification_id)).toEqual([2]);
  });

  it('filters by legislation_id', () => {
    const got = filterEvents(EVENTS, { legislation_id: 167953 });
    expect(got.map((e) => e.notification_id)).toEqual([3]);
  });

  it('filters by event type', () => {
    const got = filterEvents(EVENTS, { type: 'status_change' });
    expect(got.map((e) => e.notification_id)).toEqual([2]);
  });

  it('combines filters', () => {
    const got = filterEvents(EVENTS, { from: '2026-06-02', type: 'scope_change' });
    expect(got.map((e) => e.notification_id)).toEqual([3]);
  });
});

describe('fetchNotifications', () => {
  it('POSTs one multipart search per tracked legislation with the public key and a file-part query', async () => {
    const calls: Array<{ url: string; form: FormData }> = [];
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), form: init?.body as FormData });
      return searchResponse([]);
    });

    const records = await fetchNotifications(fetchFn as unknown as typeof fetch);

    expect(records).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(TRACKED_LEGISLATIONS.length);
    for (const call of calls) {
      expect(call.url).toBe(SEARCH_API_URL);
      expect(call.form).toBeInstanceOf(FormData);
      expect(call.form.get('apiKey')).toBe(SEARCH_API_PUBLIC_KEY);
      expect(call.form.get('text')).toBe('*');
      // The search API rejects a plain-string query field; it must be a file
      // part (verified empirically 2026-06-09).
      const queryPart = call.form.get('query');
      expect(typeof queryPart).not.toBe('string');
      const queryJson = await (queryPart as unknown as Blob).text();
      expect(queryJson).toContain('"csType":"nando_notification"');
    }
  });

  it('parses jsonDoc payloads into normalized records', async () => {
    let first = true;
    const fetchFn = vi.fn(async () => {
      if (first) {
        first = false;
        return searchResponse([RAW_MACHINERY]);
      }
      return searchResponse([]);
    });
    const records = await fetchNotifications(fetchFn as unknown as typeof fetch);
    expect(records).toHaveLength(1);
    expect(records[0].notification_id).toBe(1022983);
    expect(records[0].status).toBe('Active');
  });

  it('continues past a failing legislation and still returns the others', async () => {
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call++;
      if (call === 1) return new Response('upstream broke', { status: 502 });
      return searchResponse([RAW_MACHINERY]);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const records = await fetchNotifications(fetchFn as unknown as typeof fetch);
    expect(records).toHaveLength(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not throw when fetch itself throws', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const records = await fetchNotifications(fetchFn as unknown as typeof fetch);
    expect(records).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('captureEuAiAct', () => {
  function memoryKv(): { kv: KVNamespace; store: Map<string, string> } {
    const store = new Map<string, string>();
    const kv = {
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      // Mirrors real Workers KV: get(key, 'json') returns the parsed value.
      get: vi.fn(async (key: string, type?: string) => {
        const value = store.get(key) ?? null;
        if (value === null) return null;
        return type === 'json' ? JSON.parse(value) : value;
      }),
    } as unknown as KVNamespace;
    return { kv, store };
  }

  it('first run establishes the baseline without emitting events', async () => {
    const { kv, store } = memoryKv();
    const fetchFn = vi.fn(async () => searchResponse([RAW_MACHINERY]));
    const env = { TENSORFEED_CACHE: kv } as unknown as Env;

    const result = await captureEuAiAct(env, NOW_MS, fetchFn as unknown as typeof fetch);

    expect(result.bodies).toBe(3); // one record echoed per tracked legislation stub call
    expect(result.new_events).toBe(0);

    const snap = JSON.parse(store.get(EU_AI_ACT_CURRENT_KEY) as string) as {
      ok: boolean;
      captured_at: string;
      legislations: Array<{ legislation_id: number; total: number; active: number }>;
      bodies: NotifiedBodyRecord[];
    };
    expect(snap.ok).toBe(true);
    expect(snap.captured_at).toBe(new Date(NOW_MS).toISOString());
    expect(snap.legislations).toHaveLength(TRACKED_LEGISLATIONS.length);

    const log = JSON.parse(store.get(EU_AI_ACT_EVENTS_KEY) as string) as {
      ok: boolean;
      baseline_established_at: string;
      total: number;
      events: DesignationEvent[];
    };
    expect(log.total).toBe(0);
    expect(log.baseline_established_at).toBe(new Date(NOW_MS).toISOString());
  });

  it('second run emits a status_change event into the log', async () => {
    const { kv, store } = memoryKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as Env;

    const activeFetch = vi.fn(async () => searchResponse([RAW_MACHINERY]));
    await captureEuAiAct(env, NOW_MS, activeFetch as unknown as typeof fetch);

    const withdrawn = { ...RAW_MACHINERY, notificationStatusId: 4 };
    const withdrawnFetch = vi.fn(async () => searchResponse([withdrawn]));
    const LATER_MS = NOW_MS + 24 * 3600 * 1000;
    const result = await captureEuAiAct(env, LATER_MS, withdrawnFetch as unknown as typeof fetch);

    expect(result.new_events).toBeGreaterThan(0);
    const log = JSON.parse(store.get(EU_AI_ACT_EVENTS_KEY) as string) as {
      events: DesignationEvent[];
    };
    expect(log.events[0].type).toBe('status_change');
    expect(log.events[0].from_status).toBe('Active');
    expect(log.events[0].to_status).toBe('Withdrawn');
  });

  it('does not throw when env has no TENSORFEED_CACHE binding', async () => {
    const fetchFn = vi.fn(async () => searchResponse([]));
    const env = {} as Env;
    const result = await captureEuAiAct(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ bodies: 0, new_events: 0 });
  });
});

describe('source, license, and timeline copy', () => {
  it('carries CC BY 4.0 attribution and contains no em dash, en dash, or double hyphen', () => {
    expect(EU_AI_ACT_SOURCE).toContain('European Commission');
    expect(EU_AI_ACT_LICENSE).toContain('CC BY 4.0');
    for (const text of [EU_AI_ACT_SOURCE, EU_AI_ACT_LICENSE, EU_AI_ACT_TIMELINE_NOTE]) {
      expect(text).not.toContain('—');
      expect(text).not.toContain('–');
      expect(text).not.toContain('--');
    }
  });

  it('timeline note carries the corrected Digital Omnibus dates', () => {
    expect(EU_AI_ACT_TIMELINE_NOTE).toContain('2 August 2025');
    expect(EU_AI_ACT_TIMELINE_NOTE).toContain('2 December 2027');
    expect(EU_AI_ACT_TIMELINE_NOTE).toContain('2 August 2028');
  });
});
