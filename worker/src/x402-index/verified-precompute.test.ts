import { describe, it, expect, vi } from 'vitest';
import { computeVerifiedDirectory, writeVerifiedDirectory } from './verified-precompute';
import { kvKeyPublisher, kvKeyPubDayRollup, KV_KEY_VERIFIED, KV_KEY_CURSOR, KV_KEY_PUBLISHERS } from './constants';

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

it('a co-owner of a shared wallet inherits the holder domain on-chain proof', async () => {
  const wallet = '0x' + 'a'.repeat(40);
  const kv = memKV({
    // First-wins wallet map: the shared wallet is attributed to primary.com.
    [KV_KEY_PUBLISHERS]: { [wallet]: 'primary.com' },
    [kvKeyPublisher('primary.com')]: { domain: 'primary.com', manifest_url: 'https://primary.com/.well-known/x402.json', pay_to_wallets: [wallet], first_seen: '2026-05-01T00:00:00Z', last_crawled: '2026-05-30T00:00:00Z', last_crawl_error: null, last_event_at: null, source: 'manifest', note: null },
    [kvKeyPublisher('secondary.com')]: { domain: 'secondary.com', manifest_url: 'https://secondary.com/.well-known/x402.json', pay_to_wallets: [wallet], first_seen: '2026-05-01T00:00:00Z', last_crawled: '2026-05-30T00:00:00Z', last_crawl_error: null, last_event_at: null, source: 'manifest', note: null },
    // Settlements live only under the holder (primary.com); the co-owner has none.
    [kvKeyPubDayRollup('primary.com', '2026-05-29')]: { date: '2026-05-29', domain: 'primary.com', volume_usdc: '4.420000', count: 7 },
    [KV_KEY_CURSOR]: { block: 1, ts: '2026-05-30T00:05:00Z', last_run_at: '2026-05-30T00:05:00Z' },
  });
  const env = { TENSORFEED_CACHE: kv } as any;
  const dir = await computeVerifiedDirectory(env, ['primary.com', 'secondary.com'], TODAY);

  const primary = dir.publishers.find((p) => p.domain === 'primary.com')!;
  const secondary = dir.publishers.find((p) => p.domain === 'secondary.com')!;

  expect(primary.status).toBe('verified-settling');
  expect(primary.settlement_count).toBe(7);
  expect(primary.note).toBeNull(); // the holder gets no shared-wallet disclosure

  expect(secondary.status).toBe('verified-settling'); // inherits the proof
  expect(secondary.settlement_count).toBe(7);
  expect(secondary.volume_usdc).toBe('4.420000');
  expect(secondary.note).toContain('shared with primary.com');

  expect(dir.summary.verified).toBe(2);
});

it('writeVerifiedDirectory stores the blob under KV_KEY_VERIFIED', async () => {
  const kv = memKV({ [KV_KEY_CURSOR]: { block: 1, ts: '', last_run_at: null } });
  const env = { TENSORFEED_CACHE: kv } as any;
  await writeVerifiedDirectory(env, [], TODAY);
  const blob = await kv.get(KV_KEY_VERIFIED, 'json');
  expect(blob.ok).toBe(true);
  expect(blob.summary.total).toBe(0);
});
