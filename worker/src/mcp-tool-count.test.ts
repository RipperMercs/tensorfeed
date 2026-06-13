/**
 * MCP tool-count drift guard.
 *
 * The number of tools the stdio MCP server (@tensorfeed/mcp-server) exposes is
 * a load-bearing fact: it gets quoted verbatim in the hosted HTTP transport
 * copy (worker/src/mcp-http.ts, worker/src/index.ts), in the OpenAPI spec
 * (public/openapi.json, public/openapi.yaml), in public/llms.txt, and across
 * the marketing surface (for-ai-agents, glossary/mcp, the use-cases pages).
 * When the tool set changes and those advertised counts do not, agents and
 * humans read a stale number. There is no single source the copy derives from,
 * so this suite pins the real count and the retired literals instead.
 *
 * Part 1 counts the actual tool registrations in mcp-server/src/index.ts.
 * Part 2 asserts the specific stale literals that used to ship there are gone
 * from every file that quoted them.
 *
 * If this fails after you add or remove an MCP tool, update the advertised
 * counts in lockstep (see the file list below), then update EXPECTED_TOOL_COUNT.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

// The stdio MCP server currently registers exactly this many tools. The hosted
// HTTP V1 transport (/api/mcp) serves a curated 32-tool subset; that is a
// different number and is not what this guard pins.
const EXPECTED_TOOL_COUNT = 24;

function readRepoFile(...segments: string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), 'utf8');
}

describe('MCP tool count and advertised-count drift guard', () => {
  it('mcp-server/src/index.ts registers exactly the advertised number of tools', () => {
    const src = readRepoFile('mcp-server', 'src', 'index.ts');
    // Count only real registrations: lines that START with "registerTool(",
    // anchored at column 0. The indented "// registerTool()" comment inside the
    // wrapper, and the "function registerTool<...>" definition, both have
    // leading characters before "registerTool(" and so do not match.
    const count = src.split('\n').filter((line) => line.startsWith('registerTool(')).length;
    expect(
      count,
      `mcp-server/src/index.ts now registers ${count} tools, not ${EXPECTED_TOOL_COUNT}. ` +
        `Changing the MCP tool set means the advertised counts are stale. Update them in ` +
        `worker/src/mcp-http.ts, worker/src/index.ts, src/app/for-ai-agents/page.tsx, ` +
        `src/app/glossary/mcp/page.tsx, src/app/use-cases/coding-agents/page.tsx, ` +
        `src/app/use-cases/agent-payments/page.tsx, public/openapi.json, public/openapi.yaml, ` +
        `and public/llms.txt, then update EXPECTED_TOOL_COUNT in this test.`,
    ).toBe(EXPECTED_TOOL_COUNT);
  });

  it('no surface still quotes a retired MCP tool-count literal', () => {
    // These literals shipped at one point and are all stale. None should appear
    // in any advertised-count surface anymore.
    const STALE_LITERALS = ['61 tool', '61-tool', '37 free', '42 tools'];
    const FILES: string[][] = [
      ['worker', 'src', 'mcp-http.ts'],
      ['worker', 'src', 'index.ts'],
      ['src', 'app', 'for-ai-agents', 'page.tsx'],
      ['src', 'app', 'glossary', 'mcp', 'page.tsx'],
      ['src', 'app', 'use-cases', 'coding-agents', 'page.tsx'],
      ['src', 'app', 'use-cases', 'agent-payments', 'page.tsx'],
      ['src', 'app', 'developers', 'agent-payments', 'page.tsx'],
      ['public', 'openapi.json'],
      ['public', 'openapi.yaml'],
      ['public', 'llms.txt'],
    ];
    const offenders: string[] = [];
    for (const segments of FILES) {
      const contents = readRepoFile(...segments);
      for (const literal of STALE_LITERALS) {
        if (contents.includes(literal)) {
          offenders.push(`${segments.join('/')} still contains "${literal}"`);
        }
      }
    }
    expect(
      offenders,
      `Stale MCP tool-count literals remain. Replace each with the current count ` +
        `(${EXPECTED_TOOL_COUNT} stdio tools, 32 hosted HTTP tools):\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
