/**
 * Pure-logic unit tests for premium webhook watches.
 *
 * Predicate evaluation, URL validation, transition computation, HMAC
 * signing, and CRUD lifecycle. Network delivery is exercised separately
 * via a stubbed global fetch to confirm signing headers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateCallbackUrl,
  validateSpec,
  priceWatchFires,
  statusWatchFires,
  computePriceTransitions,
  signBody,
  createWatch,
  getWatch,
  listWatchesForToken,
  deleteWatch,
  dispatchPriceWatches,
  dispatchStatusWatches,
  PriceWatchSpec,
  StatusWatchSpec,
} from './watches';
import type { Env } from './types';

// ── Mock infrastructure ─────────────────────────────────────────────

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string, options?: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown> = {}): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      try {
        store.set(key, JSON.parse(value));
      } catch {
        store.set(key, value);
      }
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
    }),
  };
}

function makeEnv(): Env {
  const cache = makeKV();
  return {
    TENSORFEED_NEWS: makeKV() as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV() as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

// ── validateCallbackUrl ─────────────────────────────────────────────

describe('validateCallbackUrl', () => {
  it('accepts valid https URLs', () => {
    expect(validateCallbackUrl('https://example.com/hook').ok).toBe(true);
    expect(validateCallbackUrl('https://api.agent.dev/path?x=1').ok).toBe(true);
  });

  it('rejects http (must be https)', () => {
    const r = validateCallbackUrl('http://example.com/hook');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('callback_url_must_be_https');
  });

  it('rejects malformed URLs', () => {
    expect(validateCallbackUrl('not a url').ok).toBe(false);
    expect(validateCallbackUrl('').ok).toBe(false);
  });

  it('blocks private IP ranges (basic SSRF guard)', () => {
    expect(validateCallbackUrl('https://127.0.0.1/x').ok).toBe(false);
    expect(validateCallbackUrl('https://10.0.0.5/x').ok).toBe(false);
    expect(validateCallbackUrl('https://192.168.1.1/x').ok).toBe(false);
    expect(validateCallbackUrl('https://172.16.0.1/x').ok).toBe(false);
    expect(validateCallbackUrl('https://localhost/x').ok).toBe(false);
    expect(validateCallbackUrl('https://service.local/x').ok).toBe(false);
    expect(validateCallbackUrl('https://169.254.169.254/x').ok).toBe(false);
  });
});

// ── validateSpec ─────────────────────────────────────────────────────

describe('validateSpec', () => {
  it('accepts a valid price watch with threshold', () => {
    const r = validateSpec({
      type: 'price',
      model: 'Claude Opus 4.7',
      field: 'inputPrice',
      op: 'lt',
      threshold: 10,
    });
    expect(r.ok).toBe(true);
  });

  it('accepts a price watch with op=changes (no threshold)', () => {
    expect(
      validateSpec({ type: 'price', model: 'X', field: 'blended', op: 'changes' }).ok,
    ).toBe(true);
  });

  it('rejects price lt without threshold', () => {
    const r = validateSpec({ type: 'price', model: 'X', field: 'inputPrice', op: 'lt' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('price_watch_threshold_required');
  });

  it('rejects status becomes without value', () => {
    const r = validateSpec({ type: 'status', provider: 'anthropic', op: 'becomes' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('status_watch_value_required_when_becomes');
  });

  it('rejects unsupported watch types', () => {
    expect(validateSpec({ type: 'benchmark', provider: 'x', op: 'changes' }).ok).toBe(false);
  });
});

// ── priceWatchFires (predicate edge transitions) ────────────────────

describe('priceWatchFires', () => {
  const spec = (over: Partial<PriceWatchSpec> = {}): PriceWatchSpec => ({
    type: 'price',
    model: 'Opus 4.7',
    field: 'inputPrice',
    op: 'lt',
    threshold: 10,
    ...over,
  });

  it('fires only on the lt transition crossing threshold', () => {
    expect(
      priceWatchFires(spec(), { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 12, to: 9 }),
    ).toBe(true);
    // Already below, no fire (debounced)
    expect(
      priceWatchFires(spec(), { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 9, to: 8 }),
    ).toBe(false);
    // Going up, no fire
    expect(
      priceWatchFires(spec(), { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 8, to: 11 }),
    ).toBe(false);
  });

  it('fires on the gt transition', () => {
    const s = spec({ op: 'gt', threshold: 20 });
    expect(
      priceWatchFires(s, { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 18, to: 22 }),
    ).toBe(true);
    expect(
      priceWatchFires(s, { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 22, to: 25 }),
    ).toBe(false);
  });

  it('fires on any change for op=changes', () => {
    const s = spec({ op: 'changes', threshold: undefined });
    expect(
      priceWatchFires(s, { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 10, to: 11 }),
    ).toBe(true);
    expect(
      priceWatchFires(s, { model: 'Opus 4.7', provider: 'A', field: 'inputPrice', from: 10, to: 10 }),
    ).toBe(false);
  });

  it('does not fire on a different model or field', () => {
    expect(
      priceWatchFires(spec(), { model: 'GPT-5.5', provider: 'O', field: 'inputPrice', from: 12, to: 9 }),
    ).toBe(false);
    expect(
      priceWatchFires(spec(), { model: 'Opus 4.7', provider: 'A', field: 'outputPrice', from: 12, to: 9 }),
    ).toBe(false);
  });

  it('matches model name case-insensitively', () => {
    expect(
      priceWatchFires(spec({ model: 'opus 4.7' }), {
        model: 'Opus 4.7',
        provider: 'A',
        field: 'inputPrice',
        from: 12,
        to: 9,
      }),
    ).toBe(true);
  });
});

// ── statusWatchFires ─────────────────────────────────────────────────

describe('statusWatchFires', () => {
  const spec = (over: Partial<StatusWatchSpec> = {}): StatusWatchSpec => ({
    type: 'status',
    provider: 'anthropic',
    op: 'becomes',
    value: 'down',
    ...over,
  });

  it('fires when service becomes the targeted state', () => {
    expect(
      statusWatchFires(spec(), { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'down' }),
    ).toBe(true);
    expect(
      statusWatchFires(spec(), { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'degraded' }),
    ).toBe(false);
  });

  it('fires on any transition for op=changes', () => {
    const s = spec({ op: 'changes', value: undefined });
    expect(
      statusWatchFires(s, { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'degraded' }),
    ).toBe(true);
  });

  it('ignores transitions to or from unknown', () => {
    expect(
      statusWatchFires(
        spec({ op: 'changes', value: undefined }),
        { provider: 'anthropic', name: 'Anthropic', from: 'unknown', to: 'down' },
      ),
    ).toBe(false);
    expect(
      statusWatchFires(
        spec({ op: 'changes', value: undefined }),
        { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'unknown' },
      ),
    ).toBe(false);
  });

  it('rejects mismatched providers', () => {
    expect(
      statusWatchFires(spec(), { provider: 'openai', name: 'OpenAI', from: 'operational', to: 'down' }),
    ).toBe(false);
  });
});

// ── computePriceTransitions ─────────────────────────────────────────

describe('computePriceTransitions', () => {
  const before = {
    providers: [
      { id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }] },
      { id: 'o', name: 'OpenAI', models: [{ id: 'g5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30 }] },
    ],
  };
  const after = {
    providers: [
      { id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 12, outputPrice: 60 }] },
      { id: 'o', name: 'OpenAI', models: [{ id: 'g5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30 }] },
    ],
  };

  it('emits one transition per changed field plus a blended transition', () => {
    const ts = computePriceTransitions(before, after);
    const fields = ts.map(t => t.field).sort();
    expect(fields).toEqual(['blended', 'inputPrice', 'outputPrice']);
    const blend = ts.find(t => t.field === 'blended')!;
    expect(blend.from).toBe(45);
    expect(blend.to).toBe(36);
  });

  it('emits no transitions when nothing changed', () => {
    expect(computePriceTransitions(before, before)).toHaveLength(0);
  });

  it('skips newly-added models (no from price to compare)', () => {
    const augmented = {
      providers: [
        ...after.providers,
        { id: 'g', name: 'Google', models: [{ id: 'gem', name: 'Gemini 3', inputPrice: 7, outputPrice: 21 }] },
      ],
    };
    const ts = computePriceTransitions(before, augmented);
    expect(ts.find(t => t.model === 'Gemini 3')).toBeUndefined();
  });
});

// ── signBody ─────────────────────────────────────────────────────────

describe('signBody', () => {
  it('produces a deterministic sha256 hex signature', async () => {
    const a = await signBody('hello', 'shh');
    const b = await signBody('hello', 'shh');
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('different secrets produce different signatures', async () => {
    const a = await signBody('hello', 'shh');
    const b = await signBody('hello', 'other');
    expect(a).not.toBe(b);
  });
});

// ── CRUD ─────────────────────────────────────────────────────────────

describe('createWatch / getWatch / list / delete', () => {
  it('creates and retrieves a watch, listing it under the owning token', async () => {
    const env = makeEnv();
    const result = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'price', model: 'Opus 4.7', field: 'blended', op: 'changes' },
      callback_url: 'https://agent.example.com/hook',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.watch.id).toMatch(/^wat_[a-f0-9]{24}$/);
    expect(result.watch.fire_count).toBe(0);
    expect(result.watch.fire_cap).toBe(100);

    const fetched = await getWatch(env, result.watch.id);
    expect(fetched?.id).toBe(result.watch.id);

    const list = await listWatchesForToken(env, 'tf_live_abc');
    expect(list).toHaveLength(1);

    const otherList = await listWatchesForToken(env, 'tf_live_xyz');
    expect(otherList).toHaveLength(0);
  });

  it('rejects invalid callback URLs', async () => {
    const env = makeEnv();
    const result = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'status', provider: 'anthropic', op: 'changes' },
      callback_url: 'http://example.com/x',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid_callback_url');
  });

  it('rejects invalid specs', async () => {
    const env = makeEnv();
    const result = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'price', model: 'X', field: 'inputPrice', op: 'lt' } as never,
      callback_url: 'https://agent.example.com/hook',
    });
    expect(result.ok).toBe(false);
  });

  it('only the owning token can delete a watch', async () => {
    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'status', provider: 'anthropic', op: 'changes' },
      callback_url: 'https://agent.example.com/hook',
    });
    if (!created.ok) throw new Error('setup failed');

    const wrong = await deleteWatch(env, created.watch.id, 'tf_live_other');
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.error).toBe('forbidden');

    const right = await deleteWatch(env, created.watch.id, 'tf_live_abc');
    expect(right.ok).toBe(true);

    expect(await getWatch(env, created.watch.id)).toBeNull();
  });
});

// ── Dispatch end-to-end (with stubbed fetch) ────────────────────────

describe('dispatch (network-stubbed)', () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: { url: string; init: RequestInit }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} });
      return new Response('{"received": true}', { status: 200 });
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('delivers a signed POST to the callback URL when a price watch fires', async () => {
    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'price', model: 'Opus 4.7', field: 'blended', op: 'lt', threshold: 40 },
      callback_url: 'https://agent.example.com/hook',
      secret: 'shh',
    });
    if (!created.ok) throw new Error('setup failed');

    const before = {
      providers: [
        {
          id: 'a', name: 'Anthropic',
          models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }],
        },
      ],
    };
    const after = {
      providers: [
        {
          id: 'a', name: 'Anthropic',
          models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 12, outputPrice: 60 }],
        },
      ],
    };

    const summary = await dispatchPriceWatches(env, before, after);
    expect(summary.watches_fired).toBe(1);
    expect(summary.delivery_failures).toBe(0);
    expect(captured).toHaveLength(1);

    const { url, init } = captured[0];
    expect(url).toBe('https://agent.example.com/hook');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-TensorFeed-Event']).toBe('watch.fire');
    expect(headers['X-TensorFeed-Watch-Id']).toBe(created.watch.id);
    expect(headers['X-TensorFeed-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);

    const body = JSON.parse(init.body as string) as { match: { from: number; to: number; field: string } };
    expect(body.match.field).toBe('blended');
    expect(body.match.from).toBe(45);
    expect(body.match.to).toBe(36);
  });

  it('does not fire when the transition does not match the predicate', async () => {
    const env = makeEnv();
    await createWatch(env, 'tf_live_abc', {
      spec: { type: 'price', model: 'Opus 4.7', field: 'inputPrice', op: 'gt', threshold: 100 },
      callback_url: 'https://agent.example.com/hook',
    });
    const before = {
      providers: [{ id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }] }],
    };
    const after = {
      providers: [{ id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 12, outputPrice: 60 }] }],
    };
    const summary = await dispatchPriceWatches(env, before, after);
    expect(summary.watches_fired).toBe(0);
    expect(captured).toHaveLength(0);
  });

  it('fires status watches when matching provider transitions', async () => {
    const env = makeEnv();
    await createWatch(env, 'tf_live_abc', {
      spec: { type: 'status', provider: 'anthropic', op: 'becomes', value: 'down' },
      callback_url: 'https://agent.example.com/hook',
    });
    const summary = await dispatchStatusWatches(env, [
      { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'down' },
    ]);
    expect(summary.watches_fired).toBe(1);
    expect(captured).toHaveLength(1);
  });
});
