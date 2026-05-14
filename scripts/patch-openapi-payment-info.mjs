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
// 1 credit baseline; matches well-known/x402.json amount=20000 (= $0.02 USD).
// Structured shape per x402scan's DISCOVERY.md (Merit-Systems/x402scan repo).
// Legacy flat shape (pricingMode + "$0.020000" string) also accepted but
// flagged L2_PAYMENT_INFO_LEGACY by the agentcash discovery validator.
const X_PAYMENT_INFO = {
  protocols: [{ x402: {} }],
  price: {
    mode: 'fixed',
    currency: 'USD',
    amount: '0.02',
  },
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
    // Force-overwrite x-payment-info to keep the structured shape canonical.
    // Avoids drift if upstream regenerates the OpenAPI with a different schema
    // or if the legacy flat format leaks back in. Idempotent on already-correct
    // entries (overwriting with the same constant is a no-op).
    const wasAlready =
      op['x-payment-required'] === true &&
      JSON.stringify(op['x-payment-info']) === JSON.stringify(X_PAYMENT_INFO);
    op['x-payment-required'] = true;
    op['x-payment-info'] = { ...X_PAYMENT_INFO };
    if (wasAlready) {
      already += 1;
    } else {
      patched += 1;
    }
  }
}

writeFileSync(OPENAPI_PATH, JSON.stringify(spec, null, 2) + '\n');

console.log(`openapi.json patched.`);
console.log(`  premium ops tagged: ${patched} new, ${already} already had tags`);
console.log(`  non-premium ops left untouched: ${skipped}`);
