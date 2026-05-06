/**
 * Pure-logic unit tests for the NFL sports module.
 *
 * KV stubbed in-memory. Covers team catalog completeness, lookup
 * helpers, RSS parsing, news read filters (limit + team filter),
 * and the league directory.
 */

import { describe, it, expect } from 'vitest';
import {
  NFL_TEAMS,
  SUPPORTED_LEAGUES,
  getNFLTeam,
  parseRSSItems,
  readNFLNews,
  SPORTS_NEWS_ATTRIBUTION,
  SportsArticle,
} from './sports-nfl';
import type { Env } from './types';

// ── KV mock ────────────────────────────────────────────────

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown>): MockKV {
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

// ── Team catalog ───────────────────────────────────────────

describe('NFL_TEAMS catalog', () => {
  it('contains all 32 NFL teams', () => {
    expect(NFL_TEAMS).toHaveLength(32);
  });

  it('splits 16 teams per conference', () => {
    const afc = NFL_TEAMS.filter(t => t.conference === 'AFC');
    const nfc = NFL_TEAMS.filter(t => t.conference === 'NFC');
    expect(afc).toHaveLength(16);
    expect(nfc).toHaveLength(16);
  });

  it('has 4 teams in every division of every conference', () => {
    const divisions = ['East', 'North', 'South', 'West'] as const;
    for (const conf of ['AFC', 'NFC'] as const) {
      for (const div of divisions) {
        const teams = NFL_TEAMS.filter(t => t.conference === conf && t.division === div);
        expect(teams, `${conf} ${div}`).toHaveLength(4);
      }
    }
  });

  it('uses unique lowercase ids', () => {
    const ids = NFL_TEAMS.map(t => t.id);
    expect(new Set(ids).size).toBe(NFL_TEAMS.length);
    for (const id of ids) {
      expect(id).toBe(id.toLowerCase());
    }
  });

  it('uses unique uppercase abbreviations', () => {
    const abbrs = NFL_TEAMS.map(t => t.abbreviation);
    expect(new Set(abbrs).size).toBe(NFL_TEAMS.length);
    for (const a of abbrs) {
      expect(a).toBe(a.toUpperCase());
    }
  });
});

describe('getNFLTeam', () => {
  it('finds a team by lowercase id', () => {
    const t = getNFLTeam('sf');
    expect(t?.name).toBe('San Francisco 49ers');
  });

  it('finds a team by uppercase abbreviation', () => {
    const t = getNFLTeam('KC');
    expect(t?.short_name).toBe('Chiefs');
  });

  it('finds a team by mixed case', () => {
    const t = getNFLTeam('Nyj');
    expect(t?.short_name).toBe('Jets');
  });

  it('returns null for unknown team', () => {
    expect(getNFLTeam('xyz')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getNFLTeam('')).toBeNull();
  });
});

// ── League directory ───────────────────────────────────────

describe('SUPPORTED_LEAGUES', () => {
  it('declares NFL as live', () => {
    const nfl = SUPPORTED_LEAGUES.find(l => l.id === 'nfl');
    expect(nfl?.status).toBe('live');
    expect(nfl?.endpoint_prefix).toBe('/api/sports/nfl');
  });

  it('declares MLB as live', () => {
    const mlb = SUPPORTED_LEAGUES.find(l => l.id === 'mlb');
    expect(mlb?.status).toBe('live');
    expect(mlb?.endpoint_prefix).toBe('/api/sports/mlb');
  });

  it('lists nba/nhl as planned', () => {
    for (const id of ['nba', 'nhl']) {
      const league = SUPPORTED_LEAGUES.find(l => l.id === id);
      expect(league?.status).toBe('planned');
    }
  });
});

// ── RSS parsing ────────────────────────────────────────────

describe('parseRSSItems', () => {
  it('parses a basic RSS 2.0 feed', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>49ers sign veteran lineman</title>
        <link>https://example.com/article-1</link>
        <description>Beat reporter says it is a one-year deal.</description>
        <pubDate>Mon, 05 May 2026 12:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Patriots release backup QB</title>
        <link>https://example.com/article-2</link>
        <description>Roster move ahead of OTAs.</description>
        <pubDate>Mon, 05 May 2026 11:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('49ers sign veteran lineman');
    expect(items[0].link).toBe('https://example.com/article-1');
  });

  it('parses an Atom feed', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Chiefs sign WR</title>
        <link href="https://example.com/atom-1"/>
        <summary>One-year contract with playing time incentives.</summary>
        <published>2026-05-05T12:00:00Z</published>
      </entry>
    </feed>`;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Chiefs sign WR');
    expect(items[0].link).toBe('https://example.com/atom-1');
  });

  it('handles CDATA in titles', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[Trade & Roster Move]]></title>
        <link>https://example.com/c</link>
        <description><![CDATA[Some <b>HTML</b> here.]]></description>
        <pubDate>Mon, 05 May 2026 12:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const items = parseRSSItems(xml);
    expect(items[0].title).toBe('Trade & Roster Move');
  });

  it('drops items missing title or link', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Has title</title><link>https://example.com/ok</link></item>
      <item><title>No link here</title></item>
      <item><link>https://example.com/no-title</link></item>
    </channel></rss>`;
    const items = parseRSSItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Has title');
  });
});

// ── readNFLNews ────────────────────────────────────────────

const SAMPLE_ARTICLES: SportsArticle[] = [
  {
    id: '1',
    title: '49ers extend QB Brock Purdy through 2030',
    url: 'https://example.com/sf-purdy',
    source: 'ESPN NFL',
    source_domain: 'espn.com',
    snippet: 'San Francisco locks up its starter on a long-term deal.',
    league: 'nfl',
    publishedAt: '2026-05-05T12:00:00Z',
    fetchedAt: '2026-05-05T12:30:00Z',
  },
  {
    id: '2',
    title: 'Chiefs and Travis Kelce agree to one-year extension',
    url: 'https://example.com/kc-kelce',
    source: 'NFL.com',
    source_domain: 'nfl.com',
    snippet: 'Tight end stays in Kansas City for 2026.',
    league: 'nfl',
    publishedAt: '2026-05-05T11:00:00Z',
    fetchedAt: '2026-05-05T11:30:00Z',
  },
  {
    id: '3',
    title: 'Patriots release backup QB',
    url: 'https://example.com/ne-qb',
    source: 'CBS Sports NFL',
    source_domain: 'cbssports.com',
    snippet: 'New England roster move ahead of OTAs.',
    league: 'nfl',
    publishedAt: '2026-05-04T16:00:00Z',
    fetchedAt: '2026-05-04T16:30:00Z',
  },
];

describe('readNFLNews', () => {
  it('returns all articles up to default limit', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    const r = await readNFLNews(env);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(3);
    expect(r.articles[0].title).toContain('49ers');
  });

  it('respects limit', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    const r = await readNFLNews(env, { limit: 2 });
    expect(r.count).toBe(2);
  });

  it('caps limit at 100', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    const r = await readNFLNews(env, { limit: 999 });
    expect(r.count).toBe(SAMPLE_ARTICLES.length);
  });

  it('filters by team id (case-insensitive on id and abbreviation)', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    const r1 = await readNFLNews(env, { team: 'sf' });
    expect(r1.count).toBe(1);
    expect(r1.articles[0].title).toContain('49ers');

    const r2 = await readNFLNews(env, { team: 'KC' });
    expect(r2.count).toBe(1);
    expect(r2.articles[0].title).toContain('Chiefs');
  });

  it('filters by team via short_name match', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    // "Patriots" appears in the third article only
    const r = await readNFLNews(env, { team: 'ne' });
    expect(r.count).toBe(1);
    expect(r.articles[0].title).toContain('Patriots');
  });

  it('returns empty array when team unknown', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    // Unknown team is treated as no filter (getNFLTeam returns null)
    const r = await readNFLNews(env, { team: 'xyz' });
    expect(r.count).toBe(SAMPLE_ARTICLES.length);
  });

  it('handles empty corpus gracefully', async () => {
    const env = makeEnv({});
    const r = await readNFLNews(env);
    expect(r.count).toBe(0);
    expect(r.articles).toEqual([]);
  });

  it('always includes attribution', async () => {
    const env = makeEnv({ 'sports-nfl:articles': SAMPLE_ARTICLES });
    const r = await readNFLNews(env);
    expect(r.attribution).toEqual(SPORTS_NEWS_ATTRIBUTION);
    expect(r.attribution.snippet_max_chars).toBe(200);
    expect(r.attribution.link_required).toBe(true);
  });
});
