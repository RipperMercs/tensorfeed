import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ client: null as unknown as Record<string, (...a: unknown[]) => unknown> }));
vi.mock('viem', () => ({
  createPublicClient: () => h.client,
  http: () => null,
}));
vi.mock('viem/chains', () => ({ base: { id: 8453 } }));

import { readOnchainPresence, readErc8004Registry } from './onchain-presence';

const ENV = {} as unknown as Parameters<typeof readOnchainPresence>[0];
const ADDR = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';

describe('readOnchainPresence', () => {
  it('maps tx count, native balance, and USDC balance into the leg', async () => {
    h.client = {
      getTransactionCount: async () => 42,
      getBalance: async () => 1000n,
      readContract: async () => 250000n,
    };
    const leg = await readOnchainPresence(ENV, ADDR);
    expect(leg).toEqual({ tx_count: 42, native_balance_wei: '1000', usdc_balance_6: '250000' });
  });

  it('returns null when the core tx-count read fails (honest: no leg, never a fake zero)', async () => {
    h.client = {
      getTransactionCount: async () => {
        throw new Error('rpc down');
      },
      getBalance: async () => 1000n,
      readContract: async () => 0n,
    };
    expect(await readOnchainPresence(ENV, ADDR)).toBeNull();
  });

  it('defaults a failed balance read to 0 but keeps the leg when the tx count succeeds', async () => {
    h.client = {
      getTransactionCount: async () => 7,
      getBalance: async () => {
        throw new Error('x');
      },
      readContract: async () => {
        throw new Error('y');
      },
    };
    const leg = await readOnchainPresence(ENV, ADDR);
    expect(leg).toEqual({ tx_count: 7, native_balance_wei: '0', usdc_balance_6: '0' });
  });
});

describe('readErc8004Registry', () => {
  it('not_resolved when no agentId is supplied (wallet to agentId needs an indexer)', async () => {
    h.client = {};
    const leg = await readErc8004Registry(ENV, ADDR, null);
    expect(leg.coverage).toBe('not_resolved');
    expect(leg.agent_id).toBeNull();
  });

  it('registered when the agentId resolves to the queried wallet; count from getClients + getSummary', async () => {
    h.client = {
      readContract: async (arg: unknown) => {
        const fn = (arg as { functionName: string }).functionName;
        if (fn === 'getAgentWallet' || fn === 'ownerOf') return ADDR;
        if (fn === 'tokenURI') return 'ipfs://card';
        if (fn === 'getClients') return ['0x00000000000000000000000000000000000000aa'];
        if (fn === 'getSummary') return [9n, 0n, 0]; // (count, summaryValue, decimals)
        return 0n;
      },
    };
    const leg = await readErc8004Registry(ENV, ADDR, '8004:42');
    expect(leg.coverage).toBe('registered');
    expect(leg.agent_id).toBe('8004:42');
    expect(leg.agent_uri).toBe('ipfs://card');
    expect(leg.raw_feedback_count).toBe(9);
  });

  it('registered with no feedback clients reports a zero count without calling getSummary', async () => {
    h.client = {
      readContract: async (arg: unknown) => {
        const fn = (arg as { functionName: string }).functionName;
        if (fn === 'getAgentWallet' || fn === 'ownerOf') return ADDR;
        if (fn === 'tokenURI') return 'ipfs://card';
        if (fn === 'getClients') return [];
        if (fn === 'getSummary') throw new Error('getSummary must not be called with an empty client set');
        return 0n;
      },
    };
    const leg = await readErc8004Registry(ENV, ADDR, '8004:42');
    expect(leg.coverage).toBe('registered');
    expect(leg.raw_feedback_count).toBe(0);
  });

  it('not_registered when the agentId maps to a different wallet', async () => {
    h.client = {
      readContract: async (arg: unknown) => {
        const fn = (arg as { functionName: string }).functionName;
        if (fn === 'getAgentWallet' || fn === 'ownerOf') return '0x0000000000000000000000000000000000000001';
        return 0n;
      },
    };
    const leg = await readErc8004Registry(ENV, ADDR, '8004:42');
    expect(leg.coverage).toBe('not_registered');
  });

  it('unavailable when the registry read throws (e.g. ABI mismatch)', async () => {
    h.client = {
      readContract: async () => {
        throw new Error('revert');
      },
    };
    const leg = await readErc8004Registry(ENV, ADDR, '8004:42');
    expect(leg.coverage).toBe('unavailable');
  });

  it('unavailable when the agentId is not a parseable id', async () => {
    h.client = {};
    const leg = await readErc8004Registry(ENV, ADDR, 'not-a-number');
    expect(leg.coverage).toBe('unavailable');
  });
});
