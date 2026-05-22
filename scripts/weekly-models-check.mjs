#!/usr/bin/env node
/**
 * Weekly models-freshness check.
 *
 * Produces a Markdown report intended as the body of a weekly GitHub
 * issue. The issue prompts the operator to review whether
 * data/pricing.json needs an update for newly-released models,
 * deprecated models, or pricing changes.
 *
 * What goes in the report:
 *   1. Current state: lastUpdated, provider count, model count, flagship count
 *   2. Recently-released models already tracked (so operator sees what is current)
 *   3. Last 7 days of TF news matching model-release keywords
 *   4. Provider list with model counts (so operator can spot gaps)
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/weekly-models-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 7
 *   NEWS_LIMIT        defaults to 200
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 7);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 200);

const RELEASE_KEYWORDS = [
  'released', 'launches', 'launched', 'launch of',
  'introduces', 'introducing', 'announces', 'announced',
  'unveils', 'unveiled', 'debut', 'debuts',
  'deprecat', 'sunset', 'shutting down', 'shut down',
  'price cut', 'price drop', 'pricing update',
  // model families
  'GPT-', 'Claude ', 'Gemini', 'Llama', 'Mistral', 'DeepSeek',
  'Qwen', 'Grok', 'Sonnet', 'Opus', 'Haiku', 'Phi-', 'Command R',
  'Pixtral', 'Reka', 'Nemotron', 'Yi-', 'o1', 'o3', 'o4',
];

function buildReleaseRegex() {
  const escaped = RELEASE_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-weekly-models-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function loadPricingFile() {
  const p = path.join(REPO_ROOT, 'data', 'pricing.json');
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
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
  const re = buildReleaseRegex();
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

function fmt(s) {
  return (s ?? '').toString().replace(/\|/g, '\\|');
}

function flattenModels(pricing) {
  const out = [];
  for (const provider of pricing.providers ?? []) {
    for (const model of provider.models ?? []) {
      out.push({ ...model, provider: provider.name });
    }
  }
  return out;
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
  const pricing = await loadPricingFile();
  const lastUpdated = pricing.lastUpdated ?? 'unknown';
  const allModels = flattenModels(pricing);
  const providerCount = (pricing.providers ?? []).length;
  const flagshipCount = allModels.filter((m) => m.tier === 'flagship').length;
  const staleDays = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;

  // Recently-released = released within last 90 days.
  const recentlyReleased = allModels.filter((m) => {
    if (!m.released) return false;
    const d = new Date(`${m.released}-01`);
    return Date.now() - d.getTime() < 90 * 86_400_000;
  });

  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Weekly models review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/weekly-models-check.mjs`. Triage and either:');
  lines.push('- Update `data/pricing.json` if a new flagship dropped, a model was deprecated, or pricing changed, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `data/pricing.json`');
  lines.push(`- **lastUpdated:** \`${lastUpdated}\`${staleDays !== null ? ` (${staleDays} days ago)` : ''}`);
  lines.push(`- **Providers tracked:** ${providerCount}`);
  lines.push(`- **Total models:** ${allModels.length}`);
  lines.push(`- **Flagship models:** ${flagshipCount}`);
  lines.push(`- **Models released within last 90 days:** ${recentlyReleased.length}`);
  if (recentlyReleased.length) {
    lines.push('');
    for (const m of recentlyReleased.slice(0, 10)) {
      const price = m.inputPrice != null ? `$${m.inputPrice}/$${m.outputPrice}` : 'price n/a';
      lines.push(`  - ${m.released} | ${m.provider} | ${m.name} | ${price} | ${m.tier ?? '?'}`);
    }
  }
  lines.push('');
  lines.push(`## Model-release-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the release-keyword filter. **Strong signal nothing flagship dropped this week.**');
  } else {
    lines.push(`Matched **${newsMatches.length}** articles (keyword scan; not all will be real releases).`);
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
  lines.push('## Provider model counts');
  lines.push('');
  lines.push('| Provider | Model count |');
  lines.push('|---|---|');
  for (const p of pricing.providers ?? []) {
    lines.push(`| ${fmt(p.name)} | ${(p.models ?? []).length} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### What "needs update" usually means');
  lines.push('1. A new flagship model shipped from a tracked provider. Add it to that provider\'s `models[]`.');
  lines.push('2. A tracked model was deprecated or sunset. Either remove the entry or mark its tier appropriately.');
  lines.push('3. A provider changed pricing for a tracked model. Update `inputPrice` / `outputPrice`.');
  lines.push('4. A new provider has become noteworthy enough to add. Add a new `providers[]` entry.');
  lines.push('');
  lines.push('### What it usually does NOT mean');
  lines.push('- Research papers about models (those land on /research).');
  lines.push('- Beta or preview models that are not generally available.');
  lines.push('- Open-source model fine-tunes (those belong in `/best-open-source-llms` if anywhere).');
  lines.push('');
  lines.push('Bump `lastUpdated` in `data/pricing.json` whenever you change anything else in the file. Also bump `last_reviewed` for `/models` in `data/page-freshness.json`.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('weekly-models-check failed:', err);
  process.exit(1);
});
