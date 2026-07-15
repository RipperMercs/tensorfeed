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
import { PREMIUM_REQUIRED_PARAMS } from './premium-input-guard';
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

// A param-required endpoint is only ever offered a 402 once its required query
// params are present: since 2026-07-13 the pre-payment input guard rejects a
// bare call with a free 400 BEFORE the payment gate (see premium-input-guard.ts,
// index.validate-before-settle.test.ts). So the 402 invariant below is asserted
// against a call the guard lets through, which is exactly the call a real paying
// agent makes. Endpoints with no guard entry are unchanged (bare path).
function payableUrl(path: string): string {
  const concrete = concretePath(path);
  const spec = PREMIUM_REQUIRED_PARAMS[path];
  if (!spec) return concrete;
  // Prefer the curated example. Otherwise synthesize a value per param in the
  // first rule: the guard only checks presence, and the 402 gate fires before
  // the handler ever inspects the VALUE, so a placeholder is sufficient here.
  const query =
    spec.example ??
    spec.rules[0].map((name) => `${name.split('|')[0]}=x-test`).join('&');
  return `${concrete}?${query}`;
}

describe('strict endpoints: no-token 402 gate + header health', () => {
  for (const ep of PREMIUM_CATALOG.filter((e) => e.strict_premium)) {
    it(`gates ${ep.path} with a well-formed 402`, async () => {
      if (isException(ep.path, 'gate')) return;
      const env = await makeEnv();
      const res = await call(env, payableUrl(ep.path), { ip: uniqueIp() });

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

// A call to a strict endpoint that has a required QUERY param, made WITHOUT
// that param, must be rejected for FREE and BEFORE the payment gate.
//
// This used to assert the weaker "pay first, then no-charge" contract: the
// deferred debit never committed, so credits_charged was 0 and the balance was
// held. That was true but insufficient. On the fresh-mint x402 path
// requirePayment SETTLES USDC on chain before the handler ever reads the query
// string, so a bare call still cost the agent real money even though it cost
// them no credits. On 2026-07-13 one wallet burned 30 x $0.02 that way.
//
// The invariant is now the stronger one: no 402 challenge is issued at all, so
// no x402 client can settle, and the credit balance is untouched.
describe('strict endpoints: missing required query param is rejected free, pre-payment', () => {
  const candidates = PREMIUM_CATALOG.filter(
    (e) =>
      e.strict_premium &&
      requiredQueryParams(e).length > 0 &&
      // Guard-covered only. An endpoint whose required input is a POST body
      // (cve-check: `lockfile`) cannot be judged on its query string; see the
      // dedicated case below.
      PREMIUM_REQUIRED_PARAMS[e.path] !== undefined,
  );
  for (const ep of candidates) {
    it(`rejects ${ep.path} for free when its required query param is absent`, async () => {
      if (isException(ep.path, 'no_charge_missing_param')) return;
      const env = await makeEnv();
      const token = uniqueToken();
      await seedToken(env, token, 100);

      // Path params are substituted (so it routes); required query params are
      // omitted. concretePath fills only the {path} template; we add no query.
      const res = await call(env, concretePath(ep.path), { token, ip: uniqueIp() });

      // Never a 402: that is the only thing an x402 client would settle against.
      expect(res.status).not.toBe(402);
      expect(res.status).toBe(400);
      expect(res.json?.error).toBe('missing_required_params');
      // Rejected ahead of the payment gate, so there is nothing to bill.
      expect(res.json?.billing ?? null).toBeNull();
      // The hard invariant: the deferred debit never committed.
      expect(await balanceOf(env, token)).toBe(100);
    });
  }

  // GAP CLOSED (2026-07-15). cve-check is a POST that reads `lockfile` from the
  // request BODY, so the query-string guard could not cover it: it used to take
  // the OLD path where requirePayment settled first (50 credits, $1.00 on the
  // fresh-mint x402 rail) and only then rejected the empty body as a no-charge,
  // so a bodyless x402 POST spent real USDC for a 400. The pre-payment BODY
  // guard now validates the lockfile ahead of the payment gate, so a malformed
  // POST is rejected for a free 400 and never reaches a settlement. Full
  // money-path coverage lives in index.validate-before-settle.test.ts; this
  // pins the credit-balance invariant alongside the query-param sweep.
  it('cve-check rejects a malformed POST for free, before the payment gate, balance held', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);

    const res = await call(env, '/api/premium/cve-check', {
      method: 'POST',
      body: JSON.stringify({}),
      token,
      ip: uniqueIp(),
    });

    // Never a 402: that is the only thing an x402 client would settle against.
    expect(res.status).not.toBe(402);
    expect(res.status).toBe(400);
    expect(res.json?.error).toBe('no_packages');
    // Rejected ahead of the payment gate, so there is nothing to bill.
    expect(res.json?.billing ?? null).toBeNull();
    expect(res.json?.payment).toBe('none');
    // The hard invariant: the credit balance is untouched.
    expect(await balanceOf(env, token)).toBe(100);
  });
});
