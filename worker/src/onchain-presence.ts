// Live Base mainnet reads for the counterparty trust verdict. Thin I/O glue
// over viem, mocked as a dependency in the verdict compute tests (mirrors how
// getPublisherReceipts is mocked for the publisher verdict). Every read is
// best-effort: a failed core read yields a null leg (honest "no signal") rather
// than a fabricated zero, and the ERC-8004 leg degrades to a labeled coverage
// state on any signature mismatch so it can never emit a wrong result.
import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import type { Env } from './types';
import type { OnchainLeg, Erc8004Leg } from './premium-counterparty-trust-verdict';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const ERC8004_IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as Address;
const ERC8004_REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as Address;

const BALANCE_OF_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// ERC-8004 read ABI, verified against the official erc-8004/erc-8004-contracts
// ABI JSON and the BaseScan-verified proxy implementations. The Identity
// Registry is an ERC-721 (ownerOf is the controller; getAgentWallet is the
// declared operational wallet, which may differ). The Reputation Registry has
// no single total-count read: per spec getSummary requires a non-empty client
// set, so a true total is getClients then getSummary. The leg is best-effort
// and any signature mismatch degrades to coverage:'unavailable', never a wrong
// result.
const ERC8004_IDENTITY_ABI = [
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'getAgentWallet', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
] as const;
const ERC8004_REPUTATION_ABI = [
  { type: 'function', name: 'getClients', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'address[]' }] },
  {
    type: 'function',
    name: 'getSummary',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ],
  },
] as const;

function baseClient(env: Env) {
  return createPublicClient({ chain: base, transport: http(env.BASE_RPC_URL || 'https://mainnet.base.org') });
}

export async function readOnchainPresence(env: Env, address: string): Promise<OnchainLeg | null> {
  const addr = address as Address;
  const client = baseClient(env);

  let txCount: number;
  try {
    txCount = Number(await client.getTransactionCount({ address: addr }));
  } catch {
    // The transaction count is the core realness signal. If it is unreadable we
    // return no leg at all rather than imply a fresh, unused address.
    return null;
  }

  let native = '0';
  try {
    native = (await client.getBalance({ address: addr })).toString();
  } catch {
    /* best-effort: leave native balance at 0 */
  }

  let usdc = '0';
  try {
    const bal = (await client.readContract({
      address: USDC_BASE,
      abi: BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [addr],
    })) as bigint;
    usdc = bal.toString();
  } catch {
    /* best-effort: leave usdc balance at 0 */
  }

  return { tx_count: txCount, native_balance_wei: native, usdc_balance_6: usdc };
}

export async function readErc8004Registry(env: Env, address: string, agentId: string | null): Promise<Erc8004Leg> {
  if (!agentId) {
    // ERC-8004 maps agentId -> wallet, not the reverse, so without an agentId
    // (and absent an off-chain indexer) we cannot resolve the registry leg.
    return { coverage: 'not_resolved', agent_id: null, agent_uri: null, raw_feedback_count: null };
  }

  let id: bigint;
  try {
    id = BigInt(agentId.replace(/^8004:/i, '').trim());
  } catch {
    return { coverage: 'unavailable', agent_id: agentId, agent_uri: null, raw_feedback_count: null };
  }

  try {
    const client = baseClient(env);

    // The counterparty wallet may be the ERC-721 owner OR the declared agent
    // wallet; match either. Both reads are independent and best-effort.
    let owner: string | null = null;
    let agentWallet: string | null = null;
    try {
      owner = (await client.readContract({ address: ERC8004_IDENTITY, abi: ERC8004_IDENTITY_ABI, functionName: 'ownerOf', args: [id] })) as string;
    } catch {
      /* ownerOf reverts for a non-existent tokenId */
    }
    try {
      agentWallet = (await client.readContract({ address: ERC8004_IDENTITY, abi: ERC8004_IDENTITY_ABI, functionName: 'getAgentWallet', args: [id] })) as string;
    } catch {
      /* agent may not have a distinct operational wallet set */
    }

    const owned = [owner, agentWallet].filter((w): w is string => !!w).map((w) => w.toLowerCase());
    if (owned.length === 0) {
      // Neither identity read succeeded: the registry is unreadable for this id.
      return { coverage: 'unavailable', agent_id: agentId, agent_uri: null, raw_feedback_count: null };
    }
    if (!owned.includes(address.toLowerCase())) {
      // The agentId is real but does not belong to the queried wallet.
      return { coverage: 'not_registered', agent_id: agentId, agent_uri: null, raw_feedback_count: null };
    }

    let uri: string | null = null;
    try {
      uri = (await client.readContract({ address: ERC8004_IDENTITY, abi: ERC8004_IDENTITY_ABI, functionName: 'tokenURI', args: [id] })) as string;
    } catch {
      /* uri best-effort */
    }

    // Total feedback count: getClients, then getSummary over that client set
    // (the spec forbids an empty client filter, so an empty list is a 0 count).
    let count: number | null = null;
    try {
      const clients = (await client.readContract({ address: ERC8004_REPUTATION, abi: ERC8004_REPUTATION_ABI, functionName: 'getClients', args: [id] })) as readonly Address[];
      if (clients.length === 0) {
        count = 0;
      } else {
        const summary = (await client.readContract({
          address: ERC8004_REPUTATION,
          abi: ERC8004_REPUTATION_ABI,
          functionName: 'getSummary',
          args: [id, clients, '', ''],
        })) as readonly [bigint, bigint, number];
        count = Number(summary[0]);
      }
    } catch {
      /* feedback count best-effort */
    }

    return { coverage: 'registered', agent_id: agentId, agent_uri: uri, raw_feedback_count: count };
  } catch {
    return { coverage: 'unavailable', agent_id: agentId, agent_uri: null, raw_feedback_count: null };
  }
}
