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

  // 2. Discovery list (paginated full scan for tensorfeed.ai hits)
  console.log('\n=== /discovery/resources (paginated full scan) ===');
  const PAGE_SIZE = 200;
  let offset = 0;
  let totalItems = 0;
  let totalCatalog = 0;
  let pages = 0;
  const tfHits = [];

  while (true) {
    const path = `/platform/v2/x402/discovery/resources?type=http&limit=${PAGE_SIZE}&offset=${offset}`;
    const page = await callCdp('GET', path, apiKeyId, apiKeySecret);
    if (page.status !== 200) {
      console.log(`page at offset=${offset} returned HTTP ${page.status}`);
      console.log(JSON.stringify(page.body, null, 2));
      process.exit(3);
    }
    const items = page.body.items ?? [];
    if (items.length === 0) break;
    totalItems += items.length;
    totalCatalog = page.body.pagination?.total ?? totalCatalog;
    pages += 1;
    for (const item of items) {
      if ((item.resource ?? '').includes('tensorfeed.ai')) {
        tfHits.push(item);
      }
    }
    offset += items.length;
    if (offset >= totalCatalog) break;
    if (pages % 25 === 0) {
      process.stdout.write(`\rscanned ${pages} pages (${totalItems}/${totalCatalog})…`);
    }
  }

  console.log(`\rscanned ${pages} pages, ${totalItems}/${totalCatalog} items total          `);

  // Diagnostic: surface entries where the payTo wallet matches TF's, to
  // catch the case where our entry was cataloged under a normalized URL
  // form that doesn't substring-match "tensorfeed.ai".
  const TF_PAY_TO = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
  const payToHits = [];
  // Diagnostic: top N most recently updated entries
  const recentSorted = [];
  // Collect from a re-scan — items were not retained per page in the
  // outer loop. Re-walk one more pass with a smaller limit.

  // Actually we need to re-fetch since we didn't accumulate items.
  // Quick second pass focused on diagnostic signals only.
  const diagOffset = 0;
  const diagLimit = 200;
  const firstPage = await callCdp(
    'GET',
    `/platform/v2/x402/discovery/resources?type=http&limit=${diagLimit}&offset=${diagOffset}`,
    apiKeyId,
    apiKeySecret,
  );
  const firstItems = firstPage.body.items ?? [];

  for (const item of firstItems) {
    const payTos = (item.accepts ?? []).map((a) => (a.payTo ?? '').toLowerCase());
    if (payTos.includes(TF_PAY_TO.toLowerCase())) {
      payToHits.push(item);
    }
  }

  // Top 5 most-recently-updated from the first page
  const sortedByRecency = [...firstItems].sort((a, b) =>
    (b.lastUpdated ?? '').localeCompare(a.lastUpdated ?? ''),
  );
  for (const item of sortedByRecency.slice(0, 5)) {
    recentSorted.push(item);
  }

  console.log(`\ntensorfeed.ai (URL substring) hits: ${tfHits.length}`);
  for (const hit of tfHits) {
    console.log(`  - ${hit.resource}`);
    console.log(`      lastUpdated: ${hit.lastUpdated}`);
    if (hit.accepts && hit.accepts.length > 0) {
      const acc = hit.accepts[0];
      console.log(
        `      accepts: ${acc.scheme} ${acc.network} amount=${acc.amount} payTo=${acc.payTo}`,
      );
    }
    if (hit.metadata) {
      console.log(`      metadata: ${JSON.stringify(hit.metadata).slice(0, 200)}`);
    }
  }

  console.log(`\npayTo=${TF_PAY_TO} (TF wallet) hits in first 200: ${payToHits.length}`);
  for (const hit of payToHits) {
    console.log(`  - ${hit.resource}`);
    console.log(`      lastUpdated: ${hit.lastUpdated}`);
  }

  console.log(`\nMost recently updated entries (first 200 of catalog):`);
  for (const item of recentSorted) {
    console.log(`  ${item.lastUpdated}  ${item.resource}`);
  }

  if (tfHits.length === 0 && payToHits.length === 0) {
    console.log(
      '\nNo TensorFeed entries detected by URL substring or by payTo wallet match.',
    );
  } else if (tfHits.length > 0 || payToHits.length > 0) {
    console.log('\nBazaar catalog confirmed for TensorFeed.');
  }
}

main().catch((err) => {
  console.error('Discovery check failed:', err);
  process.exit(1);
});
