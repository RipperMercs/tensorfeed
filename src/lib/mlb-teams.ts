/**
 * Static mirror of the 30-team MLB catalog in worker/src/sports-mlb.ts.
 *
 * Same pattern as src/lib/nfl-teams.ts: duplicated rather than imported
 * because worker code targets the Cloudflare Workers runtime and the
 * frontend targets Next.js static export. Both copies edit together.
 */

export interface MLBTeam {
  id: string;
  name: string;
  city: string;
  short_name: string;
  abbreviation: string;
  league: 'AL' | 'NL';
  division: 'East' | 'Central' | 'West';
}

export const MLB_TEAMS: MLBTeam[] = [
  { id: 'bal', name: 'Baltimore Orioles', city: 'Baltimore', short_name: 'Orioles', abbreviation: 'BAL', league: 'AL', division: 'East' },
  { id: 'bos', name: 'Boston Red Sox', city: 'Boston', short_name: 'Red Sox', abbreviation: 'BOS', league: 'AL', division: 'East' },
  { id: 'nyy', name: 'New York Yankees', city: 'New York', short_name: 'Yankees', abbreviation: 'NYY', league: 'AL', division: 'East' },
  { id: 'tb', name: 'Tampa Bay Rays', city: 'Tampa Bay', short_name: 'Rays', abbreviation: 'TB', league: 'AL', division: 'East' },
  { id: 'tor', name: 'Toronto Blue Jays', city: 'Toronto', short_name: 'Blue Jays', abbreviation: 'TOR', league: 'AL', division: 'East' },
  { id: 'cws', name: 'Chicago White Sox', city: 'Chicago', short_name: 'White Sox', abbreviation: 'CWS', league: 'AL', division: 'Central' },
  { id: 'cle', name: 'Cleveland Guardians', city: 'Cleveland', short_name: 'Guardians', abbreviation: 'CLE', league: 'AL', division: 'Central' },
  { id: 'det', name: 'Detroit Tigers', city: 'Detroit', short_name: 'Tigers', abbreviation: 'DET', league: 'AL', division: 'Central' },
  { id: 'kc', name: 'Kansas City Royals', city: 'Kansas City', short_name: 'Royals', abbreviation: 'KC', league: 'AL', division: 'Central' },
  { id: 'min', name: 'Minnesota Twins', city: 'Minnesota', short_name: 'Twins', abbreviation: 'MIN', league: 'AL', division: 'Central' },
  { id: 'ath', name: 'Athletics', city: 'Sacramento', short_name: 'Athletics', abbreviation: 'ATH', league: 'AL', division: 'West' },
  { id: 'hou', name: 'Houston Astros', city: 'Houston', short_name: 'Astros', abbreviation: 'HOU', league: 'AL', division: 'West' },
  { id: 'laa', name: 'Los Angeles Angels', city: 'Los Angeles', short_name: 'Angels', abbreviation: 'LAA', league: 'AL', division: 'West' },
  { id: 'sea', name: 'Seattle Mariners', city: 'Seattle', short_name: 'Mariners', abbreviation: 'SEA', league: 'AL', division: 'West' },
  { id: 'tex', name: 'Texas Rangers', city: 'Texas', short_name: 'Rangers', abbreviation: 'TEX', league: 'AL', division: 'West' },
  { id: 'atl', name: 'Atlanta Braves', city: 'Atlanta', short_name: 'Braves', abbreviation: 'ATL', league: 'NL', division: 'East' },
  { id: 'mia', name: 'Miami Marlins', city: 'Miami', short_name: 'Marlins', abbreviation: 'MIA', league: 'NL', division: 'East' },
  { id: 'nym', name: 'New York Mets', city: 'New York', short_name: 'Mets', abbreviation: 'NYM', league: 'NL', division: 'East' },
  { id: 'phi', name: 'Philadelphia Phillies', city: 'Philadelphia', short_name: 'Phillies', abbreviation: 'PHI', league: 'NL', division: 'East' },
  { id: 'wsh', name: 'Washington Nationals', city: 'Washington', short_name: 'Nationals', abbreviation: 'WSH', league: 'NL', division: 'East' },
  { id: 'chc', name: 'Chicago Cubs', city: 'Chicago', short_name: 'Cubs', abbreviation: 'CHC', league: 'NL', division: 'Central' },
  { id: 'cin', name: 'Cincinnati Reds', city: 'Cincinnati', short_name: 'Reds', abbreviation: 'CIN', league: 'NL', division: 'Central' },
  { id: 'mil', name: 'Milwaukee Brewers', city: 'Milwaukee', short_name: 'Brewers', abbreviation: 'MIL', league: 'NL', division: 'Central' },
  { id: 'pit', name: 'Pittsburgh Pirates', city: 'Pittsburgh', short_name: 'Pirates', abbreviation: 'PIT', league: 'NL', division: 'Central' },
  { id: 'stl', name: 'St. Louis Cardinals', city: 'St. Louis', short_name: 'Cardinals', abbreviation: 'STL', league: 'NL', division: 'Central' },
  { id: 'ari', name: 'Arizona Diamondbacks', city: 'Arizona', short_name: 'Diamondbacks', abbreviation: 'ARI', league: 'NL', division: 'West' },
  { id: 'col', name: 'Colorado Rockies', city: 'Colorado', short_name: 'Rockies', abbreviation: 'COL', league: 'NL', division: 'West' },
  { id: 'lad', name: 'Los Angeles Dodgers', city: 'Los Angeles', short_name: 'Dodgers', abbreviation: 'LAD', league: 'NL', division: 'West' },
  { id: 'sd', name: 'San Diego Padres', city: 'San Diego', short_name: 'Padres', abbreviation: 'SD', league: 'NL', division: 'West' },
  { id: 'sf', name: 'San Francisco Giants', city: 'San Francisco', short_name: 'Giants', abbreviation: 'SF', league: 'NL', division: 'West' },
];
