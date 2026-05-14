#!/usr/bin/env node
/**
 * Weekly funding portfolio freshness check.
 *
 * Produces a Markdown report intended as the body of a weekly GitHub
 * issue. Prompts the operator to review whether the /api/funding/portfolio
 * registry needs new corporate equity stakes, compute commitments, or
 * capacity partnerships added.
 *
 * What goes in the report:
 *   1. Current state pulled from /api/funding/portfolio (commitment
 *      count, total $, silicon-dependency breakdown)
 *   2. Last 7 days of TF news matching funding / capital / compute-
 *      commitment keywords (equity stake, raises, billion-dollar
 *      compute commitment, Series A through E, TPU commit, etc)
 *   3. A reminder of what kinds of deals justify a new entry
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/weekly-funding-portfolio-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 7
 *   NEWS_LIMIT        defaults to 250
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 7);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 250);

const FUNDING_KEYWORDS = [
  // Deal types
  'equity stake', 'equity investment', 'invests in', 'invested in',
  'compute commitment', 'compute deal', 'capacity agreement',
  'PPA', 'power purchase',
  'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F',
  'seed round', 'pre-seed', 'growth round',
  'valuation', 'raises', 'raised',
  'IPO', 'going public', 'secondary',
  'acquires', 'acquired', 'acquisition',
  // Capital amounts (loose)
  ' billion', '$1B', '$5B', '$10B', '$20B', '$30B', '$40B', '$50B', '$100B', '$200B', '$500B',
  // Customer-investor loop names
  'TPU commit', 'Trainium commit', 'MI400 commit', 'Maia commit',
  'Nvidia stake', 'Nvidia invests',
  'Google invests', 'Microsoft invests', 'Amazon invests',
];

function buildFundingRegex() {
  const escaped = FUNDING_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-weekly-funding-portfolio-check' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
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

async function loadPortfolio() {
  try {
    const data = await fetchJson(`${BASE}/api/funding/portfolio`);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
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
  const re = buildFundingRegex();
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
  const { data: portfolio, error: portfolioError } = await loadPortfolio();
  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Weekly funding portfolio review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/weekly-funding-portfolio-check.mjs`. Triage and either:');
  lines.push('- Add or update commitments in the funding portfolio Worker registry, bump `last_updated` server-side, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `/api/funding/portfolio`');
  if (portfolioError) {
    lines.push(`> ⚠️ Could not fetch portfolio: ${portfolioError}`);
  } else if (portfolio) {
    const lastUpdated = portfolio.last_updated ?? 'unknown';
    const stale = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;
    const commitments = portfolio.commitments ?? portfolio.entries ?? [];
    const totalDisclosedMax = commitments.reduce((acc, c) => acc + (c.amount_usd_max ?? 0), 0);
    const totalDisclosed = commitments.reduce((acc, c) => acc + (c.amount_usd_disclosed ?? 0), 0);
    lines.push(`- **last_updated:** \`${lastUpdated}\`${stale !== null ? ` (${stale} days ago)` : ''}`);
    lines.push(`- **Commitments tracked:** ${commitments.length}`);
    lines.push(`- **Total disclosed (max-bound):** $${(totalDisclosedMax / 1_000_000_000).toFixed(1)}B`);
    lines.push(`- **Total disclosed (firm):** $${(totalDisclosed / 1_000_000_000).toFixed(1)}B`);
    const siliconBreakdown = tally(commitments, 'recipient_silicon_dependency');
    if (siliconBreakdown.length) {
      lines.push(`- **By silicon dependency:** ${siliconBreakdown.map(([s, n]) => `${s} (${n})`).join(', ')}`);
    }
    const typeBreakdown = tally(commitments, 'type');
    if (typeBreakdown.length) {
      lines.push(`- **By deal type:** ${typeBreakdown.map(([t, n]) => `${t} (${n})`).join(', ')}`);
    }
  }
  lines.push('');
  lines.push(`## Funding-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> ⚠️ Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the funding-keyword filter. **Soft signal nothing material dropped this week.**');
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
  lines.push('1. A frontier-lab equity stake from a hyperscaler or chip vendor (Nvidia, AMD, Google, Microsoft, Amazon class).');
  lines.push('2. A multi-billion compute commitment between an AI lab and a cloud provider (Anthropic-Google TPU, OpenAI-Oracle, etc).');
  lines.push('3. A capacity partnership tagged to specific silicon (DSX racks, TPU pods, Trainium clusters).');
  lines.push('4. A strategic minority stake between AI-economy players ($1B floor for filter).');
  lines.push('');
  lines.push('### What does NOT justify a new entry');
  lines.push('- Startup financing rounds (those belong on `/funding`, not `/funding/portfolio`).');
  lines.push('- Generic corporate venture activity below $1B.');
  lines.push('- Rumored deals without primary-source confirmation (SEC filing, hyperscaler press release, established trade reporting).');
  lines.push('- Secondary-market trades of existing positions.');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('weekly-funding-portfolio-check failed:', err);
  process.exit(1);
});
