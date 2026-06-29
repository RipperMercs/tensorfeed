/**
 * Daily merchant-list refresh script.
 *
 * Fetches two public bulk datasets and writes them into TENSORFEED_CACHE KV:
 *   merchant:majestic-topn   - top 100k domains by Majestic Million rank (CC-BY-3.0)
 *   merchant:phishing-active - active phishing domains from Phishing.Database (MIT)
 *
 * Pure helper functions are exported for unit testing. The main() function
 * fetches live data and calls wrangler to write to remote KV. Do NOT invoke
 * main() during testing.
 *
 * Sources:
 *   https://downloads.majestic.com/majestic_million.csv (CC-BY-3.0, Majestic)
 *   https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt (MIT)
 */

import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const WORKER_DIR = path.join(REPO_ROOT, 'worker');

/**
 * Parse a Majestic Million CSV and return the top N domains keyed to their GlobalRank.
 * Column order: GlobalRank, TldRank, Domain, TLD (header row always present).
 * Domains are lowercased. Stops at exactly N entries.
 *
 * @param {string} csvText - raw CSV text including header
 * @param {number} n - how many top-ranked domains to include
 * @returns {Record<string, number>} domain -> GlobalRank
 */
export function buildMajesticTopN(csvText, n) {
  const out = {};
  const lines = csvText.split('\n');
  for (let i = 1; i < lines.length && Object.keys(out).length < n; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const rank = Number(cols[0]);
    const domain = cols[2].trim().toLowerCase();
    if (domain && Number.isFinite(rank)) out[domain] = rank;
  }
  return out;
}

/**
 * Parse the Phishing.Database active-domains list.
 * Each line is one domain. Trims whitespace, lowercases, drops blank lines.
 *
 * @param {string} text - raw file text
 * @returns {string[]} array of lowercase domain strings
 */
export function parsePhishingActive(text) {
  return text.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean);
}

async function main() {
  const nowIso = new Date().toISOString();

  const [majCsv, phishTxt] = await Promise.all([
    fetch('https://downloads.majestic.com/majestic_million.csv').then((r) => r.text()),
    fetch(
      'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
    ).then((r) => r.text()),
  ]);

  const majesticBlob = JSON.stringify({ captured_at: nowIso, ranks: buildMajesticTopN(majCsv, 100000) });
  const phishingBlob = JSON.stringify({ captured_at: nowIso, domains: parsePhishingActive(phishTxt) });

  const { writeFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');

  const tmpDir = os.tmpdir();
  const majesticPath = path.join(tmpDir, 'merchant-majestic.json');
  const phishingPath = path.join(tmpDir, 'merchant-phishing.json');

  writeFileSync(majesticPath, majesticBlob);
  writeFileSync(phishingPath, phishingBlob);

  function kvPut(key, filePath) {
    const result = spawnSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', key, '--path', filePath, '--binding', 'TENSORFEED_CACHE', '--remote'],
      { cwd: WORKER_DIR, stdio: 'inherit' },
    );
    if (result.status !== 0) {
      throw new Error(`wrangler kv put failed for key "${key}" (exit ${result.status})`);
    }
  }

  kvPut('merchant:majestic-topn', majesticPath);
  kvPut('merchant:phishing-active', phishingPath);

  console.log(`refreshed merchant lists at ${nowIso}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
