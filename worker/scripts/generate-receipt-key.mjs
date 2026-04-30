// Generate a fresh Ed25519 keypair for the AFTA receipt signing rail.
//
// Run from the project root: node worker/scripts/generate-receipt-key.mjs
//
// What it does:
//   1. Mints a fresh Ed25519 keypair
//   2. Writes the PUBLIC JWK to public/.well-known/tensorfeed-receipt-key.json
//   3. Prints the PRIVATE JWK on stdout for you to paste into wrangler
//
// After running, finish bootstrap with:
//   cd worker
//   wrangler secret put RECEIPT_PRIVATE_KEY_JWK     (paste the printed private)
//   cd ..
//   git add public/.well-known/tensorfeed-receipt-key.json
//   git commit -m "feat(afta): provision receipt signing key"
//   git push
//
// Rotation: re-run this script, update the secret, push the new public key.
// Phase 1 ships single-key only.

import { webcrypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify'],
);

const pubJwk = await webcrypto.subtle.exportKey('jwk', publicKey);
const privJwk = await webcrypto.subtle.exportKey('jwk', privateKey);

// Stable kid (key id): first 16 hex chars of SHA-256(public x).
const xBytes = Buffer.from(pubJwk.x.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64');
const digest = await webcrypto.subtle.digest('SHA-256', xBytes);
const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
const kid = hex.slice(0, 16);

const publicEnriched = {
  ...pubJwk,
  kid,
  use: 'sig',
  alg: 'EdDSA',
  verify_doc: 'https://tensorfeed.ai/agent-fair-trade#receipts',
};
const privateEnriched = {
  ...privJwk,
  kid,
  use: 'sig',
  alg: 'EdDSA',
};

// Write the public key file so the user does not need to edit JSON manually.
const publicKeyPath = resolve(process.cwd(), 'public', '.well-known', 'tensorfeed-receipt-key.json');
writeFileSync(publicKeyPath, JSON.stringify(publicEnriched, null, 2) + '\n', 'utf8');

console.log('');
console.log('Public key written to:');
console.log('  ' + publicKeyPath);
console.log('');
console.log('Key id (kid): ' + kid);
console.log('');
console.log('=== PRIVATE JWK (copy the line below, paste into wrangler) ===');
console.log('');
console.log(JSON.stringify(privateEnriched));
console.log('');
console.log('Next steps:');
console.log('  cd worker');
console.log('  wrangler secret put RECEIPT_PRIVATE_KEY_JWK    (paste the line above)');
console.log('  cd ..');
console.log('  git add public/.well-known/tensorfeed-receipt-key.json');
console.log('  git commit -m "feat(afta): provision receipt signing key"');
console.log('  git push');
console.log('');
