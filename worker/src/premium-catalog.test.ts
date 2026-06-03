/**
 * Drift guard for the premium catalog.
 *
 * The catalog (premium-catalog.ts) is a hand-maintained list, which is
 * exactly the failure mode the swarm audit warned about: a hand-list
 * silently drifts from the real handlers in index.ts. This suite reads
 * index.ts as TEXT, extracts every PAYABLE premium handler path, and
 * asserts the catalog is in lockstep with it in both directions:
 *
 *  1. Every premium handler in index.ts has a catalog row. Add a handler
 *     without a row and this FAILS (the whole point).
 *  2. Every catalog row maps to a real handler. No phantom rows.
 *  3. Each row's strict_premium matches isStrictPremiumPath() for the
 *     row's concrete path form.
 *  4. Credits are 1..10 and params are well-formed.
 *
 * Plus unit tests for buildPremiumCatalog() (count, credit_range, sort,
 * category sums).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG, buildPremiumCatalog } from './premium-catalog';
import { isStrictPremiumPath } from './strict-premium-endpoints';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = readFileSync(join(HERE, 'index.ts'), 'utf8');

// Tier -> real credit cost, mirrors TIER_COSTS in payments.ts. The handler
// passes a tier to requirePayment(request, env, tier); the catalog stores
// the charged credits.
const TIER_COSTS: Record<string, number> = { '1': 1, '2': 1, '3': 5, '4': 10 };

/**
 * Map a regex prefix handler (as written in index.ts) to the catalog's
 * concrete {param} template. Keyed by a stable substring of the regex.
 * If a new slug handler is added without a mapping here, it shows up as
 * an unmapped handler and the coverage assertion flags it (drift caught).
 */
const REGEX_TO_TEMPLATE: { marker: string; template: string }[] = [
  { marker: 'clean\\/cve', template: '/api/premium/clean/cve/{cve_id}' },
  { marker: 'clean\\/kev', template: '/api/premium/clean/kev/{cve_id}' },
  { marker: 'clean\\/epss', template: '/api/premium/clean/epss/{cve_id}' },
  { marker: 'security\\/verified', template: '/api/premium/security/verified/{cve_id}' },
  { marker: 'status\\/([a-z]+)\\/incidents\\/triage', template: '/api/premium/status/{provider}/incidents/triage' },
  { marker: 'ai-companies', template: '/api/premium/ai-companies/{ticker}' },
  { marker: 'x402-index\\/publisher', template: '/api/premium/x402-index/publisher/{domain}' },
  { marker: 'providers', template: '/api/premium/providers/{name}' },
  { marker: 'watches', template: '/api/premium/watches/{id}' },
];

/**
 * Concrete path used to probe isStrictPremiumPath() for a catalog row.
 * Slug templates resolve to a real-shaped value; exact paths pass through.
 */
const CONCRETE: Record<string, string> = {
  '/api/premium/clean/cve/{cve_id}': '/api/premium/clean/cve/CVE-2024-0001',
  '/api/premium/clean/kev/{cve_id}': '/api/premium/clean/kev/CVE-2024-0001',
  '/api/premium/clean/epss/{cve_id}': '/api/premium/clean/epss/CVE-2024-0001',
  '/api/premium/security/verified/{cve_id}': '/api/premium/security/verified/CVE-2024-0001',
  '/api/premium/status/{provider}/incidents/triage': '/api/premium/status/openai/incidents/triage',
  '/api/premium/ai-companies/{ticker}': '/api/premium/ai-companies/NVDA',
  '/api/premium/x402-index/publisher/{domain}': '/api/premium/x402-index/publisher/example.com',
  '/api/premium/providers/{name}': '/api/premium/providers/openai',
};

function concreteForm(path: string): string {
  return CONCRETE[path] ?? path;
}

/**
 * Documented exclusions: premium-prefixed handlers that are NOT part of
 * the buyable catalog. Both are the watch-management routes that require a
 * bearer token but charge ZERO credits (no requirePayment with a tier),
 * so they are not "what can I buy" surfaces.
 */
const EXCLUDED_HANDLER_PATHS = new Set<string>([
  // GET /api/premium/watches (list, token-gated, 0 credits). The POST form
  // at the same path IS in the catalog; this Set only removes the path from
  // the "missing handler" diff for the free GET variant, which shares the path.
  // (No effect on coverage since the path is present via the POST row.)
  '/api/premium/watches/{id}', // GET|DELETE manage, token-gated, 0 credits
]);

interface ExtractedHandler {
  path: string;
  tier: number | null;
  line: number;
}

/**
 * Walk index.ts line by line and pull every premium handler: exact-match
 * `if (path === '/api/premium/...')` and regex prefix
 * `... = path.match(/^\/api\/premium\/.../)`. Pair each with the nearest
 * following requirePayment(request, env, TIER) within a window. A null
 * tier means the handler charges no credits (free management route).
 */
function extractHandlers(): ExtractedHandler[] {
  const lines = INDEX_SRC.split(/\r?\n/);
  const handlers: { path: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const exact = L.match(/if \(path === '(\/api\/premium\/[^']+)'/);
    if (exact) {
      handlers.push({ path: exact[1], line: i + 1 });
      continue;
    }
    const regex = L.match(/=\s*path\.match\((\/\^\\\/api\\\/premium[^;]*)\);/);
    if (regex) {
      const raw = regex[1];
      // markers are literal substrings of the raw regex source (which keeps
      // its backslash-escaped slashes), so use includes, not RegExp.
      const hit = REGEX_TO_TEMPLATE.find((r) => raw.includes(r.marker));
      // An unmapped slug handler resolves to its raw regex so it cannot
      // silently match a catalog row; the coverage test will surface it.
      handlers.push({ path: hit ? hit.template : `UNMAPPED_REGEX:${raw}`, line: i + 1 });
    }
  }

  return handlers.map((h) => {
    let tier: number | null = null;
    for (let j = h.line - 1; j < Math.min(h.line - 1 + 70, lines.length); j++) {
      const pay = lines[j].match(/requirePayment\(request, env, (\d+)\)/);
      if (pay) {
        tier = parseInt(pay[1], 10);
        break;
      }
    }
    return { path: h.path, tier, line: h.line };
  });
}

const HANDLERS = extractHandlers();

/** Paid handler paths (tier != null), deduped. */
const PAID_HANDLER_PATHS = [
  ...new Set(
    HANDLERS.filter((h) => h.tier !== null && !EXCLUDED_HANDLER_PATHS.has(h.path)).map((h) => h.path),
  ),
];

const CATALOG_PATHS = new Set(PREMIUM_CATALOG.map((e) => e.path));

describe('premium catalog drift guard', () => {
  it('extracted at least 80 paid premium handlers (sanity)', () => {
    // If this number collapses the extractor regex drifted, not the catalog.
    expect(PAID_HANDLER_PATHS.length).toBeGreaterThanOrEqual(80);
  });

  it('every paid premium handler has a catalog row', () => {
    const missing = PAID_HANDLER_PATHS.filter((p) => !CATALOG_PATHS.has(p));
    expect(missing).toEqual([]);
  });

  it('every catalog row maps to a real paid handler (no phantom rows)', () => {
    const real = new Set(PAID_HANDLER_PATHS);
    const phantom = [...CATALOG_PATHS].filter((p) => !real.has(p));
    expect(phantom).toEqual([]);
  });

  it('no unmapped slug handlers slipped through the regex map', () => {
    const unmapped = HANDLERS.filter((h) => h.path.startsWith('UNMAPPED_REGEX:'));
    expect(unmapped).toEqual([]);
  });

  it('each catalog row credits equal the handler tier cost', () => {
    // Build path -> tier from the extracted handlers (paid only).
    const tierByPath = new Map<string, number>();
    for (const h of HANDLERS) {
      if (h.tier !== null && !tierByPath.has(h.path)) tierByPath.set(h.path, h.tier);
    }
    const mismatches: string[] = [];
    for (const e of PREMIUM_CATALOG) {
      const tier = tierByPath.get(e.path);
      if (tier === undefined) continue; // phantom check covers this
      const expected = TIER_COSTS[String(tier)];
      if (e.credits !== expected) {
        mismatches.push(`${e.path}: catalog ${e.credits} vs tier ${tier} -> ${expected}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('each row strict_premium matches isStrictPremiumPath(concrete form)', () => {
    const wrong: string[] = [];
    for (const e of PREMIUM_CATALOG) {
      const actual = isStrictPremiumPath(concreteForm(e.path));
      if (actual !== e.strict_premium) {
        wrong.push(`${e.path}: catalog ${e.strict_premium} vs isStrictPremiumPath ${actual}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('credits are integers in 1..10 and params are well-formed', () => {
    for (const e of PREMIUM_CATALOG) {
      expect(Number.isInteger(e.credits)).toBe(true);
      expect(e.credits).toBeGreaterThanOrEqual(1);
      expect(e.credits).toBeLessThanOrEqual(10);
      expect(e.signed).toBe(true);
      expect(typeof e.returns).toBe('string');
      expect(e.returns.length).toBeGreaterThan(0);
      expect(Array.isArray(e.params)).toBe(true);
      for (const p of e.params) {
        expect(typeof p.name).toBe('string');
        expect(p.name.length).toBeGreaterThan(0);
        expect(typeof p.required).toBe('boolean');
      }
      if (e.free_sibling !== null) {
        expect(typeof e.free_sibling).toBe('string');
        expect(e.free_sibling.startsWith('/api/')).toBe(true);
      }
    }
  });

  it('every catalog path starts with /api/premium/ and is unique', () => {
    const seen = new Set<string>();
    for (const e of PREMIUM_CATALOG) {
      expect(e.path.startsWith('/api/premium/')).toBe(true);
      expect(seen.has(e.path)).toBe(false);
      seen.add(e.path);
    }
  });

  it('no em dashes or double hyphens in catalog text fields', () => {
    for (const e of PREMIUM_CATALOG) {
      const text = `${e.path} ${e.returns} ${e.free_sibling ?? ''} ${e.category}`;
      expect(text).not.toContain('—'); // em dash
      expect(text).not.toContain('--');
    }
  });
});

describe('buildPremiumCatalog()', () => {
  const built = buildPremiumCatalog();

  it('ok and count equals catalog length', () => {
    expect(built.ok).toBe(true);
    expect(built.count).toBe(PREMIUM_CATALOG.length);
    expect(built.endpoints.length).toBe(PREMIUM_CATALOG.length);
  });

  it('credit_range matches the min/max across rows', () => {
    const credits = PREMIUM_CATALOG.map((e) => e.credits);
    expect(built.credit_range.min).toBe(Math.min(...credits));
    expect(built.credit_range.max).toBe(Math.max(...credits));
  });

  it('endpoints are sorted by category then path', () => {
    const eps = built.endpoints;
    for (let i = 1; i < eps.length; i++) {
      const a = eps[i - 1];
      const b = eps[i];
      const order = a.category < b.category ? -1 : a.category > b.category ? 1 : a.path <= b.path ? -1 : 1;
      expect(order).toBeLessThanOrEqual(0);
    }
  });

  it('per-category counts sum to the total count', () => {
    const sum = Object.values(built.categories).reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(built.count);
  });

  it('carries the note and attribution', () => {
    expect(built.note).toContain('USDC on Base');
    expect(built.note).toContain('50-credit welcome bonus');
    expect(built.attribution).toContain('TensorFeed.ai premium catalog');
  });
});
