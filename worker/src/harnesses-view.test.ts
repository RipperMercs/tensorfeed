import { describe, it, expect } from 'vitest';
import { buildHarnessesView, buildNameToSlug } from './harnesses-view';
import type { HarnessesData } from './harnesses';
import type { HarnessSnapshot } from './terminalfeed-harnesses-fetcher';

const STATIC: HarnessesData = {
  lastUpdated: '2026-04-30',
  note: 'static note',
  benchmarks: [
    { id: 'swe_bench_verified', name: 'SWE-bench Verified', description: '', maxScore: 100, unit: '%', sourceUrl: 'https://www.swebench.com/' },
    { id: 'terminal_bench', name: 'Terminal-Bench', description: '', maxScore: 100, unit: '%', sourceUrl: 'https://www.tbench.ai/' },
    { id: 'aider_polyglot', name: 'Aider Polyglot', description: '', maxScore: 100, unit: '%', sourceUrl: 'https://aider.chat/docs/leaderboards/' },
    { id: 'swe_lancer', name: 'SWE-Lancer', description: '', maxScore: 100, unit: '%', sourceUrl: 'https://github.com/openai/SWELancer-Benchmark' },
  ],
  harnesses: [
    { id: 'claude-code', name: 'Claude Code', vendor: 'Anthropic', type: 'cli', openSource: false, url: '', modelLockIn: '', summary: '' },
    { id: 'cursor-agent', name: 'Cursor Agent', vendor: 'Anysphere (Cursor)', type: 'ide', openSource: false, url: '', modelLockIn: '', summary: '' },
    { id: 'amp', name: 'Amp', vendor: 'Sourcegraph', type: 'ide', openSource: false, url: '', modelLockIn: '', summary: '' },
  ],
  results: [
    { harness: 'claude-code', model: 'Claude Opus 4.7', scores: { swe_bench_verified: 74.5, terminal_bench: 52.3, aider_polyglot: 84.2, swe_lancer: 41.8 } },
    { harness: 'amp', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 70.8, terminal_bench: null, aider_polyglot: null, swe_lancer: null } },
  ],
};

function snap(): HarnessSnapshot {
  return {
    capturedAt: '2026-06-01T05:25:38.000Z',
    source: 'terminalfeed.io',
    upstream_generated_at: '2026-06-01',
    upstream_schema_version: '1',
    source_license: 'Federation cross-call to TerminalFeed (free public endpoint). Underlying benchmark scores carry per-result source_url for verification.',
    benchmark_count: 2,
    total_results: 4,
    benchmarks: [
      {
        id: 'swe_bench_verified',
        results: [
          { id: 'claude-code:opus-4.8', harness: 'Claude Code', model: 'Claude Opus 4.8 Thinking', score: 79.4, reported_at: '2026-05-28', source_url: 'https://www.swebench.com/' },
          { id: 'cursor:gpt-5.4', harness: 'Cursor', model: 'GPT-5.4 High', score: 66.9, reported_at: '2026-04-18', source_url: 'https://www.swebench.com/' },
          { id: 'swe-agent:opus-4.7', harness: 'SWE-Agent', model: 'Claude Opus 4.7 Thinking', score: 64.2, reported_at: '2026-04-08', source_url: 'https://www.swebench.com/' },
        ],
      },
      {
        id: 'metr_hcast',
        results: [
          { id: 'claude-code:opus-4.8', harness: 'Claude Code', model: 'Claude Opus 4.8 Thinking', score: 220, reported_at: '2026-05-28', source_url: 'https://metr.org/' },
        ],
      },
    ],
  };
}

describe('buildNameToSlug', () => {
  it('maps def names and the Cursor alias to TF slugs', () => {
    const m = buildNameToSlug(STATIC);
    expect(m['claude code']).toBe('claude-code');
    expect(m['cursor agent']).toBe('cursor-agent');
    expect(m['cursor']).toBe('cursor-agent'); // alias: federation says "Cursor"
    expect(m['amp']).toBe('amp');
  });
});

describe('buildHarnessesView', () => {
  it('sets lastUpdated to the federation board date', () => {
    expect(buildHarnessesView(snap(), STATIC).lastUpdated).toBe('2026-06-01');
  });

  it('keeps TF benchmark columns and harness defs unchanged', () => {
    const v = buildHarnessesView(snap(), STATIC);
    expect(v.benchmarks).toBe(STATIC.benchmarks);
    expect(v.harnesses).toBe(STATIC.harnesses);
  });

  it('serves a covered harness from the federation snapshot (fresh model + score)', () => {
    const v = buildHarnessesView(snap(), STATIC);
    const cc = v.results.filter((r) => r.harness === 'claude-code');
    expect(cc).toHaveLength(1);
    expect(cc[0].model).toBe('Claude Opus 4.8 Thinking');
    expect(cc[0].scores.swe_bench_verified).toBe(79.4);
  });

  it('replaces, not merges: the static claude-code Opus 4.7 row is gone', () => {
    const v = buildHarnessesView(snap(), STATIC);
    expect(v.results.find((r) => r.harness === 'claude-code' && r.model === 'Claude Opus 4.7')).toBeUndefined();
  });

  it('leaves swe_lancer null on federation rows and never adds metr_hcast', () => {
    const v = buildHarnessesView(snap(), STATIC);
    const cc = v.results.find((r) => r.harness === 'claude-code')!;
    expect(cc.scores.swe_lancer).toBeNull();
    expect('metr_hcast' in cc.scores).toBe(false);
  });

  it('maps the Cursor alias to cursor-agent', () => {
    const v = buildHarnessesView(snap(), STATIC);
    const cur = v.results.filter((r) => r.harness === 'cursor-agent');
    expect(cur).toHaveLength(1);
    expect(cur[0].scores.swe_bench_verified).toBe(66.9);
  });

  it('drops federation harnesses with no TF def (SWE-Agent)', () => {
    const v = buildHarnessesView(snap(), STATIC);
    expect(v.results.some((r) => r.harness === 'swe-agent' || r.model === 'Claude Opus 4.7 Thinking')).toBe(false);
  });

  it('keeps static rows for harnesses the board does not cover (Amp)', () => {
    const v = buildHarnessesView(snap(), STATIC);
    const amp = v.results.find((r) => r.harness === 'amp');
    expect(amp).toBeDefined();
    expect(amp!.model).toBe('Claude Sonnet 4.6');
    expect(amp!.scores.swe_bench_verified).toBe(70.8);
  });
});
