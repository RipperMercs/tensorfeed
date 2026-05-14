#!/usr/bin/env node
/**
 * Weekly benchmarks-freshness check.
 *
 * Produces a Markdown report intended as the body of a weekly GitHub
 * issue. The issue prompts the operator to review whether
 * data/benchmarks.json needs an update.
 *
 * What goes in the report:
 *   1. Current state: lastUpdated field + model count + benchmark count
 *   2. Last 7 days of TF news matching model-release keywords (so the
 *      operator can scan for "did anything big drop?")
 *   3. Top 10 of HF Open LLM Leaderboard (so the operator can spot
 *      ranking shifts vs the static file)
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/weekly-benchmarks-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 7
 *   NEWS_LIMIT        defaults to 200 (max articles to scan)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 7);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 200);

// Keyword set tuned for flagship LLM/multimodal release announcements.
// Intentionally broad: better to surface a borderline article and have
// the operator decide than to filter it out and miss a real release.
const RELEASE_KEYWORDS = [
  'released', 'launches', 'launched', 'launch of',
  'introduces', 'introducing', 'announces', 'announced',
  'unveils', 'unveiled', 'debut', 'debuts',
  // model families
  'GPT-', 'Claude ', 'Gemini', 'Llama', 'Mistral', 'DeepSeek',
  'Qwen', 'Grok', 'Sonnet', 'Opus', 'Haiku', 'Phi-', 'Command R',
  'Pixtral', 'Reka', 'Nemotron', 'Yi-',
];

function buildReleaseRegex() {
  // Match if any keyword appears in title or description (case-insensitive).
  const escaped = RELEASE_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-weekly-benchmarks-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function loadBenchmarksFile() {
  const p = path.join(REPO_ROOT, 'data', 'benchmarks.json');
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

async function loadHfLeaderboardTop10() {
  try {
    const data = await fetchJson(`${BASE}/api/hf-leaderboard/latest`);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    return { entries: entries.slice(0, 10), capturedAt: data?.capturedAt ?? null };
  } catch (e) {
    return { error: e.message, entries: [] };
  }
}

function fmt(s) {
  return (s ?? '').toString().replace(/\|/g, '\\|');
}

function modelDisplay(e) {
  // /api/hf-leaderboard/latest entries: { rank, model_id, params_b,
  // average, scores: { ifeval, bbh, math_lvl_5, gpqa, musr, mmlu_pro } }
  const name = e.model_id || e.model || e.name || '(no name)';
  const score = e.average ?? e.score ?? null;
  const params = e.params_b ? ` · ${Number(e.params_b).toFixed(0)}B` : '';
  return score !== null
    ? `${name} (avg ${Number(score).toFixed(2)}${params})`
    : `${name}${params}`;
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
  const benchmarks = await loadBenchmarksFile();
  const lastUpdated = benchmarks.lastUpdated ?? 'unknown';
  const modelCount = (benchmarks.models ?? []).length;
  const benchmarkCount = (benchmarks.benchmarks ?? []).length;
  const staleDays = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;
  const recentReleases = (benchmarks.models ?? []).filter((m) => {
    if (!m.released) return false;
    const d = new Date(`${m.released}-01`);
    return Date.now() - d.getTime() < 60 * 86_400_000;
  });

  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const { entries: hfTop, capturedAt: hfCaptured, error: hfError } = await loadHfLeaderboardTop10();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Weekly benchmark review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/weekly-benchmarks-check.mjs`. Triage and either:');
  lines.push('- Update `data/benchmarks.json` if a new flagship model dropped this week, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `data/benchmarks.json`');
  lines.push(`- **lastUpdated:** \`${lastUpdated}\`${staleDays !== null ? ` (${staleDays} days ago)` : ''}`);
  lines.push(`- **Models tracked:** ${modelCount}`);
  lines.push(`- **Benchmarks tracked:** ${benchmarkCount}`);
  lines.push(`- **Models released within last 60 days:** ${recentReleases.length}`);
  if (recentReleases.length) {
    lines.push('');
    for (const m of recentReleases.slice(0, 8)) {
      lines.push(`  - ${m.released} | ${m.provider} | ${m.model}`);
    }
  }
  lines.push('');
  lines.push(`## Model-release-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> ⚠️ Could not fetch news: ${newsError}`);
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
  lines.push('## HF Open LLM Leaderboard top 10');
  if (hfError) {
    lines.push(`> ⚠️ Could not fetch HF leaderboard: ${hfError}`);
  } else if (hfTop.length === 0) {
    lines.push('> No entries returned. The leaderboard endpoint may not have been captured yet today.');
  } else {
    if (hfCaptured) lines.push(`Captured: \`${hfCaptured}\``);
    lines.push('');
    lines.push('| Rank | Model |');
    lines.push('|---|---|');
    hfTop.forEach((e) => {
      lines.push(`| ${e.rank ?? '?'} | ${fmt(modelDisplay(e))} |`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### What "needs update" usually means');
  lines.push('1. A flagship from Anthropic / OpenAI / Google / Meta / Mistral / DeepSeek / xAI launched this week → add a row to `data/benchmarks.json`.');
  lines.push('2. A tracked model has materially-shifted benchmark scores (re-running, methodology change) → update the row.');
  lines.push('3. A new benchmark itself (e.g. a successor to MMLU-Pro) is becoming canonical → add it.');
  lines.push('');
  lines.push('### What it usually does NOT mean');
  lines.push('- Research papers about benchmarks (those land on /research, not /benchmarks).');
  lines.push('- HN opinion threads about a model.');
  lines.push('- Pricing-only changes (those go in `data/pricing.json`).');
  lines.push('');
  lines.push('Bump `lastUpdated` in `data/benchmarks.json` whenever you change anything else in the file.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('weekly-benchmarks-check failed:', err);
  process.exit(1);
});
