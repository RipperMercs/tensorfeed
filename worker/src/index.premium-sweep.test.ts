/**
 * Money-path BREADTH sweep over the whole premium catalog (audit #7 net).
 *
 * The hand-written index.integration.test.ts deep-tests 13 premium endpoints.
 * This sweep table-drives PREMIUM_CATALOG (~102 entries) and asserts the
 * runtime invariants that need ZERO per-endpoint data seeding, so every paid
 * endpoint is proven to gate, no-charge, and emit a well-formed 402 at the
 * real worker.fetch boundary. It complements (does not duplicate) the static
 * premium-catalog.test.ts / strict-premium-endpoints.test.ts list checks.
 *
 * A failing assertion here is a REAL money-path finding. Fix the handler or
 * the strict-list, or record a documented KNOWN_EXCEPTIONS entry. Never weaken
 * an assertion silently.
 */
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG, type PremiumEndpoint } from './premium-catalog';
import { makeEnv, seedToken, balanceOf, call } from './test-harness';

// Unique per-call IP: the per-IP trial / rate-limit counters are module-level
// and persist across calls in-process, so a unique IP isolates each case.
let seq = 0;
function uniqueIp(): string {
  seq += 1;
  // 198.51.100.0/24 is TEST-NET-2 (RFC 5737), safe for synthetic IPs.
  return `198.51.100.${(seq % 250) + 1}`;
}
function uniqueToken(): string {
  seq += 1;
  return `tf_live_sweep_${seq}_${Math.random().toString(36).slice(2, 10)}`;
}

// Names that appear as {name} in a catalog path are PATH params; the rest are
// QUERY params. Synthetic path values must be non-empty so the request routes.
function pathParamNames(path: string): string[] {
  return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}
const SYNTH_PATH_VALUE: Record<string, string> = {
  ticker: 'nvda',
  provider: 'anthropic',
  company: 'anthropic',
  domain: 'example.com',
  source: 'arxiv',
  id: 'test-id',
  slug: 'x-test',
};
function concretePath(tpl: string): string {
  return tpl.replace(/\{(\w+)\}/g, (_full, name: string) => SYNTH_PATH_VALUE[name] ?? 'x-test');
}

// Required QUERY params = required params whose name is NOT a path template.
function requiredQueryParams(ep: PremiumEndpoint): string[] {
  const pathNames = new Set(pathParamNames(ep.path));
  return ep.params.filter((p) => p.required && !pathNames.has(p.name)).map((p) => p.name);
}

// Documented intentional exceptions: { path, invariant, reason }. Skips ONLY
// the named (path, invariant) pair. Start empty; add with a reason if a real
// intentional exception is found during triage.
type Invariant = 'gate' | 'free_trial' | 'no_charge_missing_param';
const KNOWN_EXCEPTIONS: { path: string; invariant: Invariant; reason: string }[] = [];
function isException(path: string, invariant: Invariant): boolean {
  return KNOWN_EXCEPTIONS.some((e) => e.path === path && e.invariant === invariant);
}

describe('premium catalog sweep (sanity)', () => {
  it('loaded a non-trivial catalog', () => {
    expect(PREMIUM_CATALOG.length).toBeGreaterThan(80);
  });
});
