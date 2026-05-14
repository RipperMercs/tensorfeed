#!/usr/bin/env node
/**
 * Biweekly AI policy freshness check.
 *
 * Produces a Markdown report intended as the body of a biweekly GitHub
 * issue. Policy moves slower than infrastructure or capital, so this
 * fires twice a month (1st and 15th) rather than weekly.
 *
 * Prompts the operator to review whether the /api/ai-policy registry
 * needs new policy entries, status updates, or milestone progress.
 *
 * What goes in the report:
 *   1. Current state pulled from /api/ai-policy (active count, pending
 *      count, status breakdown by jurisdiction)
 *   2. Last 14 days of TF news matching AI policy / regulation keywords
 *      (AI Act, executive order, regulation, moratorium, ban, etc)
 *   3. A reminder of what kinds of policy movement justify an update
 *
 * Writes Markdown to stdout. The companion GH Action pipes the output
 * into `gh issue create --body-file -`.
 *
 * Usage:
 *   node scripts/biweekly-ai-policy-check.mjs > issue-body.md
 *
 * Env (all optional):
 *   TENSORFEED_BASE   defaults to https://tensorfeed.ai
 *   LOOKBACK_DAYS     defaults to 14
 *   NEWS_LIMIT        defaults to 250
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TENSORFEED_BASE || 'https://tensorfeed.ai';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 14);
const NEWS_LIMIT = Number(process.env.NEWS_LIMIT || 250);

const POLICY_KEYWORDS = [
  // Named frameworks
  'AI Act', 'EU AI Act', 'GUARD Act', 'AB 2013', 'SB 1047',
  'NIST AI RMF', 'ISO 42001',
  'Generative AI Measures', 'Basic Act on AI',
  // Regulators and agencies
  'FTC', 'FCC', 'DOJ', 'SEC', 'NIST', 'NTIA', 'BIS', 'OFAC',
  'Cabinet Office', 'AISI', 'CSL', 'Personal Data Protection',
  // Policy actions
  'executive order', 'rulemaking', 'proposed rule',
  'enforcement action', 'consent decree',
  'moratorium', 'ban on', 'banned', 'banning',
  'compliance', 'compliant', 'fine on', 'fined',
  'antitrust', 'investigation', 'subpoena', 'lawsuit', 'sues',
  // Export controls and national-security adjacent
  'export control', 'chip ban', 'tariff', 'national security',
  'sovereign AI', 'AI safety', 'AI safety institute',
  'frontier model', 'safety evaluation',
  // Legislative activity
  'introduces bill', 'passes bill', 'signed into law',
  'Senate', 'House of Representatives', 'committee hearing',
  'European Parliament', 'European Commission',
];

function buildPolicyRegex() {
  const escaped = POLICY_KEYWORDS.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  return new RegExp(escaped.join('|'), 'i');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tf-biweekly-policy-check' } });
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

async function loadPolicy() {
  try {
    const data = await fetchJson(`${BASE}/api/ai-policy`);
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
  const re = buildPolicyRegex();
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
  const { data: policy, error: policyError } = await loadPolicy();
  const { matches: newsMatches, error: newsError } = await findRelevantNews();
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Biweekly AI policy review (${today})`);
  lines.push('');
  lines.push('Automated check from `scripts/biweekly-ai-policy-check.mjs`. Fires twice a month (1st + 15th). Triage and either:');
  lines.push('- Add or update entries in the AI policy Worker registry, bump `lastUpdated` server-side, then close this issue, OR');
  lines.push('- Comment `noop` and close if nothing actionable surfaced.');
  lines.push('');
  lines.push('## Current state of `/api/ai-policy`');
  if (policyError) {
    lines.push(`> ⚠️ Could not fetch policy registry: ${policyError}`);
  } else if (policy) {
    const lastUpdated = policy.lastUpdated ?? 'unknown';
    const stale = lastUpdated !== 'unknown' ? daysAgo(lastUpdated) : null;
    const policies = policy.items ?? policy.policies ?? policy.entries ?? [];
    lines.push(`- **lastUpdated:** \`${lastUpdated}\`${stale !== null ? ` (${stale} days ago)` : ''}`);
    lines.push(`- **Policies tracked:** ${policies.length}`);
    const statusBreakdown = tally(policies, 'status');
    if (statusBreakdown.length) {
      lines.push(`- **By status:** ${statusBreakdown.map(([s, n]) => `${s} (${n})`).join(', ')}`);
    }
    const jurisdictionBreakdown = tally(policies, 'jurisdiction');
    if (jurisdictionBreakdown.length) {
      lines.push(`- **By jurisdiction:** ${jurisdictionBreakdown.map(([j, n]) => `${j} (${n})`).join(', ')}`);
    }
  }
  lines.push('');
  lines.push(`## Policy-flavored news, last ${LOOKBACK_DAYS} days`);
  if (newsError) {
    lines.push(`> ⚠️ Could not fetch news: ${newsError}`);
  } else if (newsMatches.length === 0) {
    lines.push('> Zero articles matched the policy-keyword filter. **Soft signal nothing material moved this fortnight.**');
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
  lines.push('### What justifies a registry update');
  lines.push('1. A tracked policy hits a milestone (signed, enacted, partially applied, repealed).');
  lines.push('2. A new framework lands at the federal or major-state level (EU member state implementation, US executive order, China measures).');
  lines.push('3. A regulator publishes binding guidance that materially shifts compliance scope.');
  lines.push('4. An enforcement action (fine, consent decree, lawsuit) establishes new precedent.');
  lines.push('');
  lines.push('### What does NOT justify a registry update');
  lines.push('- Opinion columns about AI policy.');
  lines.push('- Speculation about pending bills with low passage probability.');
  lines.push('- Subnational guidance below state level (county / city ordinances rarely meet the bar).');
  lines.push('- Industry self-regulation announcements (those are not policy in the registry sense).');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('biweekly-ai-policy-check failed:', err);
  process.exit(1);
});
