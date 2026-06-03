import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Enforces the project's strictest rule (CLAUDE.md): no em dash anywhere. It is
// an anti-AI-detection measure, so any em dash in shipped source or UI text is a
// real defect. The en dash and horizontal bar read the same way and are banned
// in the same spirit. The pre-commit hook only scans for secret patterns, and
// the per-skill greps only fire when that skill runs, so nothing else catches an
// em dash that lands through an ordinary edit. This scans the whole src tree.
//
// The forbidden set is built from code points so this test file holds no literal
// dash-family character and never flags itself.

const SRC = dirname(dirname(fileURLToPath(import.meta.url))); // src
const FORBIDDEN = [0x2013, 0x2014, 0x2015]; // en dash, em dash, horizontal bar
const RE = new RegExp('[' + FORBIDDEN.map(c => '\\u' + c.toString(16).padStart(4, '0')).join('') + ']');

// Hand-maintained public text files that LLMs and agents ingest directly. The
// generated llms-full.txt is excluded (it is regenerated each build from source
// that this rule already covers).
const REPO_ROOT = dirname(SRC); // src to repo root
const PUBLIC_TEXT_FILES = ['public/llms.txt'];

function collect(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collect(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
}

describe('no em dash in source (anti-AI-detection rule)', () => {
  it('has zero em dash, en dash, or horizontal bar in any src .ts/.tsx', () => {
    const files: string[] = [];
    collect(SRC, files);
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(RE);
        if (m) {
          const rel = file.slice(SRC.length + 1).replace(/\\/g, '/');
          const hex = m[0].charCodeAt(0).toString(16).toUpperCase();
          offenders.push(`${rel}:${i + 1} U+${hex}`);
        }
      }
    }
    expect(
      offenders,
      `dash-family chars found (use commas, periods, or parentheses instead): ${offenders.join(' | ')}`,
    ).toEqual([]);
  });

  it('has zero dash-family chars in the hand-maintained public text (llms.txt)', () => {
    const offenders: string[] = [];
    for (const rel of PUBLIC_TEXT_FILES) {
      const file = join(REPO_ROOT, rel);
      if (!existsSync(file)) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(RE);
        if (m) {
          const hex = m[0].charCodeAt(0).toString(16).toUpperCase();
          offenders.push(`${rel}:${i + 1} U+${hex}`);
        }
      }
    }
    expect(
      offenders,
      `dash-family chars in public text (use commas, periods, or parentheses instead): ${offenders.join(' | ')}`,
    ).toEqual([]);
  });
});
