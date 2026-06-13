/**
 * generate-premium-catalog.ts
 *
 * Build-time generator that writes `data/premium-catalog.json` from the
 * worker's PREMIUM_CATALOG (worker/src/premium-catalog.ts), the single source
 * of truth compiled from the live premium handlers. The
 * /developers/agent-payments page imports this JSON and renders the full
 * machine-payable catalog, so the public payment doc can never drift behind the
 * real endpoint set.
 *
 * This kills the same drift class that hid nine payable endpoints off the x402
 * storefront on 2026-06-12 (see project_x402_storefront_coverage): a
 * hand-maintained surface silently lagging the catalog. The doc surface is now
 * generated, not curated, for the complete-list section.
 *
 * Hooked into prebuild after sync-x402-manifest. Idempotent: same PREMIUM_CATALOG
 * produces byte-identical output. Latin1-clean per the no-em-dash rule, validated
 * before write. premium-catalog-published.test.ts asserts this file stays in
 * lockstep with buildPremiumCatalog().
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildPremiumCatalog } from '../worker/src/premium-catalog';

const OUT_PATH = path.resolve(__dirname, '../data/premium-catalog.json');

// Per [[feedback_em_dash_crashes_btoa]] and the project no-em-dash rule: no
// non-Latin1 character may reach a published surface. Validate every string.
function assertLatin1(value: unknown, label: string): void {
  if (typeof value !== 'string') return;
  for (let i = 0; i < value.length; i++) {
    const cp = value.charCodeAt(i);
    if (cp > 255) {
      throw new Error(
        `[generate-premium-catalog] Non-Latin1 char U+${cp
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')} at offset ${i} of ${label}`,
      );
    }
  }
}

function walkAndAssertLatin1(obj: unknown, label: string): void {
  if (typeof obj === 'string') {
    assertLatin1(obj, label);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => walkAndAssertLatin1(item, `${label}[${idx}]`));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      walkAndAssertLatin1(v, `${label}.${k}`);
    }
  }
}

function main(): void {
  const built = buildPremiumCatalog();
  // Drop the runtime `ok` flag; the static file is a catalog snapshot, not an
  // API envelope. Everything else (count, credit_range, categories, endpoints,
  // note, attribution) is what the page renders.
  const out = {
    count: built.count,
    credit_range: built.credit_range,
    categories: built.categories,
    endpoints: built.endpoints,
    note: built.note,
    attribution: built.attribution,
  };
  walkAndAssertLatin1(out, 'premium-catalog');
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(
    `[generate-premium-catalog] wrote ${out.count} endpoints across ${Object.keys(out.categories).length} categories to data/premium-catalog.json`,
  );
}

main();
