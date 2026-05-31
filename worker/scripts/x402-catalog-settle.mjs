#!/usr/bin/env node
/**
 * x402 Bazaar catalog settle client (generalized, spec-correct).
 *
 * Why this exists separate from x402-smoke-test.mjs:
 *   The smoke test hardcodes the /api/premium/whats-new bazaar extension
 *   and only sends it with --with-bazaar-pilot. CDP catalogs a resource
 *   using the resource + extensions block inside the client PaymentPayload
 *   that flows to /settle (cdpSettle forwards the client payload verbatim;
 *   it does NOT inject the extension server-side). So to catalog any other
 *   pilot endpoint with CORRECT per-endpoint metadata, the client must
 *   echo that endpoint's own extension.
 *
 *   This script does exactly that: it reads the live 402 from the deployed
 *   Worker (which already carries the correct per-pilot `resource` and
 *   `extensions` via worker/src/bazaar-pilots.ts), then signs and replays
 *   the request echoing the server's resource + extensions verbatim. That
 *   is precisely what a real agent does, so the cataloged metadata is
 *   guaranteed to match what the endpoint actually serves. It generalizes
 *   to every future Bazaar wave with zero hardcoding.
 *
 * Usage (PowerShell):
 *   $env:AGENT_KEY = "0x<test-buyer-private-key>"
 *   node scripts/x402-catalog-settle.mjs --endpoint https://tensorfeed.ai/api/premium/routing
 *
 * Multiple endpoints:
 *   node scripts/x402-catalog-settle.mjs `
 *     --endpoint https://tensorfeed.ai/api/premium/routing `
 *     --endpoint https://tensorfeed.ai/api/premium/compare/models `
 *     --endpoint https://tensorfeed.ai/api/premium/cost/projection
 *
 * Dry run (no signing, no spend, no AGENT_KEY required): add --dry-run.
 *   Prints the parsed 402 quote and the exact resource + extensions that
 *   WOULD be echoed, so the wire shape can be reviewed before any money
 *   moves. The dry run only issues an unpaid GET, which is harmless.
 *
 * Prerequisites for a real (non dry-run) settle:
 *   1. AGENT_KEY holds the test buyer EOA private key (0x + 64 hex).
 *   2. That EOA holds at least the quoted USDC on Base mainnet. The pilot
 *      endpoints route settlement through CDP, which pays gas, so the
 *      buyer EOA needs no Base ETH.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { randomBytes } from 'crypto';

// eip155:<chainId> -> chain id integer. The 402 carries the CAIP-2
// network string; we only need the integer for the EIP-712 domain.
function chainIdFromNetwork(network) {
  const m = /^eip155:(\d+)$/.exec(network || '');
  if (!m) throw new Error(`unrecognized network in 402: ${network}`);
  return Number(m[1]);
}

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
  const args = { endpoints: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--endpoint') args.endpoints.push(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.log(
    'Usage:\n' +
      '  $env:AGENT_KEY = "0x..."   (omit for --dry-run)\n' +
      '  node scripts/x402-catalog-settle.mjs --endpoint <url> [--endpoint <url> ...] [--dry-run]',
  );
}

// Fetch the unpaid 402 and pull the canonical PaymentRequired out of it.
// TF spreads the canonical object into the JSON body (x402Version, error,
// resource, accepts, extensions), so the body is sufficient. We fall back
// to the PAYMENT-REQUIRED header if the body shape is ever trimmed.
async function read402(endpoint) {
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { 'User-Agent': 'tensorfeed-x402-catalog-settle/1.0' },
  });
  if (res.status !== 402) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `expected 402 from ${endpoint}, got HTTP ${res.status}. ` +
        `Strict-premium pilots must 402 on an unpaid GET. Body: ${txt.slice(0, 300)}`,
    );
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  let pr = body && body.accepts ? body : null;
  if (!pr) {
    const hdr = res.headers.get('PAYMENT-REQUIRED');
    if (hdr) {
      try {
        pr = JSON.parse(Buffer.from(hdr, 'base64').toString('utf-8'));
      } catch {
        /* fall through to the explicit error below */
      }
    }
  }
  if (!pr || !Array.isArray(pr.accepts) || pr.accepts.length === 0) {
    throw new Error(`402 from ${endpoint} did not carry a usable accepts[]`);
  }
  return pr;
}

function describe(endpoint, pr) {
  const a = pr.accepts[0];
  const ext = pr.extensions || {};
  const bazaar = ext.bazaar || null;
  console.log(`\n=== ${endpoint} ===`);
  console.log('resource.url        :', pr.resource && pr.resource.url);
  console.log('resource.description:', pr.resource && pr.resource.description);
  console.log('network             :', a.network);
  console.log('amount              :', a.amount, `(${(Number(a.amount) / 1e6).toFixed(6)} USDC)`);
  console.log('asset               :', a.asset);
  console.log('payTo               :', a.payTo);
  console.log(
    'extensions.bazaar   :',
    bazaar ? 'present (will be echoed verbatim to CDP /settle)' : 'MISSING (endpoint will NOT catalog)',
  );
  if (bazaar && bazaar.info && bazaar.info.input) {
    console.log(
      '  bazaar.info.input :',
      `${bazaar.info.input.method} ${JSON.stringify(bazaar.info.input.queryParams || {})}`,
    );
  }
  return { a, hasBazaar: !!bazaar };
}

async function settleOne(endpoint, account, dryRun) {
  const pr = await read402(endpoint);
  const { a, hasBazaar } = describe(endpoint, pr);
  if (!hasBazaar) {
    console.log('  SKIP: no bazaar extension in the 402, settling would not catalog.');
    return { endpoint, skipped: true };
  }
  if (dryRun) {
    console.log('  DRY RUN: not signing, not sending. The block above is what would be echoed.');
    return { endpoint, dryRun: true };
  }

  const chainId = chainIdFromNetwork(a.network);
  const extra = a.extra || {};
  const domain = {
    name: extra.name || 'USD Coin',
    version: extra.version || '2',
    chainId,
    verifyingContract: a.asset,
  };
  const now = Math.floor(Date.now() / 1000);
  const auth = {
    from: account.address,
    to: a.payTo,
    value: String(a.amount),
    validAfter: String(now - 60),
    validBefore: String(now + (Number(a.maxTimeoutSeconds) || 600)),
    nonce: '0x' + randomBytes(32).toString('hex'),
  };

  console.log('  signing EIP-3009 transferWithAuthorization as', account.address, '...');
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

  // Mirror the proven smoke-test PaymentPayload shape, but source
  // resource + accepted + extensions from the live 402 so the cataloged
  // metadata always matches what the endpoint actually serves.
  const payload = {
    x402Version: pr.x402Version || 2,
    resource: pr.resource,
    accepted: {
      scheme: a.scheme,
      network: a.network,
      amount: String(a.amount),
      asset: a.asset,
      payTo: a.payTo,
      maxTimeoutSeconds: Number(a.maxTimeoutSeconds) || 60,
      extra: a.extra,
    },
    payload: { signature, authorization: auth },
    extensions: pr.extensions,
  };
  const xPayment = Buffer.from(JSON.stringify(payload)).toString('base64');

  const t0 = Date.now();
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { 'X-PAYMENT': xPayment, 'User-Agent': 'tensorfeed-x402-catalog-settle/1.0' },
  });
  const ms = Date.now() - t0;
  console.log(`  HTTP ${res.status} (${ms} ms)`);

  // On a non-2xx, print the response body so the failure reason is visible
  // (e.g. invalid_payload, missing params, snapshot_not_ready) instead of a
  // bare status code. The body is not read elsewhere, so consuming it is safe.
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (errText) console.log('  body:', errText.slice(0, 500));
  }

  const extResp = res.headers.get('EXTENSION-RESPONSES');
  if (extResp) {
    console.log('  EXTENSION-RESPONSES:', extResp);
    if (extResp === 'processing') console.log('  OK: cataloged in Bazaar within ~10 min.');
    else if (extResp === 'rejected') console.log('  WARNING: CDP rejected the bazaar extension.');
  } else {
    console.log('  EXTENSION-RESPONSES: (none returned)');
  }

  const settleHdr = res.headers.get('PAYMENT-RESPONSE');
  let tx = null;
  if (settleHdr) {
    try {
      const settled = JSON.parse(Buffer.from(settleHdr, 'base64').toString('utf-8'));
      tx = settled.transaction || null;
      console.log('  settlement:', JSON.stringify(settled));
      if (tx) console.log('  explorer  : https://basescan.org/tx/' + tx);
    } catch {
      console.log('  (could not decode PAYMENT-RESPONSE)');
    }
  }
  return { endpoint, status: res.status, extResp: extResp || null, tx, ok: res.ok };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.endpoints.length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  let account = null;
  if (!args.dryRun) {
    let key = (process.env.AGENT_KEY || '').trim();
    // Accept the key with or without a 0x prefix. Still strictly exactly
    // 64 hex characters, so this does not weaken the format check.
    if (/^[0-9a-fA-F]{64}$/.test(key)) key = '0x' + key;
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      console.error('Set AGENT_KEY to the test buyer EOA private key (64 hex, 0x optional), or pass --dry-run.');
      process.exit(1);
    }
    account = privateKeyToAccount(key);
    console.log('signer (from AGENT_KEY):', account.address);
    console.log('Confirm this matches the intended PRS test wallet before proceeding.');
  } else {
    console.log('DRY RUN: unpaid GETs only. No AGENT_KEY needed, no money moves.');
  }

  const results = [];
  for (const ep of args.endpoints) {
    try {
      results.push(await settleOne(ep, account, args.dryRun));
    } catch (err) {
      console.log(`\n=== ${ep} ===`);
      console.log('  ERROR:', err instanceof Error ? err.message : String(err));
      results.push({ endpoint: ep, error: true });
    }
  }

  console.log('\n--- summary ---');
  for (const r of results) {
    if (r.error) console.log(`${r.endpoint}  ERROR`);
    else if (r.skipped) console.log(`${r.endpoint}  SKIPPED (no bazaar extension)`);
    else if (r.dryRun) console.log(`${r.endpoint}  DRY RUN ok`);
    else console.log(`${r.endpoint}  HTTP ${r.status}  ext=${r.extResp}  tx=${r.tx || '(none)'}`);
  }
  const hardFail = results.some((r) => r.error || (r.status && !r.ok));
  process.exit(hardFail ? 2 : 0);
}

main().catch((err) => {
  console.error('catalog-settle failed:', err);
  process.exit(1);
});
