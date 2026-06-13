/**
 * Hugging Face feed-count drift guard.
 *
 * The TensorFeed HF dataset publishes one JSONL file per feed per day, where the
 * feed set is the FEEDS list in scripts/push-to-huggingface.py (the single
 * source of truth). That count gets quoted across public surfaces (llms.txt, the
 * for-ai-agents page, the datasets page, the developers page). When feeds are
 * added and those numbers are not updated, agents and humans read a stale count,
 * which is exactly what happened (surfaces said 36 / 44 / 13 while FEEDS was 46).
 *
 * Part 1 pins the real FEEDS length. Part 2 asserts the retired literals are gone
 * from the present-tense surfaces. The whitepaper is intentionally excluded: it
 * is generated from a gitignored source and carries a dated point-in-time figure.
 *
 * If Part 1 fails after you add or remove a feed, update the cited counts in the
 * files below, then update EXPECTED_FEED_COUNT.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const EXPECTED_FEED_COUNT = 46;

function readRepoFile(...segments: string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), 'utf8');
}

describe('Hugging Face feed-count drift guard', () => {
  it('push-to-huggingface.py FEEDS has exactly the advertised number of feeds', () => {
    const src = readRepoFile('scripts', 'push-to-huggingface.py');
    // Each feed is a tuple line like:  ("news", "/api/news?limit=200", "articles"),
    const matches = src.match(/^\s*\(\s*"[a-z0-9-]+"\s*,\s*"\/api\//gm) || [];
    expect(
      matches.length,
      `scripts/push-to-huggingface.py FEEDS now has ${matches.length} feeds, not ` +
        `${EXPECTED_FEED_COUNT}. The HF dataset publishes one JSONL file per feed, so update ` +
        `the cited counts in public/llms.txt, src/app/for-ai-agents/page.tsx, ` +
        `src/app/datasets/page.tsx, src/app/developers/page.tsx (and the whitepaper source), ` +
        `then update EXPECTED_FEED_COUNT here.`,
    ).toBe(EXPECTED_FEED_COUNT);
  });

  it('no present-tense surface still quotes a retired feed count', () => {
    const STALE_LITERALS = ['36 JSONL', '36 daily JSONL', '44 feeds', '13 JSONL', '23 feeds'];
    const FILES: string[][] = [
      ['public', 'llms.txt'],
      ['src', 'app', 'for-ai-agents', 'page.tsx'],
      ['src', 'app', 'datasets', 'page.tsx'],
      ['src', 'app', 'developers', 'page.tsx'],
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
      `Stale HF feed-count literals remain. The dataset has ${EXPECTED_FEED_COUNT} feeds:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
