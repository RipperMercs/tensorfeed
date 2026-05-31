/**
 * Tests for the shared premium-tool plumbing (JS SDK).
 *
 * Zero-dependency: Node's built-in node:test, mirroring the Python
 * suite. Network-free. Run with `npm test` (builds first, then
 * `node --test tests/`).
 *
 * Covers the safeCall behavior matrix, the formatters, the
 * guidance/alignment contracts, an offline client-integration path,
 * and a static guard that the premium-tool source can never reach the
 * payment or signing surface.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  TensorFeed,
  PaymentRequired,
  RateLimited,
  TensorFeedError,
} from '../dist/index.js';
import {
  safeCall,
  PREMIUM_PAYMENT_GUIDANCE,
  DESCRIPTIONS,
  FORMATTERS,
  INVOKERS,
  PREMIUM_TOOL_NAMES,
} from '../dist/premium-tools.js';

// ── safeCall behavior matrix ──────────────────────────────────────────

test('PaymentRequired resolves to guidance, never rejects', async () => {
  const out = await safeCall(
    async () => {
      throw new PaymentRequired({});
    },
    () => 'unreachable',
  );
  assert.match(out.toLowerCase(), /will not/);
  assert.match(out.toLowerCase(), /credit/);
  assert.equal(typeof out, 'string');
});

test('PaymentRequired appends a credits hint', async () => {
  const out = await safeCall(
    async () => {
      throw new PaymentRequired({ credits_required: 2 });
    },
    () => 'unreachable',
  );
  assert.match(out, /2 credit/);
});

test('missing-token Error resolves to guidance', async () => {
  const out = await safeCall(
    async () => {
      throw new Error('whatsNew() requires a token.');
    },
    () => 'unreachable',
  );
  assert.equal(out, PREMIUM_PAYMENT_GUIDANCE);
});

test('RateLimited resolves to a back-off message', async () => {
  const out = await safeCall(
    async () => {
      throw new RateLimited({});
    },
    () => 'unreachable',
  );
  assert.match(out.toLowerCase(), /rate limit/);
});

test('other API error is concise, no stack', async () => {
  const out = await safeCall(
    async () => {
      throw new TensorFeedError(500, { error: 'kaboom' });
    },
    () => 'unreachable',
  );
  assert.match(out, /500/);
  assert.doesNotMatch(out, /at .*\(/); // no stack frames
});

test('success runs formatter and billing footer', async () => {
  const result = { value: 1, billing: { credits_charged: 1, balance: 49 } };
  const out = await safeCall(
    async () => result,
    (r) => `value=${r.value}`,
  );
  assert.match(out, /value=1/);
  assert.match(out, /1 credit\(s\) charged/);
  assert.match(out, /49 remaining/);
});

test('a throwing formatter is contained', async () => {
  const out = await safeCall(
    async () => ({ a: 1 }),
    () => {
      throw new Error('boom');
    },
  );
  assert.match(out, /unexpected shape/);
  assert.match(out, /\ba\b/);
});

// ── Contracts ─────────────────────────────────────────────────────────

test('guidance states no autonomous payment', () => {
  const g = PREMIUM_PAYMENT_GUIDANCE.toLowerCase();
  assert.match(g, /will not/);
  assert.match(g, /move any funds|move funds/);
  assert.match(g, /operator/);
});

test('names, descriptions, formatters, invokers align', () => {
  const names = [...PREMIUM_TOOL_NAMES].sort();
  assert.deepEqual(Object.keys(DESCRIPTIONS).sort(), names);
  assert.deepEqual(Object.keys(FORMATTERS).sort(), names);
  assert.deepEqual(Object.keys(INVOKERS).sort(), names);
  for (const [name, desc] of Object.entries(DESCRIPTIONS)) {
    assert.match(desc, /1 credit/, name);
  }
});

// ── Static guard: no payment/signing path reachable ──────────────────

test('premium-tools source has no payment or signing path', async () => {
  const src = await readFile(
    new URL('../src/premium-tools.ts', import.meta.url),
    'utf8',
  );
  for (const forbidden of [
    '.buyCredits(',
    '.confirm(',
    '.purchaseCredits(',
    'purchaseCredits',
    'privateKey',
    'web3',
  ]) {
    assert.ok(!src.includes(forbidden), `must not reference ${forbidden}`);
  }
});

// ── Formatters smoke ──────────────────────────────────────────────────

test('each formatter produces non-empty text', () => {
  const samples = {
    tensorfeed_whats_new: {
      window: { days: 1 },
      pricing: {
        changes: [{ model: 'X', field: 'blended', from: 1, to: 2 }],
        new_models: [],
        removed_models: [],
      },
      status: { incidents: [{ provider: 'openai', state: 'down' }] },
      news: [{ title: 'T', source: 'S' }],
      summary: { total: 1 },
    },
    tensorfeed_routing: {
      recommendations: [
        { rank: 1, model: { name: 'Opus', provider: 'anthropic' }, composite_score: 0.91 },
      ],
    },
    tensorfeed_compare_models: {
      models: [
        { name: 'A', pricing: { input: 1, output: 2, blended: 1.5 }, context_window: 200000 },
        { matched: false, query: 'ghost-model', reason: 'model_not_found' },
      ],
      rankings: { cheapest_blended: 'A' },
    },
    tensorfeed_cost_projection: {
      projections: [{ model: 'A', monthly_total: 12.5 }],
      ranked_cheapest_monthly: [{ model: 'A' }],
    },
    tensorfeed_news_search: {
      matched: 3,
      results: [{ title: 'T', source: 'S', published_at: '2026-05-17', url: 'u' }],
    },
    tensorfeed_provider_deepdive: {
      provider: 'anthropic',
      status: { status: 'operational' },
      models: [{ name: 'Opus', tier: 'flagship', context_window: 200000 }],
      recent_news_count: 2,
      recent_news: [{ title: 'T', source: 'S' }],
      agent_traffic_24h: 100,
    },
    tensorfeed_status_leaderboard: {
      entries: [
        { rank: 1, provider: 'Anthropic', uptime_pct: 99.9, incident_count: 0, mttr_minutes: 0 },
      ],
    },
  };
  for (const [name, fmt] of Object.entries(FORMATTERS)) {
    const text = fmt(samples[name]);
    assert.equal(typeof text, 'string');
    assert.ok(text.trim().length > 0, name);
  }
});

test('status leaderboard handles a no-data response', () => {
  const out = FORMATTERS.tensorfeed_status_leaderboard({ entries: [], error: 'no_data' });
  assert.match(out, /no_data/);
});

test('cost projection reads monthly_total', () => {
  const out = FORMATTERS.tensorfeed_cost_projection({
    projections: [{ model: 'A', monthly_total: 12.5 }],
  });
  assert.match(out, /12\.5/);
  assert.ok(!out.includes('undefined'), out);
});

test('compare models reads pricing.input/output and detects unmatched via query', () => {
  const out = FORMATTERS.tensorfeed_compare_models({
    models: [
      { name: 'A', pricing: { input: 1, output: 2 }, context_window: 200000 },
      { matched: false, query: 'ghost-model', reason: 'model_not_found' },
    ],
  });
  assert.match(out, /in 1 \/ out 2/);
  assert.match(out, /ghost-model: \(no match\)/);
  assert.ok(!out.includes('?'), out);
});

// ── Offline client integration ────────────────────────────────────────

test('tokenless premium call yields guidance, no network', async () => {
  const tf = new TensorFeed(); // no token
  const out = await safeCall(
    () => tf.whatsNew(),
    FORMATTERS.tensorfeed_whats_new,
  );
  assert.equal(out, PREMIUM_PAYMENT_GUIDANCE);
});
