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
  {
    slug: 'gpt-5-5-vs-claude-opus-4-7',
    modelA: 'gpt-5-5',
    modelB: 'claude-opus-4-7',
    nameA: 'GPT-5.5',
    nameB: 'Claude Opus 4.7',
    providerA: 'OpenAI',
    providerB: 'Anthropic',
    benchmarkNameA: 'GPT-5.5',
    benchmarkNameB: 'Claude Opus 4.7',
    seoTitle: 'GPT-5.5 vs Claude Opus 4.7 (2026): Full Comparison',
    seoDescription:
      'GPT-5.5 vs Claude Opus 4.7 head to head. OpenAI flagship vs Anthropic flagship. Pricing, benchmarks, 1M context on both, and real-world capabilities compared.',
    intro:
      'GPT-5.5 launched on April 23, 2026 as OpenAI\'s first fully retrained base model since GPT-4.5. At $5 input and $30 output per million tokens, it costs less than half of Claude Opus 4.7 at $15/$75. Both models offer 1M context windows. GPT-5.5 leads on MMLU-Pro and HumanEval while Claude Opus 4.7 holds the edge on reasoning and real-world engineering tasks. This is the definitive flagship comparison for 2026.',
    verdicts: [
      { category: 'MMLU-Pro', winner: 'A', reason: 'GPT-5.5 scores 94.2 vs Claude at 93.8' },
      { category: 'Code generation', winner: 'A', reason: 'GPT-5.5 scores 97.1 on HumanEval vs Claude at 96.2' },
      { category: 'Reasoning (GPQA)', winner: 'B', reason: 'Claude scores 76.5 on GPQA Diamond vs GPT-5.5 at 78.3, but Claude leads on SWE-bench' },
      { category: 'SWE-bench', winner: 'B', reason: 'Claude posts 65.4 vs GPT-5.5 at 68.7 on real engineering tasks' },
      { category: 'Pricing', winner: 'A', reason: 'GPT-5.5 at $5/$30 vs Claude at $15/$75 per 1M tokens' },
      { category: 'Context window', winner: 'tie', reason: 'Both offer 1M token context windows' },
    ],
    chooseA: [
      'Best possible benchmark scores on paper',
      'Cost-conscious flagship workloads ($5/$30 vs $15/$75)',
      'Omnimodal applications (text, image, audio, video)',
      'OpenAI ecosystem and existing integrations',
    ],
    chooseB: [
      'Agent workflows and tool use (MCP ecosystem)',
      'Complex multi-step reasoning tasks',
      'Long-running agentic sessions',
      'Tasks where safety and instruction-following matter',
    ],
  },
  {
    slug: 'gpt-5-5-vs-gemini-2-5-pro',
    modelA: 'gpt-5-5',
    modelB: 'gemini-2-5-pro',
    nameA: 'GPT-5.5',
    nameB: 'Gemini 2.5 Pro',
    providerA: 'OpenAI',
    providerB: 'Google',
    benchmarkNameA: 'GPT-5.5',
    benchmarkNameB: 'Gemini 2.5 Pro',
    seoTitle: 'GPT-5.5 vs Gemini 2.5 Pro (2026): Full Comparison',
    seoDescription:
      'GPT-5.5 vs Gemini 2.5 Pro head to head. Two 1M-context flagships from OpenAI and Google compared on pricing, benchmarks, and capabilities.',
    intro:
      'GPT-5.5 and Gemini 2.5 Pro are the flagship models from OpenAI and Google, both with 1M token context windows. GPT-5.5 dominates benchmarks across the board but costs 4x more on input. Gemini remains the best value for long-context production workloads, especially teams processing high volumes on Google Cloud.',
    verdicts: [
      { category: 'Benchmarks', winner: 'A', reason: 'GPT-5.5 leads on MMLU-Pro (94.2 vs 91.2), HumanEval (97.1 vs 93.8), and MATH (95.8 vs 90.5)' },
      { category: 'Input pricing', winner: 'B', reason: 'Gemini at $1.25/1M vs GPT-5.5 at $5/1M' },
      { category: 'Output pricing', winner: 'B', reason: 'Gemini at $10/1M vs GPT-5.5 at $30/1M' },
      { category: 'Context window', winner: 'tie', reason: 'Both 1M tokens' },
      { category: 'Multimodal', winner: 'tie', reason: 'Both handle text, image, and video; GPT-5.5 adds audio' },
      { category: 'Infrastructure', winner: 'B', reason: 'Gemini runs natively on Google Cloud TPUs with Vertex AI integration' },
    ],
    chooseA: [
      'Highest possible quality regardless of cost',
      'Native audio input and output',
      'OpenAI ecosystem and tool marketplace',
      'Omnimodal applications',
    ],
    chooseB: [
      'Cost-sensitive production workloads',
      'Google Cloud and Vertex AI integration',
      'High-volume long-context processing',
      'Video understanding tasks',
    ],
  },
  {
    slug: 'deepseek-v4-pro-vs-gpt-5-5',
    modelA: 'deepseek-v4-pro',
    modelB: 'gpt-5-5',
    nameA: 'DeepSeek V4 Pro',
    nameB: 'GPT-5.5',
    providerA: 'DeepSeek',
    providerB: 'OpenAI',
    benchmarkNameA: 'DeepSeek V4 Pro',
    benchmarkNameB: 'GPT-5.5',
    seoTitle: 'DeepSeek V4 Pro vs GPT-5.5 (2026): Open Source vs Frontier API',
    seoDescription:
      'DeepSeek V4 Pro vs GPT-5.5 head to head. The MIT-licensed open source flagship against OpenAI\'s newest closed model. Pricing, benchmarks, and 1M context compared.',
    intro:
      'DeepSeek V4 Pro and GPT-5.5 both shipped within 24 hours of each other in late April 2026 (V4 on April 24, GPT-5.5 on April 23). They both target the same problem: long-context reasoning at the frontier. GPT-5.5 leads benchmarks across the board, but DeepSeek V4 Pro costs $1.74 per million input tokens versus $5.00 for GPT-5.5, and ships under the MIT license with weights anyone can download. The choice comes down to closed-API quality versus open-source independence at roughly one-third the price.',
    verdicts: [
      { category: 'MMLU-Pro', winner: 'B', reason: 'GPT-5.5 scores 94.2 vs DeepSeek V4 Pro at 91.5' },
      { category: 'Code generation (HumanEval)', winner: 'B', reason: 'GPT-5.5 at 97.1 vs V4 Pro at 94.8' },
      { category: 'SWE-bench', winner: 'B', reason: 'GPT-5.5 at 68.7 vs V4 Pro at 63.8 on the TensorFeed harness' },
      { category: 'Math', winner: 'B', reason: 'GPT-5.5 at 95.8 vs V4 Pro at 92.4' },
      { category: 'Pricing', winner: 'A', reason: 'V4 Pro at $1.74/$3.48 vs GPT-5.5 at $5/$30 per 1M tokens' },
      { category: 'License', winner: 'A', reason: 'MIT license allows unrestricted self-hosting and fine-tuning' },
      { category: 'Context window', winner: 'tie', reason: 'Both ship with native 1M token context windows' },
      { category: 'Multimodal', winner: 'B', reason: 'GPT-5.5 supports text, image, audio, and video; V4 Pro is text and vision' },
    ],
    chooseA: [
      'Self-hosted or on-premise deployments where weights matter',
      'Fine-tuning for specialized domains',
      'High-volume workloads where cost dominates',
      'Teams that need full control over inference',
    ],
    chooseB: [
      'Highest possible benchmark scores out of the box',
      'Omnimodal applications (audio, video input)',
      'Existing OpenAI ecosystem and tooling',
      'Workloads where managed API beats self-hosting',
    ],
  },
  // ── Added April 27, 2026 ────────────────────────────────────────────
  {
    slug: 'claude-opus-4-7-vs-gemini-2-5-pro',
    modelA: 'claude-opus-4-7',
    modelB: 'gemini-2-5-pro',
    nameA: 'Claude Opus 4.7',
    nameB: 'Gemini 2.5 Pro',
    providerA: 'Anthropic',
    providerB: 'Google',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'Gemini 2.5 Pro',
    seoTitle: 'Claude Opus 4.7 vs Gemini 2.5 Pro: 1M Context Showdown (2026)',
    seoDescription:
      'Claude Opus 4.7 vs Gemini 2.5 Pro. Both ship 1M token context windows but at very different price points. Pricing, benchmarks, and where each wins on TensorFeed.',
    intro:
      'Claude Opus 4.7 and Gemini 2.5 Pro are the two flagship models in 2026 with 1 million token context windows. They reach long context very differently. Anthropic prices at $15 input / $75 output per 1M tokens for the headline frontier-class scores. Google prices at $1.25 input / $10 output, accepting a benchmark gap in exchange for an order of magnitude lower per-token cost. The 1M context is the same; the rest of the tradeoff is where you spend.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'A', reason: 'Opus 4.7 at 93.8 vs Gemini 2.5 Pro at 91.2' },
      { category: 'Code generation (HumanEval)', winner: 'A', reason: 'Opus 4.7 at 96.2 vs Gemini 2.5 Pro at 93.8' },
      { category: 'SWE-bench', winner: 'A', reason: 'Opus 4.7 at 65.4 vs Gemini 2.5 Pro at 59.4' },
      { category: 'Graduate-level science (GPQA)', winner: 'A', reason: 'Opus 4.7 at 76.5 vs Gemini 2.5 Pro at 71.9' },
      { category: 'Pricing', winner: 'B', reason: 'Gemini 2.5 Pro at $1.25/$10 vs Opus 4.7 at $15/$75. ~10x cheaper.' },
      { category: 'Context window', winner: 'tie', reason: 'Both ship native 1M token context.' },
      { category: 'Multimodal', winner: 'B', reason: 'Gemini supports text, vision, audio, video natively. Opus 4.7 is text and vision.' },
    ],
    chooseA: [
      'Frontier-class reasoning quality matters more than per-token cost',
      'Coding agents that need top SWE-bench scores',
      'Research agents working with dense scientific content',
      'Workloads where Anthropic is already integrated',
    ],
    chooseB: [
      'High-volume long-context workloads where price dominates',
      'Multimodal applications with audio or video input',
      'Workloads already on Google Cloud / Vertex AI',
      'Cost-sensitive 1M context use cases',
    ],
  },
  {
    slug: 'claude-opus-4-7-vs-deepseek-v4-pro',
    modelA: 'claude-opus-4-7',
    modelB: 'deepseek-v4-pro',
    nameA: 'Claude Opus 4.7',
    nameB: 'DeepSeek V4 Pro',
    providerA: 'Anthropic',
    providerB: 'DeepSeek',
    benchmarkNameA: 'Claude Opus 4.7',
    benchmarkNameB: 'DeepSeek V4 Pro',
    seoTitle: 'Claude Opus 4.7 vs DeepSeek V4 Pro: Frontier vs Budget Frontier',
    seoDescription:
      'Claude Opus 4.7 vs DeepSeek V4 Pro. Frontier benchmarks vs near-frontier scores at one-tenth the price, plus open weights. Where each wins on TensorFeed.',
    intro:
      'DeepSeek V4 Pro is the model that forced everyone to take open-weight Chinese LLMs seriously. It scores within 2-3 points of Claude Opus 4.7 on most benchmarks, ships under MIT license, and prices at roughly 1/10th of Opus on the API. The tradeoff: Opus still leads on the hardest reasoning, agentic tool use, and English-language code; V4 Pro wins on cost, weight access, and self-hosting flexibility.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'A', reason: 'Opus 4.7 at 93.8 vs V4 Pro at 91.5. Close.' },
      { category: 'Code generation (HumanEval)', winner: 'A', reason: 'Opus 4.7 at 96.2 vs V4 Pro at 94.8' },
      { category: 'SWE-bench', winner: 'A', reason: 'Opus 4.7 at 65.4 vs V4 Pro at 63.8' },
      { category: 'Graduate-level science (GPQA)', winner: 'A', reason: 'Opus 4.7 at 76.5 vs V4 Pro at 73.1' },
      { category: 'Math', winner: 'tie', reason: 'Opus 4.7 at 93.1 vs V4 Pro at 92.4. Within noise.' },
      { category: 'Pricing', winner: 'B', reason: 'V4 Pro at $1.74/$3.48 vs Opus at $15/$75. ~10x cheaper input, ~20x cheaper output.' },
      { category: 'License', winner: 'B', reason: 'V4 Pro is MIT-licensed open weights; Opus is closed API only.' },
      { category: 'Context window', winner: 'tie', reason: 'Both ship 1M token native context.' },
    ],
    chooseA: [
      'Maximum benchmark quality regardless of cost',
      'Strongest agentic tool use and long-running workflows',
      'Existing Anthropic integration and ecosystem',
      'Closed-API trust model preferred over self-hosting',
    ],
    chooseB: [
      'High-volume workloads where cost dominates',
      'Self-hosted or on-prem deployments where weights matter',
      'Fine-tuning for specialized domains',
      'Frontier-class quality at fraction of frontier price',
    ],
  },
  {
    slug: 'llama-4-maverick-vs-deepseek-v4-pro',
    modelA: 'llama-4-maverick',
    modelB: 'deepseek-v4-pro',
    nameA: 'Llama 4 Maverick',
    nameB: 'DeepSeek V4 Pro',
    providerA: 'Meta',
    providerB: 'DeepSeek',
    benchmarkNameA: 'Llama 4 Maverick',
    benchmarkNameB: 'DeepSeek V4 Pro',
    seoTitle: 'Llama 4 Maverick vs DeepSeek V4 Pro: Open Weight Showdown',
    seoDescription:
      'Llama 4 Maverick vs DeepSeek V4 Pro. Both are open-weight, MIT-style licenses, frontier-class benchmarks. Pricing, performance, and self-hosting comparison on TensorFeed.',
    intro:
      'The two strongest open-weight models in 2026 sit head-to-head: Meta\'s Llama 4 Maverick and DeepSeek\'s V4 Pro. Both ship with permissive licenses that allow commercial use and self-hosting. DeepSeek V4 Pro edges Maverick on most benchmarks, particularly graduate-level science and math, but Maverick has the larger ecosystem of fine-tuned variants, runtime support across cloud partners, and a broader toolchain.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'B', reason: 'V4 Pro at 91.5 vs Maverick at 89.3' },
      { category: 'Code generation (HumanEval)', winner: 'B', reason: 'V4 Pro at 94.8 vs Maverick at 91.7' },
      { category: 'SWE-bench', winner: 'B', reason: 'V4 Pro at 63.8 vs Maverick at 52.8' },
      { category: 'Graduate-level science (GPQA)', winner: 'B', reason: 'V4 Pro at 73.1 vs Maverick at 64.1' },
      { category: 'Math', winner: 'B', reason: 'V4 Pro at 92.4 vs Maverick at 86.7' },
      { category: 'License', winner: 'tie', reason: 'Both permit commercial use and self-hosting under permissive terms.' },
      { category: 'Ecosystem', winner: 'A', reason: 'Llama has a much larger fine-tune and adapter community via Hugging Face.' },
      { category: 'Pricing', winner: 'tie', reason: 'Both are free to self-host; partner-API pricing varies by host.' },
    ],
    chooseA: [
      'Largest fine-tune ecosystem matters for your domain',
      'Llama-Guard, Llama-Stack, and other Meta tooling fits your stack',
      'Wider support across Together, Fireworks, Groq, Cerebras, AWS Bedrock',
      'Multimodal applications using Llama 4 Scout for the vision tier',
    ],
    chooseB: [
      'Strongest open-weight benchmark scores available today',
      'Code and math workloads',
      'Self-hosted production with frontier-class quality',
      'Single-model deployment preferred over fragmented Llama variants',
    ],
  },
  {
    slug: 'o3-mini-vs-claude-sonnet-4-6',
    modelA: 'o3-mini',
    modelB: 'claude-sonnet-4-6',
    nameA: 'o3-mini',
    nameB: 'Claude Sonnet 4.6',
    providerA: 'OpenAI',
    providerB: 'Anthropic',
    benchmarkNameA: 'o3-mini',
    benchmarkNameB: 'Claude Sonnet 4.6',
    seoTitle: 'o3-mini vs Claude Sonnet 4.6: Reasoning vs Generalist Mid-Tier',
    seoDescription:
      'o3-mini vs Claude Sonnet 4.6. Reasoning specialist vs balanced generalist at the mid-tier. Pricing, benchmarks, and which to pick for code, research, or chat workloads.',
    intro:
      'Both o3-mini and Claude Sonnet 4.6 sit at the mid-tier price point but solve different problems. o3-mini is OpenAI\'s reasoning specialist, optimized for math, science, and chain-of-thought workloads at a third the cost of GPT-5.5. Claude Sonnet 4.6 is Anthropic\'s balanced generalist, comparable on most general tasks at a similar price point but with stronger code generation and the same 200K context as Opus.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'B', reason: 'Sonnet 4.6 at 88.7 vs o3-mini at 86.3' },
      { category: 'Code generation (HumanEval)', winner: 'B', reason: 'Sonnet 4.6 at 92.0 vs o3-mini at 89.7' },
      { category: 'SWE-bench', winner: 'B', reason: 'Sonnet 4.6 at 55.7 vs o3-mini at 49.3' },
      { category: 'Math', winner: 'A', reason: 'o3-mini at 87.1 vs Sonnet 4.6 at 85.4. Reasoning specialist edges out.' },
      { category: 'Graduate-level science (GPQA)', winner: 'B', reason: 'Sonnet 4.6 at 65.8 vs o3-mini at 60.3' },
      { category: 'Pricing', winner: 'A', reason: 'o3-mini at $1.10/$4.40 vs Sonnet 4.6 at $3/$15. ~3x cheaper.' },
      { category: 'Context window', winner: 'B', reason: 'Sonnet 4.6 has 200K vs o3-mini at 200K. Tie on size; Anthropic\'s long-context recall is generally stronger.' },
    ],
    chooseA: [
      'Math and quantitative reasoning workloads',
      'Cost-sensitive applications where mid-tier is the budget ceiling',
      'OpenAI ecosystem and Assistants API integrations',
      'Chain-of-thought reasoning patterns',
    ],
    chooseB: [
      'Code generation and software-engineering agents',
      'Long-document analysis and research synthesis',
      'Anthropic\'s tool-use semantics and MCP integration',
      'Workloads that benefit from balanced generalist quality',
    ],
  },
  {
    slug: 'claude-haiku-4-5-vs-gemini-2-0-flash',
    modelA: 'claude-haiku-4-5',
    modelB: 'gemini-2-0-flash',
    nameA: 'Claude Haiku 4.5',
    nameB: 'Gemini 2.0 Flash',
    providerA: 'Anthropic',
    providerB: 'Google',
    benchmarkNameA: 'Claude Haiku 4.5',
    benchmarkNameB: 'Gemini 2.0 Flash',
    seoTitle: 'Claude Haiku 4.5 vs Gemini 2.0 Flash: Budget Tier Showdown (2026)',
    seoDescription:
      'Claude Haiku 4.5 vs Gemini 2.0 Flash. The two leading budget-tier AI models. Pricing, benchmarks, context window, and multimodal support compared on TensorFeed.',
    intro:
      'When the workload is high-volume and the budget is tight, the choice usually comes down to Claude Haiku 4.5 or Gemini 2.0 Flash. Haiku scores higher on most benchmarks but costs ~8x more per token. Flash trades a few benchmark points for native multimodal input, a 1M context window, and dramatically lower cost. For most cost-sensitive production workloads, Flash wins; for quality-sensitive budget work, Haiku.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'tie', reason: 'Haiku 4.5 at 82.1 vs Flash at 84.5. Within noise on this benchmark.' },
      { category: 'Code generation (HumanEval)', winner: 'B', reason: 'Flash at 87.6 vs Haiku 4.5 at 86.3. Slight Flash edge.' },
      { category: 'SWE-bench', winner: 'B', reason: 'Flash at 43.1 vs Haiku 4.5 at 41.2. Both are below the threshold for autonomous coding agents.' },
      { category: 'Math', winner: 'A', reason: 'Haiku 4.5 at 74.6 vs Flash at 77.2. Flash slightly ahead.' },
      { category: 'Pricing', winner: 'B', reason: 'Flash at $0.10/$0.40 vs Haiku 4.5 at $0.80/$4. ~8-10x cheaper.' },
      { category: 'Context window', winner: 'B', reason: 'Flash has 1M tokens vs Haiku at 200K.' },
      { category: 'Multimodal', winner: 'B', reason: 'Flash supports text, image, audio, video. Haiku is text and vision.' },
    ],
    chooseA: [
      'Better quality matters more than cost at the budget tier',
      'Anthropic ecosystem (MCP, Claude Code, etc.) is already in your stack',
      'Workloads where Anthropic\'s safety profile is preferred',
      'Tool-use heavy applications',
    ],
    chooseB: [
      'High-volume traffic where cost dominates',
      'Multimodal applications with audio or video',
      'Long-context workloads at budget price',
      'Workloads on Google Cloud / Vertex AI',
    ],
  },
  {
    slug: 'mistral-large-vs-claude-sonnet-4-6',
    modelA: 'mistral-large',
    modelB: 'claude-sonnet-4-6',
    nameA: 'Mistral Large',
    nameB: 'Claude Sonnet 4.6',
    providerA: 'Mistral',
    providerB: 'Anthropic',
    benchmarkNameA: 'Mistral Large',
    benchmarkNameB: 'Claude Sonnet 4.6',
    seoTitle: 'Mistral Large vs Claude Sonnet 4.6: EU vs US Mid-Tier Comparison',
    seoDescription:
      'Mistral Large vs Claude Sonnet 4.6. EU-resident inference vs US benchmark leadership at the mid-tier. Pricing, benchmarks, multilingual, data sovereignty on TensorFeed.',
    intro:
      'Mistral Large and Claude Sonnet 4.6 both compete for the mid-tier production workload, but they win on different axes. Sonnet 4.6 leads on benchmarks across the board. Mistral Large offers EU-resident inference, stronger multilingual coverage, and a slightly lower price point. For compliance-heavy European deployments or workloads where multilingual matters more than English benchmark scores, Mistral wins.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'B', reason: 'Sonnet 4.6 at 88.7 vs Mistral Large at 86.8' },
      { category: 'Code generation (HumanEval)', winner: 'B', reason: 'Sonnet 4.6 at 92.0 vs Mistral Large at 89.1' },
      { category: 'SWE-bench', winner: 'B', reason: 'Sonnet 4.6 at 55.7 vs Mistral Large at 46.2' },
      { category: 'Pricing', winner: 'A', reason: 'Mistral Large at $2/$6 vs Sonnet 4.6 at $3/$15. Cheaper, especially on output.' },
      { category: 'Multilingual', winner: 'A', reason: 'Mistral has stronger multilingual coverage by design.' },
      { category: 'Data sovereignty', winner: 'A', reason: 'Mistral offers EU-resident inference; Anthropic is US-based.' },
      { category: 'Context window', winner: 'B', reason: 'Sonnet 4.6 has 200K vs Mistral Large at 128K.' },
    ],
    chooseA: [
      'EU compliance and data residency requirements',
      'Multilingual production workloads',
      'Cost-sensitive mid-tier deployments',
      'On-prem or open-weight deployment paths',
    ],
    chooseB: [
      'English benchmark leadership matters most',
      'Coding and SWE-bench-shaped agent workloads',
      'Anthropic ecosystem (MCP, Claude Code) is already in use',
      'Long-context analysis up to 200K tokens',
    ],
  },
  {
    slug: 'deepseek-v4-flash-vs-gemini-2-0-flash',
    modelA: 'deepseek-v4-flash',
    modelB: 'gemini-2-0-flash',
    nameA: 'DeepSeek V4 Flash',
    nameB: 'Gemini 2.0 Flash',
    providerA: 'DeepSeek',
    providerB: 'Google',
    benchmarkNameA: 'DeepSeek V4 Flash',
    benchmarkNameB: 'Gemini 2.0 Flash',
    seoTitle: 'DeepSeek V4 Flash vs Gemini 2.0 Flash: Budget Tier Open vs Closed',
    seoDescription:
      'DeepSeek V4 Flash vs Gemini 2.0 Flash. The two leading low-cost AI models. Pricing, benchmarks, context window, and self-hosting options compared on TensorFeed.',
    intro:
      'Both Flash-tier models target the high-volume, low-cost segment. Gemini 2.0 Flash wins on raw API price ($0.10 input vs $0.14 input) and adds multimodal video. DeepSeek V4 Flash is open-weight (MIT license), self-hostable, and edges Gemini Flash on most benchmarks especially math and code. The choice is mostly about whether you need closed multimodal or open weights.',
    verdicts: [
      { category: 'General reasoning (MMLU-Pro)', winner: 'A', reason: 'V4 Flash at 85.2 vs Gemini Flash at 84.5' },
      { category: 'Code generation (HumanEval)', winner: 'A', reason: 'V4 Flash at 89.4 vs Gemini Flash at 87.6' },
      { category: 'SWE-bench', winner: 'A', reason: 'V4 Flash at 48.9 vs Gemini Flash at 43.1' },
      { category: 'Math', winner: 'A', reason: 'V4 Flash at 82.1 vs Gemini Flash at 77.2' },
      { category: 'Pricing', winner: 'B', reason: 'Gemini Flash at $0.10/$0.40 vs V4 Flash at $0.14/$0.28. Cheaper input, more expensive output.' },
      { category: 'License', winner: 'A', reason: 'V4 Flash is MIT open weights; Gemini Flash is closed API.' },
      { category: 'Multimodal', winner: 'B', reason: 'Gemini Flash supports text, image, audio, video. V4 Flash is text-only.' },
      { category: 'Context window', winner: 'tie', reason: 'Both ship 1M token context.' },
    ],
    chooseA: [
      'Open-weight self-hosting requirements',
      'Code and math workloads at budget price',
      'Workloads where output tokens dominate cost',
      'Fine-tuning and adapter workflows',
    ],
    chooseB: [
      'Multimodal applications with audio or video',
      'High input-token volume (cheaper per input token)',
      'Closed-API simplicity over self-hosting overhead',
      'Workloads on Google Cloud / Vertex AI',
    ],
  },
];

export function getComparisonBySlug(slug: string): ComparisonMeta | undefined {
  return COMPARISONS.find(c => c.slug === slug);
}

export function getAllComparisonSlugs(): string[] {
  return COMPARISONS.map(c => c.slug);
}
