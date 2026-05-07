#!/usr/bin/env node
// One-shot sweep: insert <ShareBar> directly after </header> in every
// /originals/{slug}/page.tsx that does not already use it. Idempotent.
import fs from 'node:fs';
import path from 'node:path';

const ORIGINALS_DIR = path.resolve('src/app/originals');
const SHAREBAR_IMPORT = "import ShareBar from '@/components/originals/ShareBar';";

const slugs = fs
  .readdirSync(ORIGINALS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let updated = 0;
let skipped = 0;
const failures = [];

for (const slug of slugs) {
  const file = path.join(ORIGINALS_DIR, slug, 'page.tsx');
  if (!fs.existsSync(file)) continue;

  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('ShareBar')) {
    skipped++;
    continue;
  }

  // Extract title from metadata. Handles both double-quoted and
  // single-quoted string forms; falls back to backtick-templates.
  const titleMatch =
    src.match(/export const metadata[^{]*\{[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"/) ||
    src.match(/export const metadata[^{]*\{[\s\S]*?title:\s*'((?:[^'\\]|\\.)*)'/);
  if (!titleMatch) {
    failures.push(`${slug}: could not extract title from metadata`);
    continue;
  }
  // Unescape only the escapes that show up in JS string literals; we'll
  // re-emit inside double quotes so we need to escape any " in the title.
  const rawTitle = titleMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
  const titleForJsx = rawTitle.replace(/"/g, '\\"');

  // Insert import after the last existing top-of-file import line.
  const importMatches = [...src.matchAll(/^import .+;\s*$/gm)];
  if (importMatches.length === 0) {
    failures.push(`${slug}: no import lines found`);
    continue;
  }
  const lastImport = importMatches[importMatches.length - 1];
  const importInsertAt = lastImport.index + lastImport[0].length;
  src = src.slice(0, importInsertAt) + '\n' + SHAREBAR_IMPORT + src.slice(importInsertAt);

  // Insert ShareBar JSX after the first </header>. Match the indentation
  // of the </header> tag itself so the new element nests correctly.
  const headerCloseRe = /^([ \t]*)<\/header>\s*$/m;
  const headerMatch = src.match(headerCloseRe);
  if (!headerMatch) {
    failures.push(`${slug}: no </header> found`);
    continue;
  }
  const indent = headerMatch[1] || '      ';
  const shareJsx = [
    '',
    `${indent}<ShareBar`,
    `${indent}  path="/originals/${slug}"`,
    `${indent}  title="${titleForJsx}"`,
    `${indent}/>`,
  ].join('\n');

  const headerEnd = headerMatch.index + headerMatch[0].length;
  src = src.slice(0, headerEnd) + shareJsx + src.slice(headerEnd);

  fs.writeFileSync(file, src);
  updated++;
}

console.log(`updated: ${updated}`);
console.log(`skipped (already had ShareBar): ${skipped}`);
if (failures.length) {
  console.log(`failures: ${failures.length}`);
  for (const f of failures) console.log(`  - ${f}`);
}
