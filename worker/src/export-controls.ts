import type { Env } from './types';

export const FR_API_URL = 'https://www.federalregister.gov/api/v1/documents.json';

// AI/compute export-control term queries (BIS docket). Union results across
// these, then keep only AI/compute-relevant docs. Single hyphens here are fine.
export const TERM_QUERIES = [
  'advanced computing',
  'semiconductor',
  'artificial intelligence',
  'entity list',
  'integrated circuit',
  'model weights',
];

const RELEVANCE_KEYWORDS = [
  'advanced computing', 'semiconductor', 'artificial intelligence', 'integrated circuit',
  'model weight', 'gpu', 'graphics processing', 'supercomput', 'datacenter', 'data center',
  'entity list', 'compute', 'high-performance computing', 'foundry',
];

export const EVENTS_CAP = 250;
export const EXPORT_CONTROLS_KEY = 'export-controls:ai:events';

export const EXPORT_CONTROL_SOURCE =
  'US Federal Register (federalregister.gov), Bureau of Industry and Security export-control documents, public domain. Filtered to AI and advanced-computing actions (Entity List changes, advanced-computing license and threshold rules, due-diligence measures) and classified by TensorFeed. This is a restatement of public rule notices, not a per-entity restricted-party screen.';
export const EXPORT_CONTROL_LICENSE =
  'Public domain (US Government work). TensorFeed editorial classification and aggregation.';

const FETCH_TIMEOUT_MS = 15_000;
const PER_PAGE = 50;

export type ExportControlCategory =
  | 'entity-list'
  | 'compute-threshold'
  | 'license-policy'
  | 'due-diligence'
  | 'model-weights'
  | 'other';

export interface ExportControlEvent {
  id: string;
  title: string;
  doc_type: string;
  category: ExportControlCategory;
  abstract: string;
  publication_date: string;
  source_url: string;
  agency: 'BIS';
}

interface FrDoc {
  document_number?: string | null;
  title?: string | null;
  type?: string | null;
  abstract?: string | null;
  publication_date?: string | null;
  html_url?: string | null;
}

interface FrResponse {
  count?: number;
  results?: FrDoc[];
}

function hay(title: string, abstract: string): string {
  return `${title} ${abstract}`.toLowerCase();
}

export function isRelevant(title: string, abstract: string): boolean {
  const h = hay(title, abstract);
  return RELEVANCE_KEYWORDS.some((k) => h.includes(k));
}

export function classify(title: string, abstract: string): ExportControlCategory {
  const h = hay(title, abstract);
  if (h.includes('entity list')) return 'entity-list';
  if (h.includes('model weight')) return 'model-weights';
  if (h.includes('due diligence') || h.includes('know your customer')) return 'due-diligence';
  if (h.includes('threshold') || h.includes('total processing performance') || h.includes('performance density')) return 'compute-threshold';
  if (h.includes('license') || h.includes('licensing') || h.includes('review policy')) return 'license-policy';
  return 'other';
}

export function mapDoc(raw: FrDoc): ExportControlEvent {
  const title = String(raw.title ?? '');
  const abstract = String(raw.abstract ?? '');
  return {
    id: String(raw.document_number ?? ''),
    title,
    doc_type: String(raw.type ?? ''),
    category: classify(title, abstract),
    abstract: abstract.length > 280 ? abstract.slice(0, 277) + '...' : abstract,
    publication_date: raw.publication_date ? String(raw.publication_date).slice(0, 10) : '',
    source_url: String(raw.html_url ?? ''),
    agency: 'BIS',
  };
}

export function mergeEvents(prev: ExportControlEvent[], incoming: ExportControlEvent[]): ExportControlEvent[] {
  const byId = new Map<string, ExportControlEvent>();
  for (const e of prev) if (e.id) byId.set(e.id, e);
  for (const e of incoming) if (e.id) byId.set(e.id, e);
  return [...byId.values()]
    .sort((a, b) => b.publication_date.localeCompare(a.publication_date))
    .slice(0, EVENTS_CAP);
}

export async function fetchExportControlDocs(fetchFn: typeof fetch = fetch): Promise<ExportControlEvent[]> {
  const byId = new Map<string, ExportControlEvent>();
  for (const term of TERM_QUERIES) {
    const params = new URLSearchParams();
    params.set('per_page', String(PER_PAGE));
    params.set('order', 'newest');
    params.append('conditions[agencies][]', 'industry-and-security-bureau');
    params.set('conditions[term]', term);
    for (const f of ['document_number', 'title', 'type', 'abstract', 'publication_date', 'html_url']) {
      params.append('fields[]', f);
    }
    const url = `${FR_API_URL}?${params.toString()}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetchFn(url, { signal: ac.signal, headers: { 'User-Agent': 'tensorfeed-export-controls' } });
      if (!res.ok) {
        console.warn(JSON.stringify({ event: 'export_controls_fetch_error', term, message: `http ${res.status}` }));
        continue;
      }
      const parsed = (await res.json()) as FrResponse;
      for (const doc of parsed.results ?? []) {
        const title = String(doc.title ?? '');
        const abstract = String(doc.abstract ?? '');
        if (!isRelevant(title, abstract)) continue;
        const ev = mapDoc(doc);
        if (ev.id) byId.set(ev.id, ev);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'export_controls_fetch_error', term, message }));
    } finally {
      clearTimeout(timer);
    }
  }
  return [...byId.values()];
}

export async function captureExportControls(
  env: Env,
  nowMs: number = Date.now(),
  fetchFn: typeof fetch = fetch,
): Promise<{ events: number }> {
  const fetched = await fetchExportControlDocs(fetchFn);
  let prev: ExportControlEvent[] = [];
  if (env.TENSORFEED_CACHE) {
    try {
      const raw = await env.TENSORFEED_CACHE.get(EXPORT_CONTROLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { events?: ExportControlEvent[] };
        prev = parsed.events ?? [];
      }
    } catch {
      /* corrupt cache: treat as empty */
    }
  }
  const merged = mergeEvents(prev, fetched);
  const snapshot = {
    ok: true as const,
    captured_at: new Date(nowMs).toISOString(),
    source: EXPORT_CONTROL_SOURCE,
    license: EXPORT_CONTROL_LICENSE,
    total: merged.length,
    events: merged,
  };
  if (env.TENSORFEED_CACHE) {
    try {
      await env.TENSORFEED_CACHE.put(EXPORT_CONTROLS_KEY, JSON.stringify(snapshot));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'export_controls_kv_write_error', message }));
    }
  }
  return { events: merged.length };
}
