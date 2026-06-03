#!/usr/bin/env node
/**
 * Cross-host x402 smoke test. Fetches the 402 from any federation member's
 * pilot endpoint, extracts the bazaar extension from the response, signs
 * EIP-3009, and resubmits with the correctly-shaped X-PAYMENT.
 *
 * Why: the TF in-repo smoke test hardcodes TF's whats-new bazaar extension.
 * Pointing it at TerminalFeed (or any other federation member) would either
 * send the wrong extension or none at all. This script does what a real
 * agent does: read the 402, echo the extension back. Works against any
 * x402 V2 + Bazaar pilot endpoint.
 *
 * Usage:
 *   $env:AGENT_KEY = "0x..."
 *   node x402-cross-host-smoke.mjs --endpoint https://terminalfeed.io/api/pro/briefing
 *
 * Optional:
 *   --query "?days=1"     (appended to endpoint for the second GET)
 */

import { privateKeyToAccount } from 'viem/accounts';
import { randomBytes } from 'crypto';
import { internalHeaders } from './_tf-internal.mjs';

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
  const args = { query: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--endpoint') args.endpoint = argv[++i];
    else if (a === '--query') args.query = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.endpoint) {
    console.error('Usage: node x402-cross-host-smoke.mjs --endpoint <url> [--query ?days=1]');
    process.exit(1);
  }
  const agentKey = process.env.AGENT_KEY;
  if (!agentKey || !/^0x[0-9a-fA-F]{64}$/.test(agentKey)) {
    console.error('Set AGENT_KEY to the test agent EOA private key.');
    process.exit(1);
  }
  const account = privateKeyToAccount(agentKey);

  // Step 1: fetch the 402 to learn the requirements + bazaar extension.
  const probeUrl = args.endpoint + args.query;
  console.log('=== Step 1: probing for 402 ===');
  console.log('GET', probeUrl);
  const probe = await fetch(probeUrl, { method: 'GET', headers: { 'User-Agent': 'tf-cross-host-smoke/1.0', ...internalHeaders(probeUrl) } });
  console.log('HTTP', probe.status);
  if (probe.status !== 402) {
    console.error(`Expected 402, got ${probe.status}. Body:`);
    console.error(await probe.text());
    process.exit(2);
  }
  const challenge = await probe.json();
  const accepted = challenge.accepts?.[0];
  if (!accepted) {
    console.error('No accepts[0] in 402 body.');
    console.error(JSON.stringify(challenge, null, 2));
    process.exit(2);
  }
  const bazaarExtension = challenge.extensions?.bazaar
    ? { bazaar: challenge.extensions.bazaar }
    : {};
  console.log('Network:', accepted.network);
  console.log('Asset:', accepted.asset);
  console.log('PayTo:', accepted.payTo);
  console.log('Amount:', accepted.amount, `(${(Number(accepted.amount) / 1e6).toFixed(6)} USDC)`);
  console.log('EIP-712 domain:', accepted.extra?.name, 'v' + accepted.extra?.version);
  console.log('Bazaar extension:', bazaarExtension.bazaar ? 'present (will echo)' : 'ABSENT (no catalog signal)');

  // Step 2: sign EIP-3009 with the network-specific domain.
  // Handle both canonical CAIP-2 ("eip155:8453") and non-canonical ("base") forms.
  const NETWORK_TO_CHAIN_ID = { 'eip155:8453': 8453, 'base': 8453, 'eip155:84532': 84532, 'base-sepolia': 84532 };
  const chainId = NETWORK_TO_CHAIN_ID[accepted.network] ?? Number(accepted.network.replace('eip155:', ''));
  const domain = {
    name: accepted.extra.name,
    version: accepted.extra.version,
    chainId,
    verifyingContract: accepted.asset,
  };
  const now = Math.floor(Date.now() / 1000);
  const nonceHex = '0x' + randomBytes(32).toString('hex');
  const auth = {
    from: account.address,
    to: accepted.payTo,
    value: accepted.amount,
    validAfter: String(now - 60),
    validBefore: String(now + 600),
    nonce: nonceHex,
  };
  console.log('\n=== Step 2: signing EIP-3009 ===');
  console.log('Agent:', account.address);
  console.log('Nonce:', auth.nonce);
  const signature = await account.signTypedData({
    domain,
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
  console.log('Signature:', signature);

  // Step 3: resubmit with X-PAYMENT in the canonical minimal V2 shape.
  // CDP's verify schema requires `accepted` inside paymentPayload, but the
  // resource server is responsible for injecting it (the agent doesn't need
  // to know CDP's internal schema). TerminalFeed and TF both inject server-
  // side before CDP forward. The agent ships only what the V2 HTTP transport
  // spec requires.
  const payload = {
    x402Version: 2,
    scheme: accepted.scheme,
    network: accepted.network,
    payload: { signature, authorization: auth },
    ...(bazaarExtension.bazaar ? { extensions: bazaarExtension } : {}),
  };
  const xPaymentHeader = Buffer.from(JSON.stringify(payload)).toString('base64');

  console.log('\n=== Step 3: settling via X-PAYMENT ===');
  console.log('POST X-PAYMENT to', probeUrl);
  console.log('Header length:', xPaymentHeader.length);
  const t0 = Date.now();
  const res = await fetch(probeUrl, {
    method: 'GET',
    headers: { 'X-PAYMENT': xPaymentHeader, 'User-Agent': 'tf-cross-host-smoke/1.0', ...internalHeaders(probeUrl) },
  });
  const elapsed = Date.now() - t0;
  console.log(`\nHTTP ${res.status} (${elapsed} ms)`);

  console.log('\nRelevant headers:');
  for (const [k, v] of res.headers.entries()) {
    if (
      k.toLowerCase().startsWith('x-payment') ||
      k.toLowerCase() === 'payment-required' ||
      k.toLowerCase() === 'payment-response' ||
      k.toLowerCase() === 'extension-responses' ||
      k.toLowerCase() === 'www-authenticate' ||
      k.toLowerCase() === 'content-type'
    ) {
      console.log(`  ${k}: ${v.slice(0, 200)}`);
    }
  }
  const extensionResponses = res.headers.get('EXTENSION-RESPONSES');
  if (extensionResponses) {
    console.log('\nBazaar extension status:', extensionResponses);
    if (extensionResponses.includes('rejected')) {
      console.log('  WARNING: CDP rejected bazaar extension.');
    } else if (extensionResponses.includes('processing')) {
      console.log('  OK: CDP accepted; endpoint will be cataloged in Bazaar within ~10 min.');
    }
  }
  const settlementHeader = res.headers.get('payment-response') || res.headers.get('PAYMENT-RESPONSE');
  if (settlementHeader) {
    try {
      const settled = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
      console.log('\nSettlement:');
      console.log(JSON.stringify(settled, null, 2));
      if (settled.transaction) {
        const explorer = `https://basescan.org/tx/${settled.transaction}`;
        console.log('Explorer:', explorer);
      }
    } catch {
      console.log('(could not decode PAYMENT-RESPONSE)');
    }
  }
  const body = await res.text();
  console.log('\nBody (first 800 chars):');
  console.log(body.slice(0, 800));
  process.exit(res.ok ? 0 : 2);
}

main().catch((err) => {
  console.error('Smoke failed:', err);
  process.exit(1);
});
