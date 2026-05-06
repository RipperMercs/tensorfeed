import { describe, it, expect } from 'vitest';
import {
  FRED_SERIES,
  parseSeriesObservations,
  readIndicators,
  isValidCategory,
  FRED_ATTRIBUTION,
  IndicatorsSnapshot,
} from './fred-indicators';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

describe('FRED_SERIES catalog', () => {
  it('uses unique series IDs', () => {
    const ids = FRED_SERIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category at least once', () => {
    const cats = new Set(FRED_SERIES.map(s => s.category));
    for (const required of ['rates', 'gdp', 'money', 'housing', 'fx', 'commodities']) {
      expect(cats.has(required as never)).toBe(true);
    }
  });

  it('points each entry to a fred.stlouisfed.org source', () => {
    for (const s of FRED_SERIES) {
      expect(s.source_url).toContain('fred.stlouisfed.org');
    }
  });

  it('uses only valid frequencies', () => {
    for (const s of FRED_SERIES) {
      expect(['daily', 'weekly', 'monthly', 'quarterly']).toContain(s.frequency);
    }
  });
});

describe('parseSeriesObservations', () => {
  it('parses well-formed observations and sorts oldest-first', () => {
    const raw = [
      { date: '2026-03-15', value: '4.50' },
      { date: '2026-01-15', value: '4.25' },
      { date: '2026-02-15', value: '4.40' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(3);
    expect(out[0].date).toBe('2026-01-15');
    expect(out[2].date).toBe('2026-03-15');
    expect(out[2].value).toBe(4.5);
  });

  it("treats FRED's `.` value as missing", () => {
    const raw = [
      { date: '2026-01-15', value: '4.25' },
      { date: '2026-01-16', value: '.' },
      { date: '2026-01-17', value: '4.30' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(2);
    expect(out.map(o => o.date)).toEqual(['2026-01-15', '2026-01-17']);
  });

  it('drops malformed rows', () => {
    const raw = [
      { date: '2026-01-15', value: 'not-a-number' },
      { value: '4.25' },                             // missing date
      { date: '2026-01-17', value: '4.30' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-01-17');
  });

  it('caps history at MAX_HISTORY_OBS', () => {
    const raw = Array.from({ length: 200 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      value: String(i),
    }));
    const out = parseSeriesObservations(raw);
    expect(out.length).toBeLessThanOrEqual(90);
  });

  it('returns empty array for empty input', () => {
    expect(parseSeriesObservations([])).toEqual([]);
  });
});

const SAMPLE_SNAPSHOT: IndicatorsSnapshot = {
  capturedAt: '2026-05-06T05:00:00Z',
  count: 2,
  indicators: [
    {
      series_id: 'DFF',
      name: 'Effective Federal Funds Rate',
      category: 'rates',
      frequency: 'daily',
      unit: '%',
      description: 'fed funds',
      source_url: 'https://fred.stlouisfed.org/series/DFF',
      observations: [
        { date: '2026-05-04', value: 4.33 },
        { date: '2026-05-05', value: 4.33 },
      ],
      latest: { date: '2026-05-05', value: 4.33 },
      prior: { date: '2026-05-04', value: 4.33 },
      delta_absolute: 0,
      delta_pct: 0,
    },
    {
      series_id: 'GDP',
      name: 'Gross Domestic Product',
      category: 'gdp',
      frequency: 'quarterly',
      unit: 'billions USD',
      description: 'GDP',
      source_url: 'https://fred.stlouisfed.org/series/GDP',
      observations: [],
      latest: null,
      prior: null,
      delta_absolute: null,
      delta_pct: null,
    },
  ],
  errors: [],
};

describe('readIndicators', () => {
  it('returns null when no snapshot exists', async () => {
    const env = makeEnv({});
    const r = await readIndicators(env);
    expect(r).toBeNull();
  });

  it('returns the full snapshot when no filter', async () => {
    const env = makeEnv({ 'fred-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env);
    expect(r?.count).toBe(2);
  });

  it('filters by category', async () => {
    const env = makeEnv({ 'fred-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env, { category: 'rates' });
    expect(r?.count).toBe(1);
    expect(r?.indicators[0].series_id).toBe('DFF');
  });

  it('attaches attribution', async () => {
    const env = makeEnv({ 'fred-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env);
    expect(r?.attribution).toEqual(FRED_ATTRIBUTION);
  });

  it('surfaces a note when prior refresh had errors', async () => {
    const withErrors: IndicatorsSnapshot = {
      ...SAMPLE_SNAPSHOT,
      errors: [{ series_id: 'DFF', error: 'HTTP 503' }],
    };
    const env = makeEnv({ 'fred-indicators:current': withErrors });
    const r = await readIndicators(env);
    expect(r?.notes.length).toBe(1);
  });
});

describe('isValidCategory', () => {
  it('accepts all six categories', () => {
    for (const c of ['rates', 'gdp', 'money', 'housing', 'fx', 'commodities']) {
      expect(isValidCategory(c)).toBe(true);
    }
  });

  it('rejects unknown', () => {
    expect(isValidCategory('xyz')).toBe(false);
  });
});
