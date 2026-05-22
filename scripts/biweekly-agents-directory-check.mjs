#!/usr/bin/env node
/**
 * Biweekly agents-directory freshness check.
 *
 * Produces a Markdown report intended as the body of a biweekly GitHub
 * issue. The issue prompts the operator to review whether
 * data/agents-directory.json needs new agent products, deprecations,
 * or recategorization.
 *
 * What goes in the report:
 *   1. Current state: lastUpdated, category count, agent count, per-category breakdown
 *   2. Recently-added entries (so operator sees what is current)
 *   3. GitHub agent opportunities surfaced by /api/agents/opportunities
 *      (the same daily-crawled list driving recurring discovery)
 *   4. Last 14 days of TF news matching agent-product keywords
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/biweekly-agents-directory-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 14
 *   NEWS_LIMIT        defaults to 250
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 14);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 250);

const AGENT_KEYWORDS = [
  'agent', 'agentic', 'MCP server', 'tool use', 'autonomous',
  'Claude Code', 'Cursor', 'Codex', 'Cline', 'Aider',
  'Devin', 'Replit Agent', 'Manus', 'OpenDevin',
  'browser agent', 'computer use', 'GUI agent',
  'voice agent', 'research agent',
];

function buildAgentRegex() {
  const escaped = AGENT_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-biweekly-agents-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function loadDirectoryFile() {
  const p = path.join(REPO_ROOT, 'data', 'agents-directory.json');
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
  const re = buildAgentRegex();
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

async function loadOpportunities() {
  try {
    const data = await fetchJson(`${BASE}/api/agents/opportunities`);
    const list = Array.isArray(data?.opportunities) ? data.opportunities
      : Array.isArray(data?.results) ? data.results
      : Array.isArray(data) ? data
      : [];
    return { list };
  } catch (e) {
    return { error: e.message, list: [] };
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
  const directory = await loadDirectoryFile();
  const lastUpdated = directory.lastUpdated ?? 'unknown';
  const staleDays = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;
  const categories = directory.categories ?? [];

  // Agents can live in directory.agents[] or be nested under each category.
  // Handle both shapes.
  const allAgents = [];
  if (Array.isArray(directory.agents)) {
    for (const a of directory.agents) allAgents.push(a);
  }
  for (const c of categories) {
    if (Array.isArray(c.agents)) {
      for (const a of c.agents) allAgents.push({ ...a, category: a.category ?? c.id });
    }
  }

  const byCategory = tally(allAgents, 'category');

  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const { list: opportunities, error: oppsError } = await loadOpportunities();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Biweekly agents-directory review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/biweekly-agents-directory-check.mjs`. Triage and either:');
  lines.push('- Update `data/agents-directory.json` if a notable new agent product launched, an existing one was deprecated, or categories drifted, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `data/agents-directory.json`');
  lines.push(`- **lastUpdated:** \`${lastUpdated}\`${staleDays !== null ? ` (${staleDays} days ago)` : ''}`);
  lines.push(`- **Categories:** ${categories.length}`);
  lines.push(`- **Total agents:** ${allAgents.length}`);
  if (byCategory.length) {
    lines.push('');
    lines.push('**Per category:**');
    for (const [cat, n] of byCategory) {
      lines.push(`- ${cat}: ${n}`);
    }
  }
  lines.push('');
  lines.push('## GitHub agent opportunities (top 10 from `/api/agents/opportunities`)');
  if (oppsError) {
    lines.push(`> Could not fetch opportunities: ${oppsError}`);
  } else if (opportunities.length === 0) {
    lines.push('> Endpoint returned zero rows. Check the daily 13:30 UTC cron logs.');
  } else {
    lines.push('Surfaced by the existing daily discovery crawl. Items here are repos worth considering for a directory entry or partner mention.');
    lines.push('');
    lines.push('| Repo | Stars | Updated |');
    lines.push('|---|---|---|');
    for (const o of opportunities.slice(0, 10)) {
      const name = o.full_name || o.name || o.repo || o.url || '(unknown)';
      const stars = o.stars ?? o.stargazers_count ?? '?';
      const upd = (o.updated_at ?? o.pushed_at ?? '').slice(0, 10);
      lines.push(`| ${fmt(name)} | ${stars} | ${upd} |`);
    }
  }
  lines.push('');
  lines.push(`## Agent-product news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the agent-keyword filter. Likely nothing new launched in this window.');
  } else {
    lines.push(`Matched **${newsMatches.length}** articles. Scan for actual product launches; many will be commentary.`);
    lines.push('');
    lines.push('| Date | Source | Title |');
    lines.push('|---|---|---|');
    for (const a of newsMatches.slice(0, 25)) {
      const date = (a.publishedAt ?? '').slice(0, 10);
      lines.push(`| ${date} | ${fmt(a.source)} | ${fmt(a.title)} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### What "needs update" usually means');
  lines.push('1. A notable agent product launched (mainstream coverage, not just GitHub stars). Add an entry to the right category.');
  lines.push('2. A tracked agent was deprecated, renamed, or sunset. Remove or update the entry.');
  lines.push('3. Category taxonomy needs adjustment (a category got too crowded or a new one is warranted).');
  lines.push('4. A tracked agent\'s URL, pricing, or capabilities materially changed.');
  lines.push('');
  lines.push('### What it usually does NOT mean');
  lines.push('- Every new MCP server on GitHub. Directory is curated, not exhaustive.');
  lines.push('- Wrappers and ports of existing agents (only the canonical entry belongs).');
  lines.push('- Concept-stage or vaporware launches.');
  lines.push('');
  lines.push('After editing, bump `lastUpdated` in `data/agents-directory.json` and bump `last_reviewed` for `/agents` in `data/page-freshness.json`.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('biweekly-agents-directory-check failed:', err);
  process.exit(1);
});
