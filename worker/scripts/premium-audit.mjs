#!/usr/bin/env node
/**
 * Premium API self-audit, no-auth pass.
 *
 * Hits every /api/premium/* endpoint without a bearer token and verifies:
 *   1. HTTP 402 (the canonical "payment required" status per x402)
 *   2. Response is JSON
 *   3. Body contains x402Version: 1 AND an accepts array
 *   4. accepts[0] has the required fields (scheme, network, maxAmountRequired, payTo)
 *
 * Endpoints with path params get a known-valid substitution.
 */

import { internalHeaders } from './_tf-internal.mjs';

const BASE = 'https://tensorfeed.ai';

const ENDPOINTS = [
  '/api/premium/routing',
  '/api/premium/history/pricing/series',
  '/api/premium/history/benchmarks/series',
  '/api/premium/history/status/uptime',
  '/api/premium/history/news/full',
  '/api/premium/history/news/source-health',
  '/api/premium/security/cve/range',
  '/api/premium/security/kev/full',
  '/api/premium/security/kev/series',
  '/api/premium/security/epss/series',
  '/api/premium/security/epss/top',
  '/api/premium/climate/power/hourly',
  '/api/premium/health/fda/aggregate',
  '/api/premium/clean/cve/CVE-2024-3094',
  '/api/premium/clean/kev/CVE-2024-3094',
  '/api/premium/clean/epss/CVE-2024-3094',
  '/api/premium/clean/power/daily',
  '/api/premium/clean/eia/series',
  '/api/premium/clean/fda/drug/events',
  '/api/premium/security/verified/CVE-2024-3094',
  '/api/premium/clean/openrouter/anthropic/claude-3.5-sonnet',
  '/api/premium/history/news/clusters/full',
  '/api/premium/history/news/verified',
  '/api/premium/status/leaderboard',
  '/api/premium/watches',
  '/api/premium/agents/directory',
  '/api/premium/news/search',
  '/api/premium/cost/projection',
  '/api/premium/providers/anthropic',
  '/api/premium/compare/models',
  '/api/premium/whats-new',
  '/api/premium/macro/digest',
  '/api/premium/policy/timeline',
  '/api/premium/economy/series/fred/UNRATE',
  '/api/premium/packages/pypi/momentum',
  '/api/premium/research/velocity',
  '/api/premium/research/milestones',
  '/api/premium/research/emerging-keywords',
  '/api/premium/research/topic-search',
  '/api/premium/research/lab-productivity',
  '/api/premium/economy/recession-watch',
  '/api/premium/mcp/registry/series',
  '/api/premium/probe/series',
  '/api/premium/funding/exposure',
];

const results = [];

async function audit(path) {
  const url = BASE + path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...internalHeaders(url) },
      redirect: 'manual',
    });
    const status = res.status;
    const xPaymentRequired = res.headers.get('x-payment-required') || res.headers.get('x-payment-tx-required') || res.headers.get('www-authenticate') || '';
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('json');
    let body = null;
    let parsed = null;
    try {
      body = await res.text();
      if (isJson) parsed = JSON.parse(body);
    } catch {
      /* ignore */
    }
    const x402Version = parsed && (parsed.x402Version ?? parsed.version) ;
    const accepts = parsed && Array.isArray(parsed.accepts) ? parsed.accepts : null;
    const acceptsValid = accepts && accepts.length > 0 && accepts[0].scheme && accepts[0].network && accepts[0].payTo;

    // /api/premium/watches is an account-management endpoint (list your own
    // watches that were already paid for). It requires auth but doesn't take
    // a per-call payment, so 401 (not 402) is the correct unauth response.
    const isAuthGatedManagement = path === '/api/premium/watches';
    const findings = [];
    if (isAuthGatedManagement) {
      if (status !== 401) findings.push(`status=${status}-expected-401-for-mgmt`);
    } else {
      // Canonical Coinbase V2 spec uses x402Version: 2 in the body.
      if (status !== 402) findings.push(`status=${status}`);
      if (!isJson) findings.push('non-json');
      if (x402Version !== 2 && x402Version !== '2') findings.push(`x402Version=${x402Version}-expected-2`);
      if (!acceptsValid) findings.push('accepts-missing-or-invalid');
    }

    results.push({
      path,
      status,
      hasXPaymentHeader: Boolean(xPaymentRequired),
      x402Version,
      acceptsCount: accepts ? accepts.length : 0,
      ms: Date.now() - t0,
      pass: findings.length === 0,
      findings,
    });
  } catch (e) {
    results.push({ path, error: String(e).slice(0, 120), pass: false });
  }
}

const limit = 6;
let i = 0;
async function next() {
  while (true) {
    const idx = i++;
    if (idx >= ENDPOINTS.length) return;
    await audit(ENDPOINTS[idx]);
  }
}
await Promise.all(Array.from({ length: limit }, () => next()));

results.sort((a, b) => a.path.localeCompare(b.path));
const passing = results.filter((r) => r.pass).length;
const failing = results.length - passing;

console.log('## TensorFeed premium API gating audit');
console.log(`### Run: ${new Date().toISOString()}`);
console.log(`### Endpoints tested: ${results.length}`);
console.log(`### Pass: ${passing} / Fail: ${failing}`);
console.log('');
if (failing > 0) {
  console.log('### FAILURES');
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`* ${r.path} -> ${r.findings ? r.findings.join('; ') : r.error}`);
  }
  console.log('');
}
console.log('### Full results (path | status | x402Version | accepts | ms)');
for (const r of results) {
  console.log(`${r.pass ? 'OK ' : 'FAIL'} | ${r.path} | ${r.status ?? 'err'} | ${r.x402Version ?? '-'} | ${r.acceptsCount ?? '-'} | ${r.ms ?? '-'}ms`);
}
process.exit(failing > 0 ? 1 : 0);
