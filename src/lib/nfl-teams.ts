/**
 * Static mirror of the 32-team catalog in worker/src/sports-nfl.ts.
 *
 * Duplicated rather than imported because the worker code targets the
 * Cloudflare Workers runtime and the frontend targets Next.js static
 * export; sharing across that boundary requires either a build-time
 * script or a runtime fetch, and a 32-entry hand-curated table is
 * cheap to keep in sync. Both copies should be edited together.
 *
 * Server-rendered into the /sports/nfl HTML so search engines see the
 * full team list without running JS.
 */

export interface NFLTeam {
  id: string;
  name: string;
  city: string;
  short_name: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
}

export const NFL_TEAMS: NFLTeam[] = [
  { id: 'buf', name: 'Buffalo Bills', city: 'Buffalo', short_name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East' },
  { id: 'mia', name: 'Miami Dolphins', city: 'Miami', short_name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East' },
  { id: 'ne', name: 'New England Patriots', city: 'New England', short_name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East' },
  { id: 'nyj', name: 'New York Jets', city: 'New York', short_name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East' },
  { id: 'bal', name: 'Baltimore Ravens', city: 'Baltimore', short_name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North' },
  { id: 'cin', name: 'Cincinnati Bengals', city: 'Cincinnati', short_name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North' },
  { id: 'cle', name: 'Cleveland Browns', city: 'Cleveland', short_name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North' },
  { id: 'pit', name: 'Pittsburgh Steelers', city: 'Pittsburgh', short_name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North' },
  { id: 'hou', name: 'Houston Texans', city: 'Houston', short_name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South' },
  { id: 'ind', name: 'Indianapolis Colts', city: 'Indianapolis', short_name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South' },
  { id: 'jax', name: 'Jacksonville Jaguars', city: 'Jacksonville', short_name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South' },
  { id: 'ten', name: 'Tennessee Titans', city: 'Tennessee', short_name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South' },
  { id: 'den', name: 'Denver Broncos', city: 'Denver', short_name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West' },
  { id: 'kc', name: 'Kansas City Chiefs', city: 'Kansas City', short_name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West' },
  { id: 'lv', name: 'Las Vegas Raiders', city: 'Las Vegas', short_name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West' },
  { id: 'lac', name: 'Los Angeles Chargers', city: 'Los Angeles', short_name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West' },
  { id: 'dal', name: 'Dallas Cowboys', city: 'Dallas', short_name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East' },
  { id: 'nyg', name: 'New York Giants', city: 'New York', short_name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East' },
  { id: 'phi', name: 'Philadelphia Eagles', city: 'Philadelphia', short_name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East' },
  { id: 'wsh', name: 'Washington Commanders', city: 'Washington', short_name: 'Commanders', abbreviation: 'WSH', conference: 'NFC', division: 'East' },
  { id: 'chi', name: 'Chicago Bears', city: 'Chicago', short_name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North' },
  { id: 'det', name: 'Detroit Lions', city: 'Detroit', short_name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North' },
  { id: 'gb', name: 'Green Bay Packers', city: 'Green Bay', short_name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North' },
  { id: 'min', name: 'Minnesota Vikings', city: 'Minnesota', short_name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North' },
  { id: 'atl', name: 'Atlanta Falcons', city: 'Atlanta', short_name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South' },
  { id: 'car', name: 'Carolina Panthers', city: 'Carolina', short_name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South' },
  { id: 'no', name: 'New Orleans Saints', city: 'New Orleans', short_name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South' },
  { id: 'tb', name: 'Tampa Bay Buccaneers', city: 'Tampa Bay', short_name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South' },
  { id: 'ari', name: 'Arizona Cardinals', city: 'Arizona', short_name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West' },
  { id: 'lar', name: 'Los Angeles Rams', city: 'Los Angeles', short_name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West' },
  { id: 'sf', name: 'San Francisco 49ers', city: 'San Francisco', short_name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West' },
  { id: 'sea', name: 'Seattle Seahawks', city: 'Seattle', short_name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West' },
];
