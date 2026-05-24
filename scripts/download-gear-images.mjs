/**
 * Download product images from manifest and save to public/gear/{id}.{ext}.
 *
 * Usage: pass a manifest file path as the first arg. Manifest format is
 * one line per product: `{id} | {url} | {note}` (the note is ignored).
 * Lines with UNAVAILABLE in the URL slot are skipped. Lines starting with
 * # are comments.
 *
 *   node scripts/download-gear-images.mjs path/to/manifest.txt
 *
 * After download, prints a summary and the gear.json image-field updates
 * needed (some images may save as .png or .webp rather than .jpg).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { URL } from 'url';

const OUT_DIR = path.join(process.cwd(), 'public', 'gear');
const UA =
  'TensorFeed.ai/1.0 (https://tensorfeed.ai; evan@tensorfeed.ai)';

function extFromUrl(u) {
  const lower = u.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.jpeg')) return 'jpg';
  if (lower.endsWith('.jpg')) return 'jpg';
  if (lower.endsWith('.svg')) return 'svg';
  return 'jpg';
}

function fetch(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects < 0) {
      reject(new Error('Too many redirects'));
      return;
    }
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': UA,
          'Accept': 'image/*,*/*;q=0.8',
        },
      },
      res => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          fetch(next, redirects - 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error('usage: node scripts/download-gear-images.mjs <manifest>');
    process.exit(1);
  }

  const lines = fs
    .readFileSync(manifestPath, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const updates = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 2) continue;
    const id = parts[0];
    const url = parts[1];
    if (!url || url.toUpperCase().includes('UNAVAILABLE')) {
      console.log(`[skip] ${id}: no URL`);
      skipped += 1;
      continue;
    }
    const ext = extFromUrl(url);
    const out = path.join(OUT_DIR, `${id}.${ext}`);
    try {
      const buf = await fetch(url);
      fs.writeFileSync(out, buf);
      console.log(`[ok]   ${id} -> ${id}.${ext} (${buf.length} bytes)`);
      ok += 1;
      updates.push({ id, ext });
    } catch (e) {
      console.log(`[fail] ${id}: ${e.message}`);
      failed += 1;
    }
  }

  console.log('');
  console.log(`Summary: ${ok} ok, ${skipped} skipped, ${failed} failed`);
  console.log('');
  console.log('gear.json image-field paths to confirm:');
  for (const u of updates) {
    console.log(`  ${u.id}: /gear/${u.id}.${u.ext}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
