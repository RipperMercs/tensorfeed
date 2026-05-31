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
    expect(body.version).toBe('1.36.2');
    expect(body.protocolVersion).toBe('2024-11-05');
    expect(body.tools_count).toBe(MCP_TOOLS_COUNT);
    expect(typeof body.full_tool_set).toBe('string');
    expect(body.full_tool_set).toContain('@tensorfeed/mcp-server');
    expect(body.full_tool_set).toContain('61');
  });
});

describe('initialize', () => {
  it('returns server info and capabilities', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('initialize'), env);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { result: Record<string, unknown> };
    expect(body.result.protocolVersion).toBe('2024-11-05');
    expect(body.result.serverInfo).toMatchObject({ name: 'tensorfeed', version: '1.36.2' });
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

  it('requires a bearer token and points to the faucet', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(
      rpcRequest('tools/call', { name: 'route_verdict', arguments: { task: 'code' } }),
      env,
    );
    const body = (await resp.json()) as { result: { content: { text: string }[]; isError?: boolean } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('authentication_required');
    expect(body.result.content[0].text).toContain('trial-credits');
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

describe('CORS', () => {
  it('includes CORS headers on POST responses', async () => {
    const env = makeEnv();
    const resp = await handleMcpHttpRequest(rpcRequest('ping'), env);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
