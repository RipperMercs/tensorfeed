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
  // The clean/* and security/verified slug routes match only CVE-\d{4}-\d{4,7}
  // (index.ts cleanCveMatch et al.); a non-CVE value 404s before the gate, so a
  // routable CVE id is needed to reach requirePayment and assert the 402.
  cve_id: 'CVE-2026-0001',
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

// A no-token call to a strict-premium endpoint must return the canonical x402
// V2 402 challenge with a well-formed, size-bounded, btoa-safe header. Getting
// a 402 (not a 500) is itself the em-dash btoa() crash guard: a non-Latin1 char
// in a Bazaar pilot's metadata throws in btoa during challenge construction and
// the endpoint 500s instead. Decode + size assert the overflow guard.
function decodeChallengeHeader(b64: string | null): Record<string, unknown> {
  if (!b64) throw new Error('missing PAYMENT-REQUIRED header');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) as Record<string, unknown>;
}

describe('strict endpoints: no-token 402 gate + header health', () => {
  for (const ep of PREMIUM_CATALOG.filter((e) => e.strict_premium)) {
    it(`gates ${ep.path} with a well-formed 402`, async () => {
      if (isException(ep.path, 'gate')) return;
      const env = await makeEnv();
      const res = await call(env, concretePath(ep.path), { ip: uniqueIp() });

      // Invariant 1: canonical x402 V2 challenge, no free trial.
      expect(res.status).toBe(402);
      expect(res.json?.x402Version).toBe(2);
      expect(res.json?.error).toBe('payment_required');
      expect(res.json?.free_trial ?? null).toBeNull();

      // Invariant 4: PAYMENT-REQUIRED decodes, stays under 16KB, and the same
      // base64 rides WWW-Authenticate.
      const b64 = res.headers.get('PAYMENT-REQUIRED');
      expect(b64).not.toBeNull();
      expect((b64 as string).length).toBeLessThan(16000);
      const decoded = decodeChallengeHeader(b64);
      expect(Array.isArray(decoded.accepts)).toBe(true);
      expect(res.headers.get('WWW-Authenticate')).toContain(b64 as string);
    });
  }
});

// A no-token call to a NON-strict premium endpoint must NOT 402: it rides the
// per-IP free-trial pool and returns the endpoint's normal answer (usually a
// free-trial 200). A 402 here means the endpoint is mis-listed or the trial
// layer broke.
describe('non-strict premium endpoints: no-token is not a 402', () => {
  const nonStrict = PREMIUM_CATALOG.filter((e) => !e.strict_premium);
  if (nonStrict.length === 0) {
    it('no non-strict premium endpoints in the catalog (vacuously satisfied)', () => {
      expect(nonStrict.length).toBe(0);
    });
  }
  for (const ep of nonStrict) {
    it(`free-trials ${ep.path} on a no-token call`, async () => {
      if (isException(ep.path, 'free_trial')) return;
      const env = await makeEnv();
      const res = await call(env, concretePath(ep.path), { ip: uniqueIp() });
      expect(res.status).not.toBe(402);
    });
  }
});

// A VALID-token call to a strict endpoint that has a required QUERY param, made
// WITHOUT that param, must no-charge: the deferred debit must never commit, so
// the balance is held. The status may be a 400 validation no-charge or a 200
// empty no-charge; the money invariant is credits_charged === 0 AND balance
// unchanged (catches raw-4xx-after-payment for the param-required class).
describe('strict endpoints: missing required query param no-charges', () => {
  const candidates = PREMIUM_CATALOG.filter(
    (e) => e.strict_premium && requiredQueryParams(e).length > 0,
  );
  for (const ep of candidates) {
    it(`no-charges ${ep.path} when its required query param is absent`, async () => {
      if (isException(ep.path, 'no_charge_missing_param')) return;
      const env = await makeEnv();
      const token = uniqueToken();
      await seedToken(env, token, 100);

      // Path params are substituted (so it routes); required query params are
      // omitted. concretePath fills only the {path} template; we add no query.
      const res = await call(env, concretePath(ep.path), { token, ip: uniqueIp() });

      const billing = res.json?.billing as Record<string, unknown> | undefined;
      expect(billing).toBeDefined();
      expect(billing?.credits_charged).toBe(0);
      expect(typeof billing?.no_charge_reason).toBe('string');
      expect((billing?.no_charge_reason as string).length).toBeGreaterThan(0);
      // The hard invariant: the deferred debit never committed.
      expect(await balanceOf(env, token)).toBe(100);
    });
  }
});
