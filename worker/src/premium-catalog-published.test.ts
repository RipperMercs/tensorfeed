/**
 * Published-catalog drift guard.
 *
 * data/premium-catalog.json is generated from PREMIUM_CATALOG by
 * scripts/generate-premium-catalog.ts during prebuild, and the
 * /developers/agent-payments page imports it to render the full machine-payable
 * catalog. This suite asserts the committed JSON is byte-for-byte what
 * buildPremiumCatalog() produces, so the public payment doc cannot drift behind
 * the catalog (the storefront-coverage drift class, killed at the doc surface).
 *
 * If this fails after you change PREMIUM_CATALOG, regenerate the file:
 *   npx tsx scripts/generate-premium-catalog.ts
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPremiumCatalog } from './premium-catalog';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLISHED_PATH = join(HERE, '..', '..', 'data', 'premium-catalog.json');

describe('data/premium-catalog.json is in sync with PREMIUM_CATALOG', () => {
  it('matches buildPremiumCatalog() exactly', () => {
    const built = buildPremiumCatalog();
    const expected = {
      count: built.count,
      credit_range: built.credit_range,
      categories: built.categories,
      endpoints: built.endpoints,
      note: built.note,
      attribution: built.attribution,
    };
    const published = JSON.parse(readFileSync(PUBLISHED_PATH, 'utf8'));
    expect(
      published,
      'data/premium-catalog.json is stale. Regenerate it: npx tsx scripts/generate-premium-catalog.ts',
    ).toEqual(expected);
  });
});
