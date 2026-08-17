/**
 * Handler-reads-what-the-catalog-declares guard.
 *
 * premium-input-guard derives the pre-payment check from PREMIUM_CATALOG, so the
 * catalog and the money path agree about what is REQUIRED. Nothing checked that
 * the handler then reads the same NAME. When those two drift the endpoint
 * becomes unreachable through every published form, and both failure directions
 * are bad:
 *
 *   caller sends the advertised name  -> guard 400s before payment, so the
 *                                        Bazaar card converts at zero
 *   caller sends the catalog name     -> guard passes, payment settles, and
 *                                        the handler then reports missing_params
 *
 * That shipped on /api/premium/ai-cves/cve: the catalog and guard declared
 * cve_id while the card, llms.txt, the 402 body, and the handler all used id.
 * The only working call was ?cve_id=X&id=X, which no surface documented.
 *
 * This test reads the handler source and asserts every required param the
 * catalog declares is actually read there, counting aliases. It is deliberately
 * source-scanning rather than behavioral: exercising it for real would mean
 * paying, since these endpoints are strict-premium and the handler body only
 * runs after requirePayment settles.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG } from './premium-catalog';
import { NON_QUERY_INPUT, PREMIUM_REQUIRED_PARAMS } from './premium-input-guard';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = readFileSync(join(HERE, 'index.ts'), 'utf8');

/**
 * Slice the handler block for one path: from its `path === '<path>'` test up to
 * the next such test. Handlers are declared as a flat if-chain in index.ts, so
 * this bounds each block without needing to parse the file.
 */
function handlerBlock(path: string): string | null {
  const marker = `path === '${path}'`;
  const start = INDEX_SRC.indexOf(marker);
  if (start === -1) return null;
  const next = INDEX_SRC.indexOf("path === '", start + marker.length);
  return INDEX_SRC.slice(start, next === -1 ? INDEX_SRC.length : next);
}

/** Every spelling the guard would accept for one declared rule entry. */
function aliasesFor(name: string): string[] {
  return name.split('|').map((n) => n.trim()).filter(Boolean);
}

describe('premium handlers read the params their catalog row declares', () => {
  const checked: string[] = [];
  const problems: string[] = [];
  const unlocatable: string[] = [];

  for (const ep of PREMIUM_CATALOG) {
    if (NON_QUERY_INPUT.has(ep.path)) continue;
    const spec = PREMIUM_REQUIRED_PARAMS[ep.path];
    if (!spec) continue;

    const block = handlerBlock(ep.path);
    if (block === null) {
      // Path-param routes and prefix-matched families are not declared with a
      // literal equality test, so there is no block to scan. Recorded rather
      // than silently skipped, so shrinking coverage is visible.
      unlocatable.push(ep.path);
      continue;
    }
    checked.push(ep.path);

    // Count actual READS, not mentions. A bare word match is not good enough:
    // the declared name usually also appears in the handler's own hint string
    // ("Pass cve_id=..."), so a handler that only talks about the param would
    // pass while still not reading it. These patterns cover the ways handlers
    // legitimately reach a param: searchParams.get('x'), params.get('x'), and
    // a pre-parsed object (parsed.query.x).
    const readsOne = (a: string): boolean => {
      const e = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(searchParams|params)\\.get\\(\\s*['"\`]${e}['"\`]`).test(block)
        || new RegExp(`\\.query\\.${e}\\b`).test(block)
        || new RegExp(`\\bquery\\.${e}\\b`).test(block);
    };

    // EVERY alias, not just one. The guard admits any spelling in an alias
    // group, so a handler that reads only one of them still strands the other:
    // that caller clears the pre-payment guard, settles USDC, and only then
    // gets missing_params. Requiring the handler to read every accepted
    // spelling is what makes an alias safe to declare.
    const reads = (name: string) => aliasesFor(name).every(readsOne);

    // A rule is a set of params required together; several rules mean any one
    // set satisfies the guard. A handler only has to satisfy one rule.
    const ruleSatisfied = spec.rules.map((rule) => rule.every(reads));
    if (ruleSatisfied.some(Boolean)) continue;

    // Delegation: a handler may hand the whole URL to a parser that reads the
    // params itself (decision-verified/search calls parseSearchQuery(url),
    // which reads 'q' inside decision-verified.ts). The param really is read,
    // just not in a slice we can see, so skip rather than report a false
    // positive. Narrow on purpose: only a call taking url or url.searchParams
    // as an argument counts, so a handler that simply ignores its params is
    // still caught.
    if (/\w+\(\s*url(\.searchParams)?\s*[,)]/.test(block)) continue;

    const declared = spec.rules
      .map((rule) => rule.map((n) => aliasesFor(n).join(' or ')).join(' + '))
      .join('  OR  ');
    const observed = [...block.matchAll(/searchParams\.get\('([^']+)'\)/g)].map((m) => m[1]);
    problems.push(
      `${ep.path}\n      guard requires: ${declared}\n      handler reads:  ${
        observed.length ? [...new Set(observed)].join(', ') : '(no query params at all)'
      }`,
    );
  }

  it('locates a handler block for most param-required premium endpoints', () => {
    expect(checked.length, 'expected to scan at least a few handlers').toBeGreaterThan(3);
  });

  it('every required param is actually read by its handler', () => {
    expect(
      problems,
      'These endpoints cannot be called through any documented form. The guard admits one ' +
        'param name and the handler reads another, so the advertised spelling 400s before ' +
        'payment while the catalog spelling fails after it. Either read the declared name in ' +
        'the handler, or declare an alias in premium-input-guard OVERRIDES:\n  ' +
        problems.join('\n  '),
    ).toEqual([]);
  });
});
