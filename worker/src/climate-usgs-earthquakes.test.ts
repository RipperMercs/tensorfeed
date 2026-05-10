import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseEarthquakeQuery,
  fetchUSGSEarthquakes,
  USGS_VALID_MAGNITUDES,
  USGS_VALID_PERIODS,
} from './climate-usgs-earthquakes';
import type { Env } from './types';

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const store = new Map<string, string>(
    Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  const cache = {
    get: vi.fn(async (key: string, _type?: 'json') => {
      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
  return { TENSORFEED_CACHE: cache } as unknown as Env;
}

describe('parseEarthquakeQuery', () => {
  it('uses sensible defaults', () => {
    const r = parseEarthquakeQuery(new URL('https://x/y'));
    expect(r.ok).toBe(true);
    expect(r.query?.magnitude).toBe('4.5');
    expect(r.query?.period).toBe('day');
    expect(r.query?.limit).toBe(50);
  });

  it('rejects unknown magnitude', () => {
    const r = parseEarthquakeQuery(new URL('https://x/y?magnitude=8.9'));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid_magnitude');
  });

  it('rejects unknown period', () => {
    const r = parseEarthquakeQuery(new URL('https://x/y?period=year'));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid_period');
  });

  it('rejects out-of-range limit', () => {
    expect(parseEarthquakeQuery(new URL('https://x/y?limit=0')).ok).toBe(false);
    expect(parseEarthquakeQuery(new URL('https://x/y?limit=999')).ok).toBe(false);
    expect(parseEarthquakeQuery(new URL('https://x/y?limit=abc')).ok).toBe(false);
  });

  it('accepts every documented magnitude and period', () => {
    for (const m of USGS_VALID_MAGNITUDES) {
      for (const p of USGS_VALID_PERIODS) {
        const r = parseEarthquakeQuery(
          new URL(`https://x/y?magnitude=${m}&period=${p}&limit=10`),
        );
        expect(r.ok).toBe(true);
        expect(r.query?.magnitude).toBe(m);
        expect(r.query?.period).toBe(p);
      }
    }
  });
});

describe('fetchUSGSEarthquakes', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it('returns flattened earthquakes from the cache when present', async () => {
    const env = makeEnv({
      'usgs:eq:4.5_day': {
        metadata: {
          title: 'USGS Magnitude 4.5+ Earthquakes, Past Day',
          generated: 1715283000000,
          api: '1.10.3',
          count: 2,
        },
        features: [
          {
            id: 'us7000abc',
            properties: {
              mag: 5.1,
              magType: 'mb',
              place: '47 km NE of Tinogasta, Argentina',
              time: 1715283000000,
              updated: 1715283100000,
              tsunami: 0,
              sig: 401,
              felt: 12,
              alert: 'green',
              status: 'reviewed',
              url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc',
              title: 'M 5.1 - 47 km NE of Tinogasta, Argentina',
            },
            geometry: { coordinates: [-67.55, -28.06, 165] },
          },
        ],
      },
    });
    const r = await fetchUSGSEarthquakes(env, { magnitude: '4.5', period: 'day', limit: 50 });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('cache');
    expect(r.earthquakes?.length).toBe(1);
    expect(r.earthquakes?.[0]).toMatchObject({
      id: 'us7000abc',
      magnitude: 5.1,
      magnitude_type: 'mb',
      tsunami: false,
      depth_km: 165,
      longitude: -67.55,
      latitude: -28.06,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('on cache miss fetches the upstream feed and caches the payload', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          metadata: { title: 'feed', generated: 1, api: '1', count: 0 },
          features: [],
        }),
        { status: 200 },
      ),
    );
    const r = await fetchUSGSEarthquakes(env, {
      magnitude: 'significant',
      period: 'week',
      limit: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('live');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0]?.[0];
    expect(String(calledUrl)).toContain('summary/significant_week.geojson');
  });

  it('surfaces upstream non-200 as ok=false with http_status', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(new Response('boom', { status: 503 }));
    const r = await fetchUSGSEarthquakes(env, { magnitude: '4.5', period: 'day', limit: 50 });
    expect(r.ok).toBe(false);
    expect(r.http_status).toBe(503);
    expect(r.error).toBe('usgs_http_503');
  });

  it('returns ok=false when upstream JSON is malformed', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(new Response('not json', { status: 200 }));
    const r = await fetchUSGSEarthquakes(env, { magnitude: '4.5', period: 'day', limit: 50 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('usgs_invalid_json');
  });

  it('respects the limit field by slicing the upstream feature list', async () => {
    const env = makeEnv({
      'usgs:eq:all_hour': {
        metadata: { title: 'all hour', generated: 1, api: '1', count: 5 },
        features: Array.from({ length: 5 }, (_, i) => ({
          id: `evt-${i}`,
          properties: { mag: 1.0, place: 'somewhere', time: 1, title: `M 1.0 - somewhere ${i}` },
          geometry: { coordinates: [0, 0, 10] },
        })),
      },
    });
    const r = await fetchUSGSEarthquakes(env, { magnitude: 'all', period: 'hour', limit: 2 });
    expect(r.earthquakes?.length).toBe(2);
    expect(r.feed_metadata?.upstream_count).toBe(5);
  });
});
