import { describe, it, expect } from 'vitest';
import { aggregateHostedFromAeRows, lastNDatesUtc } from './mcp-activity';

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
