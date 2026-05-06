/**
 * Pure-logic tests for sports-nfl-data (V2 nflverse ingest).
 *
 * Covers the CSV parser (quoted fields, embedded commas + newlines,
 * escaped quotes) and the read helpers with filters. Network fetches
 * (fetchPlayers, fetchSchedule) are not tested here; they would
 * require a fixture HTTP layer beyond V1 scope.
 */

import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  readPlayers,
  readPlayer,
  readSchedule,
  NFLVERSE_ATTRIBUTION,
  NFLPlayer,
  NFLGame,
} from './sports-nfl-data';
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

// ── CSV parser ──────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('parses a basic header + rows', () => {
    const text = 'a,b,c\n1,2,3\n4,5,6';
    const rows = parseCSV(text);
    expect(rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const text = 'name,age\n"Smith, John",42\n"Doe, Jane",37';
    const rows = parseCSV(text);
    expect(rows[0].name).toBe('Smith, John');
    expect(rows[1].name).toBe('Doe, Jane');
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const text = 'note\n"He said ""hello"""\n"plain"';
    const rows = parseCSV(text);
    expect(rows[0].note).toBe('He said "hello"');
    expect(rows[1].note).toBe('plain');
  });

  it('handles quoted fields with embedded newlines', () => {
    const text = 'name,bio\n"Bob","line one\nline two"\n';
    const rows = parseCSV(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].bio).toBe('line one\nline two');
  });

  it('handles CRLF line endings', () => {
    const text = 'a,b\r\n1,2\r\n3,4\r\n';
    const rows = parseCSV(text);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ a: '3', b: '4' });
  });

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('returns empty array for header only', () => {
    expect(parseCSV('a,b,c')).toEqual([]);
  });

  it('preserves empty fields', () => {
    const text = 'a,b,c\n1,,3';
    const rows = parseCSV(text);
    expect(rows[0]).toEqual({ a: '1', b: '', c: '3' });
  });
});

// ── readPlayers ─────────────────────────────────────────────────────

const SAMPLE_PLAYERS: NFLPlayer[] = [
  {
    gsis_id: '00-0036971',
    display_name: 'Brock Purdy',
    first_name: 'Brock',
    last_name: 'Purdy',
    position: 'QB',
    team: 'SF',
    jersey_number: 13,
    status: 'ACT',
    height: 73,
    weight: 220,
    birth_date: '2000-01-27',
    age: 26,
    college: 'Iowa State',
    draft_year: 2022,
    draft_round: 7,
    draft_pick: 262,
    entry_year: 2022,
    years_of_experience: 4,
    headshot_url: null,
  },
  {
    gsis_id: '00-0034796',
    display_name: 'Patrick Mahomes',
    first_name: 'Patrick',
    last_name: 'Mahomes',
    position: 'QB',
    team: 'KC',
    jersey_number: 15,
    status: 'ACT',
    height: 75,
    weight: 230,
    birth_date: '1995-09-17',
    age: 30,
    college: 'Texas Tech',
    draft_year: 2017,
    draft_round: 1,
    draft_pick: 10,
    entry_year: 2017,
    years_of_experience: 9,
    headshot_url: null,
  },
  {
    gsis_id: '00-0033881',
    display_name: 'Travis Kelce',
    first_name: 'Travis',
    last_name: 'Kelce',
    position: 'TE',
    team: 'KC',
    jersey_number: 87,
    status: 'ACT',
    height: 77,
    weight: 250,
    birth_date: '1989-10-05',
    age: 36,
    college: 'Cincinnati',
    draft_year: 2013,
    draft_round: 3,
    draft_pick: 63,
    entry_year: 2013,
    years_of_experience: 13,
    headshot_url: null,
  },
];

describe('readPlayers', () => {
  it('returns all players up to limit', async () => {
    const env = makeEnv({
      'sports-nfl:players': SAMPLE_PLAYERS,
      'sports-nfl:players:meta': { count: 3, capturedAt: '2026-05-06T06:00:00Z', source: 'x' },
    });
    const r = await readPlayers(env);
    expect(r.count).toBe(3);
    expect(r.players[0].gsis_id).toBe('00-0036971');
  });

  it('filters by team (case-insensitive)', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayers(env, { team: 'kc' });
    expect(r.count).toBe(2);
    expect(r.players.every(p => p.team === 'KC')).toBe(true);
  });

  it('filters by position', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayers(env, { position: 'QB' });
    expect(r.count).toBe(2);
    expect(r.players.every(p => p.position === 'QB')).toBe(true);
  });

  it('filters by name substring', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayers(env, { q: 'kelce' });
    expect(r.count).toBe(1);
    expect(r.players[0].last_name).toBe('Kelce');
  });

  it('combines filters', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayers(env, { team: 'KC', position: 'QB' });
    expect(r.count).toBe(1);
    expect(r.players[0].display_name).toBe('Patrick Mahomes');
  });

  it('handles empty corpus gracefully', async () => {
    const env = makeEnv({});
    const r = await readPlayers(env);
    expect(r.count).toBe(0);
    expect(r.players).toEqual([]);
  });

  it('attaches attribution', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayers(env);
    expect(r.attribution).toEqual(NFLVERSE_ATTRIBUTION);
    expect(r.attribution.license).toBe('CC-BY-4.0');
  });
});

// ── readPlayer ──────────────────────────────────────────────────────

describe('readPlayer', () => {
  it('finds a player by gsis_id', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayer(env, '00-0036971');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.player.display_name).toBe('Brock Purdy');
  });

  it('returns error for unknown gsis_id', async () => {
    const env = makeEnv({ 'sports-nfl:players': SAMPLE_PLAYERS });
    const r = await readPlayer(env, '00-9999999');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('player_not_found');
  });
});

// ── readSchedule ────────────────────────────────────────────────────

const SAMPLE_GAMES: NFLGame[] = [
  {
    game_id: '2025_01_KC_BAL',
    season: 2025,
    week: 1,
    game_type: 'REG',
    game_date: '2025-09-04',
    weekday: 'Thursday',
    start_time_eastern: '20:20',
    away_team: 'KC',
    home_team: 'BAL',
    away_score: 27,
    home_score: 20,
    result: -7,
    total: 47,
    stadium: 'M&T Bank Stadium',
    roof: 'outdoors',
    surface: 'grass',
  },
  {
    game_id: '2025_18_KC_DEN',
    season: 2025,
    week: 18,
    game_type: 'REG',
    game_date: '2026-01-04',
    weekday: 'Sunday',
    start_time_eastern: '13:00',
    away_team: 'DEN',
    home_team: 'KC',
    away_score: null,
    home_score: null,
    result: null,
    total: null,
    stadium: 'GEHA Field at Arrowhead Stadium',
    roof: 'outdoors',
    surface: 'grass',
  },
  {
    game_id: '2024_01_BAL_KC',
    season: 2024,
    week: 1,
    game_type: 'REG',
    game_date: '2024-09-05',
    weekday: 'Thursday',
    start_time_eastern: '20:20',
    away_team: 'BAL',
    home_team: 'KC',
    away_score: 20,
    home_score: 27,
    result: 7,
    total: 47,
    stadium: 'GEHA Field at Arrowhead Stadium',
    roof: 'outdoors',
    surface: 'grass',
  },
];

describe('readSchedule', () => {
  it('returns all games up to limit', async () => {
    const env = makeEnv({
      'sports-nfl:schedule': SAMPLE_GAMES,
      'sports-nfl:schedule:meta': {
        count: 3,
        capturedAt: '2026-05-06T06:00:00Z',
        source: 'x',
        seasons_covered: [2024, 2025],
      },
    });
    const r = await readSchedule(env);
    expect(r.count).toBe(3);
  });

  it('filters by season', async () => {
    const env = makeEnv({ 'sports-nfl:schedule': SAMPLE_GAMES });
    const r = await readSchedule(env, { season: 2025 });
    expect(r.count).toBe(2);
    expect(r.games.every(g => g.season === 2025)).toBe(true);
  });

  it('filters by week', async () => {
    const env = makeEnv({ 'sports-nfl:schedule': SAMPLE_GAMES });
    const r = await readSchedule(env, { week: 1 });
    expect(r.count).toBe(2);
  });

  it('filters by team (matches home or away)', async () => {
    const env = makeEnv({ 'sports-nfl:schedule': SAMPLE_GAMES });
    const r = await readSchedule(env, { team: 'kc' });
    expect(r.count).toBe(3);
  });

  it('combines filters', async () => {
    const env = makeEnv({ 'sports-nfl:schedule': SAMPLE_GAMES });
    const r = await readSchedule(env, { season: 2025, team: 'KC' });
    expect(r.count).toBe(2);
  });

  it('handles empty corpus gracefully', async () => {
    const env = makeEnv({});
    const r = await readSchedule(env);
    expect(r.count).toBe(0);
    expect(r.games).toEqual([]);
  });

  it('attaches attribution', async () => {
    const env = makeEnv({ 'sports-nfl:schedule': SAMPLE_GAMES });
    const r = await readSchedule(env);
    expect(r.attribution).toEqual(NFLVERSE_ATTRIBUTION);
  });
});
