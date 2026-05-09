import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordRSSPoll,
  readNewsDaily,
  readSourceHealth,
  listNewsDailyDates,
  listSourceHealthDates,
  summarizeSourceHealth,
  isISODate,
  enumerateDates,
  type SourceHealthDay,
} from './news-history';
import type { Article, Env } from './types';
import type { RSSPollResult } from './rss';

class MockKV {
  store = new Map<string, string>();

  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function makeEnv(): Env {
  const cache = new MockKV();
  return {
    TENSORFEED_CACHE: cache,
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
  } as unknown as Env;
}

function art(id: string): Article {
  return {
    id,
    title: `t-${id}`,
    url: `https://example.com/${id}`,
    source: 'Example',
    sourceDomain: 'example.com',
    snippet: 's',
    categories: [],
    publishedAt: '2026-05-08T00:00:00.000Z',
    fetchedAt: '2026-05-08T00:00:00.000Z',
  } as Article;
}

const NOW = new Date('2026-05-08T12:00:00.000Z');

describe('isISODate', () => {
  it('accepts well-formed dates', () => {
    expect(isISODate('2026-05-08')).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isISODate('2026-5-8')).toBe(false);
    expect(isISODate(null)).toBe(false);
    expect(isISODate(undefined)).toBe(false);
    expect(isISODate('not-a-date')).toBe(false);
  });
});

describe('enumerateDates', () => {
  it('returns inclusive range', () => {
    expect(enumerateDates('2026-05-01', '2026-05-03')).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
    ]);
  });
  it('returns single date when from == to', () => {
    expect(enumerateDates('2026-05-08', '2026-05-08')).toEqual(['2026-05-08']);
  });
});

describe('summarizeSourceHealth', () => {
  it('computes reliability_pct and sorts desc', () => {
    const day: SourceHealthDay = {
      date: '2026-05-08',
      total_polls: 4,
      updated_at: NOW.toISOString(),
      sources: {
        a: {
          name: 'A',
          polls: 4,
          polls_ok: 2,
          polls_empty: 1,
          polls_error: 1,
          articles_total: 10,
          last_status: 'ok',
          last_seen_at: NOW.toISOString(),
        },
        b: {
          name: 'B',
          polls: 4,
          polls_ok: 4,
          polls_empty: 0,
          polls_error: 0,
          articles_total: 25,
          last_status: 'ok',
          last_seen_at: NOW.toISOString(),
        },
      },
    };
    const out = summarizeSourceHealth(day);
    expect(out[0].id).toBe('b');
    expect(out[0].reliability_pct).toBe(100);
    expect(out[1].id).toBe('a');
    expect(out[1].reliability_pct).toBe(50);
  });
});

describe('recordRSSPoll', () => {
  let env: Env;

  beforeEach(() => {
    env = makeEnv();
  });

  it('writes the daily news snapshot and adds the date to the index', async () => {
    const result: RSSPollResult = {
      articlesTotal: 2,
      sourcesPolled: 1,
      sourcesSucceeded: 1,
      sourceResults: [{ id: 'src1', name: 'Src 1', status: 'ok', articles: 2 }],
    };
    await recordRSSPoll(env, result, [art('1'), art('2')], NOW);

    const snapshot = await readNewsDaily(env, '2026-05-08');
    expect(snapshot).toBeTruthy();
    expect(snapshot!.articles_count).toBe(2);
    expect(snapshot!.articles).toHaveLength(2);

    const dates = await listNewsDailyDates(env);
    expect(dates).toEqual(['2026-05-08']);
  });

  it('accumulates source health across multiple polls in the same day', async () => {
    const a: RSSPollResult = {
      articlesTotal: 5,
      sourcesPolled: 2,
      sourcesSucceeded: 1,
      sourceResults: [
        { id: 's1', name: 'S1', status: 'ok', articles: 5 },
        { id: 's2', name: 'S2', status: 'error', articles: 0, error: 'HTTP 503' },
      ],
    };
    const b: RSSPollResult = {
      articlesTotal: 3,
      sourcesPolled: 2,
      sourcesSucceeded: 2,
      sourceResults: [
        { id: 's1', name: 'S1', status: 'ok', articles: 3 },
        { id: 's2', name: 'S2', status: 'empty', articles: 0 },
      ],
    };

    await recordRSSPoll(env, a, [art('1')], new Date('2026-05-08T01:00:00Z'));
    await recordRSSPoll(env, b, [art('2')], new Date('2026-05-08T02:00:00Z'));

    const day = await readSourceHealth(env, '2026-05-08');
    expect(day).toBeTruthy();
    expect(day!.total_polls).toBe(2);

    const s1 = day!.sources['s1'];
    expect(s1.polls).toBe(2);
    expect(s1.polls_ok).toBe(2);
    expect(s1.articles_total).toBe(8);

    const s2 = day!.sources['s2'];
    expect(s2.polls).toBe(2);
    expect(s2.polls_ok).toBe(0);
    expect(s2.polls_error).toBe(1);
    expect(s2.polls_empty).toBe(1);
    expect(s2.last_error).toBe('HTTP 503');
    expect(s2.last_status).toBe('empty');
  });

  it('keeps separate counters per UTC day and updates both indexes', async () => {
    const r: RSSPollResult = {
      articlesTotal: 1,
      sourcesPolled: 1,
      sourcesSucceeded: 1,
      sourceResults: [{ id: 's1', name: 'S1', status: 'ok', articles: 1 }],
    };
    await recordRSSPoll(env, r, [art('a')], new Date('2026-05-07T23:30:00Z'));
    await recordRSSPoll(env, r, [art('b')], new Date('2026-05-08T00:30:00Z'));

    const dates = await listNewsDailyDates(env);
    const healthDates = await listSourceHealthDates(env);
    expect(dates).toEqual(['2026-05-07', '2026-05-08']);
    expect(healthDates).toEqual(['2026-05-07', '2026-05-08']);

    const day7 = await readSourceHealth(env, '2026-05-07');
    const day8 = await readSourceHealth(env, '2026-05-08');
    expect(day7!.total_polls).toBe(1);
    expect(day8!.total_polls).toBe(1);
  });

  it('does not duplicate dates in the index on repeat polls', async () => {
    const r: RSSPollResult = {
      articlesTotal: 1,
      sourcesPolled: 1,
      sourcesSucceeded: 1,
      sourceResults: [{ id: 's1', name: 'S1', status: 'ok', articles: 1 }],
    };
    await recordRSSPoll(env, r, [art('1')], NOW);
    await recordRSSPoll(env, r, [art('2')], NOW);
    await recordRSSPoll(env, r, [art('3')], NOW);

    const dates = await listNewsDailyDates(env);
    expect(dates).toEqual(['2026-05-08']);
  });
});
