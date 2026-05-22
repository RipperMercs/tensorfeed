#!/usr/bin/env node
/**
 * Weekly AI hardware freshness check.
 *
 * Produces a Markdown report intended as the body of a weekly GitHub
 * issue. The issue prompts the operator to review whether the chip
 * catalog in worker/src/ai-hardware.ts needs an update for newly-
 * shipped datacenter accelerators or spec corrections.
 *
 * What goes in the report:
 *   1. Current state from /api/ai-hardware: lastUpdated, chip count,
 *      count by manufacturer
 *   2. Recently-released chips (last 18 months) so operator can see
 *      what is current
 *   3. Last 7 days of TF news matching chip-launch keywords
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/weekly-ai-hardware-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 7
 *   NEWS_LIMIT        defaults to 200
 */

const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 7);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 200);

// Chip-launch and accelerator keywords. Broader than model-release set:
// includes chip family names and manufacturer signals likely to surface
// any datacenter accelerator news.
const CHIP_KEYWORDS = [
  'released', 'launches', 'launched', 'unveils', 'unveiled', 'announces', 'announced',
  'ships', 'shipping', 'tape out', 'tape-out',
  // NVIDIA
  'Blackwell', 'Hopper', 'Ada Lovelace', 'GB200', 'GB300', 'H100', 'H200', 'B100', 'B200',
  // AMD
  'Instinct', 'MI300', 'MI325', 'MI350', 'MI400', 'CDNA',
  // Google / cloud silicon
  'TPU v', 'Trillium', 'Trainium', 'Inferentia',
  // Apple
  'M3 Ultra', 'M4 Ultra', 'M5', 'Apple Silicon',
  // Specialty
  'Cerebras', 'WSE-', 'Groq', 'LPU', 'Tenstorrent', 'SambaNova', 'Etched', 'Sohu', 'Rivos',
];

function buildChipRegex() {
  const escaped = CHIP_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-weekly-ai-hardware-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function daysAgo(d) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / 86_400_000);
}

async function findRelevantNews() {
  const cutoffMs = Date.now() - LOOKBACK_DAYS * 86_400_000;
  let articles = [];
  try {
    const data = await fetchJson(`${BASE}/api/agents/news?limit=${NEWS_LIMIT}`);
    articles = Array.isArray(data?.articles) ? data.articles : [];
  } catch (e) {
    return { error: e.message, matches: [] };
  }
  const re = buildChipRegex();
  const matches = articles
    .filter((a) => {
      const ts = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      if (!ts || ts < cutoffMs) return false;
      const haystack = `${a.title ?? ''} ${a.snippet ?? ''} ${a.description ?? ''}`;
      return re.test(haystack);
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { matches };
}

async function loadHardwareCatalog() {
  try {
    return await fetchJson(`${BASE}/api/ai-hardware`);
  } catch (e) {
    return { error: e.message, hardware: [], lastUpdated: null };
  }
}

function fmt(s) {
  return (s ?? '').toString().replace(/\|/g, '\\|');
}

function tally(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = it[key];
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const catalog = await loadHardwareCatalog();
  const hardware = Array.isArray(catalog.hardware) ? catalog.hardware : [];
  const lastUpdated = catalog.lastUpdated ?? 'unknown';
  const staleDays = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;
  const byMfr = tally(hardware, 'manufacturer');

  // Recently-released = released within the current or previous calendar year.
  const currentYear = new Date().getUTCFullYear();
  const recentlyReleased = hardware
    .filter((h) => {
      const y = Number(h.released);
      return Number.isFinite(y) && y >= currentYear - 1;
    })
    .sort((a, b) => Number(b.released) - Number(a.released));

  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Weekly AI hardware review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/weekly-ai-hardware-check.mjs`. Triage and either:');
  lines.push('- Update `worker/src/ai-hardware.ts` if a new datacenter chip shipped, redeploy the worker, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `/api/ai-hardware`');
  if (catalog.error) {
    lines.push(`> Could not fetch catalog: ${catalog.error}`);
  } else {
    lines.push(`- **lastUpdated:** \`${lastUpdated}\`${staleDays !== null ? ` (${staleDays} days ago)` : ''}`);
    lines.push(`- **Total chips tracked:** ${hardware.length}`);
    lines.push(`- **Released within last 2 calendar years (${currentYear - 1} or ${currentYear}):** ${recentlyReleased.length}`);
    lines.push('');
    lines.push('**By manufacturer:**');
    for (const [mfr, n] of byMfr) {
      lines.push(`- ${mfr}: ${n}`);
    }
    if (recentlyReleased.length) {
      lines.push('');
      lines.push('**Recent chips:**');
      lines.push('');
      lines.push('| Year | Mfr | Name | VRAM | FP16 TFLOPS |');
      lines.push('|---|---|---|---|---|');
      for (const h of recentlyReleased.slice(0, 12)) {
        lines.push(`| ${h.released} | ${fmt(h.manufacturer)} | ${fmt(h.name)} | ${h.memoryGB ?? '?'} GB | ${h.fp16TFLOPS?.toLocaleString() ?? '?'} |`);
      }
    }
  }
  lines.push('');
  lines.push(`## Chip-launch-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the chip-keyword filter. **Strong signal nothing material shipped this week.**');
  } else {
    lines.push(`Matched **${newsMatches.length}** articles (keyword scan; many will be coverage of already-tracked chips).`);
    lines.push('');
    lines.push('| Date | Source | Title |');
    lines.push('|---|---|---|');
    for (const a of newsMatches.slice(0, 25)) {
      const date = (a.publishedAt ?? '').slice(0, 10);
      lines.push(`| ${date} | ${fmt(a.source)} | ${fmt(a.title)} |`);
    }
    lines.push('');
    const sourceTally = tally(newsMatches, 'source');
    if (sourceTally.length) {
      lines.push('**Sources:** ' + sourceTally.map(([s, n]) => `${s} (${n})`).join(', '));
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### What "needs update" usually means');
  lines.push('1. A new datacenter chip shipped or was officially announced with public specs. Add an entry to `AI_HARDWARE_CATALOG`.');
  lines.push('2. A tracked chip got corrected specs (sparsity adjustments, TDP errata, real-world memory bandwidth). Update the row.');
  lines.push('3. List price changed materially. Update `listPriceUSD`.');
  lines.push('4. Bump `AI_HARDWARE_LAST_UPDATED` to today.');
  lines.push('');
  lines.push('### What it usually does NOT mean');
  lines.push('- Roadmap rumors or unofficial leaks (wait for vendor confirmation).');
  lines.push('- Consumer GPUs (gaming RTX 5080/5090 etc) - those belong in `/gear` when that ships.');
  lines.push('- Cloud GPU rental price changes (those go in `/gpu-pricing`).');
  lines.push('- Specialty inference chips without published TFLOPS/VRAM specs (catalog requires real numbers).');
  lines.push('');
  lines.push('After editing, redeploy the worker (`cd worker && wrangler deploy`) and bump `last_reviewed` for `/ai-hardware` in `data/page-freshness.json`.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('weekly-ai-hardware-check failed:', err);
  process.exit(1);
});
