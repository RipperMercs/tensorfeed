/**
 * SDK README method-existence guard.
 *
 * The published SDK READMEs (npm + PyPI) documented `tf.forecast()` and
 * `tf.history_compare()` / `tf.historyCompare()` methods that were never
 * implemented, so an agent copying them hit a runtime error (fixed + removed in
 * Wave 2, tensorfeed 2.2.1 / 2.3.1). This guard asserts every `tf.X(...)`
 * referenced in each README corresponds to a real method in the SDK source, so a
 * phantom method can no longer be documented into a published package.
 *
 * Text-based on purpose: it lives in the worker vitest suite (which runs in CI),
 * because the SDK test suites are not run by any CI workflow.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

function readRepoFile(...segments: string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), 'utf8');
}

// Every `tf.method(` reference in the README (calls only; property access
// without a call is ignored).
function referencedMethods(readme: string): string[] {
  return [...new Set([...readme.matchAll(/\btf\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]))];
}

describe('SDK READMEs document only real methods', () => {
  it('Python: every tf.X() in the README exists as a client.py method', () => {
    const readme = readRepoFile('sdk', 'python', 'README.md');
    const src = readRepoFile('sdk', 'python', 'tensorfeed', 'client.py');
    const defined = new Set([...src.matchAll(/\n\s+def ([a-z_][a-z0-9_]*)\s*\(/g)].map((m) => m[1]));
    const phantom = referencedMethods(readme).filter((name) => !defined.has(name));
    expect(
      phantom,
      `Python README documents tf methods with no def in client.py (phantom):\n  ${phantom.join('\n  ')}`,
    ).toEqual([]);
  });

  it('JS: every tf.X() in the README exists as a method in src/index.ts', () => {
    const readme = readRepoFile('sdk', 'javascript', 'README.md');
    const src = readRepoFile('sdk', 'javascript', 'src', 'index.ts');
    const defined = new Set(
      [...src.matchAll(/\n {2}(?:async )?([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]),
    );
    const phantom = referencedMethods(readme).filter((name) => !defined.has(name));
    expect(
      phantom,
      `JS README documents tf methods with no method in src/index.ts (phantom):\n  ${phantom.join('\n  ')}`,
    ).toEqual([]);
  });
});
