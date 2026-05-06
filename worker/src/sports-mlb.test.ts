import { describe, it, expect } from 'vitest';
import {
  MLB_TEAMS,
  getMLBTeam,
  parseRSSItems,
  readMLBNews,
  MLB_NEWS_ATTRIBUTION,
  SportsArticle,
} from './sports-mlb';
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
  const news = makeKV(initial);
  return {
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV({}) as unknown as KVNamespace,
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

// ── Team catalog ───────────────────────────────────────────────────

describe('MLB_TEAMS catalog', () => {
  it('contains all 30 MLB teams', () => {
    expect(MLB_TEAMS).toHaveLength(30);
  });

  it('splits 15 teams per league', () => {
    expect(MLB_TEAMS.filter(t => t.league === 'AL')).toHaveLength(15);
    expect(MLB_TEAMS.filter(t => t.league === 'NL')).toHaveLength(15);
  });

  it('has 5 teams in every division of every league', () => {
    for (const lg of ['AL', 'NL'] as const) {
      for (const div of ['East', 'Central', 'West'] as const) {
        const teams = MLB_TEAMS.filter(t => t.league === lg && t.division === div);
        expect(teams, `${lg} ${div}`).toHaveLength(5);
      }
    }
  });

  it('uses unique lowercase ids', () => {
    const ids = MLB_TEAMS.map(t => t.id);
    expect(new Set(ids).size).toBe(MLB_TEAMS.length);
    for (const id of ids) {
      expect(id).toBe(id.toLowerCase());
    }
  });
});

describe('getMLBTeam', () => {
  it('finds by lowercase id', () => {
    expect(getMLBTeam('sf')?.name).toBe('San Francisco Giants');
  });

  it('finds by abbreviation (case-insensitive)', () => {
    expect(getMLBTeam('NYY')?.short_name).toBe('Yankees');
    expect(getMLBTeam('lad')?.short_name).toBe('Dodgers');
  });

  it('returns null for unknown', () => {
    expect(getMLBTeam('xyz')).toBeNull();
    expect(getMLBTeam('')).toBeNull();
  });
});

// ── RSS parser shared helper ───────────────────────────────────────

describe('parseRSSItems', () => {
  it('parses a basic RSS 2.0 feed', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Yankees activate ace from IL</title>
        <link>https://example.com/y-1</link>
        <description>Right-hander returns Friday vs. Boston.</description>
        <pubDate>Mon, 05 May 2026 12:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('Yankees');
  });
});

// ── readMLBNews ────────────────────────────────────────────────────

const SAMPLE_ARTICLES: SportsArticle[] = [
  {
    id: '1',
    title: 'Dodgers extend Mookie Betts',
    url: 'https://example.com/lad-betts',
    source: 'ESPN MLB',
    source_domain: 'espn.com',
    snippet: 'Long-term deal keeps the outfielder in Los Angeles.',
    league: 'mlb',
    publishedAt: '2026-05-05T12:00:00Z',
    fetchedAt: '2026-05-05T12:30:00Z',
  },
  {
    id: '2',
    title: 'Yankees walk off Red Sox in extras',
    url: 'https://example.com/nyy-bos',
    source: 'MLB.com',
    source_domain: 'mlb.com',
    snippet: 'Aaron Judge homers in the 11th.',
    league: 'mlb',
    publishedAt: '2026-05-05T11:00:00Z',
    fetchedAt: '2026-05-05T11:30:00Z',
  },
  {
    id: '3',
    title: 'Padres call up top prospect',
    url: 'https://example.com/sd-prospect',
    source: 'CBS Sports MLB',
    source_domain: 'cbssports.com',
    snippet: 'San Diego promotes their #1 prospect ahead of the homestand.',
    league: 'mlb',
    publishedAt: '2026-05-04T16:00:00Z',
    fetchedAt: '2026-05-04T16:30:00Z',
  },
];

describe('readMLBNews', () => {
  it('returns all articles up to default limit', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env);
    expect(r.count).toBe(3);
    expect(r.articles[0].title).toContain('Dodgers');
  });

  it('respects limit', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env, { limit: 2 });
    expect(r.count).toBe(2);
  });

  it('filters by team via short_name match', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env, { team: 'lad' });
    expect(r.count).toBe(1);
    expect(r.articles[0].title).toContain('Dodgers');
  });

  it('filters by team via city match (Yankees article mentions Red Sox; both match query)', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env, { team: 'NYY' });
    // Title contains "Yankees", short_name match
    expect(r.count).toBe(1);
  });

  it('handles unknown team as no filter', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env, { team: 'xyz' });
    expect(r.count).toBe(SAMPLE_ARTICLES.length);
  });

  it('handles empty corpus', async () => {
    const env = makeEnv({});
    const r = await readMLBNews(env);
    expect(r.count).toBe(0);
    expect(r.articles).toEqual([]);
  });

  it('attaches attribution', async () => {
    const env = makeEnv({ 'sports-mlb:articles': SAMPLE_ARTICLES });
    const r = await readMLBNews(env);
    expect(r.attribution).toEqual(MLB_NEWS_ATTRIBUTION);
  });
});
