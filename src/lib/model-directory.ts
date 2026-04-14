/**
 * Model directory: slug-based lookup for individual model pages.
 * Drives /models/[slug] routes, sitemap entries, and SEO metadata.
 *
 * Each entry maps a URL slug to the model's pricing.json ID and
 * enriched editorial metadata that cannot be derived from data alone.
 */

export interface ModelPageMeta {
  /** URL slug used in /models/[slug] */
  slug: string;
  /** Must match the `id` field in data/pricing.json */
  pricingId: string;
  /** Must match the `model` field in data/benchmarks.json (display name) */
  benchmarkName: string;
  /** Provider ID from pricing.json */
  providerId: string;
  /** Human-readable provider name */
  providerName: string;
  /** Provider URL */
  providerUrl: string;
  /** SEO title (< 60 chars) */
  seoTitle: string;
  /** SEO meta description (150-160 chars) */
  seoDescription: string;
  /** One-paragraph intro for the page hero */
  intro: string;
  /** Key strengths as short phrases */
  strengths: string[];
  /** Best-fit use cases */
  useCases: string[];
  /** API documentation URL */
  docsUrl: string;
  /** Model tier: flagship, mid, budget */
  tier: 'flagship' | 'mid' | 'budget';
}

export const MODEL_DIRECTORY: ModelPageMeta[] = [
  // ── Anthropic ──────────────────────────────────────────────────────
  {
    slug: 'claude-opus-4-6',
    pricingId: 'claude-opus-4-6',
    benchmarkName: 'Claude Opus 4.6',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Opus 4.6: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Opus 4.6 by Anthropic. Full pricing, benchmark scores, context window, capabilities, and comparison data. Updated daily on TensorFeed.',
    intro:
      'Claude Opus 4.6 is Anthropic\'s most capable model, built for complex reasoning, extended code generation, and agentic workflows. It leads on SWE-bench and GPQA Diamond while supporting a 200K context window with vision and tool use.',
    strengths: ['Top-tier reasoning', 'Best-in-class code generation', 'Agentic tool use', '200K context window'],
    useCases: ['Complex analysis and research', 'Large codebase refactoring', 'Multi-step agent workflows', 'Long document processing'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'flagship',
  },
  {
    slug: 'claude-sonnet-4-6',
    pricingId: 'claude-sonnet-4-6',
    benchmarkName: 'Claude Sonnet 4.6',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Sonnet 4.6: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Sonnet 4.6 by Anthropic. Balanced performance and cost for production workloads. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Claude Sonnet 4.6 is Anthropic\'s balanced mid-tier model, delivering strong reasoning and code generation at a fraction of Opus pricing. It shares the same 200K context window and full capability set, making it ideal for production workloads where cost matters.',
    strengths: ['Strong reasoning at lower cost', 'Full capability set', '200K context', 'Fast response times'],
    useCases: ['Production API workloads', 'Code review and generation', 'Content creation', 'Data extraction'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'mid',
  },
  {
    slug: 'claude-haiku-4-5',
    pricingId: 'claude-haiku-4-5',
    benchmarkName: 'Claude Haiku 4.5',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Haiku 4.5: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Haiku 4.5 by Anthropic. Fast, affordable AI with vision and tool use. Pricing, benchmarks, and context specs on TensorFeed.',
    intro:
      'Claude Haiku 4.5 is Anthropic\'s speed-optimized model, built for high-volume, latency-sensitive applications. At $0.80 per million input tokens, it provides vision, tool use, and code capabilities at budget pricing.',
    strengths: ['Lowest latency in Claude family', 'Budget-friendly pricing', 'Full vision support', 'Tool use capable'],
    useCases: ['Chatbots and customer support', 'Real-time classification', 'High-volume data processing', 'Quick summarization'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'budget',
  },

  // ── OpenAI ─────────────────────────────────────────────────────────
  {
    slug: 'gpt-4o',
    pricingId: 'gpt-4o',
    benchmarkName: 'GPT-4o',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-4o: Pricing, Benchmarks, Specs',
    seoDescription:
      'GPT-4o by OpenAI. Multimodal flagship with text, vision, and audio. Full pricing, benchmark scores, and context specs on TensorFeed.',
    intro:
      'GPT-4o is OpenAI\'s multimodal flagship, capable of processing text, images, and audio natively. It offers a 128K context window with competitive benchmark scores across reasoning, code, and knowledge tasks.',
    strengths: ['Native multimodal (text, vision, audio)', 'Strong general reasoning', '128K context', 'Broad ecosystem support'],
    useCases: ['Multimodal applications', 'General-purpose chat', 'Content generation', 'Code assistance'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'flagship',
  },
  {
    slug: 'gpt-4o-mini',
    pricingId: 'gpt-4o-mini',
    benchmarkName: 'GPT-4o-mini',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-4o Mini: Pricing, Benchmarks, Specs',
    seoDescription:
      'GPT-4o Mini by OpenAI. Ultra-affordable multimodal AI at $0.15/1M input tokens. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'GPT-4o Mini is OpenAI\'s most cost-effective model, offering multimodal capabilities at just $0.15 per million input tokens. It shares GPT-4o\'s 128K context window, making it ideal for high-volume applications on a budget.',
    strengths: ['Ultra-low pricing', 'Multimodal support', '128K context', 'Fast inference'],
    useCases: ['High-volume chat applications', 'Content moderation', 'Quick summarization', 'Lightweight code tasks'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'budget',
  },
  {
    slug: 'o1',
    pricingId: 'o1',
    benchmarkName: 'o1',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'OpenAI o1: Pricing, Benchmarks, Specs',
    seoDescription:
      'OpenAI o1 reasoning model. Chain-of-thought AI for math, science, and code. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'OpenAI o1 is a reasoning-focused model that uses internal chain-of-thought to solve complex problems in math, science, and code. It trades speed for accuracy, producing some of the highest scores on MATH and GPQA benchmarks.',
    strengths: ['Advanced chain-of-thought reasoning', 'Top math and science scores', '200K context', 'Strong code generation'],
    useCases: ['Scientific research', 'Complex math problems', 'Advanced code debugging', 'Logical reasoning tasks'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'flagship',
  },
  {
    slug: 'o3-mini',
    pricingId: 'o3-mini',
    benchmarkName: 'o3-mini',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'OpenAI o3-mini: Pricing, Benchmarks, Specs',
    seoDescription:
      'OpenAI o3-mini reasoning model. Affordable chain-of-thought for math and code. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'OpenAI o3-mini brings reasoning capabilities to a more affordable price point. With a 200K context window and strong MATH benchmark scores, it provides chain-of-thought reasoning for teams that need it without flagship costs.',
    strengths: ['Affordable reasoning', '200K context', 'Strong math performance', 'Budget-friendly'],
    useCases: ['Math tutoring apps', 'Code generation', 'Logical analysis', 'Structured data extraction'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'mid',
  },

  // ── Google ─────────────────────────────────────────────────────────
  {
    slug: 'gemini-2-5-pro',
    pricingId: 'gemini-2-5-pro',
    benchmarkName: 'Gemini 2.5 Pro',
    providerId: 'google',
    providerName: 'Google',
    providerUrl: 'https://ai.google.dev',
    seoTitle: 'Gemini 2.5 Pro: Pricing, Benchmarks, Specs',
    seoDescription:
      'Gemini 2.5 Pro by Google. 1M context window, multimodal AI with reasoning. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Gemini 2.5 Pro is Google\'s flagship model featuring the industry\'s largest production context window at 1 million tokens. It combines strong reasoning with vision, tool use, and code capabilities at competitive pricing.',
    strengths: ['1M token context window', 'Strong reasoning capabilities', 'Competitive pricing', 'Native multimodal'],
    useCases: ['Processing entire codebases', 'Long document analysis', 'Video understanding', 'Complex research tasks'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    tier: 'flagship',
  },
  {
    slug: 'gemini-2-0-flash',
    pricingId: 'gemini-2-0-flash',
    benchmarkName: 'Gemini 2.0 Flash',
    providerId: 'google',
    providerName: 'Google',
    providerUrl: 'https://ai.google.dev',
    seoTitle: 'Gemini 2.0 Flash: Pricing, Benchmarks, Specs',
    seoDescription:
      'Gemini 2.0 Flash by Google. Ultra-fast, ultra-cheap with 1M context. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Gemini 2.0 Flash is Google\'s speed-optimized model, delivering remarkably fast inference at just $0.10 per million input tokens. It retains the 1M token context window, making it one of the most cost-effective options for high-volume workloads.',
    strengths: ['Ultra-low cost ($0.10/1M input)', '1M token context', 'Fastest in class', 'Full multimodal support'],
    useCases: ['High-volume API workloads', 'Real-time applications', 'Chat and classification', 'Batch processing'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    tier: 'budget',
  },

  // ── Meta ───────────────────────────────────────────────────────────
  {
    slug: 'llama-4-scout',
    pricingId: 'llama-4-scout',
    benchmarkName: 'Llama 4 Scout',
    providerId: 'meta',
    providerName: 'Meta',
    providerUrl: 'https://ai.meta.com',
    seoTitle: 'Llama 4 Scout: Benchmarks, Specs, Open Source',
    seoDescription:
      'Llama 4 Scout by Meta. Open source with a 10M token context window. Benchmarks, capabilities, and specs on TensorFeed.',
    intro:
      'Llama 4 Scout is Meta\'s open-source model with the largest context window of any production model at 10 million tokens. Free to download and self-host, it opens up use cases that were previously impossible due to context limitations.',
    strengths: ['10M token context window', 'Fully open source', 'Free to self-host', 'Vision capable'],
    useCases: ['Massive document processing', 'Entire repository analysis', 'Self-hosted deployments', 'Research and experimentation'],
    docsUrl: 'https://ai.meta.com/llama/',
    tier: 'flagship',
  },
  {
    slug: 'llama-4-maverick',
    pricingId: 'llama-4-maverick',
    benchmarkName: 'Llama 4 Maverick',
    providerId: 'meta',
    providerName: 'Meta',
    providerUrl: 'https://ai.meta.com',
    seoTitle: 'Llama 4 Maverick: Benchmarks, Specs, Open Source',
    seoDescription:
      'Llama 4 Maverick by Meta. High-performance open source with 1M context. Benchmarks, specs, and capabilities on TensorFeed.',
    intro:
      'Llama 4 Maverick is Meta\'s high-performance open-source model with a 1M context window. It delivers benchmark scores competitive with proprietary mid-tier models while being completely free to download and deploy.',
    strengths: ['Competitive benchmark scores', '1M context window', 'Open source', 'Strong code generation'],
    useCases: ['On-premise deployments', 'Fine-tuning for specific domains', 'Cost-sensitive production', 'Code generation'],
    docsUrl: 'https://ai.meta.com/llama/',
    tier: 'mid',
  },

  // ── Mistral ────────────────────────────────────────────────────────
  {
    slug: 'mistral-large',
    pricingId: 'mistral-large',
    benchmarkName: 'Mistral Large',
    providerId: 'mistral',
    providerName: 'Mistral',
    providerUrl: 'https://mistral.ai',
    seoTitle: 'Mistral Large: Pricing, Benchmarks, Specs',
    seoDescription:
      'Mistral Large by Mistral AI. European AI flagship with 128K context. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Mistral Large is Mistral AI\'s flagship model, offering strong multilingual performance and competitive benchmarks at $2.00 per million input tokens. Built in Europe, it provides a 128K context window with vision and tool-use capabilities.',
    strengths: ['Strong multilingual support', 'Competitive pricing', 'European data sovereignty', '128K context'],
    useCases: ['Multilingual applications', 'European compliance workloads', 'General-purpose AI tasks', 'Tool-augmented workflows'],
    docsUrl: 'https://docs.mistral.ai/',
    tier: 'flagship',
  },
  {
    slug: 'mistral-small',
    pricingId: 'mistral-small',
    benchmarkName: 'Mistral Small',
    providerId: 'mistral',
    providerName: 'Mistral',
    providerUrl: 'https://mistral.ai',
    seoTitle: 'Mistral Small: Pricing, Benchmarks, Specs',
    seoDescription:
      'Mistral Small by Mistral AI. Affordable 128K context model. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Mistral Small is Mistral AI\'s budget-tier model at just $0.10 per million input tokens. With a 128K context window and tool-use support, it offers solid performance for cost-sensitive applications.',
    strengths: ['Ultra-low cost', '128K context', 'Tool use support', 'Fast inference'],
    useCases: ['High-volume chat', 'Lightweight code tasks', 'Quick summarization', 'Classification'],
    docsUrl: 'https://docs.mistral.ai/',
    tier: 'budget',
  },

  // ── Cohere ─────────────────────────────────────────────────────────
  {
    slug: 'command-r-plus',
    pricingId: 'command-r-plus',
    benchmarkName: 'Command R+',
    providerId: 'cohere',
    providerName: 'Cohere',
    providerUrl: 'https://cohere.com',
    seoTitle: 'Command R+: Pricing, Benchmarks, Specs',
    seoDescription:
      'Command R+ by Cohere. Enterprise RAG and tool-use model. Pricing, benchmarks, and capabilities on TensorFeed.',
    intro:
      'Command R+ is Cohere\'s flagship model, purpose-built for enterprise retrieval-augmented generation (RAG) and tool use. With a 128K context window and native grounding capabilities, it excels at search-driven workflows.',
    strengths: ['Purpose-built for RAG', 'Native grounding and citations', 'Enterprise-grade', '128K context'],
    useCases: ['Enterprise search', 'RAG pipelines', 'Grounded Q&A with citations', 'Tool-augmented workflows'],
    docsUrl: 'https://docs.cohere.com/',
    tier: 'flagship',
  },
  {
    slug: 'command-r',
    pricingId: 'command-r',
    benchmarkName: 'Command R',
    providerId: 'cohere',
    providerName: 'Cohere',
    providerUrl: 'https://cohere.com',
    seoTitle: 'Command R: Pricing, Benchmarks, Specs',
    seoDescription:
      'Command R by Cohere. Affordable RAG model with 128K context. Pricing, benchmarks, and capabilities on TensorFeed.',
    intro:
      'Command R is Cohere\'s cost-effective model for RAG and tool-use workloads. At $0.15 per million input tokens with a 128K context window, it brings enterprise search capabilities to budget-conscious teams.',
    strengths: ['Affordable RAG model', '128K context', 'Tool use support', 'Strong multilingual'],
    useCases: ['Budget RAG pipelines', 'Multilingual search', 'Lightweight enterprise Q&A', 'Data extraction'],
    docsUrl: 'https://docs.cohere.com/',
    tier: 'budget',
  },
];

/** Look up a model by its URL slug */
export function getModelBySlug(slug: string): ModelPageMeta | undefined {
  return MODEL_DIRECTORY.find(m => m.slug === slug);
}

/** All valid slugs (used by generateStaticParams) */
export function getAllModelSlugs(): string[] {
  return MODEL_DIRECTORY.map(m => m.slug);
}
