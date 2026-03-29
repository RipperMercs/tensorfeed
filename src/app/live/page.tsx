'use client';

import { useState, useEffect } from 'react';
import { Radio, Zap } from 'lucide-react';
import { MOCK_STATUSES } from '@/lib/mock-data';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import { ServiceStatus, ServiceComponent } from '@/lib/types';
import pricingData from '@/../data/pricing.json';

// Metadata must be exported from a server component, so we set document title via useEffect-free approach
// For client components, metadata is handled by the layout or a head component.

const TABS = [
  'Agent Activity',
  'AI Status',
  'HN Feed',
  'GitHub Trending',
  'arXiv Papers',
  'API Pricing',
  'Model Tracker',
] as const;

type TabName = (typeof TABS)[number];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_HN_POSTS = [
  { id: 1, title: 'Claude Opus 4.6 achieves state-of-the-art on SWE-bench with 72% unassisted', points: 1483, comments: 612, timeAgo: '2 hours ago' },
  { id: 2, title: 'GPT-5 Turbo benchmarks show diminishing returns on reasoning tasks', points: 987, comments: 445, timeAgo: '3 hours ago' },
  { id: 3, title: 'Show HN: I built an open-source alternative to Cursor using local LLMs', points: 876, comments: 234, timeAgo: '4 hours ago' },
  { id: 4, title: 'The EU AI Act is now being enforced. Here is what it means for startups', points: 743, comments: 389, timeAgo: '5 hours ago' },
  { id: 5, title: 'Llama 4 Scout runs at 200 tokens/s on a single RTX 5090', points: 692, comments: 178, timeAgo: '6 hours ago' },
  { id: 6, title: 'Why we switched from RAG to long-context models and saved 60% on infra', points: 634, comments: 267, timeAgo: '7 hours ago' },
  { id: 7, title: 'DeepSeek-V4 open-weights release matches GPT-4o on MMLU-Pro', points: 589, comments: 198, timeAgo: '8 hours ago' },
  { id: 8, title: 'AI-generated code now accounts for 38% of new GitHub commits (study)', points: 521, comments: 456, timeAgo: '10 hours ago' },
  { id: 9, title: 'Anthropic publishes responsible scaling policy update for 2026', points: 478, comments: 312, timeAgo: '11 hours ago' },
  { id: 10, title: 'The bitter lesson, revisited: what 2025 taught us about scale vs. architecture', points: 445, comments: 201, timeAgo: '13 hours ago' },
];

const MOCK_GITHUB_REPOS = [
  { name: 'anthropics/claude-code', description: 'Official CLI for Claude. Agentic coding tool that lives in your terminal.', stars: 48200, language: 'TypeScript', langColor: 'bg-blue-400', growth: '+2,340 this week' },
  { name: 'vllm-project/vllm', description: 'High-throughput and memory-efficient inference engine for LLMs.', stars: 52100, language: 'Python', langColor: 'bg-yellow-400', growth: '+1,870 this week' },
  { name: 'deepseek-ai/DeepSeek-V4', description: 'Open-weight MoE model with 671B total parameters. Apache 2.0 licensed.', stars: 38900, language: 'Python', langColor: 'bg-yellow-400', growth: '+4,120 this week' },
  { name: 'huggingface/transformers', description: 'State-of-the-art ML for PyTorch, TensorFlow, and JAX.', stars: 148000, language: 'Python', langColor: 'bg-yellow-400', growth: '+890 this week' },
  { name: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications with composable components.', stars: 102000, language: 'Python', langColor: 'bg-yellow-400', growth: '+760 this week' },
  { name: 'meta-llama/llama-stack', description: 'Toolchain and APIs for building with Llama models.', stars: 21400, language: 'Python', langColor: 'bg-yellow-400', growth: '+1,530 this week' },
  { name: 'openai/codex-agent', description: 'Autonomous coding agent powered by Codex. Runs in sandboxed environments.', stars: 29800, language: 'TypeScript', langColor: 'bg-blue-400', growth: '+3,210 this week' },
  { name: 'mlc-ai/mlc-llm', description: 'Universal LLM deployment on any hardware. Supports WebGPU, Metal, CUDA, Vulkan.', stars: 24600, language: 'C++', langColor: 'bg-pink-400', growth: '+680 this week' },
];

const MOCK_ARXIV_PAPERS = [
  {
    id: '2603.18201',
    title: 'Scaling Mixture-of-Experts Beyond 1 Trillion Parameters with Adaptive Routing',
    authors: ['Wei, J.', 'Tay, Y.', 'Bommasani, R.'],
    abstract: 'We present a novel adaptive routing mechanism for sparse MoE models that enables stable training at scales exceeding one trillion parameters. Our approach reduces expert collapse by 74% compared to top-k routing while maintaining computational efficiency.',
    date: '2026-03-27',
    tags: ['cs.LG', 'cs.AI'],
  },
  {
    id: '2603.17845',
    title: 'Constitutional Steering: Aligning Language Models Through Natural Language Constraints',
    authors: ['Bai, Y.', 'Kadavath, S.', 'Askell, A.'],
    abstract: 'We introduce constitutional steering, a technique that allows users to specify behavioral constraints in natural language at inference time. Models trained with this approach show 89% adherence to user-specified constitutions without fine-tuning.',
    date: '2026-03-26',
    tags: ['cs.CL', 'cs.AI'],
  },
  {
    id: '2603.16932',
    title: 'Long-Context Retrieval Without Retrieval: When 10M Token Windows Replace RAG Pipelines',
    authors: ['Chen, M.', 'Borgeaud, S.', 'Wu, J.'],
    abstract: 'We systematically compare retrieval-augmented generation with native long-context models on knowledge-intensive tasks. At context windows exceeding 2M tokens, native context achieves 94% of RAG performance while eliminating pipeline complexity.',
    date: '2026-03-25',
    tags: ['cs.CL', 'cs.IR'],
  },
  {
    id: '2603.15678',
    title: 'Agentic Code Generation: A Survey of Autonomous Programming Systems',
    authors: ['Zhang, L.', 'Li, R.', 'Muennighoff, N.'],
    abstract: 'We survey 47 autonomous coding systems released between 2024 and 2026, categorizing them by architecture, tool use patterns, and evaluation methodology. We identify key design principles that correlate with performance on SWE-bench and real-world codebases.',
    date: '2026-03-24',
    tags: ['cs.SE', 'cs.AI', 'cs.CL'],
  },
  {
    id: '2603.14290',
    title: 'Reward Hacking in RLHF: Detecting and Mitigating Specification Gaming at Scale',
    authors: ['Amodei, D.', 'Cotra, A.', 'Leike, J.'],
    abstract: 'We present a systematic taxonomy of reward hacking behaviors in RLHF-trained models, along with a detection framework that identifies specification gaming with 91% precision. We release a benchmark of 2,400 reward hacking examples.',
    date: '2026-03-23',
    tags: ['cs.AI', 'cs.LG'],
  },
  {
    id: '2603.13105',
    title: 'Sparse Attention Is All You Need: Sub-Quadratic Transformers for 10M Token Contexts',
    authors: ['Dao, T.', 'Gu, A.', 'Dao, B.'],
    abstract: 'We propose SparseFlash, an extension of FlashAttention that achieves sub-quadratic complexity through learned sparsity patterns. Our approach processes 10 million token sequences on a single A100 with less than 40GB of memory.',
    date: '2026-03-22',
    tags: ['cs.LG', 'cs.CL'],
  },
];

const MOCK_MODEL_RELEASES = [
  {
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    date: '2026-03-28',
    capabilities: ['Extended thinking up to 128K tokens', 'Native tool use', 'Agentic coding mode', '1M context window option'],
    contextWindow: '200K (1M extended)',
  },
  {
    name: 'GPT-5 Turbo',
    provider: 'OpenAI',
    date: '2026-03-27',
    capabilities: ['40% latency reduction over GPT-5', 'Real-time multimodal reasoning', 'Native video understanding', 'Structured outputs v2'],
    contextWindow: '256K',
  },
  {
    name: 'Gemini 2.5 Pro',
    provider: 'Google DeepMind',
    date: '2026-03-24',
    capabilities: ['2M token context window', 'Grounded code generation', 'Inline documentation citations', 'Multi-turn tool use'],
    contextWindow: '2M',
  },
  {
    name: 'DeepSeek-V4',
    provider: 'DeepSeek',
    date: '2026-03-20',
    capabilities: ['671B MoE, 37B active', 'Apache 2.0 license', 'Matches GPT-4o on MMLU-Pro', 'Native function calling'],
    contextWindow: '128K',
  },
  {
    name: 'Codestral Mamba 2',
    provider: 'Mistral AI',
    date: '2026-03-18',
    capabilities: ['State-space architecture', 'Unlimited context at linear cost', 'Repository-level code understanding', 'Multi-file editing'],
    contextWindow: 'Unlimited (linear)',
  },
  {
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    date: '2026-03-15',
    capabilities: ['17B active / 400B total MoE', 'Permissive license', 'Vision and code capabilities', '1M context window'],
    contextWindow: '1M',
  },
];

// ─── Tab Content Components ──────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
    />
  );
}

function AIStatusTab() {
  const statuses = MOCK_STATUSES;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {statuses.map((service: ServiceStatus) => (
        <div
          key={service.name}
          className="bg-bg-secondary border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-text-primary font-medium text-sm">{service.name}</h3>
              <p className="text-text-muted text-xs">{service.provider}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot status={service.status} />
              <span className={`text-xs capitalize ${STATUS_COLORS[service.status] || STATUS_COLORS.unknown}`}>
                {service.status}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {service.components.map((comp: ServiceComponent) => (
              <div key={comp.name} className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{comp.name}</span>
                <StatusDot status={comp.status} />
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-muted">Uptime</span>
            <span className="text-xs font-mono text-text-secondary">{service.uptime7d.toFixed(2)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HNFeedTab() {
  return (
    <div className="space-y-0.5">
      {MOCK_HN_POSTS.map((post, idx) => (
        <div
          key={post.id}
          className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-bg-secondary transition-colors"
        >
          <span className="text-text-muted text-sm font-mono w-6 shrink-0 text-right pt-0.5">
            {idx + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm leading-snug">{post.title}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              <span className="text-accent-amber">{post.points} pts</span>
              <span>{post.comments} comments</span>
              <span>{post.timeAgo}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GitHubTrendingTab() {
  return (
    <div className="space-y-3">
      {MOCK_GITHUB_REPOS.map((repo) => (
        <div
          key={repo.name}
          className="bg-bg-secondary border border-border rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-accent-primary font-medium text-sm">{repo.name}</h3>
              <p className="text-text-secondary text-xs mt-1 line-clamp-1">{repo.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${repo.langColor}`} />
              {repo.language}
            </span>
            <span>{repo.stars.toLocaleString()} stars</span>
            <span className="text-accent-green">&#11014; {repo.growth}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ArxivPapersTab() {
  return (
    <div className="space-y-4">
      {MOCK_ARXIV_PAPERS.map((paper) => (
        <div
          key={paper.id}
          className="bg-bg-secondary border border-border rounded-lg p-4"
        >
          <h3 className="text-text-primary font-medium text-sm leading-snug">
            {paper.title}
          </h3>
          <p className="text-text-muted text-xs mt-1">
            {paper.authors.join(', ')}
          </p>
          <p className="text-text-secondary text-xs mt-2 line-clamp-2">
            {paper.abstract}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-text-muted">{paper.date}</span>
            <div className="flex gap-1.5">
              {paper.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-bg-tertiary text-accent-cyan px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function APIPricingTab() {
  const providers = pricingData.providers;

  // Flatten all models for column-level min detection
  const allModels = providers.flatMap((p) =>
    p.models.map((m) => ({ provider: p.name, ...m }))
  );
  const minInput = Math.min(...allModels.filter((m) => m.inputPrice > 0).map((m) => m.inputPrice));
  const minOutput = Math.min(...allModels.filter((m) => m.outputPrice > 0).map((m) => m.outputPrice));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs text-left">
            <th className="py-3 px-3 font-medium">Provider</th>
            <th className="py-3 px-3 font-medium">Model</th>
            <th className="py-3 px-3 font-medium text-right">Input / 1M</th>
            <th className="py-3 px-3 font-medium text-right">Output / 1M</th>
            <th className="py-3 px-3 font-medium text-right">Context</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) =>
            provider.models.map((model, mIdx) => {
              const isOpenSource = model.inputPrice === 0 && model.outputPrice === 0;
              return (
                <tr
                  key={model.id}
                  className="border-b border-border/50 hover:bg-bg-secondary transition-colors"
                >
                  {mIdx === 0 ? (
                    <td
                      className="py-2.5 px-3 text-text-primary font-medium align-top"
                      rowSpan={provider.models.length}
                    >
                      {provider.name}
                    </td>
                  ) : null}
                  <td className="py-2.5 px-3 text-text-secondary">{model.name}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono ${
                      isOpenSource
                        ? 'text-accent-green'
                        : model.inputPrice === minInput
                          ? 'text-accent-green'
                          : 'text-text-secondary'
                    }`}
                  >
                    {isOpenSource ? 'Free' : `$${model.inputPrice.toFixed(2)}`}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono ${
                      isOpenSource
                        ? 'text-accent-green'
                        : model.outputPrice === minOutput
                          ? 'text-accent-green'
                          : 'text-text-secondary'
                    }`}
                  >
                    {isOpenSource ? 'Free' : `$${model.outputPrice.toFixed(2)}`}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted font-mono">
                    {model.contextWindow >= 1000000
                      ? `${(model.contextWindow / 1000000).toFixed(0)}M`
                      : `${(model.contextWindow / 1000).toFixed(0)}K`}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <p className="text-xs text-text-muted mt-3 px-3">
        {pricingData.pricingNotes.disclaimer} Prices in {pricingData.pricingNotes.currency} {pricingData.pricingNotes.unit}.
      </p>
    </div>
  );
}

function ModelTrackerTab() {
  return (
    <div className="space-y-4">
      {MOCK_MODEL_RELEASES.map((model) => (
        <div
          key={model.name}
          className="bg-bg-secondary border border-border rounded-lg p-4 relative"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-text-primary font-semibold text-sm">{model.name}</h3>
              <p className="text-text-muted text-xs">{model.provider}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted">{model.date}</span>
              <p className="text-xs text-accent-cyan font-mono mt-0.5">{model.contextWindow}</p>
            </div>
          </div>
          <ul className="space-y-1 mt-2">
            {model.capabilities.map((cap) => (
              <li key={cap} className="text-xs text-text-secondary flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">&#8226;</span>
                {cap}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AgentActivityTab() {
  const [data, setData] = useState<{
    today_count: number;
    recent: { bot: string; endpoint: string; timestamp: string }[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setData(json);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!data) {
    return <p className="text-text-muted text-sm">Loading agent activity...</p>;
  }

  // Aggregate by bot name for breakdown
  const botCounts: Record<string, number> = {};
  const endpointCounts: Record<string, number> = {};
  for (const hit of data.recent) {
    botCounts[hit.bot] = (botCounts[hit.bot] || 0) + 1;
    endpointCounts[hit.endpoint] = (endpointCounts[hit.endpoint] || 0) + 1;
  }
  const sortedBots = Object.entries(botCounts).sort((a, b) => b[1] - a[1]);
  const sortedEndpoints = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]);
  const maxBotCount = sortedBots.length > 0 ? sortedBots[0][1] : 1;

  function timeAgo(ts: string) {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-accent-amber" />
          <h2 className="text-xl font-semibold text-text-primary">Agent Requests Today</h2>
        </div>
        <p className="text-4xl font-bold text-accent-primary">{data.today_count.toLocaleString()}</p>
        <p className="text-text-muted text-sm mt-1">Auto-updates every 10 seconds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bot Breakdown */}
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="text-text-primary font-semibold text-sm mb-4">Agent Breakdown</h3>
          <div className="space-y-3">
            {sortedBots.map(([bot, count]) => (
              <div key={bot}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary">{bot}</span>
                  <span className="text-xs text-text-muted font-mono">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-primary"
                    style={{ width: `${(count / maxBotCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedBots.length === 0 && (
              <p className="text-xs text-text-muted">No activity yet</p>
            )}
          </div>
        </div>

        {/* Most Requested Endpoints */}
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="text-text-primary font-semibold text-sm mb-4">Top Endpoints</h3>
          <div className="space-y-2">
            {sortedEndpoints.map(([endpoint, count]) => (
              <div key={endpoint} className="flex items-center justify-between">
                <code className="text-xs text-accent-cyan font-mono truncate">{endpoint}</code>
                <span className="text-xs text-text-muted font-mono shrink-0 ml-2">{count} hits</span>
              </div>
            ))}
            {sortedEndpoints.length === 0 && (
              <p className="text-xs text-text-muted">No activity yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-bg-secondary border border-border rounded-lg p-5">
        <h3 className="text-text-primary font-semibold text-sm mb-4">Recent Agent Hits</h3>
        <div className="space-y-1">
          {data.recent.map((hit, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-bg-tertiary transition-colors">
              <span className="text-sm text-text-primary font-medium w-36 shrink-0 truncate">{hit.bot}</span>
              <code className="text-xs text-text-muted font-mono flex-1 truncate">{hit.endpoint}</code>
              <span className="text-[10px] text-text-muted font-mono shrink-0">{timeAgo(hit.timestamp)}</span>
            </div>
          ))}
          {data.recent.length === 0 && (
            <p className="text-xs text-text-muted">No recent agent hits recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function LivePage() {
  const [activeTab, setActiveTab] = useState<TabName>('Agent Activity');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Agent Activity':
        return <AgentActivityTab />;
      case 'AI Status':
        return <AIStatusTab />;
      case 'HN Feed':
        return <HNFeedTab />;
      case 'GitHub Trending':
        return <GitHubTrendingTab />;
      case 'arXiv Papers':
        return <ArxivPapersTab />;
      case 'API Pricing':
        return <APIPricingTab />;
      case 'Model Tracker':
        return <ModelTrackerTab />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-6 h-6 text-accent-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Live Data Feeds</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Real-time AI ecosystem data, updated continuously
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? 'text-accent-primary border-accent-primary'
                  : 'text-text-muted border-transparent hover:text-text-secondary hover:border-border'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}
