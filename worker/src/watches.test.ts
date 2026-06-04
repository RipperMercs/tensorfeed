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
  leaderboardWatchFires,
  macroIndicatorWatchFires,
  computePriceTransitions,
  computeMacroIndicatorTransitions,
  signBody,
  createWatch,
  createFreeWatch,
  deleteFreeWatch,
  FREE_FIRE_CAP,
  FREE_PER_IP_WATCH_CAP,
  FREE_WATCH_TTL_SECONDS,
  freeWatchOwnerKey,
  getFreeWatch,
  getWatch,
  listFreeWatchesForIP,
  listWatchesForToken,
  deleteWatch,
  dispatchPriceWatches,
  dispatchStatusWatches,
  dispatchLeaderboardWatches,
  runDigestWatchCycle,
  PriceWatchSpec,
  StatusWatchSpec,
  LeaderboardRankWatchSpec,
  MacroIndicatorWatchSpec,
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

  it('blocks encoded / obfuscated IP-literal bypasses', () => {
    // Decimal integer form of 127.0.0.1; new URL() normalizes it to dotted-quad.
    const dec = validateCallbackUrl('https://2130706433/x');
    expect(dec.ok).toBe(false);
    expect(dec.error).toBe('callback_url_resolves_to_private_host');
    // Hex integer form of 127.0.0.1.
    expect(validateCallbackUrl('https://0x7f000001/x').ok).toBe(false);
  });

  it('blocks CGNAT and 0.0.0.0', () => {
    expect(validateCallbackUrl('https://100.64.0.1/x').ok).toBe(false);
    expect(validateCallbackUrl('https://0.0.0.0/x').ok).toBe(false);
  });

  it('blocks IPv6 loopback, link-local, ULA, and IPv4-mapped literals', () => {
    expect(validateCallbackUrl('https://[::1]/x').ok).toBe(false);
    expect(validateCallbackUrl('https://[fe80::1]/x').ok).toBe(false);
    expect(validateCallbackUrl('https://[fc00::1]/x').ok).toBe(false);
    expect(validateCallbackUrl('https://[::ffff:127.0.0.1]/x').ok).toBe(false);
  });

  it('blocks the localhost FQDN-root (trailing dot) form', () => {
    expect(validateCallbackUrl('https://localhost./x').ok).toBe(false);
  });

  it('still accepts ordinary public hosts and global IPv6', () => {
    expect(validateCallbackUrl('https://8.8.8.8/x').ok).toBe(true);
    expect(validateCallbackUrl('https://[2606:4700::1]/x').ok).toBe(true);
    expect(validateCallbackUrl('https://fcbarcelona.com/hook').ok).toBe(true);
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

  it('accepts a daily digest watch', () => {
    expect(validateSpec({ type: 'digest', cadence: 'daily' }).ok).toBe(true);
  });

  it('accepts a weekly digest watch', () => {
    expect(validateSpec({ type: 'digest', cadence: 'weekly' }).ok).toBe(true);
  });

  it('rejects digest with bad cadence', () => {
    const r = validateSpec({ type: 'digest', cadence: 'monthly' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('digest_watch_cadence_invalid');
  });

  it('accepts a leaderboard_rank watch with drops_below + threshold', () => {
    expect(
      validateSpec({
        type: 'leaderboard_rank',
        provider: 'claude',
        op: 'drops_below',
        threshold: 5,
      }).ok,
    ).toBe(true);
  });

  it('accepts a leaderboard_rank watch with op=changes (no threshold)', () => {
    expect(
      validateSpec({ type: 'leaderboard_rank', provider: 'claude', op: 'changes' }).ok,
    ).toBe(true);
  });

  it('rejects leaderboard_rank without provider', () => {
    const r = validateSpec({ type: 'leaderboard_rank', op: 'changes' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('leaderboard_watch_provider_required');
  });

  it('rejects leaderboard_rank drops_below without threshold', () => {
    const r = validateSpec({
      type: 'leaderboard_rank',
      provider: 'claude',
      op: 'drops_below',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('leaderboard_watch_threshold_required');
  });

  it('rejects leaderboard_rank with non-integer or negative threshold', () => {
    expect(
      validateSpec({
        type: 'leaderboard_rank',
        provider: 'claude',
        op: 'rises_above',
        threshold: 1.5,
      }).error,
    ).toBe('leaderboard_watch_threshold_required');
    expect(
      validateSpec({
        type: 'leaderboard_rank',
        provider: 'claude',
        op: 'rises_above',
        threshold: 0,
      }).error,
    ).toBe('leaderboard_watch_threshold_required');
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

// ── leaderboardWatchFires ───────────────────────────────────────────

describe('leaderboardWatchFires', () => {
  const spec = (over: Partial<LeaderboardRankWatchSpec> = {}): LeaderboardRankWatchSpec => ({
    type: 'leaderboard_rank',
    provider: 'Claude API',
    op: 'drops_below',
    threshold: 5,
    ...over,
  });

  it('fires drops_below when crossing the threshold edge', () => {
    expect(
      leaderboardWatchFires(spec(), { provider: 'Claude API', from: 5, to: 6, uptime_pct: 99 }),
    ).toBe(true);
    expect(
      leaderboardWatchFires(spec(), { provider: 'Claude API', from: 4, to: 7, uptime_pct: 99 }),
    ).toBe(true);
  });

  it('does not fire drops_below when already below the threshold', () => {
    expect(
      leaderboardWatchFires(spec(), { provider: 'Claude API', from: 7, to: 9, uptime_pct: 99 }),
    ).toBe(false);
  });

  it('fires rises_above when crossing back over the threshold edge', () => {
    expect(
      leaderboardWatchFires(spec({ op: 'rises_above', threshold: 5 }), {
        provider: 'Claude API',
        from: 7,
        to: 4,
        uptime_pct: 99.9,
      }),
    ).toBe(true);
    expect(
      leaderboardWatchFires(spec({ op: 'rises_above', threshold: 5 }), {
        provider: 'Claude API',
        from: 5,
        to: 4,
        uptime_pct: 99.9,
      }),
    ).toBe(true);
  });

  it('does not fire rises_above when already above the threshold', () => {
    expect(
      leaderboardWatchFires(spec({ op: 'rises_above', threshold: 5 }), {
        provider: 'Claude API',
        from: 3,
        to: 2,
        uptime_pct: 99.9,
      }),
    ).toBe(false);
  });

  it('fires changes on any rank movement', () => {
    expect(
      leaderboardWatchFires(spec({ op: 'changes', threshold: undefined }), {
        provider: 'Claude API',
        from: 3,
        to: 4,
        uptime_pct: 99.9,
      }),
    ).toBe(true);
    expect(
      leaderboardWatchFires(spec({ op: 'changes', threshold: undefined }), {
        provider: 'Claude API',
        from: 1,
        to: 5,
        uptime_pct: 99.9,
      }),
    ).toBe(true);
  });

  it('does not fire when rank is unchanged', () => {
    expect(
      leaderboardWatchFires(spec({ op: 'changes', threshold: undefined }), {
        provider: 'Claude API',
        from: 4,
        to: 4,
        uptime_pct: 99.9,
      }),
    ).toBe(false);
  });

  it('rejects mismatched providers', () => {
    expect(
      leaderboardWatchFires(spec(), { provider: 'OpenAI API', from: 5, to: 6, uptime_pct: 99 }),
    ).toBe(false);
  });

  it('matches case-insensitively across slug or display name', () => {
    expect(
      leaderboardWatchFires(spec({ provider: 'claude' }), {
        provider: 'Claude API',
        from: 5,
        to: 6,
        uptime_pct: 99,
      }),
    ).toBe(true);
    expect(
      leaderboardWatchFires(spec({ provider: 'CLAUDE API' }), {
        provider: 'Claude API',
        from: 5,
        to: 6,
        uptime_pct: 99,
      }),
    ).toBe(true);
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

// ── Delivery SSRF hardening (manual-redirect revalidation) ──────────

describe('deliver SSRF redirect guard (network-stubbed)', () => {
  let originalFetch: typeof globalThis.fetch;
  let captured: { url: string; init: RequestInit }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    captured = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does not follow a 302 redirect to a private host', async () => {
    // First (and only allowed) request returns a redirect pointing at the
    // cloud metadata endpoint. A hardened deliver must NOT issue a second
    // fetch to that host; it must drop the delivery as a failure.
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} });
      return new Response(null, {
        status: 302,
        headers: { location: 'https://169.254.169.254/latest/meta-data/' },
      });
    }) as typeof globalThis.fetch;

    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'price', model: 'Opus 4.7', field: 'blended', op: 'lt', threshold: 40 },
      callback_url: 'https://agent.example.com/hook',
      secret: 'shh',
    });
    if (!created.ok) throw new Error('setup failed');

    const before = {
      providers: [{ id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }] }],
    };
    const after = {
      providers: [{ id: 'a', name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 12, outputPrice: 60 }] }],
    };

    const summary = await dispatchPriceWatches(env, before, after);

    // Exactly one fetch (the original POST). The redirect was NOT followed.
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://agent.example.com/hook');
    // The watch still fired (predicate matched) but delivery is a failure.
    expect(summary.watches_fired).toBe(1);
    expect(summary.delivery_failures).toBe(1);
    const stored = await getWatch(env, created.watch.id);
    expect(stored?.last_delivery_status).toBeNull();
  });

  it('follows a 302 redirect to another safe public host', async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} });
      call += 1;
      if (call === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://hooks.agent.dev/relay' },
        });
      }
      return new Response('{"received": true}', { status: 200 });
    }) as typeof globalThis.fetch;

    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'status', provider: 'anthropic', op: 'changes' },
      callback_url: 'https://agent.example.com/hook',
    });
    if (!created.ok) throw new Error('setup failed');

    const summary = await dispatchStatusWatches(env, [
      { provider: 'anthropic', name: 'Anthropic', from: 'operational', to: 'down' },
    ]);

    // Two fetches: original POST + the revalidated public redirect target.
    expect(captured).toHaveLength(2);
    expect(captured[1].url).toBe('https://hooks.agent.dev/relay');
    expect(summary.delivery_failures).toBe(0);
    const stored = await getWatch(env, created.watch.id);
    expect(stored?.last_delivery_status).toBe(200);
  });
});

// ── Digest dispatch (cadence-based) ─────────────────────────────────

describe('runDigestWatchCycle', () => {
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

  function seedHistorySnapshot(env: Env, date: string, providers: { name: string; models: { id: string; name: string; inputPrice: number; outputPrice: number }[] }[]): void {
    const snapshot = {
      date,
      type: 'models',
      capturedAt: `${date}T07:00:00.000Z`,
      data: { providers: providers.map((p, i) => ({ id: `p${i}`, name: p.name, models: p.models })) },
    };
    return void (env.TENSORFEED_CACHE as unknown as { put: (k: string, v: string) => Promise<void> }).put(
      `history:${date}:models`,
      JSON.stringify(snapshot),
    );
  }

  it('fires a never-fired daily digest watch even when no pricing changed', async () => {
    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'digest', cadence: 'daily' },
      callback_url: 'https://agent.example.com/digest',
    });
    if (!created.ok) throw new Error('setup failed');

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sameModels = [{ name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }] }];
    seedHistorySnapshot(env, yesterday, sameModels);
    seedHistorySnapshot(env, today, sameModels);

    const summary = await runDigestWatchCycle(env);
    expect(summary.watches_fired).toBe(1);
    expect(captured).toHaveLength(1);
    const body = JSON.parse(captured[0].init.body as string) as { match: { type: string; cadence: string; pricing: { total_changes: number } } };
    expect(body.match.type).toBe('digest');
    expect(body.match.cadence).toBe('daily');
    expect(body.match.pricing.total_changes).toBe(0);
  });

  it('does NOT re-fire a daily digest within 23 hours', async () => {
    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'digest', cadence: 'daily' },
      callback_url: 'https://agent.example.com/digest',
    });
    if (!created.ok) throw new Error('setup failed');

    // Manually set last_fired_at to 1 hour ago via direct put (simulating a recent fire)
    const watch = await getWatch(env, created.watch.id);
    if (!watch) throw new Error('watch missing');
    watch.last_fired_at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    watch.fire_count = 1;
    await (env.TENSORFEED_CACHE as unknown as { put: (k: string, v: string) => Promise<void> }).put(
      `watch:${watch.id}`,
      JSON.stringify(watch),
    );

    const summary = await runDigestWatchCycle(env);
    expect(summary.watches_fired).toBe(0);
    expect(captured).toHaveLength(0);
  });

  it('includes pricing diff in the digest payload when models changed', async () => {
    const env = makeEnv();
    const created = await createWatch(env, 'tf_live_abc', {
      spec: { type: 'digest', cadence: 'daily' },
      callback_url: 'https://agent.example.com/digest',
    });
    if (!created.ok) throw new Error('setup failed');

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    seedHistorySnapshot(env, yesterday, [
      { name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 15, outputPrice: 75 }] },
    ]);
    seedHistorySnapshot(env, today, [
      { name: 'Anthropic', models: [{ id: 'op', name: 'Opus 4.7', inputPrice: 12, outputPrice: 60 }] },
    ]);

    const summary = await runDigestWatchCycle(env);
    expect(summary.watches_fired).toBe(1);
    const body = JSON.parse(captured[0].init.body as string) as { match: { pricing: { changed: { field: string; from: number; to: number }[]; total_changes: number } } };
    expect(body.match.pricing.changed.length).toBeGreaterThan(0);
    expect(body.match.pricing.total_changes).toBeGreaterThan(0);
  });

  it('fires nothing when no digest watches are registered', async () => {
    const env = makeEnv();
    const summary = await runDigestWatchCycle(env);
    expect(summary).toEqual({ watches_evaluated: 0, watches_fired: 0, delivery_failures: 0 });
    expect(captured).toHaveLength(0);
  });
});

// ── Macro indicator watches ────────────────────────────────────────

describe('validateSpec: macro_indicator', () => {
  it('accepts a well-formed BLS spec with gt threshold', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'bls',
      series_id: 'CUUR0000SA0',
      metric: 'delta_pct',
      op: 'gt',
      threshold: 0.5,
    });
    expect(r.ok).toBe(true);
  });

  it('accepts a FRED spec with crosses op', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'fred',
      series_id: 'T10Y2Y',
      metric: 'value',
      op: 'crosses',
      threshold: 0,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects unknown source', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'cps',
      series_id: 'X',
      metric: 'value',
      op: 'gt',
      threshold: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('macro_watch_source_invalid');
  });

  it('rejects malformed series id', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'bls',
      series_id: 'drop tables;',
      metric: 'value',
      op: 'gt',
      threshold: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('macro_watch_series_id_format');
  });

  it('rejects unknown metric', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'bls',
      series_id: 'CUUR0000SA0',
      metric: 'lunar_phase',
      op: 'gt',
      threshold: 1,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('macro_watch_metric_invalid');
  });

  it('requires threshold for non-changes ops', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'bls',
      series_id: 'CUUR0000SA0',
      metric: 'value',
      op: 'gt',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('macro_watch_threshold_required');
  });

  it('does not require threshold for changes', () => {
    const r = validateSpec({
      type: 'macro_indicator',
      source: 'bls',
      series_id: 'CUUR0000SA0',
      metric: 'value',
      op: 'changes',
    });
    expect(r.ok).toBe(true);
  });
});

describe('macroIndicatorWatchFires', () => {
  const baseSpec: MacroIndicatorWatchSpec = {
    type: 'macro_indicator',
    source: 'fred',
    series_id: 'T10Y2Y',
    metric: 'value',
    op: 'lt',
    threshold: 0,
  };

  it('does not fire when source mismatches', () => {
    expect(
      macroIndicatorWatchFires(baseSpec, {
        source: 'bls', series_id: 'T10Y2Y', metric: 'value', from: 0.5, to: -0.1, period_label: '2026-05-05',
      }),
    ).toBe(false);
  });

  it('does not fire when series mismatches', () => {
    expect(
      macroIndicatorWatchFires(baseSpec, {
        source: 'fred', series_id: 'DFF', metric: 'value', from: 0.5, to: -0.1, period_label: null,
      }),
    ).toBe(false);
  });

  it('lt fires only on edge crossing into satisfaction', () => {
    expect(
      macroIndicatorWatchFires(baseSpec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: 0.5, to: -0.1, period_label: null,
      }),
    ).toBe(true);
    // Already below threshold - should not fire again
    expect(
      macroIndicatorWatchFires(baseSpec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: -0.05, to: -0.1, period_label: null,
      }),
    ).toBe(false);
  });

  it('crosses fires on either direction across threshold', () => {
    const spec: MacroIndicatorWatchSpec = { ...baseSpec, op: 'crosses', threshold: 0 };
    expect(
      macroIndicatorWatchFires(spec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: 0.2, to: -0.1, period_label: null,
      }),
    ).toBe(true);
    expect(
      macroIndicatorWatchFires(spec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: -0.1, to: 0.2, period_label: null,
      }),
    ).toBe(true);
  });

  it('does not fire when from is null (first observation)', () => {
    expect(
      macroIndicatorWatchFires(baseSpec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: null, to: -0.5, period_label: null,
      }),
    ).toBe(false);
  });

  it('changes fires on any change with prior observation', () => {
    const spec: MacroIndicatorWatchSpec = { ...baseSpec, op: 'changes' };
    expect(
      macroIndicatorWatchFires(spec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: 0.5, to: 0.6, period_label: null,
      }),
    ).toBe(true);
  });

  it('series id matching is case-insensitive', () => {
    const spec: MacroIndicatorWatchSpec = { ...baseSpec, series_id: 't10y2y' };
    expect(
      macroIndicatorWatchFires(spec, {
        source: 'fred', series_id: 'T10Y2Y', metric: 'value', from: 0.5, to: -0.1, period_label: null,
      }),
    ).toBe(true);
  });
});

describe('computeMacroIndicatorTransitions', () => {
  it('emits transitions for value, delta_absolute, delta_pct', () => {
    const current = {
      capturedAt: '2026-05-06T05:00:00Z',
      indicators: [
        {
          series_id: 'CUUR0000SA0',
          latest: { value: 313.0, period_label: 'May 2026' },
          delta_absolute: 1.0,
          delta_pct: 0.32,
        },
      ],
    };
    const prev = {
      bls: {
        CUUR0000SA0: { value: 312.0, delta_absolute: 0.8, delta_pct: 0.26, period_label: 'Apr 2026' },
      },
    };
    const out = computeMacroIndicatorTransitions('bls', prev, current);
    expect(out).toHaveLength(3);
    const valueT = out.find(t => t.metric === 'value')!;
    expect(valueT.from).toBe(312);
    expect(valueT.to).toBe(313);
    expect(valueT.period_label).toBe('May 2026');
  });

  it('emits null from when no prior snapshot', () => {
    const current = {
      capturedAt: '2026-05-06T05:00:00Z',
      indicators: [
        {
          series_id: 'CUUR0000SA0',
          latest: { value: 313.0, period_label: 'May 2026' },
          delta_absolute: null,
          delta_pct: null,
        },
      ],
    };
    const out = computeMacroIndicatorTransitions('bls', null, current);
    expect(out).toHaveLength(1);
    expect(out[0].from).toBeNull();
    expect(out[0].to).toBe(313);
  });

  it('emits empty when current is null', () => {
    expect(computeMacroIndicatorTransitions('bls', null, null)).toEqual([]);
  });

  it('skips delta metrics when not provided', () => {
    const current = {
      capturedAt: '2026-05-06',
      indicators: [
        { series_id: 'X', latest: { value: 1, period_label: 'a' }, delta_absolute: null, delta_pct: null },
      ],
    };
    const out = computeMacroIndicatorTransitions('fred', null, current);
    expect(out).toHaveLength(1);
    expect(out[0].metric).toBe('value');
  });
});

// === Free watches (per-IP, no bearer required) ===

const VALID_PRICE_SPEC: PriceWatchSpec = {
  type: 'price',
  model: 'opus-4-7',
  field: 'blended',
  op: 'lt',
  threshold: 50,
};

describe('freeWatchOwnerKey', () => {
  it('returns ip:<addr>', () => {
    expect(freeWatchOwnerKey('1.2.3.4')).toBe('ip:1.2.3.4');
  });
});

describe('createFreeWatch', () => {
  it('creates a watch and stamps the IP-derived owner', async () => {
    const env = makeEnv();
    const out = await createFreeWatch(env, '1.2.3.4', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.watch.token).toBe('ip:1.2.3.4');
    expect(out.watch.fire_cap).toBe(FREE_FIRE_CAP);
    // expires_at should be ~30 days out, not 90.
    const expiresMs = Date.parse(out.watch.expires_at) - Date.now();
    expect(expiresMs).toBeGreaterThan(FREE_WATCH_TTL_SECONDS * 1000 * 0.99);
    expect(expiresMs).toBeLessThan(FREE_WATCH_TTL_SECONDS * 1000 * 1.01);
  });

  it('caps fire_cap at FREE_FIRE_CAP even when caller asks for more', async () => {
    const env = makeEnv();
    const out = await createFreeWatch(env, '2.2.2.2', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook',
      fire_cap: 9999,
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.watch.fire_cap).toBe(FREE_FIRE_CAP);
  });

  it('honors a smaller fire_cap if requested', async () => {
    const env = makeEnv();
    const out = await createFreeWatch(env, '3.3.3.3', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook',
      fire_cap: 10,
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.watch.fire_cap).toBe(10);
  });

  it('auto-generates a 32-hex shared secret when caller omits it', async () => {
    const env = makeEnv();
    const out = await createFreeWatch(env, '3a.3a.3a.3a', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(typeof out.watch.secret).toBe('string');
    expect(out.watch.secret).toMatch(/^[0-9a-f]{32}$/);
  });

  it('preserves caller-supplied secret instead of regenerating', async () => {
    const env = makeEnv();
    const callerVal = 'fake-test-value';
    const out = await createFreeWatch(env, '3b.3b.3b.3b', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook',
      secret: callerVal,
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.watch.secret).toBe(callerVal);
  });

  it('refuses after the per-IP cap is reached', async () => {
    const env = makeEnv();
    const ip = '4.4.4.4';
    for (let i = 0; i < FREE_PER_IP_WATCH_CAP; i += 1) {
      const r = await createFreeWatch(env, ip, {
        spec: VALID_PRICE_SPEC,
        callback_url: `https://agent.example.com/hook${i}`,
      });
      expect(r.ok).toBe(true);
    }
    const denied = await createFreeWatch(env, ip, {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://agent.example.com/hook-overflow',
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe('free_per_ip_watch_cap_reached');
  });

  it('isolates per-IP caps', async () => {
    const env = makeEnv();
    for (let i = 0; i < FREE_PER_IP_WATCH_CAP; i += 1) {
      await createFreeWatch(env, '5.5.5.5', {
        spec: VALID_PRICE_SPEC,
        callback_url: `https://a.example.com/${i}`,
      });
    }
    // A different IP should still be allowed up to its own cap.
    const r = await createFreeWatch(env, '6.6.6.6', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://b.example.com/',
    });
    expect(r.ok).toBe(true);
  });

  it('propagates spec validation errors from the underlying createWatch', async () => {
    const env = makeEnv();
    const out = await createFreeWatch(env, '7.7.7.7', {
      spec: { type: 'bogus' } as never,
      callback_url: 'https://agent.example.com/hook',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('invalid_spec');
  });
});

describe('listFreeWatchesForIP', () => {
  it('returns only the IP-owned watches', async () => {
    const env = makeEnv();
    await createFreeWatch(env, '1.1.1.1', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://a/',
    });
    await createFreeWatch(env, '2.2.2.2', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://b/',
    });
    await createFreeWatch(env, '1.1.1.1', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://c/',
    });
    const out = await listFreeWatchesForIP(env, '1.1.1.1');
    expect(out).toHaveLength(2);
    expect(out.every((w) => w.token === 'ip:1.1.1.1')).toBe(true);
  });
});

describe('getFreeWatch', () => {
  it('returns the watch when IP matches', async () => {
    const env = makeEnv();
    const created = await createFreeWatch(env, '8.8.8.8', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://h/',
    });
    if (!created.ok) throw new Error('seed failed');
    const out = await getFreeWatch(env, created.watch.id, '8.8.8.8');
    expect(out).not.toBeNull();
    expect(out!.id).toBe(created.watch.id);
  });

  it('returns null when IP differs', async () => {
    const env = makeEnv();
    const created = await createFreeWatch(env, '8.8.8.8', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://h/',
    });
    if (!created.ok) throw new Error('seed failed');
    const out = await getFreeWatch(env, created.watch.id, '9.9.9.9');
    expect(out).toBeNull();
  });
});

describe('deleteFreeWatch', () => {
  it('deletes when IP matches', async () => {
    const env = makeEnv();
    const created = await createFreeWatch(env, '8.8.8.8', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://h/',
    });
    if (!created.ok) throw new Error('seed failed');
    const r = await deleteFreeWatch(env, created.watch.id, '8.8.8.8');
    expect(r.ok).toBe(true);
    // Subsequent read returns null.
    const after = await getFreeWatch(env, created.watch.id, '8.8.8.8');
    expect(after).toBeNull();
  });

  it('refuses when IP differs', async () => {
    const env = makeEnv();
    const created = await createFreeWatch(env, '8.8.8.8', {
      spec: VALID_PRICE_SPEC,
      callback_url: 'https://h/',
    });
    if (!created.ok) throw new Error('seed failed');
    const r = await deleteFreeWatch(env, created.watch.id, '9.9.9.9');
    expect(r.ok).toBe(false);
  });
});
