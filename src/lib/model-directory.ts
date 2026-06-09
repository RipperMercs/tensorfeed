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
    slug: 'claude-fable-5',
    pricingId: 'claude-fable-5',
    benchmarkName: 'Claude Fable 5',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Fable 5: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Fable 5 by Anthropic, the frontier tier above Opus 4.8 released June 9, 2026. $10/$50 pricing, 1M context window, 128K output, and specs on TensorFeed.',
    intro:
      'Claude Fable 5 is Anthropic\'s new frontier tier, announced June 9, 2026 and positioned above Claude Opus 4.8, which stays on as the default model. The API id is claude-fable-5, priced at $10 per million input tokens and $50 per million output with no long-context surcharge. It ships a 1 million token context window by default with up to 128K output tokens, takes text and vision input, and runs adaptive thinking always on (it cannot be disabled) with effort levels spanning low, medium, high, xhigh, and max. Anthropic\'s launch table reports 80.3 on SWE-bench Pro, 85.0 on OSWorld-Verified, 29.3 on FrontierCode Diamond, and a GDPval-AA ELO of 1932; treat all of these as vendor-reported until independent runs land. One operational note: always-on safety classifiers can reroute flagged requests to Opus 4.8, billed at Opus rates for the rerouted portion. Available on the Claude API, Amazon Bedrock, Google Vertex, and Microsoft Foundry.',
    strengths: ['1M token context window with 128K max output', 'Frontier tier above Opus 4.8', 'Adaptive thinking always on with five effort levels (low to max)', 'Vendor-reported 80.3 SWE-bench Pro and 85.0 OSWorld-Verified', 'Day-one availability on Claude API, Bedrock, Vertex, and Foundry'],
    useCases: ['Hardest long-horizon agentic work', 'Whole-repository refactors', 'Multi-document research synthesis', 'Computer-use automation'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'flagship',
  },
  {
    slug: 'claude-opus-4-8',
    pricingId: 'claude-opus-4-8',
    benchmarkName: 'Claude Opus 4.8',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Opus 4.8: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Opus 4.8 by Anthropic, released May 28, 2026 and still the default model. Priced at $5/$25 per 1M tokens, sharper agentic coding, cheaper fast mode, and a 1M context window on TensorFeed.',
    intro:
      'Claude Opus 4.8 is Anthropic\'s flagship as of May 28, 2026, arriving just six weeks after Opus 4.7. Anthropic describes it as a more effective collaborator with sharper judgement, more honesty about its own progress, and the ability to work independently for longer. Agentic coding climbs from 64.3% to 69.2% and knowledge work from 1753 to 1890 on Anthropic\'s own measures, while API pricing holds at $15 input and $75 output per million tokens. The new fast mode is roughly 2.5x quicker and about three times cheaper than before. It keeps the 1 million token context window and adds Dynamic Workflows for large-scale parallel subagent tasks.',
    strengths: ['1M token context window', 'Priced at $5/$25 per 1M tokens, down from the $15/$75 Opus 4.7 era', 'Agentic coding up to 69.2%', 'Fast mode 2.5x faster and 3x cheaper', 'Dynamic Workflows for parallel subagents'],
    useCases: ['Whole-repository refactors', 'Long-running asynchronous agent workflows', 'Multi-document research synthesis', 'Extended codebase debugging'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'flagship',
  },
  {
    slug: 'claude-opus-4-7',
    pricingId: 'claude-opus-4-7',
    benchmarkName: 'Claude Opus 4.7',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Opus 4.7: Pricing, Benchmarks, Specs (Previous Gen)',
    seoDescription:
      'Claude Opus 4.7 by Anthropic, now the previous-generation flagship after Opus 4.8. 1M token context window, pricing, benchmark scores, and how it compares on TensorFeed.',
    intro:
      'Claude Opus 4.7 was Anthropic\'s flagship from April 17, 2026 until Opus 4.8 succeeded it on May 28, 2026. It introduced a 1 million token context window at the same API pricing as 4.6, alongside gains on reasoning, math, and SWE-bench. It remains available on the API at $15 input and $75 output per million tokens, and is a solid choice for long-context code work, multi-document analysis, and agent workflows that span hours of tool calls.',
    strengths: ['1M token context window', 'Leads on HumanEval and SWE-bench', 'Same price as 4.6 with 5x context', 'Strong agentic tool use'],
    useCases: ['Whole-repository refactors', 'Multi-document research synthesis', 'Long-running agent workflows', 'Extended codebase debugging'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'mid',
  },
  {
    slug: 'claude-opus-4-6',
    pricingId: 'claude-opus-4-6',
    benchmarkName: 'Claude Opus 4.6',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Opus 4.6: Pricing, Benchmarks, Specs (Previous Gen)',
    seoDescription:
      'Claude Opus 4.6 by Anthropic, now the previous-generation flagship. Pricing, benchmarks, context window, and how it compares to Opus 4.7 on TensorFeed.',
    intro:
      'Claude Opus 4.6 was Anthropic\'s flagship until April 17, 2026, when Opus 4.7 succeeded it with a 1 million token context window at the same price. 4.6 remains available on the API and still leads on many reasoning and code benchmarks. It ships with a 200K context window, full tool use, and vision, and is a solid choice for workloads that do not need the larger context.',
    strengths: ['Previous-gen flagship, still strong', 'Top-tier reasoning', 'Best-in-class code generation', '200K context window'],
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
    slug: 'gpt-5-5',
    pricingId: 'gpt-5-5',
    benchmarkName: 'GPT-5.5',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-5.5: Pricing, Benchmarks, Specs',
    seoDescription:
      'GPT-5.5 by OpenAI. Latest flagship with 1M context, omnimodal capabilities, and top benchmark scores. Pricing and specs on TensorFeed.',
    intro:
      'GPT-5.5 is OpenAI\'s newest flagship model, the first fully retrained base since GPT-4.5. It features a 1M token context window, native omnimodal capabilities, and leads the Artificial Analysis Intelligence Index. At $5 per million input tokens, it doubles GPT-5.4 pricing while delivering substantially higher benchmark scores.',
    strengths: ['Top benchmark scores', '1M token context', 'Natively omnimodal', '40% fewer tokens than GPT-5.4'],
    useCases: ['Complex reasoning and research', 'Full codebase analysis', 'Advanced agentic workflows', 'Multimodal processing'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'flagship',
  },
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
  {
    slug: 'gemini-3-1-flash-lite',
    pricingId: 'gemini-3-1-flash-lite',
    benchmarkName: 'Gemini 3.1 Flash-Lite',
    providerId: 'google',
    providerName: 'Google',
    providerUrl: 'https://ai.google.dev',
    seoTitle: 'Gemini 3.1 Flash-Lite: Pricing, Benchmarks, Specs',
    seoDescription:
      'Gemini 3.1 Flash-Lite by Google. Cost-efficient preview model at $0.25 per million input tokens with a 1M context window. Pricing and specs on TensorFeed.',
    intro:
      'Gemini 3.1 Flash-Lite is Google\'s most cost-efficient model to date, released in preview on May 5, 2026. At $0.25 per million input tokens and $1.50 per million output tokens, it costs roughly half of Gemini 3 Flash while keeping a 1,048,576 token context window and reasoning support. Google positions it for high-volume developer workloads where latency, throughput, and price-per-task matter more than frontier reasoning.',
    strengths: ['$0.25 per 1M input tokens', '1M token context window', '2.5x faster time-to-first-token vs 2.5 Flash', 'Reasoning, vision, and tool use included'],
    useCases: ['High-volume classification and extraction', 'Customer support routing', 'RAG over very long contexts', 'Batch document processing'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    tier: 'budget',
  },
  {
    slug: 'gemini-3-5-flash',
    pricingId: 'gemini-3-5-flash',
    benchmarkName: 'Gemini 3.5 Flash',
    providerId: 'google',
    providerName: 'Google',
    providerUrl: 'https://ai.google.dev',
    seoTitle: 'Gemini 3.5 Flash: Pricing, Benchmarks, Specs',
    seoDescription:
      'Gemini 3.5 Flash by Google. The first Flash-tier model to beat the previous Pro flagship on coding and agentic tasks. Pricing, context window, and specs on TensorFeed.',
    intro:
      'Gemini 3.5 Flash went generally available on May 19, 2026 at Google I/O. At $1.50 per million input tokens and $9.00 per million output, with a 1,048,576 token input window and 65,536 output tokens, it is the first Flash-tier release that beats the previous Pro flagship (Gemini 3.1 Pro) on agentic coding suites (Terminal-Bench 2.1 at 76.2%, MCP Atlas at 83.6%, CharXiv Reasoning at 84.2%) while running roughly 4x faster at around 289 output tokens per second. Google positions it as the new daily-driver for coding agents and tool-use workflows where throughput and price-per-task matter.',
    strengths: ['Beats Gemini 3.1 Pro on agentic coding', '1M token input context', 'Roughly 4x faster than prior frontier tier', 'Reasoning, vision, and tool use included'],
    useCases: ['Agentic coding and SWE-style tool use', 'High-throughput RAG over long contexts', 'Live customer-facing assistants', 'Computer-use and MCP-driven agents'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    tier: 'mid',
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

  // ── DeepSeek ──────────────────────────────────────────────────────
  {
    slug: 'deepseek-v4-pro',
    pricingId: 'deepseek-v4-pro',
    benchmarkName: 'DeepSeek V4 Pro',
    providerId: 'deepseek',
    providerName: 'DeepSeek',
    providerUrl: 'https://www.deepseek.com',
    seoTitle: 'DeepSeek V4 Pro: Pricing, Benchmarks, Specs',
    seoDescription:
      'DeepSeek V4 Pro. Open source 1.6T parameter model with 1M context under MIT license. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'DeepSeek V4 Pro is a 1.6 trillion parameter Mixture-of-Experts model with 49 billion active parameters per token, trained on 33 trillion tokens. Released under the MIT license with a native 1M context window, it delivers benchmark scores within striking distance of frontier proprietary models at a fraction of the cost.',
    strengths: ['1.6T total parameters', 'MIT open source license', '1M native context', 'Near-frontier benchmarks at budget pricing'],
    useCases: ['Self-hosted deployments', 'Cost-sensitive production', 'Code generation', 'Long document processing'],
    docsUrl: 'https://api-docs.deepseek.com/',
    tier: 'flagship',
  },
  {
    slug: 'deepseek-v4-flash',
    pricingId: 'deepseek-v4-flash',
    benchmarkName: 'DeepSeek V4 Flash',
    providerId: 'deepseek',
    providerName: 'DeepSeek',
    providerUrl: 'https://www.deepseek.com',
    seoTitle: 'DeepSeek V4 Flash: Pricing, Benchmarks, Specs',
    seoDescription:
      'DeepSeek V4 Flash. Ultra-affordable open source model at $0.14/1M input with 1M context. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'DeepSeek V4 Flash is the efficiency model in the V4 family, with 284 billion total parameters and 13 billion active per token. At $0.14 per million input tokens with a 1M context window under the MIT license, it is one of the cheapest capable models available anywhere.',
    strengths: ['Ultra-low pricing ($0.14/1M input)', '1M context window', 'MIT open source', 'Strong efficiency benchmarks'],
    useCases: ['High-volume chat', 'Budget inference at scale', 'Self-hosted deployments', 'Lightweight code tasks'],
    docsUrl: 'https://api-docs.deepseek.com/',
    tier: 'budget',
  },

  // ── Alibaba ────────────────────────────────────────────────────────
  {
    slug: 'qwen3-7-max',
    pricingId: 'qwen3-7-max',
    benchmarkName: 'Qwen3.7-Max',
    providerId: 'alibaba',
    providerName: 'Alibaba',
    providerUrl: 'https://qwenlm.ai',
    seoTitle: 'Qwen3.7-Max: Pricing, Benchmarks, Specs',
    seoDescription:
      'Qwen3.7-Max by Alibaba. The 1M-context flagship that topped the public Intelligence Index at 57. Pricing, benchmarks, and specs on TensorFeed.',
    intro:
      'Qwen3.7-Max is Alibaba\'s May 2026 flagship model, landed on the Alibaba Cloud API on May 19 and unveiled at the 2026 Cloud Summit on May 20. At $2.50 per million input and $7.50 per million output tokens, with a 1,000,000 token context window and up to 65,536 output tokens, it carries an extended-thinking mode and claims of autonomous operation for up to 35 hours on long-horizon agentic tasks. Posted the top result on the public Artificial Analysis Intelligence Index at 57 and roughly 1,475 Elo on the LM Arena text leaderboard at release. Cached input drops to $0.25 per million tokens via OpenRouter, a 90 percent discount that makes repeated long-context calls dramatically cheaper.',
    strengths: ['1M token context window', 'Top public Intelligence Index (57, #1)', 'Extended thinking mode', '35-hour autonomous agentic operation', '90 percent cache discount on input'],
    useCases: ['Long-horizon agentic workflows', 'Deep multi-step reasoning', 'Agentic coding with sustained context', 'Document and codebase analysis at 1M scale'],
    docsUrl: 'https://help.aliyun.com/zh/dashscope/',
    tier: 'flagship',
  },

  // ── NVIDIA ─────────────────────────────────────────────────────────
  {
    slug: 'nemotron-3-nano-omni',
    pricingId: 'nemotron-3-nano-omni',
    benchmarkName: 'Nemotron 3 Nano Omni',
    providerId: 'nvidia',
    providerName: 'NVIDIA',
    providerUrl: 'https://www.nvidia.com/en-us/ai/',
    seoTitle: 'Nemotron 3 Nano Omni: Pricing, Benchmarks, Specs',
    seoDescription:
      'NVIDIA Nemotron 3 Nano Omni. Open multimodal 30B-A3B model with native vision, audio, video. Specs, benchmarks, and self-host options on TensorFeed.',
    intro:
      'Nemotron 3 Nano Omni 30B-A3B-Reasoning is NVIDIA\'s April 2026 open-weight multimodal release, built on a hybrid Mamba-Transformer-MoE backbone that activates 3 billion of 30 billion parameters per token. It processes text, image, video, and audio in one unified sequence with a 256K context window and native audio handling up to 20 minutes per clip. Tops six public leaderboards including OCRBenchV2-En (65.8), MMLongBench-Doc (57.5), OSWorld (47.4), Video-MME (72.2), WorldSense (55.4), DailyOmni (74.1), and VoiceBench (89.4). Available on Hugging Face in BF16, FP8, and NVFP4 quantizations; the NVFP4 build runs on a consumer 24GB GPU.',
    strengths: ['Native multimodal (text, image, video, audio)', '256K context window', 'Top scores on document and video benchmarks', 'Open weights with consumer-GPU formats', 'Audio as first-class modality'],
    useCases: ['Long document and PDF intelligence', 'Video and audio understanding agents', 'Computer-use and GUI automation', 'Self-hosted multimodal inference'],
    docsUrl: 'https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16',
    tier: 'mid',
  },

  // ── Microsoft ──────────────────────────────────────────────────────
  {
    slug: 'mai-code-1-flash',
    pricingId: 'mai-code-1-flash',
    benchmarkName: 'MAI-Code-1-Flash',
    providerId: 'microsoft',
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.ai',
    seoTitle: 'MAI-Code-1-Flash: Pricing, Benchmarks, Specs',
    seoDescription:
      'Microsoft MAI-Code-1-Flash, the first in-house Copilot coding model from Build 2026. $0.75/$4.50 pricing, 256K context, availability, and specs on TensorFeed.',
    intro:
      'MAI-Code-1-Flash is Microsoft\'s first in-house coding model, announced at Build 2026 on June 2. It targets fast, cheap code generation inside GitHub Copilot, where it is rolling out across Free, Pro, Pro+, and Max tiers as a model picker option. Microsoft says it uses roughly 60% fewer tokens than comparable models on hard tasks, and GitHub lists it at $0.75 per million input tokens ($0.075 cached) and $4.50 per million output, undercutting Claude Haiku 4.5 on price to performance. It ships with a 256K context window and reaches third-party providers including Fireworks AI, Baseten, and OpenRouter via Microsoft Foundry. Pricing is listed as still being finalized, so treat the numbers as launch-window figures.',
    strengths: ['256K context window', 'Cheap token-based billing ($0.75/$4.50)', '60% fewer tokens on hard coding tasks', 'Native GitHub Copilot integration', 'Available via Fireworks, Baseten, OpenRouter'],
    useCases: ['High-volume code completion', 'Copilot-style IDE assistance', 'Refactoring sessions with long file context', 'Budget agentic coding pipelines'],
    docsUrl: 'https://microsoft.ai/models/mai-code-1-flash/',
    tier: 'budget',
  },

  // ── MiniMax ────────────────────────────────────────────────────────
  {
    slug: 'minimax-m3',
    pricingId: 'minimax-m3',
    benchmarkName: 'MiniMax M3',
    providerId: 'minimax',
    providerName: 'MiniMax',
    providerUrl: 'https://www.minimax.io',
    seoTitle: 'MiniMax M3: Pricing, Benchmarks, Specs',
    seoDescription:
      'MiniMax M3, the June 2026 open-weight coding model with sparse attention. $0.30/$1.20 pricing, 1M context window, SWE-Bench Pro claims, and specs on TensorFeed.',
    intro:
      'MiniMax M3 launched June 1, 2026 as an open-weight coding and agentic model built on MiniMax Sparse Attention, which swaps full attention for KV-block selection to cut long-context compute to roughly one twentieth of the previous generation at 1M tokens. It accepts text, image, and video input with a 1,048,576 token context window and up to 512K output tokens. MiniMax reports 59% on SWE-Bench Pro and 83.5 on BrowseComp, though several results were run on MiniMax infrastructure with agent scaffolding, so independent verification is still pending. API pricing is $0.30 per million input and $1.20 per million output. Weights and a technical report are due on Hugging Face within about ten days of launch.',
    strengths: ['1M token context window', 'Very low pricing ($0.30/$1.20)', 'Sparse attention cuts long-context cost roughly 20x', 'Multimodal input (text, image, video)', 'Open weights promised within days of launch'],
    useCases: ['Budget agentic coding', 'Long-context repository analysis', 'Browser and tool-use agents', 'Self-hosted inference once weights land'],
    docsUrl: 'https://www.minimax.io/platform',
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
