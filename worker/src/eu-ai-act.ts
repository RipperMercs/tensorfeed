import type { Env } from './types';

// EU conformity-assessment (notified body) designation tracker over the
// European Commission's NANDO database, now hosted in the Single Market
// Compliance Space (SMCS). The SMCS frontend is an Angular SPA; the real data
// source behind it is the EC corporate Search API queried below. Captured
// daily; the durable product is the designation-change history (first_seen /
// status_change / scope_change / delisted), which the Commission does not
// publish as a time series.
export const SEARCH_API_URL = 'https://webgate.ec.europa.eu/es/search-api/rest/search';

// Public client key shipped inside the SMCS SPA's JavaScript bundle and sent
// by every anonymous browser session. It is the EC Search API's public
// identifier for this application, not a TensorFeed secret, so it lives in
// source on purpose. If the EC rotates it with an SPA release, the capture
// logs fetch errors and the fix is to re-extract the key from the SPA bundle.
export const SEARCH_API_PUBLIC_KEY = 'e2418f53-ea99-4bc4-a12f-c4cdd419de2c';

export interface TrackedLegislation {
  legislation_id: number;
  code: string;
  name: string;
}

// AI Act first: it is the headline series and currently sits at zero
// designations, so the feed catches the EU's first AI Act notified body the
// day it lands. CRA is the second pre-first-designation watch. EUCC already
// has real rows and anchors the feed with live data from day one.
export const TRACKED_LEGISLATIONS: TrackedLegislation[] = [
  { legislation_id: 168380, code: 'Regulation (EU) 2024/1689', name: 'EU AI Act' },
  { legislation_id: 167953, code: 'Regulation (EU) 2024/2847', name: 'Cyber Resilience Act' },
  { legislation_id: 164702, code: 'Regulation (EU) 2024/482', name: 'EUCC cybersecurity certification scheme' },
];

// Status id -> name mapping from the SMCS nando_notifstatus lookup type,
// captured 2026-06-09.
export const NOTIFICATION_STATUS: Record<number, string> = {
  1: 'Active',
  2: 'Expired/Withdrawn',
  3: 'Expired',
  4: 'Withdrawn',
  5: 'Suspended',
};

export const EVENTS_CAP = 500;
export const EU_AI_ACT_CURRENT_KEY = 'eu-ai-act:nb:current';
export const EU_AI_ACT_EVENTS_KEY = 'eu-ai-act:nb:events';

export const EU_AI_ACT_SOURCE =
  'European Commission, NANDO / Single Market Compliance Space (webgate.ec.europa.eu/single-market-compliance-space), notified body notifications for Regulation (EU) 2024/1689 (AI Act), Regulation (EU) 2024/2847 (Cyber Resilience Act), and Regulation (EU) 2024/482 (EUCC). Modifications: structured into a machine-readable feed with TensorFeed-computed designation-change history.';
export const EU_AI_ACT_LICENSE =
  'CC BY 4.0 (European Commission reuse policy, Decision 2011/833/EU). TensorFeed aggregation and change-history derivation.';
export const EU_AI_ACT_TIMELINE_NOTE =
  'AI Act notified-body designation has been legally possible since 2 August 2025. The Digital Omnibus on AI (provisional agreement May 2026) deferred the high-risk regime: standalone Annex III systems to 2 December 2027 and embedded Annex I products to 2 August 2028, so a zero or near-zero designation count is the expected state today. This feed exists to catch the first designations and every change after them.';

const FETCH_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

export interface NotifiedBodyRecord {
  notification_id: number;
  body_name: string;
  body_display: string;
  body_type: string;
  country: string;
  city: string;
  email: string;
  website: string;
  legislation_id: number;
  legislation: string;
  status_id: number;
  status: string;
  products: string[];
  procedures: string[];
  annexes: string[];
  notification_version: number;
  last_approval_date: string;
  update_date: string;
  body_end_date: string;
}

export type DesignationEventType = 'designation_first_seen' | 'status_change' | 'scope_change' | 'delisted';

export interface DesignationEvent {
  type: DesignationEventType;
  observed_at: string;
  legislation_id: number;
  legislation: string;
  notification_id: number;
  body: string;
  body_display: string;
  country: string;
  detail: string;
  from_status?: string;
  to_status?: string;
}

// Raw jsonDoc shape inside each search result's metadata. Only the fields we
// read are declared; the upstream document carries more.
interface RawNotification {
  notificationId?: number;
  organizationName?: string;
  displayTypeAndNumber?: string;
  bodyTypeAbbr?: string;
  organizationCountryName?: string;
  organizationZipCodeAndCity?: string;
  organizationEmail?: string;
  organizationWebsite?: string;
  bodyEndDate?: string;
  notificationStatusId?: number;
  notificationVersion?: number;
  notificationLegislationId?: number;
  notificationUpdateDate?: string;
  notificationLastApprovalDate?: string;
  notificationLegislationKeyword?: string;
  notificationProductKeyword?: string[];
  notificationProcedureKeyword?: string[];
  notificationAnnexKeyword?: string[];
}

interface SearchResult {
  metadata?: { jsonDoc?: string[] };
}

interface SearchResponse {
  totalResults?: number;
  results?: SearchResult[];
}

export function buildNotificationQuery(legislationId: number): Record<string, unknown> {
  // Mirrors the ES bool query the SMCS SPA sends for the notified-body list,
  // without a status filter: every latest-version notification is captured
  // and status filtering happens downstream, because status transitions are
  // themselves the delta events this feed exists to record.
  return {
    bool: {
      must: [
        { term: { csType: 'nando_notification' } },
        {
          bool: {
            must: [
              { term: { notificationLegislationId: String(legislationId) } },
              { terms: { notificationIfLatestVersion: ['Y', 'X'] } },
            ],
          },
        },
      ],
    },
  };
}

function dateOnly(value: unknown): string {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

export function normalizeNotification(raw: RawNotification): NotifiedBodyRecord | null {
  if (typeof raw.notificationId !== 'number') return null;
  const statusId = typeof raw.notificationStatusId === 'number' ? raw.notificationStatusId : 0;
  return {
    notification_id: raw.notificationId,
    body_name: String(raw.organizationName ?? ''),
    body_display: String(raw.displayTypeAndNumber ?? ''),
    body_type: String(raw.bodyTypeAbbr ?? ''),
    country: String(raw.organizationCountryName ?? ''),
    city: String(raw.organizationZipCodeAndCity ?? ''),
    email: String(raw.organizationEmail ?? ''),
    website: String(raw.organizationWebsite ?? ''),
    legislation_id: typeof raw.notificationLegislationId === 'number' ? raw.notificationLegislationId : 0,
    legislation: String(raw.notificationLegislationKeyword ?? ''),
    status_id: statusId,
    status: NOTIFICATION_STATUS[statusId] ?? `Unknown (${statusId})`,
    products: strList(raw.notificationProductKeyword),
    procedures: strList(raw.notificationProcedureKeyword),
    annexes: strList(raw.notificationAnnexKeyword),
    notification_version: typeof raw.notificationVersion === 'number' ? raw.notificationVersion : 0,
    last_approval_date: dateOnly(raw.notificationLastApprovalDate),
    update_date: dateOnly(raw.notificationUpdateDate),
    body_end_date: dateOnly(raw.bodyEndDate),
  };
}

export function scopeFingerprint(rec: NotifiedBodyRecord): string {
  const part = (items: string[]) => [...items].sort().join('|');
  return `${part(rec.products)}::${part(rec.procedures)}::${part(rec.annexes)}`;
}

export function diffSnapshots(
  prev: NotifiedBodyRecord[],
  curr: NotifiedBodyRecord[],
  observedAt: string,
): DesignationEvent[] {
  const events: DesignationEvent[] = [];
  const prevById = new Map<number, NotifiedBodyRecord>();
  for (const r of prev) prevById.set(r.notification_id, r);
  const currIds = new Set<number>();

  const base = (r: NotifiedBodyRecord) => ({
    observed_at: observedAt,
    legislation_id: r.legislation_id,
    legislation: r.legislation,
    notification_id: r.notification_id,
    body: r.body_name,
    body_display: r.body_display,
    country: r.country,
  });

  for (const r of curr) {
    currIds.add(r.notification_id);
    const before = prevById.get(r.notification_id);
    if (!before) {
      events.push({
        type: 'designation_first_seen',
        ...base(r),
        detail: `first designation observed: ${r.body_display || r.body_name} under ${r.legislation}`,
      });
      continue;
    }
    if (before.status_id !== r.status_id) {
      events.push({
        type: 'status_change',
        ...base(r),
        detail: `notification status changed from ${before.status} to ${r.status}`,
        from_status: before.status,
        to_status: r.status,
      });
    } else if (scopeFingerprint(before) !== scopeFingerprint(r)) {
      events.push({
        type: 'scope_change',
        ...base(r),
        detail: `notification scope changed (${before.products.length} to ${r.products.length} product categories, ${before.procedures.length} to ${r.procedures.length} procedures, ${before.annexes.length} to ${r.annexes.length} annex entries)`,
      });
    }
  }

  for (const r of prev) {
    if (!currIds.has(r.notification_id)) {
      events.push({
        type: 'delisted',
        ...base(r),
        detail: `notification no longer present in the NANDO result set`,
      });
    }
  }

  return events;
}

export function mergeEvents(prior: DesignationEvent[], incoming: DesignationEvent[]): DesignationEvent[] {
  return [...incoming, ...prior].slice(0, EVENTS_CAP);
}

export interface EventFilters {
  from?: string | null;
  to?: string | null;
  legislation_id?: number | null;
  type?: string | null;
}

export function filterEvents(events: DesignationEvent[], filters: EventFilters): DesignationEvent[] {
  const { from, to, legislation_id, type } = filters;
  // Lexical compare on the YYYY-MM-DD prefix of observed_at is correct for
  // ISO timestamps; from/to are inclusive day bounds.
  return events.filter((e) => {
    const day = e.observed_at.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (typeof legislation_id === 'number' && e.legislation_id !== legislation_id) return false;
    if (type && e.type !== type) return false;
    return true;
  });
}

async function fetchLegislationPage(
  legislationId: number,
  pageNumber: number,
  fetchFn: typeof fetch,
): Promise<SearchResponse> {
  const form = new FormData();
  form.append('apiKey', SEARCH_API_PUBLIC_KEY);
  form.append('text', '*');
  form.append('pageSize', String(PAGE_SIZE));
  form.append('pageNumber', String(pageNumber));
  // The search API rejects a plain-string query field; it must arrive as a
  // file part, which is how the SPA sends it (verified 2026-06-09).
  form.append(
    'query',
    new Blob([JSON.stringify(buildNotificationQuery(legislationId))], { type: 'application/json' }),
    'query.json',
  );

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchFn(SEARCH_API_URL, {
      method: 'POST',
      body: form,
      signal: ac.signal,
      headers: { 'User-Agent': 'tensorfeed-eu-ai-act (https://tensorfeed.ai)' },
    });
    if (!res.ok) {
      throw new Error(`http ${res.status}`);
    }
    return (await res.json()) as SearchResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNotifications(fetchFn: typeof fetch = fetch): Promise<NotifiedBodyRecord[]> {
  const records: NotifiedBodyRecord[] = [];
  for (const leg of TRACKED_LEGISLATIONS) {
    try {
      let page = 1;
      let fetched = 0;
      let total = Infinity;
      while (fetched < total && page <= MAX_PAGES) {
        const parsed = await fetchLegislationPage(leg.legislation_id, page, fetchFn);
        total = typeof parsed.totalResults === 'number' ? parsed.totalResults : 0;
        const results = parsed.results ?? [];
        for (const result of results) {
          const docJson = result.metadata?.jsonDoc?.[0];
          if (!docJson) continue;
          try {
            const rec = normalizeNotification(JSON.parse(docJson) as RawNotification);
            if (rec) records.push(rec);
          } catch {
            // One malformed jsonDoc must not sink the page.
          }
        }
        fetched += results.length;
        if (results.length === 0) break;
        page++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        JSON.stringify({ event: 'eu_ai_act_fetch_error', legislation_id: leg.legislation_id, message }),
      );
    }
  }
  return records;
}

interface CurrentSnapshot {
  ok: true;
  captured_at: string;
  source: string;
  license: string;
  timeline_note: string;
  legislations: Array<TrackedLegislation & { total: number; active: number }>;
  total: number;
  bodies: NotifiedBodyRecord[];
}

interface EventsLog {
  ok: true;
  updated_at: string;
  baseline_established_at: string;
  total: number;
  events: DesignationEvent[];
}

export async function captureEuAiAct(
  env: Env,
  nowMs: number = Date.now(),
  fetchFn: typeof fetch = fetch,
): Promise<{ bodies: number; new_events: number }> {
  if (!env.TENSORFEED_CACHE) return { bodies: 0, new_events: 0 };

  const bodies = await fetchNotifications(fetchFn);
  const capturedAt = new Date(nowMs).toISOString();

  let prevSnapshot: CurrentSnapshot | null = null;
  let prevLog: EventsLog | null = null;
  try {
    prevSnapshot = (await env.TENSORFEED_CACHE.get(EU_AI_ACT_CURRENT_KEY, 'json')) as CurrentSnapshot | null;
    prevLog = (await env.TENSORFEED_CACHE.get(EU_AI_ACT_EVENTS_KEY, 'json')) as EventsLog | null;
  } catch {
    // Corrupt state: rebuild from this capture as a fresh baseline.
  }

  // First run establishes the baseline silently: the bodies already existed
  // before TensorFeed started watching, so back-filling first_seen events
  // dated today would fabricate history. Real designation dates live on each
  // record's last_approval_date.
  const newEvents = prevSnapshot ? diffSnapshots(prevSnapshot.bodies, bodies, capturedAt) : [];
  const mergedEvents = mergeEvents(prevLog?.events ?? [], newEvents);

  const snapshot: CurrentSnapshot = {
    ok: true,
    captured_at: capturedAt,
    source: EU_AI_ACT_SOURCE,
    license: EU_AI_ACT_LICENSE,
    timeline_note: EU_AI_ACT_TIMELINE_NOTE,
    legislations: TRACKED_LEGISLATIONS.map((leg) => ({
      ...leg,
      total: bodies.filter((b) => b.legislation_id === leg.legislation_id).length,
      active: bodies.filter((b) => b.legislation_id === leg.legislation_id && b.status_id === 1).length,
    })),
    total: bodies.length,
    bodies,
  };

  const log: EventsLog = {
    ok: true,
    updated_at: capturedAt,
    baseline_established_at: prevLog?.baseline_established_at ?? capturedAt,
    total: mergedEvents.length,
    events: mergedEvents,
  };

  try {
    await env.TENSORFEED_CACHE.put(EU_AI_ACT_CURRENT_KEY, JSON.stringify(snapshot));
    await env.TENSORFEED_CACHE.put(EU_AI_ACT_EVENTS_KEY, JSON.stringify(log));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(JSON.stringify({ event: 'eu_ai_act_kv_write_error', message }));
  }

  return { bodies: bodies.length, new_events: newEvents.length };
}
