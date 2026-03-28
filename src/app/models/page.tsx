import { Metadata } from 'next';
import { Cpu, ExternalLink } from 'lucide-react';
import pricingData from '@/../data/pricing.json';

export const metadata: Metadata = {
  title: 'AI Models',
  description:
    'Track the latest AI model releases, compare pricing across providers, and explore benchmark leaderboards. Updated daily.',
};

const latestReleases = [
  {
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    date: 'Mar 2026',
    capabilities: ['Text', 'Vision', 'Tool Use', 'Code', 'Reasoning'],
    contextWindow: '200K',
  },
  {
    name: 'GPT-4.5',
    provider: 'OpenAI',
    date: 'Feb 2026',
    capabilities: ['Text', 'Vision', 'Tool Use', 'Code', 'Reasoning'],
    contextWindow: '256K',
  },
  {
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    date: 'Mar 2026',
    capabilities: ['Text', 'Vision', 'Tool Use', 'Code', 'Reasoning'],
    contextWindow: '1M',
  },
  {
    name: 'Llama 4 Scout & Maverick',
    provider: 'Meta',
    date: 'Mar 2026',
    capabilities: ['Text', 'Vision', 'Code', 'Open Source'],
    contextWindow: '10M / 1M',
  },
  {
    name: 'Mistral Large 2',
    provider: 'Mistral',
    date: 'Feb 2026',
    capabilities: ['Text', 'Vision', 'Tool Use', 'Code'],
    contextWindow: '256K',
  },
  {
    name: 'Command R+ 2',
    provider: 'Cohere',
    date: 'Jan 2026',
    capabilities: ['Text', 'RAG', 'Tool Use', 'Code'],
    contextWindow: '256K',
  },
  {
    name: 'Grok 3',
    provider: 'xAI',
    date: 'Feb 2026',
    capabilities: ['Text', 'Vision', 'Code', 'Reasoning'],
    contextWindow: '128K',
  },
  {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    date: 'Jan 2026',
    capabilities: ['Text', 'Code', 'Reasoning', 'Open Source'],
    contextWindow: '128K',
  },
];

const leaderboards = [
  {
    name: 'LMArena',
    url: 'https://lmarena.ai',
    description: 'Community-driven blind model comparison with Elo ratings from real user votes.',
  },
  {
    name: 'HuggingFace Open LLM Leaderboard',
    url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard',
    description: 'Automated benchmark suite for open-weight models across reasoning, math, and knowledge tasks.',
  },
  {
    name: 'MMLU Benchmark Results',
    url: 'https://paperswithcode.com/sota/multi-task-language-understanding-on-mmlu',
    description: 'Massive Multitask Language Understanding scores across 57 academic subjects.',
  },
];

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M`;
  return `${(ctx / 1000).toFixed(0)}K`;
}

export default function ModelsPage() {
  // Flatten all models with provider info for the pricing table
  const allModels = pricingData.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      provider: provider.name,
      ...model,
    }))
  );

  // Find cheapest input and output prices (excluding free / open-source)
  const paidModels = allModels.filter((m) => m.inputPrice > 0);
  const cheapestInput = paidModels.length > 0 ? Math.min(...paidModels.map((m) => m.inputPrice)) : 0;
  const cheapestOutput = paidModels.length > 0 ? Math.min(...paidModels.map((m) => m.outputPrice)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Cpu className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Track releases, compare pricing, and benchmark scores across all major providers.
        </p>
      </div>

      {/* Latest Releases */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Latest Releases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestReleases.map((model) => (
            <div
              key={model.name}
              className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <Cpu className="w-5 h-5 text-accent-cyan mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-text-primary font-semibold leading-tight">{model.name}</h3>
                  <p className="text-text-muted text-sm">
                    {model.provider} &middot; {model.date}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {model.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Context: <span className="text-accent-green font-medium">{model.contextWindow}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Pricing Comparison</h2>
        <p className="text-text-muted text-sm mb-6">
          Prices in USD per 1M tokens. Last updated {pricingData.lastUpdated}.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Input / 1M
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Output / 1M
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Context
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allModels.map((model) => (
                <tr key={model.id} className="bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text-secondary">{model.provider}</td>
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">{model.name}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {model.inputPrice === 0 ? (
                      <span className="text-accent-green font-medium">Free</span>
                    ) : (
                      <span className={model.inputPrice === cheapestInput ? 'text-accent-green font-medium' : 'text-text-secondary'}>
                        ${model.inputPrice.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {model.outputPrice === 0 ? (
                      <span className="text-accent-green font-medium">Free</span>
                    ) : (
                      <span className={model.outputPrice === cheapestOutput ? 'text-accent-green font-medium' : 'text-text-secondary'}>
                        ${model.outputPrice.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-text-secondary">
                    {formatContext(model.contextWindow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-text-muted text-xs mt-3">
          {pricingData.pricingNotes.openSourceNote} {pricingData.pricingNotes.disclaimer}
        </p>
      </section>

      {/* Leaderboard Links */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Leaderboard Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leaderboards.map((board) => (
            <a
              key={board.name}
              href={board.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors">
                  {board.name}
                </h3>
                <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
              </div>
              <p className="text-text-muted text-sm">{board.description}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
