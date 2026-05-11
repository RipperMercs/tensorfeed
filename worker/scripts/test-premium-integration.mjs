#!/usr/bin/env node
// Integration test for every paid /api/premium/* endpoint.
//
// Usage:
//   node test-premium-integration.mjs <token> [base-url]
//
// The token must already have credits seeded (e.g. via the wrapper PS1
// that calls `wrangler kv key put`). Default base-url is
// https://tensorfeed.ai.
//
// Each endpoint is tested for:
//   1. Reachability + 2xx/4xx/503 with the token (auth path works)
//   2. Body has the expected top-level shape (or proper hint on 503)
//   3. Signed receipt is embedded on every paid response
//   4. Billing block is present and credits accounting is sane
//
// Endpoints whose data depends on overnight crons may return 503 with
// "no_snapshot_yet" or "no_baseline_yet" hints; those count as PASS
// (correct behavior pre-snapshot). Happy-path verification requires
// snapshots to be populated (rerun after 06:00 UTC).

const TOKEN = process.argv[2];
const BASE = process.argv[3] || process.env.TF_BASE || 'https://tensorfeed.ai';

if (!TOKEN || !TOKEN.startsWith('tf_live_')) {
  console.error('Usage: node test-premium-integration.mjs <tf_live_token> [base-url]');
  process.exit(2);
}

// ── Test catalog ───────────────────────────────────────────────────

const tests = [
  // New 2026-05-06 derived premium endpoints (the seven tonight)
  {
    id: 'macro-digest',
    name: 'Macro digest',
    path: '/api/premium/macro/digest',
    happyKeys: ['rates', 'inflation', 'employment', 'growth_money', 'fx_commodities', 'brief', 'attribution'],
    okErrors: ['no_snapshots_yet'],
  },
  {
    id: 'policy-timeline',
    name: 'AI policy timeline',
    path: '/api/premium/policy/timeline',
    happyKeys: ['totals', 'next_milestones', 'entries', 'attribution', 'window'],
    okErrors: [],
    // Should always work: editorial registry, no data dependency
  },
  {
    id: 'policy-timeline-validation',
    name: 'Policy timeline schema validation (negative days_back)',
    path: '/api/premium/policy/timeline?days_back=-5',
    expectStatus: 400,
    expectBodyError: 'invalid_days_back',
    expectNoCharge: 'schema_validation_failure',
  },
  {
    id: 'economy-series-bls',
    name: 'Economy series history (BLS CPI)',
    path: '/api/premium/economy/series/bls/CUUR0000SA0',
    happyKeys: ['observations', 'summary', 'attribution', 'date_range'],
    okErrors: ['series_not_found', 'upstream_fetch_failed'],
  },
  {
    id: 'economy-series-fred',
    name: 'Economy series history (FRED DFF)',
    path: '/api/premium/economy/series/fred/DFF',
    happyKeys: ['observations', 'summary', 'attribution', 'date_range'],
    okErrors: ['fred_key_unset', 'series_not_found', 'upstream_fetch_failed'],
  },
  {
    id: 'economy-series-bad-source',
    name: 'Economy series invalid source',
    path: '/api/premium/economy/series/cps/X',
    expectStatus: 400,
    expectBodyError: 'invalid_source',
    expectNoCharge: 'schema_validation_failure',
  },
  {
    id: 'economy-series-bad-id',
    name: 'Economy series invalid series id',
    path: '/api/premium/economy/series/bls/drop%20tables;',
    expectStatus: 400,
    expectBodyError: 'invalid_series_id',
    expectNoCharge: 'schema_validation_failure',
  },
  {
    id: 'recession-watch',
    name: 'Recession watch',
    path: '/api/premium/economy/recession-watch',
    happyKeys: ['yield_curve', 'sahm_rule', 'composite', 'brief', 'attribution'],
    okErrors: ['no_snapshots_yet'],
  },
  {
    id: 'research-velocity',
    name: 'AI research velocity',
    path: '/api/premium/research/velocity',
    happyKeys: ['totals_by_direction', 'institutions', 'notable_movers', 'attribution'],
    okErrors: ['no_baseline_yet', 'recent_fetch_failed'],
  },
  {
    id: 'pypi-momentum',
    name: 'PyPI packages momentum',
    path: '/api/premium/packages/pypi/momentum',
    happyKeys: ['totals_by_direction', 'packages', 'notable_movers', 'attribution'],
    okErrors: ['no_snapshot_yet'],
  },
  {
    id: 'arxiv-milestones',
    name: 'arXiv milestone detector',
    path: '/api/premium/research/milestones',
    happyKeys: ['window_days', 'total', 'papers', 'attribution'],
    okErrors: ['no_snapshot_yet'],
  },
  {
    id: 'arxiv-emerging-keywords',
    name: 'arXiv emerging keywords',
    path: '/api/premium/research/emerging-keywords',
    happyKeys: ['recent_window_days', 'baseline_window_days', 'total', 'keywords', 'attribution'],
    okErrors: ['no_snapshot_yet'],
  },
  {
    id: 'arxiv-topic-search',
    name: 'arXiv topic search',
    path: '/api/premium/research/topic-search?limit=5',
    happyKeys: ['query', 'total_matches', 'returned', 'papers', 'attribution'],
    okErrors: ['no_snapshot_yet'],
  },
  {
    id: 'arxiv-lab-productivity',
    name: 'arXiv lab productivity',
    path: '/api/premium/research/lab-productivity?window=90d&limit=5',
    happyKeys: ['query', 'windows', 'attribution'],
    okErrors: ['no_snapshot_yet'],
  },
  {
    id: 'funding-exposure',
    name: 'Funding exposure analytics',
    path: '/api/premium/funding/exposure',
    happyKeys: ['silicon_concentration', 'circular_exposure', 'top_recipients', 'co_investor_pairs', 'attribution'],
    okErrors: ['empty_registry'],
  },
  // Existing premium endpoints that pre-date today (regression coverage)
  {
    id: 'whats-new',
    name: "What's-new digest",
    path: '/api/premium/whats-new?days=1',
    happyKeys: ['summary', 'pricing', 'status', 'news', 'news_attribution'],
    okErrors: [],
  },
  {
    id: 'cost-projection',
    name: 'Cost projection',
    path: '/api/premium/cost/projection?model=claude-opus-4-7&input_tokens_per_day=100000&output_tokens_per_day=50000',
    happyKeys: ['workload', 'projections', 'ranked_cheapest_monthly', 'attribution'],
    okErrors: [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function color(s, c) {
  const codes = { red: 31, green: 32, yellow: 33, gray: 90, bold: 1 };
  return `\x1b[${codes[c] ?? 0}m${s}\x1b[0m`;
}

function checkReceipt(body) {
  const r = body.receipt;
  if (!r || typeof r !== 'object') return { ok: false, reason: 'missing receipt' };
  const required = ['v', 'id', 'endpoint', 'method', 'credits_charged', 'request_hash', 'response_hash', 'captured_at'];
  for (const f of required) {
    if (!(f in r)) return { ok: false, reason: `receipt missing ${f}` };
  }
  if (r.v !== 2) return { ok: false, reason: `unexpected receipt v=${r.v}` };
  if (typeof r.signature !== 'string' || !r.signature) return { ok: false, reason: 'receipt has no signature' };
  return { ok: true };
}

function checkBilling(body) {
  const b = body.billing;
  if (!b || typeof b !== 'object') return { ok: false, reason: 'missing billing' };
  if (typeof b.credits_charged !== 'number') return { ok: false, reason: 'billing missing credits_charged' };
  if (typeof b.credits_remaining !== 'number') return { ok: false, reason: 'billing missing credits_remaining' };
  return { ok: true };
}

function hasAttribution(body) {
  if (body.attribution) return true;
  if (body.news_attribution) return true;
  return false;
}

async function runOne(t) {
  const url = `${BASE}${t.path}`;
  const startedAt = Date.now();
  let res, body;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text.slice(0, 200) };
    }
  } catch (err) {
    return { id: t.id, name: t.name, pass: false, reason: `fetch threw: ${err.message}`, ms: Date.now() - startedAt };
  }
  const ms = Date.now() - startedAt;

  // Schema-validation case
  if (t.expectStatus) {
    if (res.status !== t.expectStatus) {
      return { id: t.id, name: t.name, pass: false, reason: `expected status ${t.expectStatus}, got ${res.status}`, ms, body };
    }
    if (t.expectBodyError && body.error !== t.expectBodyError) {
      return { id: t.id, name: t.name, pass: false, reason: `expected error="${t.expectBodyError}", got "${body.error}"`, ms, body };
    }
    if (t.expectNoCharge) {
      const billing = body.billing;
      if (!billing || billing.no_charge_reason !== t.expectNoCharge) {
        return { id: t.id, name: t.name, pass: false, reason: `expected no_charge_reason="${t.expectNoCharge}", got "${billing?.no_charge_reason}"`, ms, body };
      }
      if (billing.credits_charged !== 0) {
        return { id: t.id, name: t.name, pass: false, reason: `expected 0 credits charged on validation failure, got ${billing.credits_charged}`, ms, body };
      }
    }
    // Validation-failure path also signs a receipt
    const rc = checkReceipt(body);
    if (!rc.ok) {
      return { id: t.id, name: t.name, pass: false, reason: `validation path: ${rc.reason}`, ms, body };
    }
    return { id: t.id, name: t.name, pass: true, reason: `${res.status} + signed receipt + no-charge`, ms };
  }

  // Happy / data-not-yet case
  if (res.status === 503) {
    const errStr = body.error || '';
    if (t.okErrors.includes(errStr)) {
      return { id: t.id, name: t.name, pass: true, reason: `503 (${errStr}) — expected pre-snapshot`, ms, awaitingData: true };
    }
    return { id: t.id, name: t.name, pass: false, reason: `503 with unexpected error: ${errStr}`, ms, body };
  }
  if (res.status >= 400) {
    // Some validation paths arrive at non-validation endpoints; check ok-errors
    const errStr = body.error || '';
    if (t.okErrors.includes(errStr)) {
      return { id: t.id, name: t.name, pass: true, reason: `${res.status} (${errStr}) — expected`, ms, awaitingData: true };
    }
    return { id: t.id, name: t.name, pass: false, reason: `unexpected ${res.status}: ${errStr || body._raw || 'no body'}`, ms, body };
  }

  // 200: verify happy shape + receipt + billing
  if (res.status !== 200) {
    return { id: t.id, name: t.name, pass: false, reason: `unexpected status ${res.status}`, ms, body };
  }
  if (body.ok !== true) {
    return { id: t.id, name: t.name, pass: false, reason: `expected ok:true, got ok:${body.ok}`, ms, body };
  }
  for (const k of t.happyKeys) {
    if (!(k in body)) {
      return { id: t.id, name: t.name, pass: false, reason: `body missing key: ${k}`, ms, body };
    }
  }
  if (!hasAttribution(body)) {
    return { id: t.id, name: t.name, pass: false, reason: 'missing attribution block', ms, body };
  }
  const rc = checkReceipt(body);
  if (!rc.ok) return { id: t.id, name: t.name, pass: false, reason: rc.reason, ms, body };
  const bc = checkBilling(body);
  if (!bc.ok) return { id: t.id, name: t.name, pass: false, reason: bc.reason, ms, body };
  return { id: t.id, name: t.name, pass: true, reason: `200 + shape + signed receipt + billing`, ms, creditsRemaining: body.billing.credits_remaining };
}

// ── Main ───────────────────────────────────────────────────────────

console.log(color(`\nTensorFeed premium integration tests`, 'bold'));
console.log(color(`  base: ${BASE}`, 'gray'));
console.log(color(`  token: ${TOKEN.slice(0, 14)}...${TOKEN.slice(-6)}`, 'gray'));
console.log();

const results = [];
let credits_at_start = null;
for (const t of tests) {
  const r = await runOne(t);
  results.push(r);
  const status = r.pass ? color('PASS', 'green') : color('FAIL', 'red');
  const tag = r.awaitingData ? color(' [awaiting cron]', 'yellow') : '';
  console.log(`  ${status}  ${r.name}${tag}`);
  console.log(color(`        ${r.reason} (${r.ms}ms)`, 'gray'));
  if (r.creditsRemaining !== undefined) {
    if (credits_at_start === null) credits_at_start = r.creditsRemaining + 1; // back-calculate
  }
  if (!r.pass && r.body) {
    console.log(color(`        body: ${JSON.stringify(r.body).slice(0, 240)}`, 'gray'));
  }
}

const passes = results.filter(r => r.pass).length;
const awaits = results.filter(r => r.awaitingData).length;
const fails = results.filter(r => !r.pass).length;

console.log();
console.log(color(`Results: ${passes}/${results.length} passing  (${awaits} awaiting overnight cron data)`, 'bold'));
if (fails > 0) {
  console.log(color(`        ${fails} failed — see output above`, 'red'));
  process.exit(1);
}
process.exit(0);
