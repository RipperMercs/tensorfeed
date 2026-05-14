#!/usr/bin/env node
/**
 * Adds x-payment-required + x-payment-info extensions to every operation
 * under /api/premium/* in public/openapi.json. Mirrors the AgentMail
 * pattern (used by x402.api.agentmail.to) so directory crawlers and
 * validators can recognize our paid endpoints at the OpenAPI layer.
 *
 * Required by:
 *   - pay.sh (solana-foundation/pay-skills) — the catalog validator marks
 *     endpoints as "FREE" if they have no x-payment-required tag.
 *   - x402scan.com — per memory project_x402_canonical_schema, needs
 *     x-payment-info on paid ops for indexing.
 *
 * Price source of truth: /.well-known/x402.json items list (amount field).
 * Base rate is $0.020000 (= 20000 micro-USDC = 1 credit). Re-run after
 * any pricing change so OpenAPI stays in sync with the manifest.
 *
 * Usage: node scripts/patch-openapi-payment-info.mjs
 * Reads + writes public/openapi.json in place. Idempotent.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = resolve(__dirname, '..', 'public', 'openapi.json');

const PREMIUM_PREFIX = '/api/premium/';
const BASE_PRICE = '$0.020000'; // 1 credit baseline; matches well-known/x402.json amount=20000

const X_PAYMENT_INFO = {
  protocols: ['x402'],
  pricingMode: 'fixed',
  price: BASE_PRICE,
};

const spec = JSON.parse(readFileSync(OPENAPI_PATH, 'utf-8'));
const paths = spec.paths || {};

let patched = 0;
let already = 0;
let skipped = 0;

for (const [path, ops] of Object.entries(paths)) {
  if (!path.startsWith(PREMIUM_PREFIX)) {
    skipped += Object.keys(ops || {}).length;
    continue;
  }
  for (const [method, op] of Object.entries(ops || {})) {
    if (typeof op !== 'object' || op === null) continue;
    if (!['get', 'post', 'put', 'patch', 'delete', 'head'].includes(method.toLowerCase())) continue;
    if (op['x-payment-required'] === true && op['x-payment-info']) {
      already += 1;
      continue;
    }
    op['x-payment-required'] = true;
    op['x-payment-info'] = { ...X_PAYMENT_INFO };
    patched += 1;
  }
}

writeFileSync(OPENAPI_PATH, JSON.stringify(spec, null, 2) + '\n');

console.log(`openapi.json patched.`);
console.log(`  premium ops tagged: ${patched} new, ${already} already had tags`);
console.log(`  non-premium ops left untouched: ${skipped}`);
