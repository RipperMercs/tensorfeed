import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every originals article must set a self-referencing canonical so trailing
// slash or parameterized URL variants do not dilute its ranking signals. The
// metadata objects are hand-written (no originals/layout.tsx supplies one), so
// this guards against a new article shipping without a canonical, and against a
// canonical that points at the wrong slug. 107 of 113 were backfilled by a
// codemod keyed on the directory slug; 6 already had it.

const HERE = dirname(fileURLToPath(import.meta.url)); // src/lib
const ORIGINALS_DIR = join(HERE, '..', 'app', 'originals');

describe('originals canonical tags', () => {
  it('every originals page sets a self-referencing canonical matching its slug', () => {
    const missing: string[] = [];
    for (const slug of readdirSync(ORIGINALS_DIR)) {
      const file = join(ORIGINALS_DIR, slug, 'page.tsx');
      if (!existsSync(file)) continue;
      const content = readFileSync(file, 'utf8');
      const re = new RegExp("canonical:\\s*['\"]https://tensorfeed\\.ai/originals/" + slug + "['\"]");
      if (!re.test(content)) missing.push(slug);
    }
    expect(missing, `originals missing a self-canonical for their slug: ${missing.join(', ')}`).toEqual([]);
  });
});
