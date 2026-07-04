import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleMcpHttpRequest, MCP_TOOLS_COUNT, MCP_HTTP_TOOLS } from './mcp-http';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  ttls = new Map<string, number | undefined>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
    this.ttls.set(key, opts?.expirationTtl);
  }
}

function makeEnv(extras: Partial<Env> = {}): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
    ...extras,
  } as unknown as Env;
}

function rpcRequest(method: string, params?: unknown, id: string | number = 1): Request {
  return new Request('https://tensorfeed.ai/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
}

describe('handleMcpHttpRequest GET', () => {
  it('returns discovery info on GET', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', { method: 'GET' }),
      env,
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as Record<string, unknown>;
    expect(body.name).toBe('tensorfeed');
    expect(body.version).toBe('1.37.0');
    expect(body.protocolVersion).toBe('2024-11-05');
    expect(body.tools_count).toBe(MCP_TOOLS_COUNT);
    expect(typeof body.full_tool_set).toBe('string');
    expect(body.full_tool_set).toContain('@tensorfeed/mcp-server');
    expect(body.full_tool_set).toContain('24');
  });
});

describe('initialize', () => {
  it('returns server info and capabilities', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('initialize'), env);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { result: Record<string, unknown> };
    expect(body.result.protocolVersion).toBe('2024-11-05');
    expect(body.result.serverInfo).toMatchObject({ name: 'tensorfeed', version: '1.37.0' });
    expect(body.result.capabilities).toHaveProperty('tools');
  });
});

describe('notifications/initialized', () => {
  it('returns 202 Accepted with no body (per JSON-RPC notification semantics)', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('notifications/initialized'), env);
    expect(resp.status).toBe(202);
  });
});

describe('ping', () => {
  it('returns empty result for liveness probe', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('ping'), env);
    const body = (await resp.json()) as { result: unknown };
    expect(body.result).toEqual({});
  });
});

describe('tools/list', () => {
  it('returns the V1 tool catalog', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('tools/list'), env);
    const body = (await resp.json()) as { result: { tools: { name: string; description: string }[] } };
    expect(body.result.tools.length).toBe(MCP_TOOLS_COUNT);
    expect(body.result.tools.length).toBeGreaterThanOrEqual(10);
    const names = body.result.tools.map((t) => t.name);
    expect(names).toContain('get_news_articles');
    expect(names).toContain('get_status_summary');
    expect(names).toContain('search_sec_edgar');
    expect(names).toContain('get_sec_submissions');
    expect(names).toContain('get_eia_series');
    expect(names).toContain('get_cve_record');
    expect(names).toContain('get_kev_catalog');
    expect(names).toContain('get_agent_opportunities');
  });

  it('every tool has a description and inputSchema', () => {
    for (const tool of MCP_HTTP_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
    }
  });
});

describe('route_verdict premium tool', () => {
  function authedCall(args: Record<string, unknown>, token: string): Request {
    return new Request('https://tensorfeed.ai/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'route_verdict', arguments: args } }),
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is listed as a premium tool', () => {
    const tool = MCP_HTTP_TOOLS.find((t) => t.name === 'route_verdict');
    expect(tool).toBeDefined();
    expect(tool!.tier).toBe('premium');
  });

  it('returns structured payment_required with canonical accepts when unpaid', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'route_verdict', arguments: { task: 'code' } }),
      env,
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { result: { content: { text: string }[]; isError?: boolean } };
    // In-band mode is a structured result, not an MCP tool error.
    expect(body.result.isError).toBeUndefined();
    const payload = JSON.parse(body.result.content[0].text) as {
      ok: boolean;
      error: string;
      payment_requirements: { x402Version: number; accepts: { scheme: string; amount: string }[] };
      how_to_pay: { x402_wallet: string; credits: string; free_trial_note: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('payment_required');
    expect(payload.payment_requirements.x402Version).toBe(2);
    expect(payload.payment_requirements.accepts.length).toBeGreaterThanOrEqual(1);
    expect(payload.payment_requirements.accepts[0].scheme).toBe('exact');
    // 1 credit = $0.02 = 20000 micro-USDC.
    expect(payload.payment_requirements.accepts[0].amount).toBe('20000');
    expect(payload.how_to_pay.credits).toContain('trial-credits');
    expect(payload.how_to_pay.x402_wallet).toContain('x402=strict');
    // Unpaid calls must never relay: the free-trial IP quota stays unreachable.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('relays the upstream verdict to the premium REST endpoint with the bearer', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, verdict: { model: { name: 'Claude Sonnet 4.6' } }, billing: { credits_charged: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resp = await handleMcpHttpRequest(authedCall({ task: 'code' }, 'tf_live_testtoken'), env);
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    expect(body.result.content[0].text).toContain('Claude Sonnet 4.6');
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/premium/route-verdict');
    expect(calledUrl).toContain('task=code');
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tf_live_testtoken');
  });

  it('surfaces payment_required and the faucet when the upstream returns 402', async () => {
    const env = makeEnv();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'payment_required' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resp = await handleMcpHttpRequest(authedCall({ task: 'code' }, 'tf_live_broke'), env);
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    expect(body.result.content[0].text).toContain('payment_required');
    expect(body.result.content[0].text).toContain('trial-credits');
  });
});

describe('whats_new premium tool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is listed as a premium tool with a payment argument', () => {
    const tool = MCP_HTTP_TOOLS.find((t) => t.name === 'whats_new');
    expect(tool).toBeDefined();
    expect(tool!.tier).toBe('premium');
    const props = (tool!.inputSchema as { properties: Record<string, unknown> }).properties;
    expect(props).toHaveProperty('payment');
    expect(props).toHaveProperty('days');
    expect(props).toHaveProperty('news_limit');
    expect(tool!.description).toContain('1 credit');
    expect(tool!.description).toContain('trial-credits');
  });

  it('relays to /api/premium/whats-new with mapped params', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, brief: { headlines: 12 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'whats_new', arguments: { days: 2, news_limit: 5, payment: 'b64payload' } }),
      env,
    );
    expect(resp.status).toBe(200);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/premium/whats-new');
    expect(calledUrl).toContain('days=2');
    expect(calledUrl).toContain('news_limit=5');
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-PAYMENT']).toBe('b64payload');
    expect(headers['User-Agent']).toBe('tensorfeed-mcp/whats_new');
  });

  it('returns canonical requirements bound to the whats-new resource when unpaid', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'whats_new', arguments: {} }),
      env,
    );
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    const payload = JSON.parse(body.result.content[0].text) as {
      error: string;
      payment_requirements: { resource: { url: string } };
    };
    expect(payload.error).toBe('payment_required');
    expect(payload.payment_requirements.resource.url).toBe('https://tensorfeed.ai/api/premium/whats-new');
  });
});

describe('tools/call', () => {
  it('returns error for unknown tool', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'nonexistent_tool' }),
      env,
    );
    const body = (await resp.json()) as { error?: { code: number; message: string } };
    expect(body.error?.code).toBe(-32601);
    expect(body.error?.message).toMatch(/unknown tool/);
  });

  it('returns error when params is missing', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('tools/call'), env);
    const body = (await resp.json()) as { error?: { code: number; message: string } };
    expect(body.error?.code).toBe(-32602);
  });

  it('runs get_news_articles against KV', async () => {
    const env = makeEnv();
    const news = env.TENSORFEED_NEWS as unknown as MockKV;
    news.store.set(
      'articles',
      JSON.stringify([
        { id: 'a1', title: 'Mythos ships', source: 'Anthropic', categories: ['models'] },
        { id: 'a2', title: 'GPT-5.5', source: 'OpenAI', categories: ['models'] },
      ]),
    );
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'get_news_articles', arguments: { limit: 5 } }),
      env,
    );
    const body = (await resp.json()) as {
      result: { content: { text: string }[] };
    };
    const text = body.result.content[0].text;
    expect(text).toContain('Mythos ships');
    expect(text).toContain('GPT-5.5');
  });

  it('returns helpful validation_error when arguments are invalid', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'get_cve_record', arguments: {} }),
      env,
    );
    const body = (await resp.json()) as {
      result: { content: { text: string }[]; isError: boolean };
    };
    expect(body.result.isError).toBe(true);
    // Validation errors are intentional, safe to surface verbatim
    expect(body.result.content[0].text).toMatch(/^validation_error: /);
    expect(body.result.content[0].text).toMatch(/cve_id is required/);
  });

  it('buckets runtime exceptions and never echoes raw .message to client', async () => {
    // Force a runtime exception by making the KV.get throw with a message
    // that, if echoed back, would represent information disclosure.
    const env = makeEnv();
    const news = env.TENSORFEED_NEWS as unknown as MockKV;
    const leakage =
      'ENOTFOUND /var/cloudflare/worker/internal/secret-namespace-id KV-binding-leaked';
    news.get = async () => {
      throw new Error(leakage);
    };
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', {
        name: 'get_news_articles',
        arguments: { limit: 5 },
      }),
      env,
    );

    const body = (await resp.json()) as {
      result: { content: { text: string }[]; isError: boolean };
    };
    const text = body.result.content[0].text;
    expect(body.result.isError).toBe(true);
    // Bucketed code + correlation tag, no raw exception message leaked
    expect(text).toMatch(/^tool_error:/);
    expect(text).toMatch(/ref=[a-f0-9]{12}$/);
    // Critical: the original error message must NOT appear in the response
    expect(text).not.toContain('/var/cloudflare/worker/internal/secret-namespace-id');
    expect(text).not.toContain('KV-binding-leaked');
  });
});

describe('JSON-RPC envelope', () => {
  it('rejects malformed JSON with parse_error code', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json',
      }),
      env,
    );
    const body = (await resp.json()) as { error: { code: number; message: string } };
    expect(body.error.code).toBe(-32700);
  });

  it('rejects non-2.0 jsonrpc with invalid_request', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', id: 1, method: 'ping' }),
      }),
      env,
    );
    const body = (await resp.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32600);
  });

  it('returns method_not_found for unknown method', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('totally_bogus_method'), env);
    const body = (await resp.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32601);
  });

  it('preserves the request id in the response', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('ping', undefined, 'custom-id-123'), env);
    const body = (await resp.json()) as { id: string };
    expect(body.id).toBe('custom-id-123');
  });
});

describe('HTTP method handling', () => {
  it('rejects DELETE with 405', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', { method: 'DELETE' }),
      env,
    );
    expect(resp.status).toBe(405);
  });
});

describe('MCP handshake payloads (memoized)', () => {
  it('tools/list returns the full tool set, stable across calls', async () => {
    const env = {} as never;
    const r1 = await (await handleMcpHttpRequest(rpcRequest('tools/list'), env)).json() as { result: { tools: unknown[] } };
    const r2 = await (await handleMcpHttpRequest(rpcRequest('tools/list'), env)).json() as { result: { tools: unknown[] } };
    expect(r1.result.tools.length).toBe(MCP_TOOLS_COUNT);
    expect(r2.result.tools).toEqual(r1.result.tools);
  });

  it('initialize returns the server info', async () => {
    const env = {} as never;
    const r = await (await handleMcpHttpRequest(rpcRequest('initialize'), env)).json() as { result: { serverInfo: { name: string }; protocolVersion: string } };
    expect(r.result.serverInfo.name).toBeTruthy();
    expect(r.result.protocolVersion).toBeTruthy();
  });

  it('GET discovery returns the tools_count', async () => {
    const env = {} as never;
    const r = await (await handleMcpHttpRequest(new Request('https://tensorfeed.ai/api/mcp', { method: 'GET' }), env)).json() as { tools_count: number };
    expect(r.tools_count).toBe(MCP_TOOLS_COUNT);
  });
});

describe('CORS', () => {
  it('includes CORS headers on POST responses', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('ping'), env);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('strict x402 mode', () => {
  function strictCall(url: string, params: unknown): Request {
    return new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params }),
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns HTTP 402 with PAYMENT-REQUIRED header and JSON-RPC error envelope when unpaid', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const resp = await handleMcpHttpRequest(
      strictCall('https://tensorfeed.ai/api/mcp?x402=strict', { name: 'route_verdict', arguments: { task: 'code' } }),
      env,
    );
    expect(resp.status).toBe(402);
    expect(resp.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
    expect(resp.headers.get('Access-Control-Expose-Headers')).toContain('PAYMENT-REQUIRED');
    const body = (await resp.json()) as {
      error: { code: number; message: string; data: { x402Version: number; accepts: unknown[] } };
    };
    expect(body.error.code).toBe(-32402);
    expect(body.error.message).toBe('payment_required');
    expect(body.error.data.x402Version).toBe(2);
    expect(body.error.data.accepts.length).toBeGreaterThanOrEqual(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('works identically through the vanity host URL shape', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      strictCall('https://mcp.tensorfeed.ai/mcp?x402=strict', { name: 'route_verdict', arguments: { task: 'code' } }),
      env,
    );
    expect(resp.status).toBe(402);
    expect(resp.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
  });

  it('does not affect free tools', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      strictCall('https://tensorfeed.ai/api/mcp?x402=strict', { name: 'check_free_tier_status', arguments: {} }),
      env,
    );
    expect(resp.status).toBe(200);
  });

  it('strict-mode PAYMENT-REQUIRED header matches the REST sibling byte for byte', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      strictCall('https://tensorfeed.ai/api/mcp?x402=strict', { name: 'route_verdict', arguments: {} }),
      env,
    );
    const { paymentRequiredResponse } = await import('./payments');
    const restRes = paymentRequiredResponse(env, 1, 1, new Request('https://tensorfeed.ai/api/premium/route-verdict'));
    expect(resp.headers.get('PAYMENT-REQUIRED')).toBe(restRes.headers.get('PAYMENT-REQUIRED'));
  });
});

describe('wallet-native x402 payment paths', () => {
  function paidHeaderCall(payment: string, extraHeaders: Record<string, string> = {}): Request {
    return new Request('https://tensorfeed.ai/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PAYMENT': payment, ...extraHeaders },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'route_verdict', arguments: { task: 'code' } } }),
    });
  }

  function okUpstream(headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify({ ok: true, verdict: { model: { name: 'Claude Fable 5' } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('relays an X-PAYMENT request header as X-PAYMENT to the REST sibling, without Authorization', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream());
    const resp = await handleMcpHttpRequest(paidHeaderCall('b64payload'), env);
    expect(resp.status).toBe(200);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-PAYMENT']).toBe('b64payload');
    expect(headers.Authorization).toBeUndefined();
    expect(headers['User-Agent']).toBe('tensorfeed-mcp/route_verdict');
  });

  it('accepts PAYMENT-SIGNATURE as an alias, and X-PAYMENT wins when both are present', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream());
    await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'PAYMENT-SIGNATURE': 'sigpayload' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'route_verdict', arguments: {} } }),
      }),
      env,
    );
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toMatchObject({ 'X-PAYMENT': 'sigpayload' });

    vi.restoreAllMocks();
    const fetchSpy2 = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream());
    await handleMcpHttpRequest(paidHeaderCall('xp', { 'PAYMENT-SIGNATURE': 'sig' }), env);
    expect((fetchSpy2.mock.calls[0][1] as RequestInit).headers).toMatchObject({ 'X-PAYMENT': 'xp' });
  });

  it('relays arguments.payment for header-incapable clients', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream());
    await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'route_verdict', arguments: { task: 'code', payment: 'argpayload' } }),
      env,
    );
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-PAYMENT']).toBe('argpayload');
    // The payment argument must not leak into the relayed query string.
    expect(fetchSpy.mock.calls[0][0] as string).not.toContain('argpayload');
  });

  it('payment header beats arguments.payment beats bearer', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream());
    await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PAYMENT': 'headerwins', Authorization: 'Bearer tf_live_x' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'route_verdict', arguments: { payment: 'argloses' } } }),
      }),
      env,
    );
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-PAYMENT']).toBe('headerwins');
    expect(headers.Authorization).toBeUndefined();
  });

  it('lifts upstream PAYMENT-RESPONSE onto the MCP response and embeds it in the result', async () => {
    const env = makeEnv();
    const settle = btoa(JSON.stringify({ success: true, transaction: '0xabc' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpstream({ 'PAYMENT-RESPONSE': settle }));
    const resp = await handleMcpHttpRequest(paidHeaderCall('b64payload'), env);
    expect(resp.headers.get('PAYMENT-RESPONSE')).toBe(settle);
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    const payload = JSON.parse(body.result.content[0].text) as { payment_response: { transaction: string } };
    expect(payload.payment_response.transaction).toBe('0xabc');
  });

  it('maps upstream 402 with payment attached to payment_failed in default mode', async () => {
    const env = makeEnv();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'settle_failed' }), { status: 402, headers: { 'Content-Type': 'application/json' } }),
    );
    const resp = await handleMcpHttpRequest(paidHeaderCall('badpayload'), env);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    const payload = JSON.parse(body.result.content[0].text) as { error: string; upstream: { error: string } };
    expect(payload.error).toBe('payment_failed');
    expect(payload.upstream.error).toBe('settle_failed');
  });

  it('passes upstream 402 through at transport level in strict mode', async () => {
    const env = makeEnv();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'settle_failed' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json', 'PAYMENT-REQUIRED': 'freshreqs' },
      }),
    );
    const resp = await handleMcpHttpRequest(
      new Request('https://tensorfeed.ai/api/mcp?x402=strict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PAYMENT': 'badpayload' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'route_verdict', arguments: {} } }),
      }),
      env,
    );
    expect(resp.status).toBe(402);
    expect(resp.headers.get('PAYMENT-REQUIRED')).toBe('freshreqs');
  });

  it('rejects oversized payment payloads before any relay', async () => {
    const env = makeEnv();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'route_verdict', arguments: { payment: 'x'.repeat(9000) } }),
      env,
    );
    const body = (await resp.json()) as { result: { content: { text: string }[]; isError?: boolean } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('payment payload exceeds 8KB');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('paid upstream timeout tells the agent to verify before re-paying', async () => {
    const env = makeEnv();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('The operation was aborted due to timeout'));
    const resp = await handleMcpHttpRequest(paidHeaderCall('b64payload'), env);
    const body = (await resp.json()) as { result: { content: { text: string }[] } };
    const payload = JSON.parse(body.result.content[0].text) as { error: string; detail: string };
    expect(payload.error).toBe('upstream_timeout');
    expect(payload.detail).toContain('Do not blind-retry');
  });
});

describe('payment self-description', () => {
  it('GET discovery advertises both payment surfaces and strict mode', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(new Request('https://tensorfeed.ai/api/mcp', { method: 'GET' }), env);
    const body = (await resp.json()) as { payment: { premium_tools: string[]; x402: string } };
    expect(body.payment.premium_tools).toEqual(['route_verdict', 'whats_new']);
    expect(body.payment.x402).toContain('x402=strict');
  });

  it('initialize instructions mention wallet-native x402', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('initialize'), env);
    const body = (await resp.json()) as { result: { instructions: string } };
    expect(body.result.instructions).toContain('X-PAYMENT');
    expect(body.result.instructions).toContain('x402=strict');
  });
});
