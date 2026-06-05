import { describe, it, expect, vi } from 'vitest';
import {
  TERM_QUERIES,
  EVENTS_CAP,
  EXPORT_CONTROLS_KEY,
  EXPORT_CONTROL_SOURCE,
  EXPORT_CONTROL_LICENSE,
  isRelevant,
  classify,
  mapDoc,
  mergeEvents,
  fetchExportControlDocs,
  captureExportControls,
} from './export-controls';
import type { ExportControlEvent } from './export-controls';
import type { Env } from './types';

const NOW_MS = Date.parse('2026-06-04T00:00:00Z');

// Upstream Federal Register document-row shape used to build canned responses.
type FrRow = {
  document_number?: string | null;
  title?: string | null;
  type?: string | null;
  abstract?: string | null;
  publication_date?: string | null;
  html_url?: string | null;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Build a normalized ExportControlEvent for the pure-helper suites.
function ev(partial: Partial<ExportControlEvent>): ExportControlEvent {
  return {
    id: 'DOC-1',
    title: 'Additions and Revisions to the Entity List',
    doc_type: 'Rule',
    category: 'entity-list',
    abstract: 'BIS adds parties to the Entity List.',
    publication_date: '2026-05-01',
    source_url: 'https://www.federalregister.gov/documents/doc-1',
    agency: 'BIS',
    ...partial,
  };
}

describe('classify', () => {
  it('returns entity-list for Entity List actions', () => {
    expect(classify('Additions and Revisions to the Entity List', '')).toBe('entity-list');
  });

  it('returns compute-threshold for total processing performance threshold rules', () => {
    expect(
      classify('Controls on Advanced Computing', 'Revises the total processing performance threshold for export.'),
    ).toBe('compute-threshold');
  });

  it('returns license-policy for license review policy rules', () => {
    expect(
      classify('Revision to License Review Policy for Advanced Computing Commodities', ''),
    ).toBe('license-policy');
  });

  it('returns due-diligence for additional due diligence measures', () => {
    expect(classify('Additional Due Diligence Measures for Exporters', '')).toBe('due-diligence');
  });

  it('returns model-weights for model weights actions', () => {
    expect(classify('Controls on the export of advanced model weights', '')).toBe('model-weights');
  });

  it('returns other for a generic title', () => {
    expect(classify('Notice of Public Meeting on Trade Policy', '')).toBe('other');
  });
});

describe('isRelevant', () => {
  it('keeps an advanced-computing license policy document', () => {
    expect(isRelevant('Revision to License Review Policy for Advanced Computing Commodities', '')).toBe(true);
  });

  it('drops a non-AI BIS document', () => {
    expect(isRelevant('Chemical Weapons Convention Regulations', '')).toBe(false);
  });
});

describe('mapDoc', () => {
  it('maps the upstream fields into the normalized event shape', () => {
    const event = mapDoc({
      document_number: '2026-12345',
      title: 'Additions and Revisions to the Entity List',
      type: 'Rule',
      abstract: 'BIS adds parties to the Entity List.',
      publication_date: '2026-05-15',
      html_url: 'https://www.federalregister.gov/documents/2026-12345',
    });
    expect(event).toEqual({
      id: '2026-12345',
      title: 'Additions and Revisions to the Entity List',
      doc_type: 'Rule',
      category: 'entity-list',
      abstract: 'BIS adds parties to the Entity List.',
      publication_date: '2026-05-15',
      source_url: 'https://www.federalregister.gov/documents/2026-12345',
      agency: 'BIS',
    });
  });

  it('clips an abstract longer than 280 characters and appends an ellipsis', () => {
    const longAbstract = 'a'.repeat(400);
    const event = mapDoc({
      document_number: 'LONG-1',
      title: 'Controls on Advanced Computing',
      type: 'Rule',
      abstract: longAbstract,
      publication_date: '2026-04-10',
      html_url: 'https://www.federalregister.gov/documents/long-1',
    });
    expect(event.abstract).toHaveLength(280);
    expect(event.abstract.endsWith('...')).toBe(true);
    expect(event.abstract.slice(0, 277)).toBe('a'.repeat(277));
  });

  it('coerces missing fields to safe defaults', () => {
    const event = mapDoc({});
    expect(event.id).toBe('');
    expect(event.title).toBe('');
    expect(event.doc_type).toBe('');
    expect(event.abstract).toBe('');
    expect(event.publication_date).toBe('');
    expect(event.source_url).toBe('');
    expect(event.category).toBe('other');
  });
});

describe('mergeEvents', () => {
  it('dedupes by id, with incoming winning over prior', () => {
    const prev = [ev({ id: 'X', title: 'Old title', publication_date: '2026-01-01' })];
    const incoming = [ev({ id: 'X', title: 'New title', publication_date: '2026-01-01' })];
    const merged = mergeEvents(prev, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('New title');
  });

  it('sorts newest publication_date first', () => {
    const merged = mergeEvents(
      [
        ev({ id: 'A', publication_date: '2026-01-01' }),
        ev({ id: 'B', publication_date: '2026-05-01' }),
        ev({ id: 'C', publication_date: '2026-03-01' }),
      ],
      [],
    );
    expect(merged.map((e) => e.id)).toEqual(['B', 'C', 'A']);
  });

  it('caps the merged list at EVENTS_CAP', () => {
    const incoming: ExportControlEvent[] = [];
    for (let i = 0; i < EVENTS_CAP + 5; i++) {
      const n = String(i).padStart(4, '0');
      incoming.push(ev({ id: `DOC-${n}`, publication_date: `2026-01-${n}` }));
    }
    const merged = mergeEvents([], incoming);
    expect(merged).toHaveLength(EVENTS_CAP);
  });

  it('ignores events with an empty id', () => {
    const merged = mergeEvents([ev({ id: '' })], [ev({ id: 'KEEP' })]);
    expect(merged.map((e) => e.id)).toEqual(['KEEP']);
  });
});

describe('fetchExportControlDocs', () => {
  it('unions across the six term calls, filters by relevance, and dedupes by id', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        count: 2,
        results: [
          {
            document_number: 'REL-1',
            title: 'Revision to License Review Policy for Advanced Computing Commodities',
            type: 'Rule',
            abstract: 'BIS revises licensing review policy.',
            publication_date: '2026-05-20',
            html_url: 'https://www.federalregister.gov/documents/rel-1',
          } satisfies FrRow,
          {
            document_number: 'IRREL-1',
            title: 'Chemical Weapons Convention Regulations',
            type: 'Notice',
            abstract: '',
            publication_date: '2026-05-19',
            html_url: 'https://www.federalregister.gov/documents/irrel-1',
          } satisfies FrRow,
        ],
      }),
    );

    const docs = await fetchExportControlDocs(fetchFn as unknown as typeof fetch);

    // One fetch per term query.
    expect(fetchFn).toHaveBeenCalledTimes(TERM_QUERIES.length);
    // The relevant doc appears once (deduped across all term calls); the
    // irrelevant one is dropped.
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe('REL-1');
    expect(docs[0].category).toBe('license-policy');
  });

  it('queries the Federal Register API for BIS documents', async () => {
    const urls: string[] = [];
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return jsonResponse({ results: [] });
    });
    await fetchExportControlDocs(fetchFn as unknown as typeof fetch);
    expect(urls[0]).toContain('https://www.federalregister.gov/api/v1/documents.json');
    expect(urls[0]).toContain('industry-and-security-bureau');
    expect(urls[0]).toContain('conditions%5Bterm%5D=advanced+computing');
  });

  it('returns [] gracefully when the stub returns a non-ok 500 response', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'boom' }, 500));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const docs = await fetchExportControlDocs(fetchFn as unknown as typeof fetch);
    expect(docs).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(TERM_QUERIES.length);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not throw when the stub fetch throws', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const docs = await fetchExportControlDocs(fetchFn as unknown as typeof fetch);
    expect(docs).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('captureExportControls', () => {
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

  it('merges fetched events with prior KV state and writes the snapshot', async () => {
    const { kv, store } = memoryKv();

    // Seed prior state with an older event.
    const prior = {
      events: [
        ev({ id: 'PRIOR-1', title: 'Older Entity List action', publication_date: '2026-01-01' }),
      ],
    };
    store.set(EXPORT_CONTROLS_KEY, JSON.stringify(prior));

    const fetchFn = vi.fn(async () =>
      jsonResponse({
        count: 1,
        results: [
          {
            document_number: 'NEW-1',
            title: 'Additions and Revisions to the Entity List',
            type: 'Rule',
            abstract: 'BIS adds new parties.',
            publication_date: '2026-05-30',
            html_url: 'https://www.federalregister.gov/documents/new-1',
          } satisfies FrRow,
        ],
      }),
    );

    const env = { TENSORFEED_CACHE: kv } as unknown as Env;
    const result = await captureExportControls(env, NOW_MS, fetchFn as unknown as typeof fetch);

    // Prior (1) + new (1) merged.
    expect(result).toEqual({ events: 2 });

    const snap = JSON.parse(store.get(EXPORT_CONTROLS_KEY) as string) as {
      ok: boolean;
      captured_at: string;
      total: number;
      events: ExportControlEvent[];
    };
    expect(snap.ok).toBe(true);
    expect(snap.captured_at).toBe(new Date(NOW_MS).toISOString());
    expect(snap.total).toBe(2);
    // Newest first.
    expect(snap.events[0].id).toBe('NEW-1');
    expect(snap.events[1].id).toBe('PRIOR-1');
  });

  it('does not throw when env has no TENSORFEED_CACHE binding', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ results: [] }));
    const env = {} as Env;
    const result = await captureExportControls(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ events: 0 });
  });
});

describe('source and license copy', () => {
  it('contains no em dash, en dash, or double hyphen', () => {
    for (const text of [EXPORT_CONTROL_SOURCE, EXPORT_CONTROL_LICENSE]) {
      expect(text).not.toContain('—'); // em dash
      expect(text).not.toContain('–'); // en dash
      expect(text).not.toContain('--'); // double hyphen
    }
  });
});
