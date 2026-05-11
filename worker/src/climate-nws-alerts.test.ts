import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  parseNWSAlertsQuery,
  fetchNWSAlerts,
  NWS_VALID_SEVERITIES,
} from './climate-nws-alerts';
import type { Env } from './types';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';

function makeEnv(): Env {
  // Env's TENSORFEED_CACHE is still required by the type; the lazy-proxy
  // code now reads/writes the Cache API instead, but we keep a no-op KV
  // mock for type compatibility.
  const noopKV = { get: async () => null, put: async () => undefined };
  return { TENSORFEED_CACHE: noopKV } as unknown as Env;
}

describe('parseNWSAlertsQuery', () => {
  it('accepts no filters and uses default limit', () => {
    const r = parseNWSAlertsQuery(new URL('https://x/y'));
    expect(r.ok).toBe(true);
    expect(r.query?.area).toBeNull();
    expect(r.query?.limit).toBe(50);
  });

  it('uppercases and validates two-letter area', () => {
    const r = parseNWSAlertsQuery(new URL('https://x/y?area=ca'));
    expect(r.ok).toBe(true);
    expect(r.query?.area).toBe('CA');

    const bad = parseNWSAlertsQuery(new URL('https://x/y?area=California'));
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe('invalid_area');
  });

  it('rejects an event with shell-injection-style characters', () => {
    const bad = parseNWSAlertsQuery(
      new URL('https://x/y?event=Tornado%20Warning%3B%20rm%20-rf%20%2F'),
    );
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe('invalid_event');
  });

  it('accepts a normal event name', () => {
    const r = parseNWSAlertsQuery(new URL('https://x/y?event=Tornado+Warning'));
    expect(r.ok).toBe(true);
    expect(r.query?.event).toBe('Tornado Warning');
  });

  it('validates the severity enum exhaustively', () => {
    for (const s of NWS_VALID_SEVERITIES) {
      const r = parseNWSAlertsQuery(new URL(`https://x/y?severity=${s}`));
      expect(r.ok).toBe(true);
      expect(r.query?.severity).toBe(s);
    }
    const bad = parseNWSAlertsQuery(new URL('https://x/y?severity=Catastrophic'));
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe('invalid_severity');
  });

  it('rejects out-of-range limit', () => {
    expect(parseNWSAlertsQuery(new URL('https://x/y?limit=0')).ok).toBe(false);
    expect(parseNWSAlertsQuery(new URL('https://x/y?limit=999')).ok).toBe(false);
    expect(parseNWSAlertsQuery(new URL('https://x/y?limit=abc')).ok).toBe(false);
  });
});

describe('fetchNWSAlerts', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  let installedCache: InstalledCache;

  beforeEach(() => {
    installedCache = installFakeCache();
  });

  afterEach(() => {
    fetchSpy.mockReset();
    installedCache.uninstall();
  });

  it('serves a flattened alert from cache when present', async () => {
    const env = makeEnv();
    await installedCache.seed('nws:alerts:CA|_|_|_|_', {
        title: 'NWS Active Alerts',
        updated: '2026-05-09T17:00:00Z',
        features: [
          {
            id: 'urn:oid:abc',
            properties: {
              id: 'urn:oid:abc',
              event: 'Heat Advisory',
              severity: 'Moderate',
              urgency: 'Expected',
              certainty: 'Likely',
              headline: 'Heat Advisory issued for Los Angeles County',
              areaDesc: 'Los Angeles County Coast',
              sent: '2026-05-09T16:30:00Z',
              effective: '2026-05-09T16:30:00Z',
              expires: '2026-05-10T03:00:00Z',
              senderName: 'NWS Los Angeles/Oxnard CA',
              status: 'Actual',
              messageType: 'Alert',
              category: 'Met',
              web: 'https://alerts.weather.gov/cap/wwacapget.php?x=CA126C39B7D1D4.HeatAdvisory',
            },
          },
        ],
      });
    const r = await fetchNWSAlerts(env, {
      area: 'CA',
      event: null,
      severity: null,
      urgency: null,
      status: null,
      limit: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('cache');
    expect(r.alerts?.length).toBe(1);
    expect(r.alerts?.[0]).toMatchObject({
      event: 'Heat Advisory',
      severity: 'Moderate',
      area_desc: 'Los Angeles County Coast',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the upstream feed on cache miss and constructs the right URL', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'feed',
          updated: '2026-05-09T17:00:00Z',
          features: [],
        }),
        { status: 200 },
      ),
    );
    const r = await fetchNWSAlerts(env, {
      area: 'TX',
      event: 'Tornado Warning',
      severity: 'Severe',
      urgency: null,
      status: null,
      limit: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('live');
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('area=TX');
    expect(calledUrl).toContain('severity=Severe');
    expect(calledUrl).toContain('event=Tornado+Warning');
  });

  it('passes a TensorFeed User-Agent that satisfies NWS guidelines', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ features: [] }), { status: 200 }));
    await fetchNWSAlerts(env, {
      area: null,
      event: null,
      severity: null,
      urgency: null,
      status: null,
      limit: 50,
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['User-Agent']).toContain('TensorFeed');
  });

  it('surfaces upstream non-200 with http_status', async () => {
    const env = makeEnv();
    fetchSpy.mockResolvedValue(new Response('boom', { status: 503 }));
    const r = await fetchNWSAlerts(env, {
      area: null,
      event: null,
      severity: null,
      urgency: null,
      status: null,
      limit: 50,
    });
    expect(r.ok).toBe(false);
    expect(r.http_status).toBe(503);
    expect(r.error).toBe('nws_http_503');
  });

  it('respects the limit by slicing the upstream feature list', async () => {
    const env = makeEnv();
    await installedCache.seed('nws:alerts:_|_|_|_|_', {
      title: 'all',
      updated: '2026-05-09T17:00:00Z',
      features: Array.from({ length: 5 }, (_, i) => ({
        id: `urn:oid:${i}`,
        properties: {
          id: `urn:oid:${i}`,
          event: 'Wind Advisory',
          severity: 'Minor',
        },
      })),
    });
    const r = await fetchNWSAlerts(env, {
      area: null,
      event: null,
      severity: null,
      urgency: null,
      status: null,
      limit: 2,
    });
    expect(r.alerts?.length).toBe(2);
    expect(r.feed_metadata?.upstream_count).toBe(5);
  });
});
