/**
 * Comparison directory: drives /compare/[slug] pages.
 * Each entry defines a head-to-head model comparison with
 * editorial analysis, SEO metadata, and model IDs for data lookup.
 *
 * These target high-intent "vs" search queries like
 * "claude vs chatgpt" and "gemini vs gpt-4o".
 */

export interface ComparisonMeta {
  slug: string;
  /** Model A pricing ID (from pricing.json) */
  modelA: string;
  /** Model B pricing ID (from pricing.json) */
  modelB: string;
  /** Display names */
  nameA: string;
  nameB: string;
  /** Provider names */
  providerA: string;
  providerB: string;
  /** Benchmark names (from benchmarks.json) */
  benchmarkNameA: string;
  benchmarkNameB: string;
  /** SEO title (no "| TensorFeed.ai" suffix, template handles it) */
  seoTitle: string;
  /** SEO description 150-160 chars */
  seoDescription: string;
  /** Editorial intro paragraph */
  intro: string;
  /** Quick verdict: which model wins in which categories */
  verdicts: { category: string; winner: 'A' | 'B' | 'tie'; reason: string }[];
  /** When to choose model A */
  chooseA: string[];
  /** When to choose model B */
  chooseB: string[];
}

export const COMPARISONS: ComparisonMeta[] = [
  {
    slug: 'claude-vs-chatgpt',
    modelA: 'claude-opus-4-7',
    modelB: 'gpt-4o',
    nameA: 'Claude Opus 4.7',
    nameB: 'GPT-4o',
    providerA: 'Anthropic',
    providerB: 'OpenAI',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'GPT-4o',
    seoTitle: 'Claude vs ChatGPT (2026): Pricing, Benchmarks, Full Comparison',
    seoDescription:
      'Claude Opus 4.7 vs GPT-4o compared head to head. Pricing, benchmark scores, context windows, capabilities, and real-world performance on TensorFeed.',
    intro:
      'Claude and ChatGPT are the two most widely used AI assistants in 2026. Anthropic\'s Claude Opus 4.7, released April 17, ships a 1 million token context window at flagship pricing and leads on code and reasoning benchmarks. OpenAI\'s GPT-4o counters with native multimodal including audio, a broader plugin ecosystem, and sharply lower per-token pricing. This breakdown covers pricing, performance, and use cases.',
    verdicts: [
      { category: 'Code generation', winner: 'A', reason: 'Claude scores 96.2 on HumanEval vs GPT-4o at 90.2' },
      { category: 'Reasoning', winner: 'A', reason: 'Claude leads on GPQA Diamond (76.5 vs 59.1) and MATH (93.1 vs 81.3)' },
      { category: 'Multimodal', winner: 'B', reason: 'GPT-4o supports native audio input and output; Claude is text and vision only' },
      { category: 'Context window', winner: 'A', reason: '1M tokens vs 128K tokens, nearly an 8x advantage' },
      { category: 'Pricing', winner: 'B', reason: 'GPT-4o costs $2.50/$10 vs Claude at $15/$75 per 1M tokens' },
      { category: 'Ecosystem', winner: 'B', reason: 'OpenAI has broader third-party integrations and plugin ecosystem' },
    ],
    chooseA: [
      'Complex coding tasks and large refactors',
      'Advanced reasoning and research',
      'Very long document processing (1M context)',
      'Agentic workflows with tool use',
    ],
    chooseB: [
      'Budget-conscious production workloads',
      'Multimodal apps needing audio support',
      'Broad ecosystem and plugin compatibility',
      'General-purpose chat applications',
    ],
  },
  {
    slug: 'claude-vs-gemini',
    modelA: 'claude-opus-4-7',
    modelB: 'gemini-2-5-pro',
    nameA: 'Claude Opus 4.7',
    nameB: 'Gemini 2.5 Pro',
    providerA: 'Anthropic',
    providerB: 'Google',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'Gemini 2.5 Pro',
    seoTitle: 'Claude vs Gemini (2026): Pricing, Benchmarks, Full Comparison',
    seoDescription:
      'Claude Opus 4.7 vs Gemini 2.5 Pro compared. Pricing, benchmarks, 1M context on both sides, and capabilities laid out on TensorFeed.',
    intro:
      'Claude Opus 4.7 and Gemini 2.5 Pro are the two strongest reasoning models in 2026, and as of April 17 they are both 1 million token context models. Claude leads on code generation, SWE-bench, and reasoning benchmarks, while Gemini still wins hard on price. The choice now comes down to raw accuracy versus cost, not context capacity.',
    verdicts: [
      { category: 'Code generation', winner: 'A', reason: 'Claude scores 96.2 on HumanEval vs Gemini at 93.8' },
      { category: 'Reasoning', winner: 'A', reason: 'Claude leads on GPQA Diamond (76.5 vs 71.9)' },
      { category: 'Context window', winner: 'tie', reason: 'Both models now support 1M token context windows' },
      { category: 'Pricing', winner: 'B', reason: 'Gemini costs $1.25/$10 vs Claude at $15/$75 per 1M tokens' },
      { category: 'Math', winner: 'A', reason: 'Claude scores 93.1 on MATH vs Gemini at 90.5' },
      { category: 'SWE-bench', winner: 'A', reason: 'Claude leads real-world engineering tasks (65.4 vs 59.4)' },
    ],
    chooseA: [
      'Highest-quality code generation',
      'Complex multi-step reasoning tasks',
      'Agentic tool use workflows',
      'Tasks where accuracy matters more than cost',
    ],
    chooseB: [
      'Cost-sensitive production workloads',
      'Video and large multimodal inputs',
      'Google Cloud ecosystem integration',
      'Teams processing massive volumes cheaply',
    ],
  },
  {
    slug: 'gpt-4o-vs-gemini',
    modelA: 'gpt-4o',
    modelB: 'gemini-2-5-pro',
    nameA: 'GPT-4o',
    nameB: 'Gemini 2.5 Pro',
    providerA: 'OpenAI',
    providerB: 'Google',
    benchmarkNameA: 'GPT-4o',
    benchmarkNameB: 'Gemini 2.5 Pro',
    seoTitle: 'GPT-4o vs Gemini 2.5 Pro (2026): Full Comparison',
    seoDescription:
      'GPT-4o vs Gemini 2.5 Pro head to head. Pricing, benchmarks, context windows, and capabilities compared on TensorFeed.',
    intro:
      'GPT-4o and Gemini 2.5 Pro represent the flagship models from OpenAI and Google respectively. Gemini dominates on reasoning benchmarks and offers a 1M context window at half the price, while GPT-4o brings native audio capabilities and the broadest ecosystem support. Both are strong general-purpose models with different strengths.',
    verdicts: [
      { category: 'Reasoning', winner: 'B', reason: 'Gemini scores 91.2 on MMLU-Pro vs GPT-4o at 87.2' },
      { category: 'Code generation', winner: 'B', reason: 'Gemini leads on HumanEval (93.8 vs 90.2)' },
      { category: 'Context window', winner: 'B', reason: '1M tokens vs 128K tokens' },
      { category: 'Pricing', winner: 'B', reason: 'Gemini costs $1.25/$10 vs GPT-4o at $2.50/$10 per 1M tokens' },
      { category: 'Multimodal', winner: 'A', reason: 'GPT-4o supports native audio; Gemini is text, vision, and video' },
      { category: 'Ecosystem', winner: 'A', reason: 'Broader third-party integrations and developer tools' },
    ],
    chooseA: [
      'Audio-based applications',
      'Existing OpenAI ecosystem integration',
      'Plugin and tool marketplace access',
      'Established enterprise partnerships',
    ],
    chooseB: [
      'Processing very long documents (1M context)',
      'Better reasoning performance per dollar',
      'Google Cloud and Vertex AI integration',
      'Video understanding workloads',
    ],
  },
  {
    slug: 'claude-vs-llama',
    modelA: 'claude-opus-4-7',
    modelB: 'llama-4-maverick',
    nameA: 'Claude Opus 4.7',
    nameB: 'Llama 4 Maverick',
    providerA: 'Anthropic',
    providerB: 'Meta',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'Llama 4 Maverick',
    seoTitle: 'Claude vs Llama 4 (2026): Closed vs Open Source AI Compared',
    seoDescription:
      'Claude Opus 4.7 vs Llama 4 Maverick. Closed-source flagship vs open-source challenger. Pricing, benchmarks, and deployment options compared.',
    intro:
      'This comparison captures the central tension in AI today: proprietary vs open source. Claude Opus 4.7 is the best closed-source model by most benchmarks and now ships with a 1M context window, while Llama 4 Maverick is Meta\'s strongest open-source offering, also at 1M context. Claude wins on raw performance, but Llama is free to self-host and fine-tune. The right choice depends entirely on your deployment constraints.',
    verdicts: [
      { category: 'Benchmark scores', winner: 'A', reason: 'Claude leads across all five major benchmarks' },
      { category: 'Cost', winner: 'B', reason: 'Llama is free to self-host; Claude costs $15/$75 per 1M tokens' },
      { category: 'Customization', winner: 'B', reason: 'Llama can be fine-tuned for specific domains; Claude cannot' },
      { category: 'Context window', winner: 'tie', reason: 'Both models offer 1M token context windows' },
      { category: 'Code generation', winner: 'A', reason: 'Claude scores 96.2 on HumanEval vs Maverick at 91.7' },
      { category: 'Data privacy', winner: 'B', reason: 'Self-hosted Llama keeps all data on your infrastructure' },
    ],
    chooseA: [
      'Best possible output quality regardless of cost',
      'Quick API integration without infrastructure',
      'Agentic workflows needing tool use',
      'Teams without ML infrastructure expertise',
    ],
    chooseB: [
      'On-premise deployments for data sovereignty',
      'Custom fine-tuning for specific domains',
      'Zero marginal cost at high volume',
      'Research and experimentation',
    ],
  },
  {
    slug: 'gpt-4o-vs-claude-sonnet',
    modelA: 'gpt-4o',
    modelB: 'claude-sonnet-4-6',
    nameA: 'GPT-4o',
    nameB: 'Claude Sonnet 4.6',
    providerA: 'OpenAI',
    providerB: 'Anthropic',
    benchmarkNameA: 'GPT-4o',
    benchmarkNameB: 'Claude Sonnet 4.6',
    seoTitle: 'GPT-4o vs Claude Sonnet 4.6 (2026): Mid-Tier AI Showdown',
    seoDescription:
      'GPT-4o vs Claude Sonnet 4.6 for production workloads. Similar pricing, different strengths. Benchmarks, capabilities, and use cases compared.',
    intro:
      'GPT-4o and Claude Sonnet 4.6 sit in a similar price bracket and compete directly for production API workloads. Sonnet edges out GPT-4o on most benchmarks while costing slightly more on input but significantly more on output. GPT-4o counters with audio support and broader ecosystem reach. This is the comparison that matters most for teams choosing a daily-driver model.',
    verdicts: [
      { category: 'Code generation', winner: 'B', reason: 'Sonnet scores 92.0 on HumanEval vs GPT-4o at 90.2' },
      { category: 'Reasoning', winner: 'B', reason: 'Sonnet leads on MMLU-Pro (88.7 vs 87.2) and GPQA Diamond (65.8 vs 59.1)' },
      { category: 'Input pricing', winner: 'A', reason: 'GPT-4o costs $2.50/1M vs Sonnet at $3.00/1M input' },
      { category: 'Output pricing', winner: 'A', reason: 'GPT-4o costs $10/1M vs Sonnet at $15/1M output' },
      { category: 'Context window', winner: 'B', reason: '200K tokens vs 128K tokens' },
      { category: 'Audio support', winner: 'A', reason: 'GPT-4o has native audio; Sonnet does not' },
    ],
    chooseA: [
      'Cost-optimized high-volume production',
      'Applications needing audio input/output',
      'Broad ecosystem and plugin support',
      'Teams already invested in OpenAI tools',
    ],
    chooseB: [
      'Higher quality reasoning at moderate cost',
      'Larger context window for long inputs',
      'Code-heavy workloads',
      'Teams prioritizing output quality over cost',
    ],
  },
  {
    slug: 'gemini-flash-vs-gpt-4o-mini',
    modelA: 'gemini-2-0-flash',
    modelB: 'gpt-4o-mini',
    nameA: 'Gemini 2.0 Flash',
    nameB: 'GPT-4o Mini',
    providerA: 'Google',
    providerB: 'OpenAI',
    benchmarkNameA: 'Gemini 2.0 Flash',
    benchmarkNameB: 'GPT-4o-mini',
    seoTitle: 'Gemini Flash vs GPT-4o Mini (2026): Budget AI Models Compared',
    seoDescription:
      'Gemini 2.0 Flash vs GPT-4o Mini for budget workloads. The cheapest models from Google and OpenAI compared on price, speed, and capabilities.',
    intro:
      'At the budget end of the AI market, Gemini 2.0 Flash and GPT-4o Mini compete for high-volume, cost-sensitive workloads. Both offer impressive capabilities at a fraction of flagship pricing. Flash is cheaper with a larger context window, while Mini has a slight edge on some benchmarks. For teams processing millions of requests, the difference in pricing adds up fast.',
    verdicts: [
      { category: 'Input pricing', winner: 'A', reason: 'Flash costs $0.10/1M vs Mini at $0.15/1M' },
      { category: 'Output pricing', winner: 'A', reason: 'Flash costs $0.40/1M vs Mini at $0.60/1M' },
      { category: 'Context window', winner: 'A', reason: '1M tokens vs 128K tokens' },
      { category: 'Vision', winner: 'tie', reason: 'Both support image input' },
      { category: 'Speed', winner: 'tie', reason: 'Both optimized for fast inference' },
      { category: 'Ecosystem', winner: 'B', reason: 'GPT-4o Mini benefits from OpenAI ecosystem breadth' },
    ],
    chooseA: [
      'Absolute lowest cost per token',
      'Very long document processing on a budget',
      'Google Cloud native workloads',
      'High-volume batch processing',
    ],
    chooseB: [
      'Existing OpenAI integration',
      'Broad plugin and tool compatibility',
      'Applications needing wider ecosystem support',
      'Teams already using OpenAI fine-tuning',
    ],
  },
  {
    slug: 'claude-opus-4-7-vs-claude-opus-4-6',
    modelA: 'claude-opus-4-7',
    modelB: 'claude-opus-4-6',
    nameA: 'Claude Opus 4.7',
    nameB: 'Claude Opus 4.6',
    providerA: 'Anthropic',
    providerB: 'Anthropic',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'Claude Opus 4.6',
    seoTitle: 'Claude Opus 4.7 vs 4.6: What Actually Changed',
    seoDescription:
      'Claude Opus 4.7 vs 4.6 compared. 1M context upgrade, benchmark gains, same pricing. Full breakdown of what changed and when to upgrade on TensorFeed.',
    intro:
      'Anthropic released Claude Opus 4.7 on April 17, 2026, roughly a month after 4.6. Pricing held steady at $15 input and $75 output per million tokens. The headline is a 5x context upgrade from 200K to 1 million tokens and a solid bump on reasoning and code benchmarks. Here is the full generational diff.',
    verdicts: [
      { category: 'Context window', winner: 'A', reason: '1M tokens on 4.7 vs 200K on 4.6, a 5x jump' },
      { category: 'Code generation', winner: 'A', reason: '4.7 scores 96.2 on HumanEval vs 4.6 at 95.1' },
      { category: 'Reasoning', winner: 'A', reason: '4.7 leads on GPQA Diamond (76.5 vs 74.2) and MMLU-Pro (93.8 vs 92.4)' },
      { category: 'Math', winner: 'A', reason: '4.7 scores 93.1 on MATH vs 4.6 at 91.8' },
      { category: 'SWE-bench', winner: 'A', reason: '4.7 posts 65.4 vs 4.6 at 62.3 on real engineering tasks' },
      { category: 'Pricing', winner: 'tie', reason: 'Both cost $15/$75 per 1M tokens' },
    ],
    chooseA: [
      'Workloads that benefit from 1M context',
      'Long-running agent sessions',
      'Whole-repository code tasks',
      'Multi-document research synthesis',
    ],
    chooseB: [
      'Existing prompts tuned to 4.6 behavior',
      'Workloads that fit in 200K and do not need migration',
      'Enterprise teams on version-pinned contracts',
      'Evaluation and regression testing against 4.6',
    ],
  },
];

export function getComparisonBySlug(slug: string): ComparisonMeta | undefined {
  return COMPARISONS.find(c => c.slug === slug);
}

export function getAllComparisonSlugs(): string[] {
  return COMPARISONS.map(c => c.slug);
}
