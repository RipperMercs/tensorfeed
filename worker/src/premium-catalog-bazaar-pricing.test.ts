/**
 * Bazaar card price-parity guard.
 *
 * premium-catalog-bazaar-coverage.test.ts proves every payable endpoint is
 * PRESENT on the x402 storefront. It says nothing about whether the price on
 * the card is the price the runtime actually charges. Those are different
 * failures, and the second one is worse: a card that is present but mispriced
 * is discoverable, looks healthy to every crawler, and still cannot be paid.
 *
 * Under the x402 `exact` scheme the payment must match the demanded amount. An
 * agent that discovers an endpoint through the Bazaar catalog, budgets from
 * `accepts[].amount`, and submits that amount gets rejected when the runtime
 * 402 demands something else. Discovery converts to nothing.
 *
 * That shipped: all 10 /api/premium/providers/{slug} split cards, plus the
 * brace-notation template card, advertised 20000 (1 credit) while the runtime
 * demanded 100000 (5 credits, the price on the :name parent).
 * scripts/sync-x402-manifest.ts hardcoded `credits: 1` when building split
 * instances, and its refresh fingerprint omitted credits and amount, so no
 * later sync run could repair them. They sat frozen at their original
 * lastUpdated for 45 days while the sync reported "0 refreshed splits". The CVE
 * split families masked it because their parents genuinely are 1 credit.
 *
 * Notation note: the manifest lists some path-param endpoints twice, once as
 * `/x/:id` and once as `/x/{id}`, which is deliberate listing breadth for
 * crawlers that read either form. Both are placeholders and both 404 if fetched
 * literally, so a literal 404 is normal here and is NOT a defect signal. What
 * matters is that every notation for one endpoint quotes one price.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, '..', '..', 'public', '.well-known', 'x402.json');

// Mirrors amountForCredits() in scripts/sync-x402-manifest.ts:
// credits * CENTS_PER_CREDIT * 10^(USDC_DECIMALS - 2), i.e. 2 cents per credit
// rendered into 6-decimal USDC base units.
const BASE_UNITS_PER_CREDIT = 20000;

/**
 * Concrete instance paths that legitimately carry a price different from their
 * template. Each entry is a real runtime special case verified against the live
 * 402, not a tolerated drift. Anything not listed must match its template, so a
 * new divergence fails until someone states the intent.
 */
const PRICE_OVERRIDES: Record<string, number> = {
  // The `all` dataset fans out across every captured corpus in one call, so the
  // Worker charges 5 credits for it while a single-dataset replay costs 1.
  // Confirmed live: /api/premium/time-machine/all?date=... demands 100000.
  '/api/premium/time-machine/all': 5,
};

interface Accept {
  amount?: string;
  network?: string;
}
interface Item {
  resource: string | { url?: string };
  accepts?: Accept[];
  metadata?: { credits?: number };
}

function loadItems(): Item[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as { items: Item[] };
  return manifest.items;
}

function pathOf(item: Item): string | null {
  const url = typeof item.resource === 'string' ? item.resource : item.resource?.url;
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
}

/** Both notations the manifest uses for a path param: `:id` and `{id}`. */
function isTemplatePath(path: string): boolean {
  const last = path.split('/').pop() ?? '';
  return last.startsWith(':') || (last.startsWith('{') && last.endsWith('}'));
}

function prefixOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

describe('x402 storefront card pricing', () => {
  const items = loadItems();
  const priced = items
    .map((item) => ({ path: pathOf(item), credits: item.metadata?.credits, item }))
    .filter((r): r is { path: string; credits: number; item: Item } =>
      typeof r.path === 'string' && typeof r.credits === 'number');

  it('all template notations for one endpoint quote the same price', () => {
    const byPrefix = new Map<string, Array<{ path: string; credits: number }>>();
    for (const r of priced) {
      if (!isTemplatePath(r.path)) continue;
      const key = prefixOf(r.path);
      if (!byPrefix.has(key)) byPrefix.set(key, []);
      byPrefix.get(key)!.push({ path: r.path, credits: r.credits });
    }

    const conflicts: string[] = [];
    for (const [prefix, cards] of byPrefix) {
      const distinct = new Set(cards.map((c) => c.credits));
      if (distinct.size > 1) {
        conflicts.push(
          `${prefix}\n      ` + cards.map((c) => `${c.path} = ${c.credits} credits`).join('\n      '),
        );
      }
    }

    expect(
      conflicts,
      'The same endpoint is listed under two notations at two different prices, so which ' +
        'price an agent pays depends on which card its crawler happened to read:\n  ' +
        conflicts.join('\n  '),
    ).toEqual([]);
  });

  it('every split instance is priced exactly like its template', () => {
    const templateCredits = new Map<string, { path: string; credits: number }>();
    for (const r of priced) {
      if (isTemplatePath(r.path)) {
        templateCredits.set(prefixOf(r.path), { path: r.path, credits: r.credits });
      }
    }
    expect(templateCredits.size, 'expected at least one template card').toBeGreaterThan(0);

    const mismatches: string[] = [];
    for (const r of priced) {
      if (isTemplatePath(r.path)) continue;
      const parent = templateCredits.get(prefixOf(r.path));
      if (!parent) continue; // not part of a split family

      const expected = PRICE_OVERRIDES[r.path] ?? parent.credits;
      if (r.credits !== expected) {
        mismatches.push(
          `${r.path}: card says ${r.credits} credits, template ${parent.path} says ${parent.credits}`,
        );
      }
    }

    expect(
      mismatches,
      'A split instance advertises a different price than the endpoint it fans out from. ' +
        'The runtime prices the whole family off the template, so the instance card cannot be ' +
        'paid as advertised. Fix the credits inheritance in scripts/sync-x402-manifest.ts, or ' +
        'add an explicit PRICE_OVERRIDES entry if the runtime really does charge differently:\n  ' +
        mismatches.join('\n  '),
    ).toEqual([]);
  });

  it('accepts[].amount matches metadata.credits on every rail', () => {
    const bad: string[] = [];
    for (const r of priced) {
      const expected = String(r.credits * BASE_UNITS_PER_CREDIT);
      for (const accept of r.item.accepts ?? []) {
        if (accept.amount !== expected) {
          bad.push(
            `${r.path} [${accept.network ?? 'unknown-rail'}]: amount ${accept.amount} but ` +
              `${r.credits} credits should be ${expected}`,
          );
        }
      }
    }
    expect(
      bad,
      'The advertised USDC amount does not match the advertised credit count, so the card ' +
        'contradicts itself and an agent budgeting from either field pays the wrong number:\n  ' +
        bad.join('\n  '),
    ).toEqual([]);
  });
});
