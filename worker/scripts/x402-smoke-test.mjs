#!/usr/bin/env node
/**
 * x402 Standards-Compliant Facilitator Smoke Test
 *
 * Signs an EIP-3009 transferWithAuthorization as the test agent, submits
 * it to a TensorFeed premium endpoint via the X-PAYMENT header, and
 * reports what happened end-to-end.
 *
 * Usage (PowerShell):
 *   $env:AGENT_KEY = "0x<test-agent-private-key>"
 *   node scripts/x402-smoke-test.mjs --endpoint https://tensorfeed.ai/api/premium/whats-new
 *
 * Optional:
 *   --network mainnet|sepolia          (default: mainnet)
 *   --pay-to 0x<TF payment wallet>      (default: TF mainnet wallet)
 *   --amount 20000                      (atomic micro-USDC; default: 20000 = $0.02 = 1 credit)
 *
 * Prerequisites:
 *   1. The test agent EOA (AGENT_KEY) must hold at least `amount` of USDC
 *      on the chosen network.
 *      - Mainnet USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *      - Sepolia test USDC on Base Sepolia:
 *        0x036CbD53842c5426634e7929541eC2318f3dCF7e
 *        (free from https://faucet.circle.com or similar)
 *   2. The TF Worker must have X402_BROADCAST_KEY set and the broadcaster
 *      address must hold a small amount of the chain's gas asset (Base ETH).
 *
 * The test agent does NOT need any Base ETH; the facilitator pays gas.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { randomBytes } from 'crypto';

const NETWORKS = {
  mainnet: {
    chainId: 8453,
    network: 'eip155:8453',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    domain: {
      name: 'USDC',
      version: '2',
      chainId: 8453,
      verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },
  sepolia: {
    chainId: 84532,
    network: 'eip155:84532',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    domain: {
      name: 'USDC',
      version: '2',
      chainId: 84532,
      verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
};

const TF_PAYMENT_WALLET_MAINNET = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';

const TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

function parseArgs(argv) {
  const args = { network: 'mainnet', amount: '20000', payTo: TF_PAYMENT_WALLET_MAINNET };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--endpoint') args.endpoint = argv[++i];
    else if (a === '--network') args.network = argv[++i];
    else if (a === '--pay-to') args.payTo = argv[++i];
    else if (a === '--amount') args.amount = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log(
    'Usage:\n' +
      '  $env:AGENT_KEY = "0x..." (PowerShell) or export AGENT_KEY=0x... (bash)\n' +
      '  node scripts/x402-smoke-test.mjs --endpoint <url> [--network mainnet|sepolia] [--pay-to 0x...] [--amount 20000]',
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.endpoint) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const agentKey = process.env.AGENT_KEY;
  if (!agentKey || !/^0x[0-9a-fA-F]{64}$/.test(agentKey)) {
    console.error('Set AGENT_KEY env var to the test agent EOA private key (0x + 64 hex).');
    process.exit(1);
  }
  const cfg = NETWORKS[args.network];
  if (!cfg) {
    console.error(`Unknown network: ${args.network}. Use mainnet or sepolia.`);
    process.exit(1);
  }
  const account = privateKeyToAccount(agentKey);
  const now = Math.floor(Date.now() / 1000);
  const nonceHex = '0x' + randomBytes(32).toString('hex');

  const auth = {
    from: account.address,
    to: args.payTo,
    value: args.amount,
    validAfter: String(now - 60),
    validBefore: String(now + 600),
    nonce: nonceHex,
  };

  console.log('=== x402 smoke test ===');
  console.log('endpoint    :', args.endpoint);
  console.log('network     :', args.network, '(' + cfg.network + ')');
  console.log('agent       :', account.address);
  console.log('payTo       :', args.payTo);
  console.log('amount      :', args.amount, '(' + (Number(args.amount) / 1e6).toFixed(6) + ' USDC)');
  console.log('nonce       :', auth.nonce);
  console.log('window      :', auth.validAfter, '->', auth.validBefore);

  console.log('\nSigning EIP-3009 transferWithAuthorization...');
  const signature = await account.signTypedData({
    domain: cfg.domain,
    types: TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: auth.from,
      to: auth.to,
      value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter),
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce,
    },
  });
  console.log('signature   :', signature);

  const payload = {
    x402Version: 2,
    accepted: {
      scheme: 'exact',
      network: cfg.network,
      amount: args.amount,
      asset: cfg.usdcAddress,
      payTo: args.payTo,
      maxTimeoutSeconds: 60,
      extra: { name: 'USDC', version: '2' },
    },
    payload: { signature, authorization: auth },
    extensions: {},
  };
  const xPaymentHeader = Buffer.from(JSON.stringify(payload)).toString('base64');

  console.log('\nSubmitting to:', args.endpoint);
  console.log('with X-PAYMENT header (base64 length:', xPaymentHeader.length, ')');

  const t0 = Date.now();
  const res = await fetch(args.endpoint, {
    method: 'GET',
    headers: { 'X-PAYMENT': xPaymentHeader, 'User-Agent': 'tensorfeed-x402-smoke-test/1.0' },
  });
  const elapsed = Date.now() - t0;
  console.log(`\nHTTP ${res.status} (${elapsed} ms)`);
  console.log('Headers:');
  for (const [k, v] of res.headers.entries()) {
    if (
      k.toLowerCase().startsWith('x-payment') ||
      k.toLowerCase() === 'payment-response' ||
      k.toLowerCase() === 'content-type'
    ) {
      console.log(`  ${k}: ${v}`);
    }
  }
  const settlementHeader = res.headers.get('payment-response') || res.headers.get('PAYMENT-RESPONSE');
  if (settlementHeader) {
    try {
      const settled = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
      console.log('\nSettlement (decoded PAYMENT-RESPONSE):');
      console.log(JSON.stringify(settled, null, 2));
      if (settled.transaction) {
        const explorer =
          args.network === 'sepolia'
            ? `https://sepolia.basescan.org/tx/${settled.transaction}`
            : `https://basescan.org/tx/${settled.transaction}`;
        console.log('Explorer:', explorer);
      }
    } catch (e) {
      console.log('(could not decode PAYMENT-RESPONSE)');
    }
  }
  const body = await res.text();
  console.log('\nBody:');
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
  process.exit(res.ok ? 0 : 2);
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
