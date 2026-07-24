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
    slug: 'claude-opus-5',
    pricingId: 'claude-opus-5',
    benchmarkName: 'Claude Opus 5',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Opus 5: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Opus 5 by Anthropic, released July 2026 at $5/$25 per 1M tokens, the same price as Opus 4.8 and half of Fable 5. 1M context and 128K output on TensorFeed.',
    intro:
      'Claude Opus 5 is Anthropic\'s July 2026 Opus release, and the pricing is the story: $5 per million input tokens and $25 per million output, identical to Claude Opus 4.8 and exactly half of Claude Fable 5 at $10/$50. The API id is claude-opus-5. It ships a 1 million token context window as both the default and the maximum, up to 128K output tokens, and text plus vision input. Anthropic\'s launch table puts it ahead of Fable 5 on most published rows despite the lower price: 70.6 percent on OSWorld 2.0 computer use against Fable 5\'s 66.1, 90.8 percent on BrowseComp against 87.4, 64.7 percent on Humanity\'s Last Exam with tools against 63.9, a GDPval-AA v2 knowledge-work score of 1861 against 1747, and 30.2 percent on ARC-AGI-3, a benchmark where Opus 4.8 scored 1.5. Fable 5 still edges it on FrontierCode (53.5 to 53.4) and DeepSWE (69.7 to 68.8), and Anthropic continues to position Fable 5 as the highest-capability tier. Treat every one of these as vendor-reported until independent runs land. Three operational changes matter for anyone porting from 4.8: adaptive thinking is now on by default when the thinking parameter is omitted, disabling thinking is only accepted at effort high or below (pairing it with xhigh or max returns a 400), and the minimum cacheable prompt drops to 512 tokens from 1024, so prompts previously too short to cache now create entries with no code change. Opus 5 draws on its own rate-limit bucket rather than the shared Opus 4.x pool, and Priority Tier does not cover it. Available on the Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry.',
    strengths: ['Same $5/$25 pricing as Opus 4.8, half the cost of Fable 5', '1M token context window as both default and maximum, 128K output', 'Leads Fable 5 on OSWorld 2.0, BrowseComp, HLE with tools, and GDPval-AA', '30.2 percent on ARC-AGI-3 against 1.5 percent for Opus 4.8', 'Prompt cache minimum halved to 512 tokens', 'Full effort ladder from low through max'],
    useCases: ['Complex agentic coding and long-horizon autonomous runs', 'Computer-use and GUI automation', 'Agentic search and deep research', 'Whole-repository refactors and code review'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'flagship',
  },
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
      'Claude Fable 5 is Anthropic\'s new frontier tier, announced June 9, 2026 and positioned above Claude Opus 4.8, which was the default model at the time. Claude Opus 5 has since landed at $5/$25, half the Fable 5 rate, and outscores it on most published rows. The API id is claude-fable-5, priced at $10 per million input tokens and $50 per million output with no long-context surcharge. It ships a 1 million token context window by default with up to 128K output tokens, takes text and vision input, and runs adaptive thinking always on (it cannot be disabled) with effort levels spanning low, medium, high, xhigh, and max. Anthropic\'s launch table reports 80.3 on SWE-bench Pro, 85.0 on OSWorld-Verified, 29.3 on FrontierCode Diamond, and a GDPval-AA ELO of 1932; treat all of these as vendor-reported until independent runs land. One operational note: always-on safety classifiers can reroute flagged requests to Opus 4.8, billed at Opus rates for the rerouted portion. Available on the Claude API, Amazon Bedrock, Google Vertex, and Microsoft Foundry.',
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
      'Claude Opus 4.8 by Anthropic, released May 28, 2026 and superseded by Opus 5 on July 24. Priced at $5/$25 per 1M tokens, sharper agentic coding, cheaper fast mode, and a 1M context window on TensorFeed.',
    intro:
      'Claude Opus 4.8 was Anthropic\'s flagship from May 28, 2026 until Claude Opus 5 succeeded it on July 24, arriving itself just six weeks after Opus 4.7. Anthropic describes it as a more effective collaborator with sharper judgement, more honesty about its own progress, and the ability to work independently for longer. Agentic coding climbs from 64.3% to 69.2% and knowledge work from 1753 to 1890 on Anthropic\'s own measures, while API pricing came down to $5 input and $25 output per million tokens, a threefold cut from the $15/$75 of the Opus 4.7 era. The new fast mode is roughly 2.5x quicker and about three times cheaper than before. It keeps the 1 million token context window and adds Dynamic Workflows for large-scale parallel subagent tasks.',
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
    slug: 'claude-sonnet-5',
    pricingId: 'claude-sonnet-5',
    benchmarkName: 'Claude Sonnet 5',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    seoTitle: 'Claude Sonnet 5: Pricing, Benchmarks, Specs',
    seoDescription:
      'Claude Sonnet 5 by Anthropic, released June 30, 2026. $2/$10 introductory pricing, 1M context window, adaptive thinking, and benchmark scores on TensorFeed.',
    intro:
      'Claude Sonnet 5 is Anthropic\'s most agentic Sonnet-class model, released June 30, 2026 as an upgrade to Sonnet 4.6 that narrows the gap to Opus 4.8 on reasoning, tool use, coding, computer use, and knowledge work while staying priced below the flagship. Introductory rates are $2 per million input tokens and $10 per million output tokens through August 31, 2026, moving to $3 and $15 from September onward. It ships a 1 million token context window with context compaction and adaptive thinking with selectable effort levels up to xhigh. Anthropic\'s own numbers show 85.2 on SWE-bench Verified, 63.2 on SWE-bench Pro, 78.3 on SWE-bench Multilingual, 81.2 on OSWorld-Verified, 84.7 on BrowseComp, and 80.4 on Terminal-Bench 2.1 (beating Opus 4.8 at 74.6 on that specific benchmark). Available on the Claude API, Amazon Bedrock, Google Vertex, and Microsoft Foundry at launch.',
    strengths: ['1M token context window with context compaction', 'Introductory $2/$10 pricing through August 31, 2026', 'Adaptive thinking up to xhigh effort level', 'Beats Opus 4.8 on Terminal-Bench 2.1 (80.4 vs 74.6)', 'Day-one availability on Claude API, Bedrock, Vertex, and Foundry'],
    useCases: ['Cost-sensitive agentic coding pipelines', 'Long-running tool-use workflows', 'Production RAG and knowledge work', 'Computer-use and browser agents'],
    docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    tier: 'mid',
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
    slug: 'gpt-5-6-sol',
    pricingId: 'gpt-5-6-sol',
    benchmarkName: 'GPT-5.6 Sol',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-5.6 Sol: Pricing, Preview Access, Specs',
    seoDescription:
      'GPT-5.6 Sol by OpenAI, the new flagship reasoning and agentic model. Generally available since July 9, 2026 at $5/$30 per 1M tokens with a 1M context window on TensorFeed.',
    intro:
      'GPT-5.6 Sol is the flagship in OpenAI\'s GPT-5.6 family, previewed on June 26, 2026. Pricing is $5 per million input tokens and $30 per million output, with a 1 million token context window. Access at launch is intentionally narrow: at the request of the US Government, only roughly 20 pre-approved organizations were granted entry to the limited preview. General availability followed on July 9, 2026. The originw. OpenAI positioned Sol for frontier reasoning and agentic work and disclosed partial benchmarks (Sol Ultra at 91.9 percent on Terminal-Bench 2.1, base Sol at 88.8 percent), while holding back SWE-bench, MMLU-Pro, GDPval, and FrontierMath until GA. A Cerebras deployment running Sol at up to 750 tokens per second is planned for July. Treat Sol as a forward-looking option for now: priced, named, and benchmarked in part, but not yet broadly callable.',
    strengths: ['1M token context window', 'Same headline price as GPT-5.5 ($5/$30) for a new generation', 'Frontier-class agentic and reasoning posture', 'Cerebras hardware path at roughly 750 tokens/sec planned for July', 'Sister to lower-cost Terra and Luna variants in the same family'],
    useCases: ['Long-horizon agentic workflows', 'Frontier reasoning and research tasks', 'Hardest-tier coding agents', 'Limited-preview evaluation against GPT-5.5 and Claude Fable 5'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'flagship',
  },
  {
    slug: 'gpt-5-6-terra',
    pricingId: 'gpt-5-6-terra',
    benchmarkName: 'GPT-5.6 Terra',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-5.6 Terra: Pricing, Preview Access, Specs',
    seoDescription:
      'GPT-5.6 Terra by OpenAI, the balanced mid-tier in the GPT-5.6 family. $2.50/$15 per 1M tokens, 1M context, GPT-5.5-class performance at roughly half the cost. Specs on TensorFeed.',
    intro:
      'GPT-5.6 Terra is the balanced everyday model in the GPT-5.6 family, previewed June 26, 2026. OpenAI positions it as GPT-5.5-class performance at roughly half the price: $2.50 per million input tokens and $15 per million output, with a 1 million token context window. Access at launch was limited to roughly 20 pre-approved organizations under a US Government preview arrangement; general availability followed on July 9, 2026in the coming weeks. Detailed SWE-bench, MMLU-Pro, and GDPval results are not yet public; OpenAI disclosed coding, biology, and cybersecurity numbers in the preview post and said the rest land at GA.',
    strengths: ['Half the input price of GPT-5.5 at GPT-5.5-class performance', '1M token context window', 'Same lineage as Sol with cheaper economics', 'Reasoning, vision, tool use, and code included'],
    useCases: ['Production agentic workflows where Sol is overkill', 'High-volume coding assistants', 'RAG over very long contexts', 'Migration target from GPT-5.5 once Terra reaches GA'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'mid',
  },
  {
    slug: 'gpt-5-6-luna',
    pricingId: 'gpt-5-6-luna',
    benchmarkName: 'GPT-5.6 Luna',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-5.6 Luna: Pricing, Preview Access, Specs',
    seoDescription:
      'GPT-5.6 Luna by OpenAI, the fast and budget-friendly variant of the GPT-5.6 family. $1/$6 per 1M tokens, 1M context, generally available since July 9, 2026 on TensorFeed.',
    intro:
      'GPT-5.6 Luna is the fastest and cheapest model in the GPT-5.6 family, previewed June 26, 2026. Pricing is $1 per million input tokens and $6 per million output, with a 1 million token context window. Like its siblings, Luna entered as a limited preview to roughly 20 pre-approved organizations under a US Government arrangement, and reached general availability on July 9, 2026. OpenAI is positioning it for high-volume, latency-sensitive workloads where Sol-level reasoning is not required.',
    strengths: ['Lowest pricing in the GPT-5.6 family ($1/$6 per 1M)', '1M token context window', 'Frontier-family lineage at budget-tier economics', 'Reasoning, vision, tool use, and code included'],
    useCases: ['High-volume chat and classification', 'Cost-sensitive coding assistants', 'Real-time tool-augmented workflows', 'Latency-sensitive customer-facing applications'],
    docsUrl: 'https://platform.openai.com/docs/models',
    tier: 'budget',
  },
  {
    slug: 'gpt-5-5',
    pricingId: 'gpt-5-5',
    benchmarkName: 'GPT-5.5',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    seoTitle: 'GPT-5.5: Pricing, Benchmarks, Specs',
    seoDescription:
      'GPT-5.5 by OpenAI. Previous-generation flagship with 1M context and omnimodal capabilities, superseded by the GPT-5.6 family. Pricing and specs on TensorFeed.',
    intro:
      'GPT-5.5 was OpenAI\'s flagship from April 2026 until the GPT-5.6 family (Sol, Terra, and Luna) reached general availability on July 9, 2026, and it was the first fully retrained base since GPT-4.5. It features a 1M token context window, native omnimodal capabilities, and leads the Artificial Analysis Intelligence Index. At $5 per million input tokens, it doubles GPT-5.4 pricing while delivering substantially higher benchmark scores.',
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

  {
    slug: 'muse-spark-1-1',
    pricingId: 'muse-spark-1-1',
    benchmarkName: 'Muse Spark 1.1',
    providerId: 'meta',
    providerName: 'Meta',
    providerUrl: 'https://ai.meta.com',
    seoTitle: 'Muse Spark 1.1: Pricing, Benchmarks, Specs',
    seoDescription:
      'Meta Muse Spark 1.1, the July 9, 2026 first paid Meta model. $1.25/$4.25 pricing, 1M context, agentic tool-use benchmarks, and specs on TensorFeed.',
    intro:
      'Muse Spark 1.1 is Meta\'s first paid API model, opened to US developers on July 9, 2026 at roughly a quarter of OpenAI and Anthropic list rates. It is a multimodal reasoning model built for agentic and coding work, with a self-managed 1 million token context window, native primary-agent and subagent orchestration, and MCP plus custom-skill support. Meta AI chief Alexandr Wang called it the company\'s strongest model for agentic and coding work yet. On tool-use and agentic suites it beats the frontier in places (88.1 on MCP Atlas, 54.7 on JobBench against Opus 4.8\'s 48.4, and 62.1 on Humanity\'s Last Exam with tools over Opus 4.8\'s 57.9), but on pure coding it trails the leaders (61.5 on SWE-Bench Pro versus Opus 4.8 at 69.2, and 80.0 on Terminal-Bench 2.1 versus GPT-5.5 at 83.4). API pricing is $1.25 per million input tokens and $4.25 per million output, with $20 in free credits for every new account. The launch preview is limited to US developers.',
    strengths: ['Very low pricing ($1.25/$4.25), roughly a quarter of frontier rates', '1M self-managed context window', 'Native primary-agent and subagent orchestration', 'MCP and custom-skill support', 'Tops tool-use benchmarks (88.1 MCP Atlas)'],
    useCases: ['Cost-sensitive agentic pipelines', 'Multi-agent orchestration with tool use', 'MCP-driven automation', 'High-volume coding agents where price matters more than peak accuracy'],
    docsUrl: 'https://ai.meta.com/muse/',
    tier: 'mid',
  },

  // ── Mistral ────────────────────────────────────────────────────────
  {
    slug: 'mistral-medium-3-5',
    pricingId: 'mistral-medium-3-5',
    benchmarkName: 'Mistral Medium 3.5',
    providerId: 'mistral',
    providerName: 'Mistral',
    providerUrl: 'https://mistral.ai',
    seoTitle: 'Mistral Medium 3.5: Pricing, Benchmarks, Specs',
    seoDescription:
      'Mistral Medium 3.5 by Mistral AI, a 128B open-weight coder at $1.50/$7.50 per 1M tokens with 256K context and 77.6 percent on SWE-Bench Verified. Specs on TensorFeed.',
    intro:
      'Mistral Medium 3.5 entered public preview on May 3, 2026 and is the most practical entry in the open-weight coding tier. It is a dense 128 billion parameter model with a 256K context window, released under a modified MIT license, priced at $1.50 per million input tokens and $7.50 per million output. It posts 77.6 percent on SWE-Bench Verified, which is frontier-adjacent coding performance at a size that fits on a single node. The reason it matters more than its benchmark rank suggests is deployability: quantized to 4-bit it needs roughly 72GB, so it runs on one H100. Compare that to Kimi K3 at about 1,450GB and eight B200-class cards for the same license freedom. Strong enough to matter, small enough to actually run, and licensed permissively enough to ship.',
    strengths: ['77.6 percent on SWE-Bench Verified at 128B dense', 'Runs on a single H100 at 4-bit (roughly 72GB)', '256K context window', 'Modified MIT license permitting commercial self-hosting', 'Best capability-per-GPU ratio in the open-weight coding tier'],
    useCases: ['Single-node self-hosted coding agents', 'European data-residency deployments', 'Cost-controlled IDE and refactor automation', 'Teams that need open weights they can actually run'],
    docsUrl: 'https://docs.mistral.ai',
    tier: 'mid',
  },
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

  // ── Meituan ────────────────────────────────────────────────────────
  {
    slug: 'longcat-2',
    pricingId: 'longcat-2',
    benchmarkName: 'LongCat-2.0',
    providerId: 'meituan',
    providerName: 'Meituan',
    providerUrl: 'https://www.longcatai.org',
    seoTitle: 'LongCat-2.0: Specs, Benchmarks, Open Source',
    seoDescription:
      'Meituan LongCat-2.0, the June 30, 2026 open-source 1.6T MoE agentic coding model. 1M context, MIT license, trained on Chinese chips. Specs on TensorFeed.',
    intro:
      'LongCat-2.0 is Meituan\'s open-source flagship, released June 30, 2026 under an MIT license on GitHub and Hugging Face. It is a 1.6 trillion parameter mixture-of-experts model with dynamic activation of 33 to 56 billion parameters per token, purpose-built for agentic coding (code understanding, generation, and execution in real-world agent workflows). Native 1 million token context, pretrained from scratch on more than 30 trillion tokens across Chinese, English, multilingual, and code data. Meituan reports 59.5 on SWE-Bench Pro (self-reported, ahead of Gemini 3.1 Pro, GPT-5.5, and Claude Opus 4.6 by their measure); independent verification is pending. The model is the first trillion-parameter release trained and served entirely on a 50,000-card domestic Chinese compute cluster, a milestone for building frontier AI without leading-edge Western chips. A preview version had quietly been running on OpenRouter and longcat.ai for weeks before the announcement, ranking among the top three models globally by call volume during that stealth window.',
    strengths: ['1.6T total parameters with 33 to 56B active per token', 'MIT open source license', 'Native 1M token context', 'Purpose-built for agentic coding', 'Trained end-to-end on domestic Chinese silicon'],
    useCases: ['Self-hosted agentic coding pipelines', 'Long-context repository refactors', 'Sovereign or geopolitically sensitive deployments', 'Research on trillion-parameter MoE training on non-Western hardware'],
    docsUrl: 'https://www.longcatai.org/models/longcat-2',
    tier: 'flagship',
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

  // ── xAI ─────────────────────────────────────────
  {
    slug: 'grok-4-5',
    pricingId: 'grok-4-5',
    benchmarkName: 'Grok 4.5',
    providerId: 'xai',
    providerName: 'xAI',
    providerUrl: 'https://x.ai',
    seoTitle: 'Grok 4.5: Pricing, Benchmarks, Specs',
    seoDescription:
      'xAI Grok 4.5, the July 8, 2026 coding and agentic model on the V9 foundation. $2/$6 pricing, 500K context, Intelligence Index benchmarks, and specs on TensorFeed.',
    intro:
      'Grok 4.5 is xAI\'s first model built specifically for coding and agentic work, released July 8, 2026 on the 1.5 trillion parameter V9 foundation (up from Grok 4.3\'s V8) and trained on real coding-agent data. It lands fourth on the Artificial Analysis Intelligence Index, above every open-weight model and every Gemini model, at a price more than 60% below Claude Opus 4.8 or GPT-5.5. It leads Opus 4.8 on the provider-harness DeepSWE 1.0 score and on Terminal-Bench 2.1 (83.3), but trails Opus 4.8 on the neutral DeepSWE 1.1 run and on SWE-Bench Pro (64.7). API pricing is $2 per million input tokens and $6 per million output, with cached input at $0.50 (a 75% discount) and a higher-context surcharge above 200K tokens. xAI narrowed the context window to 500K tokens (down from 1M on Grok 4.3) to point the model squarely at coding and agentic use. Reasoning effort is configurable (low, medium, high; default high). Built-in tools bill separately: Web Search, X Search, and Code Execution at $5 per 1,000 calls, File Attachments at $10 per 1,000, and Collections Search at $2.50 per 1,000.',
    strengths: ['Fourth on the Artificial Analysis Intelligence Index', 'Over 60% cheaper than Opus 4.8 or GPT-5.5', 'Terminal-Bench 2.1 leader (83.3) against Opus 4.8', 'Cached input at $0.50 (75% discount)', 'Configurable reasoning effort'],
    useCases: ['Coding agents and IDE automation', 'Tool-use and agentic workflows', 'Cost-sensitive frontier-class reasoning', 'X and web-grounded research agents'],
    docsUrl: 'https://docs.x.ai',
    tier: 'flagship',
  },
  // ── Z.ai (Zhipu AI) ────────────────────────────────────────────────
  {
    slug: 'glm-5-2',
    pricingId: 'glm-5-2',
    benchmarkName: 'GLM-5.2',
    providerId: 'zhipu',
    providerName: 'Z.ai (Zhipu AI)',
    providerUrl: 'https://z.ai',
    seoTitle: 'GLM-5.2: Pricing, Benchmarks, Specs',
    seoDescription:
      'GLM-5.2 by Z.ai, the leading open-weight model on the Artificial Analysis index. $1.40/$4.40 per 1M tokens, 1M context, MIT weights, trained on Huawei Ascend silicon.',
    intro:
      'GLM-5.2 is Z.ai\'s (Zhipu AI) flagship, shipped June 13, 2026. It is a 744 billion parameter mixture-of-experts model with a 1 million token context window, 131K max output, and a Max-effort reasoning mode, released under an MIT license. API pricing is roughly $1.40 per million input tokens and $4.40 per million output, which is on the order of 80 percent below Claude Opus 4.8. Z.ai reports 62.1 on SWE-Bench Pro, which would top GPT-5.5, and the model sits fourth overall and first among open-weight models on the Artificial Analysis Intelligence Index at 51; treat both as vendor-reported. The detail that makes it strategically interesting is the training run: roughly 100,000 Huawei Ascend 910B chips with no Nvidia silicon in the loop, at an estimated $25 million all-in. Reporting puts it at something like 40 percent of developer tokens on OpenRouter. Self-hosting at full precision needs about 1.5TB of GPU memory, roughly nineteen H100s, so the MIT license buys far more freedom than most teams can actually exercise.',
    strengths: ['First among open-weight models on the Artificial Analysis index', 'MIT licensed with 1M context and 131K output', 'Roughly 80 percent cheaper than Opus 4.8', 'Trained end to end on Huawei Ascend silicon, no Nvidia', 'Vendor-reported 62.1 on SWE-Bench Pro'],
    useCases: ['Cost-sensitive coding agents', 'Sovereign deployments avoiding US silicon', 'High-volume agentic pipelines', 'Self-hosting where MIT terms matter'],
    docsUrl: 'https://docs.z.ai',
    tier: 'flagship',
  },
  // ── Moonshot AI ────────────────────────────────────────────────────
  {
    slug: 'kimi-k3',
    pricingId: 'kimi-k3',
    benchmarkName: 'Kimi K3',
    providerId: 'moonshot',
    providerName: 'Moonshot AI',
    providerUrl: 'https://www.moonshot.cn',
    seoTitle: 'Kimi K3: Pricing, Benchmarks, Specs',
    seoDescription:
      'Kimi K3 by Moonshot AI, the largest open-weight model ever shipped at 2.8T parameters. $3/$15 per 1M tokens, 1M context, native vision, and specs on TensorFeed.',
    intro:
      'Kimi K3 is Moonshot AI\'s flagship, released July 16, 2026 and the largest open-weight system anyone has shipped: 2.8 trillion total parameters across 896 experts with roughly 16 active per token, so only about 1.8 percent of the network fires on any given token. It carries a 1 million token context window and native vision. API pricing is $0.30 per million cache-hit input tokens, $3.00 on a cache miss, and $15.00 output. Moonshot reports roughly 57 on the Artificial Analysis Intelligence Index, placing it third or fourth overall behind Claude Fable 5 and GPT-5.6 Sol, alongside first place on Frontend Code Arena at 1,679 points, the strongest open-weight GPQA Diamond result on record at 93.5 percent, and third on GDPval-AA v2 at 1,687; all vendor-reported. On normalized cost per task it is the cheapest of the leaders. Downloadable is not the same as runnable here: it ships natively in MXFP4 with no FP16 checkpoint, and even at 4-bit it needs roughly 1,450GB of VRAM, which means eight B200-class cards. This needs a rack, not a workstation.',
    strengths: ['Largest open-weight model ever shipped at 2.8T parameters', 'Sparse MoE fires only about 1.8 percent of the network per token', '1M context with native vision', 'Vendor-reported 93.5 on GPQA Diamond, best open-weight result on record', 'Cheapest normalized cost per task among the index leaders'],
    useCases: ['Frontier-class self-hosting at rack scale', 'Frontend and UI code generation', 'Long-context multimodal research', 'Sovereign deployments needing open weights'],
    docsUrl: 'https://platform.moonshot.cn/docs',
    tier: 'flagship',
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
