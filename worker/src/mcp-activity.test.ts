import { describe, it, expect, vi } from 'vitest';
import {
  aggregateHostedFromAeRows,
  lastNDatesUtc,
  aggregateMcpMethodRows,
  normalizeMcpMethod,
  recordMcpMethod,
} from './mcp-activity';
import type { Env } from './types';

describe('lastNDatesUtc', () => {
  it('returns n UTC dates, today first, descending', () => {
    expect(lastNDatesUtc('2026-06-03', 3)).toEqual(['2026-06-03', '2026-06-02', '2026-06-01']);
  });
  it('crosses a month boundary correctly', () => {
    expect(lastNDatesUtc('2026-06-01', 2)).toEqual(['2026-06-01', '2026-05-31']);
  });
});

describe('aggregateHostedFromAeRows', () => {
  const today = '2026-06-03';

  it('aggregates per-tool calls across tiers, ranks them, and totals by day', () => {
    const toolRows = [
      { tool: 'get_news', tier: 'free', calls: 40 },
      { tool: 'premium_whats_new', tier: 'premium', calls: 12 },
      { tool: 'get_status', tier: 'free', calls: 7 },
    ];
    const dayRows = [
      { day: '2026-06-03', calls: 30 },
      { day: '2026-06-02', calls: 29 },
    ];
    const out = aggregateHostedFromAeRows(toolRows, dayRows, today);

    expect(out.top_tools_7d[0]).toEqual({ tool: 'get_news', count: 40, tier: 'free' });
    expect(out.top_tools_7d.find((t) => t.tool === 'premium_whats_new')?.tier).toBe('premium');

    expect(out.today_total).toBe(30);
    expect(out.last_7d_total).toBe(59);
    expect(out.last_30d_total).toBe(59);

    // 30-day continuous series, oldest first, last entry is today.
    expect(out.daily_series_30d).toHaveLength(30);
    expect(out.daily_series_30d[29]).toEqual({ date: '2026-06-03', count: 30 });
    expect(out.daily_series_30d[28]).toEqual({ date: '2026-06-02', count: 29 });
    // A day with no row fills with 0.
    expect(out.daily_series_30d[27]).toEqual({ date: '2026-06-01', count: 0 });
  });

  it('coerces string-typed numeric cells (AE may serialize numbers as strings)', () => {
    const out = aggregateHostedFromAeRows(
      [{ tool: 'get_news', tier: 'free', calls: '5' }],
      [{ day: '2026-06-03', calls: '5' }],
      today,
    );
    expect(out.top_tools_7d[0].count).toBe(5);
    expect(out.today_total).toBe(5);
  });

  it('sums multiple tier rows for the same tool and picks the dominant tier', () => {
    const out = aggregateHostedFromAeRows(
      [
        { tool: 'mixed_tool', tier: 'free', calls: 3 },
        { tool: 'mixed_tool', tier: 'premium', calls: 8 },
      ],
      [],
      today,
    );
    expect(out.top_tools_7d[0]).toEqual({ tool: 'mixed_tool', count: 11, tier: 'premium' });
  });

  it('treats empty AE data as a valid zeroed block', () => {
    const out = aggregateHostedFromAeRows([], [], today);
    expect(out.top_tools_7d).toEqual([]);
    expect(out.today_total).toBe(0);
    expect(out.last_7d_total).toBe(0);
    expect(out.last_30d_total).toBe(0);
    expect(out.daily_series_30d).toHaveLength(30);
    expect(out.daily_series_30d.every((d) => d.count === 0)).toBe(true);
  });

  it('skips rows with an empty tool name', () => {
    const out = aggregateHostedFromAeRows([{ tool: '', tier: 'free', calls: 9 }], [], today);
    expect(out.top_tools_7d).toEqual([]);
  });

  it('caps the tool list at 10', () => {
    const toolRows = Array.from({ length: 25 }, (_, i) => ({ tool: `tool_${i}`, tier: 'free', calls: 25 - i }));
    const out = aggregateHostedFromAeRows(toolRows, [], today);
    expect(out.top_tools_7d).toHaveLength(10);
    expect(out.top_tools_7d[0].tool).toBe('tool_0');
  });

  it('emits no em dash or double hyphen in any output string', () => {
    const out = aggregateHostedFromAeRows(
      [{ tool: 'x', tier: 'free', calls: 1 }],
      [{ day: today, calls: 1 }],
      today,
    );
    const s = JSON.stringify(out);
    expect([...s].some((c) => c.codePointAt(0) === 0x2014)).toBe(false);
    expect(s.includes('--')).toBe(false);
  });
});

describe('normalizeMcpMethod', () => {
  it('keeps the methods the endpoint actually answers', () => {
    for (const m of ['GET', 'initialize', 'notifications/initialized', 'ping', 'tools/list', 'tools/call']) {
      expect(normalizeMcpMethod(m)).toBe(m);
    }
  });

  it('keeps the two malformed buckets distinct, since they are the scanner tell', () => {
    expect(normalizeMcpMethod('parse_error')).toBe('parse_error');
    expect(normalizeMcpMethod('invalid_request')).toBe('invalid_request');
  });

  it('collapses anything else so a scanner cannot blow up index cardinality', () => {
    for (const m of ['resources/list', 'admin/../../etc/passwd', '', 'x'.repeat(500)]) {
      expect(normalizeMcpMethod(m)).toBe('other');
    }
  });
});

describe('recordMcpMethod', () => {
  it('writes one datapoint keyed by method with the UA family', () => {
    const writeDataPoint = vi.fn();
    recordMcpMethod({ MCP_METHOD_AE: { writeDataPoint } } as unknown as Env, 'tools/list', 'claude');
    expect(writeDataPoint).toHaveBeenCalledOnce();
    const dp = writeDataPoint.mock.calls[0][0];
    expect(dp.indexes).toEqual(['tools/list']);
    expect(dp.blobs[0]).toBe('tools/list');
    expect(dp.blobs[1]).toBe('claude');
  });

  it('normalizes an unknown method before indexing it', () => {
    const writeDataPoint = vi.fn();
    recordMcpMethod({ MCP_METHOD_AE: { writeDataPoint } } as unknown as Env, 'resources/read', 'axios');
    expect(writeDataPoint.mock.calls[0][0].indexes).toEqual(['other']);
  });

  it('no-ops without the binding instead of throwing', () => {
    expect(() => recordMcpMethod({} as Env, 'initialize', 'curl')).not.toThrow();
  });

  it('never lets a telemetry failure escape into the request path', () => {
    const writeDataPoint = vi.fn(() => {
      throw new Error('AE down');
    });
    expect(() =>
      recordMcpMethod({ MCP_METHOD_AE: { writeDataPoint } } as unknown as Env, 'ping', 'node'),
    ).not.toThrow();
  });
});

describe('aggregateMcpMethodRows', () => {
  const methodRows = [
    { method: 'GET', requests: 6000 },
    { method: 'initialize', requests: 3000 },
    { method: 'tools/list', requests: 2900 },
    { method: 'tools/call', requests: 9 },
    { method: 'parse_error', requests: 80 },
    { method: 'invalid_request', requests: 11 },
  ];
  const uaRows = [
    { ua: 'scanbot', method: 'GET', requests: 5800 },
    { ua: 'claude', method: 'initialize', requests: 40 },
    { ua: 'claude', method: 'tools/list', requests: 40 },
    { ua: 'claude', method: 'tools/call', requests: 9 },
    { ua: 'axios', method: 'initialize', requests: 2900 },
    { ua: 'axios', method: 'tools/list', requests: 2800 },
  ];

  it('totals requests and ranks methods by share', () => {
    const out = aggregateMcpMethodRows(methodRows, uaRows, 1);
    expect(out.total_requests).toBe(12000);
    expect(out.by_method[0]).toMatchObject({ method: 'GET', requests: 6000 });
    expect(out.by_method[0].share).toBeCloseTo(0.5, 5);
    expect(out.window_days).toBe(1);
  });

  it('exposes the handshake-to-call ratio that tools/call alone could not show', () => {
    const out = aggregateMcpMethodRows(methodRows, uaRows, 1);
    expect(out.handshake).toMatchObject({ initialize: 3000, tools_list: 2900, tools_call: 9 });
    // 9 calls against 3000 connections: clients read the catalog and leave.
    expect(out.handshake.calls_per_initialize).toBeCloseTo(9 / 3000, 6);
    expect(out.handshake.malformed).toBe(91);
  });

  it('separates the client that actually invokes tools from the ones that only handshake', () => {
    const out = aggregateMcpMethodRows(methodRows, uaRows, 7);
    const claude = out.by_ua.find((u) => u.ua === 'claude');
    const axios = out.by_ua.find((u) => u.ua === 'axios');
    expect(claude).toMatchObject({ requests: 89, tools_call: 9, distinct_methods: 3 });
    // axios connects 2,900 times and never calls a tool.
    expect(axios).toMatchObject({ requests: 5700, tools_call: 0 });
  });

  it('ranks UAs by volume and caps the list', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      ua: `ua${i}`,
      method: 'initialize',
      requests: i,
    }));
    const out = aggregateMcpMethodRows([{ method: 'initialize', requests: 780 }], many, 30);
    expect(out.by_ua).toHaveLength(20);
    expect(out.by_ua[0].ua).toBe('ua39');
  });

  it('coerces string-typed numeric cells and survives an empty dataset', () => {
    const out = aggregateMcpMethodRows(
      [{ method: 'initialize', requests: '12' }],
      [{ ua: 'curl', method: 'initialize', requests: '12' }],
      1,
    );
    expect(out.total_requests).toBe(12);

    const empty = aggregateMcpMethodRows([], [], 1);
    expect(empty.total_requests).toBe(0);
    expect(empty.handshake.calls_per_initialize).toBe(0);
    expect(empty.by_method).toEqual([]);
  });
});
