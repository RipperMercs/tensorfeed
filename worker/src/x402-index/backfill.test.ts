import { describe, it, expect, vi } from 'vitest';
import { backfillWallet } from './backfill';
import { kvKeyPubDayRollup, kvKeyEvent } from './constants';

function memKV() {
  const m = new Map<string, string>();
  return {
    store: m,
    get: vi.fn(async (k: string, _t?: string) => (m.has(k) ? JSON.parse(m.get(k)!) : null)),
    put: vi.fn(async (k: string, v: string) => { m.set(k, v); }),
  };
}

it('applies an asset-transfer page into per-publisher-day rollups, idempotently', async () => {
  const kv = memKV();
  const env = { TENSORFEED_CACHE: kv } as any;
  const fetchFn = vi.fn(async () => new Response(JSON.stringify({
    result: { transfers: [
      { hash: '0xaa', blockNum: '0x10', metadata: { blockTimestamp: '2026-05-20T00:00:00Z' }, value: 0.02, rawContract: { value: '0x4e20' } },
    ] },
  }), { status: 200 }));

  const r1 = await backfillWallet(env, '0x' + '1'.repeat(40), 'p.com', 1000, fetchFn as any);
  expect(r1.applied).toBe(1);
  const roll = await kv.get(kvKeyPubDayRollup('p.com', '2026-05-20'), 'json');
  expect(roll.count).toBe(1);

  const r2 = await backfillWallet(env, '0x' + '1'.repeat(40), 'p.com', 1000, fetchFn as any);
  expect(r2.applied).toBe(0);
  const roll2 = await kv.get(kvKeyPubDayRollup('p.com', '2026-05-20'), 'json');
  expect(roll2.count).toBe(1);
});
