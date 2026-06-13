/**
 * Postman collection parity guard.
 *
 * public/postman-collection.json is a curated subset, and the surfaces that
 * point to it advertise its request count ("33 requests" on the developers page
 * and in llms.txt). That count drifts if requests are added or removed without
 * updating the copy, and llms.txt used to overstate it as "every endpoint"
 * (corrected 2026-06-13). This guard ties the advertised count to the actual
 * collection and checks that the premium requests in it still resolve to real
 * catalog endpoints.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG } from './premium-catalog';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

function readRepoFile(...segments: string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), 'utf8');
}

function collapse(path: string): string {
  return path.replace(/\{[^}]+\}/g, '{}');
}

interface PmUrl {
  raw?: string;
  path?: string[];
}
interface PmItem {
  request?: { url?: string | PmUrl };
  item?: PmItem[];
}

function reconPath(u: string | PmUrl | undefined): string | null {
  if (!u) return null;
  if (typeof u === 'string') return u;
  if (u.raw) return u.raw;
  if (Array.isArray(u.path)) return '/' + u.path.join('/');
  return null;
}

function collectRequestPaths(items: PmItem[] | undefined, out: string[]): void {
  for (const it of items || []) {
    if (it.request) {
      const p = reconPath(it.request.url);
      if (p) out.push(p);
    }
    if (it.item) collectRequestPaths(it.item, out);
  }
}

describe('Postman collection parity', () => {
  const collection = JSON.parse(readRepoFile('public', 'postman-collection.json')) as { item?: PmItem[] };
  const paths: string[] = [];
  collectRequestPaths(collection.item, paths);
  const requestCount = paths.length;

  it('the advertised request count matches the actual collection', () => {
    const developers = readRepoFile('src', 'app', 'developers', 'page.tsx');
    const llms = readRepoFile('public', 'llms.txt');
    expect(developers, `developers page must cite "${requestCount} requests" to match the collection`).toContain(
      `${requestCount} requests`,
    );
    expect(llms, `llms.txt must cite "${requestCount} requests" to match the collection`).toContain(
      `${requestCount} requests`,
    );
  });

  it('every premium request in the collection resolves to a catalog row', () => {
    const catalog = new Set(PREMIUM_CATALOG.map((e) => collapse(e.path)));
    const dead = paths
      .map((p) => {
        const m = p.match(/\/api\/premium\/[^?\s]*/);
        return m ? m[0] : null;
      })
      .filter((p): p is string => p !== null)
      .filter((p) => !catalog.has(collapse(p)));
    expect(
      dead,
      `Postman requests hit premium paths not in PREMIUM_CATALOG (dead requests):\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });
});
