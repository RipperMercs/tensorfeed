/**
 * /api/meta premium-path parity guard.
 *
 * The /api/meta `api` object is the hand-maintained discovery catalog an agent
 * reads to learn what TensorFeed serves. Its entries (and their description
 * strings) reference dozens of /api/premium/* paths. A reference to a premium
 * path that no longer exists is a dead link that misleads a paying agent. That
 * shipped: /api/premium/agents/reputation/series was advertised here with no
 * handler, catalog row, or pilot (removed 2026-06-13).
 *
 * This guard extracts every /api/premium/* reference from the meta `api` object
 * and asserts each resolves to a real PREMIUM_CATALOG row (the catalog is itself
 * drift-tested against the handlers by premium-catalog.test.ts), so a dead
 * premium reference can no longer reach /api/meta unnoticed.
 *
 * Free management routes that are real but intentionally absent from the buyable
 * catalog (the /api/premium/watches/{id} GET/DELETE pair) are allowlisted.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG } from './premium-catalog';

const HERE = dirname(fileURLToPath(import.meta.url));

// Collapse a path's {param} segments so a templated reference matches the
// templated catalog row regardless of the param name.
function collapse(path: string): string {
  return path.replace(/\{[^}]+\}/g, '{}');
}

// Real routes that legitimately appear in /api/meta but are not in the buyable
// PREMIUM_CATALOG (token-required but zero-credit management endpoints).
const ALLOWLIST = new Set(['/api/premium/watches/{}']);

// Quote-aware brace match: the meta values are quoted strings that contain
// braces ({ticker}, {YYYY-MM-DD}); those must not count toward brace depth.
function extractMetaApiBlock(text: string): string {
  const anchor = text.indexOf("'/api/feed.xml'");
  if (anchor === -1) throw new Error('meta block anchor /api/feed.xml not found');
  const apiKey = text.indexOf('api: {', anchor);
  if (apiKey === -1) throw new Error('meta api object not found after anchor');
  const begin = text.indexOf('{', apiKey);
  let depth = 0;
  let inStr = false;
  let q = '';
  for (let i = begin; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === q) inStr = false;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(begin, i + 1);
    }
  }
  throw new Error('meta api object braces unbalanced');
}

describe('/api/meta advertises only real premium paths', () => {
  const HERE_SRC = readFileSync(join(HERE, 'index.ts'), 'utf8');
  const block = extractMetaApiBlock(HERE_SRC);

  // Each path segment is either an identifier or a {param} template.
  const refs = [
    ...new Set(
      block.match(/\/api\/premium\/(?:[A-Za-z0-9_-]+|\{[^}]+\})(?:\/(?:[A-Za-z0-9_-]+|\{[^}]+\}))*/g) || [],
    ),
  ];

  const catalog = new Set(PREMIUM_CATALOG.map((e) => collapse(e.path)));

  it('found a meaningful number of premium references (extraction sanity)', () => {
    expect(refs.length).toBeGreaterThan(50);
  });

  it('every /api/premium reference resolves to a catalog row or an allowlisted route', () => {
    const dead = refs.filter((r) => {
      const c = collapse(r);
      return !catalog.has(c) && !ALLOWLIST.has(c);
    });
    expect(
      dead,
      `/api/meta advertises these /api/premium paths that are not in PREMIUM_CATALOG ` +
        `(dead references). Remove them from the meta api object, or add the real endpoint:\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });
});
