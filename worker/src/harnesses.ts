/**
 * AI coding harness leaderboard data.
 *
 * Editorial snapshot of public agentic-coding leaderboard scores. Each
 * `results` entry is the harness vendor's best published score for the
 * named base model on the named benchmark. Refreshed by editor on each
 * redeploy; not driven by a cron source the way pricing/benchmarks are,
 * because every harness vendor publishes on a different cadence and
 * format.
 *
 * Shape mirrors data/harnesses.json so the static page and the API
 * return the same payload. Served at /api/harnesses (free, cached 300s).
 */

export interface HarnessBenchmarkDef {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  unit: string;
  sourceUrl: string;
}

export interface HarnessDef {
  id: string;
  name: string;
  vendor: string;
  type: 'cli' | 'ide' | 'agent-platform';
  openSource: boolean;
  url: string;
  modelLockIn: string;
  summary: string;
}

export interface HarnessResult {
  harness: string;
  model: string;
  scores: Record<string, number | null>;
}

export interface HarnessesData {
  lastUpdated: string;
  note: string;
  benchmarks: HarnessBenchmarkDef[];
  harnesses: HarnessDef[];
  results: HarnessResult[];
}

export const HARNESSES_DATA: HarnessesData = {
  lastUpdated: '2026-04-30',
  note: "Snapshot of public agentic-coding leaderboard data. Each result is the harness vendor's self-reported best published score for the named base model on the named benchmark. We aggregate; we do not re-run. See sourceUrl on each entry for the upstream report. Refreshed weekly.",
  benchmarks: [
    {
      id: 'swe_bench_verified',
      name: 'SWE-bench Verified',
      description:
        '500 human-validated GitHub issues across 12 Python repos. The harness must produce a patch that resolves the issue and passes the project\'s test suite.',
      maxScore: 100,
      unit: '% resolved',
      sourceUrl: 'https://www.swebench.com/',
    },
    {
      id: 'terminal_bench',
      name: 'Terminal-Bench',
      description:
        'Stanford and Anthropic benchmark of agentic terminal tasks. Each task gives the agent a goal and a sandboxed shell; success is measured by a deterministic post-condition.',
      maxScore: 100,
      unit: '% solved',
      sourceUrl: 'https://www.tbench.ai/',
    },
    {
      id: 'aider_polyglot',
      name: 'Aider Polyglot',
      description:
        '225 of the hardest Exercism coding exercises across C++, Go, Java, JavaScript, Python, and Rust. Measures whole-file edit-by-diff quality, not just code generation.',
      maxScore: 100,
      unit: '% pass2',
      sourceUrl: 'https://aider.chat/docs/leaderboards/',
    },
    {
      id: 'swe_lancer',
      name: 'SWE-Lancer',
      description:
        'OpenAI benchmark of paid Upwork engineering tasks ($1M+ in real bounties). Includes both diff-style fixes and longer feature work judged against the original buyer\'s acceptance criteria.',
      maxScore: 100,
      unit: '% earned',
      sourceUrl: 'https://github.com/openai/SWELancer-Benchmark',
    },
  ],
  harnesses: [
    { id: 'claude-code', name: 'Claude Code', vendor: 'Anthropic', type: 'cli', openSource: false, url: 'https://www.anthropic.com/claude-code', modelLockIn: 'Anthropic models only', summary: 'Anthropic\'s official terminal agent. Native MCP, hooks, slash commands, subagent orchestration, and CLAUDE.md project memory.' },
    { id: 'cursor-agent', name: 'Cursor Agent', vendor: 'Anysphere (Cursor)', type: 'ide', openSource: false, url: 'https://cursor.com', modelLockIn: 'Multi-model, BYOK', summary: 'VS Code fork with a multi-file agent (Composer) and a hosted background agent. Largest paid install base of any AI IDE.' },
    { id: 'codex-cli', name: 'Codex CLI', vendor: 'OpenAI', type: 'cli', openSource: true, url: 'https://github.com/openai/codex', modelLockIn: 'OpenAI models only', summary: 'OpenAI\'s open-source terminal agent. Sandboxed code execution, OpenAI Apps SDK plug-ins, MIT license.' },
    { id: 'aider', name: 'Aider', vendor: 'Paul Gauthier', type: 'cli', openSource: true, url: 'https://aider.chat', modelLockIn: 'Multi-model, BYOK', summary: 'Open-source CLI. Edit-by-diff over whole-file rewrites; runs on any OpenAI-compatible model. Maintains the Polyglot leaderboard.' },
    { id: 'openhands', name: 'OpenHands', vendor: 'All Hands AI', type: 'agent-platform', openSource: true, url: 'https://github.com/All-Hands-AI/OpenHands', modelLockIn: 'Multi-model', summary: 'Formerly OpenDevin. Open-source autonomous SWE agent with sandboxed runtime, browser tool, and microservice agent architecture.' },
    { id: 'devin', name: 'Devin', vendor: 'Cognition Labs', type: 'agent-platform', openSource: false, url: 'https://devin.ai', modelLockIn: 'Proprietary mix', summary: 'Hosted autonomous SWE agent with persistent VM workspaces, Slack and IDE integrations, and DeepWiki repo retrieval.' },
    { id: 'cline', name: 'Cline', vendor: 'Cline Bot', type: 'ide', openSource: true, url: 'https://cline.bot', modelLockIn: 'Multi-model, BYOK', summary: 'Most-installed open-source VS Code agent. Plan-and-act loop with explicit human approval, MCP support, BYOK pricing.' },
    { id: 'windsurf-cascade', name: 'Windsurf Cascade', vendor: 'Codeium', type: 'ide', openSource: false, url: 'https://codeium.com/windsurf', modelLockIn: 'Multi-model, in-house option', summary: 'Standalone IDE with Cascade multi-step agent loop. Backed by either frontier APIs or Codeium\'s own SWE-1 model family.' },
    { id: 'amp', name: 'Amp', vendor: 'Sourcegraph', type: 'ide', openSource: false, url: 'https://ampcode.com', modelLockIn: 'Sonnet 4.6 default', summary: 'Sourcegraph\'s VS Code and JetBrains agent. Anchored on Sonnet 4.6, layered on a code-graph retrieval system that scales to monorepos.' },
    { id: 'continue', name: 'Continue', vendor: 'Continue.dev', type: 'ide', openSource: true, url: 'https://continue.dev', modelLockIn: 'Multi-model, BYOK', summary: 'Open-source VS Code and JetBrains agent. First-class local model support (Ollama, LM Studio), per-task model routing.' },
    { id: 'roo-code', name: 'Roo Code', vendor: 'Roo Veterinary Inc.', type: 'ide', openSource: true, url: 'https://roocode.com', modelLockIn: 'Multi-model, BYOK', summary: 'Open-source VS Code agent forked from Cline. Specialized modes (Code, Architect, Ask, Debug), MCP support.' },
  ],
  results: [
    { harness: 'claude-code', model: 'Claude Opus 4.7', scores: { swe_bench_verified: 74.5, terminal_bench: 52.3, aider_polyglot: 84.2, swe_lancer: 41.8 } },
    { harness: 'claude-code', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 70.6, terminal_bench: 47.1, aider_polyglot: 78.4, swe_lancer: 36.2 } },
    { harness: 'cursor-agent', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 68.4, terminal_bench: 42.0, aider_polyglot: null, swe_lancer: null } },
    { harness: 'cursor-agent', model: 'GPT-5.5', scores: { swe_bench_verified: 70.1, terminal_bench: 41.5, aider_polyglot: null, swe_lancer: null } },
    { harness: 'codex-cli', model: 'GPT-5.5', scores: { swe_bench_verified: 72.8, terminal_bench: 48.2, aider_polyglot: 82.1, swe_lancer: 39.6 } },
    { harness: 'codex-cli', model: 'OpenAI o3', scores: { swe_bench_verified: 69.1, terminal_bench: 40.4, aider_polyglot: 76.9, swe_lancer: null } },
    { harness: 'aider', model: 'Claude Opus 4.7', scores: { swe_bench_verified: null, terminal_bench: 31.2, aider_polyglot: 84.2, swe_lancer: null } },
    { harness: 'aider', model: 'GPT-5.5', scores: { swe_bench_verified: null, terminal_bench: 28.5, aider_polyglot: 81.8, swe_lancer: null } },
    { harness: 'aider', model: 'DeepSeek V4 Pro', scores: { swe_bench_verified: null, terminal_bench: 19.7, aider_polyglot: 73.4, swe_lancer: null } },
    { harness: 'openhands', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 65.8, terminal_bench: 30.1, aider_polyglot: null, swe_lancer: 28.4 } },
    { harness: 'openhands', model: 'GPT-5.5', scores: { swe_bench_verified: 64.2, terminal_bench: 29.6, aider_polyglot: null, swe_lancer: null } },
    { harness: 'devin', model: 'Proprietary (Sonnet 4.6 + planner)', scores: { swe_bench_verified: 61.7, terminal_bench: null, aider_polyglot: null, swe_lancer: 32.5 } },
    { harness: 'cline', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 63.4, terminal_bench: null, aider_polyglot: null, swe_lancer: null } },
    { harness: 'windsurf-cascade', model: 'GPT-5.5', scores: { swe_bench_verified: 64.1, terminal_bench: 37.8, aider_polyglot: null, swe_lancer: null } },
    { harness: 'windsurf-cascade', model: 'SWE-1 (Codeium)', scores: { swe_bench_verified: 58.2, terminal_bench: 30.4, aider_polyglot: null, swe_lancer: null } },
    { harness: 'amp', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 70.8, terminal_bench: null, aider_polyglot: null, swe_lancer: null } },
    { harness: 'continue', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 52.4, terminal_bench: null, aider_polyglot: null, swe_lancer: null } },
    { harness: 'roo-code', model: 'Claude Sonnet 4.6', scores: { swe_bench_verified: 57.3, terminal_bench: null, aider_polyglot: null, swe_lancer: null } },
  ],
};

/**
 * Per-harness rollup: best score on each benchmark across all base models
 * the harness was tested with. Useful for quick "which harness wins X" queries.
 */
export function harnessRollups() {
  return HARNESSES_DATA.harnesses.map(h => {
    const myResults = HARNESSES_DATA.results.filter(r => r.harness === h.id);
    const best: Record<string, { model: string; score: number } | null> = {};
    for (const b of HARNESSES_DATA.benchmarks) {
      const candidates = myResults
        .map(r => ({ model: r.model, score: r.scores[b.id] }))
        .filter((x): x is { model: string; score: number } => typeof x.score === 'number' && Number.isFinite(x.score));
      best[b.id] = candidates.sort((a, b2) => b2.score - a.score)[0] || null;
    }
    return { harness: h.id, name: h.name, vendor: h.vendor, type: h.type, openSource: h.openSource, best };
  });
}
