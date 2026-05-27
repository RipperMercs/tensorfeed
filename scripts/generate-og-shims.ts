/**
 * Generate per-article opengraph-image.tsx shims for every folder under
 * src/app/originals/. Each shim hardcodes its own slug and delegates to
 * the shared template at src/lib/og/article-og.tsx.
 *
 * Idempotent: skips folders that already have an opengraph-image.tsx.
 *
 * Run after creating a new originals article (and from the daily-article
 * skill at article-creation time):
 *
 *   npx tsx scripts/generate-og-shims.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGINALS_DIR = path.join(process.cwd(), 'src/app/originals');

const SHIM_TEMPLATE = (slug: string) => `import {
  articleOgImage,
  articleOgAlt,
  articleOgSize,
  articleOgContentType,
} from '@/lib/og/article-og';

export const alt = articleOgAlt;
export const size = articleOgSize;
export const contentType = articleOgContentType;

export default function OpengraphImage() {
  return articleOgImage('${slug}');
}
`;

function main() {
  const entries = fs.readdirSync(ORIGINALS_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let created = 0;
  let skipped = 0;

  for (const slug of folders) {
    const pagePath = path.join(ORIGINALS_DIR, slug, 'page.tsx');
    if (!fs.existsSync(pagePath)) continue;

    const shimPath = path.join(ORIGINALS_DIR, slug, 'opengraph-image.tsx');
    if (fs.existsSync(shimPath)) {
      skipped += 1;
      continue;
    }

    fs.writeFileSync(shimPath, SHIM_TEMPLATE(slug), 'utf8');
    created += 1;
    console.log(`  + ${slug}`);
  }

  console.log(`\nDone. ${created} shim(s) created, ${skipped} already present.`);
}

main();
