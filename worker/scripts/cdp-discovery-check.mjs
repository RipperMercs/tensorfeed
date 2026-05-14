#!/usr/bin/env node
/**
 * Query CDP's x402 discovery catalog and check whether TensorFeed endpoints
 * are listed.
 *
 * Usage (PowerShell):
 *   $env:CDP_API_KEY_ID = "<id>"
 *   $env:CDP_API_KEY_SECRET = "<secret base64>"
 *   node scripts/cdp-discovery-check.mjs
 *
 * Mirrors the JWT signing in worker/src/cdp-facilitator.ts. Read-only.
 */

import { SignJWT, importJWK } from 'jose';
import { randomBytes } from 'crypto';

const CDP_BASE_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';
const CDP_HOST = 'api.cdp.coinbase.com';
const CDP_BASE_PATH = '/platform/v2/x402';

async function buildJwt(apiKeyId, apiKeySecret, method, path) {
  const raw = Buffer.from(apiKeySecret.trim(), 'base64');
  if (raw.length !== 64) {
    throw new Error(`Ed25519 secret must decode to 64 bytes, got ${raw.length}`);
  }
  const seed = raw.subarray(0, 32);
  const publicKey = raw.subarray(32);
  const jwk = {
    kty: 'OKP',
    crv: 'Ed25519',
    d: seed.toString('base64url'),
    x: publicKey.toString('base64url'),
  };
  const key = await importJWK(jwk, 'EdDSA');
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    sub: apiKeyId,
    iss: 'cdp',
    uris: [`${method} ${CDP_HOST}${path}`],
  })
    .setProtectedHeader({
      alg: 'EdDSA',
      kid: apiKeyId,
      typ: 'JWT',
      nonce: randomBytes(16).toString('hex'),
    })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .sign(key);
}

async function callCdp(method, path, apiKeyId, apiKeySecret) {
  const jwt = await buildJwt(apiKeyId, apiKeySecret, method, path);
  const url = `${CDP_BASE_URL}${path.replace(CDP_BASE_PATH, '')}`;
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await resp.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: resp.status, headers: Object.fromEntries(resp.headers), body };
}

async function main() {
  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  if (!apiKeyId || !apiKeySecret) {
    console.error('Set CDP_API_KEY_ID and CDP_API_KEY_SECRET env vars.');
    process.exit(1);
  }

  // 1. Probe /supported to confirm auth works
  console.log('=== /supported ===');
  const supported = await callCdp('GET', '/platform/v2/x402/supported', apiKeyId, apiKeySecret);
  console.log('HTTP', supported.status);
  if (supported.status !== 200) {
    console.log(JSON.stringify(supported.body, null, 2));
    process.exit(2);
  }
  console.log('kinds:', JSON.stringify(supported.body.kinds, null, 2));
  console.log('extensions:', supported.body.extensions);

  // 2. Discovery list
  console.log('\n=== /discovery/resources?type=http&limit=200 ===');
  const discovery = await callCdp(
    'GET',
    '/platform/v2/x402/discovery/resources?type=http&limit=200',
    apiKeyId,
    apiKeySecret,
  );
  console.log('HTTP', discovery.status);
  if (discovery.status !== 200) {
    console.log(JSON.stringify(discovery.body, null, 2));
    process.exit(3);
  }
  const items = discovery.body.items ?? [];
  console.log(`total items: ${items.length}`);
  console.log(`pagination: ${JSON.stringify(discovery.body.pagination)}`);

  // 3. Filter for tensorfeed
  const tfHits = items.filter((r) => (r.resource ?? '').includes('tensorfeed.ai'));
  console.log(`\ntensorfeed.ai hits: ${tfHits.length}`);
  for (const hit of tfHits) {
    console.log('  -', hit.resource, '(lastUpdated:', hit.lastUpdated, ')');
  }

  if (tfHits.length === 0) {
    console.log(
      '\nNo TensorFeed entries cataloged yet. Cataloging fires ~10 min after first successful settle.',
    );
    console.log('First settle tx 0xbb41b06d31c871a0047144d58ab98d13aaed7e49c6d83a92bee05c52f88c068d was at 2026-05-14T15:08:46.');
    console.log('Re-run this script after ~15 min to confirm.');
  }
}

main().catch((err) => {
  console.error('Discovery check failed:', err);
  process.exit(1);
});
