#!/usr/bin/env node
/**
 * Weekly AI infrastructure freshness check.
 *
 * Produces a Markdown report intended as the body of a weekly GitHub
 * issue. The issue prompts the operator to review whether
 * data/ai-infrastructure-projects.json needs new entries or status
 * updates on existing entries.
 *
 * What goes in the report:
 *   1. Current state: project count, status breakdown, OVERDUE flag if
 *      page-freshness.json says the page is past due
 *   2. Last 7 days of TF news matching AI-infrastructure keywords
 *      (data center, gigawatt, nuclear PPA, SMR, Hyperion, Stargate, etc)
 *   3. A reminder of what kinds of things justify a new project entry
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/weekly-ai-infrastructure-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 7
 *   NEWS_LIMIT        defaults to 250 (max articles to scan)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 7);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 250);

// Keywords tuned for AI infrastructure announcements: campuses, power
// deals, nuclear, hyperscaler buildouts, dedicated AI compute fleets,
// and the orbital long-tail.
const INFRA_KEYWORDS = [
  // Buildout shape
  'data center', 'data centre', 'data centers', 'hyperscaler',
  'campus', 'buildout', 'megawatt', 'gigawatt',
  // Units inline (case-insensitive; surrounded by digits in real copy)
  ' MW ', ' GW ',
  // Named project keywords
  'Stargate', 'Hyperion', 'Prometheus', 'Colossus', 'Suncatcher',
  // Operators and AI-compute providers
  'CoreWeave', 'Lambda Labs', 'IREN', 'Iris Energy', 'Hut 8',
  'Crusoe', 'Nebius', 'Applied Digital', 'TeraWulf', 'Vantage',
  // Power and nuclear
  'nuclear', 'reactor', 'SMR ', 'small modular reactor',
  'Three Mile Island', 'Susquehanna', 'Constellation Energy',
  'Talen Energy', 'Kairos Power', 'X-energy', 'NuScale', 'TerraPower',
  'PPA', 'power purchase agreement', 'transformer',
  // Regulators
  'FERC', 'NRC', 'PJM', 'ERCOT', 'interconnection',
  // Orbital
  'orbital data center', 'space data center', 'Starcloud',
];

function buildInfraRegex() {
  const escaped = INFRA_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-weekly-ai-infra-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function loadProjectsFile() {
  const p = path.join(REPO_ROOT, 'data', 'ai-infrastructure-projects.json');
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
}

async function loadFreshnessFile() {
  const p = path.join(REPO_ROOT, 'data', 'page-freshness.json');
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
}

function daysAgo(d) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / 86_400_000);
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

async function findRelevantNews() {
  const cutoffMs = Date.now() - LOOKBACK_DAYS * 86_400_000;
  let articles = [];
  try {
    const data = await fetchJson(`${BASE}/api/agents/news?limit=${NEWS_LIMIT}`);
    articles = Array.isArray(data?.articles) ? data.articles : [];
  } catch (e) {
    return { error: e.message, matches: [] };
  }
  const re = buildInfraRegex();
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

async function main() {
  const projectsFile = await loadProjectsFile();
  const projects = projectsFile.projects ?? [];
  const statusBreakdown = tally(projects, 'status');
  const totalAnnouncedMW = projects.reduce((acc, p) => acc + (p.capacity_mw_announced ?? 0), 0);

  const freshness = await loadFreshnessFile();
  const entry = freshness.pages?.['/ai-infrastructure'];
  const lastReviewed = entry?.last_reviewed ?? 'unknown';
  const cadence = entry?.cadence ?? 'unknown';
  let overdue = false;
  let daysSinceReview = null;
  if (lastReviewed !== 'unknown') {
    daysSinceReview = daysAgo(lastReviewed);
    const cadenceDays = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }[cadence] ?? null;
    if (cadenceDays !== null && daysSinceReview > cadenceDays) overdue = true;
  }

  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Weekly AI infrastructure review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/weekly-ai-infrastructure-check.mjs`. Triage and either:');
  lines.push('- Add or update entries in `data/ai-infrastructure-projects.json` (and mirror to `public/api/ai-infrastructure/projects.json`), bump `last_reviewed` in `data/page-freshness.json`, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of the registry');
  lines.push(`- **Last reviewed:** \`${lastReviewed}\`${daysSinceReview !== null ? ` (${daysSinceReview} days ago)` : ''}${overdue ? ' ⚠️ OVERDUE' : ''}`);
  lines.push(`- **Cadence:** ${cadence}`);
  lines.push(`- **Projects tracked:** ${projects.length}`);
  if (statusBreakdown.length) {
    lines.push(`- **By status:** ${statusBreakdown.map(([s, n]) => `${s} (${n})`).join(', ')}`);
  }
  lines.push(`- **Announced capacity total:** ${(totalAnnouncedMW / 1000).toFixed(1)} GW`);
  lines.push('');
  lines.push(`## AI-infrastructure-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> ⚠️ Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the infrastructure-keyword filter. **Soft signal that nothing major dropped this week.**');
  } else {
    lines.push(`Matched **${newsMatches.length}** articles (keyword scan; many will be tangential).`);
    lines.push('');
    lines.push('| Date | Source | Title |');
    lines.push('|---|---|---|');
    for (const a of newsMatches.slice(0, 30)) {
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
  lines.push('### What justifies a new entry');
  lines.push('1. A gigawatt-class campus is announced, permitted, or breaks ground.');
  lines.push('2. A nuclear PPA or restart deal lands between a hyperscaler and an operator.');
  lines.push('3. An AI-specialized compute operator (CoreWeave / Lambda / IREN / Hut 8 / Crusoe class) ships a materially larger fleet or PPA.');
  lines.push('4. An existing tracked project changes status (announced to permitted to construction to operational).');
  lines.push('5. A regulatory event materially reshapes the buildout (FERC ruling on grid bypass, NRC license decision, big court ruling).');
  lines.push('');
  lines.push('### What does NOT justify a new entry');
  lines.push('- Generic data center announcements not tied to AI workloads.');
  lines.push('- Speculative reporting without operator or partner attribution.');
  lines.push('- A < 100 MW deployment from a non-flagship operator.');
  lines.push('- Routine quarterly capex disclosures without a specific named project.');
  lines.push('');
  lines.push('When you update the registry, bump `last_reviewed` in `data/page-freshness.json` so the visible footer stamp moves forward and the OVERDUE flag clears.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('weekly-ai-infrastructure-check failed:', err);
  process.exit(1);
});
