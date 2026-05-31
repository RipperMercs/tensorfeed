import { describe, it, expect, vi } from 'vitest';
import { computeVerifiedDirectory, writeVerifiedDirectory } from './verified-precompute';
import { kvKeyPublisher, kvKeyPubDayRollup, KV_KEY_VERIFIED, KV_KEY_CURSOR } from './constants';

function memKV(seed: Record<string, unknown> = {}) {
  const m = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { store: m, get: vi.fn(async (k: string, _t?: string) => (m.has(k) ? JSON.parse(m.get(k)!) : null)), put: vi.fn(async (k: string, v: string) => { m.set(k, v); }) };
}

const TODAY = '2026-05-30';

it('classifies a seeded publisher with a recent rollup as verified-settling', async () => {
  const kv = memKV({
    [kvKeyPublisher('p.com')]: { domain: 'p.com', manifest_url: '', pay_to_wallets: ['0x' + '1'.repeat(40)], first_seen: '2026-05-01T00:00:00Z', last_crawled: '2026-05-30T00:00:00Z', last_crawl_error: null, last_event_at: null, source: 'manual', note: 'n' },
    [kvKeyPubDayRollup('p.com', '2026-05-29')]: { date: '2026-05-29', domain: 'p.com', volume_usdc: '0.020000', count: 1 },
    [KV_KEY_CURSOR]: { block: 1, ts: '2026-05-30T00:05:00Z', last_run_at: '2026-05-30T00:05:00Z' },
  });
  const env = { TENSORFEED_CACHE: kv } as any;
  const dir = await computeVerifiedDirectory(env, ['p.com'], TODAY);
  expect(dir.publishers).toHaveLength(1);
  expect(dir.publishers[0].domain).toBe('p.com');
  expect(dir.publishers[0].status).toBe('verified-settling');
  expect(dir.captured_at).toBe('2026-05-30T00:05:00Z');
});

it('writeVerifiedDirectory stores the blob under KV_KEY_VERIFIED', async () => {
  const kv = memKV({ [KV_KEY_CURSOR]: { block: 1, ts: '', last_run_at: null } });
  const env = { TENSORFEED_CACHE: kv } as any;
  await writeVerifiedDirectory(env, [], TODAY);
  const blob = await kv.get(KV_KEY_VERIFIED, 'json');
  expect(blob.ok).toBe(true);
  expect(blob.summary.total).toBe(0);
});
