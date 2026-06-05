import { describe, it, expect, vi } from 'vitest';
import {
  resolveDeadlineMs,
  isDeadlineExempt,
  raceDeadline,
  buildDeadlineResponse,
  DEFAULT_REQUEST_DEADLINE_MS,
} from './deadline';

describe('resolveDeadlineMs', () => {
  it('defaults when the override is absent', () => {
    expect(resolveDeadlineMs(undefined)).toBe(DEFAULT_REQUEST_DEADLINE_MS);
  });
  it('uses a positive numeric override', () => {
    expect(resolveDeadlineMs('30000')).toBe(30000);
  });
  it('trims surrounding whitespace', () => {
    expect(resolveDeadlineMs('  15000  ')).toBe(15000);
  });
  it('defaults on an empty string', () => {
    expect(resolveDeadlineMs('')).toBe(DEFAULT_REQUEST_DEADLINE_MS);
  });
  it('defaults on a non-numeric override', () => {
    expect(resolveDeadlineMs('soon')).toBe(DEFAULT_REQUEST_DEADLINE_MS);
  });
  it('defaults on zero or negative values', () => {
    expect(resolveDeadlineMs('0')).toBe(DEFAULT_REQUEST_DEADLINE_MS);
    expect(resolveDeadlineMs('-5')).toBe(DEFAULT_REQUEST_DEADLINE_MS);
  });
});

describe('isDeadlineExempt', () => {
  it('exempts admin endpoints (server-to-server, may run long)', () => {
    expect(isDeadlineExempt('/api/admin/request-health')).toBe(true);
    expect(isDeadlineExempt('/api/admin/refresh')).toBe(true);
  });
  it('exempts the public refresh endpoint (refetches all feeds)', () => {
    expect(isDeadlineExempt('/api/refresh')).toBe(true);
  });
  it('does NOT exempt the hot public paths we want to watch', () => {
    expect(isDeadlineExempt('/api/agents/activity')).toBe(false);
    expect(isDeadlineExempt('/api/mcp')).toBe(false);
    expect(isDeadlineExempt('/api/status')).toBe(false);
    expect(isDeadlineExempt('/')).toBe(false);
  });
});

describe('raceDeadline', () => {
  it('returns the handler response when it resolves before the deadline', async () => {
    vi.useFakeTimers();
    try {
      const ok = new Response(null, { status: 200 });
      const res = await raceDeadline(
        Promise.resolve(ok),
        20000,
        () => new Response(null, { status: 504 }),
      );
      expect(res).toBe(ok);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns the built 504 when the handler hangs past the deadline', async () => {
    vi.useFakeTimers();
    try {
      let built = 0;
      const build504 = () => {
        built++;
        return new Response(null, { status: 504 });
      };
      const p = raceDeadline(new Promise<Response>(() => {}), 20000, build504);
      await vi.advanceTimersByTimeAsync(20000);
      const res = await p;
      expect(res.status).toBe(504);
      expect(built).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the 504 even if the handler resolves after the deadline already fired', async () => {
    vi.useFakeTimers();
    try {
      let resolveWork: (r: Response) => void = () => {};
      const work = new Promise<Response>((r) => {
        resolveWork = r;
      });
      const p = raceDeadline(work, 20000, () => new Response(null, { status: 504 }));
      await vi.advanceTimersByTimeAsync(20000);
      resolveWork(new Response(null, { status: 200 }));
      const res = await p;
      expect(res.status).toBe(504);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not build a 504 when the handler wins (no premature shed)', async () => {
    vi.useFakeTimers();
    try {
      let built = 0;
      const res = await raceDeadline(
        Promise.resolve(new Response(null, { status: 200 })),
        20000,
        () => {
          built++;
          return new Response(null, { status: 504 });
        },
      );
      expect(res.status).toBe(200);
      expect(built).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('buildDeadlineResponse', () => {
  it('returns a 504 with a Retry-After header', () => {
    const res = buildDeadlineResponse('/api/agents/activity', 20000, {});
    expect(res.status).toBe(504);
    expect(res.headers.get('Retry-After')).toBe('5');
  });

  it('emits agent-parseable JSON naming the path and deadline', async () => {
    const res = buildDeadlineResponse('/api/mcp', 20000, {});
    expect(res.headers.get('Content-Type')).toBe('application/json');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe('request_deadline_exceeded');
    expect(body.path).toBe('/api/mcp');
    expect(body.deadline_ms).toBe(20000);
  });

  it('never caches a shed response', () => {
    const res = buildDeadlineResponse('/api/status', 20000, {});
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('merges the supplied CORS headers so agents can read the body', () => {
    const res = buildDeadlineResponse('/api/status', 20000, {
      'Access-Control-Allow-Origin': '*',
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
