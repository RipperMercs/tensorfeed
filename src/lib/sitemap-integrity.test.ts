import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the hand-maintained sitemap against the two drift modes that have
// bitten before: an /originals article shipped without a sitemap entry (never
// indexed), and a sitemap entry left pointing at a route with no page (a 404
// in the sitemap, which search engines penalize). The originals list and most
// section routes are hardcoded in sitemap.ts, so nothing else catches drift.

const HERE = dirname(fileURLToPath(import.meta.url)); // src/lib
const APP = join(HERE, '..', 'app'); // src/app
const SITEMAP_SRC = readFileSync(join(APP, 'sitemap.ts'), 'utf8');
const ORIGINALS_DIR = join(APP, 'originals');

function uniq(arr: string[]): string[] {
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

// Every literal `${baseUrl}/a/b/c` in the sitemap. The char class cannot match
// a `$`, so interpolated map() entries (models/${slug} etc.) are skipped, which
// is what we want: those are generated from the same directory they would point
// at, so they cannot drift.
function literalSitemapRoutes(): string[] {
  const re = /\$\{baseUrl\}(\/[a-z0-9\-/]*)?`/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(SITEMAP_SRC)) !== null) out.push(m[1] ? m[1] : '/');
  return uniq(out);
}

function sitemapOriginalSlugs(): string[] {
  const re = /\/originals\/([a-z0-9-]+)`/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(SITEMAP_SRC)) !== null) out.push(m[1]);
  return uniq(out);
}

function diskOriginalSlugs(): string[] {
  const out: string[] = [];
  for (const name of readdirSync(ORIGINALS_DIR)) {
    const full = join(ORIGINALS_DIR, name);
    if (statSync(full).isDirectory() && existsSync(join(full, 'page.tsx'))) {
      out.push(name);
    }
  }
  return out;
}

function childDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(n => {
    try {
      return statSync(join(dir, n)).isDirectory();
    } catch {
      return false;
    }
  });
}

// Resolve a URL path to a page.tsx, allowing a literal segment first, then a
// dynamic [slug] segment, then a [...catchAll] segment (App Router precedence).
function resolvesToPage(path: string): boolean {
  const segs = path.split('/').filter(Boolean);
  let dir = APP;
  for (const seg of segs) {
    const kids = childDirs(dir);
    if (kids.includes(seg)) {
      dir = join(dir, seg);
      continue;
    }
    const dynamic = kids.find(k => /^\[[^.].*\]$/.test(k));
    const catchAll = kids.find(k => /^\[\.\.\..*\]$/.test(k));
    if (dynamic) {
      dir = join(dir, dynamic);
      continue;
    }
    if (catchAll) return existsSync(join(dir, catchAll, 'page.tsx'));
    return false;
  }
  return existsSync(join(dir, 'page.tsx'));
}

describe('sitemap integrity', () => {
  it('lists every /originals article that exists on disk', () => {
    const inSitemap = sitemapOriginalSlugs();
    const missing = diskOriginalSlugs().filter(s => !inSitemap.includes(s)).sort();
    expect(missing, `originals on disk but absent from sitemap.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no /originals entry that lacks a page on disk', () => {
    const onDisk = diskOriginalSlugs();
    const dangling = sitemapOriginalSlugs().filter(s => !onDisk.includes(s)).sort();
    expect(dangling, `sitemap /originals entries with no page (404 risk): ${dangling.join(', ')}`).toEqual([]);
  });

  it('resolves every hardcoded route to a real page', () => {
    const broken = literalSitemapRoutes().filter(r => !resolvesToPage(r)).sort();
    expect(broken, `sitemap routes that do not resolve to a page.tsx: ${broken.join(', ')}`).toEqual([]);
  });
});
