/**
 * Harness directory: drives /harnesses/[slug] detail pages.
 *
 * Each entry maps a harness id (matching ids in data/harnesses.json) to
 * editorial metadata that cannot be derived from raw scores: prose
 * description, distribution surface, model lock-in, MCP support, pricing
 * model, and the upstream URL where the vendor publishes scores.
 */

export interface HarnessPageMeta {
  slug: string;
  displayName: string;
  vendor: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
  distribution: string;
  modelStory: string;
  pricing: string;
  whoItsFor: string;
  notableFeatures: string[];
  url: string;
}

export const HARNESS_DIRECTORY: HarnessPageMeta[] = [
  {
    slug: 'claude-code',
    displayName: 'Claude Code',
    vendor: 'Anthropic',
    seoTitle: 'Claude Code Benchmarks: SWE-bench, Terminal-Bench Results',
    seoDescription:
      'How Claude Code scores on SWE-bench Verified, Terminal-Bench, and Aider Polyglot, plus the harness features (MCP, hooks, subagents) and how it compares to Cursor, Codex CLI, and Aider.',
    description:
      'Anthropic\'s official terminal agent for Claude. Ships as a CLI installable from npm, with first-class support for MCP servers, custom hooks, slash commands, subagent orchestration, and a project-level CLAUDE.md memory file. The harness benefits from being co-designed with Claude\'s agentic post-training, which is the main reason it tops most agentic-coding leaderboards when paired with Opus 4.7 or Sonnet 4.6.',
    distribution: 'CLI installable via npm. Also available as a VS Code and JetBrains extension, plus a desktop app.',
    modelStory: 'Anthropic models only. Routes Opus 4.7 by default, with Sonnet 4.6 and Haiku 4.5 selectable. No bring-your-own-key for non-Anthropic models.',
    pricing: 'Subscription tied to Anthropic API credits or a flat-rate Pro/Max plan. No per-tool fees.',
    whoItsFor: 'Engineers running long, autonomous coding sessions in a terminal where MCP integrations and project-aware memory pay off.',
    notableFeatures: [
      'Native MCP server orchestration (single config, hot reload)',
      'CLAUDE.md per-project and ~/.claude/CLAUDE.md global memory',
      'Hooks: pre-tool, post-tool, on-stop',
      'Subagent delegation with isolated worktrees',
      'Plan mode with approval gating',
    ],
    url: 'https://www.anthropic.com/claude-code',
  },
  {
    slug: 'cursor-agent',
    displayName: 'Cursor Agent',
    vendor: 'Anysphere (Cursor)',
    seoTitle: 'Cursor Agent Benchmarks: SWE-bench Score, Composer Results',
    seoDescription:
      'How Cursor Agent and Composer score on SWE-bench Verified and Terminal-Bench across Sonnet 4.6 and GPT-5.5, plus how the harness compares to Claude Code, Codex CLI, and Windsurf.',
    description:
      'Cursor is a VS Code fork built around an in-IDE agent (Cursor Agent and the Composer multi-file editor) plus a hosted Background Agent that runs longer tasks asynchronously. Cursor has the largest paid install base of any AI IDE, which gives it real signal on prompt patterns and tool use that smaller harnesses do not have.',
    distribution: 'Standalone IDE (VS Code fork) for macOS, Windows, and Linux.',
    modelStory: 'Multi-model with bring-your-own-key. Default routes through Cursor\'s own infra; users can pick Sonnet 4.6, GPT-5.5, Opus 4.7, Gemini 2.5, or smaller open models per task.',
    pricing: 'Per-seat subscription with included usage credits; overage billed per request.',
    whoItsFor: 'Teams that want a polished IDE-native agent and are willing to trade open-source flexibility for tighter UX and a hosted background agent.',
    notableFeatures: [
      'Composer for multi-file edits',
      'Background Agent for async long-running tasks',
      'In-line diff review across the workspace',
      'Per-task model routing',
      'Repo-aware embedding index',
    ],
    url: 'https://cursor.com',
  },
  {
    slug: 'codex-cli',
    displayName: 'Codex CLI',
    vendor: 'OpenAI',
    seoTitle: 'Codex CLI Benchmarks: GPT-5.5 SWE-bench Verified Results',
    seoDescription:
      'How OpenAI\'s open-source Codex CLI scores on SWE-bench Verified, Terminal-Bench, and Aider Polyglot, the harness architecture, and how it stacks up against Claude Code and Aider.',
    description:
      'OpenAI\'s open-source terminal agent for the GPT-5.5 and o-series models. Released in 2025 as the company\'s answer to Claude Code, with a similar tool-use loop, sandboxed code execution, and a plug-in model that aligns with the OpenAI Apps SDK. The MIT-licensed source on GitHub is the reference for how OpenAI thinks about agentic coding harnesses.',
    distribution: 'Open-source CLI. Install via npm or build from source. MIT license.',
    modelStory: 'OpenAI models only. Defaults to GPT-5.5; o3 and o4-mini selectable for cheaper or higher-reasoning routing.',
    pricing: 'Free harness; you pay for the underlying OpenAI API tokens.',
    whoItsFor: 'Engineers who want a terminal agent on the OpenAI stack and prefer a transparent, MIT-licensed implementation they can fork and extend.',
    notableFeatures: [
      'Sandboxed shell and code execution',
      'OpenAI Apps SDK plug-ins',
      'Open MIT license',
      'Auto-approve mode for unattended runs',
      'Native streaming tool-call UI',
    ],
    url: 'https://github.com/openai/codex',
  },
  {
    slug: 'aider',
    displayName: 'Aider',
    vendor: 'Paul Gauthier',
    seoTitle: 'Aider Benchmarks: Polyglot Leaderboard, SWE-bench Results',
    seoDescription:
      'Aider Polyglot leaderboard scores across Claude Opus 4.7, GPT-5.5, and DeepSeek V4 Pro. How the open-source CLI agent compares to Claude Code, Codex CLI, and OpenHands.',
    description:
      'Aider is one of the original edit-by-diff coding agents and the harness behind the widely cited Aider Polyglot leaderboard. It runs locally, supports any model with an OpenAI-compatible API, and is famous for shipping working diff edits rather than full file rewrites, which makes it cheap to run on long sessions.',
    distribution: 'Open-source Python CLI. Install via pip. Apache 2.0 license.',
    modelStory: 'Multi-model. Anthropic, OpenAI, Google, DeepSeek, and any OpenAI-compatible endpoint. Bring your own key.',
    pricing: 'Free harness; you pay for the underlying API tokens.',
    whoItsFor: 'Engineers who want a local-first, model-agnostic terminal agent and care about token efficiency on long edits.',
    notableFeatures: [
      'Edit-by-diff over whole-file rewrites',
      'Self-published Polyglot leaderboard (225 hardest Exercism tasks)',
      'Git-aware: every edit is a commit',
      'Voice mode',
      'Architect / Editor split-model routing',
    ],
    url: 'https://aider.chat',
  },
  {
    slug: 'openhands',
    displayName: 'OpenHands',
    vendor: 'All Hands AI',
    seoTitle: 'OpenHands Benchmarks: SWE-bench Verified Open-Source Agent',
    seoDescription:
      'How OpenHands (formerly OpenDevin) scores on SWE-bench Verified and SWE-Lancer across Claude Sonnet 4.6 and GPT-5.5. Open-source autonomous software engineer comparison.',
    description:
      'OpenHands started as the open-source OpenDevin project and now ships as the reference implementation behind several top SWE-bench Verified entries. Architecturally it is a sandboxed runtime plus a small set of agent processes (CodeAct, Browser, Planner) that share a workspace. Most agentic-coding research papers in 2025-2026 use OpenHands as their substrate.',
    distribution: 'Open-source. Run as a Docker container locally or on a hosted runtime. MIT license.',
    modelStory: 'Multi-model. Most entries use Claude Sonnet 4.6 or GPT-5.5; the harness has no preferred model.',
    pricing: 'Free harness; you pay for the underlying API tokens and any compute you host.',
    whoItsFor: 'Researchers and teams building on top of an open agentic substrate, plus anyone who wants the same harness public benchmarks are run on.',
    notableFeatures: [
      'CodeAct: agent expresses actions as Python code',
      'Built-in browser tool for web tasks',
      'Sandboxed Docker runtime per session',
      'Microservice-style agent architecture (swap planners freely)',
      'Reference implementation for SWE-bench paper submissions',
    ],
    url: 'https://github.com/All-Hands-AI/OpenHands',
  },
  {
    slug: 'devin',
    displayName: 'Devin',
    vendor: 'Cognition Labs',
    seoTitle: 'Devin Benchmarks: SWE-bench Verified, SWE-Lancer Results',
    seoDescription:
      'How Cognition\'s hosted Devin agent scores on SWE-bench Verified and SWE-Lancer. Harness architecture, persistent VMs, and how it compares to OpenHands and Claude Code.',
    description:
      'Cognition\'s Devin is a hosted autonomous SWE agent. Each session runs in its own persistent VM with a workspace, browser, and shell, plus Slack and IDE integrations so the agent can be assigned tasks like a human engineer. Cognition also publishes DeepWiki, a separate retrieval system over indexed repos that Devin uses to ground long-horizon work.',
    distribution: 'Hosted SaaS. Web app, Slack, GitHub, and Linear integrations. No self-host option.',
    modelStory: 'Proprietary model mix. Cognition does not disclose which model serves which step but has stated Sonnet 4.6 is in the rotation alongside an in-house planner.',
    pricing: 'Per-seat subscription with usage limits; team and enterprise plans available.',
    whoItsFor: 'Teams that want an agent assignable through ticketing systems and willing to trade open-source transparency for managed infrastructure.',
    notableFeatures: [
      'Persistent VM workspaces per task',
      'DeepWiki repo retrieval system',
      'Slack and Linear assignment surfaces',
      'Async task queues',
      'Code review and PR-author workflow',
    ],
    url: 'https://devin.ai',
  },
  {
    slug: 'cline',
    displayName: 'Cline',
    vendor: 'Cline Bot',
    seoTitle: 'Cline Benchmarks: Open-Source VS Code Agent Results',
    seoDescription:
      'How Cline, the open-source VS Code agent, scores on SWE-bench Verified across Claude Sonnet 4.6 and other models. Plan-and-act loop, MCP support, and BYOK pricing.',
    description:
      'Cline is the most-installed open-source coding agent for VS Code. Its plan-and-act loop asks for explicit human approval on each tool use by default, which makes it slower than fully autonomous harnesses but easier to trust. Bring-your-own-key means the baseline cost of running Cline is whatever your model provider charges.',
    distribution: 'Open-source VS Code extension. Apache 2.0 license. Available on the marketplace.',
    modelStory: 'Multi-model. Claude, GPT, Gemini, DeepSeek, and any OpenAI-compatible endpoint. Bring your own key.',
    pricing: 'Free harness; you pay for the underlying API tokens directly to your model provider.',
    whoItsFor: 'Developers who want a transparent, free-to-install agent in VS Code with manual approval for every tool call.',
    notableFeatures: [
      'Plan and Act modes with explicit approval',
      'MCP server support',
      'Auto-approve list for trusted tools',
      'Browser automation',
      'Bring-your-own-key (no Cline-side billing)',
    ],
    url: 'https://cline.bot',
  },
  {
    slug: 'windsurf-cascade',
    displayName: 'Windsurf Cascade',
    vendor: 'Codeium',
    seoTitle: 'Windsurf Cascade Benchmarks: SWE-1, GPT-5.5 Results',
    seoDescription:
      'How Codeium\'s Windsurf IDE scores on SWE-bench Verified and Terminal-Bench across GPT-5.5 and the in-house SWE-1 model. Cascade agentic loop and harness comparison.',
    description:
      'Windsurf is Codeium\'s standalone IDE, with Cascade as its multi-step agent loop. Codeium also trains an in-house SWE-1 model family that the IDE can route to as a cheaper alternative to frontier APIs, which is unusual among IDE harnesses and a real differentiator on price.',
    distribution: 'Standalone IDE for macOS, Windows, and Linux.',
    modelStory: 'Multi-model. Claude, GPT, Gemini, plus Codeium\'s own SWE-1 family. Per-task routing.',
    pricing: 'Per-seat subscription with included credits.',
    whoItsFor: 'Teams that want a Cursor-style IDE but with a hosted in-house model option for cost-sensitive workloads.',
    notableFeatures: [
      'Cascade multi-step planning loop',
      'In-house SWE-1 model family',
      'Flow-state UX (live agent edits beside you)',
      'Per-task routing between frontier and house models',
      'Indexed repo retrieval',
    ],
    url: 'https://codeium.com/windsurf',
  },
  {
    slug: 'amp',
    displayName: 'Amp',
    vendor: 'Sourcegraph',
    seoTitle: 'Amp Benchmarks: Sourcegraph Sonnet 4.6 SWE-bench Results',
    seoDescription:
      'How Sourcegraph\'s Amp scores on SWE-bench Verified with Claude Sonnet 4.6 default. Code-graph retrieval, IDE integration, and how Amp compares to Cursor and Cline.',
    description:
      'Amp is Sourcegraph\'s VS Code and JetBrains agent, anchored on Claude Sonnet 4.6 by default and layered on top of Sourcegraph\'s code-graph retrieval. The retrieval layer is the differentiator: instead of re-embedding files, Amp queries a precomputed graph of definitions, references, and call edges across the repo, which scales to large codebases that drown smaller embedding indexes.',
    distribution: 'VS Code and JetBrains extensions. Sourcegraph account required.',
    modelStory: 'Sonnet 4.6 default. Other Anthropic models selectable.',
    pricing: 'Per-seat subscription tied to a Sourcegraph plan.',
    whoItsFor: 'Engineering teams already on Sourcegraph who want an agent that scales retrieval to monorepo-sized codebases.',
    notableFeatures: [
      'Code-graph retrieval over the repo',
      'Strong on monorepo-scale workloads',
      'Sonnet 4.6 anchored',
      'IDE-native UX in VS Code and JetBrains',
      'Tight integration with existing Sourcegraph indexes',
    ],
    url: 'https://ampcode.com',
  },
  {
    slug: 'continue',
    displayName: 'Continue',
    vendor: 'Continue.dev',
    seoTitle: 'Continue Benchmarks: Open-Source IDE Agent SWE-bench',
    seoDescription:
      'How Continue, the open-source IDE agent for VS Code and JetBrains, scores on SWE-bench Verified. BYOK model routing, custom commands, and local-first model story.',
    description:
      'Continue is an open-source VS Code and JetBrains agent with a strong local-first story (Ollama, LM Studio, llama.cpp first-class) and a configurable per-task model router. It started as a code assistant and is layering agentic features on top, so the SWE-bench numbers trail the agent-native harnesses but the customization surface is broader than most.',
    distribution: 'Open-source extensions for VS Code and JetBrains. Apache 2.0 license.',
    modelStory: 'Multi-model with bring-your-own-key. First-class local model support via Ollama and LM Studio.',
    pricing: 'Free harness; you pay for whatever model provider you point it at.',
    whoItsFor: 'Engineers who want a customizable, mostly-assistant-shaped agent with strong support for local models.',
    notableFeatures: [
      'First-class local model support (Ollama, LM Studio, llama.cpp)',
      'Per-task model routing config',
      'Custom slash commands',
      'Open-source under Apache 2.0',
      'VS Code and JetBrains parity',
    ],
    url: 'https://continue.dev',
  },
  {
    slug: 'roo-code',
    displayName: 'Roo Code',
    vendor: 'Roo Veterinary Inc.',
    seoTitle: 'Roo Code Benchmarks: Cline Fork SWE-bench Results',
    seoDescription:
      'How Roo Code, the open-source VS Code agent forked from Cline, scores on SWE-bench Verified. Specialized modes (Code, Architect, Ask, Debug) and MCP support.',
    description:
      'Roo Code is an open-source fork of Cline that diverged on agent-loop iteration speed. It ships multiple specialized modes (Code, Architect, Ask, Debug) so the same harness can be steered toward planning vs. shipping vs. exploration, and it tracks Cline\'s MCP support. The community fork model means Roo often picks up features faster than upstream.',
    distribution: 'Open-source VS Code extension. Apache 2.0 license.',
    modelStory: 'Multi-model with bring-your-own-key. Same provider matrix as Cline.',
    pricing: 'Free harness; you pay for the underlying API tokens.',
    whoItsFor: 'Cline users who want faster iteration on the agent loop and explicit mode-switching for different kinds of work.',
    notableFeatures: [
      'Code, Architect, Ask, and Debug modes',
      'MCP server support',
      'Fork of Cline with faster agent-loop iteration',
      'Custom mode definitions',
      'Bring-your-own-key',
    ],
    url: 'https://roocode.com',
  },
];

export function getAllHarnessSlugs(): string[] {
  return HARNESS_DIRECTORY.map(h => h.slug);
}

export function getHarnessBySlug(slug: string): HarnessPageMeta | null {
  return HARNESS_DIRECTORY.find(h => h.slug === slug) ?? null;
}
