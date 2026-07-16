/**
 * Freshness provability (2026-07-15).
 *
 * The no-charge-on-stale SLA (freshness.ts) was invisible before payment: the
 * 402 challenge carried no freshness at all, and the paid response only exposed
 * it inside the signed receipt. This pins the three surfaces that make the
 * commitment readable to a buyer:
 *   Piece 1: a static freshness block on the 402 (derived only from resolveSLA,
 *            zero I/O per 402 so the high-volume challenge path stays cheap).
 *   Piece 2: a top-level freshness block on the paid response.
 *   Piece 3: the free /api/freshness manifest.
 *
 * No billing behavior changes; the stale no-charge money-path is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { paymentRequiredResponse } from './payments';
import { makeEnv, seedToken, call } from './test-harness';

let seq = 0;
function uniqueIp(): string {
  seq += 1;
  return `198.51.101.${(seq % 250) + 1}`;
}
function uniqueToken(): string {
  seq += 1;
  return `tf_live_fresh_${seq}`;
}

describe('Piece 1: 402 body carries the static freshness block', () => {
  it('an SLA endpoint 402 advertises max_age_seconds, the promise, verify, and manifest', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/whats-new', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    const f = res.json?.freshness as Record<string, unknown> | undefined;
    expect(f).toBeDefined();
    expect(f?.max_age_seconds).toBe(60 * 60);
    expect(String(f?.promise)).toContain('1 hour');
    expect(String(f?.promise)).toContain('not charged');
    expect(f?.verify).toBeDefined();
    expect(f?.manifest).toBe('/api/freshness');
  });

  it('the freshness block does not disturb the x402 accepts array or payment terms', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/whats-new', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    expect(Array.isArray(res.json?.accepts)).toBe(true);
    expect((res.json?.accepts as unknown[]).length).toBeGreaterThan(0);
    const payment = res.json?.payment as Record<string, unknown> | undefined;
    expect(payment?.currency).toBe('USDC');
  });

  it('a null-SLA endpoint 402 describes the no-wall-clock case with no verify key (shared builder = MCP path too)', async () => {
    const env = await makeEnv();
    const res = paymentRequiredResponse(env, 1, 1, new Request('https://tensorfeed.ai/api/premium/routing'));
    const json = (await res.json()) as Record<string, unknown>;
    const f = json.freshness as Record<string, unknown>;
    expect(f).toBeDefined();
    expect(f.max_age_seconds).toBeNull();
    expect(String(f.promise)).toContain('no wall-clock');
    expect(f).not.toHaveProperty('verify');
    expect(f.manifest).toBe('/api/freshness');
  });
});

describe('Piece 2: paid response carries the top-level freshness block', () => {
  it('an SLA endpoint 200 carries freshness with sla_applies true and its max_age', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    // 30-min SLA endpoint; over a cold env it returns a 200 (no-charge empty),
    // and the freshness block rides on every premium 200 regardless of charge.
    const res = await call(env, '/api/premium/provider-reliability-verdict', { token, ip: uniqueIp() });
    expect(res.status).toBe(200);
    const f = res.json?.freshness as Record<string, unknown> | undefined;
    expect(f).toBeDefined();
    expect(f?.sla_applies).toBe(true);
    expect(f?.max_age_seconds).toBe(30 * 60);
    expect(f).toHaveProperty('as_of');
    expect(f).toHaveProperty('data_age_seconds');
    expect(f).toHaveProperty('fresh');
  });

  it('a null-SLA endpoint 200 carries freshness with sla_applies false and null max_age', async () => {
    const env = await makeEnv();
    const token = uniqueToken();
    await seedToken(env, token, 100);
    const res = await call(env, '/api/premium/hf/velocity', { token, ip: uniqueIp() });
    expect(res.status).toBe(200);
    const f = res.json?.freshness as Record<string, unknown> | undefined;
    expect(f).toBeDefined();
    expect(f?.sla_applies).toBe(false);
    expect(f?.max_age_seconds).toBeNull();
    expect(f?.fresh).toBeNull();
  });
});

describe('Piece 2 regression: the response block must not clobber a handler-provided freshness', () => {
  it('guidance-delta paid response keeps its own input_keyed freshness contract', async () => {
    const env = await makeEnv();
    const { validateBatch, writeBatch } = await import('./sec-guidance-delta');
    // guidance-delta is the one premium endpoint that returns its own top-level
    // `freshness` (an input-keyed supersession contract, not a wall-clock SLA).
    // Seed one delta so the accession path resolves to a real, non-superseded
    // charged response.
    const batch = {
      batch_id: 'test-fresh-gd-001',
      extracted_at: '2026-05-28T00:00:00Z',
      deltas: [
        {
          accession_number: '0001045810-25-000200',
          prior_accession_number: '0001045810-24-000150',
          cik: '0001045810',
          ticker: 'NVDA',
          company_name: 'NVIDIA',
          form: '10-K',
          filing_date: '2025-12-12',
          prior_filing_date: '2024-12-13',
          changes: [
            {
              topic: 'Full-year revenue outlook',
              prior_text: 'We expect full-year revenue of 100 billion to 105 billion.',
              current_text: 'We now expect full-year revenue of 108 billion to 112 billion.',
              prior_value: '100B to 105B',
              current_value: '108B to 112B',
              section: 'MD&A',
              category: 'revenue_guidance',
              change_type: 'raised',
              direction: 'up',
              materiality: 'material',
            },
          ],
          extracted_by: 'phi-4-14b',
          extracted_at: '2026-05-28T00:00:00Z',
        },
      ],
    };
    const v = validateBatch(batch);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    await writeBatch(env, v.value);

    const token = uniqueToken();
    await seedToken(env, token, 100);
    const res = await call(
      env,
      '/api/premium/sec/filings/guidance-delta?accession=0001045810-25-000200',
      { token, ip: uniqueIp() },
    );
    expect(res.status).toBe(200);
    const f = res.json?.freshness as Record<string, unknown> | undefined;
    expect(f).toBeDefined();
    // The generic SLA block must NOT overwrite the endpoint's own input-keyed
    // freshness (which carries the supersession explanation the buyer paid for).
    expect(f?.model).toBe('input_keyed');
    expect(f).toHaveProperty('superseded');
  });
});

describe('Piece 3: /api/freshness manifest', () => {
  it('is a free unauthenticated GET returning the SLA table', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/freshness', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    expect(typeof res.json?.count).toBe('number');
    expect(res.json?.count as number).toBeGreaterThan(0);
    const endpoints = res.json?.endpoints as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(endpoints)).toBe(true);
    const wn = endpoints?.find((e) => e.endpoint === '/api/premium/whats-new');
    expect(wn?.max_age_seconds).toBe(60 * 60);
    expect(typeof wn?.reason).toBe('string');
    expect(String(res.json?.note)).toContain('not charged');
  });

  it('sets a cache header (deploy-static, edge-cacheable)', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/freshness', { ip: uniqueIp() });
    expect(res.status).toBe(200);
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).toMatch(/max-age=\d+/);
  });
});
