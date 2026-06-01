#!/usr/bin/env node
/**
 * Marks every FREE / operational OpenAPI operation with `security: []` so
 * x402scan (and other x402 directory crawlers) exclude it from payment
 * probing. The rule, applied uniformly to public/openapi.json AND
 * public/openapi.yaml:
 *
 *   - Operation HAS `x-payment-info`  -> paid premium endpoint. Leave it
 *     unchanged (keeps `security: [{ BearerAuth: [] }]`).
 *   - Operation has NO `x-payment-info` -> free/operational/preview. Set
 *     `security: []` (empty array). Replace any existing operation-level
 *     `security`, or add one if absent.
 *
 * The JSON is rewritten via a structured round-trip (already canonical
 * 2-space JSON.stringify, matching patch-openapi-payment-info.mjs).
 *
 * The YAML is edited line by line off the operationId anchors so the
 * readable formatting (multiline blocks, inline flow style, comments) is
 * preserved. Every operation in this spec has an operationId and every
 * existing operation-level `security` line is a single-line 6-space-indented
 * entry, which makes the line transform deterministic.
 *
 * Usage: node scripts/patch-openapi-free-security.mjs
 * Idempotent. Run after regenerating either spec.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '..', 'public', 'openapi.json');
const YAML_PATH = resolve(__dirname, '..', 'public', 'openapi.yaml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

// Operations that require a bearer token even though they are not x402-paid
// (they have no x-payment-info): per-user data reads gated by the credit
// token. They MUST keep `security: [{ BearerAuth: [] }]` and never be
// downgraded to `[]`, or the spec would advertise an authenticated endpoint
// as public. getPaymentBalance returns the caller's own credit balance and
// returns 401 without a token.
const AUTH_REQUIRED_IDS = new Set(['getPaymentBalance']);

function isOperation(method) {
  return HTTP_METHODS.includes(method.toLowerCase());
}

// ---------------------------------------------------------------------------
// JSON: structured round-trip.
// ---------------------------------------------------------------------------
function patchJson() {
  const spec = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const paths = spec.paths || {};
  let marked = 0;
  let premium = 0;
  const premiumOps = [];

  for (const [path, ops] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (typeof op !== 'object' || op === null) continue;
      if (!isOperation(method)) continue;
      const wantsAuth =
        'x-payment-info' in op || (op.operationId && AUTH_REQUIRED_IDS.has(op.operationId));
      if (wantsAuth) {
        op.security = [{ BearerAuth: [] }];
        premium += 1;
        premiumOps.push(`${method.toUpperCase()} ${path}`);
        continue;
      }
      op.security = [];
      marked += 1;
    }
  }

  writeFileSync(JSON_PATH, JSON.stringify(spec, null, 2) + '\n');
  return { marked, premium, premiumOps };
}

// ---------------------------------------------------------------------------
// YAML: line-based transform keyed off operationId, preserving formatting.
// ---------------------------------------------------------------------------
function patchYaml() {
  const raw = readFileSync(YAML_PATH, 'utf-8');
  const doc = yaml.load(raw);

  // operationId -> hasPaymentInfo
  const premiumIds = new Set();
  const allIds = new Set();
  for (const ops of Object.values(doc.paths || {})) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (typeof op !== 'object' || op === null) continue;
      if (!isOperation(method)) continue;
      if (!op.operationId) {
        throw new Error(`YAML operation ${method} is missing operationId; line transform unsafe.`);
      }
      allIds.add(op.operationId);
      if ('x-payment-info' in op) premiumIds.add(op.operationId);
    }
  }

  const lines = raw.split('\n');
  const out = [];
  // Operation-level fields sit at 6 spaces of indentation in this spec.
  const OP_INDENT = '      ';
  const opIdRe = /^(\s+)operationId:\s*(\S.*?)\s*$/;
  // Only operation-level security lines (indented). Root security is column 0.
  const secRe = /^\s+security:/;

  let marked = 0;
  let premium = 0;
  const premiumOps = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Drop existing operation-level security lines; we re-emit them
    // deterministically at the operationId anchor. Leaves the root
    // (column-0) `security: []` and any non-security line untouched.
    if (secRe.test(line) && !/^security:/.test(line)) {
      continue;
    }

    const m = line.match(opIdRe);
    if (m) {
      out.push(line);
      const opId = m[2].replace(/^['"]|['"]$/g, '');
      if (premiumIds.has(opId) || AUTH_REQUIRED_IDS.has(opId)) {
        // Premium (x-payment-info) or auth-required (allowlist): keep BearerAuth.
        out.push(`${OP_INDENT}security: [{ BearerAuth: [] }]`);
        premium += 1;
        premiumOps.push(opId);
      } else {
        out.push(`${OP_INDENT}security: []`);
        marked += 1;
      }
      continue;
    }

    out.push(line);
  }

  writeFileSync(YAML_PATH, out.join('\n'));
  return { marked, premium, premiumOps };
}

const jsonRes = patchJson();
const yamlRes = patchYaml();

console.log('openapi.json:');
console.log(`  free ops marked security:[] : ${jsonRes.marked}`);
console.log(`  premium ops left untouched  : ${jsonRes.premium}`);
console.log('openapi.yaml:');
console.log(`  free ops marked security:[] : ${yamlRes.marked}`);
console.log(`  premium ops left untouched  : ${yamlRes.premium}`);

if (jsonRes.marked !== yamlRes.marked || jsonRes.premium !== yamlRes.premium) {
  console.error('MISMATCH between json and yaml operation counts.');
  process.exit(1);
}

console.log('\npremium ops (unchanged, BearerAuth):');
jsonRes.premiumOps.forEach((p) => console.log('  ' + p));
