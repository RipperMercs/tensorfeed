/**
 * OpenAPI <-> premium-catalog parity guard.
 *
 * public/openapi.json and public/openapi.yaml are the published machine
 * contract that agentic crawlers and SDK generators read. Two ways they can
 * silently drift from the real product:
 *   1. the JSON and the YAML fall out of sync (a path added to one but not
 *      the other), so a generator that prefers one format sees a different
 *      surface than a generator that prefers the other, and
 *   2. a "/api/premium/..." path is advertised in the spec but no longer maps
 *      to a real row in PREMIUM_CATALOG (the catalog is the buyable-endpoint
 *      source of truth), so an agent is told it can buy something the catalog
 *      does not describe.
 *
 * This suite pins both. It also pins one parameter fact that the copy on
 * /api/premium/news/search depends on: q is OPTIONAL there (the catalog marks
 * it required:false), so the spec must not declare q as a required query
 * parameter or list it in requestBody.required.
 *
 * No YAML parser is assumed. The YAML side is checked as text: every path
 * string in openapi.json must appear verbatim in openapi.yaml, and every path
 * line under the YAML paths: block must exist in openapi.json. Path strings
 * are unique substrings, so verbatim presence is a sound parity check.
 *
 * If this fails, fix the spec or the catalog to match reality. Do not weaken
 * the assertions.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG } from './premium-catalog';

const HERE = dirname(fileURLToPath(import.meta.url));
const OPENAPI_JSON_PATH = join(HERE, '..', '..', 'public', 'openapi.json');
const OPENAPI_YAML_PATH = join(HERE, '..', '..', 'public', 'openapi.yaml');

interface OpenAPIParameter {
  name?: string;
  in?: string;
  required?: boolean;
}
interface OpenAPIOperation {
  parameters?: OpenAPIParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: { required?: string[] } }>;
  };
}
interface OpenAPISpec {
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

function loadJsonSpec(): OpenAPISpec {
  return JSON.parse(readFileSync(OPENAPI_JSON_PATH, 'utf8')) as OpenAPISpec;
}

function jsonPathStrings(spec: OpenAPISpec): string[] {
  return Object.keys(spec.paths);
}

/**
 * Pull the path strings out of the YAML text without a YAML parser. Under the
 * paths: block every path is a top-level mapping key indented two spaces, e.g.
 * "  /api/models:". Match those lines and strip the trailing colon.
 */
function yamlPathStrings(yamlText: string): string[] {
  const out: string[] = [];
  for (const line of yamlText.split(/\r?\n/)) {
    const m = /^ {2}(\/[^\s:]+):\s*$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/**
 * A catalog path may carry {param} or :param segments. An openapi path is
 * covered when at least one catalog path matches it with each param segment
 * treated as a single-segment wildcard. Mirrors catalogPathToRegex in
 * premium-catalog-bazaar-coverage.test.ts, extended to also wildcard :param.
 */
function catalogPathToRegex(catalogPath: string): RegExp {
  const pattern = catalogPath
    .split('/')
    .map((seg) =>
      /^\{[^}]+\}$/.test(seg) || /^:[^/]+$/.test(seg)
        ? '[^/]+'
        : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${pattern}$`);
}

describe('openapi spec is in parity with the premium catalog', () => {
  const spec = loadJsonSpec();
  const jsonPaths = jsonPathStrings(spec);
  const yamlText = readFileSync(OPENAPI_YAML_PATH, 'utf8');
  const yamlPaths = yamlPathStrings(yamlText);

  it('every openapi.json path string appears in openapi.yaml', () => {
    const missing = jsonPaths.filter((p) => !yamlText.includes(p));
    expect(
      missing,
      `These openapi.json paths are absent from openapi.yaml, so the two ` +
        `published specs disagree:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every openapi.yaml path line appears in openapi.json', () => {
    const jsonSet = new Set(jsonPaths);
    const extra = yamlPaths.filter((p) => !jsonSet.has(p));
    expect(
      extra,
      `These openapi.yaml paths are absent from openapi.json, so the two ` +
        `published specs disagree:\n  ${extra.join('\n  ')}`,
    ).toEqual([]);
    // Sanity floor: the regex must actually find the YAML paths, otherwise
    // the check above passes vacuously.
    expect(yamlPaths.length).toBeGreaterThan(0);
  });

  it('every "/api/premium/..." path in openapi.json maps to a real PREMIUM_CATALOG row', () => {
    const catalogRegexes = PREMIUM_CATALOG.map((e) => catalogPathToRegex(e.path));
    const premiumPaths = jsonPaths.filter((p) => p.startsWith('/api/premium/'));
    // Guard against a future spec that drops all premium paths and makes this
    // test pass vacuously.
    expect(premiumPaths.length).toBeGreaterThan(0);

    const orphaned = premiumPaths.filter((p) => !catalogRegexes.some((re) => re.test(p)));
    expect(
      orphaned,
      `These openapi.json premium paths have no matching row in ` +
        `PREMIUM_CATALOG (worker/src/premium-catalog.ts). Either the spec ` +
        `advertises an endpoint the catalog no longer sells, or the catalog ` +
        `path drifted. Reconcile them:\n  ${orphaned.join('\n  ')}`,
    ).toEqual([]);
  });

  it('q is optional on /api/premium/news/search (query param and requestBody)', () => {
    const op = spec.paths['/api/premium/news/search']?.get;
    expect(op, '/api/premium/news/search GET operation is missing from openapi.json').toBeTruthy();

    // The catalog marks q optional; the spec must agree.
    const catalogRow = PREMIUM_CATALOG.find((e) => e.path === '/api/premium/news/search');
    expect(catalogRow, 'news/search row missing from PREMIUM_CATALOG').toBeTruthy();
    const catalogQ = catalogRow?.params.find((p) => p.name === 'q');
    expect(catalogQ?.required, 'catalog should mark news/search q optional').not.toBe(true);

    // The q query parameter must not be declared required.
    const qParam = (op?.parameters ?? []).find((p) => p.name === 'q' && p.in === 'query');
    expect(qParam, 'q query parameter missing from news/search spec').toBeTruthy();
    expect(qParam?.required).not.toBe(true);

    // q must not be listed in requestBody.required for any content type.
    const content = op?.requestBody?.content ?? {};
    const bodyRequiredLists = Object.values(content).map((c) => c.schema?.required ?? []);
    for (const required of bodyRequiredLists) {
      expect(required, 'q must not be a required requestBody field').not.toContain('q');
    }
  });
});
