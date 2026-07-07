/**
 * Pro whats-new delta cursor: the 10-credit tier joins the free-unchanged-poll
 * loop. Two money invariants:
 *   1. An unchanged poll (cursor matches, data has not moved) no-charges the 10
 *      credits, carries counts only (no synthesis), and never calls Haiku.
 *   2. A poll with new data (or no cursor) returns the full cited pro brief plus
 *      a cursor and is charged 10.
 * Cursors are tier-agnostic: a cursor minted by base whats-new drives the pro
 * no-charge, which lets test A avoid needing Haiku at all.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeEnv, seedToken, balanceOf, call } from './test-harness';

let seq = 0;
function uniqueIp(): string {
  seq += 1;
  return `198.51.100.${(seq % 250) + 1}`;
}
function uniqueToken(): string {
  seq += 1;
  return `tf_live_pro_${seq}`;
}

// A status service with a fresh lastChecked keeps capturedAt inside the
// freshness SLA so the first call is charged, not stale-no-charged.
function freshService() {
  return {
    name: 'OpenAI',
    provider: 'openai',
    status: 'operational',
    statusPageUrl: 'https://status.openai.com',
    components: [],
    lastChecked: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pro whats-new no-charge on an unchanged cursor (no Haiku needed)', () => {
  it('mints a cursor from base whats-new, then no-charges the pro poll and withholds content', async () => {
    // No PROBE_ANTHROPIC_KEY: if the no-charge path wrongly fell through to
    // enrichment, it would synthesis-fail rather than clean no-charge, and the
    // no_charge_reason assertion below would fail.
    const env = await makeEnv({ status: { services: [freshService()] } });
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // Base whats-new needs no Haiku and issues a tier-agnostic cursor.
    const base = await call(env, '/api/premium/whats-new', { token, ip: uniqueIp() });
    expect(base.status).toBe(200);
    const cursor = base.json?.cursor as string;
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
    expect(await balanceOf(env, token)).toBe(99); // base charged 1

    const pro = await call(env, `/api/premium/whats-new/pro?since=${cursor}`, { token, ip: uniqueIp() });
    expect(pro.status).toBe(200);
    const billing = pro.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('no_new_since_cursor');
    expect(pro.json?.new_since_last).toBe(0);
    expect(pro.json?.tier).toBe('pro');
    // Content withheld: no synthesis, no data map, no raw data.
    expect(pro.json?.pro).toBeUndefined();
    expect(pro.json?.data_ids).toBeUndefined();
    expect(pro.json?.news).toBeUndefined();
    // Balance held: base charged 1, pro charged 0.
    expect(await balanceOf(env, token)).toBe(99);
  });
});

describe('pro whats-new full brief charges and issues a cursor, and the repeat poll skips Haiku', () => {
  it('call 1 returns the cited brief + cursor (charged 10); call 2 with that cursor no-charges without a second Haiku call', async () => {
    // One incident in the window gives the Haiku block a citable ID (i1).
    const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const env = await makeEnv({
      status: {
        services: [freshService()],
        incidents: [
          {
            id: 'inc-1',
            service: 'API',
            provider: 'openai',
            severity: 'minor',
            title: 'Elevated latency for the API',
            startedAt,
            resolvedAt: null,
            durationMinutes: null,
          },
        ],
      },
      vars: { PROBE_ANTHROPIC_KEY: 'test-key' } as Record<string, unknown>,
    });
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // Canned valid Haiku block citing i1. Stub only the Anthropic endpoint.
    const proBlock = {
      analyst_summary:
        'OpenAI logged a short minor latency incident on the API in the last hour. No pricing or model changes landed in the window. This seeded summary clears the one hundred character minimum comfortably.',
      key_takeaways: [
        { claim: 'OpenAI had a minor API latency incident in the window', basis: ['i1'], confidence: 0.95 },
      ],
      recommended_actions: [
        { for: 'inference-bound', action: 'Watch OpenAI API latency before shifting traffic', priority: 'monitor', basis: ['i1'] },
      ],
    };
    const haiku = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('api.anthropic.com')) {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(proBlock) }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`unexpected fetch in test: ${url}`);
    });
    vi.stubGlobal('fetch', haiku);

    const first = await call(env, '/api/premium/whats-new/pro', { token, ip: uniqueIp() });
    expect(first.status).toBe(200);
    expect(first.json?.tier).toBe('pro');
    expect(first.json?.pro).toBeDefined();
    const cursor = first.json?.cursor as string;
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
    const cont = first.json?.continuation as { url?: string } | undefined;
    expect(cont?.url).toBe(`/api/premium/whats-new/pro?since=${cursor}`);
    expect(await balanceOf(env, token)).toBe(90); // charged 10
    expect(haiku).toHaveBeenCalledTimes(1);

    const second = await call(env, `/api/premium/whats-new/pro?since=${cursor}`, { token, ip: uniqueIp() });
    expect(second.status).toBe(200);
    const billing = second.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(0);
    expect(billing?.no_charge_reason).toBe('no_new_since_cursor');
    expect(second.json?.new_since_last).toBe(0);
    expect(second.json?.pro).toBeUndefined();
    // Haiku was NOT called again on the unchanged poll.
    expect(haiku).toHaveBeenCalledTimes(1);
    expect(await balanceOf(env, token)).toBe(90); // held
  });

  it('degrades a bad cursor to a full charged brief', async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const env = await makeEnv({
      status: {
        services: [freshService()],
        incidents: [
          { id: 'inc-1', service: 'API', provider: 'openai', severity: 'minor', title: 'Elevated latency for the API', startedAt, resolvedAt: null, durationMinutes: null },
        ],
      },
      vars: { PROBE_ANTHROPIC_KEY: 'test-key' } as Record<string, unknown>,
    });
    const token = uniqueToken();
    await seedToken(env, token, 100);
    const proBlock = {
      analyst_summary: 'OpenAI logged a short minor latency incident on the API. This seeded summary clears the one hundred character minimum length requirement comfortably for the validator.',
      key_takeaways: [{ claim: 'OpenAI had a minor API latency incident', basis: ['i1'], confidence: 0.9 }],
      recommended_actions: [{ for: 'inference-bound', action: 'Watch OpenAI API latency this hour', priority: 'monitor', basis: ['i1'] }],
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('api.anthropic.com')) {
        return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(proBlock) }] }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await call(env, '/api/premium/whats-new/pro?since=not-a-real-cursor', { token, ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(res.json?.pro).toBeDefined();          // full brief, not a no-charge
    expect(res.json?.new_since_last).toBeUndefined();
    expect(await balanceOf(env, token)).toBe(90); // charged 10
  });
});

describe('pro whats-new charged delta: valid cursor plus genuinely new data since it was minted', () => {
  it('call 1 mints a cursor at T1; call 2 after new data lands returns the full brief, new_since_last=1, charged 10', async () => {
    const now = Date.now();

    // T1: base1.capturedAt = now - 10min, via the only status service's
    // lastChecked. incidentA started 3h ago, i.e. before T1, so it will
    // NOT count as new once the cursor advances past T1 in call 2.
    const incidentA = {
      id: 'i1',
      service: 'API',
      provider: 'openai',
      severity: 'minor' as const,
      title: 'Elevated latency for the API',
      startedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      resolvedAt: null,
      durationMinutes: null,
    };
    const env = await makeEnv({
      status: {
        services: [
          {
            name: 'OpenAI',
            provider: 'openai',
            status: 'operational',
            statusPageUrl: 'https://status.openai.com',
            components: [],
            lastChecked: new Date(now - 10 * 60 * 1000).toISOString(),
          },
        ],
        incidents: [incidentA],
      },
      vars: { PROBE_ANTHROPIC_KEY: 'test-key' } as Record<string, unknown>,
    });
    const token = uniqueToken();
    await seedToken(env, token, 100);

    // Canned valid Haiku block citing i1, the only incident present at
    // mint time. Reused for both calls; i1 still resolves in call 2's
    // data_ids because incidentA stays first in the reseeded array.
    const proBlock = {
      analyst_summary:
        'OpenAI logged a short minor latency incident on the API earlier in the window. No pricing or model changes landed. This seeded summary clears the one hundred character minimum comfortably for the validator.',
      key_takeaways: [
        { claim: 'OpenAI had a minor API latency incident in the window', basis: ['i1'], confidence: 0.95 },
      ],
      recommended_actions: [
        { for: 'inference-bound', action: 'Watch OpenAI API latency before shifting traffic', priority: 'monitor', basis: ['i1'] },
      ],
    };
    const haiku = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('api.anthropic.com')) {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(proBlock) }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`unexpected fetch in test: ${url}`);
    });
    vi.stubGlobal('fetch', haiku);

    const first = await call(env, '/api/premium/whats-new/pro', { token, ip: uniqueIp() });
    expect(first.status).toBe(200);
    expect(first.json?.pro).toBeDefined();
    const cursor = first.json?.cursor as string;
    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
    expect(await balanceOf(env, token)).toBe(90); // charged 10
    expect(haiku).toHaveBeenCalledTimes(1);

    // Reseed: incidentB started 1 minute ago (after T1) so it counts as
    // new, and the service's lastChecked advances capturedAt to T2=now,
    // which is after T1. Both incidents are written so incidentA keeps
    // its i1 slot and incidentB lands at i2.
    const incidentB = {
      id: 'i2',
      service: 'API',
      provider: 'openai',
      severity: 'minor' as const,
      title: 'Brief follow-up latency blip on the API',
      startedAt: new Date(now - 1 * 60 * 1000).toISOString(),
      resolvedAt: null,
      durationMinutes: null,
    };
    await env.TENSORFEED_STATUS.put('incidents', JSON.stringify([incidentA, incidentB]));
    await env.TENSORFEED_STATUS.put(
      'services',
      JSON.stringify([
        {
          name: 'OpenAI',
          provider: 'openai',
          status: 'operational',
          statusPageUrl: 'https://status.openai.com',
          components: [],
          lastChecked: new Date(now).toISOString(),
        },
      ]),
    );

    const second = await call(env, `/api/premium/whats-new/pro?since=${cursor}`, { token, ip: uniqueIp() });
    expect(second.status).toBe(200);
    expect(second.json?.new_since_last).toBe(1); // only incidentB is newer than the cursor
    const billing = second.json?.billing as Record<string, unknown> | undefined;
    expect(billing?.credits_charged).toBe(10);
    expect(billing?.no_charge_reason).toBeFalsy();
    expect(second.json?.pro).toBeDefined();      // full brief, not withheld
    expect(second.json?.data_ids).toBeDefined();
    expect(await balanceOf(env, token)).toBe(80); // charged 10 again
    expect(haiku).toHaveBeenCalledTimes(2);       // delta path runs enrichment
  });
});
