import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINALS } from './originals-directory';

// Guards the originals index (the single source of truth for the /originals
// list and the homepage "Latest from TensorFeed" section) against the drift
// that has bitten before: an article page shipped without a directory entry
// (orphaned from the list and author rotation), a directory entry whose page
// was removed (a dead list card), and the same slug listed twice (a duplicate
// card). The index is hand-maintained, so nothing else catches this.

const HERE = dirname(fileURLToPath(import.meta.url)); // src/lib
const ORIGINALS_DIR = join(HERE, '..', 'app', 'originals');

function diskSlugs(): string[] {
  const out: string[] = [];
  for (const name of readdirSync(ORIGINALS_DIR)) {
    const full = join(ORIGINALS_DIR, name);
    if (statSync(full).isDirectory() && existsSync(join(full, 'page.tsx'))) {
      out.push(name);
    }
  }
  return out;
}

describe('originals directory integrity', () => {
  it('has no duplicate slugs', () => {
    const slugs = ORIGINALS.map(a => a.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i).sort();
    expect(dupes, `duplicate slugs in originals-directory.ts: ${dupes.join(', ')}`).toEqual([]);
  });

  it('lists every originals page that exists on disk', () => {
    const indexed = ORIGINALS.map(a => a.slug);
    const missing = diskSlugs().filter(s => !indexed.includes(s)).sort();
    expect(missing, `pages on disk but absent from originals-directory.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no directory entry whose page is missing on disk', () => {
    const onDisk = diskSlugs();
    const dangling = ORIGINALS.map(a => a.slug).filter(s => !onDisk.includes(s)).sort();
    expect(dangling, `directory entries with no page on disk: ${dangling.join(', ')}`).toEqual([]);
  });
});
