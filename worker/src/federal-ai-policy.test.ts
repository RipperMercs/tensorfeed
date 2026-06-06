import { describe, it, expect, vi } from 'vitest';
import {
  POLICY_AI_KEYWORDS,
  POLICY_WINDOW_DAYS,
  POLICY_MAX_PER_KEYWORD,
  POLICY_DOC_CAP,
  POLICY_BILL_CAP,
  POLICY_SNAPSHOT_KEY,
  POLICY_DAY_PREFIX,
  POLICY_SOURCE,
  POLICY_LICENSE,
  formatIsoDate,
  hasAiTerm,
  mapFrDocument,
  parsePackageId,
  mapBill,
  dedupeDocs,
  dedupeBills,
  rollupAgencies,
  rollupTypes,
  highSignalDocs,
  highSignalBills,
  buildPolicySnapshot,
  fetchFrDocuments,
  fetchAiBills,
  captureFederalAiPolicy,
} from './federal-ai-policy';
import type { PolicyDocument, PolicyBill } from './federal-ai-policy';
import type { Env } from './types';

const NOW_MS = Date.UTC(2026, 5, 5);

// Minimal upstream Federal Register row.
type FrRow = {
  document_number?: string | null;
  title?: string | null;
  type?: string | null;
  abstract?: string | null;
  publication_date?: string | null;
  html_url?: string | null;
  agency_names?: string[] | null;
};

function frResponse(rows: FrRow[]): Response {
  return new Response(JSON.stringify({ count: rows.length, results: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function govinfoResponse(rows: Array<{ packageId?: string; title?: string; dateIssued?: string }>): Response {
  return new Response(JSON.stringify({ count: rows.length, results: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('constants', () => {
  it('exposes a stable AI keyword set and KV layout', () => {
    expect(POLICY_AI_KEYWORDS).toContain('artificial intelligence');
    expect(POLICY_WINDOW_DAYS).toBe(120);
    expect(POLICY_SNAPSHOT_KEY).toBe('federal-ai-policy:snapshot');
    expect(POLICY_DAY_PREFIX).toBe('federal-ai-policy:day:');
    expect(POLICY_SOURCE).toMatch(/public domain/i);
    expect(POLICY_LICENSE).toMatch(/Public domain/);
    expect(POLICY_MAX_PER_KEYWORD).toBeGreaterThan(0);
  });

  it('has no em dash or double hyphen in the human-facing source/license strings', () => {
    for (const s of [POLICY_SOURCE, POLICY_LICENSE]) {
      expect(s).not.toMatch(/—|–/);
      expect(s).not.toMatch(/--/);
    }
  });
});

describe('formatIsoDate', () => {
  it('formats epoch ms as a UTC calendar date', () => {
    expect(formatIsoDate(Date.UTC(2026, 0, 9))).toBe('2026-01-09');
    expect(formatIsoDate(NOW_MS)).toBe('2026-06-05');
  });
});

describe('hasAiTerm', () => {
  it('matches AI terms case-insensitively', () => {
    expect(hasAiTerm('Promoting Advanced Artificial Intelligence Innovation')).toBe(true);
    expect(hasAiTerm('a study of MACHINE LEARNING in lending')).toBe(true);
    expect(hasAiTerm('Regional Haze Federal Implementation Plan')).toBe(false);
    expect(hasAiTerm(null)).toBe(false);
    expect(hasAiTerm('')).toBe(false);
  });
});

describe('mapFrDocument', () => {
  it('normalizes an FR document and prefers agency_names', () => {
    const doc = mapFrDocument(
      {
        document_number: '2026-11415',
        title: 'Promoting Advanced Artificial Intelligence Innovation and Security',
        type: 'Presidential Document',
        abstract: null,
        publication_date: '2026-06-05',
        html_url: 'https://www.federalregister.gov/documents/2026/06/05/2026-11415/x',
        agency_names: ['Executive Office of the President'],
      },
      'artificial intelligence',
    );
    expect(doc.document_number).toBe('2026-11415');
    expect(doc.doc_type).toBe('Presidential Document');
    expect(doc.agency).toBe('Executive Office of the President');
    expect(doc.abstract).toBeNull();
    expect(doc.matched_keyword).toBe('artificial intelligence');
  });

  it('falls back to Unknown agency and empty fields safely', () => {
    const doc = mapFrDocument({ title: 'x' }, 'machine learning');
    expect(doc.agency).toBe('Unknown');
    expect(doc.document_number).toBe('');
    expect(doc.url).toBe('');
  });
});

describe('parsePackageId', () => {
  it('parses a House bill packageId', () => {
    expect(parsePackageId('BILLS-119hr1234ih')).toEqual({
      bill_number: 'H.R. 1234',
      congress: '119',
      origin_chamber: 'House',
    });
  });
  it('parses a Senate resolution packageId', () => {
    expect(parsePackageId('BILLS-119sres45is')).toEqual({
      bill_number: 'S.Res. 45',
      congress: '119',
      origin_chamber: 'Senate',
    });
  });
  it('returns empty fields on an unrecognized id', () => {
    expect(parsePackageId('GARBAGE')).toEqual({ bill_number: '', congress: '', origin_chamber: '' });
  });
});

describe('mapBill', () => {
  it('normalizes a GovInfo bill and builds the details url', () => {
    const bill = mapBill(
      { packageId: 'BILLS-119hr1234ih', title: 'Great American Artificial Intelligence Act', dateIssued: '2026-06-04' },
      'artificial intelligence',
    );
    expect(bill.bill_number).toBe('H.R. 1234');
    expect(bill.congress).toBe('119');
    expect(bill.origin_chamber).toBe('House');
    expect(bill.url).toBe('https://www.govinfo.gov/app/details/BILLS-119hr1234ih');
    expect(bill.date_issued).toBe('2026-06-04');
  });
});

describe('dedupe', () => {
  it('dedupes documents by document_number, first wins', () => {
    const docs: PolicyDocument[] = [
      mapFrDocument({ document_number: 'A', title: 'AI one' }, 'a'),
      mapFrDocument({ document_number: 'A', title: 'AI dup' }, 'b'),
      mapFrDocument({ document_number: 'B', title: 'AI two' }, 'c'),
    ];
    const out = dedupeDocs(docs);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe('AI one');
  });
  it('dedupes bills by package_id', () => {
    const bills: PolicyBill[] = [
      mapBill({ packageId: 'BILLS-119hr1ih', title: 'x' }, 'a'),
      mapBill({ packageId: 'BILLS-119hr1ih', title: 'y' }, 'b'),
    ];
    expect(dedupeBills(bills)).toHaveLength(1);
  });
});

describe('rollups', () => {
  const docs: PolicyDocument[] = [
    mapFrDocument({ document_number: '1', title: 'AI', type: 'Notice', agency_names: ['EPA'] }, 'a'),
    mapFrDocument({ document_number: '2', title: 'AI', type: 'Rule', agency_names: ['EPA'] }, 'a'),
    mapFrDocument({ document_number: '3', title: 'AI', type: 'Notice', agency_names: ['NIST'] }, 'a'),
  ];
  it('rolls up by agency, descending', () => {
    const r = rollupAgencies(docs);
    expect(r[0]).toEqual({ agency: 'EPA', count: 2 });
  });
  it('rolls up by document type, descending', () => {
    const r = rollupTypes(docs);
    expect(r[0]).toEqual({ doc_type: 'Notice', count: 2 });
  });
});

describe('high-signal filtering', () => {
  it('drops documents that do not name an AI term in title or abstract', () => {
    const docs: PolicyDocument[] = [
      mapFrDocument(
        { document_number: '1', title: 'Promoting Advanced Artificial Intelligence', type: 'Presidential Document' },
        'a',
      ),
      mapFrDocument(
        {
          document_number: '2',
          title: 'Regional Haze Federal Implementation Plan',
          abstract: 'NOx BART for a power plant. No relevant terms here.',
          type: 'Proposed Rule',
        },
        'a',
      ),
      mapFrDocument(
        {
          document_number: '3',
          title: 'Notice of meeting',
          abstract: 'The committee will discuss machine learning standards.',
          type: 'Notice',
        },
        'a',
      ),
    ];
    const kept = highSignalDocs(docs).map((d) => d.document_number);
    expect(kept).toEqual(['1', '3']);
  });
  it('keeps only bills whose title names an AI term', () => {
    const bills: PolicyBill[] = [
      mapBill({ packageId: 'BILLS-119hr1ih', title: 'Great American Artificial Intelligence Act' }, 'a'),
      mapBill({ packageId: 'BILLS-119hr2ih', title: 'A bill to rename a post office' }, 'a'),
    ];
    expect(highSignalBills(bills).map((b) => b.package_id)).toEqual(['BILLS-119hr1ih']);
  });
});

describe('buildPolicySnapshot', () => {
  const docs: PolicyDocument[] = [
    mapFrDocument(
      { document_number: '1', title: 'Artificial Intelligence rule', type: 'Rule', agency_names: ['NIST'], publication_date: '2026-06-01' },
      'a',
    ),
    mapFrDocument(
      { document_number: '2', title: 'Artificial Intelligence notice', type: 'Notice', agency_names: ['EPA'], publication_date: '2026-06-04' },
      'a',
    ),
    mapFrDocument(
      { document_number: '3', title: 'Unrelated haze rule', type: 'Rule', agency_names: ['EPA'], publication_date: '2026-06-05' },
      'a',
    ),
  ];
  const bills: PolicyBill[] = [
    mapBill({ packageId: 'BILLS-119hr1ih', title: 'Artificial Intelligence Act', dateIssued: '2026-06-04' }, 'a'),
    mapBill({ packageId: 'BILLS-119hr2ih', title: 'Post office naming', dateIssued: '2026-06-03' }, 'a'),
  ];

  it('filters to high-signal, sorts newest-first, and builds rollups + previews', () => {
    const snap = buildPolicySnapshot(docs, bills, '2026-06-05T00:00:00.000Z', POLICY_WINDOW_DAYS, true);
    expect(snap.total_documents).toBe(2); // haze rule dropped
    expect(snap.documents[0].document_number).toBe('2'); // 06-04 newest of the kept
    expect(snap.by_agency.length).toBeGreaterThan(0);
    expect(snap.total_bills).toBe(1); // post office dropped
    expect(snap.bills_enabled).toBe(true);
    expect(snap.recent_documents.length).toBe(2);
  });

  it('records bills_enabled=false when the legislative layer was not queried', () => {
    const snap = buildPolicySnapshot(docs, [], '2026-06-05T00:00:00.000Z', POLICY_WINDOW_DAYS, false);
    expect(snap.bills_enabled).toBe(false);
    expect(snap.total_bills).toBe(0);
  });

  it('caps the full document and bill arrays', () => {
    const many: PolicyDocument[] = Array.from({ length: POLICY_DOC_CAP + 25 }, (_, i) =>
      mapFrDocument(
        { document_number: `d${i}`, title: 'Artificial Intelligence', type: 'Notice', agency_names: ['X'], publication_date: '2026-06-01' },
        'a',
      ),
    );
    const snap = buildPolicySnapshot(many, [], '2026-06-05T00:00:00.000Z', POLICY_WINDOW_DAYS, true);
    expect(snap.documents.length).toBe(POLICY_DOC_CAP);
  });
});

describe('fetchFrDocuments', () => {
  it('queries once per keyword, unions by document_number, never uses a key', async () => {
    const fetchFn = vi.fn(async () =>
      frResponse([
        { document_number: 'shared', title: 'Artificial Intelligence notice', type: 'Notice', publication_date: '2026-06-01', agency_names: ['NIST'] },
      ]),
    );
    const docs = await fetchFrDocuments('2026-02-05', '2026-06-05', fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledTimes(POLICY_AI_KEYWORDS.length);
    expect(docs).toHaveLength(1); // unioned by document_number
    const firstUrl = String((fetchFn.mock.calls[0] as unknown[])[0]);
    expect(firstUrl).toContain('federalregister.gov');
    expect(firstUrl).not.toContain('api_key');
  });

  it('continues past a per-keyword HTTP error without throwing', async () => {
    let n = 0;
    const fetchFn = vi.fn(async () => {
      n += 1;
      if (n === 1) return new Response('nope', { status: 500 });
      return frResponse([{ document_number: `d${n}`, title: 'AI', type: 'Notice', publication_date: '2026-06-01' }]);
    });
    const docs = await fetchFrDocuments('2026-02-05', '2026-06-05', fetchFn as unknown as typeof fetch);
    expect(docs.length).toBe(POLICY_AI_KEYWORDS.length - 1);
  });
});

describe('fetchAiBills', () => {
  it('returns [] and does not call fetch when DATA_GOV_API_KEY is missing', async () => {
    const fetchFn = vi.fn();
    const bills = await fetchAiBills({} as Env, '2026-02-05', '2026-06-05', fetchFn as unknown as typeof fetch);
    expect(bills).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('POSTs a GovInfo BILLS query per keyword with the key', async () => {
    const fetchFn = vi.fn(async () =>
      govinfoResponse([{ packageId: 'BILLS-119hr1ih', title: 'Artificial Intelligence Act', dateIssued: '2026-06-04' }]),
    );
    const bills = await fetchAiBills(
      { DATA_GOV_API_KEY: 'k' } as Env,
      '2026-02-05',
      '2026-06-05',
      fetchFn as unknown as typeof fetch,
    );
    expect(fetchFn).toHaveBeenCalledTimes(POLICY_AI_KEYWORDS.length);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('api.govinfo.gov/search');
    expect(url).toContain('api_key=k');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('collection:(BILLS)');
    expect(bills).toHaveLength(1);
  });
});

describe('captureFederalAiPolicy', () => {
  it('writes the snapshot to KV current + daily keys and reports counts', async () => {
    const store = new Map<string, string>();
    const env = {
      TENSORFEED_CACHE: {
        put: vi.fn(async (k: string, v: string) => {
          store.set(k, v);
        }),
      },
    } as unknown as Env;

    const fetchFn = vi.fn(async () =>
      frResponse([
        { document_number: 'd1', title: 'Artificial Intelligence Rule', type: 'Rule', publication_date: '2026-06-01', agency_names: ['NIST'] },
      ]),
    );

    const res = await captureFederalAiPolicy(env, NOW_MS, fetchFn as unknown as typeof fetch);
    expect(res.documents).toBe(1);
    expect(res.bills).toBe(0); // no key -> no bills
    expect(store.has(POLICY_SNAPSHOT_KEY)).toBe(true);
    expect(store.has(`${POLICY_DAY_PREFIX}2026-06-05`)).toBe(true);
    const snap = JSON.parse(store.get(POLICY_SNAPSHOT_KEY) as string);
    expect(snap.bills_enabled).toBe(false);
    expect(snap.total_documents).toBe(1);
  });
});
