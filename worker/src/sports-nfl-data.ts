import { Env } from './types';

/**
 * NFL data ingest from nflverse-data (V2).
 *
 * Pulls CSV releases from github.com/nflverse/nflverse-data, downsamples
 * to agent-relevant columns, and writes to KV. Daily cron, batched
 * writes, in-memory parse (files fit comfortably).
 *
 * Source license: CC-BY-4.0. Permits commercial redistribution with
 * attribution. Attribution shipped on every response shape via
 * NFLVERSE_ATTRIBUTION.
 *
 * V2 scope:
 *   - players.csv (~7 MB raw): active player roster (gsis_id, name,
 *     position, team, status, physicals, draft, college).
 *   - games.csv (~2 MB raw): full schedule + scores history.
 *
 * Deferred to V2.1:
 *   - weekly stats (split per season, larger)
 *   - weekly rosters (~15 MB per season)
 *   - injuries / depth charts
 *   - play-by-play (huge, premium-tier candidate)
 */

const PLAYERS_URL =
  'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv';
const GAMES_URL =
  'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv';
const FETCH_TIMEOUT_MS = 30_000;

const PLAYERS_KEY = 'sports-nfl:players';
const PLAYERS_META_KEY = 'sports-nfl:players:meta';
const SCHEDULE_KEY = 'sports-nfl:schedule';
const SCHEDULE_META_KEY = 'sports-nfl:schedule:meta';

// ── Types ───────────────────────────────────────────────────────────

export interface NFLPlayer {
  gsis_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  position: string | null;
  team: string | null;
  jersey_number: number | null;
  status: string | null;
  height: number | null;       // inches
  weight: number | null;       // lbs
  birth_date: string | null;
  age: number | null;
  college: string | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_pick: number | null;
  entry_year: number | null;
  years_of_experience: number | null;
  headshot_url: string | null;
}

export interface NFLGame {
  game_id: string;
  season: number;
  week: number;
  game_type: string | null;     // REG, POST, PRE
  game_date: string | null;     // YYYY-MM-DD
  weekday: string | null;
  start_time_eastern: string | null;
  away_team: string | null;
  home_team: string | null;
  away_score: number | null;
  home_score: number | null;
  result: number | null;         // home minus away
  total: number | null;          // combined
  stadium: string | null;
  roof: string | null;
  surface: string | null;
}

export interface NFLverseAttribution {
  source: string;
  source_url: string;
  license: string;
  license_url: string;
  required_credit: string;
}

export const NFLVERSE_ATTRIBUTION: NFLverseAttribution = {
  source: 'nflverse-data',
  source_url: 'https://github.com/nflverse/nflverse-data',
  license: 'CC-BY-4.0',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
  required_credit:
    'Player and schedule data via nflverse-data, distributed under CC-BY-4.0. https://github.com/nflverse/nflverse-data',
};

// ── CSV parser (RFC-4180-ish, handles quoted fields with embedded commas/newlines) ──

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field);
        field = '';
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          rows.push(row);
        }
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0];
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = rows[r][c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

function asNum(v: string | undefined | null): number | null {
  if (v === undefined || v === null || v === '' || v === 'NA') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asStr(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  if (t === '' || t === 'NA') return null;
  return t;
}

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age >= 0 && age < 100 ? age : null;
}

// ── Players ─────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(['ACT', 'A01', 'RES', 'EXE', 'INA', 'DEV', 'NON']);

function rowToPlayer(row: Record<string, string>): NFLPlayer | null {
  const gsis_id = asStr(row.gsis_id);
  if (!gsis_id) return null;

  const display_name = asStr(row.display_name) ?? asStr(row.full_name) ?? '';
  if (!display_name) return null;

  const first_name = asStr(row.first_name) ?? '';
  const last_name = asStr(row.last_name) ?? '';
  const status = asStr(row.status);

  // Skip clearly retired/historical players when status is empty AND no recent
  // entry year is available; keeps the active-roster view ~3-4k entries
  // instead of the full 25k+ historical catalog.
  const entry_year = asNum(row.entry_year);
  const has_recent_activity = (entry_year !== null && entry_year >= 2010) || status !== null;
  if (!has_recent_activity) return null;

  const birth_date = asStr(row.birth_date);

  return {
    gsis_id,
    display_name,
    first_name,
    last_name,
    position: asStr(row.position),
    team: asStr(row.team_abbr) ?? asStr(row.latest_team),
    jersey_number: asNum(row.jersey_number),
    status,
    height: asNum(row.height),
    weight: asNum(row.weight),
    birth_date,
    age: ageFromBirthDate(birth_date),
    college: asStr(row.college_name) ?? asStr(row.college),
    draft_year: asNum(row.draft_year),
    draft_round: asNum(row.draft_round),
    draft_pick: asNum(row.draft_pick),
    entry_year,
    years_of_experience: asNum(row.years_of_experience),
    headshot_url: asStr(row.headshot_url),
  };
}

export async function fetchPlayers(): Promise<NFLPlayer[]> {
  const res = await fetch(PLAYERS_URL, {
    headers: { 'User-Agent': 'tensorfeed-sports/1.0 (+https://tensorfeed.ai)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 300 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`players fetch failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const rows = parseCSV(text);
  const out: NFLPlayer[] = [];
  for (const row of rows) {
    const p = rowToPlayer(row);
    if (p) out.push(p);
  }
  // Sort: status active first, then by display_name
  out.sort((a, b) => {
    const aActive = a.status && ACTIVE_STATUSES.has(a.status) ? 0 : 1;
    const bActive = b.status && ACTIVE_STATUSES.has(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.display_name.localeCompare(b.display_name);
  });
  return out;
}

// ── Schedule / games ─────────────────────────────────────────────────

const CURRENT_SEASON_START = 2024; // keep 2024+ to bound payload size

function rowToGame(row: Record<string, string>): NFLGame | null {
  const game_id = asStr(row.game_id);
  if (!game_id) return null;
  const season = asNum(row.season);
  if (season === null || season < CURRENT_SEASON_START) return null;

  return {
    game_id,
    season,
    week: asNum(row.week) ?? 0,
    game_type: asStr(row.game_type),
    game_date: asStr(row.gameday),
    weekday: asStr(row.weekday),
    start_time_eastern: asStr(row.gametime),
    away_team: asStr(row.away_team),
    home_team: asStr(row.home_team),
    away_score: asNum(row.away_score),
    home_score: asNum(row.home_score),
    result: asNum(row.result),
    total: asNum(row.total),
    stadium: asStr(row.stadium),
    roof: asStr(row.roof),
    surface: asStr(row.surface),
  };
}

export async function fetchSchedule(): Promise<NFLGame[]> {
  const res = await fetch(GAMES_URL, {
    headers: { 'User-Agent': 'tensorfeed-sports/1.0 (+https://tensorfeed.ai)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 300 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`schedule fetch failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const rows = parseCSV(text);
  const out: NFLGame[] = [];
  for (const row of rows) {
    const g = rowToGame(row);
    if (g) out.push(g);
  }
  out.sort((a, b) => {
    if (a.season !== b.season) return b.season - a.season;
    if (a.week !== b.week) return a.week - b.week;
    if (a.game_date && b.game_date) return a.game_date.localeCompare(b.game_date);
    return 0;
  });
  return out;
}

// ── Cron entry point ─────────────────────────────────────────────────

export interface IngestResult {
  ok: boolean;
  players_count?: number;
  games_count?: number;
  errors: string[];
  capturedAt: string;
}

export async function captureNFLverseDaily(env: Env): Promise<IngestResult> {
  const capturedAt = new Date().toISOString();
  const errors: string[] = [];
  let players_count: number | undefined;
  let games_count: number | undefined;

  try {
    const players = await fetchPlayers();
    await env.TENSORFEED_NEWS.put(PLAYERS_KEY, JSON.stringify(players));
    await env.TENSORFEED_NEWS.put(
      PLAYERS_META_KEY,
      JSON.stringify({
        count: players.length,
        capturedAt,
        source: PLAYERS_URL,
      }),
    );
    players_count = players.length;
  } catch (err) {
    errors.push(`players: ${(err as Error).message}`);
  }

  try {
    const games = await fetchSchedule();
    await env.TENSORFEED_NEWS.put(SCHEDULE_KEY, JSON.stringify(games));
    await env.TENSORFEED_NEWS.put(
      SCHEDULE_META_KEY,
      JSON.stringify({
        count: games.length,
        capturedAt,
        source: GAMES_URL,
        seasons_covered: Array.from(new Set(games.map(g => g.season))).sort((a, b) => a - b),
      }),
    );
    games_count = games.length;
  } catch (err) {
    errors.push(`schedule: ${(err as Error).message}`);
  }

  return {
    ok: errors.length < 2,
    players_count,
    games_count,
    errors,
    capturedAt,
  };
}

// ── Read API ─────────────────────────────────────────────────────────

interface PlayerListMeta {
  count: number;
  capturedAt: string;
  source: string;
}

interface ScheduleMeta {
  count: number;
  capturedAt: string;
  source: string;
  seasons_covered: number[];
}

export interface PlayersResponse {
  ok: true;
  count: number;
  players: NFLPlayer[];
  filters: {
    team?: string;
    position?: string;
    status?: string;
    q?: string;
  };
  data_freshness: { captured_at: string | null };
  attribution: NFLverseAttribution;
}

export interface PlayersOptions {
  team?: string;
  position?: string;
  status?: string;
  q?: string;
  limit?: number;
}

export async function readPlayers(env: Env, options: PlayersOptions = {}): Promise<PlayersResponse> {
  const all = ((await env.TENSORFEED_NEWS.get(PLAYERS_KEY, 'json')) as NFLPlayer[] | null) ?? [];
  const meta = (await env.TENSORFEED_NEWS.get(PLAYERS_META_KEY, 'json')) as PlayerListMeta | null;
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));

  const team = options.team?.toUpperCase().trim();
  const position = options.position?.toUpperCase().trim();
  const status = options.status?.toUpperCase().trim();
  const q = options.q?.toLowerCase().trim();

  const filtered = all.filter(p => {
    if (team && (p.team ?? '').toUpperCase() !== team) return false;
    if (position && (p.position ?? '').toUpperCase() !== position) return false;
    if (status && (p.status ?? '').toUpperCase() !== status) return false;
    if (q && !p.display_name.toLowerCase().includes(q)) return false;
    return true;
  });

  return {
    ok: true,
    count: Math.min(filtered.length, limit),
    players: filtered.slice(0, limit),
    filters: {
      ...(options.team ? { team: options.team } : {}),
      ...(options.position ? { position: options.position } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.q ? { q: options.q } : {}),
    },
    data_freshness: { captured_at: meta?.capturedAt ?? null },
    attribution: NFLVERSE_ATTRIBUTION,
  };
}

export interface PlayerDetailResponse {
  ok: true;
  player: NFLPlayer;
  data_freshness: { captured_at: string | null };
  attribution: NFLverseAttribution;
}

export interface PlayerDetailError {
  ok: false;
  error: string;
}

export async function readPlayer(
  env: Env,
  gsisId: string,
): Promise<PlayerDetailResponse | PlayerDetailError> {
  const all = ((await env.TENSORFEED_NEWS.get(PLAYERS_KEY, 'json')) as NFLPlayer[] | null) ?? [];
  const meta = (await env.TENSORFEED_NEWS.get(PLAYERS_META_KEY, 'json')) as PlayerListMeta | null;
  const upper = gsisId.toUpperCase().trim();
  const player = all.find(p => p.gsis_id.toUpperCase() === upper);
  if (!player) {
    return { ok: false, error: 'player_not_found' };
  }
  return {
    ok: true,
    player,
    data_freshness: { captured_at: meta?.capturedAt ?? null },
    attribution: NFLVERSE_ATTRIBUTION,
  };
}

export interface ScheduleResponse {
  ok: true;
  count: number;
  games: NFLGame[];
  filters: {
    season?: number;
    week?: number;
    team?: string;
  };
  data_freshness: { captured_at: string | null; seasons_covered: number[] };
  attribution: NFLverseAttribution;
}

export interface ScheduleOptions {
  season?: number;
  week?: number;
  team?: string;
  limit?: number;
}

export async function readSchedule(env: Env, options: ScheduleOptions = {}): Promise<ScheduleResponse> {
  const all = ((await env.TENSORFEED_NEWS.get(SCHEDULE_KEY, 'json')) as NFLGame[] | null) ?? [];
  const meta = (await env.TENSORFEED_NEWS.get(SCHEDULE_META_KEY, 'json')) as ScheduleMeta | null;
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));

  const team = options.team?.toUpperCase().trim();

  const filtered = all.filter(g => {
    if (options.season !== undefined && g.season !== options.season) return false;
    if (options.week !== undefined && g.week !== options.week) return false;
    if (team && (g.away_team ?? '').toUpperCase() !== team && (g.home_team ?? '').toUpperCase() !== team) return false;
    return true;
  });

  return {
    ok: true,
    count: Math.min(filtered.length, limit),
    games: filtered.slice(0, limit),
    filters: {
      ...(options.season !== undefined ? { season: options.season } : {}),
      ...(options.week !== undefined ? { week: options.week } : {}),
      ...(options.team ? { team: options.team } : {}),
    },
    data_freshness: {
      captured_at: meta?.capturedAt ?? null,
      seasons_covered: meta?.seasons_covered ?? [],
    },
    attribution: NFLVERSE_ATTRIBUTION,
  };
}
