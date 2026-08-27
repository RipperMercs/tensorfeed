/**
 * Build the three OpenAlex research snapshots from a residential IP and
 * optionally POST them to the admin seed endpoint.
 *
 * WHY THIS EXISTS
 * OpenAlex throttles Cloudflare's shared egress, so the 04:00 UTC cron branch
 * that refreshes institutions, authors, and citation-velocity fails and each
 * refresher correctly declines to overwrite last-known-good. The result is a
 * /research hub serving 86 to 93 day old data while answering HTTP 200.
 * worker/src/index.ts documents the intended fallback: the operator builds the
 * snapshot from an IP OpenAlex does not throttle and POSTs it to
 * /api/admin/snapshot/openalex/{kind}, which writes the SAME KV keys the cron
 * would have written.
 *
 * The fetch URLs below mirror the private fetchers in the worker modules
 * exactly. The snapshots themselves are produced by importing the worker's own
 * exported builders, so the shape cannot drift from what the cron produces.
 *
 * Usage:
 *   npx tsx scripts/seed-openalex-snapshots.ts            # build + write JSON locally
 *   npx tsx scripts/seed-openalex-snapshots.ts --post     # also POST to production
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSnapshot as buildInstitutions } from '../worker/src/openalex-research';
import { buildSnapshot as buildAuthors } from '../worker/src/openalex-authors';
import { buildVelocitySnapshot } from '../worker/src/openalex-citation-velocity';

const BASE = 'https://api.openalex.org';
const MAILTO = 'legal@tensorfeed.ai';
const POLITE_UA = `tensorfeed-research/1.0 (mailto:${MAILTO}; +https://tensorfeed.ai)`;
const HEADERS = { 'User-Agent': POLITE_UA, Accept: 'application/json' };

const OUT_DIR = join(process.cwd(), '.openalex-seed');
const TOP_N = 100;

// Institutions and authors use the curated Machine learning + Deep learning
// pair: the broad level-1 AI concept is inherited so liberally that a
// fusion-physics institute and a microorganism collection outrank real AI labs.
const CURATED_AI_CONCEPT = 'C119857082|C108583219';
// Velocity keeps the broad concept: it ranks individual PAPERS by citation
// share and carries a predatory/citation-farm filter, so the over-tagging that
// wrecks the institution and author boards does not distort it.
const BROAD_AI_CONCEPT = 'C154945302';

function isoDateOffsetDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function getJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}

interface GroupBy {
  group_by?: Array<{ key?: string; count?: number }>;
}

function groupsToAggregates(data: GroupBy, prefix: string) {
  const out: Array<{ openalex_id: string; ai_works_last_year: number }> = [];
  for (const g of data.group_by ?? []) {
    if (!g.key || typeof g.count !== 'number') continue;
    const id = g.key.startsWith('http') ? g.key.split('/').pop()! : g.key;
    if (!id || !id.startsWith(prefix)) continue;
    out.push({ openalex_id: id, ai_works_last_year: g.count });
  }
  out.sort((a, b) => b.ai_works_last_year - a.ai_works_last_year);
  return out.slice(0, TOP_N);
}

async function buildInstitutionsSnapshot() {
  const from = isoDateOffsetDays(365);
  const agg = groupsToAggregates(
    await getJson<GroupBy>(
      `${BASE}/works?filter=concepts.id:${CURATED_AI_CONCEPT},from_publication_date:${from}` +
        `&group_by=authorships.institutions.id&per_page=200&mailto=${MAILTO}`,
      'institutions group_by',
    ),
    'I',
  );
  const filterValue = agg.map(a => a.openalex_id).join('|');
  const list = await getJson<{ results?: Array<Record<string, unknown>> }>(
    `${BASE}/institutions?filter=ids.openalex:${encodeURIComponent(filterValue)}` +
      `&select=id,display_name,country_code,type,works_count&per_page=200&mailto=${MAILTO}`,
    'institutions detail',
  );
  const details = new Map<string, never>();
  for (const inst of list.results ?? []) {
    const id = String(inst.id ?? '');
    if (!id) continue;
    details.set(id.startsWith('http') ? id.split('/').pop()! : id, inst as never);
  }
  return buildInstitutions(agg as never, details as never);
}

async function buildAuthorsSnapshot() {
  const from = isoDateOffsetDays(365);
  const agg = groupsToAggregates(
    await getJson<GroupBy>(
      `${BASE}/works?filter=concepts.id:${CURATED_AI_CONCEPT},from_publication_date:${from}` +
        `&group_by=authorships.author.id&per_page=200&mailto=${MAILTO}`,
      'authors group_by',
    ),
    'A',
  );
  const filterValue = agg.map(a => a.openalex_id).join('|');
  const list = await getJson<{ results?: Array<Record<string, unknown>> }>(
    `${BASE}/authors?filter=ids.openalex:${encodeURIComponent(filterValue)}` +
      `&select=id,display_name,orcid,affiliations,summary_stats,works_count,cited_by_count` +
      `&per_page=200&mailto=${MAILTO}`,
    'authors detail',
  );
  const details = new Map<string, never>();
  for (const a of list.results ?? []) {
    const id = String(a.id ?? '');
    if (!id) continue;
    details.set(id.startsWith('http') ? id.split('/').pop()! : id, a as never);
  }
  return buildAuthors(agg as never, details as never);
}

async function buildVelocity() {
  const currentYear = new Date().getUTCFullYear();
  const minYear = currentYear - 2;
  const data = await getJson<{ results?: unknown[] }>(
    `${BASE}/works?filter=concepts.id:${BROAD_AI_CONCEPT},from_publication_date:${minYear}-01-01,cited_by_count:>2` +
      `&sort=cited_by_count:desc&per_page=200` +
      `&select=id,display_name,publication_year,cited_by_count,counts_by_year,authorships,doi,primary_location` +
      `&mailto=${MAILTO}`,
    'velocity works',
  );
  const works = data.results ?? [];
  if (works.length === 0) throw new Error('velocity works fetch returned 0 results');
  return buildVelocitySnapshot(works as never);
}

async function post(kind: string, snapshot: unknown, adminKey: string) {
  // extractAdminKey (worker/src/index.ts) accepts an Authorization: Bearer
  // header, falling back to a ?key= query param. It does NOT read X-Admin-Key.
  const res = await fetch(`https://tensorfeed.ai/api/admin/snapshot/openalex/${kind}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Cloudflare's bot edge 403s default runtime user agents, so set a real one.
      'User-Agent': 'tensorfeed-cc-openalex-seed/1.0',
      Authorization: `Bearer ${adminKey}`,
    },
    body: JSON.stringify(snapshot),
  });
  const text = await res.text();
  console.log(`  POST ${kind}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return res.ok;
}

async function main() {
  const doPost = process.argv.includes('--post');
  mkdirSync(OUT_DIR, { recursive: true });

  const built: Array<[string, unknown, number]> = [];

  const inst = await buildInstitutionsSnapshot();
  built.push(['institutions', inst, inst.institutions.length]);

  const auth = await buildAuthorsSnapshot();
  built.push(['authors', auth, auth.authors.length]);

  const vel = await buildVelocity();
  built.push(['citation-velocity', vel, vel.papers.length]);

  for (const [kind, snap, count] of built) {
    const file = join(OUT_DIR, `${kind}.json`);
    writeFileSync(file, JSON.stringify(snap, null, 2));
    const capturedAt = (snap as { capturedAt: string }).capturedAt;
    console.log(`built ${kind}: ${count} rows, capturedAt ${capturedAt} -> ${file}`);
  }

  if (!doPost) {
    console.log('\nbuild only. Re-run with --post to write these to production KV.');
    return;
  }
  const adminKey = process.env.TF_ADMIN_KEY;
  if (!adminKey) throw new Error('TF_ADMIN_KEY not set');

  // --only=a,b restricts which snapshots are written. Used to hold back
  // `authors`, whose OpenAlex source records include organizations and
  // patent-assignee placeholders ("Assignee Research", "Association for
  // Computational Linguistics") that outrank real researchers. Curating the
  // concept set removed the fusion-physics artifact but not this one, and a
  // leaderboard of non-people is not shippable.
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;

  console.log('\nposting to production:');
  for (const [kind, snap] of built) {
    if (only && !only.has(kind)) {
      console.log(`  SKIP ${kind} (not in --only)`);
      continue;
    }
    await post(kind, snap, adminKey);
  }
}

main().catch(err => {
  console.error('FAILED:', (err as Error).message);
  process.exit(1);
});
