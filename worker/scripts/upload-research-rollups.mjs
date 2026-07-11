#!/usr/bin/env node
/**
 * Upload arXiv research rollups to TENSORFEED_CACHE KV.
 *
 * Reads a directory of rollup JSON files produced by the offline pipeline
 * (tensorfeed-research/pipelines/ai-research/rollup.py) and writes them to
 * KV under three keys consumed by /api/premium/research/* endpoints:
 *
 *   arxiv-research:rollup_milestones           <- rollup_milestones.json verbatim
 *   arxiv-research:rollup_keywords             <- rollup_keywords.json verbatim
 *   arxiv-research:rollup_topic_search_index   <- projected from papers.json
 *
 * The topic-search index is built here, not by rollup.py, because KV has a
 * 25 MB per-value cap and a full papers.json (potentially 100-200 MB) does
 * not fit. The projection keeps the most-recent N papers (default 30,000)
 * and a leaner shape (arxiv_id, date, title, subfield_tag, methodology_bucket,
 * is_milestone_candidate, affiliations, summary).
 *
 * Usage:
 *   node worker/scripts/upload-research-rollups.mjs --rollups-dir <path> --demote-ids <file|none>
 *   node worker/scripts/upload-research-rollups.mjs --rollups-dir <path> --demote-ids scripts/research-demote-ids.json
 *   node worker/scripts/upload-research-rollups.mjs --rollups-dir <path> --demote-ids none --dry-run
 *
 * --demote-ids is REQUIRED (resurrection guard): rollup_milestones from a raw
 * re-roll carries the full window, including records the v3 corroborator sweep
 * demoted as ungrounded and the hand-purged known-bad ones. Uploading that
 * verbatim resurrects them on the live premium feed. Pass the grounding-demotion
 * id list to filter them out before upload, or --demote-ids none to skip for a
 * clean corpus with no demotions. --expect-count N fails the run if the post-demote
 * milestone count is not N, so a stale demote list cannot pass silently.
 *
 * Canonical demote list: scripts/research-demote-ids.json. This is the current
 * served-based D, versioned with this guard so the required input is not a loose
 * file. It is derived from the SERVED papers.json evidence (the deduped milestone
 * winner), so it demotes the record that actually serves, not a losing duplicate
 * chunk. Each refresh updates it in place; git history is the version trail.
 *
 * The canonical D is a pinned object: { served_sha256, expect_count, generated,
 * note, ids: [...] }. It carries the served-snapshot id it was derived against and
 * the post-demote milestone count that snapshot yields, so the pairing is
 * self-checking. When the demote file carries expect_count, the guard auto-applies
 * it: pointing --demote-ids at the canonical D enforces the count even if
 * --expect-count is omitted, and a stale D against a fresh re-roll fails loud on
 * the count check. An explicit --expect-count that disagrees with the pin is a
 * hard error (the D is pinned to a different snapshot). A bare JSON array is still
 * accepted (legacy / ad-hoc lists) and carries no pin. As of the 2026-07-11
 * go-forward refresh the canonical D holds 1,041 ids, pins served 01d87247, and
 * yields a served milestones feed of 2,184.
 *
 * Pre-reqs:
 *   - Wrangler v3+ installed (verified: 3.114.x at scaffold time)
 *   - Run from worker/ directory OR pass --cwd (we re-cd to worker/ either way)
 *   - Authenticated to Cloudflare (wrangler login)
 *   - TENSORFEED_CACHE namespace defined in wrangler.toml (already is)
 */

import { existsSync, readFileSync, statSync, writeFileSync, mkdtempSync, unlinkSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const WORKER_DIR = resolve(dirname(__filename), '..');

const KV_BINDING = 'TENSORFEED_CACHE';
const KEYS = {
  milestones: 'arxiv-research:rollup_milestones',
  keywords: 'arxiv-research:rollup_keywords',
  topicIndex: 'arxiv-research:rollup_topic_search_index',
  labs: 'arxiv-research:rollup_labs',
};
const SOURCE_FILES = {
  milestones: 'rollup_milestones.json',
  keywords: 'rollup_keywords.json',
  papers: 'papers.json',
  labs: 'rollup_labs.json',
};
const DEFAULT_MAX_PAPERS = 30_000;
const KV_VALUE_HARD_CAP = 24 * 1024 * 1024; // 24 MB to stay under the 25 MB KV cap

// ── CLI parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { rollupsDir: null, maxPapers: DEFAULT_MAX_PAPERS, dryRun: false, demoteIds: null, expectCount: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rollups-dir') args.rollupsDir = argv[++i];
    else if (a === '--max-papers') args.maxPapers = parseInt(argv[++i], 10);
    else if (a === '--demote-ids') args.demoteIds = argv[++i];
    else if (a === '--expect-count') args.expectCount = parseInt(argv[++i], 10);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: upload-research-rollups.mjs --rollups-dir <path> --demote-ids <file|none> [--expect-count N] [--max-papers N] [--dry-run]');
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  if (!args.rollupsDir) {
    console.error('Missing required --rollups-dir');
    process.exit(1);
  }
  if (!Number.isFinite(args.maxPapers) || args.maxPapers <= 0) {
    console.error(`Invalid --max-papers: ${args.maxPapers}`);
    process.exit(1);
  }
  // Resurrection guard: rollup_milestones from a raw re-roll carries the full
  // window, including v3-demoted-ungrounded and hand-purged known-bad records.
  // Uploading verbatim would resurrect them on the live premium feed. Require an
  // explicit demote decision so it can never be silently forgotten: a JSON
  // id-list file, or the literal "none".
  if (args.demoteIds === null) {
    console.error('Missing required --demote-ids <file|none>');
    console.error('  Pass the grounding-demotion id list (e.g. TF_demote_ids.json) to filter');
    console.error('  rollup_milestones before upload, or --demote-ids none to explicitly skip.');
    process.exit(1);
  }
  if (args.expectCount !== null && (!Number.isFinite(args.expectCount) || args.expectCount < 0)) {
    console.error(`Invalid --expect-count: ${args.expectCount}`);
    process.exit(1);
  }
  return args;
}

// ── Helpers ─────────────────────────────────────────────────────────

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function color(s, c) {
  const codes = { red: 31, green: 32, yellow: 33, gray: 90, cyan: 36 };
  return process.stdout.isTTY ? `\x1b[${codes[c] ?? 0}m${s}\x1b[0m` : s;
}

function loadJson(path) {
  let buf = readFileSync(path, 'utf-8');
  // Strip a UTF-8 BOM if present (some editors / PowerShell add one).
  if (buf.charCodeAt(0) === 0xFEFF) buf = buf.slice(1);
  try {
    return JSON.parse(buf);
  } catch (e) {
    throw new Error(`Failed to parse ${path}: ${e.message}`);
  }
}

// The grounding-demotion id set governs BOTH served surfaces from one list: it
// is filtered out of rollup_milestones AND flips is_milestone_candidate=false in
// the topic-search projection, so the two endpoints agree on what is a grounded
// milestone. Applied only at the serve layer; papers.json stays the pre-demote
// source of truth (evidence preserved), so a future v3 improvement can un-demote
// a record without re-extraction.
function loadDemote(args) {
  if (args.demoteIds === 'none') return { set: new Set(), embeddedExpectCount: null, servedSha: null };
  const raw = loadJson(resolve(args.demoteIds));
  let ids;
  let embeddedExpectCount = null;
  let servedSha = null;
  if (Array.isArray(raw)) {
    // Legacy / ad-hoc bare-array shape: ids only, no pin.
    ids = raw;
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.ids)) {
    // Pinned-object shape: ids plus the served-snapshot pin.
    ids = raw.ids;
    if (raw.expect_count !== undefined && raw.expect_count !== null) {
      if (!Number.isInteger(raw.expect_count) || raw.expect_count < 0) {
        console.error(color(`  ERROR: --demote-ids embedded expect_count is not a non-negative integer: ${raw.expect_count}`, 'red'));
        process.exit(1);
      }
      embeddedExpectCount = raw.expect_count;
    }
    if (typeof raw.served_sha256 === 'string' && raw.served_sha256) servedSha = raw.served_sha256;
  } else {
    console.error(color(`  ERROR: --demote-ids must be a JSON array or an object with an "ids" array: ${args.demoteIds}`, 'red'));
    process.exit(1);
  }
  return { set: new Set(ids.map((x) => String(x))), embeddedExpectCount, servedSha };
}

// ── Topic-search index projection ───────────────────────────────────

function buildTopicSearchIndex(papers, maxPapers, demoteSet) {
  if (!Array.isArray(papers)) {
    throw new Error('papers.json is not an array');
  }

  // Sort by date desc and cap. Skip records with missing/invalid dates first
  // so they don't waste capacity.
  const sorted = papers
    .filter((p) => p && typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, maxPapers);

  const subfieldSet = new Set();
  const methodologySet = new Set();
  let demotedFlags = 0;

  const projected = sorted.map((p) => {
    const subfield = typeof p.subfield_tag === 'string' ? p.subfield_tag : 'other';
    const methodology = typeof p.methodology_bucket === 'string' ? p.methodology_bucket : 'other';
    subfieldSet.add(subfield);
    methodologySet.add(methodology);

    const affiliations = Array.isArray(p.affiliations_normalized)
      ? p.affiliations_normalized.map((a) => String(a)).filter(Boolean)
      : [];

    // The grounding-demote flips is_milestone_candidate to false in the projection
    // so topic-search milestone_only agrees with the milestones feed. papers.json
    // is untouched (evidence preserved); this is a serve-layer view only.
    const grounded = !!p.is_milestone_candidate && !demoteSet.has(String(p.arxiv_id));
    if (!!p.is_milestone_candidate && !grounded) demotedFlags += 1;

    return {
      arxiv_id: String(p.arxiv_id ?? ''),
      date: p.date,
      title: typeof p.title === 'string' ? p.title : '',
      subfield_tag: subfield,
      methodology_bucket: methodology,
      is_milestone_candidate: grounded,
      affiliations,
      summary: typeof p.summary_one_sentence === 'string' ? p.summary_one_sentence : '',
    };
  });

  return {
    index: {
      as_of: sorted[0]?.date ?? new Date().toISOString().slice(0, 10),
      subfield_tags: [...subfieldSet].sort(),
      methodology_buckets: [...methodologySet].sort(),
      papers: projected,
    },
    demotedFlags,
  };
}

// ── Wrangler invocation ─────────────────────────────────────────────

function wranglerKvPut(key, payloadPath, dryRun) {
  // Wrangler 3.x removed --remote (remote is default; --local is opt-in for
  // local storage). The key must be the first positional after `put`.
  const args = [
    'wrangler', 'kv', 'key', 'put',
    key,
    '--binding', KV_BINDING,
    '--path', payloadPath,
  ];
  if (dryRun) {
    console.log(`  ${color('[dry-run]', 'yellow')} npx ${args.join(' ')}`);
    return { ok: true };
  }
  const r = spawnSync('npx', args, {
    cwd: WORKER_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    shell: process.platform === 'win32', // npx on Windows needs shell:true
  });
  if (r.status !== 0) {
    return { ok: false, stdout: r.stdout, stderr: r.stderr, status: r.status };
  }
  return { ok: true, stdout: r.stdout };
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(args.rollupsDir);

  console.log(color('[upload-research-rollups]', 'cyan'));
  console.log(`  rollups dir: ${dir}`);
  console.log(`  worker dir:  ${WORKER_DIR}`);
  console.log(`  binding:     ${KV_BINDING}`);
  console.log(`  max papers:  ${args.maxPapers}`);
  if (args.dryRun) console.log(`  ${color('DRY RUN', 'yellow')}: no KV writes will happen`);
  console.log();

  // Validate inputs
  for (const [name, fname] of Object.entries(SOURCE_FILES)) {
    const p = join(dir, fname);
    if (!existsSync(p)) {
      console.error(color(`  missing: ${fname}`, 'red'));
      console.error(`  expected at: ${p}`);
      process.exit(1);
    }
    const sz = statSync(p).size;
    console.log(`  found: ${fname.padEnd(28)} ${fmtBytes(sz)}`);
  }
  console.log();

  // Load the grounding-demotion set once; it governs both served surfaces
  // (rollup_milestones filter + topic-search candidate flag).
  const { set: demoteSet, embeddedExpectCount, servedSha } = loadDemote(args);
  console.log(`  demote-ids:  ${args.demoteIds === 'none' ? 'none (no filter)' : `${demoteSet.size} ids from ${args.demoteIds}`}`);
  if (servedSha) console.log(`  served pin:  ${servedSha} (D pairs with this served snapshot)`);

  // Effective post-demote milestone count check. The canonical D file carries its
  // own expect_count pinned to the served snapshot it was built for, so pointing
  // --demote-ids at it auto-applies the count guard even if the operator forgets
  // --expect-count. An explicit --expect-count that disagrees with the pin means
  // this D is being applied to the wrong re-roll: fail loud rather than silently
  // under- or over-demote.
  let effectiveExpectCount = args.expectCount;
  let expectSource = '--expect-count';
  if (embeddedExpectCount !== null) {
    if (args.expectCount !== null && args.expectCount !== embeddedExpectCount) {
      console.error(color(`  ERROR: --expect-count ${args.expectCount} contradicts the demote list's pinned expect_count ${embeddedExpectCount} (served ${servedSha ?? 'n/a'}). This D is pinned to a different snapshot; refusing to upload.`, 'red'));
      process.exit(1);
    }
    if (args.expectCount === null) { effectiveExpectCount = embeddedExpectCount; expectSource = 'D pin'; }
  }
  if (effectiveExpectCount !== null) console.log(`  expect-count: ${effectiveExpectCount} (${expectSource})`);
  console.log();

  // 1. Build topic-search index from papers.json
  console.log(color('  building topic-search index...', 'gray'));
  const papersPath = join(dir, SOURCE_FILES.papers);
  const papers = loadJson(papersPath);
  const { index, demotedFlags } = buildTopicSearchIndex(papers, args.maxPapers, demoteSet);
  console.log(`    papers loaded:        ${papers.length}`);
  console.log(`    papers in index:      ${index.papers.length}`);
  console.log(`    subfield tags:        ${index.subfield_tags.length} (${index.subfield_tags.slice(0, 5).join(', ')}${index.subfield_tags.length > 5 ? ', ...' : ''})`);
  console.log(`    methodology buckets:  ${index.methodology_buckets.length}`);
  console.log(`    as_of:                ${index.as_of}`);
  console.log(`    milestone flags demoted (topic-search): ${demotedFlags}`);

  const tmp = mkdtempSync(join(tmpdir(), 'tensorfeed-research-upload-'));
  const indexPath = join(tmp, 'topic_search_index.json');
  const indexJson = JSON.stringify(index);
  writeFileSync(indexPath, indexJson, 'utf-8');
  const indexSize = statSync(indexPath).size;
  console.log(`    index file size:      ${fmtBytes(indexSize)}`);
  if (indexSize > KV_VALUE_HARD_CAP) {
    console.error(color(`    ERROR: index is ${fmtBytes(indexSize)}, exceeds 24 MB safety cap`, 'red'));
    console.error('    rerun with a smaller --max-papers (e.g., --max-papers 20000)');
    rmSync(tmp, { recursive: true, force: true });
    process.exit(1);
  }
  console.log();

  // 2. Verify other rollups fit too (lighter validation, they should)
  const milestonesPath = join(dir, SOURCE_FILES.milestones);
  const keywordsPath = join(dir, SOURCE_FILES.keywords);
  const labsPath = join(dir, SOURCE_FILES.labs);
  for (const [label, path] of [['rollup_milestones.json', milestonesPath], ['rollup_keywords.json', keywordsPath], ['rollup_labs.json', labsPath]]) {
    const sz = statSync(path).size;
    if (sz > KV_VALUE_HARD_CAP) {
      console.error(color(`  ERROR: ${label} is ${fmtBytes(sz)}, exceeds 24 MB safety cap`, 'red'));
      rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
  }

  // 2b. Resurrection guard: filter the grounding-demotion ids out of
  // rollup_milestones BEFORE upload. The demote id list ships with the refresh
  // bundle so the exact filter is versioned with the data, not a manual staging
  // step. `--demote-ids none` is the explicit opt-out for a clean corpus.
  let milestonesUploadPath = milestonesPath;
  if (args.demoteIds === 'none') {
    console.log(color('  demote: --demote-ids none (no rollup_milestones filter applied)', 'yellow'));
    console.log();
  } else {
    const ms = loadJson(milestonesPath);
    const before = Array.isArray(ms.papers) ? ms.papers.length : 0;
    ms.papers = (Array.isArray(ms.papers) ? ms.papers : []).filter((p) => !demoteSet.has(String(p.arxiv_id)));
    const after = ms.papers.length;
    const excluded = before - after;
    console.log(color(`  rollup_milestones demote: ${before} -> ${after} (excluded ${excluded}; ${demoteSet.size} ids in list)`, 'gray'));
    if (excluded === 0) {
      console.log(color('  WARNING: demote excluded 0 records; the id list may be stale or for a different corpus', 'yellow'));
    }
    if (effectiveExpectCount !== null && after !== effectiveExpectCount) {
      console.error(color(`  ERROR: post-demote rollup_milestones = ${after}, expected ${effectiveExpectCount} (${expectSource}). Stale demote list or wrong bundle; refusing to upload.`, 'red'));
      rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
    milestonesUploadPath = join(tmp, 'rollup_milestones_demoted.json');
    writeFileSync(milestonesUploadPath, JSON.stringify(ms), 'utf-8');
    const sz = statSync(milestonesUploadPath).size;
    if (sz > KV_VALUE_HARD_CAP) {
      console.error(color(`  ERROR: filtered rollup_milestones is ${fmtBytes(sz)}, exceeds 24 MB safety cap`, 'red'));
      rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
    console.log();
  }

  // 3. Upload all 4 keys via wrangler kv key put
  console.log(color('  uploading to KV...', 'gray'));
  const uploads = [
    [KEYS.milestones, milestonesUploadPath, 'rollup_milestones.json'],
    [KEYS.keywords, keywordsPath, 'rollup_keywords.json'],
    [KEYS.topicIndex, indexPath, 'topic_search_index.json (built)'],
    [KEYS.labs, labsPath, 'rollup_labs.json'],
  ];

  let failures = 0;
  for (const [key, path, label] of uploads) {
    process.stdout.write(`    ${key.padEnd(45)} <- ${label} ... `);
    const r = wranglerKvPut(key, path, args.dryRun);
    if (r.ok) {
      console.log(color('ok', 'green'));
    } else {
      console.log(color('FAILED', 'red'));
      console.error(color(`      stdout: ${(r.stdout || '').trim()}`, 'gray'));
      console.error(color(`      stderr: ${(r.stderr || '').trim()}`, 'gray'));
      failures += 1;
    }
  }

  // Cleanup
  rmSync(tmp, { recursive: true, force: true });

  console.log();
  if (failures > 0) {
    console.error(color(`  ${failures}/${uploads.length} uploads failed`, 'red'));
    process.exit(1);
  }
  if (args.dryRun) {
    console.log(color(`  dry run complete. ${uploads.length} commands would have run.`, 'yellow'));
  } else {
    console.log(color(`  done. ${uploads.length} keys uploaded to ${KV_BINDING}.`, 'green'));
    console.log();
    console.log('  Verify with:');
    console.log(`    curl https://tensorfeed.ai/api/premium/research/milestones -H "Authorization: Bearer <token>"`);
    console.log(`    curl https://tensorfeed.ai/api/premium/research/emerging-keywords -H "Authorization: Bearer <token>"`);
    console.log(`    curl "https://tensorfeed.ai/api/premium/research/topic-search?limit=5" -H "Authorization: Bearer <token>"`);
    console.log(`    curl "https://tensorfeed.ai/api/premium/research/lab-productivity?window=90d&limit=10" -H "Authorization: Bearer <token>"`);
  }
}

main();
