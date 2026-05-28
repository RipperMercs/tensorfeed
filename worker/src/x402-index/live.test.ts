import { describe, it, expect } from 'vitest';
import { crawlPublisherManifest } from './publisher-registry';
import { type RpcLog } from './indexer';
import { TRANSFER_TOPIC, USDC_BASE_CONTRACT } from './constants';

const SKIP_LIVE = process.env.VITEST_SKIP_LIVE === '1';

describe.skipIf(SKIP_LIVE)('publisher manifest live crawl', () => {
  it('parses the live tensorfeed.ai manifest', async () => {
    const rec = await crawlPublisherManifest('tensorfeed.ai');
    expect(rec.last_crawl_error).toBeNull();
    expect(rec.pay_to_wallets.length).toBeGreaterThan(0);
  }, 20_000);
});

describe.skipIf(SKIP_LIVE)('Base RPC live USDC Transfer scan', () => {
  it('fetches a recent block range and returns USDC Transfer logs', async () => {
    // Sanity check: hit Base mainnet for eth_blockNumber, then fetch logs
    // from a recent ~70-block window. Base USDC has constant volume so we
    // expect Transfer events; we just need at least one for the test to
    // confirm the RPC plumbing works end-to-end.
    const blockNumberRes = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });
    const blockNumberData = (await blockNumberRes.json()) as { result: string };
    const current = parseInt(blockNumberData.result, 16);
    expect(current).toBeGreaterThan(0);

    const logsRes = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          address: USDC_BASE_CONTRACT,
          topics: [TRANSFER_TOPIC],
          fromBlock: '0x' + (current - 100).toString(16),
          toBlock: '0x' + (current - 30).toString(16),
        }],
        id: 1,
      }),
    });
    const logsData = (await logsRes.json()) as { result: RpcLog[] };
    expect(Array.isArray(logsData.result)).toBe(true);
    expect(logsData.result.length).toBeGreaterThan(0);
  }, 30_000);
});
