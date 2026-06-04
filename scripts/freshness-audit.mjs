#!/usr/bin/env node
/**
 * Consolidated page-freshness audit.
 *
 * Reads data/page-freshness.json, computes each tracked page's next-review
 * due date from last_reviewed + cadence, and reports which pages are OVERDUE
 * or due within the next two days. Writes a Markdown report to stdout suitable
 * as the body of a single weekly GitHub issue (one issue for ALL pages, vs the
 * older per-page reminder workflows).
 *
 * This is the operator-facing side of the freshness signal. The public page
 * badge (src/components/LastUpdatedFooter.tsx) deliberately does NOT show
 * OVERDUE to readers; this audit is where overdue pages are meant to surface.
 *
 * Exit code: 0 always (a reporting tool, not a gate). The companion GitHub
 * Action decides whether to open an issue based on whether the report lists
 * any overdue pages.
 *
 * Usage:
 *   node scripts/freshness-audit.mjs > issue-body.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CADENCE_DAYS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
const DAY_MS = 86_400_000;

function dueInfo(lastReviewed, cadence) {
  if (cadence === 'editorial' || !CADENCE_DAYS[cadence]) return null;
  const base = new Date(`${lastReviewed}T00:00:00Z`).getTime();
  const dueMs = base + CADENCE_DAYS[cadence] * DAY_MS;
  const overdueDays = Math.floor((Date.now() - dueMs) / DAY_MS);
  return { dueISO: new Date(dueMs).toISOString().slice(0, 10), overdueDays };
}

async function main() {
  const raw = await fs.readFile(path.join(REPO_ROOT, 'data', 'page-freshness.json'), 'utf-8');
  const pages = JSON.parse(raw).pages ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const overdue = [];
  const dueSoon = [];
  const editorial = [];

  for (const [pagePath, entry] of Object.entries(pages)) {
    const info = dueInfo(entry.last_reviewed, entry.cadence);
    if (!info) {
      editorial.push({ pagePath, ...entry });
      continue;
    }
    const row = { pagePath, ...entry, ...info };
    if (info.overdueDays >= 0) overdue.push(row);
    else if (info.overdueDays >= -2) dueSoon.push(row);
  }

  overdue.sort((a, b) => b.overdueDays - a.overdueDays);

  const lines = [];
  lines.push(`# Page freshness audit (${today})`);
  lines.push('');
  lines.push('One consolidated review of every page tracked in `data/page-freshness.json`.');
  lines.push('Readers never see OVERDUE; this is the operator-facing signal. For each');
  lines.push('overdue page: do a real review, update the underlying data if needed, then');
  lines.push('bump `last_reviewed` to today. If a page no longer needs a hard cadence,');
  lines.push("set its cadence to `editorial` so it stops generating due dates.");
  lines.push('');

  lines.push(`## Overdue (${overdue.length})`);
  if (overdue.length === 0) {
    lines.push('> Nothing overdue. Every tracked page is within its review window.');
  } else {
    lines.push('| Page | Cadence | Last reviewed | Was due | Days overdue |');
    lines.push('|---|---|---|---|---|');
    for (const r of overdue) {
      lines.push(`| ${r.pagePath} | ${r.cadence} | ${r.last_reviewed} | ${r.dueISO} | ${r.overdueDays} |`);
    }
  }
  lines.push('');

  lines.push(`## Due within two days (${dueSoon.length})`);
  if (dueSoon.length === 0) {
    lines.push('> None.');
  } else {
    for (const r of dueSoon) {
      lines.push(`- ${r.pagePath} (${r.cadence}) due ${r.dueISO}`);
    }
  }
  lines.push('');

  if (editorial.length) {
    lines.push(`## Editorial cadence (no due date, ${editorial.length})`);
    for (const r of editorial) {
      lines.push(`- ${r.pagePath} (last reviewed ${r.last_reviewed})`);
    }
    lines.push('');
  }

  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('freshness-audit failed:', err);
  process.exit(1);
});
