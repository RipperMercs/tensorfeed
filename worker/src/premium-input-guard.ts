/**
 * Pre-payment input guard for param-required premium endpoints.
 *
 * Why this exists (2026-07-13 money-path incident):
 *
 * Every premium handler validated its query params AFTER requirePayment had
 * already run. On the fresh-mint x402 path requirePayment SETTLES USDC on
 * chain and mints a bearer token, so a request missing its required params
 * paid first and got rejected second. The deferred debit meant no credit was
 * spent, but the on-chain USDC was already gone. One agent wallet burned
 * 30 x $0.02 across a 10-endpoint sweep it ran three times, minting and
 * discarding a token every call, and never received a single row of data.
 *
 * This guard is a pure, declarative, zero-I/O check that the router runs
 * BEFORE any premium handler (and therefore before requirePayment). A request
 * missing its required params gets a free 400 that names exactly what to send.
 * No 402 challenge is issued, so a spec-compliant x402 client never settles.
 *
 * The per-handler validators are deliberately left in place as a backstop: if
 * this table ever drifts from a handler's real requirements, the worst case is
 * the old post-payment behavior, not a wrong 400 or a free premium call.
 */

/**
 * A rule is one acceptable way to satisfy an endpoint, expressed as the set of
 * params that must ALL be present. An endpoint declares one or more rules and
 * is satisfied when ANY single rule is fully satisfied.
 *
 * A param name may declare aliases with `|` ("cve_id|cve"), meaning any one of
 * those names counts as present.
 *
 * Examples:
 *   [['provider']]                    provider is required
 *   [['model', 'benchmark']]          both are required
 *   [['date'], ['from', 'to']]        date, OR from AND to
 *   [['cve_id|cve']]                  either spelling works
 */
import { PREMIUM_CATALOG, type PremiumEndpoint } from './premium-catalog';

export interface PremiumInputSpec {
  rules: string[][];
  hint: string;
  /** A query string that satisfies the spec. Served in the 400 so an agent can
   *  copy a known-good call, and reused by the tests as the canonical fixture.
   *  Curated per endpoint; absent on specs derived straight from the catalog. */
  example?: string;
}

export type PremiumInputCheck =
  | { ok: true }
  | { ok: false; missing: string[]; hint: string; rules: string[][]; example?: string };

/**
 * Endpoints whose declared-required input is NOT a query param, so this guard
 * (which reads only the query string) must never speak for them. Listing one
 * here is a statement that the handler reads the value from somewhere else.
 */
export const NON_QUERY_INPUT: ReadonlySet<string> = new Set<string>([
  // POST. `lockfile` is the request BODY, not ?lockfile=. Guarding it on the
  // query string would 400 every legitimate cve-check call.
  '/api/premium/cve-check',
]);

/** Path-template params ({ticker}) are satisfied by routing, not the query. */
function pathParamNames(path: string): string[] {
  return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

/** The query params PREMIUM_CATALOG declares this endpoint cannot work without. */
function catalogRequiredQueryParams(ep: PremiumEndpoint): string[] {
  const inPath = new Set(pathParamNames(ep.path));
  return ep.params.filter((p) => p.required && !inPath.has(p.name)).map((p) => p.name);
}

/**
 * Curated overrides. Two things the catalog's flat {name, required} shape
 * cannot express, and which a derived rule would therefore get wrong:
 *
 *   - aliases:      cve_id OR cve; ids OR models
 *   - alternatives: date OR (from AND to)
 *
 * These also carry a hand-written hint and a copy-pasteable example. An entry
 * here fully replaces whatever would have been derived from the catalog.
 */
const OVERRIDES: Record<string, PremiumInputSpec> = {
  '/api/premium/cost/projection': {
    rules: [['model|models', 'input_tokens_per_day', 'output_tokens_per_day']],
    hint: 'Pass ?model=<id[,id]>&input_tokens_per_day=<n>&output_tokens_per_day=<n>',
    example: 'model=claude-opus-4-7,gpt-5-5&input_tokens_per_day=1000000&output_tokens_per_day=200000',
  },
  '/api/premium/compare/models': {
    rules: [['ids|models']],
    hint: 'Pass ?ids=<id,id[,id]> with 2 to 5 model ids',
    example: 'ids=claude-opus-4-7,gpt-5-5',
  },
  '/api/premium/history/pricing/series': {
    rules: [['model']],
    hint: 'Pass ?model=<id-or-name>, optionally &from=YYYY-MM-DD&to=YYYY-MM-DD',
    example: 'model=claude-opus-4-7',
  },
  '/api/premium/history/benchmarks/series': {
    rules: [['model', 'benchmark']],
    hint: 'Pass ?model=<id-or-name>&benchmark=<swe_bench|mmlu_pro|gpqa_diamond|math|human_eval>',
    example: 'model=claude-opus-4-7&benchmark=swe_bench',
  },
  '/api/premium/history/status/uptime': {
    rules: [['provider']],
    hint: 'Pass ?provider=<name>, optionally &from=YYYY-MM-DD&to=YYYY-MM-DD',
    example: 'provider=openai',
  },
  '/api/premium/security/cve/range': {
    rules: [['from', 'to']],
    hint: 'Pass ?from=YYYY-MM-DD&to=YYYY-MM-DD (30 days max)',
    example: 'from=2026-05-01&to=2026-05-07',
  },
  '/api/premium/security/kev/series': {
    rules: [['from', 'to']],
    hint: 'Pass ?from=YYYY-MM-DD&to=YYYY-MM-DD (90 days max)',
    example: 'from=2026-03-01&to=2026-03-31',
  },
  '/api/premium/security/epss/series': {
    rules: [['cve_id|cve']],
    hint: 'Pass ?cve_id=CVE-YYYY-NNNNN',
    example: 'cve_id=CVE-2024-3094',
  },
  '/api/premium/history/news/clusters/full': {
    rules: [['date'], ['from', 'to']],
    hint: 'Pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD (30 days max)',
    example: 'date=2026-07-01',
  },
  '/api/premium/history/news/verified': {
    rules: [['date'], ['from', 'to']],
    hint: 'Pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD (30 days max)',
    example: 'date=2026-07-01',
  },
};

/**
 * The live table: every catalog endpoint that declares required query params,
 * plus the curated overrides. Derived from PREMIUM_CATALOG so a new
 * param-required endpoint is protected the day it ships, and so the public
 * catalog and the money path can never disagree about what is required.
 */
export const PREMIUM_REQUIRED_PARAMS: Record<string, PremiumInputSpec> = (() => {
  const table: Record<string, PremiumInputSpec> = {};
  for (const ep of PREMIUM_CATALOG) {
    if (NON_QUERY_INPUT.has(ep.path)) continue;
    const required = catalogRequiredQueryParams(ep);
    if (required.length === 0) continue;
    table[ep.path] = {
      rules: [required],
      hint: `Pass ${required.map((n) => `?${n}=<value>`).join(' and ')}`,
    };
  }
  for (const [path, spec] of Object.entries(OVERRIDES)) {
    table[path] = spec;
  }
  return table;
})();

/** A param counts as present only when it carries a non-blank value. */
function isPresent(params: URLSearchParams, name: string): boolean {
  for (const alias of name.split('|')) {
    const v = params.get(alias);
    if (v !== null && v.trim().length > 0) return true;
  }
  return false;
}

/**
 * Check a premium request's query params against the declared requirements.
 * Pure: no KV, no network, no payment state. Unknown paths always pass, so an
 * endpoint absent from the table behaves exactly as it does today.
 *
 * When several rules are declared (date OR from+to), the reported `missing`
 * set comes from the rule the caller came closest to satisfying, so the hint
 * points at the path of least effort rather than an arbitrary first rule.
 */
/**
 * Resolve a concrete request path to a catalog {param} template key.
 * Segment-count exact, template segments in braces are wildcards. First
 * template row wins; templates never overlap in the catalog today.
 * Needed the moment a slug endpoint also has REQUIRED QUERY params
 * (first case: /api/premium/time-machine/{dataset}?date=), because the
 * request path arrives concrete while the guard table is keyed by the
 * catalog template.
 */
function templateKeyFor(path: string): string | null {
  const pathSegs = path.split('/');
  for (const key of Object.keys(PREMIUM_REQUIRED_PARAMS)) {
    if (!key.includes('{')) continue;
    const tmplSegs = key.split('/');
    if (tmplSegs.length !== pathSegs.length) continue;
    let match = true;
    for (let i = 0; i < tmplSegs.length; i++) {
      if (tmplSegs[i].startsWith('{') && tmplSegs[i].endsWith('}')) continue;
      if (tmplSegs[i] !== pathSegs[i]) {
        match = false;
        break;
      }
    }
    if (match) return key;
  }
  return null;
}

export function checkPremiumInput(path: string, params: URLSearchParams): PremiumInputCheck {
  const spec = PREMIUM_REQUIRED_PARAMS[path] ?? (() => {
    const tmpl = templateKeyFor(path);
    return tmpl ? PREMIUM_REQUIRED_PARAMS[tmpl] : undefined;
  })();
  if (!spec) return { ok: true };

  let best: string[] | null = null;
  for (const rule of spec.rules) {
    const missing = rule.filter((name) => !isPresent(params, name));
    if (missing.length === 0) return { ok: true };
    if (best === null || missing.length < best.length) best = missing;
  }

  return {
    ok: false,
    missing: best ?? [],
    hint: spec.hint,
    rules: spec.rules,
    ...(spec.example ? { example: spec.example } : {}),
  };
}

/**
 * The 400 body served for a guard failure. Explicitly tells the agent that it
 * was NOT charged: an agent that just got a 400 needs to know whether to
 * expect a settlement, and the whole point of this guard is that there is
 * none. Machine-readable so a client can self-correct and retry.
 */
export function premiumInputErrorBody(
  path: string,
  check: Extract<PremiumInputCheck, { ok: false }>,
): Record<string, unknown> {
  return {
    ok: false,
    error: 'missing_required_params',
    endpoint: path,
    missing: check.missing,
    accepts_any_of: check.rules,
    hint: check.hint,
    ...(check.example ? { example: `${path}?${check.example}` } : {}),
    payment: 'none',
    message:
      'This request was rejected before the payment gate. No payment challenge was issued, no USDC was settled, and no credits were charged. Add the required parameters and retry.',
    doc: 'https://tensorfeed.ai/developers',
  };
}

/**
 * The 400 body served when a POST premium endpoint whose required input is the
 * request BODY (not a query param) is called with a missing or unparseable
 * body, rejected ahead of the payment gate. cve-check is the only such endpoint
 * today (a lockfile in the body; see NON_QUERY_INPUT). Mirrors
 * premiumInputErrorBody: it states explicitly that nothing was settled or
 * charged, so an agent that just received a 400 knows not to expect a
 * settlement. `error` and `hint` are surfaced verbatim from the body parser so
 * the reason is specific (empty_body, no_packages, invalid_json, too_large).
 */
export function premiumBodyErrorBody(
  path: string,
  error: string,
  hint: string,
): Record<string, unknown> {
  return {
    ok: false,
    error,
    endpoint: path,
    hint,
    payment: 'none',
    message:
      'This request was rejected before the payment gate. No payment challenge was issued, no USDC was settled, and no credits were charged. Fix the request body and retry.',
    doc: 'https://tensorfeed.ai/developers',
  };
}
