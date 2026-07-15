/**
 * Unit tests for the pre-payment premium input guard.
 *
 * Money-path regression (2026-07-14). On 2026-07-13 a single agent wallet
 * settled 30 x $0.02 USDC on Base against param-required premium endpoints
 * while sending NO query params. Every call paid on-chain inside
 * requirePayment and only THEN hit the handler's param check, which returned
 * a 400 schema_validation_failure. The deferred debit meant no credit was
 * spent, but the USDC was already gone: the agent minted a fresh bearer token
 * per call, got an error, and discarded the token. It repeated the same
 * 10-endpoint sweep three times.
 *
 * The guard below runs BEFORE requirePayment, so a request missing its
 * required params is rejected for free and never reaches a settlement.
 */
import { describe, it, expect } from 'vitest';
import {
  checkPremiumInput,
  PREMIUM_REQUIRED_PARAMS,
  NON_QUERY_INPUT,
  premiumBodyErrorBody,
} from './premium-input-guard';
import { PREMIUM_CATALOG } from './premium-catalog';

function check(path: string, query = '') {
  return checkPremiumInput(path, new URLSearchParams(query));
}

describe('checkPremiumInput', () => {
  it('passes through any path with no declared requirements', () => {
    expect(check('/api/premium/whats-new').ok).toBe(true);
    expect(check('/api/news').ok).toBe(true);
  });

  it('rejects a bare call to a single-param endpoint and names the missing param', () => {
    const r = check('/api/premium/history/status/uptime');
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.missing).toEqual(['provider']);
    expect(r.hint).toContain('provider');
  });

  it('accepts the single-param endpoint once the param is present', () => {
    expect(check('/api/premium/history/status/uptime', 'provider=openai').ok).toBe(true);
  });

  it('treats an empty-string param as missing', () => {
    expect(check('/api/premium/history/status/uptime', 'provider=').ok).toBe(false);
    expect(check('/api/premium/history/status/uptime', 'provider=%20%20').ok).toBe(false);
  });

  it('requires every param in a conjunctive rule', () => {
    expect(check('/api/premium/history/benchmarks/series', 'model=claude-opus-4-7').ok).toBe(false);
    expect(check('/api/premium/history/benchmarks/series', 'benchmark=swe_bench').ok).toBe(false);
    expect(
      check('/api/premium/history/benchmarks/series', 'model=claude-opus-4-7&benchmark=swe_bench').ok,
    ).toBe(true);
  });

  it('honors alias params (cve_id or cve)', () => {
    expect(check('/api/premium/security/epss/series').ok).toBe(false);
    expect(check('/api/premium/security/epss/series', 'cve_id=CVE-2024-3094').ok).toBe(true);
    expect(check('/api/premium/security/epss/series', 'cve=CVE-2024-3094').ok).toBe(true);
  });

  it('honors alternative param-sets (date OR from+to)', () => {
    expect(check('/api/premium/history/news/clusters/full').ok).toBe(false);
    expect(check('/api/premium/history/news/clusters/full', 'date=2026-07-01').ok).toBe(true);
    expect(check('/api/premium/history/news/clusters/full', 'from=2026-07-01&to=2026-07-07').ok).toBe(true);
    // A partial alternative is still a miss.
    expect(check('/api/premium/history/news/clusters/full', 'from=2026-07-01').ok).toBe(false);
  });

  it('requires all three cost-projection inputs', () => {
    expect(check('/api/premium/cost/projection', 'model=gpt-5-5').ok).toBe(false);
    expect(
      check('/api/premium/cost/projection', 'model=gpt-5-5&input_tokens_per_day=1000000').ok,
    ).toBe(false);
    expect(
      check(
        '/api/premium/cost/projection',
        'models=gpt-5-5&input_tokens_per_day=1000000&output_tokens_per_day=200000',
      ).ok,
    ).toBe(true);
  });

  it('covers every endpoint in the 2026-07-13 unpaid sweep', () => {
    // The exact 10 paths the agent burned USDC on. Each must be guarded, or
    // the same wallet can pay for a 400 again.
    const swept = [
      '/api/premium/cost/projection',
      '/api/premium/compare/models',
      '/api/premium/history/pricing/series',
      '/api/premium/history/benchmarks/series',
      '/api/premium/history/status/uptime',
      '/api/premium/security/cve/range',
      '/api/premium/security/kev/series',
      '/api/premium/security/epss/series',
      '/api/premium/history/news/clusters/full',
      '/api/premium/history/news/verified',
    ];
    for (const path of swept) {
      expect(PREMIUM_REQUIRED_PARAMS[path], `${path} must be guarded`).toBeDefined();
      expect(check(path).ok, `${path} bare call must be rejected`).toBe(false);
    }
  });

  // Drift guard. The public catalog (/api/premium/catalog, /developers, the MCP
  // tool descriptions) is what an agent reads to decide how to call us. If it
  // marks a param required, the guard MUST reject a call that omits it, or we
  // are back to advertising a requirement and then billing for the 400.
  it('enforces every param the public catalog declares required', () => {
    for (const ep of PREMIUM_CATALOG) {
      // Endpoints whose required input is a POST body, not a query param.
      if (NON_QUERY_INPUT.has(ep.path)) continue;
      const required = ep.params.filter((p) => p.required).map((p) => p.name);
      if (required.length === 0) continue;
      // Path-template params ({cve_id}) are enforced by routing, not the guard.
      const pathParams = new Set([...ep.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
      const queryRequired = required.filter((n) => !pathParams.has(n));
      if (queryRequired.length === 0) continue;

      const spec = PREMIUM_REQUIRED_PARAMS[ep.path];
      expect(
        spec,
        `${ep.path} declares required query params ${queryRequired.join(', ')} in PREMIUM_CATALOG but has no guard entry, so a bare call would settle on-chain and then 400`,
      ).toBeDefined();

      // Every catalog-required name must appear somewhere in the guard's rules
      // (directly, or as one side of an alias like "cve_id|cve").
      const guarded = new Set(spec.rules.flat().flatMap((n) => n.split('|')));
      for (const name of queryRequired) {
        expect(guarded.has(name), `${ep.path}: catalog requires "${name}" but the guard does not enforce it`).toBe(true);
      }
    }
  });

  it('only guards paths that actually exist in the premium catalog', () => {
    const known = new Set(PREMIUM_CATALOG.map((e) => e.path));
    for (const path of Object.keys(PREMIUM_REQUIRED_PARAMS)) {
      expect(known.has(path), `${path} is guarded but is not a premium catalog endpoint`).toBe(true);
    }
  });

  it('every curated example actually satisfies its own spec', () => {
    for (const [path, spec] of Object.entries(PREMIUM_REQUIRED_PARAMS)) {
      if (!spec.example) continue; // catalog-derived specs carry no example
      const r = checkPremiumInput(path, new URLSearchParams(spec.example));
      expect(r.ok, `${path}: example "${spec.example}" does not satisfy its own rules`).toBe(true);
    }
  });

  it('never guards a POST endpoint whose input is a request body', () => {
    // cve-check reads `lockfile` from the POST body. If the guard ever claimed
    // it, every legitimate cve-check call would 400 on a missing query param.
    expect(PREMIUM_REQUIRED_PARAMS['/api/premium/cve-check']).toBeUndefined();
  });

  it('always supplies a non-empty hint for a guarded path', () => {
    for (const path of Object.keys(PREMIUM_REQUIRED_PARAMS)) {
      const r = check(path);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.hint.length).toBeGreaterThan(0);
      expect(r.missing.length).toBeGreaterThan(0);
    }
  });
});

describe('premiumBodyErrorBody', () => {
  it('surfaces the parser error and hint and states no payment was taken', () => {
    const body = premiumBodyErrorBody('/api/premium/cve-check', 'empty_body', 'POST a lockfile.');
    expect(body.ok).toBe(false);
    expect(body.error).toBe('empty_body');
    expect(body.endpoint).toBe('/api/premium/cve-check');
    expect(body.hint).toBe('POST a lockfile.');
    // The agent needs to know a 400 here means nothing settled.
    expect(body.payment).toBe('none');
    expect(typeof body.message).toBe('string');
  });
});
