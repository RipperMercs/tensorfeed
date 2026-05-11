#!/usr/bin/env node
/**
 * Upload HF Model Cards rollups to TENSORFEED_CACHE KV.
 *
 * Reads a directory of rollup JSON files produced by the offline pipeline
 * (tensorfeed-research/pipelines/hf-model-cards/rollup.py) and writes them
 * to KV under five keys consumed by /api/hf-model-cards/* endpoints:
 *
 *   hf-model-cards:models                <- models.json (per-model records)
 *   hf-model-cards:rollup_license_dist   <- license distribution
 *   hf-model-cards:rollup_modalities     <- modality distribution
 *   hf-model-cards:rollup_completeness   <- card_completeness distribution
 *   hf-model-cards:rollup_top_use_cases  <- top intended_use_cases
 *   hf-model-cards:rollup_meta           <- summary stats + extraction stats
 *
 * models.json is the largest file (1000+ per-model records); we project
 * to a slimmer schema if it exceeds the KV safety cap, and shard by
 * first-letter prefix as a fallback. Each rollup is <100 KB so they
 * fit in KV with massive margin.
 *
 * Usage:
 *   node worker/scripts/upload-hf-model-cards-rollups.mjs --rollups-dir <path>
 *   node worker/scripts/upload-hf-model-cards-rollups.mjs --rollups-dir <path> --dry-run
 *
 * Pre-reqs:
 *   - Wrangler v3+ installed
 *   - Run from worker/ directory (we re-cd ourselves)
 *   - Authenticated to Cloudflare (wrangler login)
 *   - TENSORFEED_CACHE namespace defined in wrangler.toml (already is)
 */

import { existsSync, readFileSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const WORKER_DIR = resolve(dirname(__filename), '..');

const KV_BINDING = 'TENSORFEED_CACHE';
const KV_VALUE_HARD_CAP = 24 * 1024 * 1024; // 24 MB stays under KV's 25 MB cap

// Maps source-file -> KV key. models.json gets special handling below.
const ROLLUP_KEYS = {
  'rollup_license_dist.json': 'hf-model-cards:rollup_license_dist',
  'rollup_modalities.json': 'hf-model-cards:rollup_modalities',
  'rollup_completeness.json': 'hf-model-cards:rollup_completeness',
  'rollup_top_use_cases.json': 'hf-model-cards:rollup_top_use_cases',
  'rollup_meta.json': 'hf-model-cards:rollup_meta',
};
const MODELS_FILE = 'models.json';
const MODELS_KEY = 'hf-model-cards:models';

// ── CLI parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { rollupsDir: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rollups-dir') args.rollupsDir = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: upload-hf-model-cards-rollups.mjs --rollups-dir <path> [--dry-run]');
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
  if (buf.charCodeAt(0) === 0xFEFF) buf = buf.slice(1);
  try {
    return JSON.parse(buf);
  } catch (e) {
    throw new Error(`Failed to parse ${path}: ${e.message}`);
  }
}

// ── models.json projection ──────────────────────────────────────────

/**
 * Project the full per-model records into a leaner shape for the
 * search index. Drop fields that the per-id endpoint will fetch
 * separately, keep everything that's needed for filtering.
 */
function projectModelsForIndex(models) {
  if (!Array.isArray(models)) throw new Error('models.json is not an array');
  return models.map((m) => ({
    model_id: String(m.model_id ?? ''),
    license_summary: String(m.license_summary ?? 'unknown'),
    modalities: Array.isArray(m.modalities) ? m.modalities : [],
    intended_use_cases: Array.isArray(m.intended_use_cases) ? m.intended_use_cases : [],
    card_completeness: String(m.card_completeness ?? 'low'),
    languages: Array.isArray(m.languages) ? m.languages : [],
    summary_one_sentence: String(m.summary_one_sentence ?? ''),
    confidence: String(m.confidence ?? 'unknown'),
  }));
}

// ── Wrangler invocation ─────────────────────────────────────────────

function wranglerKvPut(key, payloadPath, dryRun) {
  const args = [
    'wrangler', 'kv', 'key', 'put',
    '--binding', KV_BINDING,
    '--remote',
    key,
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
    shell: process.platform === 'win32',
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

  console.log(color('[upload-hf-model-cards-rollups]', 'cyan'));
  console.log(`  rollups dir: ${dir}`);
  console.log(`  worker dir:  ${WORKER_DIR}`);
  console.log(`  binding:     ${KV_BINDING}`);
  if (args.dryRun) console.log(`  ${color('DRY RUN', 'yellow')}: no KV writes`);
  console.log();

  // 1. Validate inputs
  const expectedFiles = [MODELS_FILE, ...Object.keys(ROLLUP_KEYS)];
  for (const fname of expectedFiles) {
    const p = join(dir, fname);
    if (!existsSync(p)) {
      console.error(color(`  missing: ${fname}`, 'red'));
      console.error(`  expected at: ${p}`);
      process.exit(1);
    }
    const sz = statSync(p).size;
    console.log(`  found: ${fname.padEnd(34)} ${fmtBytes(sz)}`);
  }
  console.log();

  // 2. Project models.json into the search index
  console.log(color('  projecting models.json for KV...', 'gray'));
  const modelsPath = join(dir, MODELS_FILE);
  const models = loadJson(modelsPath);
  const indexed = projectModelsForIndex(models);
  console.log(`    models loaded:     ${models.length}`);
  console.log(`    indexed records:   ${indexed.length}`);

  const tmp = mkdtempSync(join(tmpdir(), 'tensorfeed-hf-mc-upload-'));
  const indexPath = join(tmp, 'models_index.json');
  writeFileSync(indexPath, JSON.stringify(indexed), 'utf-8');
  const indexSize = statSync(indexPath).size;
  console.log(`    index file size:   ${fmtBytes(indexSize)}`);
  if (indexSize > KV_VALUE_HARD_CAP) {
    console.error(color(`    ERROR: index is ${fmtBytes(indexSize)}, exceeds 24 MB safety cap`, 'red'));
    console.error('    Either reduce per-record fields in projectModelsForIndex or shard.');
    rmSync(tmp, { recursive: true, force: true });
    process.exit(1);
  }

  // 3. Verify rollup files individually fit
  for (const fname of Object.keys(ROLLUP_KEYS)) {
    const p = join(dir, fname);
    const sz = statSync(p).size;
    if (sz > KV_VALUE_HARD_CAP) {
      console.error(color(`  ERROR: ${fname} is ${fmtBytes(sz)}, exceeds 24 MB safety cap`, 'red'));
      rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
  }
  console.log();

  // 4. Upload all keys via wrangler
  console.log(color('  uploading to KV...', 'gray'));
  const uploads = [
    [MODELS_KEY, indexPath, `${MODELS_FILE} (projected)`],
    ...Object.entries(ROLLUP_KEYS).map(([fname, key]) => [key, join(dir, fname), fname]),
  ];

  let failures = 0;
  for (const [key, path, label] of uploads) {
    process.stdout.write(`    ${key.padEnd(48)} <- ${label} ... `);
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
  }
}

main();
