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
 * Minimum number of entries the Majestic map must have before we allow a KV write.
 * The top-100k source should always yield close to 100k entries; fewer than this
 * means the fetch was truncated or returned an error page, and writing it would
 * overwrite good production data with a near-empty blob.
 */
const MAJESTIC_MIN_ENTRIES = 50000;

/**
 * Minimum number of entries the phishing list must have before we allow a KV write.
 * The active list is hundreds of thousands of entries; fewer than this means the
 * fetch returned a 404, a rate-limit page, or a truncated body, and writing it
 * would silently disable the phishing hard-block.
 */
const PHISHING_MIN_ENTRIES = 1000;

/**
 * Guard that prevents overwriting production KV with a truncated or errored
 * Majestic response. Returns the map unchanged when it is large enough.
 *
 * @param {Record<string, number>} ranksObj
 * @returns {Record<string, number>}
 */
export function assertMajesticSane(ranksObj) {
  const count = Object.keys(ranksObj).length;
  if (count < MAJESTIC_MIN_ENTRIES) {
    throw new Error(
      `Majestic map has only ${count} entries (minimum ${MAJESTIC_MIN_ENTRIES}). Refusing KV write to avoid overwriting good data.`,
    );
  }
  return ranksObj;
}

/**
 * Guard that prevents overwriting production KV with a truncated or errored
 * phishing-list response. Returns the array unchanged when it is large enough.
 *
 * @param {string[]} domainsArr
 * @returns {string[]}
 */
export function assertPhishingSane(domainsArr) {
  if (domainsArr.length < PHISHING_MIN_ENTRIES) {
    throw new Error(
      `Phishing list has only ${domainsArr.length} entries (minimum ${PHISHING_MIN_ENTRIES}). Refusing KV write to avoid overwriting good data.`,
    );
  }
  return domainsArr;
}

/**
 * Parse a Majestic Million CSV and return the top N domains keyed to their GlobalRank.
 * Column order: GlobalRank, TldRank, Domain, TLD (header row always present).
 * Domains are lowercased and stripped of a leading "www." to match the Worker's
 * normalizeDomain lookup. Stops at exactly N entries.
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
    let domain = cols[2].trim().toLowerCase();
    if (domain.startsWith('www.')) domain = domain.slice(4);
    if (domain && Number.isFinite(rank)) out[domain] = rank;
  }
  return out;
}

/**
 * Parse the Phishing.Database active-domains list.
 * Each line is one domain. Trims whitespace, lowercases, strips a leading "www."
 * to match the Worker's normalizeDomain lookup, and drops blank lines.
 *
 * @param {string} text - raw file text
 * @returns {string[]} array of lowercase domain strings
 */
export function parsePhishingActive(text) {
  return text
    .split('\n')
    .map((l) => {
      let d = l.trim().toLowerCase();
      if (d.startsWith('www.')) d = d.slice(4);
      return d;
    })
    .filter(Boolean);
}

async function main() {
  const nowIso = new Date().toISOString();

  const [majRes, phishRes] = await Promise.all([
    fetch('https://downloads.majestic.com/majestic_million.csv'),
    fetch(
      'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
    ),
  ]);

  if (!majRes.ok) {
    throw new Error(`Majestic fetch failed: HTTP ${majRes.status} ${majRes.statusText}`);
  }
  if (!phishRes.ok) {
    throw new Error(`Phishing.Database fetch failed: HTTP ${phishRes.status} ${phishRes.statusText}`);
  }

  const [majCsv, phishTxt] = await Promise.all([majRes.text(), phishRes.text()]);

  const majesticRanks = assertMajesticSane(buildMajesticTopN(majCsv, 100000));
  const phishingDomains = assertPhishingSane(parsePhishingActive(phishTxt));

  const majesticBlob = JSON.stringify({ captured_at: nowIso, ranks: majesticRanks });
  const phishingBlob = JSON.stringify({ captured_at: nowIso, domains: phishingDomains });

  const { writeFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');

  const tmpDir = os.tmpdir();
  const majesticPath = path.join(tmpDir, 'merchant-majestic.json');
  const phishingPath = path.join(tmpDir, 'merchant-phishing.json');

  writeFileSync(majesticPath, majesticBlob);
  writeFileSync(phishingPath, phishingBlob);

  function kvPut(key, filePath) {
    // wrangler writes to the production KV namespace by default when given a binding.
    // Do not add a remote flag; it is not a valid argument for kv key put in wrangler 3.x.
    const result = spawnSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', key, '--path', filePath, '--binding', 'TENSORFEED_CACHE'],
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
