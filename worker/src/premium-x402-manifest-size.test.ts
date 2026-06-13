/**
 * x402 storefront manifest size guard.
 *
 * The publisher crawler (and, by reasonable assumption, external crawlers like
 * x402scan and CDP Bazaar) reject a manifest over MAX_MANIFEST_BYTES as
 * 'manifest_too_large'. If our own served manifest crosses that ceiling, the
 * storefront becomes un-ingestable and the whole discovery surface silently
 * goes dark, which is worse than any single missing endpoint.
 *
 * This happened on 2026-06-12: adding 9 endpoints pushed the 2-space
 * pretty-printed file from ~998KB to ~1.05MB, over the cap. The fix was to
 * serialize with 1-space indent (sync-x402-manifest.ts); this guard keeps the
 * served byte budget honest so growth cannot silently cross the cap again. The
 * existing x402-index/live.test.ts only catches it AFTER deploy, against the
 * edge; this catches it at build time, deterministically.
 *
 * Bytes are measured LF-normalized to match what Cloudflare serves (the repo may
 * be checked out with CRLF on Windows).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MAX_MANIFEST_BYTES } from './x402-index/publisher-registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, '..', '..', 'public', '.well-known', 'x402.json');

describe('x402 storefront manifest fits the crawler size cap', () => {
  it('served manifest is under MAX_MANIFEST_BYTES with headroom', () => {
    const lfNormalized = readFileSync(MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n');
    const served = Buffer.byteLength(lfNormalized, 'utf8');
    // Assert under the hard cap, and flag at 90% so we get a warning margin
    // before an actual rejection. 90% of 1MB = 900KB leaves room to react.
    expect(
      served,
      `Served manifest is ${served} bytes, at/over the ${MAX_MANIFEST_BYTES}-byte crawler cap. ` +
        `Reduce per-item verbosity (output examples) or split-instance count in sync-x402-manifest.ts.`,
    ).toBeLessThan(MAX_MANIFEST_BYTES);
    expect(
      served,
      `Served manifest is ${served} bytes, over 90% of the ${MAX_MANIFEST_BYTES}-byte cap. ` +
        `Plan a size reduction before it crosses the hard limit.`,
    ).toBeLessThan(MAX_MANIFEST_BYTES * 0.9);
  });
});
